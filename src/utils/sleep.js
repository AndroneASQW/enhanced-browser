
/**
 *  Sleep for a number of miliseconds
 *  
 * @param {int} ms - The number of miliseconds we want to sleep for.
 */
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

module.exports = {sleep};
