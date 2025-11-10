"use strict";
const common_vendor = require("../../common/vendor.js");
const api_purchases = require("../../api/purchases.js");
const _sfc_main = {
  data() {
    return {
      customerId: "",
      customerName: "",
      form: {
        package_name: "",
        service_times: "",
        purchase_date: "",
        amount: "",
        remark: ""
      },
      history: []
    };
  },
  onLoad() {
    this.form.purchase_date = this.formatDate(/* @__PURE__ */ new Date());
    const channel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (channel) {
      channel.on("initCustomerInfo", (payload) => {
        this.customerId = (payload == null ? void 0 : payload.customerId) || "";
        this.customerName = (payload == null ? void 0 : payload.customerName) || "";
        this.loadHistory();
      });
      this.eventChannel = channel;
    }
  },
  methods: {
    formatDate(date) {
      const d = new Date(date);
      const m = d.getMonth() + 1;
      const day = d.getDate();
      return `${d.getFullYear()}-${m < 10 ? "0" + m : m}-${day < 10 ? "0" + day : day}`;
    },
    async loadHistory() {
      if (!this.customerId)
        return;
      try {
        const list = await api_purchases.listPurchases(this.customerId);
        this.history = list.slice(0, 5);
      } catch (err) {
        common_vendor.index.__f__("log", "at pages/purchases/create.vue:99", "load history failed", err);
      }
    },
    cancel() {
      common_vendor.index.navigateBack();
    },
    validate() {
      if (!this.form.package_name.trim()) {
        common_vendor.index.showToast({ title: "请输入套餐名称", icon: "none" });
        return false;
      }
      const times = Number(this.form.service_times);
      if (!Number.isInteger(times) || times <= 0) {
        common_vendor.index.showToast({ title: "服务次数须为正整数", icon: "none" });
        return false;
      }
      if (!this.form.purchase_date) {
        common_vendor.index.showToast({ title: "请选择购买日期", icon: "none" });
        return false;
      }
      const amount = Number(this.form.amount);
      if (isNaN(amount) || amount < 0 || !/^[0-9]+(\.[0-9]{1,2})?$/.test(this.form.amount)) {
        common_vendor.index.showToast({ title: "费用格式不正确", icon: "none" });
        return false;
      }
      this.form.service_times = times;
      this.form.amount = amount;
      return true;
    },
    async submit() {
      if (!this.validate())
        return;
      const payload = {
        customer_id: this.customerId,
        package_name: this.form.package_name.trim(),
        service_times: this.form.service_times,
        purchase_date: this.form.purchase_date,
        amount: this.form.amount,
        remark: this.form.remark.trim()
      };
      try {
        const record = await api_purchases.createPurchase(payload);
        if (this.eventChannel) {
          this.eventChannel.emit("purchaseCreated", record);
        }
        common_vendor.index.navigateBack();
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "保存失败", icon: "none" });
      }
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
    a: common_vendor.t($data.customerName ? `客户：${$data.customerName}` : ""),
    b: $data.form.package_name,
    c: common_vendor.o(($event) => $data.form.package_name = $event.detail.value),
    d: $data.form.service_times,
    e: common_vendor.o(($event) => $data.form.service_times = $event.detail.value),
    f: common_vendor.t($data.form.purchase_date),
    g: $data.form.purchase_date,
    h: common_vendor.o((e) => $data.form.purchase_date = e.detail.value),
    i: $data.form.amount,
    j: common_vendor.o(($event) => $data.form.amount = $event.detail.value),
    k: $data.form.remark,
    l: common_vendor.o(($event) => $data.form.remark = $event.detail.value),
    m: $data.history.length
  }, $data.history.length ? {
    n: common_vendor.f($data.history, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.package_name),
        b: common_vendor.t($options.toAmount(item.amount)),
        c: common_vendor.t(item.purchase_date),
        d: common_vendor.t(item.service_times),
        e: item._id
      };
    })
  } : {}, {
    o: common_vendor.o((...args) => $options.cancel && $options.cancel(...args)),
    p: common_vendor.o((...args) => $options.submit && $options.submit(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-367e90ab"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/purchases/create.js.map
