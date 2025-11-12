<template>
  <view class="page">
    <view class="edit-btn" @tap="goEdit">编辑</view>
    <scroll-view
      class="content"
      scroll-y
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="handlePageRefresh"
    >
      <view class="hero">
        <image class="avatar" :src="customer.avatar || defaultAvatar" mode="aspectFill"></image>
        <view class="info">
          <view class="name-row">
            <text class="name">{{ customer.name }}</text>
            <text v-if="customer.is_vip" class="vip-pill">VIP</text>
          </view>
          <view class="tag-row">
            <text v-if="customer.store_name" class="tag">{{ customer.store_name }}</text>
            <text v-if="customer.tags" class="tag">{{ customer.tags }}</text>
            <text class="city" v-if="customer.city">{{ customer.city }}</text>
          </view>
          <view class="phone-row">
            <text class="phone-icon">📞</text>
            <text>{{ customer.phone || '-' }}</text>
          </view>
        </view>
      </view>

      <view class="stat-card">
        <view class="stat">
          <text class="stat-label">累计消费</text>
          <text class="stat-value">¥{{ toAmount(stats.total_spend) }}</text>
        </view>
        <view class="divider"></view>
        <view class="stat">
          <text class="stat-label">到店次数</text>
          <text class="stat-value">{{ stats.visit_count || 0 }} 次</text>
        </view>
      </view>

      <scroll-view class="section-tabs" scroll-x enable-flex>
        <view v-for="tab in tabs" :key="tab.value" class="section-tab" :class="{ active: activeTab === tab.value }" @tap="activeTab = tab.value">
          {{ tab.label }}
        </view>
      </scroll-view>

      <view class="tab-panel" v-if="activeTab === 'purchase'">
        <view v-if="purchaseHistory.length" class="record-list">
          <view class="record-card purchase-card" v-for="item in purchaseHistory" :key="item._id">
            <view class="purchase-head">
              <text class="purchase-title">{{ item.package_name }}</text>
              <text class="purchase-amount">¥{{ toAmount(item.amount) }}</text>
            </view>
            <view class="purchase-sub">{{ item.purchase_date }} · {{ item.service_times }} 次</view>
            <view class="record-remark" v-if="item.remark">{{ item.remark }}</view>
          </view>
        </view>
        <view v-else class="placeholder-list"><text class="placeholder-title">暂无购买记录</text></view>
      </view>

      <view class="tab-panel" v-else-if="activeTab === 'consume'">
        <view v-if="consumeHistory.length" class="record-list">
          <view class="record-card consume-card" v-for="item in consumeHistory" :key="item._id || item.id">
            <view class="consume-row">
              <view>
                <view class="consume-title">{{ item.product_name || item.package_name || '项目' }}</view>
                <view class="consume-meta">{{ formatConsumeDate(item.consumed_at || item.service_date) }} · 消耗{{ item.count || item.service_times || 0 }}次</view>
              </view>
              <text class="consume-remaining">{{ renderRemaining(item._remaining) }}</text>
            </view>
            <view class="record-remark" v-if="item.note">{{ item.note }}</view>
          </view>
        </view>
        <view v-else class="placeholder-list"><text class="placeholder-title">暂无消耗记录</text></view>
      </view>
      <view class="tab-panel" v-else-if="activeTab === 'booking'">
        <view v-if="bookingLoading && !bookingList.length" class="placeholder-list"><text class="placeholder-title">预约加载中...</text></view>
        <view v-else-if="bookingList.length" class="booking-list">
          <view
            class="booking-card"
            v-for="item in bookingList"
            :key="item._id || item.id"
            @longpress="handleBookingActions(item)"
            @tap="handleBookingActions(item)"
            :class="{ updating: bookingStatusUpdating === (item._id || item.id) }"
          >
            <view class="booking-time">
              <text class="booking-time-main">{{ formatBookingTime(item.start_ts) }}</text>
              <text class="booking-date">{{ formatBookingDate(item.start_ts) }}</text>
            </view>
            <view class="booking-info">
              <view class="booking-title">{{ item.service_name || '未命名服务' }}</view>
              <view class="booking-sub">{{ item.store_name || '未选择门店' }}</view>
              <view class="booking-meta">
                <text>{{ formatBookingRange(item.start_ts, item.end_ts) }}</text>
                <text v-if="item.staff_name" class="booking-staff">{{ item.staff_name }}</text>
              </view>
            </view>
            <view class="status-pill" :class="statusClass(item.status)">
              {{ statusLabel(item.status) }}
            </view>
            <text class="booking-arrow">&gt;</text>
          </view>
          <text class="booking-hint">长按预约可标记完成或取消</text>
        </view>
        <view v-else class="placeholder-list"><text class="placeholder-title">暂无预约记录</text></view>
      </view>
      <view class="tab-panel" v-else-if="activeTab === 'gallery'">
        <view class="placeholder-list"><text class="placeholder-line">图库占位</text></view>
      </view>
      <view class="tab-panel" v-else>
        <text class="placeholder-title">备注</text>
        <textarea class="notes" v-model="notesDraft" placeholder="填写备注"></textarea>
        <button class="btn primary" @tap="saveNotes">保存备注</button>
      </view>

    </scroll-view>
    <view class="cta-bar">
      <view class="cta-buttons">
        <button class="btn fab-btn" @tap="goPurchase">＋ 购买</button>
        <button class="btn fab-btn" @tap="goConsume">＋ 消耗</button>
        <button class="btn fab-btn gold" @tap="goBookingCreate">＋ 预约</button>
      </view>
    </view>
  </view>
