"use strict";
const common_vendor = require("../../common/vendor.js");
const api_bookings = require("../../api/bookings.js");
const _sfc_main = {
  data() {
    return {
      loading: false,
      rawBookings: [],
      statusFilter: "all",
      statusOptions: [
        { label: "全部", value: "all" },
        { label: "待到店", value: "scheduled" },
        { label: "已完成", value: "completed" },
        { label: "已取消", value: "canceled" }
      ],
      isRefreshing: false
    };
  },
  onShow() {
    this.fetchBookings();
  },
  computed: {
    groupedBookings() {
      const list = this.filteredBookings();
      const map = {};
      list.forEach((item) => {
        const dateKey = this.formatDateKey(item.start_ts);
        map[dateKey] = map[dateKey] || [];
        map[dateKey].push(item);
      });
      return Object.keys(map).sort((a, b) => a > b ? -1 : 1).map((key) => ({
        date: key,
        items: map[key].sort((a, b) => Number(a.start_ts || 0) - Number(b.start_ts || 0))
      }));
    }
  },
  methods: {
    filteredBookings() {
      if (this.statusFilter === "all")
        return this.rawBookings;
      return this.rawBookings.filter((item) => item.status === this.statusFilter);
    },
    async fetchBookings(options = {}) {
      const showLoading = !this.rawBookings.length && !options.silent;
      if (showLoading) {
        this.loading = true;
      }
      try {
        const list = await api_bookings.listTodayBookings();
        this.rawBookings = (list || []).map((item) => ({
          ...item,
          start_ts: Number(item.start_ts || item.startTs || 0),
          end_ts: Number(item.end_ts || item.endTs || 0)
        }));
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "预约加载失败", icon: "none" });
      } finally {
        if (showLoading) {
          this.loading = false;
        }
      }
    },
    async handleRefresh() {
      if (this.isRefreshing)
        return;
      this.isRefreshing = true;
      await this.fetchBookings({ silent: true });
      setTimeout(() => {
        this.isRefreshing = false;
      }, 200);
    },
    setStatus(value) {
      this.statusFilter = value;
    },
    formatDateKey(ts) {
      const date = new Date(Number(ts));
      if (Number.isNaN(date.getTime()))
        return "未知日期";
      const m = `${date.getMonth() + 1}`.padStart(2, "0");
      const d = `${date.getDate()}`.padStart(2, "0");
      return `${date.getFullYear()}-${m}-${d}`;
    },
    formatGroupDate(key) {
      if (key === "未知日期")
        return key;
      const [y, m, d] = key.split("-");
      return `${Number(m)}月${Number(d)}日 · ${y}`;
    },
    formatTime(ts) {
      if (!ts)
        return "--:--";
      const date = new Date(Number(ts));
      if (Number.isNaN(date.getTime()))
        return "--:--";
      const h = `${date.getHours()}`.padStart(2, "0");
      const m = `${date.getMinutes()}`.padStart(2, "0");
      return `${h}:${m}`;
    },
    statusLabel(status) {
      const map = { scheduled: "待到店", completed: "已完成", canceled: "已取消" };
      return map[status] || map.scheduled;
    },
    statusClass(status) {
      return {
        scheduled: "scheduled",
        completed: "completed",
        canceled: "canceled"
      }[status] || "scheduled";
    },
    goCustomerDetail(item) {
      const cid = (item == null ? void 0 : item.customer_id) || (item == null ? void 0 : item.customerId);
      if (!cid)
        return;
      common_vendor.index.navigateTo({ url: `/pages/my-customers/detail?id=${cid}` });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.f($data.statusOptions, (opt, k0, i0) => {
      return {
        a: common_vendor.t(opt.label),
        b: opt.value,
        c: $data.statusFilter === opt.value ? 1 : "",
        d: common_vendor.o(($event) => $options.setStatus(opt.value), opt.value)
      };
    }),
    b: $data.loading
  }, $data.loading ? {} : !$options.groupedBookings.length ? {} : {
    d: common_vendor.f($options.groupedBookings, (group, k0, i0) => {
      return {
        a: common_vendor.t($options.formatGroupDate(group.date)),
        b: common_vendor.f(group.items, (item, k1, i1) => {
          return common_vendor.e({
            a: common_vendor.t($options.formatTime(item.start_ts)),
            b: common_vendor.t($options.formatTime(item.end_ts)),
            c: common_vendor.t(item.customer_name || "客户"),
            d: common_vendor.t(item.service_name || "项目"),
            e: common_vendor.t(item.store_name || "未指定门店"),
            f: item.staff_name
          }, item.staff_name ? {
            g: common_vendor.t(item.staff_name)
          } : {}, {
            h: common_vendor.t($options.statusLabel(item.status)),
            i: common_vendor.n($options.statusClass(item.status)),
            j: item._id || item.id,
            k: common_vendor.o(($event) => $options.goCustomerDetail(item), item._id || item.id)
          });
        }),
        c: group.date
      };
    })
  }, {
    c: !$options.groupedBookings.length,
    e: $data.isRefreshing,
    f: common_vendor.o((...args) => $options.handleRefresh && $options.handleRefresh(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-47b5154a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/bookings/index.js.map
