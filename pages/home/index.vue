<template>
  <view class="page">
    <view class="greet">今天也要加油哦 ✨</view>

    <view class="grid">
      <stat-tile icon="🏪" :value="stats.store_count" label="门店数" />
      <stat-tile icon="👥" :iconColor="'#20C997'" :value="fmtNum(stats.customer_count)" label="客户数" />
      <stat-tile icon="＄" :iconColor="'#C8A675'" :value="'¥' + kfmt(stats.month_sales)" label="本月销售额" />
      <stat-tile icon="🎫" :value="fmtNum(stats.month_consume_count)" label="本月消耗次数" />
    </view>

    <section-header title="今日预约" linkText="查看全部" @more="goAll" />
    <app-card :padding="'4px 6px'">
      <appointment-item
        v-for="i in todayList"
        :key="i.id"
        :time="i.time"
        :name="i.name"
        :service="i.service"
        :store="i.store"
        @click="goDetail(i)"
      />
      <view v-if="!todayList.length" class="empty">今天暂无预约</view>
    </app-card>
  </view>
</template>

<script>
import AppCard from '@/src/components/ui/AppCard.vue'
import SectionHeader from '@/src/components/ui/SectionHeader.vue'
import StatTile from '@/src/components/metrics/StatTile.vue'
import AppointmentItem from '@/src/components/appointment/AppointmentItem.vue'
import { getHomeStats, getTodayAppointments } from '@/src/services/home.js'

export default {
  name: 'HomePage',
  components: { AppCard, SectionHeader, StatTile, AppointmentItem },
  data () {
    return {
      stats: {
        store_count: 0,
        customer_count: 0,
        month_sales: 0,
        month_consume_count: 0
      },
      todayList: []
    }
  },
  async onShow () {
    await Promise.all([this.loadStats(), this.loadToday()])
  },
  methods: {
    async loadStats () {
      this.stats = await getHomeStats()
    },
    async loadToday () {
      this.todayList = await getTodayAppointments()
    },
    kfmt (n) {
      const v = Number(n || 0)
      return v >= 1000 ? Math.round(v / 1000) + 'K' : v
    },
    fmtNum (n) {
      return Number(n || 0).toLocaleString('zh-CN')
    },
    goAll () {
      uni.navigateTo({ url: '/pages/bookings/index' })
    },
    goDetail (item) {
      uni.navigateTo({ url: `/pages/appointments/detail?id=${item.id}` })
    }
  }
}
</script>

<style scoped lang="scss">
.page { min-height:100vh; background:#F7F7F7; padding:16px; box-sizing:border-box; }
.greet { color:#111; font-weight:600; font-size:18px; margin:4px 0 14px; }
.grid { display:grid; grid-template-columns:1fr 1fr; grid-gap:12px; margin-bottom:14px; }
.empty { text-align:center; color:#6F6F73; font-size:13px; padding:18px 0; }
</style>
