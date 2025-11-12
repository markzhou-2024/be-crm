"use strict";
const common_vendor = require("../common/vendor.js");
const analyticsService = common_vendor.tr.importObject("analytics", { customUI: true });
function unwrap(res) {
  if (!res)
    return res;
  if (typeof res === "object") {
    if (res.errCode !== void 0 && res.errCode !== 0) {
      const err = new Error(res.errMsg || "请求失败");
      err.errCode = res.errCode;
      throw err;
    }
    if (res.code !== void 0 && res.code !== 0) {
      const err = new Error(res.message || "请求失败");
      err.code = res.code;
      throw err;
    }
    if (res.data !== void 0)
      return res.data;
  }
  return res;
}
async function fetchNextWeekBookings(params = {}) {
  const res = await analyticsService.next7DaysBookings(params);
  return unwrap(res) || [];
}
async function fetchMonthCalendarSummary(params = {}) {
  const res = await analyticsService.monthCalendarSummary(params);
  return unwrap(res);
}
async function fetchStoreMonthlyKPI(params = {}) {
  const res = await analyticsService.storeMonthlyKPI(params);
  return unwrap(res) || { arrive_customer_distinct: 0, service_count: 0, consume_amount: 0 };
}
async function fetchCustomerStoreVisitCount(params = {}) {
  const res = await analyticsService.customerStoreVisitCount(params);
  return unwrap(res) || { visit_count: 0 };
}
exports.fetchCustomerStoreVisitCount = fetchCustomerStoreVisitCount;
exports.fetchMonthCalendarSummary = fetchMonthCalendarSummary;
exports.fetchNextWeekBookings = fetchNextWeekBookings;
exports.fetchStoreMonthlyKPI = fetchStoreMonthlyKPI;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/analytics.js.map
