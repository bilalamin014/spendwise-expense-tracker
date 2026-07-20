(function () {
  "use strict";

  var STORAGE_KEY = "spendwise-data-v1";
  var CURRENCY_SYMBOLS = { EUR: "€", GBP: "£", USD: "$", PKR: "Rs" };
  var CATEGORY_DEFINITIONS = [
    { id: "housing", name: "Housing", type: "expense", icon: "🏠", color: "#6b8afd" },
    { id: "groceries", name: "Groceries", type: "expense", icon: "🛒", color: "#37a878" },
    { id: "transport", name: "Transport", type: "expense", icon: "🚗", color: "#ef9b3e" },
    { id: "dining", name: "Dining", type: "expense", icon: "🍽️", color: "#e2685d" },
    { id: "shopping", name: "Shopping", type: "expense", icon: "🛍️", color: "#a879d8" },
    { id: "bills", name: "Bills", type: "expense", icon: "💡", color: "#e4b43e" },
    { id: "health", name: "Health", type: "expense", icon: "💊", color: "#db6e93" },
    { id: "family", name: "Family", type: "expense", icon: "👨‍👩‍👧", color: "#4aa9b6" },
    { id: "education", name: "Education", type: "expense", icon: "📚", color: "#668bc4" },
    { id: "other-expense", name: "Other", type: "expense", icon: "•••", color: "#89928d" },
    { id: "salary", name: "Salary", type: "income", icon: "💼", color: "#178a64" },
    { id: "freelance", name: "Freelance", type: "income", icon: "💻", color: "#2787b7" },
    { id: "investment", name: "Investment", type: "income", icon: "📈", color: "#786fc4" },
    { id: "gift", name: "Gift", type: "income", icon: "🎁", color: "#cb6c93" },
    { id: "other-income", name: "Other", type: "income", icon: "+", color: "#5d8072" }
  ];

  var state = loadState();
  var activeMonth = monthKey(new Date());
  var activeView = "overview";
  var selectedCategoryId = null;
  var toastTimer = null;
  var elements = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    applyTheme();
    bindEvents();
    populateCategoryFilter();
    elements.dateInput.value = todayISO();
    showView("overview");
    renderAll();
    updateInstallCard();

    if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
      navigator.serviceWorker.register("./sw.js").catch(function () {
        return null;
      });
    }
  }

  function cacheElements() {
    [
      "screenTitle", "quickExportButton", "overviewView", "transactionsView", "insightsView", "settingsView",
      "previousMonthButton", "nextMonthButton", "monthLabelButton", "monthLabel", "monthlyBalance",
      "monthlyIncome", "monthlySpent", "budgetStatusPill", "budgetRemaining", "budgetProgress",
      "budgetUsedLabel", "budgetTotalLabel", "openBudgetButton", "categoryOverview", "recentTransactions",
      "searchInput", "typeFilter", "categoryFilter", "transactionSummary", "allTransactions",
      "trendChart", "insightMetrics", "categoryBreakdown", "currencySelect", "themeSelect",
      "settingsBudgetButton", "settingsBudgetValue", "exportCsvButton", "backupButton", "importButton",
      "importFileInput", "demoDataButton", "clearDataButton", "dataCountLabel", "installCard",
      "addTransactionButton", "transactionDialog", "transactionForm", "transactionDialogTitle",
      "cancelTransactionButton", "transactionType", "editingTransactionId", "amountInput",
      "amountCurrencySymbol", "amountError", "categoryPicker", "dateInput", "noteInput",
      "deleteTransactionButton", "budgetDialog", "budgetForm", "cancelBudgetButton",
      "budgetMonthName", "budgetCurrencySymbol", "budgetInput", "toast"
    ].forEach(function (id) {
      elements[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    elements.previousMonthButton.addEventListener("click", function () { changeMonth(-1); });
    elements.nextMonthButton.addEventListener("click", function () { changeMonth(1); });
    elements.monthLabelButton.addEventListener("click", function () {
      activeMonth = monthKey(new Date());
      renderAll();
    });

    document.querySelectorAll("[data-view]").forEach(function (button) {
      button.addEventListener("click", function () { showView(button.dataset.view); });
    });
    document.addEventListener("click", function (event) {
      var viewButton = event.target.closest("[data-go-view]");
      if (viewButton) showView(viewButton.dataset.goView);

      var editButton = event.target.closest("[data-edit-id]");
      if (editButton) openTransactionDialog(editButton.dataset.editId);

      var emptyAddButton = event.target.closest("[data-empty-add]");
      if (emptyAddButton) openTransactionDialog();
    });

    elements.addTransactionButton.addEventListener("click", function () { openTransactionDialog(); });
    elements.cancelTransactionButton.addEventListener("click", closeTransactionDialog);
    elements.transactionForm.addEventListener("submit", saveTransaction);
    elements.deleteTransactionButton.addEventListener("click", deleteEditingTransaction);

    document.querySelectorAll("[data-transaction-type]").forEach(function (button) {
      button.addEventListener("click", function () { setTransactionType(button.dataset.transactionType); });
    });
    elements.categoryPicker.addEventListener("click", function (event) {
      var button = event.target.closest("[data-category-id]");
      if (!button) return;
      selectedCategoryId = button.dataset.categoryId;
      renderCategoryPicker();
    });

    elements.openBudgetButton.addEventListener("click", openBudgetDialog);
    elements.settingsBudgetButton.addEventListener("click", openBudgetDialog);
    elements.cancelBudgetButton.addEventListener("click", function () { elements.budgetDialog.close(); });
    elements.budgetForm.addEventListener("submit", saveBudget);

    elements.searchInput.addEventListener("input", renderTransactions);
    elements.typeFilter.addEventListener("change", renderTransactions);
    elements.categoryFilter.addEventListener("change", renderTransactions);

    elements.quickExportButton.addEventListener("click", exportCSV);
    elements.exportCsvButton.addEventListener("click", exportCSV);
    elements.backupButton.addEventListener("click", exportBackup);
    elements.importButton.addEventListener("click", function () { elements.importFileInput.click(); });
    elements.importFileInput.addEventListener("change", importBackup);
    elements.demoDataButton.addEventListener("click", addDemoData);
    elements.clearDataButton.addEventListener("click", clearAllData);

    elements.currencySelect.addEventListener("change", function () {
      state.currency = elements.currencySelect.value;
      persist();
      renderAll();
      showToast("Currency updated");
    });
    elements.themeSelect.addEventListener("change", function () {
      state.theme = elements.themeSelect.value;
      applyTheme();
      persist();
      renderSettings();
    });

    [elements.transactionDialog, elements.budgetDialog].forEach(function (dialog) {
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
      });
    });
  }

  function defaultState() {
    return {
      version: 1,
      currency: "EUR",
      theme: "system",
      budgets: {},
      transactions: []
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch (error) {
      return defaultState();
    }
  }

  function normalizeState(candidate) {
    var clean = defaultState();
    if (!candidate || typeof candidate !== "object") return clean;
    if (Object.prototype.hasOwnProperty.call(CURRENCY_SYMBOLS, candidate.currency)) clean.currency = candidate.currency;
    if (["system", "light", "dark"].indexOf(candidate.theme) >= 0) clean.theme = candidate.theme;
    if (candidate.budgets && typeof candidate.budgets === "object" && !Array.isArray(candidate.budgets)) {
      Object.keys(candidate.budgets).forEach(function (key) {
        var amount = Number(candidate.budgets[key]);
        if (/^\d{4}-\d{2}$/.test(key) && isFinite(amount) && amount > 0) clean.budgets[key] = amount;
      });
    }
    if (Array.isArray(candidate.transactions)) {
      clean.transactions = candidate.transactions.map(normalizeTransaction).filter(Boolean);
    }
    return clean;
  }

  function normalizeTransaction(item) {
    if (!item || typeof item !== "object") return null;
    var amount = Number(item.amount);
    var type = item.type === "income" ? "income" : "expense";
    if (!isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(String(item.date || ""))) return null;
    var category = getCategory(item.categoryId, type);
    return {
      id: String(item.id || createId()),
      type: type,
      amount: Math.round(amount * 100) / 100,
      categoryId: category.id,
      date: String(item.date),
      note: String(item.note || "").slice(0, 80),
      createdAt: String(item.createdAt || new Date().toISOString())
    };
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast("Storage is full. Export a backup before adding more.");
    }
  }

  function applyTheme() {
    if (state.theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", state.theme);
  }

  function renderAll() {
    renderOverview();
    renderTransactions();
    renderInsights();
    renderSettings();
    updateCurrencySymbols();
  }

  function renderOverview() {
    var monthly = transactionsForMonth(activeMonth);
    var totals = totalsFor(monthly);
    var budget = Number(state.budgets[activeMonth] || 0);
    var balance = totals.income - totals.expense;
    var remaining = budget - totals.expense;
    var ratio = budget > 0 ? totals.expense / budget : 0;

    elements.monthLabel.textContent = formatMonth(activeMonth);
    elements.monthlyBalance.textContent = formatMoney(balance);
    elements.monthlyIncome.textContent = formatMoney(totals.income);
    elements.monthlySpent.textContent = formatMoney(totals.expense);

    if (budget > 0) {
      var percentage = Math.round(ratio * 100);
      elements.budgetStatusPill.textContent = percentage + "% used";
      elements.budgetRemaining.textContent = remaining >= 0
        ? formatMoney(remaining) + " remaining"
        : formatMoney(Math.abs(remaining)) + " over budget";
      elements.budgetProgress.style.width = Math.min(100, percentage) + "%";
      elements.budgetProgress.style.backgroundColor = ratio > 1 ? "var(--expense)" : "var(--brand)";
      elements.budgetUsedLabel.textContent = formatMoney(totals.expense) + " spent";
      elements.budgetTotalLabel.textContent = "of " + formatMoney(budget);
    } else {
      elements.budgetStatusPill.textContent = "No budget";
      elements.budgetRemaining.textContent = "Set your budget";
      elements.budgetProgress.style.width = "0%";
      elements.budgetUsedLabel.textContent = formatMoney(totals.expense) + " spent";
      elements.budgetTotalLabel.textContent = "No limit";
    }

    renderCategoryOverview(monthly);
    renderRecentTransactions(monthly);
  }

  function renderCategoryOverview(monthly) {
    var categoryTotals = expenseCategoryTotals(monthly);
    if (!categoryTotals.length) {
      elements.categoryOverview.innerHTML = emptyStateHTML("◎", "No spending yet", "Add an expense to see where your money goes.", true);
      return;
    }

    var total = categoryTotals.reduce(function (sum, item) { return sum + item.amount; }, 0);
    var cursor = 0;
    var gradientParts = categoryTotals.map(function (item) {
      var start = cursor;
      cursor += item.amount / total * 100;
      return item.category.color + " " + start.toFixed(2) + "% " + cursor.toFixed(2) + "%";
    });
    var top = categoryTotals.slice(0, 4);
    var rows = top.map(function (item) {
      return '<div class="mini-category-row"><i style="background:' + item.category.color + '"></i><span>' +
        escapeHTML(item.category.name) + '</span><strong>' + formatMoney(item.amount) + "</strong></div>";
    }).join("");

    elements.categoryOverview.innerHTML =
      '<div class="category-chart-layout">' +
        '<div class="donut" style="background:conic-gradient(' + gradientParts.join(",") + ')">' +
          '<div class="donut-center"><strong>' + formatMoney(total) + '</strong><small>total</small></div>' +
        '</div>' +
        '<div class="mini-category-list">' + rows + "</div>" +
      "</div>";
  }

  function renderRecentTransactions(monthly) {
    var recent = sortedTransactions(monthly).slice(0, 4);
    if (!recent.length) {
      elements.recentTransactions.innerHTML = emptyStateHTML("＋", "Your month is ready", "Add your first expense or income entry.", true);
      return;
    }
    elements.recentTransactions.innerHTML = recent.map(transactionRowHTML).join("");
  }

  function renderTransactions() {
    if (!elements.searchInput) return;
    var query = elements.searchInput.value.trim().toLowerCase();
    var type = elements.typeFilter.value;
    var categoryId = elements.categoryFilter.value;
    var filtered = sortedTransactions(state.transactions).filter(function (transaction) {
      var category = getCategory(transaction.categoryId, transaction.type);
      var haystack = (transaction.note + " " + category.name).toLowerCase();
      return (type === "all" || transaction.type === type) &&
        (categoryId === "all" || transaction.categoryId === categoryId) &&
        (!query || haystack.indexOf(query) >= 0);
    });

    var totals = totalsFor(filtered);
    elements.transactionSummary.innerHTML = "<span>" + filtered.length + (filtered.length === 1 ? " transaction" : " transactions") +
      "</span><span>Net " + formatMoney(totals.income - totals.expense) + "</span>";

    if (!filtered.length) {
      elements.allTransactions.innerHTML = emptyStateHTML("⌕", state.transactions.length ? "No matching transactions" : "No transactions yet", state.transactions.length ? "Try changing your search or filters." : "Tap the plus button to add your first entry.", !state.transactions.length);
      return;
    }

    var lastDate = "";
    elements.allTransactions.innerHTML = filtered.map(function (transaction) {
      var divider = "";
      if (transaction.date !== lastDate) {
        lastDate = transaction.date;
        divider = '<div class="date-divider">' + escapeHTML(formatDateHeading(transaction.date)) + "</div>";
      }
      return divider + transactionRowHTML(transaction);
    }).join("");
  }

  function renderInsights() {
    if (!elements.trendChart) return;
    var months = [];
    for (var offset = -5; offset <= 0; offset += 1) months.push(shiftMonth(activeMonth, offset));
    var points = months.map(function (key) {
      var totals = totalsFor(transactionsForMonth(key));
      return { key: key, income: totals.income, expense: totals.expense };
    });
    var maxValue = Math.max.apply(null, points.reduce(function (values, point) {
      values.push(point.income, point.expense);
      return values;
    }, [1]));

    elements.trendChart.innerHTML = points.map(function (point) {
      var incomeHeight = point.income ? Math.max(3, point.income / maxValue * 100) : 0;
      var expenseHeight = point.expense ? Math.max(3, point.expense / maxValue * 100) : 0;
      return '<div class="trend-group" aria-label="' + escapeHTML(formatMonth(point.key)) + ': income ' +
        escapeHTML(formatMoney(point.income)) + ", spending " + escapeHTML(formatMoney(point.expense)) + '">' +
        '<span class="trend-bar income" style="height:' + incomeHeight.toFixed(2) + '%"></span>' +
        '<span class="trend-bar expense" style="height:' + expenseHeight.toFixed(2) + '%"></span>' +
        '<span class="trend-label">' + escapeHTML(shortMonth(point.key)) + "</span></div>";
    }).join("");

    var currentTransactions = transactionsForMonth(activeMonth);
    var currentTotals = totalsFor(currentTransactions);
    var categories = expenseCategoryTotals(currentTransactions);
    var budget = Number(state.budgets[activeMonth] || 0);
    var savingsRate = currentTotals.income > 0
      ? (currentTotals.income - currentTotals.expense) / currentTotals.income * 100
      : 0;
    var divisor = monthDayDivisor(activeMonth);
    var dailyAverage = currentTotals.expense / divisor;
    var topCategory = categories.length ? categories[0].category.name : "—";

    elements.insightMetrics.innerHTML =
      metricCardHTML("Savings rate", currentTotals.income ? Math.round(savingsRate) + "%" : "—") +
      metricCardHTML("Daily average", formatMoney(dailyAverage)) +
      metricCardHTML("Top category", topCategory) +
      metricCardHTML("Budget left", budget ? formatMoney(budget - currentTotals.expense) : "Not set");

    if (!categories.length) {
      elements.categoryBreakdown.innerHTML = emptyStateHTML("◎", "Nothing to analyse", "Add expenses for " + formatMonth(activeMonth) + " to build your breakdown.", false);
      return;
    }

    var categoryTotal = categories.reduce(function (sum, item) { return sum + item.amount; }, 0);
    elements.categoryBreakdown.innerHTML = categories.map(function (item) {
      var percent = item.amount / categoryTotal * 100;
      return '<div class="breakdown-row">' +
        '<div class="breakdown-icon">' + escapeHTML(item.category.icon) + "</div>" +
        '<div class="breakdown-main"><div class="breakdown-title"><span>' + escapeHTML(item.category.name) +
        '</span><span>' + Math.round(percent) + '%</span></div><div class="breakdown-track"><span style="width:' +
        percent.toFixed(2) + "%;background:" + item.category.color + '"></span></div></div>' +
        '<div class="breakdown-amount">' + formatMoney(item.amount) + "</div></div>";
    }).join("");
  }

  function renderSettings() {
    if (!elements.currencySelect) return;
    elements.currencySelect.value = state.currency;
    elements.themeSelect.value = state.theme;
    var budget = Number(state.budgets[activeMonth] || 0);
    elements.settingsBudgetValue.textContent = budget ? formatMoney(budget) + " for " + shortMonth(activeMonth) : "Not set for " + shortMonth(activeMonth);
    elements.dataCountLabel.textContent = state.transactions.length + (state.transactions.length === 1 ? " transaction saved" : " transactions saved");
  }

  function showView(viewName) {
    var target = document.getElementById(viewName + "View");
    if (!target) return;
    activeView = viewName;
    document.querySelectorAll(".view").forEach(function (view) {
      view.hidden = view !== target;
    });
    document.querySelectorAll("[data-view]").forEach(function (button) {
      var selected = button.dataset.view === viewName;
      button.classList.toggle("is-active", selected);
      if (selected) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    elements.screenTitle.textContent = target.dataset.title;
    elements.quickExportButton.hidden = viewName === "settings";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeMonth(offset) {
    activeMonth = shiftMonth(activeMonth, offset);
    renderAll();
  }

  function openTransactionDialog(id) {
    elements.transactionForm.reset();
    elements.amountError.textContent = "";
    elements.editingTransactionId.value = "";
    elements.deleteTransactionButton.hidden = true;
    var transaction = id ? state.transactions.find(function (item) { return item.id === id; }) : null;

    if (transaction) {
      elements.transactionDialogTitle.textContent = "Edit transaction";
      elements.editingTransactionId.value = transaction.id;
      elements.amountInput.value = transaction.amount;
      elements.dateInput.value = transaction.date;
      elements.noteInput.value = transaction.note;
      selectedCategoryId = transaction.categoryId;
      setTransactionType(transaction.type, true);
      elements.deleteTransactionButton.hidden = false;
    } else {
      elements.transactionDialogTitle.textContent = "Add transaction";
      elements.amountInput.value = "";
      elements.noteInput.value = "";
      elements.dateInput.value = activeMonth === monthKey(new Date()) ? todayISO() : activeMonth + "-01";
      selectedCategoryId = firstCategory("expense").id;
      setTransactionType("expense", true);
    }

    updateCurrencySymbols();
    elements.transactionDialog.showModal();
    window.setTimeout(function () { elements.amountInput.focus(); }, 160);
  }

  function closeTransactionDialog() {
    elements.transactionDialog.close();
  }

  function setTransactionType(type, preserveCategory) {
    elements.transactionType.value = type;
    document.querySelectorAll("[data-transaction-type]").forEach(function (button) {
      button.classList.toggle("is-selected", button.dataset.transactionType === type);
    });
    var category = CATEGORY_DEFINITIONS.find(function (item) { return item.id === selectedCategoryId; });
    if (!preserveCategory || !category || category.type !== type) selectedCategoryId = firstCategory(type).id;
    renderCategoryPicker();
  }

  function renderCategoryPicker() {
    var type = elements.transactionType.value;
    elements.categoryPicker.innerHTML = CATEGORY_DEFINITIONS.filter(function (category) {
      return category.type === type;
    }).map(function (category) {
      var selected = category.id === selectedCategoryId;
      return '<button class="category-choice' + (selected ? " is-selected" : "") +
        '" type="button" data-category-id="' + category.id + '" aria-pressed="' + selected + '">' +
        '<span class="category-emoji">' + escapeHTML(category.icon) + '</span><span class="category-name">' +
        escapeHTML(category.name) + "</span></button>";
    }).join("");
  }

  function saveTransaction(event) {
    event.preventDefault();
    var amount = Number(elements.amountInput.value);
    if (!isFinite(amount) || amount <= 0) {
      elements.amountError.textContent = "Enter an amount greater than zero.";
      elements.amountInput.focus();
      return;
    }
    if (!elements.dateInput.value) {
      elements.amountError.textContent = "Choose a valid date.";
      return;
    }

    var editingId = elements.editingTransactionId.value;
    var existing = editingId ? state.transactions.find(function (item) { return item.id === editingId; }) : null;
    var transaction = {
      id: editingId || createId(),
      type: elements.transactionType.value,
      amount: Math.round(amount * 100) / 100,
      categoryId: selectedCategoryId,
      date: elements.dateInput.value,
      note: elements.noteInput.value.trim().slice(0, 80),
      createdAt: existing ? existing.createdAt : new Date().toISOString()
    };

    if (existing) {
      state.transactions = state.transactions.map(function (item) { return item.id === editingId ? transaction : item; });
    } else {
      state.transactions.push(transaction);
    }
    activeMonth = transaction.date.slice(0, 7);
    persist();
    closeTransactionDialog();
    renderAll();
    showToast(existing ? "Transaction updated" : "Transaction saved");
  }

  function deleteEditingTransaction() {
    var id = elements.editingTransactionId.value;
    if (!id) return;
    if (!window.confirm("Delete this transaction? This cannot be undone.")) return;
    state.transactions = state.transactions.filter(function (item) { return item.id !== id; });
    persist();
    closeTransactionDialog();
    renderAll();
    showToast("Transaction deleted");
  }

  function openBudgetDialog() {
    elements.budgetMonthName.textContent = formatMonth(activeMonth);
    elements.budgetInput.value = state.budgets[activeMonth] || "";
    updateCurrencySymbols();
    elements.budgetDialog.showModal();
    window.setTimeout(function () { elements.budgetInput.focus(); }, 140);
  }

  function saveBudget(event) {
    event.preventDefault();
    var amount = Number(elements.budgetInput.value || 0);
    if (!isFinite(amount) || amount < 0) return;
    if (amount === 0) delete state.budgets[activeMonth];
    else state.budgets[activeMonth] = Math.round(amount * 100) / 100;
    persist();
    elements.budgetDialog.close();
    renderAll();
    showToast(amount ? "Monthly budget saved" : "Monthly budget removed");
  }

  function populateCategoryFilter() {
    elements.categoryFilter.innerHTML = '<option value="all">All categories</option>' +
      CATEGORY_DEFINITIONS.map(function (category) {
        return '<option value="' + category.id + '">' + escapeHTML(category.name) + " · " +
          (category.type === "expense" ? "Expense" : "Income") + "</option>";
      }).join("");
  }

  function updateCurrencySymbols() {
    var symbol = CURRENCY_SYMBOLS[state.currency] || state.currency;
    elements.amountCurrencySymbol.textContent = symbol;
    elements.budgetCurrencySymbol.textContent = symbol;
  }

  function updateInstallCard() {
    var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    elements.installCard.hidden = standalone;
  }

  async function exportCSV() {
    if (!state.transactions.length) {
      showToast("Add a transaction before exporting.");
      return;
    }
    var rows = [["Date", "Type", "Category", "Note", "Amount", "Currency"]];
    sortedTransactions(state.transactions).slice().reverse().forEach(function (transaction) {
      var category = getCategory(transaction.categoryId, transaction.type);
      rows.push([
        transaction.date,
        transaction.type,
        category.name,
        transaction.note,
        transaction.amount.toFixed(2),
        state.currency
      ]);
    });
    var csv = "\uFEFF" + rows.map(function (row) { return row.map(csvCell).join(","); }).join("\n");
    await shareOrDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), "spendwise-transactions.csv", "SpendWise transactions");
    showToast("CSV export ready");
  }

  async function exportBackup() {
    var payload = {
      app: "SpendWise",
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      data: state
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    await shareOrDownload(blob, "spendwise-backup-" + todayISO() + ".json", "SpendWise backup");
    showToast("Backup ready");
  }

  async function shareOrDownload(blob, filename, title) {
    var file = new File([blob], filename, { type: blob.type });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: title });
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importBackup(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result));
        var candidate = parsed && parsed.data ? parsed.data : parsed;
        var imported = normalizeState(candidate);
        if (!window.confirm("Restore this backup? It will replace the data currently in SpendWise.")) return;
        state = imported;
        activeMonth = monthKey(new Date());
        applyTheme();
        persist();
        renderAll();
        showToast("Backup restored");
      } catch (error) {
        showToast("That file is not a valid SpendWise backup.");
      } finally {
        elements.importFileInput.value = "";
      }
    };
    reader.readAsText(file);
  }

  function addDemoData() {
    if (state.transactions.length && !window.confirm("Add sample transactions alongside your current data?")) return;
    state.transactions = state.transactions.filter(function (item) { return item.id.indexOf("demo-") !== 0; });
    var current = monthKey(new Date());
    var templates = [
      { type: "income", categoryId: "salary", amount: 3850, day: 1, note: "Monthly salary" },
      { type: "expense", categoryId: "housing", amount: 1250, day: 2, note: "Rent" },
      { type: "expense", categoryId: "groceries", amount: 92.4, day: 5, note: "Weekly groceries" },
      { type: "expense", categoryId: "transport", amount: 55, day: 7, note: "Fuel" },
      { type: "expense", categoryId: "dining", amount: 38.5, day: 10, note: "Dinner" },
      { type: "expense", categoryId: "bills", amount: 114.2, day: 14, note: "Electricity and internet" },
      { type: "expense", categoryId: "shopping", amount: 76.99, day: 18, note: "Household items" },
      { type: "expense", categoryId: "family", amount: 120, day: 21, note: "Family support" }
    ];
    for (var offset = -5; offset <= 0; offset += 1) {
      var key = shiftMonth(current, offset);
      templates.forEach(function (template, index) {
        var variation = 1 + ((offset + 5) * 0.025) + (index % 3) * 0.018;
        var date = key + "-" + String(Math.min(template.day, daysInMonth(key))).padStart(2, "0");
        state.transactions.push({
          id: "demo-" + key + "-" + index,
          type: template.type,
          categoryId: template.categoryId,
          amount: Math.round(template.amount * variation * 100) / 100,
          date: date,
          note: template.note,
          createdAt: date + "T12:00:00.000Z"
        });
      });
    }
    if (!state.budgets[current]) state.budgets[current] = 2000;
    activeMonth = current;
    persist();
    renderAll();
    showView("overview");
    showToast("Demo data added");
  }

  function clearAllData() {
    if (!state.transactions.length && !Object.keys(state.budgets).length) {
      showToast("There is no financial data to erase.");
      return;
    }
    if (!window.confirm("Erase every transaction and monthly budget? Export a backup first if you may need them.")) return;
    state.transactions = [];
    state.budgets = {};
    persist();
    renderAll();
    showToast("All financial data erased");
  }

  function transactionsForMonth(key) {
    return state.transactions.filter(function (transaction) { return transaction.date.slice(0, 7) === key; });
  }

  function totalsFor(transactions) {
    return transactions.reduce(function (totals, transaction) {
      totals[transaction.type] += Number(transaction.amount);
      return totals;
    }, { income: 0, expense: 0 });
  }

  function expenseCategoryTotals(transactions) {
    var grouped = {};
    transactions.filter(function (transaction) { return transaction.type === "expense"; }).forEach(function (transaction) {
      grouped[transaction.categoryId] = (grouped[transaction.categoryId] || 0) + transaction.amount;
    });
    return Object.keys(grouped).map(function (id) {
      return { category: getCategory(id, "expense"), amount: grouped[id] };
    }).sort(function (a, b) { return b.amount - a.amount; });
  }

  function sortedTransactions(transactions) {
    return transactions.slice().sort(function (a, b) {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }

  function transactionRowHTML(transaction) {
    var category = getCategory(transaction.categoryId, transaction.type);
    var label = transaction.note || category.name;
    var secondary = transaction.note ? category.name + " · " + formatShortDate(transaction.date) : formatShortDate(transaction.date);
    var sign = transaction.type === "expense" ? "−" : "+";
    return '<button class="transaction-row" type="button" data-edit-id="' + escapeHTML(transaction.id) +
      '" aria-label="Edit ' + escapeHTML(label) + ", " + escapeHTML(formatMoney(transaction.amount)) + '">' +
      '<span class="transaction-icon">' + escapeHTML(category.icon) + '</span><span class="transaction-copy"><strong>' +
      escapeHTML(label) + "</strong><small>" + escapeHTML(secondary) + '</small></span><strong class="transaction-amount ' +
      transaction.type + '">' + sign + formatMoney(transaction.amount) + "</strong></button>";
  }

  function emptyStateHTML(symbol, title, copy, showAdd) {
    return '<div class="empty-state"><div class="empty-symbol" aria-hidden="true">' + escapeHTML(symbol) +
      "</div><strong>" + escapeHTML(title) + "</strong><p>" + escapeHTML(copy) + "</p>" +
      (showAdd ? '<button class="small-primary-button" type="button" data-empty-add>Add transaction</button>' : "") +
      "</div>";
  }

  function metricCardHTML(label, value) {
    return '<div class="metric-card"><small>' + escapeHTML(label) + "</small><strong>" + escapeHTML(String(value)) + "</strong></div>";
  }

  function getCategory(id, type) {
    return CATEGORY_DEFINITIONS.find(function (category) { return category.id === id && category.type === type; }) || firstCategory(type);
  }

  function firstCategory(type) {
    return CATEGORY_DEFINITIONS.find(function (category) { return category.type === type; });
  }

  function formatMoney(amount) {
    var safe = isFinite(Number(amount)) ? Number(amount) : 0;
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: state.currency,
      minimumFractionDigits: Math.abs(safe) >= 10000 ? 0 : 2,
      maximumFractionDigits: 2
    }).format(safe);
  }

  function formatMonth(key) {
    var date = dateFromMonthKey(key);
    return new Intl.DateTimeFormat("en-IE", { month: "long", year: "numeric" }).format(date);
  }

  function shortMonth(key) {
    return new Intl.DateTimeFormat("en-IE", { month: "short" }).format(dateFromMonthKey(key));
  }

  function formatShortDate(iso) {
    return new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric" }).format(dateFromISO(iso));
  }

  function formatDateHeading(iso) {
    var date = dateFromISO(iso);
    var today = dateFromISO(todayISO());
    var yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (sameDay(date, today)) return "Today";
    if (sameDay(date, yesterday)) return "Yesterday";
    return new Intl.DateTimeFormat("en-IE", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(date);
  }

  function monthKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }

  function todayISO() {
    var now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }

  function shiftMonth(key, offset) {
    var date = dateFromMonthKey(key);
    date.setMonth(date.getMonth() + offset);
    return monthKey(date);
  }

  function dateFromMonthKey(key) {
    var parts = key.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, 1, 12);
  }

  function dateFromISO(iso) {
    var parts = iso.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12);
  }

  function daysInMonth(key) {
    var date = dateFromMonthKey(key);
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function monthDayDivisor(key) {
    if (key === monthKey(new Date())) return Math.max(1, new Date().getDate());
    return daysInMonth(key);
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "tx-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function csvCell(value) {
    var text = String(value == null ? "" : value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character];
    });
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(function () { elements.toast.classList.remove("is-visible"); }, 2400);
  }
})();
