const url = require('url');

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const browserPage = require('../pages/browserPage');
const browserErrors = require('../errors/browserErrors');
const sleep = require('../utils/sleep');
const adblockPlusSettings = require('../pages/adBlockPlusSettingPage');


class EnhancedBrowser {
    constructor(chromeProfilePath, adBlockPlusPath) {
        this.chromium = null;
        this.chromeProfilePath = chromeProfilePath;
        this.adblockPlusPath = adBlockPlusPath;
    }

    /**
     * Launch a browser. Either in headless mode or not.
     * 
     * @param {boolean} headless - Whether the browser should be launched 
     *      in headless mode or not.
     * @param {boolean} includeABP - Whether the browser should add AdblockPlus
     *      as an extension or not.
     */
    async launch(headless, includeABP, includeChromeProfile) {
        let options = ['--no-sandbox'];

        if (includeABP) {
            options.push(`--disable-extensions-except=${this.adblockPlusPath}`);
            options.push(`--load-extension=${this.adblockPlusPath}`);
        }

        if (includeChromeProfile)
            options.push(`--user-data-dir=${this.chromeProfilePath}`);

        puppeteer.use(StealthPlugin());
        this.chromium = await puppeteer.launch({
            headless,
            args: options,
        });
    }

    /**
     * Close the browser, if it was initiated.
     */
    async close() {
        if (this.chromium) {
            await this.chromium.close();
            this.chromium = null;
        }
    }

    /**
     * Create a BrowserPage for a specific url.
     * 
     * @param {string} url - The url of the page that should be
     *      loaded by the browser.
     * 
     * @returns {browserPage.BrowserPage} The resulting webpage.
     */
    async getBrowserPageFor(url) {
        let page = await this.goto(url);

        return new browserPage.BrowserPage(page);
    }

    /**
     * Go to a specific url.
     * 
     * @param {string} url - The url to go to
     * 
     * @returns {puppeteer.Page} The resulted puppeteer page.
     */
    async goto(url) {
        if (this.chromium == null)
            throw new browserErrors.BrowserNotLaunchedError();
        let page = await this.chromium.newPage();
        await page.goto(url, {waitUntil: 'networkidle2'});

        return page;
    }

    /**
     *  Find the URL associated with the setting page of our 
     * AdblockPlus instance.
     * 
     * @returns {adblockPlusSettings.AdBlockPlusSettingsPage} With the ABP 
     *  settings page object.
     * 
     * @throws {browserErrors.BrowserNotLaunchedError} If this method was
     *  called before the browser was loaded.
     * @throws {browserErrors.AdblockPlusNotLoaded} If no AdBlockPlus
     *  instance could be found.
     */
    async getAdblockPlusSettingsPage() {
        if (this.chromium == null)
            throw new browserErrors.BrowserNotLaunchedError();
        
        // For whatever reason Puppeteer sometimes forgets to
        // list ABP background page as a target. This helps a little.
        await sleep.sleep(3000);

        const targets = await this.chromium.targets();
        const backgroundPageTarget = targets.find(target => {
            return (
                (target.type() == 'background_page') &&
                (target._targetInfo.title == 'Adblock Plus - free ad blocker')
            )
        });
        
        if (typeof backgroundPageTarget == 'undefined')
            throw new browserErrors.AdblockPlusNotLoaded();
        const bakckgroundPageUrl = url.parse(
            backgroundPageTarget.url()
        ).host;

        const puppeteerPage = await this.goto(
            `chrome-extension://${bakckgroundPageUrl}/desktop-options.html`
        );

        return new adblockPlusSettings.AdBlockPlusSettingsPage(puppeteerPage);
    }
}

module.exports = {EnhancedBrowser};
