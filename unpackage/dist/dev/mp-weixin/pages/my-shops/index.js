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
      list: [],
      loading: false,
      error: ""
    };
  },
  created() {
    this.service = common_vendor.tr.importObject("curd-shops");
  },
  onShow() {
    this.fetchShops();
  },
  computed: {
    filtered() {
      const kw = (this.keyword || "").trim().toLowerCase();
      let arr = this.list.slice();
      if (this.activeTab === "active") {
        arr = arr.filter(function(s) {
          return s.status === "active";
        });
      } else if (this.activeTab === "high") {
        arr = arr.filter(function(s) {
          return (s.month_revenue || 0) >= 1e5;
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
    async fetchShops() {
      this.loading = true;
      this.error = "";
      try {
        const data = await this.service.listMyShops();
        const list = Array.isArray(data) ? data : data && data.data || [];
        this.list = list;
        this.page = 1;
      } catch (err) {
        this.list = [];
        this.error = (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "加载失败";
        common_vendor.index.showToast({ title: this.error, icon: "none" });
      } finally {
        this.loading = false;
      }
    },
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
    goCreate() {
      common_vendor.index.navigateTo({ url: "/pages/my-shops/create" });
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
    e: $data.loading
  }, $data.loading ? {} : $data.error ? {
    g: common_vendor.t($data.error)
  } : $options.visibleList.length === 0 ? {} : {}, {
    f: $data.error,
    h: $options.visibleList.length === 0,
    i: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    j: common_vendor.o((...args) => $options.goCreate && $options.goCreate(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-d02c2fea"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my-shops/index.js.map
