
class BrowserError extends Error {
    constructor(message) {
        super(message);
    }
}

class BrowserNotLaunchedError extends BrowserError {
    constructor() {
        super('Browser not launched. Run `browser.launch` first.');
    }
}

class AdblockPlusNotLoaded extends BrowserError {
    constructor() {
        super('AdblockPlus was not loaded!')
    }
}

module.exports = {
    BrowserError, 
    BrowserNotLaunchedError, 
    AdblockPlusNotLoaded,
};
