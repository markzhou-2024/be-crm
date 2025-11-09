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
        <text class="label">费用（元）</text>
        <input class="input" v-model="form.amount" type="number" placeholder="0.00" />
      </view>

      <view class="field">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="form.remark" placeholder="可记录购买备注" />
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
export default {
  data() {
    return {
      customerId: '',
      customerName: '',
      form: {
        package_name: '',
        service_times: '',
        amount: '',
        remark: ''
      }
    }
  },
  onLoad() {
    const channel = this.getOpenerEventChannel && this.getOpenerEventChannel()
    if (channel) {
      channel.on('initCustomerInfo', payload => {
        this.customerId = payload?.customerId || ''
        this.customerName = payload?.customerName || ''
      })
      this.eventChannel = channel
    }
  },
  methods: {
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
      const amount = Number(this.form.amount)
      if (isNaN(amount) || amount < 0 || !/^\d+(\.\d{1,2})?$/.test(this.form.amount)) {
        uni.showToast({ title: '费用格式不正确', icon: 'none' })
        return false
      }
      this.form.service_times = times
      this.form.amount = amount
      return true
    },
    submit() {
      if (!this.validate()) return
      const payload = {
        customer_id: this.customerId,
        package_name: this.form.package_name.trim(),
        service_times: this.form.service_times,
        amount: this.form.amount,
        remark: this.form.remark.trim()
      }
      console.log('purchase payload', payload)
      if (this.eventChannel) {
        this.eventChannel.emit('purchaseCreated', payload)
      }
      uni.navigateBack()
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
.textarea { width:100%; min-height:90px; font-size:15px; color:#333; }
.actions { padding:16px; display:flex; gap:12px; }
.btn { flex:1; height:46px; border-radius:24px; font-size:16px; }
.primary { background:#caa265; color:#fff; }
.ghost { background:#fff; color:#333; border:1px solid #eee; }
</style>
