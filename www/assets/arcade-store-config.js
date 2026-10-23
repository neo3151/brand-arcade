/**
 * arcade-store-config.js — public RevenueCat SDK key placeholders.
 *
 * Replace the two strings before a native store build. These are the public
 * SDK keys from the RevenueCat dashboard (Project settings → API keys), one
 * per platform. They are not server secrets, and real keys must not be
 * committed. Leave the REPLACE_WITH_ prefix in place for local web work:
 * ArcadeStore will not call RevenueCat until a real key is present.
 */
(function (root) {
  'use strict';

  root.ARCADE_STORE_CONFIG = {
    iosApiKey: 'REPLACE_WITH_REVENUECAT_IOS_PUBLIC_SDK_KEY',
    androidApiKey: 'REPLACE_WITH_REVENUECAT_ANDROID_PUBLIC_SDK_KEY'
  };

  // TODO: set false before release. While true, owns() treats every catalog
  // entitlement as owned and the tip stamp shows House Favorite. It does not
  // call RevenueCat and it does not write arcade_entitlements, so setting it
  // back to false restores the real cache. Run `node scripts/check-dev-unlock.js`
  // before shipping. That script fails while this is true.
  root.ARCADE_DEV_UNLOCK_ALL = true;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.ARCADE_STORE_CONFIG;
  }
})(typeof window !== 'undefined' ? window : globalThis);
