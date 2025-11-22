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
                <view class="consume-meta">{{ formatConsumeDate(item.consume_date || item.consumed_at || item.service_date) }} · 消耗{{ item.count || item.service_times || 0 }}次</view>
              </view>
              <text class="consume-remaining">{{ renderRemaining(item._remaining) }}</text>
            </view>
            <view class="record-remark" v-if="item.note">{{ item.note }}</view>
          </view>
        </view>
        <view v-else class="placeholder-list"><text class="placeholder-title">暂无消耗记录</text></view>
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
      </view>
    </view>
  </view>
</template>

<script>
// @ts-nocheck
import { getCustomerById, updateCustomer, deleteCustomer as deleteCustomerApi } from '@/api/customers.js'
import { listPurchases } from '@/api/purchases.js'


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
        { label: '图库', value: 'gallery' },
        { label: '备注', value: 'notes' }
      ],
      activeTab: 'purchase',
      purchaseHistory: [],
      consumeHistory: [],
      stats: { total_spend: 0, visit_count: 0 },
      isRefreshing: false,
  
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
    async handlePageRefresh() {
      if (this.isRefreshing) return
      this.isRefreshing = true
      try {
        await this.loadData()
      } finally {
        setTimeout(() => {
          this.isRefreshing = false
        }, 200)
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
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          return trimmed
        }
      }
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
.visit-row { margin-top:6px; font-size:12px; color:#6f6f73; display:flex; gap:6px; align-items:center; }
.visit-value { color:#caa265; font-weight:600; }

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
</style>
