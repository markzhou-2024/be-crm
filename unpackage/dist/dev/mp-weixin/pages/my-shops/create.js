"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      submitting: false,
      form: {
        store_name: "",
        store_address: "",
        phone: "",
        business_hours: "10:00 - 22:00",
        cover_image: "",
        status: "active"
      }
    };
  },
  methods: {
    async submit() {
      if (this.submitting)
        return;
      if (!this.form.store_name || !this.form.store_address) {
        common_vendor.index.showToast({ title: "请填写必填项", icon: "none" });
        return;
      }
      this.submitting = true;
      const service = common_vendor.tr.importObject("curd-shops");
      try {
        await service.createShop({ ...this.form });
        common_vendor.index.showToast({ title: "创建成功", icon: "success" });
        setTimeout(() => common_vendor.index.navigateBack(), 400);
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "保存失败", icon: "none" });
      } finally {
        this.submitting = false;
      }
    },
    cancel() {
      if (!this.submitting) {
        common_vendor.index.navigateBack();
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: $data.form.store_name,
    b: common_vendor.o(($event) => $data.form.store_name = $event.detail.value),
    c: $data.form.store_address,
    d: common_vendor.o(($event) => $data.form.store_address = $event.detail.value),
    e: $data.form.phone,
    f: common_vendor.o(($event) => $data.form.phone = $event.detail.value),
    g: $data.form.business_hours,
    h: common_vendor.o(($event) => $data.form.business_hours = $event.detail.value),
    i: $data.form.cover_image,
    j: common_vendor.o(($event) => $data.form.cover_image = $event.detail.value),
    k: $data.submitting,
    l: common_vendor.o((...args) => $options.submit && $options.submit(...args)),
    m: $data.submitting,
    n: common_vendor.o((...args) => $options.cancel && $options.cancel(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-d26d6131"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my-shops/create.js.map
