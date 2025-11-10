"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "SectionHeader",
  props: {
    title: String,
    linkText: String
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($props.title),
    b: $props.linkText
  }, $props.linkText ? {
    c: common_vendor.t($props.linkText),
    d: common_vendor.o(($event) => _ctx.$emit("more"))
  } : {});
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-2446b15d"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/src/components/ui/SectionHeader.js.map
