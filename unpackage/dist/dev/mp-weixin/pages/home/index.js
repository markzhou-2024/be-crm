"use strict";
const common_vendor = require("../../common/vendor.js");
const api_shops = require("../../api/shops.js");
const src_services_schedule = require("../../src/services/schedule.js");
const pad = (value) => `${value}`.padStart(2, "0");
function formatDateValue(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  return `${y}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatMonthValue(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
const AppCard = () => "../../src/components/ui/AppCard.js";
const _sfc_main = {
  name: "HomePage",
  components: { AppCard },
  data() {
    const today = formatDateValue(/* @__PURE__ */ new Date());
    return {
      weekLabels: ["一", "二", "三", "四", "五", "六", "日"],
      currentMonth: formatMonthValue(/* @__PURE__ */ new Date()),
      displayMonth: "",
      calendarDays: [],
      selectedDate: today,
      dayTasks: [],
      allTasks: [],
      formVisible: false,
      formData: { title: "日程安排", time: "09:00", note: "", store_id: "", store_name: "" },
      editingTaskId: "",
      storeOptions: [{ label: "请选择门店", value: "" }],
      storePickerIndex: 0,
      touchState: null,
      calendarRange: { start: 0, end: 0 }
    };
  },
  async onShow() {
    await this.ensureStores();
    await this.refreshTasks();
  },
  methods: {
    formatDate(date) {
      return formatDateValue(date);
    },
    formatMonth(date) {
      return formatMonthValue(date);
    },
    calcCalendarRange() {
      const [year, month] = this.currentMonth.split("-").map((n) => Number(n));
      const firstDay = new Date(year, month - 1, 1);
      const start = new Date(firstDay);
      const offset = (firstDay.getDay() + 6) % 7;
      start.setDate(firstDay.getDate() - offset);
      const end = new Date(start);
      end.setDate(start.getDate() + 42);
      return { start, end };
    },
    async refreshTasks() {
      const range = this.calcCalendarRange();
      this.calendarRange = { start: range.start.getTime(), end: range.end.getTime() };
      try {
        this.allTasks = await src_services_schedule.listAllTasks({ start: this.calendarRange.start, end: this.calendarRange.end });
      } catch (err) {
        common_vendor.index.__f__("log", "at pages/home/index.vue:168", "load calendar failed", err);
        this.allTasks = [];
        const msg = (err == null ? void 0 : err.code) === 401 || (err == null ? void 0 : err.errCode) === 401 ? "请登录后查看日程" : (err == null ? void 0 : err.message) || "加载日历失败";
        common_vendor.index.showToast({ title: msg, icon: "none" });
      }
      this.buildCalendar(range);
      this.loadDayTasks();
    },
    async ensureStores() {
      if (this.storeOptions.length > 1)
        return;
      try {
        const list = await api_shops.fetchShopHistory();
        const mapped = list.map((item) => ({
          label: item.store_name || item.name,
          value: item._id || item.id
        }));
        this.storeOptions = [{ label: "请选择门店", value: "" }, ...mapped];
      } catch (err) {
        common_vendor.index.__f__("log", "at pages/home/index.vue:188", "fetch shops failed", err);
        this.storeOptions = [{ label: "请选择门店", value: "" }];
      }
    },
    buildCalendar(range) {
      const ref = range || this.calcCalendarRange();
      const start = new Date(ref.start);
      const [year, month] = this.currentMonth.split("-").map((n) => Number(n));
      const today = this.formatDate(/* @__PURE__ */ new Date());
      const taskMap = this.allTasks.reduce((acc, task) => {
        const list = acc[task.date] || [];
        list.push(task);
        acc[task.date] = list;
        return acc;
      }, {});
      const days = [];
      for (let i = 0; i < 42; i += 1) {
        const current = new Date(start);
        current.setDate(start.getDate() + i);
        const dateStr = this.formatDate(current);
        const dayTasks = taskMap[dateStr] || [];
        const pills = dayTasks.slice(0, 2).map((item) => item.store_name || item.title || "待办");
        days.push({
          date: dateStr,
          day: current.getDate(),
          inMonth: current.getMonth() === month - 1 && current.getFullYear() === year,
          isToday: dateStr === today,
          count: dayTasks.length,
          pills,
          more: Math.max(dayTasks.length - pills.length, 0)
        });
      }
      this.displayMonth = `${year}年${String(month).padStart(2, "0")}月`;
      this.calendarDays = days;
      if (this.selectedDate.slice(0, 7) !== this.currentMonth) {
        this.selectedDate = this.formatDate(new Date(year, month - 1, 1));
      }
    },
    loadDayTasks() {
      const list = this.allTasks.filter((item) => item.date === this.selectedDate).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      this.dayTasks = list;
    },
    async changeMonth(step) {
      const [year, month] = this.currentMonth.split("-").map((n) => Number(n));
      const next = new Date(year, month - 1 + step, 1);
      this.currentMonth = this.formatMonth(next);
      await this.refreshTasks();
    },
    async selectDate(day) {
      const same = this.selectedDate === day.date;
      this.selectedDate = day.date;
      this.loadDayTasks();
      if (same) {
        await this.openTaskForm();
      }
    },
    async quickCreate(day) {
      this.selectedDate = day.date;
      this.loadDayTasks();
      await this.openTaskForm();
    },
    async openTaskForm(task) {
      await this.ensureStores();
      this.formVisible = true;
      if (task) {
        this.editingTaskId = task.id;
        this.formData = {
          title: task.title || "日程安排",
          time: task.time,
          note: task.note || "",
          store_id: task.store_id || "",
          store_name: task.store_name || ""
        };
        let idx = this.storeOptions.findIndex((item) => item.value === task.store_id);
        if (task.store_id && idx === -1) {
          this.storeOptions = [...this.storeOptions, { label: task.store_name || "已下线门店", value: task.store_id }];
          idx = this.storeOptions.length - 1;
        }
        this.setStorePickerIndex(idx >= 0 ? idx : 0);
        if (!task.store_id) {
          this.formData.store_id = "";
          this.formData.store_name = "";
        }
      } else {
        this.editingTaskId = "";
        this.formData = { title: "日程安排", time: "09:00", note: "", store_id: "", store_name: "" };
        this.setStorePickerIndex(0);
      }
    },
    closeForm() {
      this.formVisible = false;
      this.editingTaskId = "";
      this.formData = { title: "日程安排", time: "09:00", note: "", store_id: "", store_name: "" };
      this.setStorePickerIndex(0);
    },
    setStorePickerIndex(idx) {
      const safeIdx = idx >= 0 ? idx : 0;
      this.storePickerIndex = safeIdx;
      const option = this.storeOptions[safeIdx];
      if (option && option.value) {
        this.formData.store_id = option.value;
        this.formData.store_name = option.label || "";
      } else {
        this.formData.store_id = "";
        this.formData.store_name = "";
      }
    },
    onStoreChange(e) {
      var _a;
      const idx = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
      this.setStorePickerIndex(idx);
    },
    onTimeChange(e) {
      var _a;
      this.formData.time = ((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || this.formData.time;
    },
    onTaskTouchStart(e, task) {
      if (!task.calendar_only) {
        this.touchState = null;
        return;
      }
      const touch = (e == null ? void 0 : e.changedTouches) && e.changedTouches[0] || (e == null ? void 0 : e.touches) && e.touches[0];
      if (!touch)
        return;
      this.touchState = {
        x: touch.clientX,
        y: touch.clientY,
        taskId: task.id,
        time: Date.now()
      };
    },
    onTaskTouchEnd(e, task) {
      var _a;
      const state = this.touchState;
      this.touchState = null;
      const touch = (e == null ? void 0 : e.changedTouches) && e.changedTouches[0] || (e == null ? void 0 : e.touches) && ((_a = e.touches) == null ? void 0 : _a[0]);
      if (!state || !touch || state.taskId !== task.id)
        return;
      if (!task.calendar_only)
        return;
      const deltaX = touch.clientX - state.x;
      const deltaY = Math.abs(touch.clientY - state.y);
      const duration = Date.now() - state.time;
      if (deltaX > 60 && deltaY < 40 && duration < 800) {
        this.removeTask(task);
      }
    },
    async submitTask() {
      const title = (this.formData.title || "日程安排").trim() || "日程安排";
      const selectedOption = this.storeOptions[this.storePickerIndex];
      const storeId = (selectedOption == null ? void 0 : selectedOption.value) || "";
      if (this.storeOptions.length > 1 && !storeId) {
        common_vendor.index.showToast({ title: "请选择门店", icon: "none" });
        return;
      }
      const payload = {
        title,
        time: this.formData.time || "09:00",
        note: (this.formData.note || "").trim(),
        date: this.selectedDate,
        store_id: storeId,
        store_name: storeId ? (selectedOption == null ? void 0 : selectedOption.label) || "" : ""
      };
      const editing = !!this.editingTaskId;
      try {
        if (editing) {
          await src_services_schedule.updateTask(this.editingTaskId, payload);
        } else {
          await src_services_schedule.createTask(payload);
        }
        this.closeForm();
        await this.refreshTasks();
        common_vendor.index.showToast({ title: editing ? "已更新" : "已创建", icon: "none" });
      } catch (err) {
        common_vendor.index.showToast({ title: (err == null ? void 0 : err.message) || "保存失败", icon: "none" });
      }
    },
    editTask(task) {
      if (!task.calendar_only) {
        common_vendor.index.showToast({ title: "请前往预约模块编辑该记录", icon: "none" });
        return;
      }
      this.openTaskForm(task);
    },
    removeTask(task) {
      if (!task.calendar_only) {
        common_vendor.index.showToast({ title: "仅可删除自建日程", icon: "none" });
        return;
      }
      common_vendor.index.showModal({
        title: "删除任务",
        content: `确定删除「${task.title}」吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await src_services_schedule.deleteTask(task.id);
              await this.refreshTasks();
              common_vendor.index.showToast({ title: "已删除", icon: "none" });
            } catch (err) {
              common_vendor.index.showToast({ title: (err == null ? void 0 : err.message) || "删除失败", icon: "none" });
            }
          }
        }
      });
    }
  },
  computed: {
    selectedDateLabel() {
      if (!this.selectedDate)
        return "任务列表";
      const dateObj = new Date(this.selectedDate.replace(/-/g, "/"));
      const weekTexts = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      const month = `${dateObj.getMonth() + 1}`.toString().padStart(2, "0");
      const day = `${dateObj.getDate()}`.toString().padStart(2, "0");
      return `${month}月${day}日 · ${weekTexts[dateObj.getDay()]}`;
    }
  }
};
if (!Array) {
  const _component_app_card = common_vendor.resolveComponent("app-card");
  _component_app_card();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a;
  return common_vendor.e({
    a: common_vendor.t($data.displayMonth),
    b: common_vendor.t($options.selectedDateLabel),
    c: !$data.dayTasks.length
  }, !$data.dayTasks.length ? {} : {}, {
    d: common_vendor.f($data.dayTasks, (task, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(task.time),
        b: common_vendor.t(task.title),
        c: task.store_name
      }, task.store_name ? {
        d: common_vendor.t(task.store_name)
      } : {}, {
        e: task.note
      }, task.note ? {
        f: common_vendor.t(task.note)
      } : {}, {
        g: task.id,
        h: common_vendor.o(($event) => $options.editTask(task), task.id),
        i: common_vendor.o(($event) => $options.onTaskTouchStart($event, task), task.id),
        j: common_vendor.o(($event) => $options.onTaskTouchEnd($event, task), task.id)
      });
    }),
    e: common_vendor.p({
      padding: "0"
    }),
    f: common_vendor.o(($event) => $options.changeMonth(-1)),
    g: common_vendor.t($data.displayMonth),
    h: common_vendor.o(($event) => $options.changeMonth(1)),
    i: common_vendor.f($data.weekLabels, (day, k0, i0) => {
      return {
        a: common_vendor.t(day),
        b: day
      };
    }),
    j: common_vendor.f($data.calendarDays, (day, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(day.day),
        b: day.isToday
      }, day.isToday ? {} : {}, {
        c: common_vendor.f(day.pills, (pill, idx, i1) => {
          return {
            a: common_vendor.t(pill),
            b: idx
          };
        }),
        d: day.more
      }, day.more ? {
        e: common_vendor.t(day.more)
      } : {}, {
        f: day.date,
        g: !day.inMonth ? 1 : "",
        h: day.isToday ? 1 : "",
        i: day.date === $data.selectedDate ? 1 : "",
        j: day.count ? 1 : "",
        k: common_vendor.o(($event) => $options.selectDate(day), day.date),
        l: common_vendor.o(($event) => $options.quickCreate(day), day.date)
      });
    }),
    k: $data.formVisible
  }, $data.formVisible ? {
    l: common_vendor.t($data.editingTaskId ? "编辑任务" : "创建任务"),
    m: common_vendor.t($data.selectedDate),
    n: common_vendor.t(((_a = $data.storeOptions[$data.storePickerIndex]) == null ? void 0 : _a.label) || "请选择门店"),
    o: $data.storeOptions,
    p: $data.storePickerIndex,
    q: common_vendor.o((...args) => $options.onStoreChange && $options.onStoreChange(...args)),
    r: common_vendor.t($data.formData.time),
    s: $data.formData.time,
    t: common_vendor.o((...args) => $options.onTimeChange && $options.onTimeChange(...args)),
    v: $data.formData.note,
    w: common_vendor.o(($event) => $data.formData.note = $event.detail.value),
    x: common_vendor.o((...args) => $options.closeForm && $options.closeForm(...args)),
    y: common_vendor.t($data.editingTaskId ? "保存" : "创建"),
    z: common_vendor.o((...args) => $options.submitTask && $options.submitTask(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-4978fed5"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/home/index.js.map
