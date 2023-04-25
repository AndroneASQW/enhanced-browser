const path = require('path');

const abpSettings = require('../../src/pages/adBlockPlusSettingPage');
const nfBrowser = require('../../src/browser/enhancedBrowser');

jest.retryTimes(2);

async function runTestInTryFinally(funcToRun) {
    const browser = new nfBrowser.EnhancedBrowser(
        '/some/path/to/chrome/profile',
        '/some/path/to/adblockplus',
    );
    try {
        jest.useFakeTimers();
        await browser.launch(true, false, false);
        const abpSettingsPage = path.resolve(
            './tests/data/htmls/mockAbpSettingsPage.html'
        );
        let page = await browser.goto(
            `file://${abpSettingsPage}`
        );
        let abpPage = new abpSettings.AdBlockPlusSettingsPage(page);
        await funcToRun(abpPage);
    } finally {
        jest.useRealTimers();
        await browser.close();
    }
}

async function testCheckboxValue(puppeteerPage, selector, expectedValue) {
    const handle = await puppeteerPage.$(selector);
    const result = await handle.evaluate((el) => {
        return el.ariaChecked;
    });

    expect(result).toStrictEqual(expectedValue);
}

async function testSettingCheckboxValue(to, from) {
    await runTestInTryFinally( async (abpPage) => {
        const container = 'div[id="test-set-checkbox"]';
        const selector = (
            `${container}>button[id="set-checkbox-${to}-from-${from}"]`
        );

        await abpPage.setCheckbox(selector, to);
        await testCheckboxValue(abpPage.page, selector, to);
    }); 
}

test('CISAFE-Test initialization', async () => {
    await runTestInTryFinally((abpPage) => {
        const abpSettingsPage = path.resolve(
            './tests/data/htmls/mockAbpSettingsPage.html'
        );
        const url = `file://${abpSettingsPage}`;
        expect(abpPage.page.url())
            .toStrictEqual(url);
    })
});

test('CISAFE-Test checkbox setting - true from true', async () => {
    await testSettingCheckboxValue('true', 'true');
});

test('CISAFE-Test checkbox setting - true from false', async () => {
    await testSettingCheckboxValue('true', 'false');
});

test('CISAFE-Test checkbox setting - false from true', async () => {
    await testSettingCheckboxValue('false', 'true');
});

test('CISAFE-Test checkbox setting - false from false', async () => {
    await testSettingCheckboxValue('false', 'false');
});

test('CISAFE-Test checkbox setting - error on invalid value', async () => {
    try {
        await runTestInTryFinally(async (abpPage) => {
            await abpPage.setCheckbox('some-selector', 'undecided');
        });
    } catch (e) {
        const expErr = (
            "Wrong value! Expected one of ['true', 'false'], got: undecided"
        );
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toStrictEqual(expErr);
    }
});

test('CISAFE-Test disabling Acceptable Ads', async () => {
    await runTestInTryFinally(async (abpPage) => {
        await abpPage.disableAcceptableAds();
        await testCheckboxValue(
            abpPage.page, 
            'button[id="acceptable-ads-allow"]', 
            'false',
        );
    });
});

test('CISAFE-Test Enabling anti-tracking', async () => {
    await runTestInTryFinally(async (abpPage) => {
        await abpPage.enableAllAntiTrackingOptions();

        const checkboxSelectors = [
            'button[id="additional-tracking"]', // Additional trackers
            'button[id="cookie-warnings"]', // Cookie warnings
            'button[id="push-notifications"]', // Push notifications
            'button[id="social-media-tracking"]', // Social media trackers
        ]
        for (let selector of checkboxSelectors)
            await testCheckboxValue(abpPage.page, selector, 'true');
    });
});

test('CISAFE-Test going to advanced tab', async () => {
    await runTestInTryFinally(async (abp) => {
        await abp.goToAdvancedTab();
        const handler = await abp.page.$('a[id="tab-advanced"]');
        const result = await handler.evaluate(element => element.clicked);

        expect(result).toStrictEqual('true');
        expect(abp.isAdvanced).toBeTrue;
    });
});

test('CISAFE-Test filter lists updating', async () => {
    await runTestInTryFinally(async (abpPage) => {
        await abpPage.updateAllFilterLists();
        const handler = await abpPage.page.$('button[id="update"]');
        const result = await handler.evaluate(element => element.clicked);

        expect(abpPage.isAdvanced).toBeTrue;
        expect(result).toStrictEqual('true');
    });
});

test('CISAFE-Test adding filter list - already added', async () => {
    await runTestInTryFinally(async (abpPage) => {
        await abpPage.addFilterList(
            'li[id="filter-list-1"]', 
            'https://download.filter-list-1.com',
        );

        const handle = await abpPage.page.$('li[id="filter-list-1"]');;
        expect(handle).isNotNull;
        expect(abpPage.isAdvanced).isTrue;
    })
});

test('CISAFE-Test adding filter list - new filter list', async () => {
    await runTestInTryFinally(async (abpPage) => {
        await abpPage.addFilterList(
            'li[id="filter-list-3"]', 
            'https://download.filter-list-3.com',
        );

        // Check button was clicked
        let handle = await abpPage.page.$(
            'button[data-action="validate-import-subscription"]',
        );
        let clicked = await handle.evaluate(element => element.clicked);
        expect(clicked).toStrictEqual('true');

        // Check the correct value was inserted in the text input
        handle = await abpPage.page.$(
            'input[id="import-list-url"]',
        );
        let inputText = await handle.evaluate(element => element.value);
        expect(inputText)
            .toStrictEqual('https://download.filter-list-3.com');

        // Check the element was added
        handle = await abpPage.page.$('li[id="filter-list-3"]');
        expect(handle).isNotNull;

        // Check we're on the advanced page
        expect(abpPage.isAdvanced).isTrue;
    })
});