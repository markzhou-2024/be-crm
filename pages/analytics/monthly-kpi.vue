<template>
  <view class="page">
    <view class="overview-card">
      <view class="overview-text">
        <text class="overview-title">月度指标概览</text>
        <view class="chips">
        </view>
        <view class="inline-filters">
          <view class="filter-item" @tap="openMonthPicker">
            <view class="filter-value picker-value">
              <view class="filter-main">
                <text class="filter-text">{{ selectedMonthDisplay }}</text>
                <text class="filter-icon">📅</text>
              </view>
            </view>
          </view>
          <view class="filter-item">
            <picker mode="selector" :range="storeLabels" @change="onStoreChange">
              <view class="filter-value picker-value">
                <view class="filter-main">
                  <text class="filter-text">{{ selectedStoreLabel }}</text>
                  <text class="filter-icon">▾</text>
                </view>
              </view>
            </picker>
          </view>
        </view>
      </view>
      <view class="store-badge">
        <text class="store-icon">🏪</text>
        <text class="store-text">{{ storeCountDisplay }}</text>
      </view>
    </view>

    <view class="section" v-if="loaded">
      <view class="section-head">
        <text class="section-title">门店数据</text>
        <text class="section-sub">到访与客群</text>
      </view>
      <view class="cards">
        <view class="card blue">
          <text class="card-label">客流到访数</text>
          <view class="card-number">
            <text>{{ metrics.shopStats.totalVisitors || 0 }}</text>
            <text class="card-unit">人</text>
          </view>
        </view>
        <view class="card green">
          <text class="card-label">老客到访数</text>
          <view class="card-number">
            <text>{{ metrics.shopStats.oldCustomerVisitors || 0 }}</text>
            <text class="card-unit">人</text>
          </view>
        </view>
        <view class="card orange">
          <text class="card-label">新增客户数</text>
          <view class="card-number">
            <text>{{ metrics.shopStats.newCustomers || 0 }}</text>
            <text class="card-unit">人</text>
          </view>
        </view>
        <view class="card purple">
          <text class="card-label">老客到店次数</text>
          <view class="card-number">
            <text>{{ metrics.shopStats.oldCustomerVisitTimes || 0 }}</text>
            <text class="card-unit">次</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-if="loaded">
      <view class="section-head">
        <text class="section-title">服务数据</text>
        <text class="section-sub">顾问与门店</text>
      </view>
      <view class="cards">
        <view class="card indigo">
          <text class="card-label">顾问到访次数</text>
          <view class="card-number">
            <text>{{ metrics.serviceStats.consultantVisits || 0 }}</text>
            <text class="card-unit">次</text>
          </view>
        </view>
        <view class="card pink">
          <text class="card-label">顾问服务次数</text>
          <view class="card-number">
            <text>{{ metrics.serviceStats.consultantServices || 0 }}</text>
            <text class="card-unit">次</text>
          </view>
        </view>
        <view class="card teal">
          <text class="card-label">门店自主服务次数</text>
          <view class="card-number">
            <text>{{ metrics.serviceStats.storeSelfServices || 0 }}</text>
            <text class="card-unit">次</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-if="loaded">
      <view class="section-head">
        <text class="section-title">财务数据</text>
        <text class="section-sub">销售与消耗</text>
      </view>
      <view class="cards finance">
        <view class="card gold finance-card">
          <view class="finance-head">
            <text class="card-label">本月销售金额</text>
            <text class="pill pill-positive">销售</text>
          </view>
          <view class="card-number finance-number">
            <text>{{ formatCurrency(metrics.financeStats.monthSalesAmount) }}</text>
            <text class="card-unit">元</text>
          </view>
          <text class="finance-note">包含本月收款、套餐销售</text>
        </view>
        <view class="card gold finance-card">
          <view class="finance-head">
            <text class="card-label">本月消耗金额</text>
            <text class="pill pill-neutral">消耗</text>
          </view>
          <view class="card-number finance-number">
            <text>{{ formatCurrency(metrics.financeStats.monthConsumeAmount) }}</text>
            <text class="card-unit">元</text>
          </view>
          <text class="finance-note">按套餐单价 × 消耗次数折算</text>
        </view>
      </view>
    </view>

    <view class="empty" v-if="!loaded">
      请选择月份后查看经营指标
    </view>

    <view class="ai-entry" @tap="goAiAnalyst">
      <view class="ai-icon">🤖</view>
      <view class="ai-copy">
        <text class="ai-title">AI 经营分析师</text>
        <text class="ai-desc">用数据回答你的问题</text>
      </view>
      <text class="ai-arrow">›</text>
    </view>

    <uni-popup ref="monthPopup" type="bottom">
      <view class="month-popup">
        <view class="popup-header">
          <text class="popup-title">选择月份</text>
          <view class="popup-year-control">
            <text class="year-btn" @tap="changePopupYear(-1)">‹</text>
            <text class="year-text">{{ popupYear }} 年</text>
            <text class="year-btn" @tap="changePopupYear(1)">›</text>
          </view>
        </view>
        <view class="month-grid">
          <view
            v-for="cell in monthGrid"
            :key="cell.value"
            class="month-cell"
            :class="{ active: cell.value === selectedMonth }"
            @tap="selectMonth(cell.value)"
          >
            {{ cell.label }}
          </view>
        </view>
        <view class="popup-footer">
          <text class="popup-btn" @tap="$refs.monthPopup.close()">取消</text>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
