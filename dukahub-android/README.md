# DukaHub — Android App

This is the Android wrapper for [DukaHub](https://ledger12.netlify.app/), a cloud-powered POS and inventory management system for Kenyan micro-retail shops. **Data is stored securely in Supabase** and synced across all devices — sign in on any phone or tablet to access your business.

Built using **Trusted Web Activity (TWA)** — wraps the PWA as a native Android app via Chrome Custom Tabs.

## Features

- Point of Sale with cash, M-Pesa, and debt payment (with debtor search & add)
- Stock management with barcode scanning, supplier tracking, and low-stock alerts
- Daftari (Debtor Ledger) with partial payment history and running balance
- Cash Drawer auditing with opening balance and anti-theft reconciliation
- Sales analytics with profit margin calculation and COGS tracking
- **Cloud sync** — all data stored in Supabase, accessible from any device
- Supabase Auth with email/password, password reset, and security question recovery
- Staff access mode — employees can use POS, Stock, Daftari, and Cash Drawer without a full account
- Glassmorphism UI with dark/light theme and responsive design
- App lock password with security question recovery

## Build Instructions

### Prerequisites

- Java JDK 17+
- Android SDK 34+
- Gradle 8.5

### Building

```bash
# Clone the repo
git clone https://github.com/nextlevelbuilder/dukahub-android
cd dukahub-android

# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease
```

The APK will be at `app/build/outputs/apk/debug/app-debug.apk`

## F-Droid

This app is designed for submission to [F-Droid](https://f-droid.org/). The source is fully open-source with no proprietary dependencies.

## License

AGPL-3.0-or-later
