<template>
  <view class="page">
    <view class="edit-btn" @tap="goEdit">编辑</view>
    <scroll-view class="content" scroll-y>
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
          <text class="stat-value">¥{{ toAmount(customer.total_spend) }}</text>
        </view>
        <view class="divider"></view>
        <view class="stat">
          <text class="stat-label">到店次数</text>
          <text class="stat-value">{{ customer.visit_count || 0 }} 次</text>
        </view>
      </view>

      <scroll-view class="section-tabs" scroll-x enable-flex>
        <view
          v-for="tab in tabs"
          :key="tab.value"
          class="section-tab"
          :class="{ active: activeTab === tab.value }"
          @tap="activeTab = tab.value"
        >{{ tab.label }}</view>
      </scroll-view>

      <view class="tab-panel" v-if="activeTab === 'purchase'">
        <view class="placeholder-list">
          <text class="placeholder-title">购买记录</text>
          <text class="placeholder-line">暂无记录（占位）</text>
        </view>
      </view>
      <view class="tab-panel" v-else-if="activeTab === 'consume'">
        <view class="placeholder-list">
          <text class="placeholder-title">消耗记录</text>
          <text class="placeholder-line">暂无记录（占位）</text>
        </view>
      </view>
      <view class="tab-panel" v-else-if="activeTab === 'booking'">
        <view class="booking-panel">
          <text class="placeholder-title">预约管理</text>
          <button class="btn ghost" @tap="addBooking">＋ 预约</button>
        </view>
      </view>
      <view class="tab-panel" v-else-if="activeTab === 'gallery'">
        <view class="placeholder-list">
          <text class="placeholder-line">图库占位</text>
        </view>
      </view>
      <view class="tab-panel" v-else>
        <text class="placeholder-title">备注</text>
        <textarea class="notes" v-model="notesDraft" placeholder="填写备注"></textarea>
        <button class="btn primary" @tap="saveNotes">保存备注</button>
      </view>

      <button class="btn danger ghost" @tap="confirmDelete">删除客户</button>
    </scroll-view>
  </view>
</template>

<script>
// @ts-nocheck
import { getCustomerById, updateCustomer, deleteCustomer as deleteCustomerApi } from '@/api/customers.js'

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
      activeTab: 'purchase'
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
      this.loadData()
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
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '加载失败', icon: 'none' })
      }
    },
    goEdit() {
      uni.navigateTo({ url: `/pages/my-customers/edit?id=${this.id}` })
    },
    addBooking() {
      uni.showActionSheet({
        itemList: ['意向到店', '上门服务', '电话跟进'],
        success: () => {
          uni.showToast({ title: '预约功能占位', icon: 'none' })
        }
      })
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
    }
  }
}
</script>

<style scoped>
.page { min-height:100vh; background:#f6f7f9; position:relative; }
.content { height:100vh; padding:16px; box-sizing:border-box; }
.hero {
  display:flex; gap:12px; align-items:center;
  background:#fff; border-radius:20px; padding:16px;
  box-shadow:0 10px 24px rgba(0,0,0,.04);
}
.hero .avatar { width:72px; height:72px; border-radius:36px; background:#eee; }
.info { flex:1; }
.name-row { display:flex; align-items:center; gap:8px; }
.name { font-size:20px; font-weight:600; color:#222; }
.vip-pill { font-size:12px; padding:2px 8px; border-radius:12px; background:#f3e7d3; color:#caa265; }
.tag-row { margin-top:6px; display:flex; gap:8px; color:#9a9aa0; font-size:12px; }
.tag-row .tag { background:#f6f6f8; padding:2px 8px; border-radius:10px; }
.phone-row { margin-top:6px; font-size:14px; color:#555; display:flex; gap:6px; }
.phone-icon { color:#b7b7bc; }

.stat-card {
  margin-top:16px; background:#fff; border-radius:20px; padding:16px;
  display:flex; align-items:center; justify-content:space-between;
}
.stat { flex:1; text-align:center; }
.stat-label { display:block; color:#9a9aa0; font-size:12px; margin-bottom:6px; }
.stat-value { font-size:18px; font-weight:700; color:#333; }
.divider { width:1px; height:36px; background:#f0f0f2; }

.section-tabs { margin-top:18px; white-space:nowrap; }
.section-tab {
  display:inline-flex; align-items:center; justify-content:center;
  height:34px; padding:0 14px; margin-right:10px;
  border-radius:17px; background:#fff; color:#666; font-size:13px;
  box-shadow:0 2px 6px rgba(0,0,0,0.04);
}
.section-tab.active { background:#caa265; color:#fff; font-weight:600; }

.tab-panel {
  margin-top:14px; background:#fff; border-radius:20px; padding:16px;
  box-shadow:0 4px 12px rgba(0,0,0,0.03);
}
.placeholder-title { font-size:14px; color:#333; font-weight:600; }
.placeholder-line { display:block; margin-top:4px; color:#9a9aa0; font-size:12px; }
.booking-panel { display:flex; align-items:center; justify-content:space-between; }
.notes { width:100%; min-height:100px; margin:12px 0; background:#f6f7f9; border-radius:12px; padding:10px; box-sizing:border-box; }

.btn { height:42px; border-radius:22px; font-size:15px; margin-top:8px; }
.primary { background:#caa265; color:#fff; }
.ghost { background:#fff; color:#caa265; border:1px solid #eedfc4; }
.danger { color:#dd524d; border-color:#f6c8cd; }

.edit-btn {
  position:fixed; right:16px; top:12px;
  color:#caa265; padding:6px 12px; background:#fff;
  border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.06); z-index:11;
}
</style>
