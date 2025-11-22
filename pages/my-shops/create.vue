<template>
  <view class="page">
    <view class="header">
      <text class="title">创建门店</text>
      <text class="subtitle">填写门店基础信息，便于后续管理</text>
    </view>
    <view class="card form">
      <view class="field">
        <text class="label">门店名称</text>
        <input class="input" v-model="form.store_name" placeholder="请输入门店名称" />
      </view>

      <view class="field">
        <text class="label">门店地址</text>
        <input class="input" v-model="form.store_address" placeholder="请输入门店地址" />
      </view>

      <view class="field">
        <text class="label">联系电话</text>
        <input class="input" v-model="form.phone" placeholder="示例：021-6288-8888" />
      </view>

      <view class="field">
        <text class="label">封面图 URL</text>
        <input class="input" v-model="form.cover_image" placeholder="https://..." />
      </view>
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
.page { min-height:100vh; background:linear-gradient(180deg,#f5f7fb 0%,#ffffff 24%); padding:16px; box-sizing:border-box; }
.header { margin-bottom:12px; }
.title { font-size:20px; font-weight:700; color:#222; }
.subtitle { display:block; margin-top:4px; color:#9aa0aa; font-size:12px; }
.card.form { background:#fff; border-radius:16px; padding:16px; box-shadow:0 10px 24px rgba(0,0,0,0.06); border:1px solid #f1f2f4; }
.field { margin-bottom:14px; }
.label { display:block; color:#666; font-size:12px; margin-bottom:6px; }
.input { height:42px; background:#f7f8fa; border-radius:10px; padding:0 12px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.03); font-size:14px; color:#333; border:1px solid #eceff3; }
.btns { margin-top:16px; display:flex; gap:12px; }
.btn { flex:1; height:44px; border-radius:12px; font-size:16px; }
.primary { background:#caa265; color:#fff; }
.ghost { background:#fff; color:#333; border:1px solid #eee; }
</style>
