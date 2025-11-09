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
        phone: "021-6288-8888",
        business_hours: "10:00 - 22:00"
      },
      // 本地 Mock（字段与列表页一致）
      mockAll: [
        {
          _id: "1",
          store_name: "静安旗舰店",
          store_address: "上海市静安区南京西路1234号",
          cover_image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=800",
          month_revenue: 128500,
          customer_count: 328,
          phone: "021-6288-8888",
          business_hours: "10:00 - 22:00"
        },
        {
          _id: "2",
          store_name: "浦东新乐店",
          store_address: "上海市浦东新区陆家嘴世纪大道88号",
          cover_image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800",
          month_revenue: 98200,
          customer_count: 256,
          phone: "021-6666-8888",
          business_hours: "10:00 - 22:00"
        },
        {
          _id: "3",
          store_name: "徐汇体验店",
          store_address: "上海市徐汇区淮海中路66号",
          cover_image: "https://images.unsplash.com/photo-1542372147193-a7aca54189cd?q=80&w=800",
          month_revenue: 85600,
          customer_count: 198,
          phone: "021-6666-9999",
          business_hours: "10:00 - 22:00"
        }
      ]
    };
  },
  onLoad(query) {
    this.id = query && query.id || "";
    const hit = this.mockAll.find((s) => s._id === this.id);
    if (hit) {
      this.shop = hit;
      common_vendor.index.setNavigationBarTitle({ title: "门店详情" });
    } else {
      common_vendor.index.showToast({ title: "未找到门店信息", icon: "none" });
    }
  },
  methods: {
    addCustomer() {
      common_vendor.index.showToast({ title: "添加客户（待接后端）", icon: "none" });
    },
    openCalendar() {
      common_vendor.index.showToast({ title: "预约日历（待接后端）", icon: "none" });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: $data.shop.cover_image,
    b: common_vendor.t($data.shop.store_name),
    c: common_vendor.t($data.shop.phone || "—"),
    d: common_vendor.t($data.shop.store_address),
    e: common_vendor.t($data.shop.business_hours || "10:00 - 22:00"),
    f: common_vendor.t($data.shop.customer_count),
    g: common_vendor.o((...args) => $options.addCustomer && $options.addCustomer(...args)),
    h: common_vendor.o((...args) => $options.openCalendar && $options.openCalendar(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-533450a3"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my-shops/detail.js.map
