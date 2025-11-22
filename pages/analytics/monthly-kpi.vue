<template>
  <view class="page">
    <view class="overview-card">
      <view class="overview-text">
        <text class="overview-title">月度经营指标统计</text>
      </view>
      <view class="store-badge">
        <text class="store-icon">🏬</text>
        <text class="store-text">{{ storeCountDisplay }}</text>
      </view>
    </view>

    <view class="filter-card">
      <view class="filter-item" @tap="openMonthPicker">
        <view class="filter-label">统计月份</view>
        <view class="filter-value">
          <text>{{ selectedMonthDisplay }}</text>
          <text class="filter-icon">⌄</text>
        </view>
      </view>
      <view class="filter-item">
        <view class="filter-label">门店范围</view>
        <picker mode="selector" :range="storeLabels" @change="onStoreChange">
          <view class="filter-value">
            <text>{{ selectedStoreLabel }}</text>
            <text class="filter-icon">⌄</text>
          </view>
        </picker>
      </view>
      <view class="filter-actions">
        <button class="refresh-btn" :disabled="refreshing" @tap="refreshStats">
          {{ refreshing ? '刷新中...' : '数据刷新' }}
        </button>
      </view>
    </view>

    <view class="section" v-if="loaded">
      <view class="section-title">门店数据</view>
      <view class="cards">
        <view class="card blue">
          <text class="card-label">到客服务次数（合计）</text>
          <view class="card-number">
            <text>{{ metrics.shopStats.totalVisitors || 0 }}</text>
            <text class="card-unit">人</text>
          </view>
        </view>
        <view class="card green">
          <text class="card-label">老客来店人次</text>
          <view class="card-number">
            <text>{{ metrics.shopStats.oldCustomerVisitors || 0 }}</text>
            <text class="card-unit">人</text>
          </view>
        </view>
        <view class="card orange">
          <text class="card-label">本月新客增加量</text>
          <view class="card-number">
            <text>{{ metrics.shopStats.newCustomers || 0 }}</text>
            <text class="card-unit">人</text>
          </view>
        </view>
        <view class="card purple">
          <text class="card-label">老客到店服务次数</text>
          <view class="card-number">
            <text>{{ metrics.shopStats.oldCustomerVisitTimes || 0 }}</text>
            <text class="card-unit">次</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-if="loaded">
      <view class="section-title">服务数据</view>
      <view class="cards">
        <view class="card indigo">
          <text class="card-label">顾问到店次数</text>
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
      <view class="section-title">财务数据</view>
      <view class="cards finance">
        <view class="card gold wide">
          <text class="card-label">本月销售金额</text>
          <view class="card-number">
            <text>{{ formatCurrency(metrics.financeStats.monthSalesAmount) }}</text>
            <text class="card-unit">元</text>
          </view>
        </view>
        <view class="card gold wide">
          <text class="card-label">本月消耗金额</text>
          <view class="card-number">
            <text>{{ formatCurrency(metrics.financeStats.monthConsumeAmount) }}</text>
            <text class="card-unit">元</text>
          </view>
        </view>
      </view>
    </view>

    <view class="empty" v-if="!loaded">
      请选择月份查询经营指标
    </view>

    <!-- 月份选择弹窗 -->
    <uni-popup ref="monthPopup" type="bottom">
      <view class="month-popup">
        <view class="popup-header">
          <text class="popup-title">选择月份</text>
          <view class="popup-year-control">
            <text class="year-btn" @tap="changePopupYear(-1)">‹</text>
            <text class="year-text">{{ popupYear }}年</text>
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
    async refreshStats() {
      if (this.refreshing) return
      this.refreshing = true
      try {
        await this.loadStats(true)
        uni.showToast({ title: '已刷新', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e?.msg || e?.message || '刷新失败', icon: 'none' })
      } finally {
        this.refreshing = false
      }
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
  background: #f3f4f6;
  padding: 12px;
}

.overview-card {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  border-radius: 20px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}
.overview-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2333;
}
.overview-desc {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(148, 163, 184, 1);
}
.store-badge {
  background: rgba(15, 23, 42, 0.88);
  border-radius: 999px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
}
.store-icon {
  margin-right: 6px;
}
.store-text {
  color: #e5e7eb;
  font-size: 13px;
}

.filter-card {
  margin-top: 12px;
  background: #ffffff;
  border-radius: 16px;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-item {
  flex: 1;
}
.filter-item + .filter-item {
  margin-left: 12px;
}
.filter-label {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 4px;
}
.filter-value {
  background: #f9fafb;
  border-radius: 999px;
  padding: 6px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-icon {
  font-size: 12px;
  color: #9ca3af;
}

.section {
  margin-top: 16px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}
.cards {
  display: flex;
  flex-wrap: wrap;
  margin: -4px;
}
.card {
  width: calc(50% - 8px);
  margin: 4px;
  border-radius: 16px;
  padding: 12px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}
.card-label {
  font-size: 12px;
  color: #6b7280;
}
.card-number {
  margin-top: 6px;
  display: flex;
  align-items: baseline;
}
.card-number text:first-child {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}
.card-unit {
  margin-left: 4px;
  font-size: 12px;
  color: #9ca3af;
}

/* 颜色卡片 */
.card.blue {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
}
.card.green {
  background: linear-gradient(135deg, #ecfdf3, #dcfce7);
}
.card.orange {
  background: linear-gradient(135deg, #fff7ed, #ffedd5);
}
.card.purple {
  background: linear-gradient(135deg, #f5f3ff, #ede9fe);
}
.card.indigo {
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
}
.card.pink {
  background: linear-gradient(135deg, #fdf2f8, #fce7f3);
}
.card.teal {
  background: linear-gradient(135deg, #ecfeff, #ccfbf1);
}
.card.gold {
  background: linear-gradient(135deg, #fef3c7, #fffbeb);
}

.cards.finance .card.wide {
  width: calc(100% - 8px);
}

.empty {
  margin-top: 40px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

/* 月份弹窗 */
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
  font-weight: 600;
}
.popup-year-control {
  display: flex;
  align-items: center;
}
.year-btn {
  width: 32px;
  text-align: center;
  font-size: 18px;
}
.year-text {
  margin: 0 8px;
  font-size: 14px;
}
.month-grid {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
}
.month-cell {
  width: 25%;
  margin-bottom: 12px;
  border-radius: 12px;
  padding: 12px 0;
  text-align: center;
  color: #475569;
  font-size: 15px;
}
.month-cell.active {
  background: #1d4ed8;
  color: #fff;
}
.popup-footer {
  margin-top: 8px;
  text-align: right;
}
.popup-btn {
  color: #2563eb;
  font-size: 14px;
}
</style>
