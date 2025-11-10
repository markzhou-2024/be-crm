<template>
  <view class="page">
    <view class="header">
      <text class="title">新增购买</text>
      <text class="subtitle">{{ customerName ? `客户：${customerName}` : '' }}</text>
    </view>

    <scroll-view class="form" scroll-y>
      <view class="field required">
        <text class="label">套餐名称</text>
        <input class="input" v-model="form.package_name" placeholder="请输入套餐名称" />
      </view>

      <view class="field required">
        <text class="label">服务次数</text>
        <input class="input" v-model="form.service_times" type="number" placeholder="请输入正整数" />
      </view>

      <view class="field required">
        <text class="label">购买日期</text>
        <picker mode="date" :value="form.purchase_date" @change="e => form.purchase_date = e.detail.value">
          <view class="picker-trigger">{{ form.purchase_date }}</view>
        </picker>
      </view>

      <view class="field required">
        <text class="label">费用（元）</text>
        <input class="input" v-model="form.amount" type="number" placeholder="0.00" />
      </view>

      <view class="field">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="form.remark" placeholder="可记录购买备注" />
      </view>

      <view class="history" v-if="history.length">
        <text class="history-title">最近记录</text>
        <view class="history-item" v-for="item in history" :key="item._id">
          <view class="history-row">
            <text class="history-name">{{ item.package_name }}</text>
            <text class="history-amount">¥{{ toAmount(item.amount) }}</text>
          </view>
          <text class="history-sub">{{ item.purchase_date }} · {{ item.service_times }} 次</text>
        </view>
      </view>
    </scroll-view>

    <view class="actions">
      <button class="btn ghost" @tap="cancel">取消</button>
      <button class="btn primary" @tap="submit">保存</button>
    </view>
  </view>
</template>

<script>
// @ts-nocheck
import { createPurchase, listPurchases } from '@/api/purchases.js'

export default {
  data() {
    return {
      customerId: '',
      customerName: '',
      form: {
        package_name: '',
        service_times: '',
        purchase_date: '',
        amount: '',
        remark: ''
      },
      history: []
    }
  },
  onLoad() {
    this.form.purchase_date = this.formatDate(new Date())
    const channel = this.getOpenerEventChannel && this.getOpenerEventChannel()
    if (channel) {
      channel.on('initCustomerInfo', payload => {
        this.customerId = payload?.customerId || ''
        this.customerName = payload?.customerName || ''
        this.loadHistory()
      })
      this.eventChannel = channel
    }
  },
  methods: {
    formatDate(date) {
      const d = new Date(date)
      const m = d.getMonth() + 1
      const day = d.getDate()
      return `${d.getFullYear()}-${m < 10 ? '0' + m : m}-${day < 10 ? '0' + day : day}`
    },
    async loadHistory() {
      if (!this.customerId) return
      try {
        const list = await listPurchases(this.customerId)
        this.history = list.slice(0, 5)
      } catch (err) {
        console.log('load history failed', err)
      }
    },
    cancel() {
      uni.navigateBack()
    },
    validate() {
      if (!this.form.package_name.trim()) {
        uni.showToast({ title: '请输入套餐名称', icon: 'none' })
        return false
      }
      const times = Number(this.form.service_times)
      if (!Number.isInteger(times) || times <= 0) {
        uni.showToast({ title: '服务次数须为正整数', icon: 'none' })
        return false
      }
      if (!this.form.purchase_date) {
        uni.showToast({ title: '请选择购买日期', icon: 'none' })
        return false
      }
      const amount = Number(this.form.amount)
      if (isNaN(amount) || amount < 0 || !/^[0-9]+(\.[0-9]{1,2})?$/.test(this.form.amount)) {
        uni.showToast({ title: '费用格式不正确', icon: 'none' })
        return false
      }
      this.form.service_times = times
      this.form.amount = amount
      return true
    },
    async submit() {
      if (!this.validate()) return
      const payload = {
        customer_id: this.customerId,
        package_name: this.form.package_name.trim(),
        service_times: this.form.service_times,
        purchase_date: this.form.purchase_date,
        amount: this.form.amount,
        remark: this.form.remark.trim()
      }
      try {
        const record = await createPurchase(payload)
        if (this.eventChannel) {
          this.eventChannel.emit('purchaseCreated', record)
        }
        uni.navigateBack()
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '保存失败', icon: 'none' })
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
.page { min-height:100vh; background:#f6f7f9; display:flex; flex-direction:column; }
.header { padding:16px; }
.title { font-size:20px; font-weight:600; color:#222; }
.subtitle { display:block; margin-top:4px; color:#999; font-size:12px; }
.form { flex:1; padding:16px; box-sizing:border-box; }
.field { margin-bottom:14px; background:#fff; border-radius:16px; padding:12px 16px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
.field.required .label::after { content:'*'; color:#dd524d; margin-left:4px; }
.label { display:block; font-size:13px; color:#9a9aa0; margin-bottom:6px; }
.input { font-size:15px; color:#333; }
.picker-trigger { font-size:15px; color:#333; background:#f7f7f8; border-radius:10px; padding:10px 12px; }
.textarea { width:100%; min-height:90px; font-size:15px; color:#333; }
.history { margin-top:12px; }
.history-title { font-size:13px; color:#999; margin-bottom:6px; }
.history-item { background:#fff; border-radius:16px; padding:12px 14px; box-shadow:0 1px 4px rgba(0,0,0,0.04); margin-bottom:10px; }
.history-row { display:flex; justify-content:space-between; font-size:14px; color:#333; }
.history-amount { color:#caa265; }
.history-sub { font-size:12px; color:#9a9aa0; margin-top:4px; }
.actions { padding:16px; display:flex; gap:12px; }
.btn { flex:1; height:46px; border-radius:24px; font-size:16px; }
.primary { background:#caa265; color:#fff; }
.ghost { background:#fff; color:#333; border:1px solid #eee; }
</style>
