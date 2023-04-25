const fs = require('fs');

const enhancedBrowser = require('../browser/enhancedBrowser');
const sleep = require('./sleep');
const browserErrors = require('../errors/nfError');
const nfConst = require('../constants');

/**
 * Check if a given chrome profile exists and create it, otherwise.
 * 
 * This helps with loading ABP. If we load launch the browser with
 * a chrome profile that does not exist, Chromium will create a new
 * one, but ABP loading fails. So we need to first ensure we have the
 * profile and then launch the browser.
 * 
 * @param {enhancedBrowser.EnhancedBrowser} browser - the browser used 
 *  to create the chrome profile, if needed.
 */
async function ensureChromeProfileExists(browser) {
    if (fs.existsSync(browser.chromeProfile))
        // All good, no need to do anything
        return;

    // Otherwise, we need to actually create the chrome profile.
    // To do this, we need to launch the browser once and it
    // should be created. We'll wrap everything in try-finally
    // to ensure that the browser instance will be closed no
    // matter what happens.
    try {
        await browser.launch(true, false, true);
        sleep.sleep(2000);
    } finally {
        await browser.close();
    }    
}

/**
 * Launch a Headful Chromium instance with the default News Feel settings.
 * 
 * @param {string} chromeProfile - Path to a chrome profile. If not existent,
 *  it will be created.
 * @param {string} abpPath - Path to AdBlockPlus instance. If not existent,
 *  an error will be thrown.
 * 
 * @throws {browserErrors.BrowserDirectoryNotFoundError} - If we cannot find
 *  the directory specified in `abpPath`.
 */
async function launchHeadfulBrowserWithDefaults(chromeProfile, abpPath) {
    // First, ensure that `abpPath` exists
    if (!fs.existsSync(abpPath))
        throw new browserErrors.BrowserDirectoryNotFoundError(abpPath);

    // Initialize the browser
    const browser = new enhancedBrowser.EnhancedBrowser(
        chromeProfile, abpPath,
    );

    // Make sure the chrome profile exists.
    await ensureChromeProfileExists(browser);

    // Launch the browser.
    await browser.launch(
        headless=false,
        includeABP=true,
        includeChromeProfile=true,
    );

    // Get the ABP settings page
    const abpSettingsPage = await browser.getAdblockPlusSettingsPage();

    // Disable Acceptable Ads
    await abpSettingsPage.disableAcceptableAds();

    // Enable anti-tracking filters
    await abpSettingsPage.enableAllAntiTrackingOptions();

    // Go to advanced tab
    await abpSettingsPage.goToAdvancedTab();

    // Add default filterlists
    for (let fl of nfConst.DEFAULT_FILTER_LISTS)
        await abpSettingsPage.addFilterList(fl.selector, fl.url);

    // Update all filterlists
    await abpSettingsPage.updateAllFilterLists();

    return browser;
}

module.exports = {
    launchHeadfulBrowserWithDefaults,
};
