class BrowserError extends Error {
    constructor (message) {
        super(message);
    }
}

class BrowserDirectoryNotFoundError extends BrowserError {
    constructor (path) {
        super(`Could not find directory: "${path}"!`);
        this.path = path;
    }
}

module.exports = {
    BrowserDirectoryNotFoundError, 
    BrowserError,
};
