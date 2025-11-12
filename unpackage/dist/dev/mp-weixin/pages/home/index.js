"use strict";
const common_vendor = require("../../common/vendor.js");
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
const SectionHeader = () => "../../src/components/ui/SectionHeader.js";
const _sfc_main = {
  name: "HomePage",
  components: { AppCard, SectionHeader },
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
      formData: { title: "", time: "09:00", note: "" },
      editingTaskId: ""
    };
  },
  async onShow() {
    await this.refreshTasks();
  },
  methods: {
    formatDate(date) {
      return formatDateValue(date);
    },
    formatMonth(date) {
      return formatMonthValue(date);
    },
    async refreshTasks() {
      this.allTasks = await src_services_schedule.listAllTasks();
      this.buildCalendar();
      await this.loadDayTasks();
    },
    buildCalendar() {
      const [year, month] = this.currentMonth.split("-").map((n) => Number(n));
      const firstDay = new Date(year, month - 1, 1);
      const start = new Date(firstDay);
      const offset = (firstDay.getDay() + 6) % 7;
      start.setDate(firstDay.getDate() - offset);
      const today = this.formatDate(/* @__PURE__ */ new Date());
      const countMap = this.allTasks.reduce((acc, task) => {
        acc[task.date] = (acc[task.date] || 0) + 1;
        return acc;
      }, {});
      const days = [];
      for (let i = 0; i < 42; i += 1) {
        const current = new Date(start);
        current.setDate(start.getDate() + i);
        const dateStr = this.formatDate(current);
        days.push({
          date: dateStr,
          day: current.getDate(),
          inMonth: current.getMonth() === month - 1 && current.getFullYear() === year,
          isToday: dateStr === today,
          count: countMap[dateStr] || 0
        });
      }
      this.displayMonth = `${year}年${String(month).padStart(2, "0")}月`;
      this.calendarDays = days;
      if (this.selectedDate.slice(0, 7) !== this.currentMonth) {
        this.selectedDate = this.formatDate(new Date(year, month - 1, 1));
      }
    },
    async loadDayTasks() {
      this.dayTasks = await src_services_schedule.listTasksByDate(this.selectedDate);
    },
    changeMonth(step) {
      const [year, month] = this.currentMonth.split("-").map((n) => Number(n));
      const next = new Date(year, month - 1 + step, 1);
      this.currentMonth = this.formatMonth(next);
      this.buildCalendar();
      this.loadDayTasks();
    },
    async selectDate(day) {
      const same = this.selectedDate === day.date;
      this.selectedDate = day.date;
      await this.loadDayTasks();
      if (same) {
        this.openTaskForm();
      }
    },
    quickCreate(day) {
      this.selectedDate = day.date;
      this.loadDayTasks();
      this.openTaskForm();
    },
    openTaskForm(task) {
      this.formVisible = true;
      if (task) {
        this.editingTaskId = task.id;
        this.formData = { title: task.title, time: task.time, note: task.note || "" };
      } else {
        this.editingTaskId = "";
        this.formData = { title: "", time: "09:00", note: "" };
      }
    },
    closeForm() {
      this.formVisible = false;
      this.editingTaskId = "";
    },
    onTimeChange(e) {
      var _a;
      this.formData.time = ((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || this.formData.time;
    },
    async submitTask() {
      const title = (this.formData.title || "").trim();
      if (!title) {
        common_vendor.index.showToast({ title: "请输入任务名称", icon: "none" });
        return;
      }
      const payload = {
        title,
        time: this.formData.time || "09:00",
        note: (this.formData.note || "").trim(),
        date: this.selectedDate
      };
      const editing = !!this.editingTaskId;
      if (editing) {
        await src_services_schedule.updateTask(this.editingTaskId, payload);
      } else {
        await src_services_schedule.createTask(payload);
      }
      this.closeForm();
      await this.refreshTasks();
      common_vendor.index.showToast({ title: editing ? "已更新" : "已创建", icon: "none" });
    },
    editTask(task) {
      this.openTaskForm(task);
    },
    removeTask(task) {
      common_vendor.index.showModal({
        title: "删除任务",
        content: `确定删除「${task.title}」吗？`,
        success: async (res) => {
          if (res.confirm) {
            await src_services_schedule.deleteTask(task.id);
            await this.refreshTasks();
            common_vendor.index.showToast({ title: "已删除", icon: "none" });
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
  const _component_section_header = common_vendor.resolveComponent("section-header");
  const _component_app_card = common_vendor.resolveComponent("app-card");
  (_component_section_header + _component_app_card)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.displayMonth),
    b: common_vendor.o(($event) => $options.changeMonth(-1)),
    c: common_vendor.t($data.displayMonth),
    d: common_vendor.o(($event) => $options.changeMonth(1)),
    e: common_vendor.f($data.weekLabels, (day, k0, i0) => {
      return {
        a: common_vendor.t(day),
        b: day
      };
    }),
    f: common_vendor.f($data.calendarDays, (day, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(day.day),
        b: day.count
      }, day.count ? {
        c: common_vendor.t(day.count)
      } : {}, {
        d: day.date,
        e: !day.inMonth ? 1 : "",
        f: day.isToday ? 1 : "",
        g: day.date === $data.selectedDate ? 1 : "",
        h: common_vendor.o(($event) => $options.selectDate(day), day.date),
        i: common_vendor.o(($event) => $options.quickCreate(day), day.date)
      });
    }),
    g: common_vendor.o(($event) => $options.openTaskForm()),
    h: common_vendor.p({
      title: $options.selectedDateLabel,
      linkText: "新建任务"
    }),
    i: !$data.dayTasks.length
  }, !$data.dayTasks.length ? {} : {}, {
    j: common_vendor.f($data.dayTasks, (task, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(task.time),
        b: common_vendor.t(task.title),
        c: task.note
      }, task.note ? {
        d: common_vendor.t(task.note)
      } : {}, {
        e: common_vendor.o(($event) => $options.editTask(task), task.id),
        f: common_vendor.o(($event) => $options.removeTask(task), task.id),
        g: task.id
      });
    }),
    k: common_vendor.p({
      padding: "0"
    }),
    l: $data.formVisible
  }, $data.formVisible ? {
    m: common_vendor.t($data.editingTaskId ? "编辑任务" : "创建任务"),
    n: common_vendor.t($data.selectedDate),
    o: $data.formData.title,
    p: common_vendor.o(($event) => $data.formData.title = $event.detail.value),
    q: common_vendor.t($data.formData.time),
    r: $data.formData.time,
    s: common_vendor.o((...args) => $options.onTimeChange && $options.onTimeChange(...args)),
    t: $data.formData.note,
    v: common_vendor.o(($event) => $data.formData.note = $event.detail.value),
    w: common_vendor.o((...args) => $options.closeForm && $options.closeForm(...args)),
    x: common_vendor.t($data.editingTaskId ? "保存" : "创建"),
    y: common_vendor.o((...args) => $options.submitTask && $options.submitTask(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-4978fed5"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/home/index.js.map
