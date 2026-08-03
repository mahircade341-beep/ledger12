# Publishing DukaHub to the Google Play Store

DukaHub is wrapped as a native Android app with **Capacitor** (`android/` folder).
The web app (Vite build in `dist/`) is copied into the Android shell by `cap sync`,
so the Play Store app is the exact same codebase as the website — just packaged
as an installable app that works fully offline.

> **App identity**
> - Package ID (applicationId): **`com.dukahub.app`** — set in `capacitor.config.ts`.
>   This cannot change after the first upload, so only change it if you must, before
>   creating the app in Play Console.
> - App name on the home screen: **DukaHub** (from `capacitor.config.ts` → `appName`).

---

## 1. What you need (one-time)

| Item | Where to get it |
|------|-----------------|
| **Google Play Console account** | [play.google.com/console](https://play.google.com/console) — **US$25 one-time** registration fee |
| **Android Studio** (free) | [developer.android.com/studio](https://developer.android.com/studio) — used to build the signed `.aab` file |
| **Privacy Policy URL** | Already built into the app: your site's `/privacy` page (required by Play) |

## 2. Build the Android app (on your computer)

```bash
# 1. Pull latest web build into the Android project
npm run android:sync        # = vite build && cap sync android

# 2. Open the Android project in Android Studio
npm run android:open        # or: open android/ in Android Studio manually
```

In Android Studio:

1. Wait for Gradle to finish syncing (first time downloads dependencies).
2. **Menu → Build → Generate Signed App Bundle / APK…**
3. Choose **Android App Bundle (.aab)** — Play requires `.aab`, not `.apk`.
4. Create a **new keystore** (or reuse one). **Keep the keystore file + passwords
   somewhere safe — you need them for every future update.**
5. Let the build finish. The `.aab` lands in
   `android/app/build/outputs/bundle/release/`.

## 3. Upload to Play Console

1. Play Console → **Create app** → name **DukaHub**, package ID **`com.dukahub.app`**.
2. Open **Testing → Closed testing** (recommended first) or **Production**.
3. Upload the `.aab` file.
4. Fill in the **Store listing**:
   - Short description: *"Free POS & inventory for Kenyan shops. Works offline —
     sales, stock, Daftari and cash drawer sync automatically when you're back online."*
   - Full description: expand on features (POS, stock alerts, M-Pesa & cash
     tracking, Daftari debtor ledger, cash drawer audit, insights).
   - **Screenshots:** 2+ phone screenshots (1080×1920). Use the included helper:
     `node scripts/generate-screenshots.cjs` (needs Puppeteer + a running dev
     server) or take screenshots manually and crop to 1080×1920.
   - Icon: `public/icons/icon-512.png` (512×512) and feature graphic (1024×500).
   - **App category:** Business → Business / Productivity.
5. **Data safety form:** state that financial/sales data is stored, encrypted in
   transit (HTTPS), not shared with third parties, and deletable by the user
   (account deletion = data removal).
6. **Privacy policy:** link to your live `/privacy` page.
7. When the listing is complete, submit for review. First review usually takes a
   few days.

## 4. Offline-first behavior (already built in)

- **Everything reads from the device instantly** (IndexedDB cache per account).
- **Sales/stock/Daftari edits made offline are queued on the device** and pushed
  to the account automatically the moment a connection returns (watch the sync
  pill in the sidebar: green = backed up, amber = offline with N changes waiting).
- **Sign-up / sign-in requires a connection** (account creation happens online);
  after that the app is fully usable without internet.
- **Barcode camera** works in the app (CAMERA permission is declared — Android
  shows the prompt on first scan).

## Notes

- **Google sign-in** works in the web app. Inside the Android shell, prefer
  **email + password** sign-in (OAuth deep links need extra config). Both use the
  same account.
- **Update flow:** make web changes → `npm run android:sync` → rebuild the `.aab`
  in Android Studio with the **same keystore** → upload as a new release.
- Supabase needs to be reachable from the device (`VITE_SUPABASE_URL` is compiled
  into the build at `vite build` time — the same keys used for the website work).
