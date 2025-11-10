"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  name: "AppCard",
  props: {
    padding: { type: String, default: "16px" },
    radius: { type: String, default: "var(--r-xl, 22px)" },
    shadow: { type: Boolean, default: true }
  },
  computed: {
    cardStyle() {
      const shadowStyle = this.shadow ? "box-shadow:0 6px 18px rgba(0,0,0,.06);" : "";
      return `background:#fff;border-radius:${this.radius};padding:${this.padding};${shadowStyle}`;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.s($options.cardStyle)
  };
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1b4a374b"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/src/components/ui/AppCard.js.map
