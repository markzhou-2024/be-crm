"use strict";
const common_vendor = require("../../common/vendor.js");
const api_customers = require("../../api/customers.js");
const api_shops = require("../../api/shops.js");
const _sfc_main = {
  data() {
    return {
      submitting: false,
      shopOptions: [],
      form: {
        name: "",
        phone: "",
        is_vip: false,
        avatar: "",
        tags: "",
        city: "",
        notes: "",
        store_id: "",
        store_name: ""
      }
    };
  },
  async onLoad() {
    await this.initShops();
  },
  methods: {
    async initShops() {
      try {
        const shops = await api_shops.fetchShops();
        if (!shops.length) {
          common_vendor.index.showToast({ title: "请先创建门店", icon: "none" });
        }
        this.shopOptions = shops.map((s) => ({
          value: s._id,
          label: s.store_name || "未命名门店"
        }));
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "加载门店失败", icon: "none" });
        this.shopOptions = [];
      }
    },
    onVipChange(e) {
      this.form.is_vip = !!e.detail.value;
    },
    onPickShop(e) {
      const idx = Number(e.detail.value);
      const opt = this.shopOptions[idx];
      if (opt) {
        this.form.store_id = opt.value;
        this.form.store_name = opt.label;
      }
    },
    validate() {
      const name = (this.form.name || "").trim();
      const phone = (this.form.phone || "").trim();
      if (!name) {
        common_vendor.index.showToast({ title: "请填写姓名", icon: "none" });
        return false;
      }
      if (phone && !/^1\d{10}$/.test(phone)) {
        common_vendor.index.showToast({ title: "手机号格式错误", icon: "none" });
        return false;
      }
      if (!this.form.store_id) {
        common_vendor.index.showToast({ title: "请选择归属门店", icon: "none" });
        return false;
      }
      this.form.name = name;
      this.form.phone = phone;
      return true;
    },
    async submit() {
      if (this.submitting)
        return;
      if (!this.validate())
        return;
      this.submitting = true;
      const payload = {
        name: this.form.name,
        phone: this.form.phone,
        is_vip: this.form.is_vip,
        avatar: this.form.avatar,
        tags: this.form.tags,
        city: this.form.city,
        notes: this.form.notes,
        store_id: this.form.store_id,
        store_name: this.form.store_name,
        total_spend: 0,
        visit_count: 0,
        last_visit_days: 0,
        last_visit_label: "今天"
      };
      try {
        await api_customers.createCustomer(payload);
        common_vendor.index.showToast({ title: "创建成功", icon: "success" });
        setTimeout(() => common_vendor.index.navigateBack(), 400);
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "保存失败", icon: "none" });
      } finally {
        this.submitting = false;
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: $data.form.name,
    b: common_vendor.o(($event) => $data.form.name = $event.detail.value),
    c: $data.form.phone,
    d: common_vendor.o(($event) => $data.form.phone = $event.detail.value),
    e: $data.form.is_vip,
    f: common_vendor.o((...args) => $options.onVipChange && $options.onVipChange(...args)),
    g: common_vendor.t($data.form.store_name || "请选择门店"),
    h: $data.shopOptions,
    i: common_vendor.o((...args) => $options.onPickShop && $options.onPickShop(...args)),
    j: $data.form.avatar,
    k: common_vendor.o(($event) => $data.form.avatar = $event.detail.value),
    l: $data.form.tags,
    m: common_vendor.o(($event) => $data.form.tags = $event.detail.value),
    n: $data.form.city,
    o: common_vendor.o(($event) => $data.form.city = $event.detail.value),
    p: $data.form.notes,
    q: common_vendor.o(($event) => $data.form.notes = $event.detail.value),
    r: $data.submitting,
    s: common_vendor.o((...args) => $options.submit && $options.submit(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-d297ec96"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my-customers/create.js.map
