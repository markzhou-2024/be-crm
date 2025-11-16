<template>
  <view class="page">
    <scroll-view class="list" scroll-y refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
      <view v-if="loading" class="state">加载中...</view>
      <view v-else-if="!days.length" class="state">近 7 天暂无预约</view>
      <view v-else>
        <view class="day-card" v-for="day in days" :key="day.date">
          <view class="day-head">
            <text class="day-title">{{ formatDisplayDate(day.date) }}</text>
            <text class="day-count" v-if="day.items.length">{{ day.items.length }} 场</text>
            <text class="day-count muted" v-else>无预约</text>
          </view>
          <view v-if="day.items.length" class="booking-list">
            <view class="booking-item" v-for="item in day.items" :key="item.id" @tap="openCustomer(item)">
              <view class="time-pill">{{ item.time }}</view>
              <view class="booking-info">
                <text class="booking-title">{{ item.service_name || '未命名服务' }}</text>
                <text class="booking-sub">{{ item.store_name || '未选择门店' }} · {{ item.customer_name || '' }}</text>
              </view>
              <text class="arrow">›</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
// @ts-nocheck
import { fetchNextWeekBookings } from '@/api/analytics.js'

export default {
  data() {
    return {
      days: [],
      loading: true,
      refreshing: false
    }
  },
  async onShow() {
    await this.loadData()
  },
  methods: {
    async onRefresh() {
      if (this.refreshing) return
      this.refreshing = true
      await this.loadData()
      setTimeout(() => {
        this.refreshing = false
      }, 200)
    },
    async loadData() {
      try {
        this.loading = true
        const list = await fetchNextWeekBookings()
        this.days = list || []
      } catch (err) {
        uni.showToast({ title: err?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    formatDisplayDate(dateStr) {
      const date = new Date(dateStr.replace(/-/g, '/'))
      if (Number.isNaN(date.getTime())) return dateStr
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diff = Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      const label = diff === 0 ? '今天' : diff === 1 ? '明天' : diff === 2 ? '后天' : ''
      const m = date.getMonth() + 1
      const d = date.getDate()
      return label ? `${m}月${d}日 · ${label}` : `${m}月${d}日`
    },
    openCustomer(item) {
      if (!item?.customer_id) return
      uni.navigateTo({ url: `/pages/my-customers/detail?id=${item.customer_id}` })
    }
  }
}
</script>

<style scoped>
.page { min-height:100vh; background:#f6f7f9; }
.list { height:100vh; padding:16px; box-sizing:border-box; }
.state { margin-top:80px; text-align:center; color:#a1a1a6; }
.day-card { background:#fff; border-radius:22px; padding:16px; margin-bottom:16px; box-shadow:0 8px 24px rgba(0,0,0,0.05); }
.day-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.day-title { font-size:16px; font-weight:600; color:#1c1c1e; }
.day-count { font-size:13px; color:#caa265; }
.day-count.muted { color:#a1a1a6; }
.booking-list { display:flex; flex-direction:column; gap:12px; }
.booking-item { display:flex; align-items:center; background:#f8f8fa; border-radius:18px; padding:10px 12px; }
.time-pill { min-width:54px; padding:6px 0; text-align:center; border-radius:16px; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,0.05); font-weight:600; color:#111; }
.booking-info { flex:1; margin-left:12px; }
.booking-title { display:block; font-size:15px; color:#1c1c1e; font-weight:600; }
.booking-sub { display:block; font-size:12px; color:#8e8e93; margin-top:2px; }
.arrow { color:#c7c7cc; font-size:18px; margin-left:6px; }
</style>
