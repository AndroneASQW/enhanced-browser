const textManipulation = require('../utils/textManipulation');
const pageErrors = require('../errors/pageErrors');

class NewsFeelPage {
    /** 
     * Create a new instance of `NewsFeelPage`.
     * 
     * @param {puppeteerPage.Page} puppeteerPage - Puppeteer object representing
     *  the loaded page.
     */
    constructor(puppeteerPage) {
        this.page = puppeteerPage;
    }

    /**
     *  Extract attributes from an HTML element in the page.
     * 
     * @param {string} selector - Selector for the element whose attributes 
     *  need to be extracted.
     * @param {Array<string>} attributes - List of attributes that need to 
     *  be extracted.
     * 
     * @returns {Promise<Array<string>>} Array with all the attributes values, 
     *  if we idenfified more than 1 valid attribute to extract.   
     * @returns {Promise<string>} The attribute value, if we could only 
     *   extract one attribute.
     * 
     * @throws {pageErrors.NoElementFoundError} If puppeteer could not
     *  find an element with that selector.
     */
    async extractAttributes(selector, attributes) {
        let handle = await this.getPuppeteerHandleSingle(selector);

        return await handle.evaluate(
            /* istanbul ignore next */
            async (element, attributes) => {
                if (attributes === null || attributes === undefined)
                    return null;
                let attributesRaw = element.attributes;
                let attrValues = [];
                for (let attr of attributes) {
                    let attribute = attributesRaw[attr];
                    if (attribute == null)
                        // Simply ignore this value.
                        continue;
                    attrValues.push(attribute.value);
                }
    
                if (attrValues.length == 1)
                    return attrValues[0];
    
                return attrValues;
            },
            attributes,
        );
    }

    async _extractTextFromHandle(handle, ignore) {
        let result = await handle.evaluate(
            /* istanbul ignore next */
            async (el, ignore) => {  
                function cleanupDOM(element, ignore) {
                    const children = element.children;
                    if (children.length == 0)
                      // Reached a leaf node.
                      return;
                    
                    for (let child of children) {
                        if (ignore.some((sel) => child.matches(sel))) {
                          // Should be removed
                          element.removeChild(child);
                          continue
                        }
                        cleanupDOM(child, ignore);
                    }
                }
                if (ignore !== null)
                    cleanupDOM(el, ignore);
                return el.innerText;
            },
            ignore,
        );

        return textManipulation.collapseSeparators(result);
    }


    /**
     * Extract and concatenate text from all elements matching `seclector`.
     * 
     * @param {string} selector Selector used to extract the text.
     * @param {Array<string>} ignore List of selectors from elements to 
     *   ignore when extracting the text. If `null`, no elements will be 
     *   igonred.
     * @param {string} separator Separator that should be used to concatenate
     *   the text elements by.
     * 
     * @returns {Promise<string>} The resulting concatenated text.
     * @throws {pageErrors.NoElementFoundError} If puppeteer could not
     *   find an element with that selector.
     */
    async extractTextMultiple(selector, ignore, separator) {
        const handles = await this.getPuppeteerHandlesAll(selector);

        if (handles.length == 0) 
            throw new pageErrors.NoElementFoundError(
                this.page.url(),
                selector,
            );
        
        const textSections = [];

        for (let handle of handles)
            textSections.push(await this._extractTextFromHandle(handle, ignore));

        return textSections.join(separator);
    }

    /** 
     *  Extract text from the page, recursively
     *  
     * @param {string} selector - Selector for the region we want to extract 
     *  the text from. 
     * @param {Array<string>} ignore - List of selectors from elements to 
     *   ignore when extracting the text. If `null`, no elements will be 
     *   igonred.
     * 
     * @returns {Promise<string>} All text as a string.
     * @throws {pageErrors.NoElementFoundError} If puppeteer could not
     *  find an element with that selector.
     */
    async extractText(selector, ignore) {
        let handle = await this.getPuppeteerHandleSingle(selector);

        return await this._extractTextFromHandle(handle, ignore);
    }

