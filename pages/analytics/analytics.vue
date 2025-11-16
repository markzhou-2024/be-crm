<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <picker mode="date" fields="month" @change="onMonthChange">
        <view class="month">{{ month }}</view>
      </picker>

    </view>

    <!-- Loading -->
    <view v-if="loading" class="loading">加载中...</view>

    <!-- Content -->
    <view v-else class="content">

      <!-- Store Section -->
      <view class="section">
        <view class="title">门店数据</view>

        <view class="stats-grid">

          <!-- 总到店次数 -->
          <view class="stat-card">
            <text class="big">{{ formatNumber(storeStats.totalVisits) }}</text>
            <text class="label">总到店次数</text>
            <text class="unit">次</text>
          </view>

          <!-- 新客数量 -->
          <view class="stat-card">
            <text class="big">{{ formatNumber(storeStats.newCustomers) }}</text>
            <text class="label">新客数量</text>
            <text class="unit">人</text>
            <view class="tag">{{ changeText(storeStats.newCustomersChangeRate) }}</view>
          </view>

          <!-- 老客数量 -->
          <view class="stat-card">
            <text class="big">{{ formatNumber(storeStats.oldCustomers) }}</text>
            <text class="label">老客数量</text>
            <text class="unit">人</text>
          </view>

          <!-- 老客到店次数 -->
          <view class="stat-card">
            <text class="big">{{ formatNumber(storeStats.oldCustomersVisits) }}</text>
            <text class="label">老客到店次数</text>
            <text class="unit">次</text>
          </view>
        </view>

        <!-- 老客活跃率 -->
        <view class="active-block">
          <view class="active-header">
            <text class="active-label">老客活跃率</text>
            <text class="active-value">{{ oldActiveRateText }}</text>
          </view>
          <view class="progress">
            <view class="progress-inner" :style="{ width: progressWidth + '%' }"></view>
          </view>
        </view>
      </view>

      <!-- Consultant Section -->
      <view class="section">
        <view class="title">顾问数据</view>
        <view class="stats-grid">

          <!-- 顾问服务次数 -->
          <view class="stat-card">
            <text class="big">{{ formatNumber(consultantStats.visits) }}</text>
            <text class="label">顾问服务次数</text>
            <text class="unit">次</text>
            <view class="tag">{{ changeText(consultantStats.visitsChangeRate) }}</view>
          </view>

          <!-- 门店自主登记次数 -->
          <view class="stat-card">
            <text class="big">{{ formatNumber(storeStats.storeStaffVisits) }}</text>
            <text class="label">门店服务次数</text>
            <text class="unit">次</text>
          </view>

          <!-- 预约数量 -->
          <view class="stat-card">
            <text class="big">{{ formatNumber(consultantStats.calendarBookings) }}</text>
            <text class="label">预约数量</text>
            <text class="unit">条</text>
          </view>

        </view>
      </view>

      <!-- Finance Section -->
      <view class="section">
        <view class="title">财务数据</view>
        <view class="stats-grid">

          <!-- 总消耗金额 -->
          <view class="stat-card">
            <text class="big">{{ formatMoney(financeStats.totalConsumeAmount) }}</text>
            <text class="label">总消耗金额</text>
            <text class="unit">元</text>
            <view class="tag">{{ changeText(financeStats.totalConsumeAmountChangeRate) }}</view>
          </view>

          <!-- 平均单价 -->
          <view class="stat-card">
            <text class="big">{{ formatMoney(financeStats.packageUnitPrice) }}</text>
            <text class="label">平均单价</text>
            <text class="unit">元/次</text>
          </view>

          <!-- 消耗次数 -->
          <view class="stat-card">
            <text class="big">{{ formatNumber(financeStats.totalConsumeCount) }}</text>
            <text class="label">消耗次数</text>
            <text class="unit">次</text>
          </view>

        </view>
      </view>

    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      month: '',
      loading: false,
      overviewData: {
        storeData: {},
        consultantData: {},
        financeData: {}
      }
    }
  },

  computed: {
    storeStats() {
      return this.overviewData.storeData || {}
    },
    consultantStats() {
      return this.overviewData.consultantData || {}
    },
    financeStats() {
      return this.overviewData.financeData || {}
    },

    // -------- 老客活跃率百分比（用于显示文本 + 进度条） --------
    oldActiveRatePercent() {
      const val = this.storeStats.oldCustomersActiveRate
      if (typeof val !== 'number' || !Number.isFinite(val)) return 0
      const pct = val * 100
      return Math.max(0, Math.min(100, pct))
    },
    oldActiveRateText() {
      const val = this.storeStats.oldCustomersActiveRate
      if (typeof val !== 'number' || !Number.isFinite(val)) return 'N'
      return `${this.oldActiveRatePercent.toFixed(1).replace(/\.0$/, '')}%`
    },
    progressWidth() {
      return this.oldActiveRatePercent
    }
  },

  methods: {
    /** 加载统计数据 **/
    async loadData() {
      this.loading = true
      try {
        const obj = uniCloud.importObject('stats', { customUI: true })
        const res = await obj.getMonthlyOverview({
          month: this.month
        })
        if (res.code === 0) {
          this.overviewData = res.data
        }
      } catch (err) {
        console.error(err)
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
      this.loading = false
    },

    /** 月份切换 */
    onMonthChange(e) {
      this.month = e.detail.value
      this.loadData()
    },

    // ---------------------- 格式化函数 ----------------------

    /** 主数字：处理 0、数字、N */
    formatNumber(val, digits = 0) {
      if (val === 'N' || val === null || val === undefined) return 'N'
      const num = Number(val)
      if (!Number.isFinite(num)) return 'N'
      return digits > 0
        ? num.toFixed(digits).replace(/\.0+$/, '')
        : String(num)
    },

    /** 金额：两位小数 + 去掉 .00 */
    formatMoney(val) {
      if (val === 'N' || val === null || val === undefined) return 'N'
      const num = Number(val)
      if (!Number.isFinite(num)) return 'N'
      return num.toFixed(2).replace(/\.00$/, '')
    },

    /** 环比文本 */
    changeText(val) {
      if (val === 'N' || val === null || val === undefined) return '--'
      const num = Number(val)
      if (!Number.isFinite(num)) return '--'
      const pct = (num * 100).toFixed(1).replace(/\.0$/, '')
      const sign = num > 0 ? '+' : ''
      return `${sign}${pct}%`
    }
  },

onLoad() {
  const statsObj = uniCloud.importObject('stats')
  statsObj.debugTypes().then(res => {
    console.log('DEBUG TYPES RESULT:', res)
  })

  this.load()
}

}

</script>

<style scoped>
.page { padding: 20rpx; }

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}
.month { font-size: 32rpx; font-weight: bold; }

/* Sections */
.section { margin-bottom: 40rpx; }
.title { font-size: 30rpx; font-weight: bold; margin-bottom: 20rpx; }

/* Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 25rpx;
}

.stat-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 26rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  position: relative;
}
.big { font-size: 40rpx; font-weight: bold; }
.label { margin-top: 6rpx; font-size: 25rpx; color: #555; }
.unit { font-size: 22rpx; color: #aaa; }

/* 环比标签 */
.tag {
  position: absolute;
  right: 20rpx;
  bottom: 20rpx;
  font-size: 24rpx;
  color: #999;
}

/* 老客活跃率 */
.active-block {
  margin-top: 25rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
}
.active-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}
.active-value {
  font-size: 30rpx;
  font-weight: bold;
}

/* 进度条 */
.progress {
  width: 100%;
  height: 14rpx;
  background: #eee;
  border-radius: 14rpx;
  overflow: hidden;
}
.progress-inner {
  height: 100%;
  background: #3d6afe;
  border-radius: 14rpx;
}
</style>
