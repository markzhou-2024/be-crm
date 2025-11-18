<template>
  <view class="analysis-page">
    <view class="header">
      <text class="title">月度经营分析</text>
    </view>

    <view class="filters">
      <view class="pill" @tap="pickMonth">
        <text class="icon">📅</text>
        <text>{{ displayMonth }}</text>
        <text class="arrow">▾</text>
      </view>
      <view class="pill" @tap="pickScope">
        <text class="icon">🏬</text>
        <text>{{ scopeLabel }}</text>
        <text class="arrow">▾</text>
      </view>
      <view class="pill" @tap="pickStore">
        <text class="icon">🏢</text>
        <text>{{ storeLabel }}</text>
        <text class="arrow">▾</text>
      </view>
    </view>

    <view class="scroll" :class="{ loading: state.loading }">
      <view class="section">
        <view class="section-head"><text class="s-icon">🏪</text><text class="s-title">门店数据</text></view>
        <view class="grid-2">
          <view class="card purple">
            <view class="card-head"><text class="card-sub">到客数量</text></view>
            <view class="card-main"><text class="big">{{ ui.arrivalCount }}</text><text class="unit">次</text></view>
            <view class="card-foot two-cols"><text>顾问 {{ ui.arrivalByStaff }}</text><text>门店 {{ ui.arrivalByStore }}</text></view>
          </view>
          <view class="card purple light">
            <view class="card-head"><text class="card-sub">新客数量</text></view>
            <view class="card-main"><text class="big">{{ ui.newCustomer }}</text><text class="unit">人</text></view>
            <view class="tag">{{ changeText(overview?.storeData?.newCustomersChangeRate) }}</view>
          </view>
          <view class="card purple full">
            <view class="card-head between">
              <text class="card-sub">老客数据</text>
              <view class="tag">活跃率 {{ ui.activeRate }}</view>
            </view>
            <view class="card-main"><text class="big">{{ ui.oldCustomer }}</text><text class="unit">人</text></view>
            <view class="progress"><view class="bar" :style="{ width: ui.progress + '%' }"></view></view>
            <view class="progress-text">本月到店次数 <text class="strong">{{ ui.arrivalThisMonth }}</text> 次</view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head"><text class="s-icon">👥</text><text class="s-title">顾问数据</text></view>
        <view class="card blue full">
          <view class="row between">
            <view>
              <text class="card-sub">顾问到店次数</text>
              <view class="card-main"><text class="big">{{ ui.staffArrival }}</text><text class="unit">次</text></view>
            </view>
            <view class="tag">{{ changeText(overview?.consultantData?.visitsChangeRate) }}</view>
          </view>
          <view class="line"></view>
          <view class="row"><text class="muted">日历预约：{{ ui.calendarBooked }} 次</text></view>
        </view>
      </view>

      <view class="section">
        <view class="section-head"><text class="s-icon">💰</text><text class="s-title">财务数据</text></view>
        <view class="card green full">
          <view class="row between">
            <view>
              <text class="card-sub">总消耗金额</text>
              <view class="card-main"><text class="big">¥{{ ui.totalAmount }}</text><text class="unit">{{ ui.totalAmountUnit }}</text></view>
            </view>
            <view class="tag">{{ changeText(overview?.financeData?.totalConsumeAmountChangeRate) }}</view>
          </view>
          <view class="line"></view>
          <view class="row between"><text class="muted">套盒单价</text><text class="muted">¥{{ ui.unitPrice }}/次</text></view>
          <view class="row between"><text class="muted">消耗次数</text><text class="muted">{{ ui.consumeTimes }}次</text></view>
        </view>
      </view>

      <view class="empty-hint" v-if="!state.loading && !state.error && !hasData">本月暂无数据</view>
      <view class="empty-hint" v-if="state.error">加载失败</view>
    </view>

    <view class="footer" v-if="!isLogin">
      <button class="login-btn" @tap="login"><text class="arr">→</text> 微信登录</button>
    </view>
  </view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js'
import { fetchShops } from '@/api/shops.js'

