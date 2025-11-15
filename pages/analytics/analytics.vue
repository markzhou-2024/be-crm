<template>
  <view class="analysis-page">
    <view class="header">
      <text class="title">月度经营分析</text>
    </view>

    <view class="filters">
      <picker class="picker-wrapper" mode="date" fields="month" :value="month" @change="onMonthChange">
        <view class="pill">
          <text class="icon">📅</text>
          <text>{{ displayMonth }}</text>
          <text class="arrow">›</text>
        </view>
      </picker>
      <view class="pill" @tap="pickScope">
        <text class="icon">🏬</text>
        <text>{{ scopeLabel }}</text>
        <text class="arrow">›</text>
      </view>
      <view class="pill" @tap="pickStore">
        <text class="icon">🏢</text>
        <text>{{ storeLabel }}</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <view class="scroll" :class="{ loading }">
      <view class="section">
        <view class="section-head"><text class="s-icon">🏪</text><text class="s-title">门店数据</text></view>
        <view class="grid-2">
          <view class="card purple">
            <view class="card-head"><text class="card-sub">到客数量</text></view>
            <view class="card-main"><text class="big">{{ storeStats.totalVisits }}</text><text class="unit">次</text></view>
            <view class="card-foot two-cols"><text>顾问 {{ storeStats.consultantVisits }}</text><text>门店 {{ storeStats.storeStaffVisits }}</text></view>
          </view>
          <view class="card purple light">
            <view class="card-head"><text class="card-sub">新客数量</text></view>
            <view class="card-main"><text class="big">{{ storeStats.newCustomers }}</text><text class="unit">人</text></view>
            <view class="tag">{{ changeText(overviewData.storeData.newCustomersChangeRate) }}</view>
          </view>
          <view class="card purple full">
            <view class="card-head between">
              <text class="card-sub">老客数据</text>
              <view class="tag">活跃率 {{ oldActiveRateText }}</view>
            </view>
            <view class="card-main"><text class="big">{{ storeStats.oldCustomers }}</text><text class="unit">人</text></view>
            <view class="progress"><view class="bar" :style="{ width: progressWidth + '%' }"></view></view>
            <view class="progress-text">本月到店次数 <text class="strong">{{ storeStats.oldCustomersVisits }}</text> 次</view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head"><text class="s-icon">👥</text><text class="s-title">顾问数据</text></view>
        <view class="card blue full">
          <view class="row between">
            <view>
              <text class="card-sub">顾问到店次数</text>
              <view class="card-main"><text class="big">{{ consultantStats.visits }}</text><text class="unit">次</text></view>
            </view>
            <view class="tag">{{ changeText(consultantStats.visitsChangeRate) }}</view>
          </view>
          <view class="line"></view>
          <view class="row"><text class="muted">日历预约：{{ consultantStats.calendarBookings }} 次</text></view>
        </view>
      </view>

      <view class="section">
        <view class="section-head"><text class="s-icon">💰</text><text class="s-title">财务数据</text></view>
        <view class="card green full">
          <view class="row between">
            <view>
              <text class="card-sub">总消耗金额</text>
              <view class="card-main"><text class="big">¥{{ formatAmount(financeStats.totalConsumeAmount) }}</text></view>
            </view>
            <view class="tag">{{ changeText(overviewData.financeData.totalConsumeAmountChangeRate) }}</view>
          </view>
          <view class="line"></view>
          <view class="row between"><text class="muted">套盒单价</text><text class="muted">¥{{ financeStats.packageUnitPrice.toFixed(2) }}/次</text></view>
          <view class="row between"><text class="muted">消耗次数</text><text class="muted">{{ financeStats.totalConsumeCount }} 次</text></view>
        </view>
      </view>

      <view class="empty-hint" v-if="!loading && !error && !hasData">本月暂无数据</view>
      <view class="empty-hint" v-if="error">{{ error }}</view>
    </view>

    <view class="footer" v-if="!isLogin">
      <button class="login-btn" @tap="login"><text class="arr">→</text> 微信登录</button>
    </view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js'
import { fetchShops } from '@/api/shops.js'

const statsObj = uniCloud.importObject('stats')

