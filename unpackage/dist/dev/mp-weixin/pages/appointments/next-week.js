"use strict";
const common_vendor = require("../../common/vendor.js");
const api_analytics = require("../../api/analytics.js");
const _sfc_main = {
  data() {
    return {
      days: [],
      loading: true,
      refreshing: false
    };
  },
  async onShow() {
    await this.loadData();
  },
  methods: {
    async onRefresh() {
      if (this.refreshing)
        return;
      this.refreshing = true;
      await this.loadData();
      setTimeout(() => {
        this.refreshing = false;
      }, 200);
    },
    async loadData() {
      try {
        this.loading = true;
        const list = await api_analytics.fetchNextWeekBookings();
        this.days = list || [];
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.message) || "加载失败", icon: "none" });
      } finally {
        this.loading = false;
      }
    },
    formatDisplayDate(dateStr) {
      const date = new Date(dateStr.replace(/-/g, "/"));
      if (Number.isNaN(date.getTime()))
        return dateStr;
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const diff = Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1e3));
      const label = diff === 0 ? "今天" : diff === 1 ? "明天" : diff === 2 ? "后天" : "";
      const m = date.getMonth() + 1;
      const d = date.getDate();
      return label ? `${m}月${d}日 · ${label}` : `${m}月${d}日`;
    },
    openCustomer(item) {
      if (!(item == null ? void 0 : item.customer_id))
        return;
      common_vendor.index.navigateTo({ url: `/pages/my-customers/detail?id=${item.customer_id}` });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.loading
  }, $data.loading ? {} : !$data.days.length ? {} : {
    c: common_vendor.f($data.days, (day, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.formatDisplayDate(day.date)),
        b: day.items.length
      }, day.items.length ? {
        c: common_vendor.t(day.items.length)
      } : {}, {
        d: day.items.length
      }, day.items.length ? {
        e: common_vendor.f(day.items, (item, k1, i1) => {
          return {
            a: common_vendor.t(item.time),
            b: common_vendor.t(item.service_name || "未命名服务"),
            c: common_vendor.t(item.store_name || "未选择门店"),
            d: common_vendor.t(item.customer_name || ""),
            e: item.id,
            f: common_vendor.o(($event) => $options.openCustomer(item), item.id)
          };
        })
      } : {}, {
        f: day.date
      });
    })
  }, {
    b: !$data.days.length,
    d: $data.refreshing,
    e: common_vendor.o((...args) => $options.onRefresh && $options.onRefresh(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-d7a0ab1e"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/appointments/next-week.js.map
