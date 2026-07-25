# DukaLedger Pro — Android App

This is the Android wrapper for [DukaLedger Pro](https://ledger12.netlify.app/), an offline-first POS and inventory management system for Kenyan micro-retail shops.

Built using **Trusted Web Activity (TWA)** — wraps the PWA as a native Android app via Chrome Custom Tabs.

## Features

- Point of Sale with cash, M-Pesa, and debt payment
- Stock management with barcode scanning and supplier tracking
- Daftari (Debtor Ledger) with partial payment history
- Cash Drawer auditing with opening balance
- Sales analytics with profit calculation
- Fully offline — all data stored locally on device
- App lock password with security question recovery

## Build Instructions

### Prerequisites

- Java JDK 17+
- Android SDK 34+
- Gradle 8.5

### Building

```bash
# Clone the repo
git clone https://github.com/nextlevelbuilder/dukaledger-android
cd dukaledger-android

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
