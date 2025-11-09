<template>
  <view class="page form">
    <view class="field">
      <text class="label">门店名称（必填）</text>
      <input class="input" v-model="form.store_name" placeholder="请输入门店名称" />
    </view>

    <view class="field">
      <text class="label">门店地址（必填）</text>
      <input class="input" v-model="form.store_address" placeholder="请输入门店地址" />
    </view>

    <view class="field">
      <text class="label">联系电话</text>
      <input class="input" v-model="form.phone" placeholder="示例：021-6288-8888" />
    </view>

    <view class="field">
      <text class="label">营业时间</text>
      <input class="input" v-model="form.business_hours" placeholder="10:00 - 22:00" />
    </view>

    <view class="field">
      <text class="label">封面图 URL</text>
      <input class="input" v-model="form.cover_image" placeholder="https://..." />
    </view>

    <view class="btns">
      <button class="btn primary" :loading="submitting" @tap="submit">保存</button>
      <button class="btn ghost" :disabled="submitting" @tap="cancel">取消</button>
    </view>
  </view>
</template>

<script>
// @ts-nocheck
import { loadShops, saveShops } from '@/utils/shopsStore.js'

export default {
  data() {
    return {
      submitting: false,
      form: {
        store_name: '',
        store_address: '',
        phone: '',
        business_hours: '10:00 - 22:00',
        cover_image: '',
        status: 'active'
      }
    }
  },
  methods: {
    async submit() {
      if (this.submitting) return
      if (!this.form.store_name || !this.form.store_address) {
        uni.showToast({ title: '请填写必填项', icon: 'none' })
        return
      }
      this.submitting = true
      const service = uniCloud.importObject('curd-shops')
      try {
        const res = await service.createShop({ ...this.form })
        const created = res?.data || {}
        const local = loadShops([])
        const record = created._id ? created : {
          ...this.form,
          _id: created._id || Date.now().toString()
        }
        const idx = local.findIndex(item => item._id === record._id)
        if (idx >= 0) {
          local.splice(idx, 1, record)
        } else {
          local.unshift(record)
        }
        saveShops(local)
        uni.showToast({ title: '创建成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 400)
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '保存失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    cancel() {
      if (!this.submitting) {
        uni.navigateBack()
      }
    }
  }
}
</script>

<style scoped>
.form { padding:16px; }
.field { margin-bottom:12px; }
.label { display:block; color:#666; font-size:12px; margin-bottom:6px; }
.input { height:40px; background:#fff; border-radius:10px; padding:0 12px; box-shadow:0 1px 2px rgba(0,0,0,0.06); }
.btns { margin-top:20px; display:flex; flex-direction:column; gap:12px; }
.btn { height:44px; border-radius:12px; font-size:16px; }
.primary { background:#caa265; color:#fff; }
.ghost { background:#fff; color:#333; border:1px solid #eee; }
</style>
