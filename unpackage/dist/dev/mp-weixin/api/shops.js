"use strict";
const common_vendor = require("../common/vendor.js");
const shopsService = common_vendor.tr.importObject("curd-shops");
function normalizeResponse(res) {
  if (res && typeof res === "object" && "errCode" in res && res.errCode !== 0) {
    const err = new Error(res.errMsg || "请求失败");
    err.errCode = res.errCode;
    throw err;
  }
  if (Array.isArray(res))
    return res;
  if (res && Array.isArray(res.data))
    return res.data;
  return [];
}
async function fetchShops() {
  const res = await shopsService.listMyShops();
  return normalizeResponse(res);
}
async function fetchShopHistory(limit = 50) {
  const res = await shopsService.listHistoryShops({ limit });
  return normalizeResponse(res);
}
exports.fetchShopHistory = fetchShopHistory;
exports.fetchShops = fetchShops;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/shops.js.map
