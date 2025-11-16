<template>
  <view class="page">
    <view class="settings-card">
      <view class="settings-row">
        <text class="settings-title">下单时自动补充产品</text>
        <switch :checked="autoSupplement" color="#caa265" @change="onAutoSupplementChange" />
      </view>
      <text class="settings-desc">开启后，下单时输入的新项目名称会自动加入产品库。</text>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">在售产品</text>
        <button class="link-btn" @tap="toCreate">新增产品</button>
      </view>
      <view v-if="onSaleList.length" class="list">
        <view class="product-card" v-for="item in onSaleList" :key="item.id">
          <view class="card-main">
            <view>
              <text class="product-name">{{ item.product_name }}</text>
              <text class="product-meta">¥{{ formatPrice(item.price) }} · {{ item.total_times }}次</text>
            </view>
            <view class="card-actions">
              <button class="text-btn" @tap="editProduct(item)">编辑</button>
              <button class="text-btn danger" @tap="toggleStatus(item)">停售</button>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无在售产品</view>
    </view>

    <view class="section" v-if="draftList.length">
      <view class="section-header">
        <text class="section-title">待确认（草稿）</text>
      </view>
      <view class="list">
        <view class="product-card draft" v-for="draft in draftList" :key="draft.id">
          <view class="card-main">
            <view>
              <text class="product-name">{{ draft.product_name }}</text>
              <text class="product-meta muted">自动补充 · 待完善</text>
            </view>
            <view class="card-actions">
              <button class="text-btn primary" @tap="confirmDraft(draft)">确认</button>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">停售产品</text>
      </view>
      <view v-if="offSaleList.length" class="list">
        <view class="product-card off" v-for="item in offSaleList" :key="item.id">
          <view class="card-main">
            <view>
              <text class="product-name">{{ item.product_name }}</text>
              <text class="product-meta">¥{{ formatPrice(item.price) }} · {{ item.total_times }}次</text>
            </view>
            <view class="card-actions">
              <button class="text-btn" @tap="editProduct(item)">编辑</button>
              <button class="text-btn primary" @tap="toggleStatus(item)">上架</button>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无停售产品</view>
    </view>
  </view>
</template>

<script>
import { fetchProducts, toggleProductStatus } from '@/api/products.js'
import { fetchSettings, updateSettings } from '@/api/settings.js'

export default {
  data() {
    return {
      autoSupplement: true,
      products: [],
      loading: false
    }
  },
  onShow() {
    this.init()
  },
  methods: {
    async init() {
      await Promise.all([this.loadSettings(), this.loadProducts()])
    },
    async loadSettings() {
      try {
        const config = await fetchSettings()
        this.autoSupplement = config?.auto_supplement_product !== false
      } catch (err) {
        console.log('load settings failed', err)
      }
    },
    async loadProducts() {
      this.loading = true
      try {
        const list = await fetchProducts()
        this.products = Array.isArray(list) ? list : []
      } catch (err) {
        uni.showToast({ title: err?.message || '加载产品失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    formatPrice(value) {
      const num = Number(value || 0)
      return num.toFixed(2)
    },
    async onAutoSupplementChange(e) {
      const checked = !!e.detail.value
      const prev = this.autoSupplement
      this.autoSupplement = checked
      try {
        await updateSettings({ auto_supplement_product: checked })
        uni.showToast({ title: '已更新', icon: 'none' })
      } catch (err) {
        uni.showToast({ title: err?.message || '更新失败', icon: 'none' })
        this.autoSupplement = prev
      }
    },
    toCreate() {
      uni.navigateTo({ url: '/pages/products/edit' })
    },
    editProduct(item) {
      if (!item?.id) return
      uni.navigateTo({ url: `/pages/products/edit?id=${item.id}` })
    },
    confirmDraft(item) {
      if (!item?.id) return
      uni.navigateTo({ url: `/pages/products/edit?id=${item.id}&mode=confirm` })
    },
    async toggleStatus(item) {
      if (!item?.id) return
      const action = item.status === 'on_sale' ? '停售' : '上架'
      uni.showModal({
        title: `${action}确认`,
        content: `确定将「${item.product_name}」${action}吗？`,
        success: async res => {
          if (!res.confirm) return
          try {
            await toggleProductStatus(item.id)
            uni.showToast({ title: '已更新', icon: 'none' })
            await this.loadProducts()
          } catch (err) {
            uni.showToast({ title: err?.message || '操作失败', icon: 'none' })
          }
        }
      })
    }
  },
  computed: {
    onSaleList() {
      return (this.products || []).filter(item => !item.is_draft && item.status === 'on_sale')
    },
    offSaleList() {
      return (this.products || []).filter(item => !item.is_draft && item.status === 'off_sale')
    },
    draftList() {
      return (this.products || []).filter(item => item.is_draft)
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f6f7f9;
  padding: 16px;
  box-sizing: border-box;
}
.settings-card {
  background: #fff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.05);
  margin-bottom: 16px;
}
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.settings-title { font-size: 15px; color: #111; font-weight: 600; }
.settings-desc { display:block; margin-top:8px; font-size:12px; color:#8f8f96; }
.section { margin-bottom: 24px; }
.section-header {
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom:12px;
}
.section-title { font-size:16px; color:#333; font-weight:600; }
.link-btn {
  font-size:13px;
  color:#caa265;
  background:#f5efe5;
  border-radius:14px;
  padding:6px 12px;
}
.list { display:flex; flex-direction:column; gap:10px; }
.product-card {
  background:#fff;
  border-radius:16px;
  padding:14px;
  box-shadow:0 4px 16px rgba(0,0,0,0.05);
}
.product-card.draft { border:1px dashed #caa265; background:#fffdf7; }
.product-card.off { opacity:0.85; }
.card-main { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.product-name { font-size:15px; color:#222; font-weight:600; display:block; }
.product-meta { font-size:12px; color:#8a8a94; margin-top:4px; display:block; }
.product-meta.muted { color:#caa265; }
.card-actions { display:flex; gap:8px; }
.text-btn {
  font-size:13px;
  color:#666;
  background:#f5f5f7;
  border-radius:14px;
  padding:4px 10px;
}
.text-btn.primary { color:#fff; background:#caa265; }
.text-btn.danger { color:#dd524d; background:#ffecec; }
.empty { text-align:center; font-size:13px; color:#9ea0a8; padding:12px 0; }
</style>
