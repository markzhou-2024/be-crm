<template>
  <view class="page">
    <scroll-view class="form" scroll-y>
      <view class="field required">
        <text class="label">姓名</text>
        <input class="input" v-model="form.name" placeholder="请输入客户姓名" />
      </view>

      <view class="field">
        <text class="label">手机号</text>
        <input class="input" v-model="form.phone" type="number" maxlength="11" placeholder="请输入手机号" />
      </view>

      <view class="field switch-field">
        <text class="label">VIP 客户</text>
        <switch :checked="form.is_vip" @change="onVipChange" color="#caa265" />
      </view>

      <view class="field required">
        <text class="label">归属门店</text>
        <picker :range="shopOptions" range-key="label" @change="onPickShop">
          <view class="picker-trigger">
            {{ form.store_name || '请选择门店' }}
          </view>
        </picker>
      </view>

      <view class="field">
        <text class="label">头像 URL</text>
        <input class="input" v-model="form.avatar" placeholder="https://example.com/avatar.jpg" />
      </view>

      <view class="field">
        <text class="label">标签</text>
        <input class="input" v-model="form.tags" placeholder="例：年卡, 精油" />
      </view>

      <view class="field">
        <text class="label">城市</text>
        <input class="input" v-model="form.city" placeholder="例：上海" />
      </view>

      <view class="field">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="form.notes" placeholder="可记录偏好、注意事项" />
      </view>
    </scroll-view>

    <view class="actions">
      <button class="btn primary" :loading="submitting" @tap="submit">保存</button>
    </view>
  </view>
</template>

<script>
// @ts-nocheck
import { createCustomer } from '@/api/customers.js'
import { fetchShops } from '@/api/shops.js'

export default {
  data() {
    return {
      submitting: false,
      shopOptions: [],
      prefillStoreId: '',
      prefillStoreName: '',
      form: {
        name: '',
        phone: '',
        is_vip: false,
        avatar: '',
        tags: '',
        city: '',
        notes: '',
        store_id: '',
        store_name: ''
      }
    }
  },
  async onLoad(query = {}) {
    this.prefillStoreId = (query.store_id || query.storeId || '').trim()
    this.prefillStoreName = decodeURIComponent(query.store_name || query.storeName || '')
    await this.initShops()
    this.applyPrefillStore()
  },
  methods: {
    async initShops() {
      try {
        const shops = await fetchShops()
        if (!shops.length) {
          uni.showToast({ title: '请先创建门店', icon: 'none' })
        }
        this.shopOptions = shops.map(s => ({
        value: s._id,
        label: s.store_name || '未命名门店'
      }))
        this.applyPrefillStore()
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '加载门店失败', icon: 'none' })
        this.shopOptions = []
      }
    },
    applyPrefillStore() {
      if (!this.prefillStoreId) return
      const match = this.shopOptions.find(opt => opt.value === this.prefillStoreId)
      if (match) {
        this.form.store_id = match.value
        this.form.store_name = match.label
      } else {
        this.form.store_id = this.prefillStoreId
        this.form.store_name = this.prefillStoreName || '指定门店'
      }
    },
    onVipChange(e) {
      this.form.is_vip = !!e.detail.value
    },
    onPickShop(e) {
      const idx = Number(e.detail.value)
      const opt = this.shopOptions[idx]
      if (opt) {
        this.form.store_id = opt.value
        this.form.store_name = opt.label
      }
    },
    validate() {
      const name = (this.form.name || '').trim()
      const phone = (this.form.phone || '').trim()
      if (!name) {
        uni.showToast({ title: '请填写姓名', icon: 'none' })
        return false
      }
      if (phone && !/^1\d{10}$/.test(phone)) {
        uni.showToast({ title: '手机号格式错误', icon: 'none' })
        return false
      }
      if (!this.form.store_id) {
        uni.showToast({ title: '请选择归属门店', icon: 'none' })
        return false
      }
      this.form.name = name
      this.form.phone = phone
      return true
    },
    async submit() {
      if (this.submitting) return
      if (!this.validate()) return
      this.submitting = true
      const payload = {
        name: this.form.name,
        phone: this.form.phone,
        is_vip: this.form.is_vip,
        avatar: this.form.avatar,
        tags: this.form.tags,
        city: this.form.city,
        notes: this.form.notes,
        store_id: this.form.store_id,
        store_name: this.form.store_name,
        total_spend: 0,
        visit_count: 0,
        last_visit_days: 0,
        last_visit_label: '今天'
      }
      try {
        await createCustomer(payload)
        uni.showToast({ title: '创建成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 400)
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '保存失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.page { min-height:100vh; background:#f6f7f9; display:flex; flex-direction:column; }
.form { flex:1; padding:16px; box-sizing:border-box; }
.field { margin-bottom:14px; background:#fff; border-radius:16px; padding:12px 14px; box-shadow:0 2px 8px rgba(0,0,0,0.03); }
.field.required .label::after { content:'*'; color:#dd524d; margin-left:4px; }
.label { display:block; font-size:13px; color:#9a9aa0; margin-bottom:6px; }
.input { font-size:15px; color:#333; }
.picker-trigger { font-size:15px; color:#333; min-height:22px; }
.textarea { width:100%; min-height:96px; font-size:15px; color:#333; }
.switch-field { display:flex; align-items:center; justify-content:space-between; }
.actions { padding:12px 16px 24px; }
.btn { height:46px; border-radius:24px; font-size:16px; }
.primary { background:#caa265; color:#fff; }
</style>
