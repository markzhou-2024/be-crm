<template>
  <view class="page">
    <view class="edit-btn" @tap="goEdit">编辑</view>

    <view class="hero">
      <image class="hero-img" :src="coverImage" mode="aspectFill" />
      <view class="hero-overlay">
        <text class="hero-title">{{ shop.store_name || '未命名门店' }}</text>
        <text class="hero-sub">{{ shop.store_address || '地址待完善' }}</text>
      </view>
    </view>

    <view class="card info-card">
      <view class="info-row">
        <text class="icon">📞</text>
        <view class="info-text">
          <text class="label">联系电话</text>
          <text class="val">{{ shop.phone || '暂无' }}</text>
        </view>
      </view>
      <view class="info-row">
        <text class="icon">📍</text>
        <view class="info-text">
          <text class="label">门店地址</text>
          <text class="val">{{ shop.store_address || '地址未填写' }}</text>
        </view>
      </view>
      <view class="info-row">
        <text class="icon">⏰</text>
        <view class="info-text">
          <text class="label">营业时间</text>
          <text class="val">{{ shop.business_hours || '10:00 - 22:00' }}</text>
        </view>
      </view>
      <view class="info-row customers-row">
        <view class="info-text">
          <text class="icon">👥</text>
          <text class="label">客户数量</text>
          <text class="val strong">{{ shop.customer_count || 0 }} 位</text>
        </view>
      </view>
      <view class="btn-row">
        <button class="mini-btn" size="mini" @tap="goCustomers">查看</button>
        <button class="mini-btn" size="mini" @tap="addCustomer">添加客户</button>
      </view>
    </view>

    <view class="card">
      <view class="section-title">多维趋势分析（{{ kpiMonth || '本月' }}）</view>
      <view class="chip-group">
        <view
          v-for="opt in metricOptions"
          :key="opt.value"
          class="chip"
          :class="{ active: selectedMetrics.includes(opt.value) }"
          @tap="toggleMetric(opt.value)"
        >
          {{ opt.label }}
        </view>
      </view>

      <view class="trend-list">
        <view
          class="trend-row"
          v-for="key in selectedMetrics"
          :key="key"
        >
          <view class="trend-head">
            <text class="trend-name">{{ metricMap[key].label }}</text>
            <text class="trend-value">{{ renderValue(metricMap[key].value, key) }}</text>
          </view>
          <view class="trend-chart">
            <view
              v-for="(v, idx) in metricMap[key].trend"
              :key="idx"
              class="bar"
              :style="{ height: getBarHeight(v, metricMap[key].trend), width: barWidth, opacity: 0.4 + idx * 0.12 }"
            ></view>
          </view>
          <view class="trend-axis">
            <text v-for="(label, i) in monthTicks" :key="i" class="axis-label">{{ label }}</text>
          </view>
          <view class="trend-foot">
            <text class="foot-label">趋势预览</text>
            <text class="foot-note">基于当前月度数据生成占位曲线</text>
          </view>
        </view>
        <view v-if="!selectedMetrics.length" class="empty">请选择要查看的指标</view>
      </view>
    </view>

    

  </view>
</template>

<script>
// @ts-nocheck
import { fetchCustomers } from '@/api/customers.js'

