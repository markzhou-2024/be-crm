"use strict";
const common_vendor = require("../../common/vendor.js");
const api_customers = require("../../api/customers.js");
const utils_customersStore = require("../../utils/customersStore.js");
const utils_shopsStore = require("../../utils/shopsStore.js");
const _sfc_main = {
  data() {
    return {
      defaultAvatar: "https://cdn.uviewui.com/uview/album/1.jpg",
      keyword: "",
      activeTab: "all",
      tabs: [
        { label: "全部客户", value: "all" },
        { label: "VIP客户", value: "vip" },
        { label: "活跃客户", value: "active" }
      ],
      shops: [],
      shopFilters: [],
      activeShopId: "",
      list: [],
      filtered: [],
      visibleList: [],
      page: 1,
      pageSize: 10,
      hasMore: true,
      loading: false,
      refreshing: false
    };
  },
  onLoad(query) {
    this.activeShopId = query && query.store_id || "";
    this.initShops();
  },
  onShow() {
    this.initShops();
    this.initData();
  },
  methods: {
    initShops() {
      const shops = utils_shopsStore.loadShops([]);
      this.shops = shops;
      this.shopFilters = [
        { label: "全部门店", value: "" },
        ...shops.map((s) => ({ label: s.store_name || "未命名门店", value: s._id })),
        { label: "未分配", value: "_unassigned" }
      ];
    },
    async initData() {
      this.loading = true;
      try {
        const list = await api_customers.fetchCustomers();
        this.decorate(list);
        this.list = list;
        this.applyFilter(true);
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "加载失败", icon: "none" });
      } finally {
        this.loading = false;
      }
    },
    decorate(list) {
      (list || []).forEach((item) => {
        const days = Number(item.last_visit_days);
        if (isNaN(days)) {
          item.last_visit_label = "-";
        } else if (days === 0) {
          item.last_visit_label = "今天";
        } else if (days === 1) {
          item.last_visit_label = "昨天";
        } else if (days === 7) {
          item.last_visit_label = "1周前";
        } else {
          item.last_visit_label = `${days}天前`;
        }
      });
    },
    onRefresh() {
      this.refreshing = true;
      setTimeout(() => {
        this.initData();
        this.refreshing = false;
      }, 400);
    },
    switchTab(value) {
      this.activeTab = value;
      this.applyFilter(true);
    },
    switchShop(value) {
      this.activeShopId = value;
      this.applyFilter(true);
    },
    clearSearch() {
      this.keyword = "";
      this.applyFilter(true);
    },
    applyFilter(resetPage = false) {
      let list = this.list.slice();
      if (this.activeTab === "vip") {
        list = list.filter((item) => !!item.is_vip);
      } else if (this.activeTab === "active") {
        list = list.filter((item) => (item.last_visit_days || 0) <= 7);
      }
      const kw = (this.keyword || "").trim();
      if (kw) {
        list = list.filter((item) => {
          const name = item.name || "";
          const phone = item.phone || "";
          return name.indexOf(kw) >= 0 || phone.indexOf(kw) >= 0;
        });
      }
      list = utils_customersStore.filterByStoreId(list, this.activeShopId);
      this.filtered = list;
      if (resetPage) {
        this.page = 1;
        this.hasMore = true;
      }
      this.visibleList = list.slice(0, this.page * this.pageSize);
      if (this.visibleList.length >= list.length) {
        this.hasMore = false;
      }
    },
    loadMore() {
      if (!this.hasMore || this.loading)
        return;
      if (this.visibleList.length >= this.filtered.length)
        return;
      this.page += 1;
      this.visibleList = this.filtered.slice(0, this.page * this.pageSize);
      if (this.visibleList.length >= this.filtered.length) {
        this.hasMore = false;
      }
    },
    goCreate() {
      common_vendor.index.navigateTo({ url: "/pages/my-customers/create" });
    },
    openDetail(item) {
      common_vendor.index.navigateTo({ url: `/pages/my-customers/detail?id=${item._id}` });
    },
    onLongPress(item) {
      common_vendor.index.showActionSheet({
        itemList: ["删除客户"],
        success: () => {
          this.confirmDelete(item);
        }
      });
    },
    confirmDelete(item) {
      common_vendor.index.showModal({
        title: "删除确认",
        content: `确定删除「${item.name}」吗？`,
        confirmText: "删除",
        confirmColor: "#dd524d",
        success: (res) => {
          if (res.confirm) {
            this.deleteCustomer(item._id);
          }
        }
      });
    },
    async deleteCustomer(id) {
      try {
        await api_customers.deleteCustomer(id);
        this.list = this.list.filter((item) => item._id !== id);
        this.applyFilter(true);
        common_vendor.index.showToast({ title: "已删除", icon: "success" });
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "删除失败", icon: "none" });
      }
    },
    maskPhone(phone) {
      if (!phone)
        return "";
      return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
    },
    toAmount(n) {
      try {
        return Number(n || 0).toLocaleString("zh-CN");
      } catch (e) {
        return n;
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o(($event) => $options.applyFilter(true)),
    b: $data.keyword,
    c: common_vendor.o(($event) => $data.keyword = $event.detail.value),
    d: $data.keyword
  }, $data.keyword ? {
    e: common_vendor.o((...args) => $options.clearSearch && $options.clearSearch(...args))
  } : {}, {
    f: common_vendor.f($data.tabs, (t, k0, i0) => {
      return {
        a: common_vendor.t(t.label),
        b: t.value,
        c: $data.activeTab === t.value ? 1 : "",
        d: common_vendor.o(($event) => $options.switchTab(t.value), t.value)
      };
    }),
    g: common_vendor.f($data.shopFilters, (opt, k0, i0) => {
      return {
        a: common_vendor.t(opt.label),
        b: opt.value,
        c: $data.activeShopId === opt.value ? 1 : "",
        d: common_vendor.o(($event) => $options.switchShop(opt.value), opt.value)
      };
    }),
    h: common_vendor.f($data.visibleList, (c, k0, i0) => {
      return common_vendor.e({
        a: c.avatar || $data.defaultAvatar,
        b: common_vendor.t(c.name),
        c: c.is_vip
      }, c.is_vip ? {} : {}, {
        d: common_vendor.t($options.maskPhone(c.phone)),
        e: c.store_name
      }, c.store_name ? {
        f: common_vendor.t(c.store_name)
      } : {}, {
        g: common_vendor.t(c.last_visit_label || "-"),
        h: common_vendor.t($options.toAmount(c.total_spend)),
        i: common_vendor.o(($event) => $options.openDetail(c), c._id),
        j: common_vendor.o(($event) => $options.onLongPress(c), c._id),
        k: c._id
      });
    }),
    i: !$data.visibleList.length && !$data.loading && !$data.refreshing
  }, !$data.visibleList.length && !$data.loading && !$data.refreshing ? {} : {}, {
    j: $data.loading
  }, $data.loading ? {} : !$data.hasMore && $data.visibleList.length ? {} : {}, {
    k: !$data.hasMore && $data.visibleList.length,
    l: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    m: $data.refreshing,
    n: common_vendor.o((...args) => $options.onRefresh && $options.onRefresh(...args)),
    o: common_vendor.o((...args) => $options.goCreate && $options.goCreate(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-6c36fae8"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my-customers/index.js.map
