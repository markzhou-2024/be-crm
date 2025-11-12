"use strict";
const common_vendor = require("../common/vendor.js");
const bookingService = common_vendor.tr.importObject("curd-booking", { customUI: true });
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
      const err = new Error(res.message || res.msg || "请求失败");
      err.code = res.code;
      throw err;
    }
  }
  if (res && res.data !== void 0) {
    return res.data;
  }
  return res;
}
function toArray(res) {
  var _a;
  if (Array.isArray(res))
    return res;
  if (Array.isArray(res == null ? void 0 : res.data))
    return res.data;
  if (Array.isArray(res == null ? void 0 : res.list))
    return res.list;
  if (Array.isArray((_a = res == null ? void 0 : res.result) == null ? void 0 : _a.data))
    return res.result.data;
  return [];
}
async function createBooking(payload) {
  const res = await bookingService.add(payload);
  return unwrap(res);
}
async function listBookingsByCustomer(params = {}) {
  const res = await bookingService.listByCustomer(params);
  return toArray(unwrap(res));
}
async function updateBookingStatus({ booking_id, status }) {
  const res = await bookingService.updateStatus({ booking_id, status });
  return unwrap(res);
}
async function listTodayBookings(filters = {}) {
  if (typeof bookingService.listToday !== "function") {
    return [];
  }
  const res = await bookingService.listToday(filters);
  return toArray(unwrap(res));
}
exports.createBooking = createBooking;
exports.listBookingsByCustomer = listBookingsByCustomer;
exports.listTodayBookings = listTodayBookings;
exports.updateBookingStatus = updateBookingStatus;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/bookings.js.map
