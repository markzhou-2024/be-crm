"use strict";
const common_vendor = require("../../common/vendor.js");
const STORAGE_KEY = "MOCK_HOME_TASKS";
let memoryTasks = [];
function formatDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function seedTasks() {
  const today = /* @__PURE__ */ new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);
  return [
    { id: "seed-1", date: formatDate(today), time: "09:30", title: "晨会：复盘门店销售", note: "带上最新报表", created_at: Date.now() },
    { id: "seed-2", date: formatDate(today), time: "14:00", title: "VIP 客户关怀电话", note: "重点介绍新疗程", created_at: Date.now() },
    { id: "seed-3", date: formatDate(tomorrow), time: "11:00", title: "培训：新员工产品学习", note: "", created_at: Date.now() },
    { id: "seed-4", date: formatDate(dayAfter), time: "16:00", title: "筹备周末沙龙", note: "确认物料与主持人", created_at: Date.now() }
  ];
}
function readTasks() {
  let list = [];
  try {
    if (typeof common_vendor.index !== "undefined" && typeof common_vendor.index.getStorageSync === "function") {
      list = common_vendor.index.getStorageSync(STORAGE_KEY) || [];
    } else if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      list = raw ? JSON.parse(raw) : [];
    } else {
      list = memoryTasks;
    }
  } catch (err) {
    common_vendor.index.__f__("warn", "at src/services/schedule.js:38", "read tasks fallback", err);
    list = memoryTasks;
  }
  if (!list || !list.length) {
    list = seedTasks();
    persistTasks(list);
  }
  return list;
}
function persistTasks(list) {
  memoryTasks = JSON.parse(JSON.stringify(list));
  try {
    if (typeof common_vendor.index !== "undefined" && typeof common_vendor.index.setStorageSync === "function") {
      common_vendor.index.setStorageSync(STORAGE_KEY, list);
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    common_vendor.index.__f__("warn", "at src/services/schedule.js:57", "persist tasks failed", err);
  }
}
function sortTasks(tasks) {
  return tasks.slice().sort((a, b) => {
    if (a.date === b.date) {
      return (a.time || "").localeCompare(b.time || "");
    }
    return a.date.localeCompare(b.date);
  });
}
function generateId() {
  return `task-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}
async function listAllTasks() {
  return sortTasks(readTasks());
}
async function listTasksByDate(date) {
  const list = readTasks().filter((item) => item.date === date);
  return sortTasks(list);
}
async function createTask(payload) {
  const list = readTasks();
  const task = {
    id: generateId(),
    date: payload.date,
    time: payload.time || "09:00",
    title: payload.title,
    note: payload.note || "",
    created_at: Date.now()
  };
  list.push(task);
  persistTasks(list);
  return task;
}
async function updateTask(id, updates) {
  const list = readTasks();
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error("任务不存在");
  }
  list[index] = {
    ...list[index],
    ...updates,
    updated_at: Date.now()
  };
  persistTasks(list);
  return list[index];
}
async function deleteTask(id) {
  const list = readTasks();
  const next = list.filter((item) => item.id !== id);
  persistTasks(next);
  return true;
}
exports.createTask = createTask;
exports.deleteTask = deleteTask;
exports.listAllTasks = listAllTasks;
exports.listTasksByDate = listTasksByDate;
exports.updateTask = updateTask;
//# sourceMappingURL=../../../.sourcemap/mp-weixin/src/services/schedule.js.map
