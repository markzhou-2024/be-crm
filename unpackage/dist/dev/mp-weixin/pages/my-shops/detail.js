"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      id: "",
      shop: {
        store_name: "",
        store_address: "",
        cover_image: "",
        month_revenue: 0,
        customer_count: 0,
        phone: "",
        business_hours: "10:00 - 22:00",
        status: "active"
      }
    };
  },
  created() {
    this.service = common_vendor.tr.importObject("curd-shops");
  },
  onLoad(query) {
    this.id = query && query.id || "";
    common_vendor.index.setNavigationBarTitle({ title: "门店详情" });
    if (!this.id) {
      common_vendor.index.showToast({ title: "缺少门店ID", icon: "none" });
      return;
    }
    this.fetchShop();
  },
  onShow() {
    if (this.id) {
      this.fetchShop();
    }
  },
  methods: {
    async fetchShop() {
      try {
        const data = await this.service.getShopById(this.id);
        if (data) {
          this.shop = data;
          if (data.store_name) {
            common_vendor.index.setNavigationBarTitle({ title: data.store_name });
          }
        } else {
          common_vendor.index.showToast({ title: "未找到门店信息", icon: "none" });
        }
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "加载失败", icon: "none" });
      }
    },
    addCustomer() {
      common_vendor.index.showToast({ title: "添加客户（待接后端）", icon: "none" });
    },
    openCalendar() {
      common_vendor.index.showToast({ title: "预约日历（待接后端）", icon: "none" });
    },
    goEdit() {
      common_vendor.index.navigateTo({ url: `/pages/my-shops/edit?id=${this.id}` });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.goEdit && $options.goEdit(...args)),
    b: $data.shop.cover_image,
    c: common_vendor.t($data.shop.store_name),
    d: common_vendor.t($data.shop.phone || "—"),
    e: common_vendor.t($data.shop.store_address),
    f: common_vendor.t($data.shop.business_hours || "10:00 - 22:00"),
    g: common_vendor.t($data.shop.customer_count),
    h: common_vendor.o((...args) => $options.addCustomer && $options.addCustomer(...args)),
    i: common_vendor.o((...args) => $options.openCalendar && $options.openCalendar(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-533450a3"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my-shops/detail.js.map
