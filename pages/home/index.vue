<template>
  <view class="page">
    <view class="greet-row">
      <view class="greet">今天也要加油哦 ✨</view>
    </view>

    <view class="tasks-section">
      <text class="tasks-title">{{ selectedDateLabel }}</text>
      <text class="tasks-hint">长按编辑，向左滑确认到店，向右滑删除</text>
      <app-card :padding="'0'">
        <view v-if="!dayTasks.length" class="empty">这天还没有安排，长按日期或再次点击单元格即可创建</view>
        <view
          v-for="task in dayTasks"
          :key="task.id"
          :class="['task-item', { arrived: task.arrived }]"
          @longpress="editTask(task)"
          @touchstart="onTaskTouchStart($event, task)"
          @touchend="onTaskTouchEnd($event, task)"
        >
          <view class="task-main">
            <text class="task-time">{{ task.time }}</text>
            <view class="task-body">
              <text v-if="task.arrived" class="task-arrived">已到店</text>
              <text v-if="task.store_name" class="task-store">{{ task.store_name }}</text>
              <text v-if="task.note" class="task-note">{{ task.note }}</text>
            </view>
          </view>
        </view>
      </app-card>
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
          :class="{ dim: !day.inMonth, today: day.isToday, selected: day.date === selectedDate, busy: day.count }"
          @tap="selectDate(day)"
          @longpress="quickCreate(day)"
        >
          <view class="day-head">
            <text class="day-num">{{ day.day }}</text>
            <text class="pill-today" v-if="day.isToday">今</text>
          </view>
          <view class="pill-group">
            <text class="pill" v-for="(pill, idx) in day.pills" :key="idx">{{ shortPill(pill) }}</text>
            <text class="pill more" v-if="day.more">+{{ day.more }}</text>
          </view>
        </view>
      </view>
      <text class="calendar-hint">点击日期切换，再次点击或长按单元格可新建任务</text>
    </view>

    <view v-if="formVisible" class="form-mask">
      <view class="form-card">
        <view class="form-title">{{ editingTaskId ? '编辑任务' : '创建任务' }}</view>
        <view class="form-field">
          <text class="field-label">日期</text>
          <text class="field-value">{{ selectedDate }}</text>
        </view>
        <view class="form-field">
          <text class="field-label">门店</text>
          <picker
            class="store-picker"
            mode="selector"
            :range="storeOptions"
            range-key="label"
            :value="storePickerIndex"
            @change="onStoreChange"
          >
            <view class="picker-value">{{ storeOptions[storePickerIndex]?.label || '请选择门店' }}</view>
          </picker>
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
import { fetchShopHistory } from '@/api/shops.js'
import { listAllTasks, createTask, updateTask, deleteTask, markTaskArrival } from '@/src/services/schedule.js'

