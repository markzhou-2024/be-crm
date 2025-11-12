"use strict";
const common_vendor = require("../../common/vendor.js");
const api_customers = require("../../api/customers.js");
const api_purchases = require("../../api/purchases.js");
const api_bookings = require("../../api/bookings.js");
const api_analytics = require("../../api/analytics.js");
const _sfc_main = {
  data() {
    return {
      id: "",
      customer: {},
      notesDraft: "",
      defaultAvatar: "https://cdn.uviewui.com/uview/album/1.jpg",
      tabs: [
        { label: "购买", value: "purchase" },
        { label: "消耗", value: "consume" },
        { label: "预约", value: "booking" },
        { label: "图库", value: "gallery" },
        { label: "备注", value: "notes" }
      ],
      activeTab: "purchase",
      purchaseHistory: [],
      consumeHistory: [],
      stats: { total_spend: 0, visit_count: 0 },
      bookingList: [],
      bookingLoading: false,
      bookingLoaded: false,
      bookingStatusUpdating: "",
      isRefreshing: false,
      storeVisitCount: null
    };
  },
  watch: {
    activeTab(newVal) {
      if (newVal === "booking") {
        this.ensureBookingLoaded();
      }
    }
  },
  onLoad(query) {
    this.id = query && query.id || "";
    if (!this.id) {
      common_vendor.index.showToast({ title: "缺少客户ID", icon: "none" });
      setTimeout(() => common_vendor.index.navigateBack(), 400);
      return;
    }
    this.loadData();
  },
  onShow() {
    if (this.id) {
      this.loadCustomerStats();
      if (this.activeTab === "booking" && this.bookingLoaded) {
        this.loadBookings({ force: true, silent: true });
      }
      this.loadStoreVisitCount();
    }
  },
  methods: {
    async loadData() {
      try {
        const data = await api_customers.getCustomerById(this.id);
        if (!data) {
          common_vendor.index.showToast({ title: "客户不存在", icon: "none" });
          setTimeout(() => common_vendor.index.navigateBack(), 400);
          return;
        }
        this.customer = data;
        this.notesDraft = data.notes || "";
        common_vendor.index.setNavigationBarTitle({ title: data.name || "客户详情" });
        await Promise.all([
          this.loadCustomerStats(),
          this.loadPurchaseHistory(),
          this.loadConsumeHistory()
        ]);
        await this.loadStoreVisitCount();
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "加载失败", icon: "none" });
      }
    },
    async loadCustomerStats() {
      const fallback = { total_spend: 0, visit_count: 0 };
      try {
        const obj = common_vendor.tr.importObject("stats-customer", { customUI: true });
        const cid = this.customer._id || this.customer.id || this.id;
        if (!cid) {
          this.updateStatsState(fallback);
          return;
        }
        const res = await obj.summary({ customer_id: cid });
        const next = res && res.code === 0 && res.data ? {
          total_spend: Number(res.data.total_spend) || 0,
          visit_count: Number(res.data.visit_count) || 0
        } : fallback;
        this.updateStatsState(next);
      } catch (e) {
        this.updateStatsState(fallback);
      }
    },
    async loadPurchaseHistory() {
      try {
        const list = await api_purchases.listPurchases(this.id);
        this.purchaseHistory = list;
        this.decorateConsumeRecords();
      } catch (err) {
        common_vendor.index.__f__("log", "at pages/my-customers/detail.vue:244", "load purchase failed", err);
        this.purchaseHistory = [];
      }
    },
    async loadConsumeHistory() {
      try {
        const service = common_vendor.tr.importObject("curd-consume", { customUI: true });
        const res = await service.listByCustomer({ customer_id: this.id });
        this.consumeHistory = this.normalizeCloudList(res);
        this.decorateConsumeRecords();
      } catch (err) {
        common_vendor.index.__f__("log", "at pages/my-customers/detail.vue:255", "load consume failed", err);
        this.consumeHistory = [];
      }
    },
    normalizeCloudList(payload) {
      var _a;
      if (Array.isArray(payload))
        return payload;
      if (Array.isArray(payload == null ? void 0 : payload.data))
        return payload.data;
      if (Array.isArray((_a = payload == null ? void 0 : payload.result) == null ? void 0 : _a.data))
        return payload.result.data;
      return [];
    },
    goEdit() {
      common_vendor.index.navigateTo({ url: `/pages/my-customers/edit?id=${this.id}` });
    },
    goPurchase() {
      common_vendor.index.navigateTo({
        url: "/pages/purchases/create",
        events: {
          purchaseCreated: async () => {
            await Promise.all([this.loadPurchaseHistory(), this.loadCustomerStats()]);
            common_vendor.index.showToast({ title: "已记录购买", icon: "success" });
          }
        },
        success: (res) => {
          res.eventChannel.emit("initCustomerInfo", {
            customerId: this.id,
            customerName: this.customer.name
          });
        }
      });
    },
    goConsume() {
      const cid = this.customer._id || this.customer.id || this.id;
      if (!cid) {
        common_vendor.index.showToast({ title: "缺少客户ID", icon: "none" });
        return;
      }
      common_vendor.index.navigateTo({
        url: `/pages/purchases/consume?customer_id=${cid}&customer_name=${encodeURIComponent(this.customer.name || "")}`,
        events: {
          consumeSaved: async () => {
            await Promise.all([this.loadConsumeHistory(), this.loadCustomerStats()]);
            common_vendor.index.showToast({ title: "消耗已记录", icon: "success" });
          }
        }
      });
    },
    goNextWeek() {
      common_vendor.index.navigateTo({ url: "/pages/appointments/next-week" });
    },
    goCalendar() {
      common_vendor.index.navigateTo({ url: "/pages/calendar/index" });
    },
    goBookingCreate() {
      const cid = this.customer._id || this.customer.id || this.id;
      if (!cid) {
        common_vendor.index.showToast({ title: "缺少客户ID", icon: "none" });
        return;
      }
      const name = encodeURIComponent(this.customer.name || "");
      common_vendor.index.navigateTo({
        url: `/pages/bookings/create?customer_id=${cid}&customer_name=${name}`,
        events: {
          bookingCreated: () => {
            this.activeTab = "booking";
            this.loadBookings({ force: true });
          }
        }
      });
    },
    async handlePageRefresh() {
      if (this.isRefreshing)
        return;
      this.isRefreshing = true;
      try {
        await this.loadData();
        if (this.activeTab === "booking" || this.bookingLoaded) {
          await this.loadBookings({ force: true, silent: true });
        }
      } finally {
        setTimeout(() => {
          this.isRefreshing = false;
        }, 200);
      }
    },
    ensureBookingLoaded() {
      if (!this.bookingLoaded && !this.bookingLoading) {
        this.loadBookings();
      }
    },
    async loadBookings(options = {}) {
      if (!this.id)
        return;
      const { force = false, silent = false } = options;
      if (this.bookingLoading)
        return;
      if (this.bookingLoaded && !force)
        return;
      const shouldShowLoading = !this.bookingLoaded || !silent;
      if (shouldShowLoading) {
        this.bookingLoading = true;
      }
      try {
        const list = await api_bookings.listBookingsByCustomer({ customer_id: this.id });
        const next = (list || []).slice().sort((a, b) => {
          return Number(b.start_ts || 0) - Number(a.start_ts || 0);
        });
        this.bookingList = next;
        this.bookingLoaded = true;
      } catch (err) {
        if (!silent) {
          common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "预约加载失败", icon: "none" });
        }
      } finally {
        if (shouldShowLoading) {
          this.bookingLoading = false;
        }
      }
    },
    async loadStoreVisitCount() {
      const cid = this.customer._id || this.customer.id || this.id;
      const storeId = this.customer.store_id || this.customer.storeId;
      if (!cid || !storeId) {
        this.storeVisitCount = null;
        return;
      }
      try {
        const res = await api_analytics.fetchCustomerStoreVisitCount({ customer_id: cid, store_id: storeId });
        this.storeVisitCount = Number((res == null ? void 0 : res.visit_count) ?? 0);
      } catch (err) {
        if ((err == null ? void 0 : err.code) === 401 || (err == null ? void 0 : err.errCode) === 401) {
          this.storeVisitCount = null;
        } else {
          this.storeVisitCount = null;
        }
      }
    },
    formatBookingTime(ts) {
      if (!ts)
        return "--:--";
      const date = new Date(Number(ts));
      if (Number.isNaN(date.getTime()))
        return "--:--";
      const h = `${date.getHours()}`.padStart(2, "0");
      const m = `${date.getMinutes()}`.padStart(2, "0");
      return `${h}:${m}`;
    },
    formatBookingDate(ts) {
      if (!ts)
        return "--";
      const date = new Date(Number(ts));
      if (Number.isNaN(date.getTime()))
        return "--";
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    },
    formatBookingRange(start, end) {
      const startLabel = this.formatBookingTime(start);
      const endLabel = end ? this.formatBookingTime(end) : "";
      return endLabel ? `${startLabel} - ${endLabel}` : startLabel;
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
    handleBookingActions(item) {
      if (!item)
        return;
      const options = [];
      if (item.status !== "completed") {
        options.push({ label: "标记完成", value: "completed" });
      }
      if (item.status !== "canceled") {
        options.push({ label: "取消预约", value: "canceled" });
      }
      if (!options.length)
        return;
      common_vendor.index.showActionSheet({
        itemList: options.map((opt) => opt.label),
        success: (res) => {
          const choice = options[res.tapIndex];
          if (choice) {
            this.confirmBookingStatus(item, choice.value);
          }
        }
      });
    },
    confirmBookingStatus(item, status) {
      const text = status === "completed" ? "确定将该预约标记为已完成？" : "确定取消该预约吗？";
      common_vendor.index.showModal({
        title: "更新预约状态",
        content: text,
        success: (res) => {
          if (res.confirm) {
            this.applyBookingStatus(item, status);
          }
        }
      });
    },
    async applyBookingStatus(item, status) {
      const bookingId = (item == null ? void 0 : item._id) || (item == null ? void 0 : item.id);
      if (!bookingId)
        return;
      if (this.bookingStatusUpdating)
        return;
      this.bookingStatusUpdating = bookingId;
      try {
        await api_bookings.updateBookingStatus({ booking_id: bookingId, status });
        common_vendor.index.showToast({ title: "状态已更新", icon: "success" });
        await this.loadBookings({ force: true, silent: true });
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "状态更新失败", icon: "none" });
      } finally {
        this.bookingStatusUpdating = "";
      }
    },
    async saveNotes() {
      try {
        await api_customers.updateCustomer({ _id: this.id, notes: this.notesDraft });
        this.customer.notes = this.notesDraft;
        common_vendor.index.showToast({ title: "备注已保存", icon: "success" });
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "保存失败", icon: "none" });
      }
    },
    confirmDelete() {
      common_vendor.index.showModal({
        title: "删除客户",
        content: "删除后不可恢复，确定删除？",
        confirmText: "删除",
        confirmColor: "#dd524d",
        success: (res) => {
          if (res.confirm) {
            this.deleteCustomer();
          }
        }
      });
    },
    async deleteCustomer() {
      try {
        await api_customers.deleteCustomer(this.id);
        common_vendor.index.showToast({ title: "已删除", icon: "success" });
        setTimeout(() => common_vendor.index.navigateBack(), 400);
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "删除失败", icon: "none" });
      }
    },
    toAmount(n) {
      try {
        return Number(n || 0).toLocaleString("zh-CN");
      } catch (e) {
        return n;
      }
    },
    formatConsumeDate(value) {
      if (!value)
        return "--";
      const date = typeof value === "number" || /^\d+$/.test(value) ? new Date(Number(value)) : new Date(value);
      if (Number.isNaN(date.getTime()))
        return "--";
      const m = `${date.getMonth() + 1}`.padStart(2, "0");
      const d = `${date.getDate()}`.padStart(2, "0");
      return `${date.getFullYear()}-${m}-${d}`;
    },
    decorateConsumeRecords() {
      if (!this.consumeHistory || !this.consumeHistory.length)
        return;
      const purchaseMap = {};
      this.purchaseHistory.forEach((item) => {
        const key = item._id || item.id;
        if (!key)
          return;
        purchaseMap[key] = {
          total: Number(item.service_times) || 0,
          remaining: Number(item.service_times) || 0
        };
      });
      const grouped = {};
      this.consumeHistory.forEach((record) => {
        const bid = record.buy_id || record.buyId || record.buyID || "";
        grouped[bid] = grouped[bid] || [];
        grouped[bid].push(record);
      });
      Object.keys(grouped).forEach((bid) => {
        const list = grouped[bid];
        list.sort((a, b) => {
          const at = Number(a.consumed_at || a.create_time || 0);
          const bt = Number(b.consumed_at || b.create_time || 0);
          return at - bt;
        });
        const totalInfo = purchaseMap[bid];
        let remain = totalInfo ? totalInfo.total : null;
        list.forEach((item) => {
          if (remain === null || remain === void 0) {
            item._remaining = null;
            return;
          }
          const cost = Number(item.count || item.service_times || 0);
          remain = Math.max(0, remain - cost);
          item._remaining = remain;
        });
      });
      this.consumeHistory = [...this.consumeHistory];
    },
    renderRemaining(value) {
      if (value === null || value === void 0 || Number.isNaN(value)) {
        return "剩余--次";
      }
      return `剩余${value}次`;
    },
    updateStatsState(stats) {
      const safeStats = stats || { total_spend: 0, visit_count: 0 };
      this.stats = safeStats;
      if (!this.customer || typeof this.customer !== "object") {
        this.customer = {
          ...this.customer || {},
          total_spend: safeStats.total_spend,
          visit_count: safeStats.visit_count
        };
        return;
      }
      if (typeof this.$set === "function") {
        this.$set(this.customer, "total_spend", safeStats.total_spend);
        this.$set(this.customer, "visit_count", safeStats.visit_count);
      } else {
        this.customer = {
          ...this.customer,
          total_spend: safeStats.total_spend,
          visit_count: safeStats.visit_count
        };
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.goEdit && $options.goEdit(...args)),
    b: $data.customer.avatar || $data.defaultAvatar,
    c: common_vendor.t($data.customer.name),
    d: $data.customer.is_vip
  }, $data.customer.is_vip ? {} : {}, {
    e: $data.customer.store_name
  }, $data.customer.store_name ? {
    f: common_vendor.t($data.customer.store_name)
  } : {}, {
    g: $data.customer.tags
  }, $data.customer.tags ? {
    h: common_vendor.t($data.customer.tags)
  } : {}, {
    i: $data.customer.city
  }, $data.customer.city ? {
    j: common_vendor.t($data.customer.city)
  } : {}, {
    k: common_vendor.t($data.customer.phone || "-"),
    l: $data.storeVisitCount !== null
  }, $data.storeVisitCount !== null ? {
    m: common_vendor.t($data.storeVisitCount)
  } : {}, {
    n: common_vendor.t($options.toAmount($data.stats.total_spend)),
    o: common_vendor.t($data.stats.visit_count || 0),
    p: common_vendor.f($data.tabs, (tab, k0, i0) => {
      return {
        a: common_vendor.t(tab.label),
        b: tab.value,
        c: $data.activeTab === tab.value ? 1 : "",
        d: common_vendor.o(($event) => $data.activeTab = tab.value, tab.value)
      };
    }),
    q: $data.activeTab === "purchase"
  }, $data.activeTab === "purchase" ? common_vendor.e({
    r: $data.purchaseHistory.length
  }, $data.purchaseHistory.length ? {
    s: common_vendor.f($data.purchaseHistory, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.package_name),
        b: common_vendor.t($options.toAmount(item.amount)),
        c: common_vendor.t(item.purchase_date),
        d: common_vendor.t(item.service_times),
        e: item.remark
      }, item.remark ? {
        f: common_vendor.t(item.remark)
      } : {}, {
        g: item._id
      });
    })
  } : {}) : $data.activeTab === "consume" ? common_vendor.e({
    v: $data.consumeHistory.length
  }, $data.consumeHistory.length ? {
    w: common_vendor.f($data.consumeHistory, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.product_name || item.package_name || "项目"),
        b: common_vendor.t($options.formatConsumeDate(item.consumed_at || item.service_date)),
        c: common_vendor.t(item.count || item.service_times || 0),
        d: common_vendor.t($options.renderRemaining(item._remaining)),
        e: item.note
      }, item.note ? {
        f: common_vendor.t(item.note)
      } : {}, {
        g: item._id || item.id
      });
    })
  } : {}) : $data.activeTab === "booking" ? common_vendor.e({
    y: common_vendor.o((...args) => $options.goNextWeek && $options.goNextWeek(...args)),
    z: common_vendor.o((...args) => $options.goCalendar && $options.goCalendar(...args)),
    A: $data.bookingLoading && !$data.bookingList.length
  }, $data.bookingLoading && !$data.bookingList.length ? {} : $data.bookingList.length ? {
    C: common_vendor.f($data.bookingList, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.formatBookingTime(item.start_ts)),
        b: common_vendor.t($options.formatBookingDate(item.start_ts)),
        c: common_vendor.t(item.service_name || "未命名服务"),
        d: common_vendor.t(item.store_name || "未选择门店"),
        e: common_vendor.t($options.formatBookingRange(item.start_ts, item.end_ts)),
        f: item.staff_name
      }, item.staff_name ? {
        g: common_vendor.t(item.staff_name)
      } : {}, {
        h: common_vendor.t($options.statusLabel(item.status)),
        i: common_vendor.n($options.statusClass(item.status)),
        j: item._id || item.id,
        k: common_vendor.o(($event) => $options.handleBookingActions(item), item._id || item.id),
        l: common_vendor.o(($event) => $options.handleBookingActions(item), item._id || item.id),
        m: $data.bookingStatusUpdating === (item._id || item.id) ? 1 : ""
      });
    })
  } : {}, {
    B: $data.bookingList.length
  }) : $data.activeTab === "gallery" ? {} : {
    E: $data.notesDraft,
    F: common_vendor.o(($event) => $data.notesDraft = $event.detail.value),
    G: common_vendor.o((...args) => $options.saveNotes && $options.saveNotes(...args))
  }, {
    t: $data.activeTab === "consume",
    x: $data.activeTab === "booking",
    D: $data.activeTab === "gallery",
    H: $data.isRefreshing,
    I: common_vendor.o((...args) => $options.handlePageRefresh && $options.handlePageRefresh(...args)),
    J: common_vendor.o((...args) => $options.goPurchase && $options.goPurchase(...args)),
    K: common_vendor.o((...args) => $options.goConsume && $options.goConsume(...args)),
    L: common_vendor.o((...args) => $options.goBookingCreate && $options.goBookingCreate(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-20dde889"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my-customers/detail.js.map
