<template>
  <view class="page">
    <view class="filters">
      <picker class="picker" mode="selector" :range="storeOptions" range-key="label" :value="storeIndex" @change="onStoreChange">
        <view class="picker-trigger">{{ currentStoreLabel }}</view>
      </picker>
      <view class="month-switch">
        <button class="nav-btn" @tap="changeMonth(-1)">‹</button>
        <text class="month-label">{{ currentMonth }}</text>
        <button class="nav-btn" @tap="changeMonth(1)">›</button>
      </view>
    </view>

    <view class="cards">
      <view class="kpi-card" v-for="card in cards" :key="card.key">
        <text class="kpi-label">{{ card.label }}</text>
        <text class="kpi-value">{{ formatValue(card.value, card.format) }}</text>
      </view>
    </view>
  </view>
</template>

<script>
// @ts-nocheck
import { fetchShops } from '@/api/shops.js'
import { fetchStoreMonthlyKPI } from '@/api/analytics.js'

export default {
  data() {
    return {
      storeOptions: [],
      storeIndex: 0,
      currentMonth: this.formatMonth(new Date()),
      kpi: {
        arrive_customer_distinct: 0,
        service_count: 0,
        consume_amount: 0
      }
    }
  },
  computed: {
    currentStoreLabel() {
      const option = this.storeOptions[this.storeIndex]
      return option ? option.label : '选择门店'
    },
    cards() {
      return [
        { key: 'arrive', label: '到客数量', value: this.kpi.arrive_customer_distinct },
        { key: 'service', label: '服务次数', value: this.kpi.service_count },
        { key: 'amount', label: '总消耗金额(元)', value: this.kpi.consume_amount, format: 'amount' }
      ]
    }
  },
  async onShow() {
    await this.ensureStores()
    await this.loadKPI()
  },
  methods: {
    formatMonth(date) {
      const d = new Date(date)
      const y = d.getFullYear()
      const m = `${d.getMonth() + 1}`.padStart(2, '0')
      return `${y}-${m}`
    },
    async ensureStores() {
      if (this.storeOptions.length) return
      try {
        const list = await fetchShops()
        this.storeOptions = list.map(item => ({ label: item.name, value: item._id || item.id }))
      } catch (err) {
        uni.showToast({ title: '门店加载失败', icon: 'none' })
      }
    },
    async loadKPI() {
      if (!this.storeOptions.length) return
      const storeId = this.storeOptions[this.storeIndex]?.value
      if (!storeId) {
        uni.showToast({ title: '请选择门店', icon: 'none' })
        return
      }
      try {
        const data = await fetchStoreMonthlyKPI({ store_id: storeId, month: this.currentMonth })
        this.kpi = data || this.kpi
      } catch (err) {
        uni.showToast({ title: err?.message || '加载失败', icon: 'none' })
      }
    },
    onStoreChange(e) {
      this.storeIndex = Number(e?.detail?.value || 0)
      this.loadKPI()
    },
    changeMonth(step) {
      const [year, month] = this.currentMonth.split('-').map(num => Number(num))
      const next = new Date(year, month - 1 + step, 1)
      this.currentMonth = this.formatMonth(next)
      this.loadKPI()
    },
    formatValue(value, format) {
      if (format === 'amount') {
        return Number(value || 0).toFixed(2)
      }
      return Number(value || 0).toLocaleString('zh-CN')
    }
  }
}
</script>

<style scoped>
.page { min-height:100vh; background:#f6f7f9; padding:16px; box-sizing:border-box; }
.filters { display:flex; flex-direction:column; gap:12px; margin-bottom:16px; }
.picker-trigger { background:#fff; border-radius:18px; padding:14px; box-shadow:0 8px 18px rgba(0,0,0,0.06); }
.month-switch { display:flex; align-items:center; justify-content:center; gap:12px; }
.nav-btn { width:40px; height:40px; border-radius:20px; background:#fff; box-shadow:0 6px 18px rgba(0,0,0,0.08); text-align:center; line-height:40px; font-size:20px; color:#caa265; }
.month-label { font-size:18px; font-weight:600; color:#1c1c1e; }
.cards { display:flex; flex-direction:column; gap:16px; }
.kpi-card { background:#fff; border-radius:24px; padding:20px; box-shadow:0 12px 30px rgba(0,0,0,0.06); }
.kpi-label { font-size:14px; color:#8e8e93; }
.kpi-value { display:block; margin-top:10px; font-size:28px; font-weight:700; color:#1c1c1e; }
</style>
