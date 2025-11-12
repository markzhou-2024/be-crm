"use strict";
const common_vendor = require("../../common/vendor.js");
const api_shops = require("../../api/shops.js");
const api_analytics = require("../../api/analytics.js");
const _sfc_main = {
  data() {
    return {
      storeOptions: [],
      storeIndex: 0,
      currentMonth: this.formatMonth(/* @__PURE__ */ new Date()),
      kpi: {
        arrive_customer_distinct: 0,
        service_count: 0,
        consume_amount: 0
      }
    };
  },
  computed: {
    currentStoreLabel() {
      const option = this.storeOptions[this.storeIndex];
      return option ? option.label : "选择门店";
    },
    cards() {
      return [
        { key: "arrive", label: "到客数量", value: this.kpi.arrive_customer_distinct },
        { key: "service", label: "服务次数", value: this.kpi.service_count },
        { key: "amount", label: "总消耗金额(元)", value: this.kpi.consume_amount, format: "amount" }
      ];
    }
  },
  async onShow() {
    await this.ensureStores();
    await this.loadKPI();
  },
  methods: {
    formatMonth(date) {
      const d = new Date(date);
      const y = d.getFullYear();
      const m = `${d.getMonth() + 1}`.padStart(2, "0");
      return `${y}-${m}`;
    },
    async ensureStores() {
      if (this.storeOptions.length)
        return;
      try {
        const list = await api_shops.fetchShops();
        this.storeOptions = list.map((item) => ({ label: item.name, value: item._id || item.id }));
      } catch (err) {
        common_vendor.index.showToast({ title: "门店加载失败", icon: "none" });
      }
    },
    async loadKPI() {
      var _a;
      if (!this.storeOptions.length)
        return;
      const storeId = (_a = this.storeOptions[this.storeIndex]) == null ? void 0 : _a.value;
      if (!storeId) {
        common_vendor.index.showToast({ title: "请选择门店", icon: "none" });
        return;
      }
      try {
        const data = await api_analytics.fetchStoreMonthlyKPI({ store_id: storeId, month: this.currentMonth });
        this.kpi = data || this.kpi;
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.message) || "加载失败", icon: "none" });
      }
    },
    onStoreChange(e) {
      var _a;
      this.storeIndex = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
      this.loadKPI();
    },
    changeMonth(step) {
      const [year, month] = this.currentMonth.split("-").map((num) => Number(num));
      const next = new Date(year, month - 1 + step, 1);
      this.currentMonth = this.formatMonth(next);
      this.loadKPI();
    },
    formatValue(value, format) {
      if (format === "amount") {
        return Number(value || 0).toFixed(2);
      }
      return Number(value || 0).toLocaleString("zh-CN");
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
    f: common_vendor.t($data.currentMonth),
    g: common_vendor.o(($event) => $options.changeMonth(1)),
    h: common_vendor.f($options.cards, (card, k0, i0) => {
      return {
        a: common_vendor.t(card.label),
        b: common_vendor.t($options.formatValue(card.value, card.format)),
        c: card.key
      };
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-4cb6ff59"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/analytics/store.js.map
