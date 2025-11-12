"use strict";
const common_vendor = require("../../common/vendor.js");
const api_analytics = require("../../api/analytics.js");
const api_shops = require("../../api/shops.js");
const _sfc_main = {
  data() {
    return {
      storeOptions: [{ label: "全部门店", value: "" }],
      storeIndex: 0,
      currentMonth: this.formatMonth(/* @__PURE__ */ new Date()),
      displayMonth: "",
      calendarDays: [],
      weekLabels: ["一", "二", "三", "四", "五", "六", "日"]
    };
  },
  async onShow() {
    await this.ensureStores();
    await this.loadCalendar();
  },
  methods: {
    formatMonth(date) {
      const d = new Date(date);
      const y = d.getFullYear();
      const m = `${d.getMonth() + 1}`.padStart(2, "0");
      return `${y}-${m}`;
    },
    async ensureStores() {
      if (this.storeOptions.length > 1)
        return;
      try {
        const list = await api_shops.fetchShops();
        const mapped = list.map((item) => ({ label: item.name, value: item._id || item.id }));
        this.storeOptions = [{ label: "全部门店", value: "" }, ...mapped];
      } catch (err) {
        common_vendor.index.__f__("log", "at pages/calendar/index.vue:71", "fetch shops failed", err);
      }
    },
    async loadCalendar() {
      var _a;
      try {
        const store = ((_a = this.storeOptions[this.storeIndex]) == null ? void 0 : _a.value) || "";
        const res = await api_analytics.fetchMonthCalendarSummary({ month: this.currentMonth, store_id: store || void 0 });
        const days = (res == null ? void 0 : res.days) || [];
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        this.displayMonth = (res == null ? void 0 : res.month) || this.currentMonth;
        const monthKey = this.displayMonth || this.currentMonth;
        const [targetYear, targetMonth] = monthKey.split("-").map((n) => Number(n));
        this.calendarDays = days.map((day) => {
          const dateObj = new Date(day.date.replace(/-/g, "/"));
          const inMonth = dateObj.getFullYear() === targetYear && dateObj.getMonth() + 1 === targetMonth;
          return {
            ...day,
            day: `${dateObj.getDate()}`,
            inMonth,
            isToday: dateObj.getTime() === today.getTime()
          };
        });
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.message) || "加载失败", icon: "none" });
      }
    },
    changeMonth(step) {
      const [year, month] = this.currentMonth.split("-").map((n) => Number(n));
      const next = new Date(year, month - 1 + step, 1);
      this.currentMonth = this.formatMonth(next);
      this.loadCalendar();
    },
    onStoreChange(e) {
      var _a;
      this.storeIndex = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
      this.loadCalendar();
    },
    openDayDetail(day) {
      common_vendor.index.showModal({
        title: day.date,
        content: `预约：${day.booking_count} 条
消耗：${day.consume_count} 次`
      });
    }
  },
  computed: {
    currentStoreLabel() {
      var _a;
      return ((_a = this.storeOptions[this.storeIndex]) == null ? void 0 : _a.label) || "全部门店";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($options.currentStoreLabel),
    b: $data.storeOptions,
    c: $data.storeIndex,
    d: common_vendor.o((...args) => $options.onStoreChange && $options.onStoreChange(...args)),
    e: common_vendor.o(($event) => $options.changeMonth(-1)),
    f: common_vendor.t($data.displayMonth),
    g: common_vendor.o(($event) => $options.changeMonth(1)),
    h: common_vendor.f($data.weekLabels, (day, k0, i0) => {
      return {
        a: common_vendor.t(day),
        b: day
      };
    }),
    i: common_vendor.f($data.calendarDays, (day, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(day.day),
        b: day.booking_count
      }, day.booking_count ? {
        c: common_vendor.t(day.booking_count)
      } : {}, {
        d: day.consume_count
      }, day.consume_count ? {
        e: common_vendor.t(day.consume_count)
      } : {}, {
        f: day.date,
        g: !day.inMonth ? 1 : "",
        h: day.isToday ? 1 : "",
        i: common_vendor.o(($event) => $options.openDayDetail(day), day.date)
      });
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-3ceb4997"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/calendar/index.js.map
