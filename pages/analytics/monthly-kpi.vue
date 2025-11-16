<template>
  <view class="page">
    <view class="overview-card">
      <view class="overview-text">
        <text class="overview-title">月度经营指标统计</text>
        <text class="overview-desc">
          {{ loaded ? `统计月份：${selectedMonthDisplay}` : '请选择月份查询经营指标' }}
        </text>
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
          <text class="filter-icon">📅</text>
        </view>
      </view>
      <view class="filter-item">
        <view class="filter-label">选择门店</view>
        <picker class="filter-picker" mode="selector" :range="storeLabels" @change="onStoreChange">
          <view class="filter-value">
            <text>{{ selectedStoreLabel }}</text>
            <text class="filter-icon">⌄</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="section" v-if="loaded">
      <view class="section-title">门店数据</view>
      <view class="cards">
        <view class="card blue">
          <text class="card-label">到客数量</text>
          <view class="card-number">
            <text>{{ metrics.shopStats.total_visitors || 0 }}</text>
            <text class="card-unit">人</text>
          </view>
        </view>
        <view class="card green">
          <text class="card-label">老客到店量</text>
          <view class="card-number">
            <text>{{ metrics.shopStats.old_customer_visitors || 0 }}</text>
            <text class="card-unit">人</text>
          </view>
        </view>
        <view class="card orange">
          <text class="card-label">新客数量</text>
          <view class="card-number">
            <text>{{ metrics.shopStats.new_customers || 0 }}</text>
            <text class="card-unit">人</text>
          </view>
        </view>
        <view class="card purple">
          <text class="card-label">老客到店次数</text>
          <view class="card-number">
            <text>{{ metrics.shopStats.old_customer_visit_times || 0 }}</text>
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
            <text>{{ metrics.serviceStats.consultant_visits || 0 }}</text>
            <text class="card-unit">次</text>
          </view>
        </view>
        <view class="card pink">
          <text class="card-label">顾问服务次数</text>
          <view class="card-number">
            <text>{{ metrics.serviceStats.consultant_services || 0 }}</text>
            <text class="card-unit">次</text>
          </view>
        </view>
        <view class="card cyan">
          <text class="card-label">门店自主服务次数</text>
          <view class="card-number">
            <text>{{ metrics.serviceStats.store_self_services || 0 }}</text>
            <text class="card-unit">次</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-if="loaded">
      <view class="section-title">财务数据</view>
      <view class="cards">
        <view class="card yellow wide">
          <text class="card-label">本月销售额</text>
          <view class="card-number">
            <text>{{ formatCurrency(metrics.financeStats.month_sales_amount) }}</text>
            <text class="card-unit">元</text>
          </view>
        </view>
        <view class="card gold wide">
          <text class="card-label">本月消耗金额</text>
          <view class="card-number">
            <text>{{ formatCurrency(metrics.financeStats.month_consume_amount) }}</text>
            <text class="card-unit">元</text>
          </view>
        </view>
      </view>
    </view>

    <view class="empty" v-if="!loaded">
      请选择月份查询经营指标
    </view>

    <uni-popup ref="monthPopup" type="bottom">
      <view class="popup">
        <view class="popup-header">
          <text class="popup-btn" @tap="changePopupYear(-1)">上一年</text>
          <text class="popup-year">{{ popupYear }}</text>
          <text class="popup-btn" @tap="changePopupYear(1)">下一年</text>
        </view>
        <view class="popup-grid">
          <view
            v-for="item in monthGrid"
            :key="item.value"
            class="month-cell"
            :class="{ active: item.value === selectedMonth }"
            @tap="selectMonth(item.value)"
          >
            {{ item.label }}
          </view>
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
      loaded: false
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
        const month = String(idx + 1).padStart(2, '0')
        return {
          value: `${this.popupYear}-${month}`,
          label: `${idx + 1}月`
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
    async loadStats() {
      if (!this.selectedMonth) return
      try {
        const stats = uniCloud.importObject('stats')
        const res = await stats.getMonthlyBusinessKpis({
          month: this.selectedMonth,
          storeId: this.selectedStoreId
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
    formatCurrency(value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num)) return '0.00'
      return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f2f4fb;
  padding: 16px;
  box-sizing: border-box;
}
.overview-card {
  background: linear-gradient(135deg, #eef4ff, #fef6fb);
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
  color: #6b7280;
}
.store-badge {
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 12px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #475569;
}
.filter-card {
  margin-top: 16px;
  background: #fff;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.filter-item {
  display: flex;
  flex-direction: column;
}
.filter-label {
  font-size: 12px;
  color: #9aa0ac;
  margin-bottom: 6px;
}
.filter-value {
  background: #f4f6fb;
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  color: #1f2333;
}
.filter-icon {
  font-size: 18px;
  color: #9aa0ac;
}
.section {
  margin-top: 20px;
}
.section-title {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 10px;
}
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.card {
  flex: 1 1 calc(50% - 12px);
  min-width: 150px;
  background: #fff;
  border-radius: 18px;
  padding: 16px;
  color: #1f2333;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}
.card.wide {
  flex: 1 1 100%;
}
.card-label {
  font-size: 13px;
  color: #475569;
}
.card-number {
  margin-top: 12px;
  font-size: 26px;
  font-weight: 600;
  color: inherit;
}
.card-unit {
  margin-left: 4px;
  font-size: 14px;
  color: inherit;
}
.card.blue {
  background: linear-gradient(135deg, #eef3ff, #dbe8ff);
  color: #3b82f6;
}
.card.green {
  background: linear-gradient(135deg, #e9fbf1, #d0f8e3);
  color: #16a34a;
}
.card.orange {
  background: linear-gradient(135deg, #fff1e8, #ffe2cf);
  color: #f97316;
}
.card.purple {
  background: linear-gradient(135deg, #f7edff, #ede4ff);
  color: #a855f7;
}
.card.indigo {
  background: linear-gradient(135deg, #eef2ff, #dde5ff);
  color: #6366f1;
}
.card.pink {
  background: linear-gradient(135deg, #fff0f6, #ffdced);
  color: #ec4899;
}
.card.cyan {
  background: linear-gradient(135deg, #e7fbff, #d1f7fb);
  color: #06b6d4;
}
.card.yellow {
  background: linear-gradient(135deg, #fff7e5, #ffefcc);
  color: #d97706;
}
.card.gold {
  background: linear-gradient(135deg, #fff4e8, #ffe6cc);
  color: #c2410c;
}
.empty {
  margin-top: 60px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}
.popup {
  background: #fff;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 16px;
}
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  color: #475569;
}
.popup-year {
  font-size: 16px;
  font-weight: 600;
  color: #1f2333;
}
.popup-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.month-cell {
  background: #f4f6fb;
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
.popup-btn {
  color: #2563eb;
}
</style>
