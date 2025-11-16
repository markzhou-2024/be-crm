<template>
  <view class="page">
    <view class="top-bar">
      <picker class="store-picker" mode="selector" :range="storeOptions" range-key="label" :value="storeIndex" @change="onStoreChange">
        <view class="picker-trigger">
          {{ currentStoreLabel }}
        </view>
      </picker>
      <view class="month-switch">
        <button class="nav-btn" @tap="changeMonth(-1)">‹</button>
        <text class="month-label">{{ displayMonth }}</text>
        <button class="nav-btn" @tap="changeMonth(1)">›</button>
      </view>
    </view>

    <view class="calendar">
      <view class="week-header">
        <text v-for="day in weekLabels" :key="day">{{ day }}</text>
      </view>
      <view class="day-grid">
        <view
          v-for="day in calendarDays"
          :key="day.date"
          class="day-cell"
          :class="{ dim: !day.inMonth, today: day.isToday }"
          @tap="openDayDetail(day)"
        >
          <text class="day-text">{{ day.day }}</text>
          <view class="badge booking" v-if="day.booking_count">{{ day.booking_count }}</view>
          <view class="badge consume" v-if="day.consume_count">{{ day.consume_count }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
// @ts-nocheck
import { fetchMonthCalendarSummary } from '@/api/analytics.js'
import { fetchShops } from '@/api/shops.js'

export default {
  data() {
    return {
      storeOptions: [{ label: '全部门店', value: '' }],
      storeIndex: 0,
      currentMonth: this.formatMonth(new Date()),
      displayMonth: '',
      calendarDays: [],
      weekLabels: ['一', '二', '三', '四', '五', '六', '日']
    }
  },
  async onShow() {
    await this.ensureStores()
    await this.loadCalendar()
  },
  methods: {
    formatMonth(date) {
      const d = new Date(date)
      const y = d.getFullYear()
      const m = `${d.getMonth() + 1}`.padStart(2, '0')
      return `${y}-${m}`
    },
    async ensureStores() {
      if (this.storeOptions.length > 1) return
      try {
        const list = await fetchShops()
        const mapped = list.map(item => ({ label: item.name, value: item._id || item.id }))
        this.storeOptions = [{ label: '全部门店', value: '' }, ...mapped]
      } catch (err) {
        console.log('fetch shops failed', err)
      }
    },
    async loadCalendar() {
      try {
        const store = this.storeOptions[this.storeIndex]?.value || ''
        const res = await fetchMonthCalendarSummary({ month: this.currentMonth, store_id: store || undefined })
        const days = res?.days || []
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        this.displayMonth = res?.month || this.currentMonth
        const monthKey = this.displayMonth || this.currentMonth
        const [targetYear, targetMonth] = monthKey.split('-').map(n => Number(n))
        this.calendarDays = days.map(day => {
          const dateObj = new Date(day.date.replace(/-/g, '/'))
          const inMonth = dateObj.getFullYear() === targetYear && (dateObj.getMonth() + 1) === targetMonth
          return {
            ...day,
            day: `${dateObj.getDate()}`,
            inMonth,
            isToday: dateObj.getTime() === today.getTime()
          }
        })
      } catch (err) {
        uni.showToast({ title: err?.message || '加载失败', icon: 'none' })
      }
    },
    changeMonth(step) {
      const [year, month] = this.currentMonth.split('-').map(n => Number(n))
      const next = new Date(year, month - 1 + step, 1)
      this.currentMonth = this.formatMonth(next)
      this.loadCalendar()
    },
    onStoreChange(e) {
      this.storeIndex = Number(e?.detail?.value || 0)
      this.loadCalendar()
    },
    openDayDetail(day) {
      uni.showModal({
        title: day.date,
        content: `预约：${day.booking_count} 条\n消耗：${day.consume_count} 次`
      })
    }
  },
  computed: {
    currentStoreLabel() {
      return this.storeOptions[this.storeIndex]?.label || '全部门店'
    }
  }
}
</script>

<style scoped>
.page { min-height:100vh; background:#f6f7f9; padding:16px; box-sizing:border-box; }
.top-bar { display:flex; flex-direction:column; gap:12px; margin-bottom:12px; }
.store-picker .picker-trigger { background:#fff; border-radius:18px; padding:12px 14px; box-shadow:0 6px 16px rgba(0,0,0,0.05); color:#333; }
.month-switch { display:flex; align-items:center; justify-content:center; gap:12px; }
.nav-btn { width:36px; height:36px; border-radius:18px; background:#fff; box-shadow:0 4px 12px rgba(0,0,0,0.08); text-align:center; line-height:36px; font-size:20px; color:#caa265; }
.month-label { font-size:18px; font-weight:600; color:#1c1c1e; }
.calendar { background:#fff; border-radius:24px; padding:16px; box-shadow:0 12px 30px rgba(0,0,0,0.05); }
.week-header { display:grid; grid-template-columns:repeat(7,1fr); text-align:center; font-size:12px; color:#8e8e93; margin-bottom:10px; }
.day-grid { display:grid; grid-template-columns:repeat(7,1fr); grid-row-gap:14px; grid-column-gap:6px; }
.day-cell { min-height:58px; border-radius:16px; padding:6px; position:relative; display:flex; flex-direction:column; align-items:flex-start; }
.day-cell.dim .day-text { color:#c0c0c8; }
.day-cell.today { border:1px solid #caa265; }
.day-text { font-size:14px; font-weight:600; color:#1c1c1e; }
.badge { position:absolute; right:6px; width:20px; height:20px; border-radius:10px; font-size:11px; color:#fff; text-align:center; line-height:20px; }
.badge.booking { top:6px; background:#caa265; }
.badge.consume { bottom:6px; background:#20c997; }
</style>