const createEmptyOverview = () => ({
  month: '',
  scope: 'mine',
  storeId: null,
  storeData: {
    totalVisits: 0,
    consultantVisits: 0,
    storeStaffVisits: 0,
    newCustomers: 0,
    oldCustomers: 0,
    oldCustomersVisits: 0,
    oldCustomersActiveRate: 0
  },
  financeData: {
    totalConsumeAmount: 0,
    packageUnitPrice: 0,
    totalConsumeCount: 0
  },
  consultantData: {
    visits: 0,
    visitsChangeRate: 0,
    calendarBookings: 0
  }
})

export default {
  data() {
    return {
      month: '',
      scope: 'mine',
      storeId: null,
      loading: false,
      error: null,
      overviewData: createEmptyOverview(),
      storeOptions: [{ label: '负责门店合计', value: null }]
    }
  },
  computed: {
    userInfo() {
      return store.userInfo
    },
    isLogin() {
      return !!(this.userInfo && this.userInfo._id)
    },
    displayMonth() {
      if (!this.month) return ''
      const [y, m] = this.month.split('-')
      return `${y}年${m}月`
    },
    scopeLabel() {
      return this.scope === 'global' ? '全局统计' : '我的门店'
    },
    storeLabel() {
      const target = this.storeOptions.find(item => item.value === this.storeId)
      return target ? target.label : '负责门店合计'
    },
    storeStats() {
      return this.overviewData.storeData || createEmptyOverview().storeData
    },
    financeStats() {
      return this.overviewData.financeData || createEmptyOverview().financeData
    },
    consultantStats() {
      return this.overviewData.consultantData || createEmptyOverview().consultantData
    },
    oldActiveRatePercent() {
      const rate = Number(this.storeStats.oldCustomersActiveRate || 0)
      return Math.max(0, Math.min(1, rate)) * 100
    },
    oldActiveRateText() {
      return `${this.oldActiveRatePercent.toFixed(1).replace(/\.0$/, '')}%`
    },
    progressWidth() {
      return Math.round(Math.max(0, Math.min(100, this.oldActiveRatePercent)))
    },
    hasData() {
      const s = this.storeStats
      const f = this.financeStats
      return [
        s.totalVisits,
        s.newCustomers,
        s.oldCustomers,
        s.consultantVisits,
        s.storeStaffVisits,
        f.totalConsumeAmount,
        f.totalConsumeCount
      ].some(v => Number(v) > 0)
    }
  },
  async onLoad() {
    await this.loadStores()
  },
  onShow() {
    if (!this.month) {
      this.month = this.getCurrentMonth()
    }
    this.fetchData()
  },
  methods: {
    getCurrentMonth() {
      const d = new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      return `${y}-${m}`
    },
    async loadStores() {
      try {
        const list = await fetchShops()
        const mapped = (list || [])
          .map(item => ({
            label: item.store_name || item.name || '未命名门店',
            value: item._id || item.id || null
          }))
          .filter(item => item.value !== null && item.value !== undefined && item.value !== '')
        this.storeOptions = [{ label: '负责门店合计', value: null }, ...mapped]
      } catch (err) {
        this.storeOptions = [{ label: '负责门店合计', value: null }]
      }
    },
    async fetchData() {
      if (!this.isLogin) {
        this.error = null
        this.overviewData = createEmptyOverview()
        return
      }
      if (!this.month) {
        this.month = this.getCurrentMonth()
      }
      this.loading = true
      this.error = null
      try {
        const res = await statsObj.getMonthlyOverview({
          month: this.month,
          scope: this.scope,
          storeId: this.storeId || undefined
        })
        const payload = res && res.data ? res.data : res
        const normalized = this.normalizeOverview(payload)
        this.overviewData = normalized
        if (normalized.scope) {
          this.scope = normalized.scope
        }
        this.storeId = normalized.storeId
      } catch (err) {
        console.error('overview load failed', err)
        this.error = (err && err.message) || '获取经营数据失败，请稍后重试'
        uni.showToast({ title: this.error, icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    normalizeOverview(data) {
      const base = createEmptyOverview()
      if (data && typeof data === 'object') {
        base.month = data.month || base.month
        base.scope = data.scope || base.scope
        const storeId = data.storeId
        base.storeId = storeId !== undefined && storeId !== null && storeId !== '' ? storeId : null
        base.storeData = { ...base.storeData, ...(data.storeData || {}) }
        base.financeData = { ...base.financeData, ...(data.financeData || {}) }
        base.consultantData = { ...base.consultantData, ...(data.consultantData || {}) }
      }
      if (base.consultantData.visits == null) {
        base.consultantData.visits = base.storeData.consultantVisits
      }
      return base
    },
    onMonthChange(e) {
      const val = (e && e.detail && e.detail.value) || ''
      const ym = val.slice(0, 7)
      if (!ym || ym === this.month) return
      this.month = ym
      this.fetchData()
    },
    pickScope() {
      uni.showActionSheet({
        itemList: ['我的门店', '全局统计'],
        success: ({ tapIndex }) => {
          const nextScope = tapIndex === 1 ? 'global' : 'mine'
          if (nextScope === this.scope) return
          this.scope = nextScope
          this.fetchData()
        }
      })
    },
    pickStore() {
      const items = this.storeOptions.map(item => item.label)
      uni.showActionSheet({
        itemList: items,
        success: ({ tapIndex }) => {
          const picked = this.storeOptions[tapIndex]
          if (!picked) return
          this.storeId = picked.value ?? null
          this.fetchData()
        }
      })
    },
    formatAmount(amount) {
      const num = Number(amount) || 0
      if (num >= 10000) {
        return (num / 10000).toFixed(1).replace(/\.0$/, '') + '万'
      }
      return num.toFixed(2)
    },
    changeText(val) {
      if (val === null || val === undefined || Number.isNaN(Number(val))) {
        return '--'
      }
      const num = Number(val)
      const pct = (num * 100).toFixed(0)
      return `${num >= 0 ? '+' : ''}${pct}%`
    },
    login() {
      uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd' })
    }
  }
}
</script>

<style scoped>
.analysis-page { min-height: 100vh; background: #f5f6fb; padding-bottom: env(safe-area-inset-bottom); display: flex; flex-direction: column; }
.header { padding: 14px 16px 8px; text-align: center; }
.title { font-size: 18px; font-weight: 700; color: #1c1c1e; }
.filters { display: flex; gap: 12px; padding: 8px 16px 6px; }
.picker-wrapper { flex: 1; display: block; }
.picker-wrapper .pill { width: 100%; }
.pill { flex: 1; background: #fff; border-radius: 14px; padding: 10px 12px; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); }
.pill .arrow { margin-left: auto; color: #999; }
.scroll { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 12px; }
.section { background: #fff; border-radius: 18px; padding: 10px; box-shadow: 0 6px 20px rgba(0,0,0,0.04); }
.section-head { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280; margin-bottom: 8px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.card { border-radius: 16px; padding: 12px; color: #fff; position: relative; }
.card.full { grid-column: 1 / span 2; }
.purple { background: linear-gradient(180deg, #7c3aed, #8b5cf6); }
.purple.light { background: linear-gradient(180deg, #8b5cf6, #a78bfa); }
.blue { background: linear-gradient(180deg, #2563eb, #3b82f6); }
.green { background: linear-gradient(180deg, #059669, #10b981); }
.card-head { display: flex; align-items: center; }
.card-head.between { justify-content: space-between; }
.card-sub { font-size: 12px; opacity: 0.9; }
.card-main { display: flex; align-items: flex-end; gap: 6px; margin: 4px 0 6px; }
.big { font-size: 28px; font-weight: 800; }
.unit { font-size: 12px; opacity: 0.85; }
.card-foot { font-size: 12px; opacity: 0.9; }
.two-cols { display: flex; justify-content: space-between; }
.tag { position: absolute; right: 10px; top: 10px; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.2); font-size: 12px; border: 1px solid rgba(255,255,255,0.35); }
.progress { height: 6px; background: rgba(255,255,255,0.3); border-radius: 4px; overflow: hidden; }
.bar { height: 100%; background: #fff; opacity: 0.9; }
.progress-text { margin-top: 6px; font-size: 12px; }
.strong { font-weight: 700; }
.row { display: flex; align-items: center; gap: 8px; }
.row.between { justify-content: space-between; }
.line { height: 1px; background: rgba(255,255,255,0.35); margin: 8px 0; }
.muted { color: #e8f3ff; font-size: 12px; }
.footer { padding: 10px 16px 20px; }
.login-btn { width: 100%; height: 46px; border-radius: 999px; background: #111; color: #fff; border: none; font-weight: 600; }
.arr { margin-right: 6px; }
.empty-hint { text-align: center; color: #a3a3a8; font-size: 12px; }
</style>
