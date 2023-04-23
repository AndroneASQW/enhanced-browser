const path = require('path');

const nfBrowser = require('../../src/browser/newsfeelBrowser');
const browserErrors = require('../../src/errors/browserErrors');
const nfPage = require('../../src/pages/newsfeelPage');
const abpSettingPage = require('../../src/pages/adBlockPlusSettingPage');

jest.retryTimes(2);

test('CISAFE-Test constructor works as expected', () => {
    const browser = new nfBrowser.NewsFeelBrowser(
        '/some/path/to/chrome/profile',
        '/some/path/to/adblockplus',
    );

    expect(browser.chromeProfilePath)
        .toStrictEqual('/some/path/to/chrome/profile');
    expect(browser.adblockPlusPath)
        .toStrictEqual('/some/path/to/adblockplus');
    expect(browser.chromium)
        .isNull;
});

test('CISAFE-Test error when browser not launched', async () => {
    expect.assertions(4);
    const browser = new nfBrowser.NewsFeelBrowser(
        '/some/path/to/chrome/profile',
        '/some/path/to/adblockplus',
    );

    try {
        await browser.getNewsfeelPageFor('https://www.google.com');
    }
    catch (e) {
        expect(e.message)
            .toEqual('Browser not launched. Run `browser.launch` first.');
        expect(e)
            .toBeInstanceOf(browserErrors.BrowserNotLaunchedError);
    }

    try {
        await browser.getAdblockPlusSettingsPage();
    }
    catch (e) {
        expect(e.message)
            .toEqual('Browser not launched. Run `browser.launch` first.');
        expect(e)
            .toBeInstanceOf(browserErrors.BrowserNotLaunchedError);
    }
});

test('CISAFE-Test browser launches correctly', async () => {
    const browser = new nfBrowser.NewsFeelBrowser(
        '/some/path/to/chrome/profile',
        '/some/path/to/adblockplus',
    );
    
    try {
        await browser.launch(true, false, false);
        expect(browser.chromium)
            .isNotNull;
        expect(browser.chromium.isConnected())
            .toBeTrue;
    } finally {
        await browser.close();
    }
});

test('CISAFE-Test browser closes correctly', async () => {
    const browser = new nfBrowser.NewsFeelBrowser(
        '/some/path/to/chrome/profile',
        '/some/path/to/adblockplus',
    );

    await browser.launch(true, false, false);
    expect(browser.chromium)
        .isNotNull;
    expect(browser.chromium.isConnected())
        .toBeTrue;

    await browser.close();
    expect(browser.chromium).isNull;
});

test('CISAFE-Test page is loaded correctly', async () => {
    const browser = new nfBrowser.NewsFeelBrowser(
        '/some/path/to/chrome/profile',
        '/some/path/to/adblockplus',
    );
    const htmlPath = path.join(
        path.resolve('./tests'), 'data/htmls/index.html',
    );
    const url = `file://${htmlPath}`;
    
    await browser.launch(true, false, false);
    try {
        const page = await browser.getNewsfeelPageFor(url);

        expect(page).toBeInstanceOf(nfPage.NewsFeelPage);
        expect(page.page.url()).toStrictEqual(url);
    } finally {
        await browser.close();
    }
});

test('CISAFE-Test error when AdbockPlus is not loaded', async () => {
    const browser = new nfBrowser.NewsFeelBrowser(
        '/some/path/to/chrome/profile',
        '/some/path/to/adblockplus',
    );

    await browser.launch(true, false, false);

    try {
        await browser.getAdblockPlusSettingsPage();
    }
    catch(e) {
        expect(e)
            .toBeInstanceOf(browserErrors.AdblockPlusNotLoaded);
        expect(e.message)
            .toEqual('AdblockPlus was not loaded!');
    }
    finally {
        await browser.close();
    }
});

test('Test load with user profile', async () => {
    const browser = new nfBrowser.NewsFeelBrowser(
        './chrome_profile',
        '/some/path/to/adblockplus',
    );
    try {
        await browser.launch(true, false, true);
        expect(browser.chromium)
            .isNotNull;
        expect(browser.chromium.isConnected())
            .toBeTrue;
        expect(browser.chromium._process.spawnargs)
            .toContain('--user-data-dir=./chrome_profile');
    } finally {
        await browser.close();
    }
});

test('Test load with ABP', async () => {
    const browser = new nfBrowser.NewsFeelBrowser(
        './chrome_profile',
        './abp-3.12',
    );
    try {
        await browser.launch(false, true, false);
        expect(browser.chromium)
            .isNotNull;
        expect(browser.chromium.isConnected())
            .toBeTrue;
        expect(browser.chromium._process.spawnargs)
            .toContain('--disable-extensions-except=./abp-3.12');
        expect(browser.chromium._process.spawnargs)
            .toContain('--load-extension=./abp-3.12');
    } finally {
        await browser.close();
    }
})

test('Test load with UI', async () => {
    const browser = new nfBrowser.NewsFeelBrowser(
        './chrome_profile',
        './abp-3.12',
    );
    try {
        await browser.launch(false, false, false);
        expect(browser.chromium)
            .isNotNull;
        expect(browser.chromium.isConnected())
            .toBeTrue;
    } finally {
        await browser.close();
    }
})

test('Test getting ABP Settings page', async () => {
    const browser = new nfBrowser.NewsFeelBrowser(
        './chrome_profile',
        './abp-3.12',
    );
    try {
        await browser.launch(false, true, true);
        const abpPage = await browser.getAdblockPlusSettingsPage();
        expect(abpPage)
            .toBeInstanceOf(abpSettingPage.AdBlockPlusSettingsPage);
        expect(abpPage.page.url())
            .toEqual(expect.stringMatching(new RegExp(
                'chrome-extension://.*/desktop-options.html'
            )));
    } finally {
        await browser.close();
    }
}, 7000);
