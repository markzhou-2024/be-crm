<template>
  <view class="page">
    <view class="header">
      <text class="title">新增预约</text>
      <text class="subtitle">{{ customerName ? `客户：${customerName}` : '' }}</text>
    </view>

    <scroll-view class="form" scroll-y>
      <view class="field required">
        <text class="label">服务/项目</text>
        <input class="input" v-model="form.service_name" placeholder="请输入服务或项目名称" />
      </view>

      <view class="field required">
        <text class="label">门店</text>
        <input class="input" v-model="form.store_name" placeholder="请输入或选择门店" />
      </view>

      <view class="field">
        <text class="label">美容师/顾问</text>
        <input class="input" v-model="form.staff_name" placeholder="可填写指定人员" />
      </view>

      <view class="field datetime required">
        <text class="label">日期</text>
        <picker mode="date" :value="form.date" @change="onDateChange">
          <view class="picker-trigger">{{ form.date }}</view>
        </picker>
      </view>

      <view class="field datetime required">
        <text class="label">开始时间</text>
        <picker mode="time" :value="form.start_time" @change="e => onTimeChange('start_time', e)">
          <view class="picker-trigger">{{ form.start_time }}</view>
        </picker>
      </view>

      <view class="field datetime required">
        <text class="label">结束时间</text>
        <picker mode="time" :value="form.end_time" @change="e => onTimeChange('end_time', e)">
          <view class="picker-trigger">{{ form.end_time }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="form.remark" placeholder="可填写注意事项" />
      </view>
    </scroll-view>

    <view class="actions">
      <button class="btn ghost" @tap="cancel">取消</button>
      <button class="btn primary" :loading="loading" :disabled="loading" @tap="submit">
        {{ loading ? '提交中' : '保存预约' }}
      </button>
    </view>
  </view>
</template>

<script>
// @ts-nocheck
import { createBooking } from '@/api/bookings.js'

export default {
  data() {
    return {
      customerId: '',
      customerName: '',
      loading: false,
      form: {
        service_name: '',
        store_name: '',
        staff_name: '',
        date: '',
        start_time: '',
        end_time: '',
        remark: ''
      }
    }
  },
  onLoad(query = {}) {
    this.customerId = query.customer_id || ''
    this.customerName = decodeURIComponent(query.customer_name || '')
    if (!this.customerId) {
      uni.showToast({ title: '缺少客户ID', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 400)
      return
    }
    this.eventChannel = this.getOpenerEventChannel ? this.getOpenerEventChannel() : null
    this.initDefaultTime()
  },
  methods: {
    initDefaultTime() {
      const now = new Date()
      const roundedMinutes = Math.ceil(now.getMinutes() / 10) * 10
      now.setMinutes(roundedMinutes)
      const next = new Date(now.getTime() + 60 * 60 * 1000)
      this.form.date = this.formatDate(now)
      this.form.start_time = this.formatTime(now)
      this.form.end_time = this.formatTime(next)
    },
    formatDate(date) {
      const d = new Date(date)
      const m = `${d.getMonth() + 1}`.padStart(2, '0')
      const day = `${d.getDate()}`.padStart(2, '0')
      return `${d.getFullYear()}-${m}-${day}`
    },
    formatTime(date) {
      const d = new Date(date)
      const hh = `${d.getHours()}`.padStart(2, '0')
      const mm = `${d.getMinutes()}`.padStart(2, '0')
      return `${hh}:${mm}`
    },
    onDateChange(e) {
      this.form.date = e?.detail?.value || this.form.date
    },
    onTimeChange(key, e) {
      const value = e?.detail?.value
      if (key && value) {
        this.form[key] = value
      }
    },
    cancel() {
      uni.navigateBack()
    },
    validate() {
      if (!this.form.service_name.trim()) {
        uni.showToast({ title: '请输入服务/项目', icon: 'none' })
        return false
      }
      if (!this.form.store_name.trim()) {
        uni.showToast({ title: '请输入门店', icon: 'none' })
        return false
      }
      if (!this.form.date) {
        uni.showToast({ title: '请选择日期', icon: 'none' })
        return false
      }
      if (!this.form.start_time || !this.form.end_time) {
        uni.showToast({ title: '请选择开始和结束时间', icon: 'none' })
        return false
      }
      const startTs = this.combineTs(this.form.date, this.form.start_time)
      const endTs = this.combineTs(this.form.date, this.form.end_time)
      if (!startTs || !endTs) {
        uni.showToast({ title: '时间选择无效', icon: 'none' })
        return false
      }
      if (endTs <= startTs) {
        uni.showToast({ title: '结束时间需晚于开始时间', icon: 'none' })
        return false
      }
      this.form.start_ts = startTs
      this.form.end_ts = endTs
      return true
    },
    combineTs(dateStr, timeStr) {
      const [year, month, day] = String(dateStr).split('-').map(num => Number(num))
      const [hour = 0, minute = 0] = String(timeStr).split(':').map(num => Number(num))
      if ([year, month, day].some(v => Number.isNaN(v))) return null
      const date = new Date(year, (month || 1) - 1, day || 1, hour, minute, 0)
      if (Number.isNaN(date.getTime())) return null
      return date.getTime()
    },
    async submit() {
      if (this.loading) return
      if (!this.validate()) return
      if (!this.customerId) {
        uni.showToast({ title: '缺少客户信息', icon: 'none' })
        return
      }
      this.loading = true
      const payload = {
        customer_id: this.customerId,
        customer_name: this.customerName,
        service_name: this.form.service_name.trim(),
        store_name: this.form.store_name.trim(),
        start_ts: this.form.start_ts,
        end_ts: this.form.end_ts,
        remark: this.form.remark.trim()
      }
      if (this.form.staff_name.trim()) {
        payload.staff_name = this.form.staff_name.trim()
      }
      try {
        await createBooking(payload)
        uni.showToast({ title: '预约已创建', icon: 'success' })
        this.emitCreated()
        setTimeout(() => uni.navigateBack(), 500)
      } catch (err) {
        if (err?.code === 409) {
          uni.showToast({ title: '时间段已被占用，请更换时间/人员', icon: 'none' })
        } else if (err?.code === 401 || err?.errCode === 401) {
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
        } else {
          uni.showToast({ title: err?.errMsg || err?.message || '提交失败', icon: 'none' })
        }
      } finally {
        this.loading = false
      }
    },
    emitCreated() {
      if (this.eventChannel) {
        this.eventChannel.emit('bookingCreated')
      }
    }
  }
}
</script>

<style scoped>
.page { min-height:100vh; background:#f6f7f9; display:flex; flex-direction:column; }
.header { padding:18px 16px 8px; }
.title { font-size:20px; font-weight:600; color:#222; }
.subtitle { display:block; margin-top:6px; color:#9a9aa0; font-size:13px; }
.form { flex:1; padding:8px 16px 16px; box-sizing:border-box; }
.field { margin-bottom:14px; background:#fff; border-radius:18px; padding:12px 16px; box-shadow:0 2px 10px rgba(0,0,0,0.04); }
.field.required .label::after { content:'*'; color:#dd524d; margin-left:4px; }
.label { display:block; font-size:13px; color:#8f8f95; margin-bottom:8px; }
.input { font-size:16px; color:#1c1c1e; }
.textarea { width:100%; min-height:90px; font-size:15px; color:#1c1c1e; line-height:1.5; }
.picker-trigger { font-size:16px; color:#1c1c1e; background:#f7f7f8; border-radius:12px; padding:10px 12px; }
.actions { padding:16px; display:flex; gap:12px; }
.btn { flex:1; height:46px; border-radius:26px; font-size:16px; }
.ghost { background:#fff; color:#333; border:1px solid #eee; }
.primary { background:#caa265; color:#fff; }
</style>