export default {
  data() {
    return {
      state: { month: '', scope: 'mine', loading: false, error: '', storeId: '' },
      overview: null,
      storeOptions: [{ label: '负责门店合计', value: '' }],
      ui: {
        arrivalCount: 0, arrivalByStaff: 0, arrivalByStore: 0,
        newCustomer: 0, oldCustomer: 0, activeRate: '0%', progress: 0, arrivalThisMonth: 0,
        staffArrival: 0, calendarBooked: 0,
        totalAmount: '0', totalAmountUnit: '', unitPrice: 0, consumeTimes: 0
      }
    }
  },
  computed: {
    userInfo() { return store.userInfo },
    isLogin() { return !!(this.userInfo && this.userInfo._id) },
    displayMonth() { return this.state.month },
    scopeLabel() { return this.state.scope === 'mine' ? '我的门店' : '全局统计' },
    storeLabel() {
      const match = this.storeOptions.find(item => item.value === this.state.storeId)
      return match ? match.label : '负责门店合计'
    },
    hasData() {
      const sd = this.overview?.storeData || {}
      const cd = this.overview?.consultantData || {}
      const fd = this.overview?.financeData || {}
      const metricPool = [
        sd.totalVisits, sd.consultantVisits, sd.storeStaffVisits,
        sd.newCustomers, sd.oldCustomers, sd.oldCustomersVisits,
        cd.visits, cd.calendarBookings,
        fd.totalConsumeAmount, fd.totalConsumeCount, fd.packageUnitPrice
      ]
      if (metricPool.some(val => Number(val) > 0)) {
        return true
      }
      return Object.values(this.ui).some(val => typeof val === 'number' && val > 0)
    }
  },
  async onLoad() {
    this.state.month = this.formatMonth(new Date())
    await this.loadStores()
    await this.fetchData()
  },
  methods: {
    async loadStores() {
      try {
        const list = await fetchShops()
        const mapped = (list || []).map(item => ({
          label: item.store_name || item.name || '未命名门店',
          value: item._id || item.id || ''
        })).filter(item => item.value)
        this.storeOptions = [{ label: '负责门店合计', value: '' }, ...mapped]
      } catch (err) {
        this.storeOptions = [{ label: '负责门店合计', value: '' }]
      }
    },
    formatMonth(date) {
      const d = new Date(date)
      const y = d.getFullYear()
      const m = `${d.getMonth() + 1}`.padStart(2, '0')
      return `${y}-${m}`
    },
    async fetchData() {
      try {
        this.state.loading = true
        this.state.error = ''
        const service = uniCloud.importObject('stats', { customUI: true })
        const payload = {
          month: this.state.month,
          scope: this.state.scope,
          store_id: this.state.storeId || undefined
        }
        const res = await service.getMonthlyOverview(payload)
        const overview = (res && res.data) || res
        this.overview = overview && overview.data ? overview.data : overview
        this.applyOverview()
      } catch (err) {
        console.log('overview load failed', err)
        this.state.error = '获取经营数据失败，请稍后重试'
        uni.showToast({ title: this.state.error, icon: 'none' })
      } finally {
        this.state.loading = false
      }
    },
    applyOverview() {
      const sd = this.overview?.storeData || {}
      const cd = this.overview?.consultantData || {}
      const fd = this.overview?.financeData || {}
      const rate = Number(sd.oldCustomersActiveRate || 0)
      const amount = Number(fd.totalConsumeAmount || 0)
      this.ui = {
        arrivalCount: Number(sd.totalVisits || 0),
        arrivalByStaff: Number(sd.consultantVisits || 0),
        arrivalByStore: Number(sd.storeStaffVisits || 0),
        newCustomer: Number(sd.newCustomers || 0),
        oldCustomer: Number(sd.oldCustomers || 0),
        activeRate: `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`,
        progress: Math.max(0, Math.min(100, Math.round(rate * 100))),
        arrivalThisMonth: Number(sd.oldCustomersVisits || 0),
        staffArrival: Number(cd.visits || 0),
        calendarBooked: Number(cd.calendarBookings || 0),
        totalAmount: amount >= 10000 ? (amount / 10000).toFixed(1).replace(/\.0$/, '') : amount.toLocaleString('zh-CN'),
        totalAmountUnit: amount >= 10000 ? '万' : '',
        unitPrice: Number(fd.packageUnitPrice || 0),
        consumeTimes: Number(fd.totalConsumeCount || 0)
      }
    },
    changeText(val) {
      const num = Number(val || 0)
      const pct = (num * 100).toFixed(0)
      return `${num >= 0 ? '+' : ''}${pct}%`
    },
    pickMonth() {
      const base = new Date(`${this.state.month}-01T00:00:00`)
      uni.showActionSheet({
        itemList: ['上个月', '本月', '下个月'],
        success: async ({ tapIndex }) => {
          let target = new Date(base)
          if (tapIndex === 0) target = new Date(base.getFullYear(), base.getMonth() - 1, 1)
          if (tapIndex === 1) target = new Date()
          if (tapIndex === 2) target = new Date(base.getFullYear(), base.getMonth() + 1, 1)
          this.state.month = this.formatMonth(target)
          await this.fetchData()
        }
      })
    },
    pickScope() {
      uni.showActionSheet({
        itemList: ['全局统计', '我的门店'],
        success: async ({ tapIndex }) => {
          this.state.scope = tapIndex === 1 ? 'mine' : 'global'
          await this.fetchData()
        }
      })
    },
    pickStore() {
      const items = this.storeOptions.map(item => item.label)
      uni.showActionSheet({
        itemList: items,
        success: async ({ tapIndex }) => {
          const picked = this.storeOptions[tapIndex]
          if (!picked) return
          this.state.storeId = picked.value
          await this.fetchData()
        }
      })
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
.row { display: flex; align-items: center; gap: 8px; }
.row.between { justify-content: space-between; }
.line { height: 1px; background: rgba(255,255,255,0.35); margin: 8px 0; }
.muted { color: #e8f3ff; font-size: 12px; }
.footer { padding: 10px 16px 20px; }
.login-btn { width: 100%; height: 46px; border-radius: 999px; background: #111; color: #fff; border: none; font-weight: 600; }
.arr { margin-right: 6px; }
.empty-hint { text-align: center; color: #a3a3a8; font-size: 12px; }
</style>