export default {
  data() {
    return {
      id: '',
      shop: {
        store_name: '',
        store_address: '',
        cover_image: '',
        month_revenue: 0,
        customer_count: 0,
        phone: '',
        business_hours: '10:00 - 22:00',
        status: 'active'
      },
      kpiMonth: '',
      kpi: {
        shopStats: {},
        serviceStats: {},
        financeStats: {}
      },
      selectedMetrics: ['sales', 'consume', 'consultant', 'store'],
      monthTicks: [],
      metricSeries: {
        sales: [],
        consume: [],
        consultant: [],
        store: [],

      }
    }
  },
  computed: {
    coverImage() {
      return this.shop.cover_image || 'https://dummyimage.com/800x400/f3f4f6/9ca3af&text=Store'
    },
    metricOptions() {
      return [
        { label: '销售金额', value: 'sales' },
        { label: '消耗金额', value: 'consume' },
        { label: '顾问服务次数', value: 'consultant' },
        { label: '门店服务次数', value: 'store' }
      ]
    },
    metricMap() {
      const finance = this.kpi.financeStats || {}
      const service = this.kpi.serviceStats || {}
      const shop = this.kpi.shopStats || {}
      const series = this.metricSeries || {}
      const len = Math.max(this.monthTicks.length, 5)
      const fallback = Array(len).fill(0)
      const pick = (arr, val) => {
        const trend = (arr && arr.length ? arr : fallback).slice(-len)
        const value = trend.length ? trend[trend.length - 1] : Number(val || 0) || 0
        return { trend, value }
      }
      return {
        sales: Object.assign({ label: '销售金额' }, pick(series.sales, finance.monthSalesAmount)),
        consume: Object.assign({ label: '消耗金额' }, pick(series.consume, finance.monthConsumeAmount)),
        consultant: Object.assign({ label: '顾问服务次数' }, pick(series.consultant, service.consultantServices)),
        store: Object.assign({ label: '门店服务次数' }, pick(series.store, service.storeSelfServices))

      }
    },
    barWidth() {
      const len = Math.max(this.monthTicks.length, 5)
      return `${100 / len - 2}%`
    }
  },
  created() {
    this.service = uniCloud.importObject('curd-shops')
  },
  onLoad(query) {
    this.id = (query && query.id) || ''
    uni.setNavigationBarTitle({ title: '门店详情' })
    if (!this.id) {
      uni.showToast({ title: '缺少门店ID', icon: 'none' })
      return
    }
    this.fetchShop()
  },
  onShow() {
    if (this.id) {
      this.fetchShop()
      this.loadStoreKpi()
    }
  },
  methods: {
    buildMonthTicks() {
      const now = new Date()
      const ticks = []
      const months = []
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = `${d.getMonth() + 1}月`
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        ticks.push(label)
        months.push(value)
      }
      this.monthTicks = ticks
      return months
    },
    async fetchShop() {
      try {
        const data = await this.service.getShopById(this.id)
        if (data) {
          const info = { ...data }
          try {
            const customers = await fetchCustomers()
            info.customer_count = (customers || []).filter(c => c.store_id === this.id).length
          } catch (e) {
            info.customer_count = data.customer_count || 0
          }
          this.shop = info
          if (info.store_name) {
            uni.setNavigationBarTitle({ title: info.store_name })
          }
        } else {
          uni.showToast({ title: '未找到门店信息', icon: 'none' })
        }
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '加载失败', icon: 'none' })
      }
    },
    async loadStoreKpi() {
      if (!this.id) return
      const months = this.buildMonthTicks()
      try {
        const stats = uniCloud.importObject('stats')
        const series = { sales: [], consume: [], consultant: [], store: []}
        let latest = null
        for (const m of months) {
          try {
            const res = await stats.getMonthlyBusinessKpis({ month: m, storeId: this.id })
            const data = res?.data || {}
            latest = data || latest
            const finance = data.financeStats || {}
            const service = data.serviceStats || {}
            const shop = data.shopStats || {}
            series.sales.push(Number(finance.monthSalesAmount || 0))
            series.consume.push(Number(finance.monthConsumeAmount || 0))
            series.consultant.push(Number(service.consultantServices || 0))
            series.store.push(Number(service.storeSelfServices || 0))

          } catch (e) {
            series.sales.push(0); series.consume.push(0); series.consultant.push(0); series.store.push(0)
          }
        }
        this.metricSeries = series
        if (latest) {
          this.kpi = {
            shopStats: latest.shopStats || {},
            serviceStats: latest.serviceStats || {},
            financeStats: latest.financeStats || {}
          }
          this.kpiMonth = latest.month || months[months.length - 1]
        } else {
          this.kpiMonth = months[months.length - 1]
        }
      } catch (e) {
        // ignore load failure
      }
    },
    addCustomer() {
      if (!this.id) return
      const storeName = encodeURIComponent(this.shop.store_name || '')
      uni.navigateTo({
        url: `/pages/my-customers/create?store_id=${this.id}&store_name=${storeName}`
      })
    },
    openCalendar() { uni.showToast({ title: '预约日历（待接后端）', icon: 'none' }) },
    goEdit() { uni.navigateTo({ url: `/pages/my-shops/edit?id=${this.id}` }) },
    goCustomers() {
      const name = encodeURIComponent(this.shop.store_name || '')
      try {
        uni.setStorageSync('customer_store_filter', { store_id: this.id, store_name: this.shop.store_name || '' })
      } catch (e) {
        // ignore
      }
      uni.switchTab({
        url: '/pages/my-customers/index',
        fail: () => {
          uni.navigateTo({ url: `/pages/my-customers/index?store_id=${this.id}&store_name=${name}` })
        }
      })
    },
    toggleMetric(key) {
      const next = new Set(this.selectedMetrics)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      this.selectedMetrics = Array.from(next)
    },
    renderValue(val, key) {
      if (key === 'sales' || key === 'consume') return `¥${this.formatCurrency(val)}`
      return `${Number(val || 0)}`
    },
    formatCurrency(value) {
      const num = Number(value || 0)
      if (!num) return '0.00'
      return num.toFixed(2)
    },
    getBarHeight(value, arr) {
      const max = Math.max(...arr, 1)
      return `${Math.max(8, (value / max) * 48)}px`
    }
  }
}
</script>

