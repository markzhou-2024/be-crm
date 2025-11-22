<template>
  <view class="page">
    <view class="header">
      <view class="title">客户管理</view>

      <view class="search-row">
        <view class="search">
          <text class="search-icon">🔍</text>
          <input
            class="search-input"
            v-model="keyword"
            placeholder="姓名搜索"
            placeholder-style="color:#b9b9bd"
            confirm-type="search"
            @confirm="applyFilter(true)"
          />
          <text v-if="keyword" class="clear" @tap="clearSearch">✕</text>
        </view>
        <picker
          class="shop-picker"
          mode="selector"
          :range="shopPickerOptions"
          range-key="label"
          :value="shopPickerIndex"
          @change="onShopPickerChange"
        >
          <view class="shop-picker-field">
            <text class="shop-picker-text">{{ shopPickerOptions[shopPickerIndex]?.label || '全部门店' }}</text>
            <text class="picker-arrow">⌄</text>
          </view>
        </picker>
      </view>

      <scroll-view class="tabs" scroll-x enable-flex>
        <view
          v-for="t in tabs"
          :key="t.value"
          class="tab"
          :class="{ active: activeTab === t.value }"
          @tap="switchTab(t.value)"
        >{{ t.label }}</view>
      </scroll-view>

    </view>

    <scroll-view
      class="list"
      scroll-y
      :lower-threshold="80"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <block v-for="c in visibleList" :key="c._id">
        <view class="card" @tap="openDetail(c)" @longpress="onLongPress(c)">
          <view class="badge new" v-if="isNewCustomer(c)">新客户</view>
          <view class="row-top">
            <image class="avatar" :src="c.avatar || defaultAvatar" mode="aspectFill"></image>
            <view class="base">
              <view class="name">
                <text>{{ c.name }}</text>
                <text v-if="c.is_vip" class="vip">VIP</text>
              </view>
              <view class="store" v-if="c.store_name">
                <text class="store-icon">🏬</text>
                <text>{{ c.store_name }}</text>
              </view>
            </view>
            <text class="arrow">›</text>
          </view>

          <view class="row-bottom">
            <view class="meta">
              <text class="meta-icon">🕒</text>
              <text class="meta-gray">上次到店</text>
              <text class="meta-strong">{{ formatDate(c.last_visit_at) || '-' }}</text>
            </view>
            <view class="spend">
              <text class="meta-icon gold">￥</text>
              <text class="meta-gray">累计消费</text>
              <text class="amount">¥{{ toAmount(c.total_spend) }}</text>
            </view>
          </view>
        </view>
      </block>

      <view v-if="!visibleList.length && !loading && !refreshing" class="empty">
        暂无客户
      </view>
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="!hasMore && visibleList.length" class="loading end">已到底</view>
    </scroll-view>

    <view class="fab" @tap="goCreate">
      <image class="fab-img" src="/static/tabbar/新增.png" mode="aspectFit" />
      <text class="fab-text">新增客户</text>
    </view>
  </view>
</template>

<script>
// @ts-nocheck
import { fetchCustomers, deleteCustomer as deleteCustomerApi } from '@/api/customers.js'
import { listPurchases } from '@/api/purchases.js'
import { filterByStoreId } from '@/utils/customersStore.js'
import { fetchShops } from '@/api/shops.js'

