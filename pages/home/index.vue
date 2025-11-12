<template>
  <view class="page">
    <view class="greet-row">
      <view class="greet">今天也要加油哦 ✨</view>
      <view class="month-chip">{{ displayMonth }}</view>
    </view>

    <view class="calendar-card">
      <view class="calendar-top">
        <button class="nav-btn" @tap="changeMonth(-1)">‹</button>
        <view class="month-title">{{ displayMonth }}</view>
        <button class="nav-btn" @tap="changeMonth(1)">›</button>
      </view>
      <view class="week-row">
        <text v-for="day in weekLabels" :key="day">{{ day }}</text>
      </view>
      <view class="day-grid">
        <view
          v-for="day in calendarDays"
          :key="day.date"
          class="day-cell"
          :class="{ dim: !day.inMonth, today: day.isToday, selected: day.date === selectedDate }"
          @tap="selectDate(day)"
          @longpress="quickCreate(day)"
        >
          <text class="day-num">{{ day.day }}</text>
          <view class="task-count" v-if="day.count">{{ day.count }}</view>
        </view>
      </view>
      <text class="calendar-hint">点击日期切换，再次点击或长按单元格可新建任务</text>
    </view>

    <view class="tasks-section">
      <section-header :title="selectedDateLabel" linkText="新建任务" @more="openTaskForm()" />
      <app-card :padding="'0'">
        <view v-if="!dayTasks.length" class="empty">这天还没有安排，点击「新建任务」开始规划吧</view>
        <view v-for="task in dayTasks" :key="task.id" class="task-item">
          <view class="task-main">
            <text class="task-time">{{ task.time }}</text>
            <view class="task-body">
              <text class="task-title">{{ task.title }}</text>
              <text v-if="task.note" class="task-note">{{ task.note }}</text>
            </view>
          </view>
          <view class="task-ops">
            <button class="ghost" @tap="editTask(task)">编辑</button>
            <button class="danger" @tap="removeTask(task)">删除</button>
          </view>
        </view>
      </app-card>
    </view>

    <view v-if="formVisible" class="form-mask">
      <view class="form-card">
        <view class="form-title">{{ editingTaskId ? '编辑任务' : '创建任务' }}</view>
        <view class="form-field">
          <text class="field-label">日期</text>
          <text class="field-value">{{ selectedDate }}</text>
        </view>
        <view class="form-field">
          <text class="field-label">标题</text>
          <input class="field-input" type="text" v-model="formData.title" placeholder="请输入任务名称" />
        </view>
        <view class="form-field">
          <text class="field-label">时间</text>
          <picker mode="time" :value="formData.time" @change="onTimeChange">
            <view class="picker-value">{{ formData.time }}</view>
          </picker>
        </view>
        <view class="form-field">
          <text class="field-label">备注</text>
          <textarea class="field-textarea" v-model="formData.note" placeholder="可填写提醒内容"></textarea>
        </view>
        <view class="form-actions">
          <button class="ghost" @tap="closeForm">取消</button>
          <button class="primary" @tap="submitTask">{{ editingTaskId ? '保存' : '创建' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
const pad = (value) => `${value}`.padStart(2, '0')
function formatDateValue (date) {
  const d = new Date(date)
  const y = d.getFullYear()
  return `${y}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function formatMonthValue (date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

import AppCard from '@/src/components/ui/AppCard.vue'
import SectionHeader from '@/src/components/ui/SectionHeader.vue'
import { listAllTasks, listTasksByDate, createTask, updateTask, deleteTask } from '@/src/services/schedule.js'

export default {
  name: 'HomePage',
  components: { AppCard, SectionHeader },
  data () {
    const today = formatDateValue(new Date())
    return {
      weekLabels: ['一', '二', '三', '四', '五', '六', '日'],
      currentMonth: formatMonthValue(new Date()),
      displayMonth: '',
      calendarDays: [],
      selectedDate: today,
      dayTasks: [],
      allTasks: [],
      formVisible: false,
      formData: { title: '', time: '09:00', note: '' },
      editingTaskId: ''
    }
  },
  async onShow () {
    await this.refreshTasks()
  },
  methods: {
    formatDate (date) {
      return formatDateValue(date)
    },
    formatMonth (date) {
      return formatMonthValue(date)
    },
    async refreshTasks () {
      this.allTasks = await listAllTasks()
      this.buildCalendar()
      await this.loadDayTasks()
    },
    buildCalendar () {
      const [year, month] = this.currentMonth.split('-').map(n => Number(n))
      const firstDay = new Date(year, month - 1, 1)
      const start = new Date(firstDay)
      const offset = (firstDay.getDay() + 6) % 7
      start.setDate(firstDay.getDate() - offset)
      const today = this.formatDate(new Date())
      const countMap = this.allTasks.reduce((acc, task) => {
        acc[task.date] = (acc[task.date] || 0) + 1
        return acc
      }, {})
      const days = []
      for (let i = 0; i < 42; i += 1) {
        const current = new Date(start)
        current.setDate(start.getDate() + i)
        const dateStr = this.formatDate(current)
        days.push({
          date: dateStr,
          day: current.getDate(),
          inMonth: current.getMonth() === (month - 1) && current.getFullYear() === year,
          isToday: dateStr === today,
          count: countMap[dateStr] || 0
        })
      }
      this.displayMonth = `${year}年${String(month).padStart(2, '0')}月`
      this.calendarDays = days
      if (this.selectedDate.slice(0, 7) !== this.currentMonth) {
        this.selectedDate = this.formatDate(new Date(year, month - 1, 1))
      }
    },
    async loadDayTasks () {
      this.dayTasks = await listTasksByDate(this.selectedDate)
    },
    changeMonth (step) {
      const [year, month] = this.currentMonth.split('-').map(n => Number(n))
      const next = new Date(year, month - 1 + step, 1)
      this.currentMonth = this.formatMonth(next)
      this.buildCalendar()
      this.loadDayTasks()
    },
    async selectDate (day) {
      const same = this.selectedDate === day.date
      this.selectedDate = day.date
      await this.loadDayTasks()
      if (same) {
        this.openTaskForm()
      }
    },
    quickCreate (day) {
      this.selectedDate = day.date
      this.loadDayTasks()
      this.openTaskForm()
    },
    openTaskForm (task) {
      this.formVisible = true
      if (task) {
        this.editingTaskId = task.id
        this.formData = { title: task.title, time: task.time, note: task.note || '' }
      } else {
        this.editingTaskId = ''
        this.formData = { title: '', time: '09:00', note: '' }
      }
    },
    closeForm () {
      this.formVisible = false
      this.editingTaskId = ''
    },
    onTimeChange (e) {
      this.formData.time = e?.detail?.value || this.formData.time
    },
    async submitTask () {
      const title = (this.formData.title || '').trim()
      if (!title) {
        uni.showToast({ title: '请输入任务名称', icon: 'none' })
        return
      }
      const payload = {
        title,
        time: this.formData.time || '09:00',
        note: (this.formData.note || '').trim(),
        date: this.selectedDate
      }
      const editing = !!this.editingTaskId
      if (editing) {
        await updateTask(this.editingTaskId, payload)
      } else {
        await createTask(payload)
      }
      this.closeForm()
      await this.refreshTasks()
      uni.showToast({ title: editing ? '已更新' : '已创建', icon: 'none' })
    },
    editTask (task) {
      this.openTaskForm(task)
    },
    removeTask (task) {
      uni.showModal({
        title: '删除任务',
        content: `确定删除「${task.title}」吗？`,
        success: async res => {
          if (res.confirm) {
            await deleteTask(task.id)
            await this.refreshTasks()
            uni.showToast({ title: '已删除', icon: 'none' })
          }
        }
      })
    }
  },
  computed: {
    selectedDateLabel () {
      if (!this.selectedDate) return '任务列表'
      const dateObj = new Date(this.selectedDate.replace(/-/g, '/'))
      const weekTexts = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const month = `${dateObj.getMonth() + 1}`.toString().padStart(2, '0')
      const day = `${dateObj.getDate()}`.toString().padStart(2, '0')
      return `${month}月${day}日 · ${weekTexts[dateObj.getDay()]}`
    }
  }
}
</script>

<style scoped lang="scss">
.page { min-height:100vh; background:#F7F7F7; padding:16px; box-sizing:border-box; }
.greet-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.greet { color:#111; font-weight:600; font-size:18px; }
.month-chip { font-size:13px; color:#6f6f73; padding:4px 10px; border-radius:16px; background:#fff; box-shadow:0 4px 12px rgba(0,0,0,0.05); }
.calendar-card { background:#fff; border-radius:28px; padding:18px; box-shadow:0 12px 30px rgba(0,0,0,0.06); margin-bottom:20px; }
.calendar-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.month-title { font-size:18px; font-weight:600; color:#111; }
.nav-btn { width:36px; height:36px; border-radius:18px; background:#f7f7f7; border:none; font-size:20px; line-height:36px; text-align:center; color:#caa265; box-shadow:0 6px 16px rgba(0,0,0,0.08); }
.nav-btn::after,
.task-ops button::after,
.form-actions button::after { border:none; }
.week-row { display:grid; grid-template-columns:repeat(7,1fr); text-align:center; font-size:12px; color:#8e8e93; margin-bottom:8px; }
.day-grid { display:grid; grid-template-columns:repeat(7,1fr); grid-gap:12px 6px; }
.day-cell { min-height:56px; border-radius:18px; padding:6px; position:relative; display:flex; flex-direction:column; align-items:flex-start; justify-content:flex-start; }
.day-cell.dim .day-num { color:#c0c0c8; }
.day-cell.today { border:1px dashed #caa265; }
.day-cell.selected { border:1px solid #caa265; background:rgba(202,162,101,0.08); }
.day-num { font-size:15px; font-weight:600; color:#1c1c1e; }
.task-count { position:absolute; right:6px; bottom:6px; min-width:20px; height:20px; border-radius:10px; font-size:12px; line-height:20px; text-align:center; background:#caa265; color:#fff; padding:0 6px; }
.calendar-hint { display:block; margin-top:10px; font-size:12px; color:#8e8e93; text-align:center; }
.tasks-section { margin-bottom:24px; }
.empty { text-align:center; color:#6F6F73; font-size:13px; padding:22px 0; }
.task-item { display:flex; flex-direction:column; padding:14px 16px; border-bottom:1px solid #f0f0f0; }
.task-item:last-child { border-bottom:none; }
.task-main { display:flex; gap:12px; align-items:flex-start; }
.task-time { font-size:16px; font-weight:600; color:#caa265; min-width:60px; }
.task-body { flex:1; }
.task-title { font-size:15px; color:#1c1c1e; font-weight:500; }
.task-note { font-size:13px; color:#6f6f73; margin-top:4px; display:block; }
.task-ops { display:flex; justify-content:flex-end; gap:8px; margin-top:10px; }
.task-ops button { font-size:13px; padding:6px 14px; border-radius:16px; border:none; }
.task-ops .ghost { background:#f5f5f5; color:#1c1c1e; }
.task-ops .danger { background:#ffe8e6; color:#e66; }
.form-mask { position:fixed; left:0; top:0; right:0; bottom:0; background:rgba(0,0,0,0.45); display:flex; align-items:flex-end; padding:16px; z-index:99; }
.form-card { width:100%; background:#fff; border-radius:24px 24px 12px 12px; padding:20px; box-shadow:0 -8px 24px rgba(0,0,0,0.1); }
.form-title { font-size:16px; font-weight:600; margin-bottom:14px; text-align:center; color:#111; }
.form-field { margin-bottom:14px; }
.form-field:last-of-type { margin-bottom:18px; }
.field-label { font-size:13px; color:#6f6f73; margin-bottom:4px; display:block; }
.field-value { font-size:15px; color:#1c1c1e; }
.field-input, .field-textarea { width:100%; border:1px solid #ededed; border-radius:16px; padding:12px; font-size:14px; box-sizing:border-box; background:#fafafa; }
.field-textarea { min-height:80px; }
.picker-value { width:100%; border:1px solid #ededed; border-radius:16px; padding:12px; font-size:14px; color:#1c1c1e; background:#fafafa; }
.form-actions { display:flex; gap:12px; }
.form-actions button { flex:1; border:none; border-radius:22px; padding:12px 0; font-size:15px; }
.form-actions .ghost { background:#f5f5f5; color:#1c1c1e; }
.form-actions .primary { background:#caa265; color:#fff; }
</style>