</template>

<script>
// @ts-nocheck
import { getCustomerById, updateCustomer, deleteCustomer as deleteCustomerApi } from '@/api/customers.js'
import { listPurchases } from '@/api/purchases.js'
import { listBookingsByCustomer, updateBookingStatus as updateBookingStatusApi } from '@/api/bookings.js'

export default {
  data() {
    return {
      id: '',
      customer: {},
      notesDraft: '',
      defaultAvatar: 'https://cdn.uviewui.com/uview/album/1.jpg',
      tabs: [
        { label: '购买', value: 'purchase' },
        { label: '消耗', value: 'consume' },
        { label: '预约', value: 'booking' },
        { label: '图库', value: 'gallery' },
        { label: '备注', value: 'notes' }
      ],
      activeTab: 'purchase',
      purchaseHistory: [],
      consumeHistory: [],
      stats: { total_spend: 0, visit_count: 0 },
      bookingList: [],
      bookingLoading: false,
      bookingLoaded: false,
      bookingStatusUpdating: '',
      isRefreshing: false
    }
  },
  watch: {
    activeTab(newVal) {
      if (newVal === 'booking') {
        this.ensureBookingLoaded()
      }
    }
  },
  onLoad(query) {
    this.id = (query && query.id) || ''
    if (!this.id) {
      uni.showToast({ title: '缺少客户ID', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 400)
      return
    }
    this.loadData()
  },
  onShow() {
    if (this.id) {
      this.loadCustomerStats()
      if (this.activeTab === 'booking' && this.bookingLoaded) {
        this.loadBookings({ force: true, silent: true })
      }
    }
  },
  methods: {
    async loadData() {
      try {
        const data = await getCustomerById(this.id)
        if (!data) {
          uni.showToast({ title: '客户不存在', icon: 'none' })
          setTimeout(() => uni.navigateBack(), 400)
          return
        }
        this.customer = data
        this.notesDraft = data.notes || ''
        uni.setNavigationBarTitle({ title: data.name || '客户详情' })
        await Promise.all([
          this.loadCustomerStats(),
          this.loadPurchaseHistory(),
          this.loadConsumeHistory()
        ])
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '加载失败', icon: 'none' })
      }
    },
    async loadCustomerStats() {
      const fallback = { total_spend: 0, visit_count: 0 }
      try {
        const obj = uniCloud.importObject('stats-customer', { customUI: true })
        const cid = this.customer._id || this.customer.id || this.id
        if (!cid) {
          this.updateStatsState(fallback)
          return
        }
        const res = await obj.summary({ customer_id: cid })
        const next = (res && res.code === 0 && res.data)
          ? {
              total_spend: Number(res.data.total_spend) || 0,
              visit_count: Number(res.data.visit_count) || 0
            }
          : fallback
        this.updateStatsState(next)
      } catch (e) {
        this.updateStatsState(fallback)
      }
    },
    async loadPurchaseHistory() {
      try {
        const list = await listPurchases(this.id)
        this.purchaseHistory = list
        this.decorateConsumeRecords()
      } catch (err) {
        console.log('load purchase failed', err)
        this.purchaseHistory = []
      }
    },
    async loadConsumeHistory() {
      try {
        const service = uniCloud.importObject('curd-consume', { customUI: true })
        const res = await service.listByCustomer({ customer_id: this.id })
        this.consumeHistory = this.normalizeCloudList(res)
        this.decorateConsumeRecords()
      } catch (err) {
        console.log('load consume failed', err)
        this.consumeHistory = []
      }
    },
    normalizeCloudList(payload) {
      if (Array.isArray(payload)) return payload
      if (Array.isArray(payload?.data)) return payload.data
      if (Array.isArray(payload?.result?.data)) return payload.result.data
      return []
    },
    goEdit() {
      uni.navigateTo({ url: `/pages/my-customers/edit?id=${this.id}` })
    },
    goPurchase() {
      uni.navigateTo({
        url: '/pages/purchases/create',
        events: {
          purchaseCreated: async () => {
            await Promise.all([this.loadPurchaseHistory(), this.loadCustomerStats()])
            uni.showToast({ title: '已记录购买', icon: 'success' })
          }
        },
        success: res => {
          res.eventChannel.emit('initCustomerInfo', {
            customerId: this.id,
            customerName: this.customer.name
          })
        }
      })
    },
    goConsume() {
      const cid = this.customer._id || this.customer.id || this.id
      if (!cid) {
        uni.showToast({ title: '缺少客户ID', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: `/pages/purchases/consume?customer_id=${cid}&customer_name=${encodeURIComponent(this.customer.name || '')}`,
        events: {
          consumeSaved: async () => {
            await Promise.all([this.loadConsumeHistory(), this.loadCustomerStats()])
            uni.showToast({ title: '消耗已记录', icon: 'success' })
          }
        }
      })
    },
    goBookingCreate() {
      const cid = this.customer._id || this.customer.id || this.id
      if (!cid) {
        uni.showToast({ title: '缺少客户ID', icon: 'none' })
        return
      }
      const name = encodeURIComponent(this.customer.name || '')
      uni.navigateTo({
        url: `/pages/bookings/create?customer_id=${cid}&customer_name=${name}`,
        events: {
          bookingCreated: () => {
            this.activeTab = 'booking'
            this.loadBookings({ force: true })
          }
        }
      })
    },
    async handlePageRefresh() {
      if (this.isRefreshing) return
      this.isRefreshing = true
      try {
        await this.loadData()
        if (this.activeTab === 'booking' || this.bookingLoaded) {
          await this.loadBookings({ force: true, silent: true })
        }
      } finally {
        setTimeout(() => {
          this.isRefreshing = false
        }, 200)
      }
    },
    ensureBookingLoaded() {
      if (!this.bookingLoaded && !this.bookingLoading) {
        this.loadBookings()
      }
    },
    async loadBookings(options = {}) {
      if (!this.id) return
      const { force = false, silent = false } = options
      if (this.bookingLoading) return
      if (this.bookingLoaded && !force) return
      const shouldShowLoading = !this.bookingLoaded || !silent
      if (shouldShowLoading) {
        this.bookingLoading = true
      }
      try {
        const list = await listBookingsByCustomer({ customer_id: this.id })
        const next = (list || []).slice().sort((a, b) => {
          return Number(b.start_ts || 0) - Number(a.start_ts || 0)
        })
        this.bookingList = next
        this.bookingLoaded = true
      } catch (err) {
        if (!silent) {
          uni.showToast({ title: err?.errMsg || err?.message || '预约加载失败', icon: 'none' })
        }
      } finally {
        if (shouldShowLoading) {
          this.bookingLoading = false
        }
      }
    },
    formatBookingTime(ts) {
      if (!ts) return '--:--'
      const date = new Date(Number(ts))
      if (Number.isNaN(date.getTime())) return '--:--'
      const h = `${date.getHours()}`.padStart(2, '0')
      const m = `${date.getMinutes()}`.padStart(2, '0')
      return `${h}:${m}`
    },
    formatBookingDate(ts) {
      if (!ts) return '--'
      const date = new Date(Number(ts))
      if (Number.isNaN(date.getTime())) return '--'
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}月${day}日`
    },
    formatBookingRange(start, end) {
      const startLabel = this.formatBookingTime(start)
      const endLabel = end ? this.formatBookingTime(end) : ''
      return endLabel ? `${startLabel} - ${endLabel}` : startLabel
    },
    statusLabel(status) {
      const map = { scheduled: '待到店', completed: '已完成', canceled: '已取消' }
      return map[status] || map.scheduled
    },
    statusClass(status) {
      return {
        scheduled: 'scheduled',
        completed: 'completed',
        canceled: 'canceled'
      }[status] || 'scheduled'
    },
    handleBookingActions(item) {
      if (!item) return
      const options = []
      if (item.status !== 'completed') {
        options.push({ label: '标记完成', value: 'completed' })
      }
      if (item.status !== 'canceled') {
        options.push({ label: '取消预约', value: 'canceled' })
      }
      if (!options.length) return
      uni.showActionSheet({
        itemList: options.map(opt => opt.label),
        success: res => {
          const choice = options[res.tapIndex]
          if (choice) {
            this.confirmBookingStatus(item, choice.value)
          }
        }
      })
    },
    confirmBookingStatus(item, status) {
      const text = status === 'completed' ? '确定将该预约标记为已完成？' : '确定取消该预约吗？'
      uni.showModal({
        title: '更新预约状态',
        content: text,
        success: res => {
          if (res.confirm) {
            this.applyBookingStatus(item, status)
          }
        }
      })
    },
    async applyBookingStatus(item, status) {
      const bookingId = item?._id || item?.id
      if (!bookingId) return
      if (this.bookingStatusUpdating) return
      this.bookingStatusUpdating = bookingId
      try {
        await updateBookingStatusApi({ booking_id: bookingId, status })
        uni.showToast({ title: '状态已更新', icon: 'success' })
        await this.loadBookings({ force: true, silent: true })
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '状态更新失败', icon: 'none' })
      } finally {
        this.bookingStatusUpdating = ''
      }
    },
    async saveNotes() {
      try {
        await updateCustomer({ _id: this.id, notes: this.notesDraft })
        this.customer.notes = this.notesDraft
        uni.showToast({ title: '备注已保存', icon: 'success' })
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '保存失败', icon: 'none' })
      }
    },
    confirmDelete() {
      uni.showModal({
        title: '删除客户',
        content: '删除后不可恢复，确定删除？',
        confirmText: '删除',
        confirmColor: '#dd524d',
        success: res => {
          if (res.confirm) {
            this.deleteCustomer()
          }
        }
      })
    },
    async deleteCustomer() {
      try {
        await deleteCustomerApi(this.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 400)
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '删除失败', icon: 'none' })
      }
    },
    toAmount(n) {
      try {
        return Number(n || 0).toLocaleString('zh-CN')
      } catch (e) {
        return n
      }
    },
    formatConsumeDate(value) {
      if (!value) return '--'
      const date = typeof value === 'number' || /^\d+$/.test(value)
        ? new Date(Number(value))
        : new Date(value)
      if (Number.isNaN(date.getTime())) return '--'
      const m = `${date.getMonth() + 1}`.padStart(2, '0')
      const d = `${date.getDate()}`.padStart(2, '0')
      return `${date.getFullYear()}-${m}-${d}`
    },
    decorateConsumeRecords() {
      if (!this.consumeHistory || !this.consumeHistory.length) return
      const purchaseMap = {}
      this.purchaseHistory.forEach(item => {
        const key = item._id || item.id
        if (!key) return
        purchaseMap[key] = {
          total: Number(item.service_times) || 0,
          remaining: Number(item.service_times) || 0
        }
      })
      const grouped = {}
      this.consumeHistory.forEach(record => {
        const bid = record.buy_id || record.buyId || record.buyID || ''
        grouped[bid] = grouped[bid] || []
        grouped[bid].push(record)
      })
      Object.keys(grouped).forEach(bid => {
        const list = grouped[bid]
        list.sort((a, b) => {
          const at = Number(a.consumed_at || a.create_time || 0)
          const bt = Number(b.consumed_at || b.create_time || 0)
          return at - bt
        })
        const totalInfo = purchaseMap[bid]
        let remain = totalInfo ? totalInfo.total : null
        list.forEach(item => {
          if (remain === null || remain === undefined) {
            item._remaining = null
            return
          }
          const cost = Number(item.count || item.service_times || 0)
          remain = Math.max(0, remain - cost)
          item._remaining = remain
        })
      })
      this.consumeHistory = [...this.consumeHistory]
    },
    renderRemaining(value) {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return '剩余--次'
      }
      return `剩余${value}次`
    },
    updateStatsState(stats) {
      const safeStats = stats || { total_spend: 0, visit_count: 0 }
      this.stats = safeStats
      if (!this.customer || typeof this.customer !== 'object') {
        this.customer = {
          ...(this.customer || {}),
          total_spend: safeStats.total_spend,
          visit_count: safeStats.visit_count
        }
        return
      }
      if (typeof this.$set === 'function') {
        this.$set(this.customer, 'total_spend', safeStats.total_spend)
        this.$set(this.customer, 'visit_count', safeStats.visit_count)
      } else {
        this.customer = {
          ...this.customer,
          total_spend: safeStats.total_spend,
          visit_count: safeStats.visit_count
        }
      }
    }
  }
}
</script>

<style scoped>
.page { min-height:100vh; background:#f6f7f9; position:relative; }
.content { height:100vh; padding:16px; padding-bottom:140px; box-sizing:border-box; }
.hero { display:flex; gap:12px; align-items:center; background:#fff; border-radius:20px; padding:16px; box-shadow:0 10px 24px rgba(0,0,0,.04); }
.hero .avatar { width:72px; height:72px; border-radius:36px; background:#eee; }
.info { flex:1; }
.name-row { display:flex; align-items:center; gap:8px; }
.name { font-size:20px; font-weight:600; color:#222; }
.vip-pill { font-size:12px; padding:2px 8px; border-radius:12px; background:#f3e7d3; color:#caa265; }
.tag-row { margin-top:6px; display:flex; gap:8px; color:#9a9aa0; font-size:12px; }
.tag-row .tag { background:#f6f6f8; padding:2px 8px; border-radius:10px; }
.phone-row { margin-top:6px; font-size:14px; color:#555; display:flex; gap:6px; }
.phone-icon { color:#b7b7bc; }

.stat-card { margin-top:16px; background:#fff; border-radius:20px; padding:16px; display:flex; align-items:center; justify-content:space-between; }
.stat { flex:1; text-align:center; }
.stat-label { display:block; color:#9a9aa0; font-size:12px; margin-bottom:6px; }
.stat-value { font-size:18px; font-weight:700; color:#333; }
.divider { width:1px; height:36px; background:#f0f0f2; }

.section-tabs { margin-top:18px; white-space:nowrap; }
.section-tab { display:inline-flex; align-items:center; justify-content:center; height:34px; padding:0 14px; margin-right:10px; border-radius:17px; background:#fff; color:#666; font-size:13px; box-shadow:0 2px 6px rgba(0,0,0,0.04); }
.section-tab.active { background:#caa265; color:#fff; font-weight:600; }

.tab-panel { margin-top:14px; background:#fff; border-radius:20px; padding:16px; box-shadow:0 4px 12px rgba(0,0,0,0.03); }
.record-list { display:flex; flex-direction:column; gap:10px; }
.record-card { background:#fdfdfd; border-radius:16px; padding:12px; box-shadow:0 2px 6px rgba(0,0,0,0.03); }
.purchase-card { padding:14px 16px; }
.purchase-head { display:flex; justify-content:space-between; align-items:center; }
.purchase-title { font-size:14px; color:#333; font-weight:600; }
.purchase-amount { font-size:14px; color:#caa265; }
.consume-count { font-size:14px; color:#caa265; font-weight:600; }
.consume-card { padding:14px 16px; border-radius:18px; box-shadow:0 6px 20px rgba(0,0,0,0.04); }
.consume-row { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
.consume-title { font-size:15px; font-weight:600; color:#333; }
.consume-meta { margin-top:6px; font-size:12px; color:#999; }
.consume-remaining { font-size:13px; color:#caa265; white-space:nowrap; }
.purchase-sub { margin-top:8px; font-size:12px; color:#9a9aa0; }
.record-remark { margin-top:4px; font-size:12px; color:#9a9aa0; }
.placeholder-title { font-size:14px; color:#333; font-weight:600; }
.placeholder-line { display:block; margin-top:4px; color:#9a9aa0; font-size:12px; }
.notes { width:100%; min-height:100px; margin:12px 0; background:#f6f7f9; border-radius:12px; padding:10px; box-sizing:border-box; }

.btn { height:42px; border-radius:22px; font-size:15px; margin-top:8px; }
.primary { background:#caa265; color:#fff; }
.ghost { background:#fff; color:#caa265; border:1px solid #eedfc4; }
.danger { color:#dd524d; border-color:#f6c8cd; }
.mt16 { margin-top:16px; }
.cta-bar { position:fixed; left:0; right:0; bottom:0; padding:12px 16px calc(env(safe-area-inset-bottom) + 12px); background:#f6f7f9; box-shadow:0 -6px 18px rgba(0,0,0,0.08); z-index:10; }
.cta-buttons { display:flex; justify-content:space-between; gap:12px; }
.fab-btn { flex:1; background:#fff; border-radius:24px; border:1px solid #eee; color:#333; height:42px; }
.fab-btn.gold { background:#caa265; color:#fff; border:none; }

.edit-btn { position:fixed; right:16px; top:12px; color:#caa265; padding:6px 12px; background:#fff; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.06); z-index:11; }
.booking-list { display:flex; flex-direction:column; gap:12px; }
.booking-card { display:flex; align-items:flex-start; background:#fdfdfd; border-radius:22px; padding:14px 16px; box-shadow:0 4px 18px rgba(0,0,0,0.04); }
.booking-card.updating { opacity:0.6; }
.booking-time { width:80px; }
.booking-time-main { font-size:22px; font-weight:600; color:#111; }
.booking-date { font-size:12px; color:#9a9aa0; margin-top:4px; display:block; }
.booking-info { flex:1; margin-left:12px; }
.booking-title { font-size:15px; font-weight:600; color:#1c1c1e; }
.booking-sub { font-size:13px; color:#6f6f73; margin-top:4px; }
.booking-meta { margin-top:6px; font-size:12px; color:#a1a1a6; display:flex; gap:12px; flex-wrap:wrap; }
.booking-staff { color:#caa265; }
.status-pill { padding:4px 12px; border-radius:999px; font-size:12px; font-weight:600; border:1px solid transparent; white-space:nowrap; }
.status-pill.scheduled { color:#caa265; border-color:#f0dac0; background:rgba(202,162,101,0.08); }
.status-pill.completed { color:#20c997; border-color:rgba(32,201,151,0.3); background:rgba(32,201,151,0.08); }
.status-pill.canceled { color:#8e8e93; border-color:#dcdce0; background:#f5f5f7; }
.booking-arrow { font-size:18px; color:#c7c7cc; margin-left:8px; }
.booking-hint { margin-top:8px; display:block; text-align:center; color:#a1a1a6; font-size:12px; }
</style>
