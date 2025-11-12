<template>
  <view class="page">
    <view class="header">
      <text class="title">全部预约</text>
      <view class="filters">
        <view
          class="filter-pill"
          v-for="opt in statusOptions"
          :key="opt.value"
          :class="{ active: statusFilter === opt.value }"
          @tap="setStatus(opt.value)"
        >
          {{ opt.label }}
        </view>
      </view>
    </view>

    <scroll-view
      class="content"
      scroll-y
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="handleRefresh"
    >
      <view v-if="loading" class="placeholder">加载中...</view>
      <view v-else-if="!groupedBookings.length" class="placeholder">暂无预约记录</view>
      <view v-else class="group-list">
        <view class="group" v-for="group in groupedBookings" :key="group.date">
          <view class="group-title">{{ formatGroupDate(group.date) }}</view>
          <view class="booking-card" v-for="item in group.items" :key="item._id || item.id" @tap="goCustomerDetail(item)">
            <view class="time">
              <text class="time-main">{{ formatTime(item.start_ts) }}</text>
              <text class="time-sub">{{ formatTime(item.end_ts) }}</text>
            </view>
            <view class="info">
              <view class="info-title">{{ item.customer_name || '客户' }} · {{ item.service_name || '项目' }}</view>
              <view class="info-sub">{{ item.store_name || '未指定门店' }}<text v-if="item.staff_name"> · {{ item.staff_name }}</text></view>
            </view>
            <view class="status-pill" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
// @ts-nocheck
import { listTodayBookings } from '@/api/bookings.js'

export default {
  data() {
    return {
      loading: false,
      rawBookings: [],
      statusFilter: 'all',
      statusOptions: [
        { label: '全部', value: 'all' },
        { label: '待到店', value: 'scheduled' },
        { label: '已完成', value: 'completed' },
        { label: '已取消', value: 'canceled' }
      ],
      isRefreshing: false
    }
  },
  onShow() {
    this.fetchBookings()
  },
  computed: {
    groupedBookings() {
      const list = this.filteredBookings()
      const map = {}
      list.forEach(item => {
        const dateKey = this.formatDateKey(item.start_ts)
        map[dateKey] = map[dateKey] || []
        map[dateKey].push(item)
      })
      return Object.keys(map)
        .sort((a, b) => (a > b ? -1 : 1))
        .map(key => ({
          date: key,
          items: map[key].sort((a, b) => Number(a.start_ts || 0) - Number(b.start_ts || 0))
        }))
    }
  },
  methods: {
    filteredBookings() {
      if (this.statusFilter === 'all') return this.rawBookings
      return this.rawBookings.filter(item => item.status === this.statusFilter)
    },
    async fetchBookings(options = {}) {
      const showLoading = !this.rawBookings.length && !options.silent
      if (showLoading) {
        this.loading = true
      }
      try {
        const list = await listTodayBookings()
        this.rawBookings = (list || []).map(item => ({
          ...item,
          start_ts: Number(item.start_ts || item.startTs || 0),
          end_ts: Number(item.end_ts || item.endTs || 0)
        }))
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '预约加载失败', icon: 'none' })
      } finally {
        if (showLoading) {
          this.loading = false
        }
      }
    },
    async handleRefresh() {
      if (this.isRefreshing) return
      this.isRefreshing = true
      await this.fetchBookings({ silent: true })
      setTimeout(() => {
        this.isRefreshing = false
      }, 200)
    },
    setStatus(value) {
      this.statusFilter = value
    },
    formatDateKey(ts) {
      const date = new Date(Number(ts))
      if (Number.isNaN(date.getTime())) return '未知日期'
      const m = `${date.getMonth() + 1}`.padStart(2, '0')
      const d = `${date.getDate()}`.padStart(2, '0')
      return `${date.getFullYear()}-${m}-${d}`
    },
    formatGroupDate(key) {
      if (key === '未知日期') return key
      const [y, m, d] = key.split('-')
      return `${Number(m)}月${Number(d)}日 · ${y}`
    },
    formatTime(ts) {
      if (!ts) return '--:--'
      const date = new Date(Number(ts))
      if (Number.isNaN(date.getTime())) return '--:--'
      const h = `${date.getHours()}`.padStart(2, '0')
      const m = `${date.getMinutes()}`.padStart(2, '0')
      return `${h}:${m}`
    },
    statusLabel(status) {
      const map = { scheduled: '待到店', completed: '已完成', canceled: '已取消' }
      return map[status] || map.scheduled
    },
    statusClass(status) {
      return {
        scheduled: 'scheduled',
        completed: 'completed',
        canceled: 'canceled'
      }[status] || 'scheduled'
    },
    goCustomerDetail(item) {
      const cid = item?.customer_id || item?.customerId
      if (!cid) return
      uni.navigateTo({ url: `/pages/my-customers/detail?id=${cid}` })
    }
  }
}
</script>

<style scoped>
.page { min-height:100vh; background:#f7f7f9; display:flex; flex-direction:column; }
.header { padding:16px; }
.title { font-size:20px; font-weight:600; color:#1c1c1e; }
.filters { margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; }
.filter-pill { padding:6px 14px; border-radius:20px; background:#fff; color:#6f6f73; font-size:13px; box-shadow:0 2px 8px rgba(0,0,0,0.04); }
.filter-pill.active { background:#caa265; color:#fff; }
.content { flex:1; padding:0 16px 16px; box-sizing:border-box; }
.placeholder { margin-top:60px; text-align:center; color:#a1a1a6; }
.group-list { display:flex; flex-direction:column; gap:18px; }
.group-title { font-size:14px; color:#6f6f73; margin-bottom:8px; }
.booking-card { background:#fff; border-radius:20px; padding:14px 16px; display:flex; align-items:center; box-shadow:0 4px 14px rgba(0,0,0,0.04); }
.time { width:70px; }
.time-main { font-size:18px; font-weight:600; color:#111; display:block; }
.time-sub { font-size:12px; color:#a1a1a6; }
.info { flex:1; margin-left:12px; }
.info-title { font-size:15px; font-weight:600; color:#1c1c1e; }
.info-sub { font-size:12px; color:#6f6f73; margin-top:4px; }
.status-pill { padding:4px 12px; border-radius:999px; font-size:12px; font-weight:600; border:1px solid transparent; }
.status-pill.scheduled { color:#caa265; border-color:#f0dac0; background:rgba(202,162,101,0.08); }
.status-pill.completed { color:#20c997; border-color:rgba(32,201,151,0.3); background:rgba(32,201,151,0.08); }
.status-pill.canceled { color:#8e8e93; border-color:#dcdce0; background:#f5f5f7; }
</style>
