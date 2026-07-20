# SpendWise for iPhone

SpendWise is a private, offline-first expense tracker designed for the iPhone 14 Pro Max. It tracks expenses and income, monthly budgets, categories, six-month trends and searchable transactions. It can export CSV files for Numbers or Excel and create/import JSON backups.

**Live app:** https://bilalamin014.github.io/spendwise-expense-tracker/

## Install on an iPhone

An installable web app must be served from an HTTPS website. Upload the contents of this folder to any static host such as GitHub Pages, Cloudflare Pages or Netlify.

1. Open the published address in **Safari** on the iPhone.
2. Tap the **Share** button.
3. Choose **Add to Home Screen**.
4. Tap **Add**. SpendWise will then open like a normal app and work offline.

## Test on a computer

From this folder, start a local web server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser. Do not open `index.html` directly if you want to test offline installation, because service workers require HTTPS or localhost.

## Privacy and storage

All transactions, preferences and budgets are kept in browser local storage on the device. Nothing is uploaded by the app. Use **Settings → Download backup** regularly, especially before clearing Safari website data or changing phones.
