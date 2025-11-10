"use strict";
const common_vendor = require("../common/vendor.js");
const customersService = common_vendor.tr.importObject("curd-customers");
function handleResponse(res) {
  if (res && typeof res === "object" && "errCode" in res && res.errCode !== 0) {
    const err = new Error(res.errMsg || "请求失败");
    err.errCode = res.errCode;
    throw err;
  }
  if (res && res.data !== void 0) {
    return res.data;
  }
  return res;
}
async function fetchCustomers() {
  const res = await customersService.listCustomers();
  return handleResponse(res) || [];
}
async function createCustomer(payload) {
  const res = await customersService.createCustomer(payload);
  return handleResponse(res);
}
async function updateCustomer(payload) {
  const res = await customersService.updateCustomer(payload);
  return handleResponse(res);
}
async function deleteCustomer(id) {
  const res = await customersService.deleteCustomer(id);
  return handleResponse(res);
}
async function getCustomerById(id) {
  const res = await customersService.getCustomerById(id);
  return handleResponse(res);
}
exports.createCustomer = createCustomer;
exports.deleteCustomer = deleteCustomer;
exports.fetchCustomers = fetchCustomers;
exports.getCustomerById = getCustomerById;
exports.updateCustomer = updateCustomer;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/customers.js.map
