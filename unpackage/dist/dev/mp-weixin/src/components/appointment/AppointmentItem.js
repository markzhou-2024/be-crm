"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "AppointmentItem",
  props: {
    time: String,
    name: String,
    service: String,
    store: String
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($props.time),
    b: common_vendor.t($props.name),
    c: common_vendor.t($props.service),
    d: common_vendor.t($props.store),
    e: common_vendor.o(($event) => _ctx.$emit("click"))
  };
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-8e37436c"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/src/components/appointment/AppointmentItem.js.map
