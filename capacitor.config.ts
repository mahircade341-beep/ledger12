import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config — wraps the Vite build (dist/) in a native Android app
 * for the Google Play Store.
 *
 * - appId: unique Play Store package id (change before first upload if needed)
 * - webDir: Vite's production output, copied into the native shell on `cap sync`
 * - androidScheme https: serves the app from https://localhost inside the WebView
 *   so getUserMedia (barcode camera) and secure storage behave like a real site.
 */
const config: CapacitorConfig = {
  appId: 'com.dukahub.app',
  appName: 'DukaHub',
  webDir: 'dist',
  backgroundColor: '#0a192f',
  android: {
    backgroundColor: '#0a192f',
    allowMixedContent: false,
    captureInput: true,
  },
  server: {
    androidScheme: 'https',
  },
  ios: {
    backgroundColor: '#0a192f',
  },
};

export default config;
