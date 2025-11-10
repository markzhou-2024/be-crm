"use strict";
const common_vendor = require("../../../common/vendor.js");
const AppCard = () => "../ui/AppCard.js";
const _sfc_main = {
  name: "StatTile",
  components: { AppCard },
  props: {
    icon: String,
    iconColor: { type: String, default: "#111" },
    value: [String, Number],
    label: String
  }
};
if (!Array) {
  const _component_app_card = common_vendor.resolveComponent("app-card");
  _component_app_card();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($props.icon),
    b: $props.iconColor,
    c: common_vendor.t($props.value),
    d: common_vendor.t($props.label),
    e: common_vendor.p({
      padding: "16px"
    })
  };
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-85e3de89"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/src/components/metrics/StatTile.js.map
