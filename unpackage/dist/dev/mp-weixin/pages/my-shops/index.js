"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      tabs: [
        { label: "全部门店", value: "all" },
        { label: "营业中", value: "active" },
        { label: "高营收", value: "high" }
      ],
      keyword: "",
      activeTab: "all",
      page: 1,
      pageSize: 10,
      // 本地 Mock 数据
      mockAll: [
        {
          _id: "1",
          store_name: "静安旗舰店",
          store_address: "上海市静安区南京西路1234号",
          cover_image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=800",
          month_revenue: 128500,
          customer_count: 328,
          status: "active"
        },
        {
          _id: "2",
          store_name: "浦东新乐店",
          store_address: "上海市浦东新区陆家嘴世纪大道88号",
          cover_image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800",
          month_revenue: 98200,
          customer_count: 256,
          status: "active"
        },
        {
          _id: "3",
          store_name: "徐汇体验店",
          store_address: "上海市徐汇区淮海中路66号",
          cover_image: "https://images.unsplash.com/photo-1542372147193-a7aca54189cd?q=80&w=800",
          month_revenue: 85600,
          customer_count: 198,
          status: "active"
        },
        {
          _id: "4",
          store_name: "闵行社区店",
          store_address: "上海市闵行区漕宝路88号",
          cover_image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800",
          month_revenue: 152300,
          customer_count: 410,
          status: "active"
        }
      ]
    };
  },
  computed: {
    filtered() {
      const kw = (this.keyword || "").trim().toLowerCase();
      let arr = this.mockAll.slice();
      if (this.activeTab === "active") {
        arr = arr.filter(function(s) {
          return s.status === "active";
        });
      } else if (this.activeTab === "high") {
        arr = arr.filter(function(s) {
          return s.month_revenue >= 1e5;
        });
      }
      if (kw) {
        arr = arr.filter(function(s) {
          var name = (s.store_name || "").toLowerCase();
          var addr = (s.store_address || "").toLowerCase();
          return name.indexOf(kw) > -1 || addr.indexOf(kw) > -1;
        });
      }
      return arr;
    },
    visibleList() {
      return this.filtered.slice(0, this.page * this.pageSize);
    }
  },
  methods: {
    switchTab(v) {
      this.activeTab = v;
      this.page = 1;
    },
    applyFilter() {
      this.page = 1;
    },
    loadMore() {
      if (this.visibleList.length < this.filtered.length) {
        this.page += 1;
      }
    },
    openDetail(item) {
      common_vendor.index.navigateTo({ url: `/pages/my-shops/detail?id=${item._id}` });
    },
    formatMoney(n) {
      if (typeof n !== "number")
        return n;
      return n.toLocaleString("zh-CN");
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o([($event) => $data.keyword = $event.detail.value, (...args) => $options.applyFilter && $options.applyFilter(...args)]),
    b: $data.keyword,
    c: common_vendor.f($data.tabs, (t, k0, i0) => {
      return {
        a: common_vendor.t(t.label),
        b: t.value,
        c: $data.activeTab === t.value ? 1 : "",
        d: common_vendor.o(($event) => $options.switchTab(t.value), t.value)
      };
    }),
    d: common_vendor.f($options.visibleList, (item, k0, i0) => {
      return {
        a: item.cover_image,
        b: common_vendor.t(item.store_name),
        c: common_vendor.t(item.store_address),
        d: common_vendor.t($options.formatMoney(item.month_revenue)),
        e: common_vendor.t(item.customer_count),
        f: item._id,
        g: common_vendor.o(($event) => $options.openDetail(item), item._id)
      };
    }),
    e: $options.visibleList.length === 0
  }, $options.visibleList.length === 0 ? {} : {}, {
    f: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-d02c2fea"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my-shops/index.js.map
