class NewsFeelError extends Error {
    constructor (message) {
        super(message);
    }
}

class NewsFeelDirectoryNotFoundError extends NewsFeelError {
    constructor (path) {
        super(`Could not find directory: "${path}"!`);
        this.path = path;
    }
}

module.exports = {
    NewsFeelDirectoryNotFoundError, 
    NewsFeelError,
};
