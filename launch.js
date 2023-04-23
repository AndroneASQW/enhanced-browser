const launching = require('./src/utils/launching');

(async () => {
    browser = await launching.launchHeadfulBrowserWithDefaults(
        'chrome-profile', 'abp-3.12',
    );
    await browser.chromium.disconnect();
})();
