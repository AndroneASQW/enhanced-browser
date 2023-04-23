class PageError extends Error {
    constructor(url, message) {
        super(`Error on page ${url} - ${message}`);
        this.url = url;
    }
}

class NoElementFoundError extends PageError {
    constructor(url, selector) {
        super(
            url,
            `No elements found for selector: ${selector}`
        );
        this.selector = selector;
    }
}


class FunctionAlreadyExposedError extends PageError {
    constructor(url, funcName) {
        let message = `Function already exported: "${funcName}"`;
        super(url, message);
        this.funcName = funcName;
    }
}

module.exports = {
    PageError, 
    NoElementFoundError,
    FunctionAlreadyExposedError,
};
