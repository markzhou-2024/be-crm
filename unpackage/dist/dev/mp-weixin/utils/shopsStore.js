"use strict";
const common_vendor = require("../common/vendor.js");
const KEY = "shops_mock";
function loadShops(fallback = []) {
  try {
    const val = common_vendor.index.getStorageSync(KEY);
    return Array.isArray(val) ? val : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveShops(list) {
  common_vendor.index.setStorageSync(KEY, list || []);
}
exports.loadShops = loadShops;
exports.saveShops = saveShops;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/shopsStore.js.map
