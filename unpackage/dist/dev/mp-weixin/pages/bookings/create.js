"use strict";
const common_vendor = require("../../common/vendor.js");
const api_bookings = require("../../api/bookings.js");
const _sfc_main = {
  data() {
    return {
      customerId: "",
      customerName: "",
      loading: false,
      form: {
        service_name: "",
        store_name: "",
        staff_name: "",
        date: "",
        start_time: "",
        end_time: "",
        remark: ""
      }
    };
  },
  onLoad(query = {}) {
    this.customerId = query.customer_id || "";
    this.customerName = decodeURIComponent(query.customer_name || "");
    if (!this.customerId) {
      common_vendor.index.showToast({ title: "缺少客户ID", icon: "none" });
      setTimeout(() => common_vendor.index.navigateBack(), 400);
      return;
    }
    this.eventChannel = this.getOpenerEventChannel ? this.getOpenerEventChannel() : null;
    this.initDefaultTime();
  },
  methods: {
    initDefaultTime() {
      const now = /* @__PURE__ */ new Date();
      const roundedMinutes = Math.ceil(now.getMinutes() / 10) * 10;
      now.setMinutes(roundedMinutes);
      const next = new Date(now.getTime() + 60 * 60 * 1e3);
      this.form.date = this.formatDate(now);
      this.form.start_time = this.formatTime(now);
      this.form.end_time = this.formatTime(next);
    },
    formatDate(date) {
      const d = new Date(date);
      const m = `${d.getMonth() + 1}`.padStart(2, "0");
      const day = `${d.getDate()}`.padStart(2, "0");
      return `${d.getFullYear()}-${m}-${day}`;
    },
    formatTime(date) {
      const d = new Date(date);
      const hh = `${d.getHours()}`.padStart(2, "0");
      const mm = `${d.getMinutes()}`.padStart(2, "0");
      return `${hh}:${mm}`;
    },
    onDateChange(e) {
      var _a;
      this.form.date = ((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || this.form.date;
    },
    onTimeChange(key, e) {
      var _a;
      const value = (_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value;
      if (key && value) {
        this.form[key] = value;
      }
    },
    cancel() {
      common_vendor.index.navigateBack();
    },
    validate() {
      if (!this.form.service_name.trim()) {
        common_vendor.index.showToast({ title: "请输入服务/项目", icon: "none" });
        return false;
      }
      if (!this.form.store_name.trim()) {
        common_vendor.index.showToast({ title: "请输入门店", icon: "none" });
        return false;
      }
      if (!this.form.date) {
        common_vendor.index.showToast({ title: "请选择日期", icon: "none" });
        return false;
      }
      if (!this.form.start_time || !this.form.end_time) {
        common_vendor.index.showToast({ title: "请选择开始和结束时间", icon: "none" });
        return false;
      }
      const startTs = this.combineTs(this.form.date, this.form.start_time);
      const endTs = this.combineTs(this.form.date, this.form.end_time);
      if (!startTs || !endTs) {
        common_vendor.index.showToast({ title: "时间选择无效", icon: "none" });
        return false;
      }
      if (endTs <= startTs) {
        common_vendor.index.showToast({ title: "结束时间需晚于开始时间", icon: "none" });
        return false;
      }
      this.form.start_ts = startTs;
      this.form.end_ts = endTs;
      return true;
    },
    combineTs(dateStr, timeStr) {
      const [year, month, day] = String(dateStr).split("-").map((num) => Number(num));
      const [hour = 0, minute = 0] = String(timeStr).split(":").map((num) => Number(num));
      if ([year, month, day].some((v) => Number.isNaN(v)))
        return null;
      const date = new Date(year, (month || 1) - 1, day || 1, hour, minute, 0);
      if (Number.isNaN(date.getTime()))
        return null;
      return date.getTime();
    },
    async submit() {
      if (this.loading)
        return;
      if (!this.validate())
        return;
      if (!this.customerId) {
        common_vendor.index.showToast({ title: "缺少客户信息", icon: "none" });
        return;
      }
      this.loading = true;
      const payload = {
        customer_id: this.customerId,
        customer_name: this.customerName,
        service_name: this.form.service_name.trim(),
        store_name: this.form.store_name.trim(),
        start_ts: this.form.start_ts,
        end_ts: this.form.end_ts,
        remark: this.form.remark.trim()
      };
      if (this.form.staff_name.trim()) {
        payload.staff_name = this.form.staff_name.trim();
      }
      try {
        await api_bookings.createBooking(payload);
        common_vendor.index.showToast({ title: "预约已创建", icon: "success" });
        this.emitCreated();
        setTimeout(() => common_vendor.index.navigateBack(), 500);
      } catch (err) {
        if ((err == null ? void 0 : err.code) === 409) {
          common_vendor.index.showToast({ title: "时间段已被占用，请更换时间/人员", icon: "none" });
        } else if ((err == null ? void 0 : err.code) === 401 || (err == null ? void 0 : err.errCode) === 401) {
          common_vendor.index.showToast({ title: "登录已过期，请重新登录", icon: "none" });
        } else {
          common_vendor.index.showToast({ title: (err == null ? void 0 : err.errMsg) || (err == null ? void 0 : err.message) || "提交失败", icon: "none" });
        }
      } finally {
        this.loading = false;
      }
    },
    emitCreated() {
      if (this.eventChannel) {
        this.eventChannel.emit("bookingCreated");
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($data.customerName ? `客户：${$data.customerName}` : ""),
    b: $data.form.service_name,
    c: common_vendor.o(($event) => $data.form.service_name = $event.detail.value),
    d: $data.form.store_name,
    e: common_vendor.o(($event) => $data.form.store_name = $event.detail.value),
    f: $data.form.staff_name,
    g: common_vendor.o(($event) => $data.form.staff_name = $event.detail.value),
    h: common_vendor.t($data.form.date),
    i: $data.form.date,
    j: common_vendor.o((...args) => $options.onDateChange && $options.onDateChange(...args)),
    k: common_vendor.t($data.form.start_time),
    l: $data.form.start_time,
    m: common_vendor.o((e) => $options.onTimeChange("start_time", e)),
    n: common_vendor.t($data.form.end_time),
    o: $data.form.end_time,
    p: common_vendor.o((e) => $options.onTimeChange("end_time", e)),
    q: $data.form.remark,
    r: common_vendor.o(($event) => $data.form.remark = $event.detail.value),
    s: common_vendor.o((...args) => $options.cancel && $options.cancel(...args)),
    t: common_vendor.t($data.loading ? "提交中" : "保存预约"),
    v: $data.loading,
    w: $data.loading,
    x: common_vendor.o((...args) => $options.submit && $options.submit(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-8eb8bdf3"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/bookings/create.js.map
