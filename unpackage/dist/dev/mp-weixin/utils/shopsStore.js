"use strict";const n=require("../common/vendor.js"),r="shops_mock";function s(o=[]){try{const e=n.index.getStorageSync(r);return Array.isArray(e)?e:o}catch{return o}}function t(o){n.index.setStorageSync(r,o||[])}exports.loadShops=s;exports.saveShops=t;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/shopsStore.js.map
