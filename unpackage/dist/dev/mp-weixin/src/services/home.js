"use strict";
async function getHomeStats() {
  return {
    store_count: 12,
    customer_count: 1248,
    month_sales: 328e3,
    month_consume_count: 856
  };
}
async function getTodayAppointments() {
  return [
    { id: "1", time: "10:00", name: "张小姐", service: "面部护理", store: "静安店" },
    { id: "2", time: "14:30", name: "李女士", service: "SPA套餐", store: "浦东店" },
    { id: "3", time: "16:00", name: "王小姐", service: "美容护理", store: "静安店" }
  ];
}
exports.getHomeStats = getHomeStats;
exports.getTodayAppointments = getTodayAppointments;
//# sourceMappingURL=../../../.sourcemap/mp-weixin/src/services/home.js.map