export default {
  data() {
    return {
      selectedMonth: '',
      popupYear: new Date().getFullYear(),
      selectedStoreId: '',
      storeOptions: [{ label: '全部门店', value: '' }],
      storeCount: 0,
      metrics: {
        shopStats: {},
        serviceStats: {},
        financeStats: {}
      },
      loaded: false,
      refreshing: false
    }
  },
  computed: {
    selectedMonthDisplay() {
      if (!this.selectedMonth) return '请选择'
      const [y, m] = this.selectedMonth.split('-')
      return `${y}年${Number(m)}月`
    },
    storeLabels() {
      return this.storeOptions.map(item => item.label)
    },
    selectedStoreLabel() {
      const match = this.storeOptions.find(item => item.value === this.selectedStoreId)
      return match ? match.label : '全部门店'
    },
    storeCountDisplay() {
      if (this.selectedStoreId) return '当前门店'
      return `${this.storeCount || 0} 家门店`
    },
    monthGrid() {
      return Array.from({ length: 12 }).map((_, idx) => {
        const month = idx + 1
        const value = `${this.popupYear}-${String(month).padStart(2, '0')}`
        return {
          value,
          label: `${month}月`
        }
      })
    }
  },
  onLoad() {
    const now = new Date()
    this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    this.popupYear = now.getFullYear()
    this.fetchStores()
    this.loadStats()
  },
  onPullDownRefresh() {
    this.refreshStats(true).finally(() => {
      if (typeof uni.stopPullDownRefresh === 'function') uni.stopPullDownRefresh()
    })
  },
  methods: {
    openMonthPicker() {
      const [year] = (this.selectedMonth || '').split('-')
      this.popupYear = Number(year) || new Date().getFullYear()
      this.$refs.monthPopup.open()
    },
    changePopupYear(step) {
      this.popupYear += step
    },
    selectMonth(value) {
      this.selectedMonth = value
      this.$refs.monthPopup.close()
      this.loadStats()
    },
    onStoreChange(e) {
      const index = Number(e.detail.value)
      const option = this.storeOptions[index]
      this.selectedStoreId = option ? option.value : ''
      this.loadStats()
    },
    async fetchStores() {
      try {
        const shopsService = uniCloud.importObject('curd-shops')
        const list = await shopsService.listMyShops()
        const data = Array.isArray(list) ? list : (list && list.data) || []
        this.storeOptions = [{ label: '全部门店', value: '' }].concat(
          data.map(item => ({
            label: item.store_name || '未命名门店',
            value: item._id
          }))
        )
      } catch (err) {
        console.error(err)
      }
    },
    async loadStats(force = false) {
      if (!this.selectedMonth) return
      try {
        const stats = uniCloud.importObject('stats')
        const res = await stats.getMonthlyBusinessKpis({
          month: this.selectedMonth,
          storeId: this.selectedStoreId,
          force: !!force
        })
        if (res && res.code === 0 && res.data) {
          this.metrics = {
            shopStats: res.data.shopStats || {},
            serviceStats: res.data.serviceStats || {},
            financeStats: res.data.financeStats || {}
          }
          this.storeCount = res.data.storeCount || 0
          this.loaded = true
        } else {
          this.loaded = false
        }
      } catch (err) {
        this.loaded = false
        uni.showToast({ title: err?.msg || err?.message || '加载失败', icon: 'none' })
      }
    },
    async refreshStats(force = false) {
      if (this.refreshing) return
      this.refreshing = true
      try {
        await this.loadStats(force || true)
        uni.showToast({ title: '已刷新', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e?.msg || e?.message || '刷新失败', icon: 'none' })
      } finally {
        this.refreshing = false
      }
    },
    goAiAnalyst () {
      uni.navigateTo({ url: '/pages/analytics/chat-bi' })
    },
    formatCurrency(value) {
      const num = Number(value || 0)
      if (!num) return '0.00'
      return num.toFixed(2)
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f6f8fb 0%, #ffffff 24%);
  padding: 14px;
  box-sizing: border-box;
}

.overview-card {
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  border-radius: 20px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: 0 12px 36px rgba(14, 165, 233, 0.18);
  color: #f8fafc;
}
.eyebrow {
  font-size: 12px;
  opacity: 0.8;
}
.overview-title {
  margin-top: 4px;
  font-size: 20px;
  font-weight: 700;
}
.overview-desc {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.9;
}
.chips {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}
.chip {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 12px;
}
.chip.ghost {
  background: rgba(255, 255, 255, 0.08);
}
.store-badge {
  background: rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
}
.store-icon {
  font-size: 16px;
}
.store-text {
  font-size: 13px;
}

.inline-filters {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-items: stretch;
}
.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 200px;
}
.filter-label {
  font-size: 12px;
  color: #6b7280;
}
.filter-value {
  background: #f9fafb;
  border-radius: 12px;
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #e5e7eb;
  color: #111827;
  font-size: 14px;
}
.filter-icon {
  font-size: 14px;
  color: #9ca3af;
}

.section {
  margin-top: 18px;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}
.section-sub {
  font-size: 12px;
  color: #9ca3af;
}
.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.card {
  border-radius: 14px;
  padding: 14px 12px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
  border-left: 4px solid transparent;
}
.card-label {
  font-size: 12px;
  color: #6b7280;
}
.card-number {
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.card-number text:first-child {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}
.card-unit {
  font-size: 12px;
  color: #9ca3af;
}

.card.blue { border-color: #60a5fa; background: linear-gradient(135deg, #eef4ff, #e1e9ff); }
.card.green { border-color: #22c55e; background: linear-gradient(135deg, #ecfdf3, #dcfce7); }
.card.orange { border-color: #f97316; background: linear-gradient(135deg, #fff7ed, #ffedd5); }
.card.purple { border-color: #8b5cf6; background: linear-gradient(135deg, #f5f3ff, #ede9fe); }
.card.indigo { border-color: #6366f1; background: linear-gradient(135deg, #eef2ff, #e0e7ff); }
.card.pink { border-color: #ec4899; background: linear-gradient(135deg, #fdf2f8, #fce7f3); }
.card.teal { border-color: #14b8a6; background: linear-gradient(135deg, #ecfeff, #ccfbf1); }
.card.gold { border-color: #f59e0b; background: linear-gradient(135deg, #fff7e6, #fff3c9); }

.cards.finance {
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 12px;
}
.finance-card {
  padding: 16px 14px;
}
.finance-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.finance-number text:first-child {
  font-size: 24px;
}
.finance-note {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}
.pill {
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 12px;
  color: #fff;
}
.pill-positive { background: linear-gradient(135deg, #22c55e, #16a34a); }
.pill-neutral { background: linear-gradient(135deg, #f59e0b, #f97316); }

.empty {
  margin-top: 36px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.month-popup {
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  padding: 16px;
}
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.popup-title {
  font-size: 16px;
  font-weight: 700;
}
.popup-year-control {
  display: flex;
  align-items: center;
  gap: 6px;
}
.year-btn {
  width: 32px;
  text-align: center;
  font-size: 18px;
  color: #111827;
}
.year-text {
  font-size: 14px;
  color: #374151;
}
.month-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.month-cell {
  border-radius: 12px;
  padding: 12px 0;
  text-align: center;
  color: #475569;
  font-size: 15px;
  background: #f8fafc;
  border: 1px solid transparent;
}
.month-cell.active {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
}
.popup-footer {
  margin-top: 10px;
  text-align: right;
}
.popup-btn {
  color: #2563eb;
  font-size: 14px;
}

.ai-entry {
  position: fixed;
  right: 16px;
  bottom: 24px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  color: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.25);
  z-index: 10;
}

.ai-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.ai-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.ai-title {
  font-size: 15px;
  font-weight: 700;
}

.ai-desc {
  font-size: 12px;
  opacity: 0.9;
}

.ai-arrow {
  font-size: 22px;
  opacity: 0.9;
}
</style>