export default {
  name: 'HomePage',
  components: { AppCard },
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
      formData: { title: '日程安排', time: '09:00', note: '', store_id: '', store_name: '' },
      editingTaskId: '',
      storeOptions: [{ label: '请选择门店', value: '' }],
      storePickerIndex: 0,
      touchState: null,
      calendarRange: { start: 0, end: 0 }
    }
  },
  async onShow () {
    await this.ensureStores()
    await this.refreshTasks()
  },
  methods: {
    formatPillLabel (text) {
      const source = (text || '').trim() || '待办'
      const glyphs = Array.from(source)
      return glyphs.slice(0, 3).join('')
    },
    formatDate (date) {
      return formatDateValue(date)
    },
    formatMonth (date) {
      return formatMonthValue(date)
    },
    calcCalendarRange () {
      const [year, month] = this.currentMonth.split('-').map(n => Number(n))
      const firstDay = new Date(year, month - 1, 1)
      const start = new Date(firstDay)
      const offset = (firstDay.getDay() + 6) % 7
      start.setDate(firstDay.getDate() - offset)
      const end = new Date(start)
      end.setDate(start.getDate() + 42)
      return { start, end }
    },
    async refreshTasks () {
      const range = this.calcCalendarRange()
      this.calendarRange = { start: range.start.getTime(), end: range.end.getTime() }
      try {
        this.allTasks = await listAllTasks({ start: this.calendarRange.start, end: this.calendarRange.end })
      } catch (err) {
        console.log('load calendar failed', err)
        this.allTasks = []
        const msg = err?.code === 401 || err?.errCode === 401
          ? '请登录后查看日程'
          : (err?.message || '加载日历失败')
        uni.showToast({ title: msg, icon: 'none' })
      }
      this.buildCalendar(range)
      this.loadDayTasks()
    },
    async ensureStores () {
      if (this.storeOptions.length > 1) return
      try {
        const list = await fetchShopHistory()
        const mapped = list.map(item => ({
          label: item.store_name || item.name,
          value: item._id || item.id
        }))
        this.storeOptions = [{ label: '请选择门店', value: '' }, ...mapped]
      } catch (err) {
        console.log('fetch shops failed', err)
        this.storeOptions = [{ label: '请选择门店', value: '' }]
      }
    },
    buildCalendar (range) {
      const ref = range || this.calcCalendarRange()
      const start = new Date(ref.start)
      const [year, month] = this.currentMonth.split('-').map(n => Number(n))
      const today = this.formatDate(new Date())
      const taskMap = this.allTasks.reduce((acc, task) => {
        const list = acc[task.date] || []
        list.push(task)
        acc[task.date] = list
        return acc
      }, {})
      const days = []
      for (let i = 0; i < 42; i += 1) {
        const current = new Date(start)
        current.setDate(start.getDate() + i)
        const dateStr = this.formatDate(current)
        const dayTasks = taskMap[dateStr] || []
        const pills = dayTasks.slice(0, 2).map(item => this.formatPillLabel(item.store_name || item.title || '待办'))
        days.push({
          date: dateStr,
          day: current.getDate(),
          inMonth: current.getMonth() === (month - 1) && current.getFullYear() === year,
          isToday: dateStr === today,
          count: dayTasks.length,
          pills,
          more: Math.max(dayTasks.length - pills.length, 0)
        })
      }
      this.displayMonth = `${year}年${String(month).padStart(2, '0')}月`
      this.calendarDays = days
      if (this.selectedDate.slice(0, 7) !== this.currentMonth) {
        this.selectedDate = this.formatDate(new Date(year, month - 1, 1))
      }
    },
    loadDayTasks () {
      const list = this.allTasks
        .filter(item => item.date === this.selectedDate)
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
      this.dayTasks = list
    },
    async changeMonth (step) {
      const [year, month] = this.currentMonth.split('-').map(n => Number(n))
      const next = new Date(year, month - 1 + step, 1)
      this.currentMonth = this.formatMonth(next)
      await this.refreshTasks()
    },
    async selectDate (day) {
      const same = this.selectedDate === day.date
      this.selectedDate = day.date
      this.loadDayTasks()
      if (same) {
        await this.openTaskForm()
      }
    },
    async quickCreate (day) {
      this.selectedDate = day.date
      this.loadDayTasks()
      await this.openTaskForm()
    },
    async openTaskForm (task) {
      await this.ensureStores()
      this.formVisible = true
      if (task) {
        this.editingTaskId = task.id
        this.formData = {
          title: task.title || '日程安排',
          time: task.time,
          note: task.note || '',
          store_id: task.store_id || '',
          store_name: task.store_name || ''
        }
        let idx = this.storeOptions.findIndex(item => item.value === task.store_id)
        if (task.store_id && idx === -1) {
          this.storeOptions = [...this.storeOptions, { label: task.store_name || '已下线门店', value: task.store_id }]
          idx = this.storeOptions.length - 1
        }
        this.setStorePickerIndex(idx >= 0 ? idx : 0)
        if (!task.store_id) {
          this.formData.store_id = ''
          this.formData.store_name = ''
        }
      } else {
        this.editingTaskId = ''
        this.formData = { title: '日程安排', time: '09:00', note: '', store_id: '', store_name: '' }
        this.setStorePickerIndex(0)
      }
    },
    closeForm () {
      this.formVisible = false
      this.editingTaskId = ''
      this.formData = { title: '日程安排', time: '09:00', note: '', store_id: '', store_name: '' }
      this.setStorePickerIndex(0)
    },
    setStorePickerIndex (idx) {
      const safeIdx = idx >= 0 ? idx : 0
      this.storePickerIndex = safeIdx
      const option = this.storeOptions[safeIdx]
      if (option && option.value) {
        this.formData.store_id = option.value
        this.formData.store_name = option.label || ''
      } else {
        this.formData.store_id = ''
        this.formData.store_name = ''
      }
    },
    onStoreChange (e) {
      const idx = Number(e?.detail?.value || 0)
      this.setStorePickerIndex(idx)
    },
    onTimeChange (e) {
      this.formData.time = e?.detail?.value || this.formData.time
    },
    onTaskTouchStart (e, task) {
      if (!task.calendar_only) {
        this.touchState = null
        return
      }
      const touch = (e?.changedTouches && e.changedTouches[0]) || (e?.touches && e.touches[0])
      if (!touch) return
      this.touchState = {
        x: touch.clientX,
        y: touch.clientY,
        taskId: task.id,
        time: Date.now()
      }
    },
    onTaskTouchEnd (e, task) {
      const state = this.touchState
      this.touchState = null
      const touch = (e?.changedTouches && e.changedTouches[0]) || (e?.touches && e.touches?.[0])
      if (!state || !touch || state.taskId !== task.id) return
      if (!task.calendar_only) return
      const deltaX = touch.clientX - state.x
      const deltaY = Math.abs(touch.clientY - state.y)
      const duration = Date.now() - state.time
      if (deltaX < -60 && deltaY < 40 && duration < 800) {
        this.confirmArrival(task)
        return
      }
      if (deltaX > 60 && deltaY < 40 && duration < 800) {
        this.removeTask(task)
      }
    },
    async submitTask () {
      const title = (this.formData.title || '日程安排').trim() || '日程安排'
      const selectedOption = this.storeOptions[this.storePickerIndex]
      const storeId = selectedOption?.value || ''
      if (this.storeOptions.length > 1 && !storeId) {
        uni.showToast({ title: '请选择门店', icon: 'none' })
        return
      }
      const payload = {
        title,
        time: this.formData.time || '09:00',
        note: (this.formData.note || '').trim(),
        date: this.selectedDate,
        store_id: storeId,
        store_name: storeId ? (selectedOption?.label || '') : ''
      }
      const editing = !!this.editingTaskId
      try {
        if (editing) {
          await updateTask(this.editingTaskId, payload)
        } else {
          await createTask(payload)
        }
        this.closeForm()
        await this.refreshTasks()
        uni.showToast({ title: editing ? '已更新' : '已创建', icon: 'none' })
      } catch (err) {
        uni.showToast({ title: err?.message || '保存失败', icon: 'none' })
      }
    },
    editTask (task) {
      if (!task.calendar_only) {
        uni.showToast({ title: '请前往预约模块编辑该记录', icon: 'none' })
        return
      }
      this.openTaskForm(task)
    },
    removeTask (task) {
      if (!task.calendar_only) {
        uni.showToast({ title: '仅可删除自建日程', icon: 'none' })
        return
      }
      uni.showModal({
        title: '删除任务',
        content: `确定删除「${task.title}」吗？`,
        success: async res => {
          if (res.confirm) {
            try {
              await deleteTask(task.id)
              await this.refreshTasks()
              uni.showToast({ title: '已删除', icon: 'none' })
            } catch (err) {
              uni.showToast({ title: err?.message || '删除失败', icon: 'none' })
            }
          }
        }
      })
    },
    confirmArrival (task) {
      if (!task.calendar_only) {
        uni.showToast({ title: '仅支持记录自建任务', icon: 'none' })
        return
      }
      if (task.arrived) {
        uni.showToast({ title: '已记录到店', icon: 'none' })
        return
      }
      const label = (task.store_name || task.title || task.note || task.time || '本次任务').trim()
      uni.showModal({
        title: '确认到店',
        content: `确认“${label}”已到店服务吗？`,
        success: async res => {
          if (res.confirm) {
            try {
              await markTaskArrival(task.id, true)
              await this.refreshTasks()
              uni.showToast({ title: '已记录到店', icon: 'none' })
            } catch (err) {
              uni.showToast({ title: err?.message || '操作失败', icon: 'none' })
            }
          }
        }
      })
    },
    shortPill(text) {
	  if (!text) return ''
	    const str = String(text)
	    // 最多保留 3 个字
	  return str.length > 3 ? str.slice(0, 3) : str
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
.calendar-card { background:#fff; border-radius:22px; padding:16px; box-shadow:0 8px 20px rgba(0,0,0,0.05); margin-bottom:16px; max-width:720rpx; margin-left:auto; margin-right:auto; }
.calendar-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
.month-title { font-size:20px; font-weight:600; color:#111; }
.nav-btn { width:32px; height:32px; border-radius:16px; background:#f0f3ff; border:none; font-size:18px; line-height:32px; text-align:center; color:#5b7eff; }
.nav-btn::after,
.task-ops button::after,
.form-actions button::after { border:none; }
.week-row { display:grid; grid-template-columns:repeat(7,1fr); text-align:center; font-size:13px; color:#99a0b3; padding:10px 0; max-width:720rpx; margin:0 auto; }
.day-grid { display:grid; grid-template-columns:repeat(7,102rpx); justify-content:center; border:1px solid #eef0f6; border-bottom:none; border-right:none; margin:0 auto; }
.day-cell { width:102rpx; min-height:60px; padding:8px 6px; position:relative; display:flex; flex-direction:column; border-right:1px solid #eef0f6; border-bottom:1px solid #eef0f6; background:#fff; box-sizing:border-box; }
.day-cell:nth-child(7n) { border-right:none; }
.day-cell:nth-last-child(-n+7) { border-bottom:none; }
.day-cell.dim .day-num { color:#c0c4d4; }
.day-cell.today { background:rgba(91,126,255,0.08); }
.day-cell.selected { box-shadow:inset 0 0 0 2px rgba(91,126,255,0.45); border-radius:14px; }
.day-cell.busy:not(.selected) { background:#f9fbff; }
.day-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
.day-num { font-size:16px; font-weight:600; color:#1c1c1e; }
.pill-today { font-size:12px; color:#5b7eff; border:1px solid rgba(91,126,255,0.3); border-radius:10px; padding:0 6px; line-height:18px; }
.pill-group {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.pill {
  width: 90rpx;              // 固定宽度，比 102rpx 略小一点
  box-sizing: border-box;
  padding: 4rpx 6rpx;
  text-align: center;

  font-size: 10px;           // 比之前 11px 略缩小一点
  line-height: 20rpx;

  color: #fff;
  background: #5b7eff;
  border-radius: 999rpx;

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;   // 保险起见，万一你以后想显示 4 字以上
}
.pill.more { background:#ff9f43; }
.calendar-hint { display:block; margin-top:10px; font-size:12px; color:#8e8e93; text-align:center; }
.tasks-section { margin-bottom:24px; }
.tasks-title { font-size:17px; font-weight:600; color:#111; margin:0 4px 4px; display:block; }
.tasks-hint { font-size:12px; color:#99a0b3; margin:4px 4px 8px; display:block; text-align:right; }
.empty { text-align:center; color:#6F6F73; font-size:13px; padding:22px 0; }
.task-item { display:flex; flex-direction:column; padding:10px 12px; border-bottom:1px solid #f0f0f0; min-height:18px;height: auto; transition:background-color 0.2s; }
.task-item:last-child { border-bottom:none; }
.task-item.arrived { background:#f6fff7; }
.task-item.arrived .task-time { color:#56b06c; }
.task-main { display:flex; gap:12px; align-items:flex-start; }
.task-time { font-size:16px; font-weight:600; color:#caa265; min-width:60px; }
.task-body { flex:1; }
.task-title { font-size:15px; color:#1c1c1e; font-weight:500; }
.task-store { font-size:13px; color:#caa265; margin-top:4px; display:block; }
.task-note { font-size:13px; color:#6f6f73; margin-top:4px; display:block; }
.task-arrived { display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; background:#e3f5eb; color:#1b9a5d; font-size:12px; font-weight:500; margin-bottom:4px; }
.form-mask { position:fixed; left:0; top:0; right:0; bottom:0; background:rgba(0,0,0,0.45); display:flex; align-items:flex-end; padding:16px; z-index:99; }
.form-card { width:100%; background:#fff; border-radius:24px 24px 12px 12px; padding:20px; box-shadow:0 -8px 24px rgba(0,0,0,0.1); }
.form-title { font-size:16px; font-weight:600; margin-bottom:14px; text-align:center; color:#111; }
.form-field { margin-bottom:14px; }
.form-field:last-of-type { margin-bottom:18px; }
.field-label { font-size:13px; color:#6f6f73; margin-bottom:4px; display:block; }
.field-value { font-size:15px; color:#1c1c1e; }
.field-input, .field-textarea { display:block; width:100%; border:1px solid #dedfe3; border-radius:16px; padding:12px; font-size:14px; box-sizing:border-box; background:#fff; color:#1c1c1e; }
.field-input { height:44px; line-height:20px; }
.field-input::placeholder { color:#a4a6ad; }
.field-textarea { min-height:80px; line-height:1.4; }
.picker-value { width:100%; border:1px solid #dedfe3; border-radius:16px; padding:12px; font-size:14px; color:#1c1c1e; background:#fff; }
.form-actions { display:flex; gap:12px; }
.form-actions button { flex:1; border:none; border-radius:22px; padding:12px 0; font-size:15px; }
.form-actions .ghost { background:#f5f5f5; color:#1c1c1e; }
.form-actions .primary { background:#caa265; color:#fff; }
</style>
