"use strict";
const common_vendor = require("../../common/vendor.js");
const api_purchases = require("../../api/purchases.js");
const _sfc_main = {
  data() {
    return {
      customer_id: "",
      customer_name: "",
      form: {
        buy_id: "",
        product_name: "",
        count: 1,
        note: ""
      },
      records: [],
      purchases: [],
      selectedPurchaseIndex: -1
    };
  },
  onLoad(query = {}) {
    this.customer_id = query.customer_id || "";
    this.customer_name = decodeURIComponent(query.customer_name || "");
    if (!this.customer_id) {
      common_vendor.index.showToast({ title: "缺少客户ID", icon: "none" });
      return;
    }
    this.fetchRecords();
    this.fetchPurchases();
  },
  onPullDownRefresh() {
    Promise.all([this.fetchRecords(), this.fetchPurchases()]).finally(() => common_vendor.index.stopPullDownRefresh());
  },
  computed: {
    purchaseRange() {
      return this.purchases.map((item) => this.formatPurchaseLabel(item));
    },
    selectedPurchaseLabel() {
      if (this.selectedPurchaseIndex === -1 || !this.purchases[this.selectedPurchaseIndex]) {
        return "选择历史购买记录";
      }
      return this.formatPurchaseLabel(this.purchases[this.selectedPurchaseIndex]);
    },
    canSubmit() {
      return this.selectedPurchaseIndex !== -1 && this.form.count > 0;
    }
  },
  methods: {
    getConsumeObject() {
      return common_vendor.tr.importObject("curd-consume", { customUI: true });
    },
    extractArray(payload) {
      var _a;
      if (Array.isArray(payload))
        return payload;
      if (Array.isArray(payload == null ? void 0 : payload.data))
        return payload.data;
      if (Array.isArray((_a = payload == null ? void 0 : payload.result) == null ? void 0 : _a.data))
        return payload.result.data;
      return [];
    },
    formatPurchaseLabel(item = {}) {
      const name = item.package_name || "未命名套餐";
      const times = item.service_times ? `${item.service_times}次` : "";
      const date = item.purchase_date || "";
      return [name, times, date].filter(Boolean).join(" · ") || name;
    },
    onPurchaseChange(e) {
      var _a;
      const idx = Number((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value);
      if (Number.isNaN(idx))
        return;
      this.setSelectedPurchase(idx);
    },
    setSelectedPurchase(index) {
      this.selectedPurchaseIndex = index;
      const target = this.purchases[index];
      if (target) {
        this.form.product_name = target.package_name || "";
        this.form.buy_id = target._id || target.id || "";
      } else {
        this.form.product_name = "";
        this.form.buy_id = "";
      }
    },
    async fetchPurchases() {
      if (!this.customer_id)
        return;
      try {
        const list = await api_purchases.listPurchases(this.customer_id);
        this.purchases = (list || []).sort((a, b) => {
          const tb = Date.parse((b == null ? void 0 : b.purchase_date) || "") || 0;
          const ta = Date.parse((a == null ? void 0 : a.purchase_date) || "") || 0;
          return tb - ta;
        });
        if (this.purchases.length) {
          this.setSelectedPurchase(0);
        } else {
          this.setSelectedPurchase(-1);
        }
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "购买记录加载失败", icon: "none" });
      }
    },
    async fetchRecords() {
      if (!this.customer_id)
        return;
      try {
        const obj = this.getConsumeObject();
        const res = await obj.listByCustomer({ customer_id: this.customer_id });
        this.records = this.extractArray(res);
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "记录加载失败", icon: "none" });
      }
    },
    confirmSave() {
      if (!this.canSubmit) {
        common_vendor.index.showToast({ title: "请选择项目并填写次数", icon: "none" });
        return;
      }
      common_vendor.index.showModal({
        title: "确认保存",
        content: "确定要登记本次消耗吗？",
        confirmText: "保存",
        success: (res) => {
          if (res.confirm) {
            this.saveConsume();
          }
        }
      });
    },
    async saveConsume() {
      if (!this.customer_id) {
        common_vendor.index.showToast({ title: "缺少客户ID", icon: "none" });
        return;
      }
      if (this.selectedPurchaseIndex === -1 || !this.form.product_name.trim()) {
        common_vendor.index.showToast({ title: "请选择项目", icon: "none" });
        return;
      }
      if (!this.form.count || this.form.count <= 0) {
        common_vendor.index.showToast({ title: "消耗次数需大于0", icon: "none" });
        return;
      }
      try {
        const obj = this.getConsumeObject();
        await obj.add({
          customer_id: this.customer_id,
          buy_id: this.form.buy_id,
          product_name: this.form.product_name.trim(),
          count: this.form.count,
          note: this.form.note
        });
        common_vendor.index.showToast({ title: "保存成功", icon: "success" });
        this.fetchRecords();
        this.emitSavedEvent();
        setTimeout(() => {
          common_vendor.index.navigateBack();
        }, 400);
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "保存失败", icon: "none" });
      }
    },
    emitSavedEvent() {
      try {
        const channel = this.getOpenerEventChannel && this.getOpenerEventChannel();
        channel && channel.emit && channel.emit("consumeSaved");
      } catch (e) {
      }
    },
    changeCount(delta) {
      const next = Number(this.form.count || 0) + delta;
      this.form.count = Math.max(1, Math.floor(next));
    },
    formatDate(value) {
      if (!value)
        return "--";
      const date = typeof value === "number" || /^\d+$/.test(value) ? new Date(Number(value)) : new Date(value);
      if (Number.isNaN(date.getTime()))
        return "--";
      const m = `${date.getMonth() + 1}`.padStart(2, "0");
      const d = `${date.getDate()}`.padStart(2, "0");
      return `${date.getFullYear()}-${m}-${d}`;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.customer_name),
    b: common_vendor.t($options.selectedPurchaseLabel),
    c: $data.selectedPurchaseIndex === -1 ? 1 : "",
    d: $options.purchaseRange,
    e: common_vendor.o((...args) => $options.onPurchaseChange && $options.onPurchaseChange(...args)),
    f: !$data.purchases.length,
    g: !$data.purchases.length
  }, !$data.purchases.length ? {} : {}, {
    h: common_vendor.o(($event) => $options.changeCount(-1)),
    i: $data.form.count <= 1,
    j: common_vendor.t($data.form.count),
    k: common_vendor.o(($event) => $options.changeCount(1)),
    l: $data.form.note,
    m: common_vendor.o(($event) => $data.form.note = $event.detail.value),
    n: !$options.canSubmit,
    o: common_vendor.o((...args) => $options.confirmSave && $options.confirmSave(...args)),
    p: $data.records.length
  }, $data.records.length ? {
    q: common_vendor.f($data.records, (r, idx, i0) => {
      return common_vendor.e({
        a: common_vendor.t(r.product_name || r.package_name || "项目"),
        b: common_vendor.t(r.count || r.service_times || 0),
        c: common_vendor.t($options.formatDate(r.consumed_at || r.service_date)),
        d: r.note
      }, r.note ? {
        e: common_vendor.t(r.note)
      } : {}, {
        f: r._id || r.id || idx
      });
    })
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ec72f29a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/purchases/consume.js.map
