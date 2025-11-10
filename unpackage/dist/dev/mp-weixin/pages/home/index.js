"use strict";
const common_vendor = require("../../common/vendor.js");
const src_services_home = require("../../src/services/home.js");
const AppCard = () => "../../src/components/ui/AppCard.js";
const SectionHeader = () => "../../src/components/ui/SectionHeader.js";
const StatTile = () => "../../src/components/metrics/StatTile.js";
const AppointmentItem = () => "../../src/components/appointment/AppointmentItem.js";
const _sfc_main = {
  name: "HomePage",
  components: { AppCard, SectionHeader, StatTile, AppointmentItem },
  data() {
    return {
      stats: {
        store_count: 0,
        customer_count: 0,
        month_sales: 0,
        month_consume_count: 0
      },
      todayList: []
    };
  },
  async onShow() {
    await Promise.all([this.loadStats(), this.loadToday()]);
  },
  methods: {
    async loadStats() {
      this.stats = await src_services_home.getHomeStats();
    },
    async loadToday() {
      this.todayList = await src_services_home.getTodayAppointments();
    },
    kfmt(n) {
      const v = Number(n || 0);
      return v >= 1e3 ? Math.round(v / 1e3) + "K" : v;
    },
    fmtNum(n) {
      return Number(n || 0).toLocaleString("zh-CN");
    },
    goAll() {
      common_vendor.index.navigateTo({ url: "/pages/appointments/index" });
    },
    goDetail(item) {
      common_vendor.index.navigateTo({ url: `/pages/appointments/detail?id=${item.id}` });
    }
  }
};
if (!Array) {
  const _component_stat_tile = common_vendor.resolveComponent("stat-tile");
  const _component_section_header = common_vendor.resolveComponent("section-header");
  const _component_appointment_item = common_vendor.resolveComponent("appointment-item");
  const _component_app_card = common_vendor.resolveComponent("app-card");
  (_component_stat_tile + _component_section_header + _component_appointment_item + _component_app_card)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.p({
      icon: "🏪",
      value: $data.stats.store_count,
      label: "门店数"
    }),
    b: common_vendor.p({
      icon: "👥",
      iconColor: "#20C997",
      value: $options.fmtNum($data.stats.customer_count),
      label: "客户数"
    }),
    c: common_vendor.p({
      icon: "＄",
      iconColor: "#C8A675",
      value: "¥" + $options.kfmt($data.stats.month_sales),
      label: "本月销售额"
    }),
    d: common_vendor.p({
      icon: "🎫",
      value: $options.fmtNum($data.stats.month_consume_count),
      label: "本月消耗次数"
    }),
    e: common_vendor.o($options.goAll),
    f: common_vendor.p({
      title: "今日预约",
      linkText: "查看全部"
    }),
    g: common_vendor.f($data.todayList, (i, k0, i0) => {
      return {
        a: i.id,
        b: common_vendor.o(($event) => $options.goDetail(i), i.id),
        c: "4978fed5-6-" + i0 + ",4978fed5-5",
        d: common_vendor.p({
          time: i.time,
          name: i.name,
          service: i.service,
          store: i.store
        })
      };
    }),
    h: !$data.todayList.length
  }, !$data.todayList.length ? {} : {}, {
    i: common_vendor.p({
      padding: "4px 6px"
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-4978fed5"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/home/index.js.map
