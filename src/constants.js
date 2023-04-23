const DEFAULT_FILTER_LISTS = [
  {
    name: 'Easylist',
    selector: 'li[aria-label="EasyList"]',
    url: 'https://easylist-downloads.adblockplus.org/easylist.txt',
  },
  {
    name: 'RoList',
    selector: 'li[aria-label="ROList+EasyList"]',
    url: 'https://easylist-downloads.adblockplus.org/rolist+easylist.txt',
  },
  {
    name: 'ABP-anti-CV',
    selector: 'li[aria-label="ABP filters"]',
    url: 'https://easylist-downloads.adblockplus.org/abp-filters-anti-cv.txt',
  }, 
];

module.exports = {DEFAULT_FILTER_LISTS};