<style scoped>
.page { min-height:100vh; background:linear-gradient(180deg,#f5f7fb 0%,#ffffff 22%); padding-bottom:24px; }
.hero { position:relative; padding:16px 16px 8px; }
.hero-img { width:100%; height:180px; border-radius:16px; background:#f2f2f2; object-fit:cover; }
.hero-overlay { position:absolute; left:28px; bottom:22px; right:28px; background:rgba(0,0,0,0.35); color:#fff; padding:12px; border-radius:12px; backdrop-filter: blur(6px); }
.hero-title { font-size:18px; font-weight:700; }
.hero-sub { margin-top:4px; font-size:12px; opacity:0.9; }
.card { margin:0 16px 12px; background:#fff; border-radius:16px; padding:16px; box-shadow:0 8px 20px rgba(0,0,0,0.06); border:1px solid #f1f2f4; }
.info-card { display:flex; flex-direction:column; gap:10px; }
.info-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #f5f6f7; }
.info-row:last-child { border-bottom:none; }
.info-text { display:flex; flex-direction:column; gap:4px; flex:1; }
.label { color:#8a8a8a; font-size:12px; }
.val { color:#333; font-size:14px; }
.val.strong { font-weight:700; }
.icon { width:22px; text-align:center; font-size:16px; }
.customers-row { justify-content:space-between; }
.btn-row { display:flex; gap:8px; }
.mini-btn { flex:1; border:1px solid #eedfc4; color:#caa265; border-radius:16px; padding:0 12px; height:32px; line-height:32px; background:#fff; }
.section-title { font-size:14px; font-weight:600; color:#333; margin-bottom:12px; }
.chart-placeholder { height:140px; border-radius:12px; background:#fafafa; display:flex; align-items:center; justify-content:center; color:#b8b8b8; }
.cta { margin:16px; display:flex; flex-direction:column; gap:12px; }
.btn { height:44px; border-radius:12px; font-size:16px; }
.primary { background:#caa265; color:#fff; }
.ghost { background:#fff; color:#333; border:1px solid #eee; }
.edit-btn { position: fixed; right: 16px; top: 8px; color:#caa265; padding:8px 12px; z-index: 11; background:#fff; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.06); }
.chip-group { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
.chip { padding:6px 10px; border-radius:12px; background:#f4f6fb; color:#4b5563; font-size:12px; border:1px solid #e5e7eb; }
.chip.active { background:#e0ecff; color:#1d4ed8; border-color:#bfdbfe; }
.trend-list { display:flex; flex-direction:column; gap:12px; }
.trend-row { padding:10px 12px; border-radius:12px; background:#f9fafb; border:1px solid #eef1f5; }
.trend-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.trend-name { font-size:13px; color:#374151; font-weight:600; }
.trend-value { font-size:16px; font-weight:700; color:#111827; }
.trend-chart { display:flex; align-items:flex-end; gap:6px; height:60px; }
.trend-chart .bar { flex:1; background:linear-gradient(180deg,#60a5fa 0%,#93c5fd 100%); border-radius:6px 6px 2px 2px; }
.trend-axis { display:flex; justify-content:space-between; margin-top:6px; }
.axis-label { font-size:11px; color:#9ca3af; text-align:center; flex:1; }
.trend-foot { display:flex; justify-content:space-between; color:#9ca3af; font-size:11px; margin-top:4px; }
.foot-label { font-weight:600; color:#6b7280; }
</style>
