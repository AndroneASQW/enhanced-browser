const browserPage = require('./browserPage');
const sleep = require('../utils/sleep');

class AdBlockPlusSettingsPage extends browserPage.BrowserPage{

    /**
     * Create a new instance of `AdBlockPlusSettingsPage`.
     * 
     * @param {puppeteer.Page} page Puppeteer object representing
     *  the ABP settings page. 
     */
    constructor(page) {
        super(page);
        this.isAdvanced = false;
    }

    /**
     * Set a checkbox in the page to a specific value.
     * 
     * @param {string} selector - The selector used to identify the
     *  checkbox.
     * @param {string} value - One of 'true' and 'false'. The expected
     *  value of the checkbox at the end of the operation.
     * 
     * @throws {Error} If value is anything other than 'true' and 'false'.
     * @throws {pageErrors.NoElementFoundError} If no element with could 
     *  be found for the given selector.
     */
    async setCheckbox(selector, value) {
        if (value != 'false' && value != 'true')
            throw new Error(
                `Wrong value! Expected one of ['true', 'false'], got: ${value}`
            );
        const handle = await this.getPuppeteerHandleSingle(selector);
        await handle.evaluate(
            /* istanbul ignore next */
            async (element, expectedValue) => {
                const isExpected = (element.ariaChecked == expectedValue);
                if (!isExpected) 
                    // We need to toggle its value.
                    element.click();
                return {expectedValue, ariaChecked: element.ariaChecked, isExpected};
            }, 
            value,
        );
    }

    /**
     *  Disable the Acceptable Ads option in AdBlockPlus.
     *  This ensures that we get as few ads as possible.
     */
    async disableAcceptableAds() {
        const selector = 'button[id="acceptable-ads-allow"]';
        const value = 'false';
        this.setCheckbox(selector, value);
    }

    /**
     * Add all default anti-tracking filter lists to AdBlockPlus,
     * in order to ensure that pages are as clean as possible.
     */
    async enableAllAntiTrackingOptions() {
        const liAriaLabels = [
            'Block additional tracking',
            'Block cookie warnings',
            'Block push notifications',
            'Block social media icons tracking',
        ];

        for (let liAriaLabel of liAriaLabels) {
            let selector = [
                `li[aria-label="${liAriaLabel}"]`,
                `button[data-action="toggle-remove-subscription"]`
            ].join('>');
            this.setCheckbox(selector, 'true');
        }
    }

    /**
     * Navigate to the `Advanced` settings tab.
     */
    async goToAdvancedTab() {
        const selector = 'a[id="tab-advanced"]';
        const handle = await this.getPuppeteerHandleSingle(selector);
        await handle.evaluate(
            /* istanbul ignore next */
            (element) => element.click()
        );
        this.isAdvanced = true;
    }
    
    /**
     * Check if a filterlist is included in ABP and, if not, add it.
     * 
     * @param {string} flSelector - Selector used to check if the filterlist
     *  exists.
     * @param {string} flURL - URL where the new filter list can be added from,
     *  if it's not added already.
     */
    async addFilterList(flSelector, flURL) {
        if (!this.isAdvanced)
            // Need to be on the advanced tab to add/ update filter lists.
            this.goToAdvancedTab();

        // Wait for the filterlists table to become available
        await this.page.waitForSelector('ul[id=all-filter-lists-table]');

        // Check if the Filter List is included
        const elemsWithFLSelector = await this.page.$$(flSelector);
        if (elemsWithFLSelector.length == 1)
            // We're done here, already have the filter list.
            return;

        // Make sure we have the menu to add a new filter list available
        await this.page.waitForSelector('div[id=filterlist-by-url]');

        // Add the Filter List
        await this.page.$eval(
            'input[id="import-list-url"]',
            /* istanbul ignore next */
            (input, flURL) => {
                input.value = flURL;
            }, 
            flURL
        );

        const validateImportButton = await this.page.$(
            'button[data-action="validate-import-subscription"]'
        );
        await validateImportButton.evaluate(
            /* istanbul ignore next */
            element => element.click()
        );

        // Wait for the new filterlist to be added to the table
        await this.page.waitForSelector(flSelector);
    }

    /**
     * Update all added filter lists, to make sure we have the latest version.
     */
    async updateAllFilterLists() {
        if (!this.isAdvanced)
            this.goToAdvancedTab();
        const updateButtonHandle = await this.page.$('button[id="update"]');

        await updateButtonHandle.evaluate(
            /* istanbul ignore next */
            element => element.click()
        );
        sleep.sleep(5000);
    }
}

module.exports = {AdBlockPlusSettingsPage};
