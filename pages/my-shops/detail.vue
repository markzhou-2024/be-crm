<template>
  <view class="page">
    <view class="nav-gap"></view>

    <!-- 顶部大图 -->
    <view class="hero">
      <image class="hero-img" :src="shop.cover_image" mode="aspectFill" />
    </view>

    <!-- 基本信息卡片 -->
    <view class="card">
      <view class="shop-name">{{ shop.store_name }}</view>

      <view class="row">
        <text class="icon">📞</text>
        <text class="label">联系电话</text>
        <text class="val">{{ shop.phone || '—' }}</text>
      </view>

      <view class="row">
        <text class="icon">📍</text>
        <text class="label">门店地址</text>
        <text class="val">{{ shop.store_address }}</text>
      </view>

      <view class="row">
        <text class="icon">⏰</text>
        <text class="label">营业时间</text>
        <text class="val">{{ shop.business_hours || '10:00 - 22:00' }}</text>
      </view>

      <view class="row">
        <text class="icon">👥</text>
        <text class="label">客户数量</text>
        <text class="val">{{ shop.customer_count }} 位</text>
      </view>
    </view>

    <!-- 近7日客流趋势（占位） -->
    <view class="card">
      <view class="section-title">近7日客流趋势</view>
      <view class="chart-placeholder"><text>（图表占位）</text></view>
    </view>

    <!-- CTA -->
    <view class="cta">
      <button class="btn primary" @tap="addCustomer">👤 添加客户</button>
      <button class="btn ghost" @tap="openCalendar">📅 查看预约日历</button>
    </view>
  </view>
</template>

<script>
// @ts-nocheck
export default {
  data() {
    return {
      id: '',
      shop: {
        store_name: '',
        store_address: '',
        cover_image: '',
        month_revenue: 0,
        customer_count: 0,
        phone: '021-6288-8888',
        business_hours: '10:00 - 22:00'
      },
      // 本地 Mock（字段与列表页一致）
      mockAll: [
        {
          _id: '1',
          store_name: '静安旗舰店',
          store_address: '上海市静安区南京西路1234号',
          cover_image: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=800',
          month_revenue: 128500,
          customer_count: 328,
          phone: '021-6288-8888',
          business_hours: '10:00 - 22:00'
        },
        {
          _id: '2',
          store_name: '浦东新乐店',
          store_address: '上海市浦东新区陆家嘴世纪大道88号',
          cover_image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800',
          month_revenue: 98200,
          customer_count: 256,
          phone: '021-6666-8888',
          business_hours: '10:00 - 22:00'
        },
        {
          _id: '3',
          store_name: '徐汇体验店',
          store_address: '上海市徐汇区淮海中路66号',
          cover_image: 'https://images.unsplash.com/photo-1542372147193-a7aca54189cd?q=80&w=800',
          month_revenue: 85600,
          customer_count: 198,
          phone: '021-6666-9999',
          business_hours: '10:00 - 22:00'
        }
      ]
    }
  },
  onLoad(query) {
    this.id = (query && query.id) || ''
    const hit = this.mockAll.find(s => s._id === this.id)
    if (hit) {
      this.shop = hit
      uni.setNavigationBarTitle({ title: '门店详情' })
    } else {
      uni.showToast({ title: '未找到门店信息', icon: 'none' })
    }
  },
  methods: {
    addCustomer() { uni.showToast({ title: '添加客户（待接后端）', icon: 'none' }) },
    openCalendar() { uni.showToast({ title: '预约日历（待接后端）', icon: 'none' }) }
  }
}
</script>

<style scoped>
.page { min-height:100vh; background:#f6f7f9; padding-bottom:24px; }
.nav-gap { height: 8px; }
.hero { padding:16px; }
.hero-img { width:100%; height:180px; border-radius:16px; background:#f2f2f2; }
.card { margin:0 16px 12px; background:#fff; border-radius:16px; padding:16px; box-shadow:0 4px 12px rgba(0,0,0,0.04); }
.shop-name { font-size:16px; font-weight:600; color:#222; margin-bottom:8px; }
.row { display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid #f3f3f3; }
.row:last-child { border-bottom:none; }
.icon { width:20px; text-align:center; }
.label { color:#8a8a8a; font-size:12px; width:72px; }
.val { color:#333; font-size:14px; flex:1; }
.section-title { font-size:14px; font-weight:600; color:#333; margin-bottom:8px; }
.chart-placeholder { height:140px; border-radius:12px; background:#fafafa; display:flex; align-items:center; justify-content:center; color:#b8b8b8; }
.cta { margin:16px; display:flex; flex-direction:column; gap:12px; }
.btn { height:44px; border-radius:12px; font-size:16px; }
.primary { background:#caa265; color:#fff; }
.ghost { background:#fff; color:#333; border:1px solid #eee; }
</style>
