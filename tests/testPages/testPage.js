const fs = require('fs');
const path = require('path');

const nfBrowser = require('../../src/browser/enhancedBrowser');
const pageErrors = require('../../src/errors/pageErrors');

async function executeTestInTryCatch(filePath, testCallback) {
    const browser = new nfBrowser.EnhancedBrowser(
        'path/to/chrome/profile',
        'path/to/abp/instance',
    );
    try {
        await browser.launch(true, false, false);
        const url = `file://${filePath}`;
        const page = await browser.getBrowserPageFor(url);
        await testCallback(page, browser);
    } finally {
        await browser.close()
    }
}

test('CISAFE-Test exposeFuncion', async () => {
    const filePath = path.resolve(
        './tests/data/htmls/index.html'
    );
    await executeTestInTryCatch(filePath, async (page) => {
        await page.exposeFunction('foo', () => 'foo');
        expect(page.page._pageBindings.has('foo'))
            .isTrue;
        await page.exposeFunction('foo', () => 'foo');
        expect(page.page._pageBindings.has('foo'))
            .isTrue;
    });
});

test('CISAFE-Test exposeFuncion - Throws error', async () => {
    const filePath = path.resolve(
        './tests/data/htmls/index.html'
    );
    try {
        await executeTestInTryCatch(filePath, async (page) => {
            await page.exposeFunction('foo', () => 'foo');
            expect(page.page._pageBindings.has('foo'))
                .isTrue;
            await page.exposeFunction('foo', () => 'foo', false);
        });
    }
    catch (e) {
        const url = `file://${filePath}`;
        expect(e)
            .toBeInstanceOf(pageErrors.FunctionAlreadyExposedError);
        expect(e.funcName).toStrictEqual('foo');
        expect(e.url).toStrictEqual(url);
        expect(e.message).toStrictEqual(
            `Error on page ${url} - Function already exported: "foo"`,
        )
    }
});

test('CISAFE-Test getHandler', async () => {
    const filePath = path.resolve(
        './tests/data/htmls/index.html'
    );
    await executeTestInTryCatch(filePath, async (page) => {
        const result = await page.getPuppeteerHandleSingle('body');
        expect(result.toString()).toMatch('JSHandle@node');
    });
});

test('CISAFE-Test getHandler - Throws error', async () => {
    const filePath = path.resolve(
        './tests/data/htmls/index.html'
    );
    try {
        await executeTestInTryCatch(filePath, async (page) => {
            await page.getPuppeteerHandleSingle(
                'body>a[class="Some-invalid-selector"]',
            );
        });
    }
    catch (e) {
        const url = `file://${filePath}`;
        const sel = 'body>a[class="Some-invalid-selector"]';
        expect(e)
            .toBeInstanceOf(pageErrors.NoElementFoundError);
        expect(e.url).toStrictEqual(url);
        expect(e.selector).toStrictEqual(sel);
        expect(e.message).toStrictEqual(
            `Error on page ${url} - No elements found for selector: ${sel}`,
        )
    }
});

test('CISAFE-Test text extraction - no ignore', async () => {
    const filePath = path.resolve(
        './tests/data/htmls/textExtraction/input.html'
    )
    await executeTestInTryCatch(filePath, async (page) => {
        const expectedOutput = fs.readFileSync(
            'tests/data/htmls/textExtraction/expectNoIgnore.txt',
            {encoding: 'utf8'}
        ).toString();
        const result = await page.extractText('body', null);

        expect(result).toStrictEqual(expectedOutput);
    });
});

test('CISAFE-Test text extration - with ignore', async () => {
    const filePath = path.resolve(
        './tests/data/htmls/textExtraction/input.html'
    )
    await executeTestInTryCatch(filePath, async (page) => {
        const expectedOutput = fs.readFileSync(
            'tests/data/htmls/textExtraction/expectWithIgnore.txt',
            {encoding: 'utf8'}
        ).toString();
        const result = await page.extractText(
            'body', 
            ['div[class=to-keep]>a[id=remove]', 'b[class=remove]'],
        );

        expect(result).toStrictEqual(expectedOutput);
    });
});

test('CISAFE-Test attribute extraction - single', async () => {
    const pagePath = path.resolve(
        './tests/data/htmls/attributesExtraction.html',
    );

    await executeTestInTryCatch(pagePath, async (page) => {
        const expectedOutput = 'attr1-value';
        const result = await page.extractAttributes(
            'body>div', ['attr-1'],
        );
        expect(result).toStrictEqual(expectedOutput);
    });
});

test('CISAFE-Test attribute extraction - multiple', async () => {
    const pagePath = path.resolve(
        './tests/data/htmls/attributesExtraction.html',
    );

    await executeTestInTryCatch(pagePath, async (page) => {
        const expectedOutput = ['attr1-value', 'attr2-value'];
        const result = await page.extractAttributes(
            'body>div', ['attr-1', 'attr-2'],
        );
        expect(result).toStrictEqual(expectedOutput);
    });
});