    /**
     * Extract the links from a DOM subtree.
     * 
     * @param {string} selector - The selector of the element representing 
     *  the root of the tree.
     * @param {Array<string>} ignore - List of urls that should be ignored when extracting.
     *  
     * @returns {Promise<Array<string>>} With all the extracted links.
     * @throws {pageErrors.NoElementFoundError} If puppeteer could not
     *  find an element with that selector.
     */
    async extractLinks(selector, ignore=null) {
        const handler = await this.getPuppeteerHandleSingle(selector);

        const links =  await handler.evaluate(
            /* istanbul ignore next */
            async (element, ignore) => {
                const allLinkElements = element.querySelectorAll('a');
                let extractedLinks = [];
    
                for (let linkElement of allLinkElements) {
                    const linkAttribute = linkElement.attributes['href'];
                    if (linkAttribute == null)
                        continue;
    
                    const link = linkAttribute.value;
    
                    extractedLinks.push(link);
                }

                if (ignore == null) 
                    ignore = [];
    
                return extractedLinks.filter(
                    (link) => {return !ignore.includes(link)}
                );
            }, ignore
        );
        
        for (let idx in links) {
            if (links[idx].startsWith('/') && this.origin())
                links[idx] = new URL(links[idx], this.origin()).href;

            if (links[idx].startsWith('#'))
                links[idx] = `${this.url()}${links[idx]}`;
        }

        return links;
    }

    /**
     * Extract the HTML of a DOM subtree.
     * 
     * @param {string} selector - The selector of the element we want to 
     *  extract the HTML of.
     * 
     * @returns {Promise<string>} The inner HTML of the element that 
     *  matches the given selector.
     * @throws {pageErrors.NoElementFoundError} If puppeteer could not
     *  find an element with that selector.
     */
    async extractHTML(selector) {
        const handler = await this.getPuppeteerHandleSingle(selector);
        return await handler.evaluate(
            /* istanbul ignore next */
            (element) => {
                return element.outerHTML;
            }
        );
    }

    /**
     * Get a handle referencing an element identified by a selector
     * in this page.
     * 
     * @param {str} selector - The selector used to identify the element.
     * 
     * @returns {puppteer.ElementHandler} The resulting puppteer handle.
     * @throws {pageErrors.NoElementFoundError} If puppeteer could not
     *  find an element with that selector.
     */
    async getPuppeteerHandleSingle(selector) {
        const handler = await this.page.$(selector);

        if (handler == null)
            throw new pageErrors.NoElementFoundError(
                this.page.url(),
                selector,
            );
        
        return handler;
    }

    /**
     * Get all handlers that match a given selector.
     * 
     * @param {string} selector - The selector that should be used to generate
     * the handlers.
     * 
     * @returns {Array<puppeteer.ElementHandler>} - The generated handlers. If
     * no element matches the selector, an empty list will be returned.
     */
    async getPuppeteerHandlesAll(selector) {
        const handlers = await this.page.$$(selector);

        return handlers;
    }

    /**
     * Expose a function to the page context.
     * 
     * This only happens if there is no function with the same name
     * that has already been exported.
     * 
     * @param {string} funcName - Name the function will have in the page
     *  context.
     * @param {fuction} func - The function that should be exported.
     * @param {boolean} existsOk - Whether we should ignore if a function 
     *  with the same name already exists or to throw an error, respectively.
     *  Default `true`.
     * 
     * @throws {pageErrors.FunctionAlreadyExposedError} - If there already
     *  is a function with the same name in the page context and if `existsOK`
     *  is set to `false`.
     */
    async exposeFunction(funcName, func, existsOk=true) {
        if (this.page._pageBindings.has(funcName)) {
            if (existsOk)
                // We don't care, just return.
                return
            // Otherwise, we throw an exception
            throw new pageErrors.FunctionAlreadyExposedError(
                this.page.url(),
                funcName
            );
        }
        await this.page.exposeFunction(funcName, func);
    }

    /**
     * Close the page.
     * 
     * For memory reasons, we're going to `about:blank` first and then close
     * the page.
     */
    async close() {
        await this.page.goto('about:blank');
        await this.page.close();
    }

    /**
     * Remove all iframes from the page.
     */
    async removeAllIFrames() {
        const handlers = await this.getPuppeteerHandlesAll('body');

        for (let handle of handlers) {
            await handle.evaluate(
                /* istanbul ignore next */
                (el) => {
                    el.parentNode.removeChild(el)
                }
            );
        }
    }

    /**
     * Refresh the page.
     * 
     * This might be a good idea to do after any operation that 
     * manipulates the DOM, so you're sure you're getting a clean
     * working copy every time.
     */
    async refresh() {
        await this.page.reload({waitUntil: 'networkidle2'});
    }

    /**
     * Get the url of this page.
     * 
     * @returns {string} The url of the page.
     */
    url() {
        return this.page.url();
    }

    /**
     * Get the origin for this page (protocol + domain).
     * 
     * @returns {string} The resulting origin for this page.
     */
    origin() {
        return new URL(this.url()).origin;
    }
}

module.exports = {NewsFeelPage};