export default {
  data() {
    return {
      defaultAvatar: 'https://cdn.uviewui.com/uview/album/1.jpg',
      keyword: '',
      activeTab: 'all',
      tabs: [
        { label: '全部客户', value: 'all' },
        { label: 'VIP客户', value: 'vip' },
        { label: '活跃客户', value: 'active' }
      ],
      activeShopId: '',
      shopOptions: [{ label: '全部门店', value: '' }],
      shopPickerIndex: 0,
      list: [],
      filtered: [],
      visibleList: [],
      page: 1,
      pageSize: 10,
      hasMore: true,
      loading: false,
      refreshing: false
    }
  },
  onLoad(query) {
    this.activeShopId = (query && query.store_id) || ''
    this.initShops()
  },
  onShow() {
    this.applyStoredShopFilter()
    this.initShops()
    this.initData()
  },
  computed: {
    shopPickerOptions() {
      return this.shopOptions && this.shopOptions.length
        ? this.shopOptions
        : [{ label: '全部门店', value: '' }]
    }
  },
  methods: {
    async initShops() {
      try {
        const list = await fetchShops()
        const mapped = (list || []).map(item => ({
          label: item.store_name || item.name || '未命名门店',
          value: item._id || item.id || ''
        })).filter(item => item.value)
        this.shopOptions = [{ label: '全部门店', value: '' }, ...mapped]
      } catch (err) {
        console.log('load shops failed', err)
        this.shopOptions = [{ label: '全部门店', value: '' }]
      }
      if (!this.shopOptions.find(opt => opt.value === this.activeShopId)) {
        this.activeShopId = ''
      }
      this.syncShopPicker()
    },
    applyStoredShopFilter() {
      try {
        const stored = uni.getStorageSync('customer_store_filter')
        if (stored && stored.store_id) {
          this.activeShopId = stored.store_id
          uni.removeStorageSync('customer_store_filter')
        }
      } catch (e) {}
    },
    syncShopPicker() {
      const options = this.shopPickerOptions || []
      const idx = options.findIndex(opt => opt.value === this.activeShopId)
      this.shopPickerIndex = idx >= 0 ? idx : 0
    },
    onShopPickerChange(e) {
      const idx = Number(e?.detail?.value)
      if (Number.isNaN(idx)) return
      this.shopPickerIndex = idx
      const option = this.shopPickerOptions[idx]
      this.activeShopId = option?.value || ''
      this.applyFilter(true)
    },
    async initData() {
      this.loading = true
      try {
        const list = await fetchCustomers()
        const withSpend = await this.attachTotalSpend(list)
        this.decorate(withSpend)
        this.list = withSpend
        this.applyFilter(true)
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    decorate(list) {
      (list || []).forEach(item => {
        const days = Number(item.last_visit_days)
        if (isNaN(days)) {
          item.last_visit_label = '-'
        } else if (days === 0) {
          item.last_visit_label = '今天'
        } else if (days === 1) {
          item.last_visit_label = '昨天'
        } else if (days === 7) {
          item.last_visit_label = '1周前'
        } else {
          item.last_visit_label = `${days}天前`
        }
      })
    },
    onRefresh() {
      this.refreshing = true
      setTimeout(() => {
        this.initData()
        this.refreshing = false
      }, 400)
    },
    switchTab(value) {
      this.activeTab = value
      this.applyFilter(true)
    },
    clearSearch() {
      this.keyword = ''
      this.applyFilter(true)
    },
    applyFilter(resetPage = false) {
      let list = this.list.slice()
      if (this.activeTab === 'vip') {
        list = list.filter(item => !!item.is_vip)
      } else if (this.activeTab === 'active') {
        list = list.filter(item => (item.last_visit_days || 0) <= 7)
      }
      const kw = (this.keyword || '').trim()
      if (kw) {
        list = list.filter(item => {
          const name = item.name || ''
          return name.indexOf(kw) >= 0
        })
      }
      list = filterByStoreId(list, this.activeShopId)
      this.filtered = list
      if (resetPage) {
        this.page = 1
        this.hasMore = true
      }
      this.visibleList = list.slice(0, this.page * this.pageSize)
      if (this.visibleList.length >= list.length) {
        this.hasMore = false
      }
    },
    async attachTotalSpend(list) {
      const mapped = list || []
      const tasks = mapped.map(async c => {
        try {
          const purchases = await listPurchases(c._id || c.id)
          const sum = (purchases || []).reduce((acc, cur) => acc + Number(cur.amount || 0), 0)
          return { ...c, total_spend: sum }
        } catch (e) {
          return c
        }
      })
      return Promise.all(tasks)
    },
    loadMore() {
      if (!this.hasMore || this.loading) return
      if (this.visibleList.length >= this.filtered.length) return
      this.page += 1
      this.visibleList = this.filtered.slice(0, this.page * this.pageSize)
      if (this.visibleList.length >= this.filtered.length) {
        this.hasMore = false
      }
    },
    formatDate(value) {
      if (!value) return ''
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      const m = `${d.getMonth() + 1}`.padStart(2, '0')
      const day = `${d.getDate()}`.padStart(2, '0')
      return `${d.getFullYear()}-${m}-${day}`
    },
    goCreate() {
      uni.navigateTo({ url: '/pages/my-customers/create' })
    },
    openDetail(item) {
      uni.navigateTo({ url: `/pages/my-customers/detail?id=${item._id}` })
    },
    onLongPress(item) {
      uni.showActionSheet({
        itemList: ['删除客户'],
        success: () => {
          this.confirmDelete(item)
        }
      })
    },
    confirmDelete(item) {
      uni.showModal({
        title: '删除确认',
        content: `确定删除「${item.name}」吗？`,
        confirmText: '删除',
        confirmColor: '#dd524d',
        success: res => {
          if (res.confirm) {
            this.deleteCustomer(item._id)
          }
        }
      })
    },
    async deleteCustomer(id) {
      try {
        await deleteCustomerApi(id)
        this.list = this.list.filter(item => item._id !== id)
        this.applyFilter(true)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '删除失败', icon: 'none' })
      }
    },
    maskPhone(phone) {
      if (!phone) return ''
      return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
    },
    toAmount(n) {
      try {
        return Number(n || 0).toLocaleString('zh-CN')
      } catch (e) {
        return n
      }
    },
    isNewCustomer(c) {
      const ts = (typeof c.first_purchase_at === 'number')
        ? c.first_purchase_at
        : (c.first_purchase_at ? Date.parse(c.first_purchase_at) : null)
      if (!ts || Number.isNaN(ts)) return false
      const date = new Date(ts)
      const now = new Date()
      // 当年判定：同一自然年内均显示“新客户”标志
      return date.getFullYear() === now.getFullYear()
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg,#f5f7fb 0%,#ffffff 24%); }
.header {
  background: #fff;
  border-radius: 24px;
  margin: 12px 12px 8px;
  padding: 16px 16px 12px;
  box-shadow: 0 10px 28px rgba(0,0,0,.06);
}
.title { font-size: 20px; color:#222; font-weight:700; margin-bottom: 12px; }
.search-row { display:flex; align-items:center; gap:10px; }
.search {
  flex:1;
  height: 40px; border-radius: 20px; background:#f5f5f7;
  display:flex; align-items:center; padding:0 12px; position:relative;
}
.search-icon { margin-right: 6px; color:#a3a3a9; }
.search-input { flex:1; font-size:14px; color:#333; }
.clear { position:absolute; right:10px; color:#b3b3b8; font-size:12px; padding:2px 6px; }
.shop-picker { width: 140px; }
.shop-picker-field {
  height: 40px; border-radius: 14px; background:#f5f5f7;
  padding: 0 12px; display:flex; align-items:center; justify-content:space-between; border:1px solid #eef0f4;
}
.shop-picker-text { font-size:13px; color:#555; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.picker-arrow { color:#a5a5ab; font-size:12px; margin-left:8px; }
.tabs { margin-top: 12px; white-space: nowrap; }
.tab {
  display:inline-flex; align-items:center; justify-content:center;
  height:34px; padding:0 14px; margin-right:10px;
  border-radius:17px; background:#f6f7f9; color:#666; font-size:13px; box-shadow:0 3px 10px rgba(0,0,0,0.06); border:1px solid #f0f1f3;
}
.tab.active { background:#d9c19a; color:#fff; font-weight:600; }
.list { height: calc(100vh - 220px); padding: 0 12px 16px; box-sizing: border-box; }
.card {
  background:#fff; border-radius:16px; padding:12px;
  box-shadow: 0 10px 24px rgba(0,0,0,.06);
  margin-top: 12px;
  position: relative;
}
.badge.new {
  position:absolute; right:10px; top:10px;
  background:#ffefe0; color:#d16b00; border:1px solid #ffd4a8;
  padding:2px 8px; border-radius:12px; font-size:12px; font-weight:600;
}
.row-top { display:flex; align-items:center; }
.avatar { width:48px; height:48px; border-radius:24px; background:#eee; }
.base { flex:1; margin-left:12px; }
.name { display:flex; align-items:center; gap:8px; font-size:16px; color:#222; font-weight:600; }
.vip { font-size:12px; padding:2px 8px; border-radius:12px; background:#f3e7d3; color:#caa265; }
.phone { margin-top:6px; color:#666; font-size:13px; display:flex; align-items:center; gap:6px; }
.store { margin-top:6px; font-size:12px; color:#9a9aa0; display:flex; align-items:center; gap:4px; }
.store-icon { color:#b7b7bc; }
.phone-icon { color:#a9a9ad; }
.arrow { color:#c2c2c6; font-size:22px; padding:0 4px; }

.row-bottom {
  margin-top:12px; padding-top:10px; border-top:1px solid #f1f1f3;
  display:flex; align-items:center; justify-content:space-between;
}
.meta { display:flex; align-items:center; gap:6px; color:#666; font-size:13px; }
.meta-icon { color:#b0b0b4; }
.meta-gray { color:#9a9aa0; margin-right:4px; }
.meta-strong { color:#333; font-weight:600; }
.gold { color:#caa265; }
.spend { display:flex; align-items:center; gap:6px; }
.amount { color:#222; font-weight:700; min-width:80px; text-align:right; }

.empty { text-align:center; color:#9fa1a6; padding:24px 0; }
.loading { text-align:center; color:#a3a5ab; padding:12px 0; }
.loading.end { color:#c0c2c7; }

.fab {
  position: fixed; right: 16px; bottom: 32px;
  min-width: 18px; height: 40px; border-radius: 20px;
  padding: 0;
  background: rgba(255,255,255,0.12);
  color: #fff; font-size: 12px; font-weight:600;
  display:flex; align-items:center; justify-content:center; gap:6px;
  box-shadow: 0 10px 24px rgba(0,0,0,.12);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.35);
  z-index: 10;
}
.fab-icon { display:none; }
.fab-img { width: 18px; height: 18px; }
.fab-text { display:none; }
</style>
