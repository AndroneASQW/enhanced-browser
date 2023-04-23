/**
 * Collapse separators in a text.
 * 
 * For example, a text that looks like:
 * 
 * Lorem       ipsum
 *      dolor   sit 
 *    amet
 * 
 * Will be converted to:
 * 
 * Lorep ipsum dolor sit amet
 * 
 * @param {string} text - The test to cleanup.
 * @returns {string} The string with all separators collapsed.
 */

function collapseSeparators(text) {
    // First, collapse all separators to a single space.
    let result = text.replace(/\s\s+/g, ' ');

    // Remove all trailing separators and the ones at the start
    // of the string.
    result = result.trim();

    return result;
}

module.exports = {
    collapseSeparators
}