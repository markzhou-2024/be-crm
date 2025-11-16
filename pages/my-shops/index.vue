<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="page-header">
      <text class="title">门店管理</text>
    </view>

    <!-- 搜索框 -->
    <view class="search-bar">
      <input
        class="search-input"
        type="text"
        v-model="keyword"
        placeholder="搜索门店名称或地址"
        @input="applyFilter"
        confirm-type="search"
      />
    </view>

    <!-- Tabs -->
    <view class="tabs">
      <view
        v-for="t in tabs"
        :key="t.value"
        class="tab"
        :class="{ active: activeTab === t.value }"
        @tap="switchTab(t.value)"
      >
        {{ t.label }}
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view class="list" scroll-y @scrolltolower="loadMore">
      <view
        v-for="item in visibleList"
        :key="item._id"
        class="card"
        @tap="openDetail(item)"
      >
        <image class="cover" :src="item.cover_image" mode="aspectFill" />
        <view class="info">
          <view class="name-row">
            <text class="name">{{ item.store_name }}</text>
            <text class="arrow">></text>
          </view>
          <view class="addr-row">
            <text class="addr">📍 {{ item.store_address }}</text>
          </view>
          <view class="stat-row">
            <view class="stat">
              <text class="symbol">￥</text>
              <text class="value">{{ formatMoney(item.month_revenue) }}</text>
              <text class="label"> 上月营收</text>
            </view>
            <view class="stat">
              <text class="symbol">👥</text>
              <text class="value">{{ item.customer_count }}</text>
              <text class="label"> 客户数</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="error" class="empty">{{ error }}</view>
      <view v-else-if="visibleList.length === 0" class="empty">暂无数据</view>
    </scroll-view>

    <!-- 右下角新增门店悬浮按钮 -->
    <view class="fab" @tap="goCreate">＋</view>
  </view>
</template>

<!-- 重要：不要用 <script setup>，不加 lang="ts" -->
<script>
// @ts-nocheck
export default {
  data() {
    return {
      tabs: [
        { label: '全部门店', value: 'all' },
        { label: '高营收', value: 'high' }
      ],
      keyword: '',
      activeTab: 'all',
      page: 1,
      pageSize: 10,
      list: [],
      loading: false,
      error: ''
    }
  },
  created() {
    this.service = uniCloud.importObject('curd-shops')
  },
  onShow() {
    this.fetchShops()
  },
  computed: {
    filtered() {
      const kw = (this.keyword || '').trim().toLowerCase()
      let arr = this.list.slice()

      if (this.activeTab === 'active') {
        arr = arr.filter(function (s) { return s.status === 'active' })
      } else if (this.activeTab === 'high') {
        arr = arr.filter(function (s) { return (s.month_revenue || 0) >= 100000 })
      }

      if (kw) {
        arr = arr.filter(function (s) {
          var name = (s.store_name || '').toLowerCase()
          var addr = (s.store_address || '').toLowerCase()
          return name.indexOf(kw) > -1 || addr.indexOf(kw) > -1
        })
      }
      return arr
    },
    visibleList() {
      return this.filtered.slice(0, this.page * this.pageSize)
    }
  },
  methods: {
    async fetchShops() {
      this.loading = true
      this.error = ''
      try {
        const data = await this.service.listMyShops()
        const list = Array.isArray(data) ? data : (data && data.data) || []
        this.list = list
        this.page = 1
      } catch (err) {
        this.list = []
        this.error = err?.errMsg || err?.message || '加载失败'
        uni.showToast({ title: this.error, icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    switchTab(v) {
      this.activeTab = v
      this.page = 1
    },
    applyFilter() {
      this.page = 1
    },
    loadMore() {
      if (this.visibleList.length < this.filtered.length) {
        this.page += 1
      }
    },
    openDetail(item) {
      uni.navigateTo({ url: `/pages/my-shops/detail?id=${item._id}` })
    },
    goCreate() {
      uni.navigateTo({ url: '/pages/my-shops/create' })
    },
    formatMoney(n) {
      if (typeof n !== 'number') return n
      return n.toLocaleString('zh-CN')
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f6f7f9; padding: 16px 16px 0; box-sizing: border-box; }
.page-header { padding-top: 8px; padding-bottom: 8px; }
.title { font-size: 20px; font-weight: 600; color: #222; }
.search-bar { margin: 8px 0; }
.search-input { width:100%; height:40px; background:#fff; border-radius:12px; padding:0 14px; box-sizing:border-box; font-size:14px; color:#333; box-shadow:0 1px 2px rgba(0,0,0,0.04);}
.tabs { display:flex; gap:10px; margin:10px 0 12px; }
.tab { padding: 8px 14px; border-radius: 20px; background:#fff; font-size:14px; color:#6c6c6c; box-shadow:0 1px 2px rgba(0,0,0,0.04); }
.tab.active { background:#e8d7be; color:#5a3e16; font-weight:600; }
.list { height: calc(100vh - 160px); }
.card { display:flex; gap:12px; background:#fff; border-radius:16px; padding:12px; margin-bottom:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04); }
.cover { width:84px; height:84px; border-radius:12px; background:#f2f2f2; }
.info { flex:1; min-width:0; }
.name-row { display:flex; align-items:center; justify-content:space-between; }
.name { font-size:16px; font-weight:600; color:#222; max-width:80%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.arrow { font-size:18px; line-height:1; color:#b8b8b8; }
.addr-row { margin-top:4px; }
.addr { font-size:12px; color:#8a8a8a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.stat-row { margin-top:8px; display:flex; gap:14px; }
.stat .symbol { font-size:12px; color:#b08a47; margin-right:2px; }
.stat .value { font-size:14px; font-weight:600; color:#333; margin-right:4px; }
.stat .label { font-size:12px; color:#8a8a8a; }
.loading { text-align:center; color:#777; padding:16px 0; }
.empty { text-align:center; color:#999; padding:24px 0 64px; }

/* 悬浮新增按钮 */
.fab { position: fixed; right: 16px; bottom: 88px; width: 52px; height: 52px; border-radius: 26px; background: #caa265; color: #fff; font-size: 28px; display:flex; align-items:center; justify-content:center; box-shadow: 0 8px 16px rgba(0,0,0,.15); z-index: 10; }
</style>
