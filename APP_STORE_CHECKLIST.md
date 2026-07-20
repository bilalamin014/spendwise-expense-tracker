# SpendWise App Store checklist

## Project identity

- App name: **SpendWise**
- Bundle identifier: `com.bilalamin.spendwise`
- Version: `1.0`
- Build: `1`
- Primary category: Finance
- Secondary category: Productivity

## 1. Prepare the Mac

1. Install Xcode 26 or newer from the Mac App Store.
2. Install Node.js 22 or newer.
3. Sign into Xcode with the Apple Account enrolled in the Apple Developer Program.
4. From the project folder, run:

   ```bash
   npm install
   npm run ios
   ```

## 2. Configure signing in Xcode

1. Select the **App** project and the **App** target.
2. Open **Signing & Capabilities**.
3. Enable **Automatically manage signing**.
4. Select your Apple development team.
5. Confirm the bundle identifier is `com.bilalamin.spendwise`.

## 3. Test before submission

- Add, edit and delete expense and income entries.
- Set and remove monthly budgets.
- Test search, filters and six-month insights.
- Export CSV and JSON backup using the native iOS share sheet.
- Restore a valid backup and reject an invalid backup.
- Test light and dark appearance.
- Test with airplane mode enabled.
- Confirm data remains after closing and reopening the app.
- Test on the iPhone 14 Pro Max and at least one smaller supported iPhone simulator.

## 4. Create the App Store Connect record

Create a new iOS app in App Store Connect and use:

- Name: SpendWise
- Bundle ID: `com.bilalamin.spendwise`
- SKU: `SPENDWISE-IOS-001`
- Primary language: English (Ireland or UK)

Prepare a subtitle, description, keywords, support URL, privacy-policy URL, 1024 × 1024 icon and the screenshots requested by App Store Connect.

## 5. Privacy declaration

The current build has no account, advertising, analytics or remote database. Transactions are stored locally on the device. In App Store Connect, answer the App Privacy questions according to the exact released build. If analytics, cloud backup or another SDK is added later, reassess the privacy answers before uploading that version.

## 6. Archive and upload

1. In Xcode, select **Any iOS Device (arm64)**.
2. Choose **Product → Archive**.
3. In Organizer, choose **Distribute App → App Store Connect → Upload**.
4. Resolve any signing or validation warnings.
5. Wait for processing in App Store Connect.
6. Add the build to TestFlight and complete device testing.

## 7. Submit for review

Complete the age rating, App Privacy, pricing/availability, review contact details and review notes. In the review notes, explain that SpendWise is an offline-first personal finance utility and that the CSV/backup actions use the native iOS share sheet.

Apple may scrutinize apps that appear to be simple website wrappers under Guideline 4.2. Native sharing and haptic feedback are included, but Face ID protection, receipt capture and local recurring-expense notifications would further strengthen the App Store submission.
