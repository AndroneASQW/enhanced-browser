const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

const enhancedBrowser = require('./src/browser/enhancedBrowser');
const launching = require('./src/utils/launching');
const nfErrors = require('./src/errors/nfError');
const browserErrors = require('./src/errors/browserErrors');
const pageErrors = require('./src/errors/pageErrors');

// The class definition is temporary and should be removed 
// once we find a way to go around `puppeteer-extra` failing
// when this is not included.
class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
      super(opts)
    }
}


module.exports = {
  EnhancedBrowser: enhancedBrowser.EnhancedBrowser,
  launchHeadfulBrowserDefault: launching.launchHeadfulBrowserWithDefaults,
  errors: {nfErrors, browserErrors, pageErrors},
};
