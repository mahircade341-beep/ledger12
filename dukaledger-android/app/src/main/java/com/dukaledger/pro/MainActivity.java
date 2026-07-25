package com.dukaledger.pro;

import android.net.Uri;
import android.os.Bundle;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.TrustedWebUtils;
import androidx.appcompat.app.AppCompatActivity;

/**
 * DukaLedger Pro - Trusted Web Activity wrapper
 * 
 * Launches the PWA as a full-screen native Android app
 * using Chrome Custom Tabs in Trusted Web Activity mode.
 */
public class MainActivity extends AppCompatActivity {

    private static final String PWA_URL = "https://ledger12.netlify.app/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder();
        builder.setShowTitle(false);
        builder.setUrlBarHidingEnabled(true);

        CustomTabsIntent customTabsIntent = builder.build();
        customTabsIntent.intent.setPackage("com.android.chrome");

        // Launch as Trusted Web Activity for full-screen PWA experience
        TrustedWebUtils.launchAsTrustedWebActivity(
            this,
            customTabsIntent,
            Uri.parse(PWA_URL)
        );

        finish();
    }
}