test('CISAFE-Test html extraction', async () => {
    const pagePath = path.resolve(
        './tests/data/htmls/htmlExtraction.html',
    );
    await executeTestInTryCatch(pagePath, async (page) => {
        const expectedOutput = (
            '<body><div>Testing<b><p></p></b></div><span></span></body>'
        );
        const result = await page.extractHTML('body');

        expect(result).toStrictEqual(expectedOutput);
    });
});

test('CISAFE-Test links extraction', async () => {
    const pagePath = path.resolve(
        './tests/data/htmls/linksExtraction.html',
    );
    await executeTestInTryCatch(pagePath, async (page) => {
        page.url = () => {return 'https://test.com'};
        const expectedOutput = [
            'link.net', 
            'more-testing.ro',
            `${page.origin()}/test`,
            `${page.url()}#test`,
        ];
        const result = await page.extractLinks('body>div');
        expect(result).toStrictEqual(expectedOutput);
    });
});

test('CISAFE-Test get multiple handlers', async () => {
    const pagePath = path.resolve(
        './tests/data/htmls/getMultipleHandlers.html',
    );
    await executeTestInTryCatch(pagePath, async (page) => {
        const expectedOuterHTML = [
            '<p> First line </p>',
            '<p> Second line </p>',
            '<p> Third line </p>',
        ];

        const result = await page.getPuppeteerHandlesAll('body>p');

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toStrictEqual(3);

        for (let [handler, expected] of 
            result.map((e, i) => [e, expectedOuterHTML[i]])) {
            const outerHTML = await handler.evaluate((el) => el.outerHTML);
            expect(outerHTML)
                .toStrictEqual(expected);
        }
    });
});

test('CISAFE-Test remove all iFrames', async () => {
    const pagePath = path.resolve(
        './tests/data/htmls/removeIFrames.html',
    );

    await executeTestInTryCatch(pagePath, async (page) => {
        await page.removeAllIFrames();
        const iframeHandlers = await page.page.$$('iframe');
        expect(iframeHandlers).toStrictEqual([]);
    });
});

test('CISAFE-Test page refresh', async () => {
    const pagePath = path.resolve(
        './tests/data/htmls/index.html'
    );
    await executeTestInTryCatch(pagePath, async (page) => {
        const pHandler = await page.getPuppeteerHandleSingle('body>p');
        await pHandler.evaluate((el) => el.parentNode.removeChild(el));

        let handlers = await page.getPuppeteerHandlesAll('body>p');
        expect(handlers).toStrictEqual([]);

        await page.refresh();

        handlers = await page.getPuppeteerHandlesAll('body>p');
        expect(handlers.length).toStrictEqual(1);
    });
});

test('CISAFE-Test extract text multiple', async () => {
    const pagePath = path.resolve(
        './tests/data/htmls/textExtraction/textExtractionMultiple.html'
    );

    await executeTestInTryCatch(pagePath, async (page) => {
        const expectedOutput = [
            'Test extract element 1',
            'Test extract element 2',
            'Test extract element 3',
        ].join('\n');

        const result = await page.extractTextMultiple(
            'body>div[class="to-extract"]',
            null,
            '\n',
        );

        expect(result).toStrictEqual(expectedOutput);
    });
});


test('CISAFE-Test extract text multiple - selector error', async () => {
    const pagePath = path.resolve('./tests/data/htmls/index.html');

    await executeTestInTryCatch(pagePath, async (page) => {
        try {
            await page.extractTextMultiple('body>div');
        } catch (e) {
            expect(e)
                .toBeInstanceOf(pageErrors.NoElementFoundError);
            expect(e.selector)
                .toStrictEqual('body>div');
        }
    });

})


test('CISAFE-Test url getter', async() => {
    const pagePath = path.resolve('./tests/data/htmls/index.html');

    await executeTestInTryCatch(pagePath, async (page) => {
        const result = page.url();
        const expected = `file://${pagePath}`;

        expect(result).toStrictEqual(expected);
    });
});


test('CISAFE - Test origin getter', async () => {
    const pagePath = path.resolve('./tests/data/htmls/index.html');

    await executeTestInTryCatch(pagePath, async (page) => {
        let result = page.origin();

        // For local paths, this will always be null
        expect(result).toBeNull;

        page.url = () => {return 'https://test.com/test/testing/more-testing'};
        expect(page.origin()).toStrictEqual('https://test.com')
    });
});


test('CISAFE - Test links extraction with ignore', async () => {
    const pagePath = path.resolve('./tests/data/htmls/linksExtraction.html');

    await executeTestInTryCatch(pagePath, async (page) => {
        const expectedOutput = ['more-testing.ro'];

        expect(await page.extractLinks('body>div', ['/test', '#test', 'link.net']))
            .toStrictEqual(expectedOutput);
    });
});


test('CISAFE - Test page closing', async () => {
    const pagePath = path.resolve('./tests/data/htmls/index.html');

    await executeTestInTryCatch(pagePath, async (page, browser) => {
        const initialPages = await browser.chromium.pages();
        await page.close();
        const pagesAfterClose = await browser.chromium.pages();

        expect(initialPages.length).toStrictEqual(pagesAfterClose.length + 1);
    });
});
