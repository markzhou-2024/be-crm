<template>
  <view class="page">
    <view class="head">
      <text class="title">{{ customer_name }} 消耗登记</text>
    </view>

    <view class="form">
      <view class="field">
        <text class="field-label">项目名称</text>
        <picker class="picker" mode="selector" :range="purchaseRange" @change="onPurchaseChange" :disabled="!purchases.length">
          <view class="picker-field" :class="{ placeholder: selectedPurchaseIndex === -1 }">
            {{ selectedPurchaseLabel }}
          </view>
        </picker>
        <view class="field-hint" v-if="!purchases.length">暂无购买记录，无法登记消耗</view>
      </view>

      <view class="field">
        <text class="field-label">本次消耗次数</text>
        <view class="count-stepper">
          <button class="step-btn" @tap="changeCount(-1)" :disabled="form.count <= 1">-</button>
          <text class="count-value">{{ form.count }}</text>
          <button class="step-btn" @tap="changeCount(1)">+</button>
        </view>
      </view>

      <view class="field">
        <text class="field-label">备注</text>
        <textarea class="ipt textarea" v-model="form.note" placeholder="可填写备注"></textarea>
      </view>

      <button class="btn" :disabled="!canSubmit" @tap="confirmSave">保存</button>
    </view>

    <view class="list" v-if="records.length">
      <view class="item" v-for="(r, idx) in records" :key="r._id || r.id || idx">
        <view class="item-head">
          <text class="item-name">{{ r.product_name || r.package_name || '项目' }}</text>
          <text class="item-count">{{ r.count || r.service_times || 0 }} 次</text>
        </view>
        <view class="item-sub">
          <text>{{ formatDate(r.consumed_at || r.service_date) }}</text>
          <text v-if="r.note" class="item-note">{{ r.note }}</text>
        </view>
      </view>
    </view>
    <view v-else class="empty">暂无消耗记录</view>
  </view>
</template>

<script>
import { listPurchases } from '@/api/purchases.js'

export default {
  data() {
    return {
      customer_id: '',
      customer_name: '',
      form: {
        buy_id: '',
        product_name: '',
        count: 1,
        note: ''
      },
      records: [],
      purchases: [],
      selectedPurchaseIndex: -1
    }
  },
  onLoad(query = {}) {
    this.customer_id = query.customer_id || ''
    this.customer_name = decodeURIComponent(query.customer_name || '')
    if (!this.customer_id) {
      uni.showToast({ title: '缺少客户ID', icon: 'none' })
      return
    }
    this.fetchRecords()
    this.fetchPurchases()
  },
  onPullDownRefresh() {
    Promise.all([this.fetchRecords(), this.fetchPurchases()]).finally(() => uni.stopPullDownRefresh())
  },
  computed: {
    purchaseRange() {
      return this.purchases.map(item => this.formatPurchaseLabel(item))
    },
    selectedPurchaseLabel() {
      if (this.selectedPurchaseIndex === -1 || !this.purchases[this.selectedPurchaseIndex]) {
        return '选择历史购买记录'
      }
      return this.formatPurchaseLabel(this.purchases[this.selectedPurchaseIndex])
    },
    canSubmit() {
      return this.selectedPurchaseIndex !== -1 && this.form.count > 0
    }
  },
  methods: {
    getConsumeObject() {
      return uniCloud.importObject('curd-consume', { customUI: true })
    },
    extractArray(payload) {
      if (Array.isArray(payload)) return payload
      if (Array.isArray(payload?.data)) return payload.data
      if (Array.isArray(payload?.result?.data)) return payload.result.data
      return []
    },
    formatPurchaseLabel(item = {}) {
      const name = item.package_name || '未命名套餐'
      const times = item.service_times ? `${item.service_times}次` : ''
      const date = item.purchase_date || ''
      return [name, times, date].filter(Boolean).join(' · ') || name
    },
    onPurchaseChange(e) {
      const idx = Number(e?.detail?.value)
      if (Number.isNaN(idx)) return
      this.setSelectedPurchase(idx)
    },
    setSelectedPurchase(index) {
      this.selectedPurchaseIndex = index
      const target = this.purchases[index]
      if (target) {
        this.form.product_name = target.package_name || ''
        this.form.buy_id = target._id || target.id || ''
      } else {
        this.form.product_name = ''
        this.form.buy_id = ''
      }
    },
    async fetchPurchases() {
      if (!this.customer_id) return
      try {
        const list = await listPurchases(this.customer_id)
        this.purchases = (list || []).sort((a, b) => {
          const tb = Date.parse(b?.purchase_date || '') || 0
          const ta = Date.parse(a?.purchase_date || '') || 0
          return tb - ta
        })
        if (this.purchases.length) {
          this.setSelectedPurchase(0)
        } else {
          this.setSelectedPurchase(-1)
        }
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '购买记录加载失败', icon: 'none' })
      }
    },
    async fetchRecords() {
      if (!this.customer_id) return
      try {
        const obj = this.getConsumeObject()
        const res = await obj.listByCustomer({ customer_id: this.customer_id })
        this.records = this.extractArray(res)
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '记录加载失败', icon: 'none' })
      }
    },
    confirmSave() {
      if (!this.canSubmit) {
        uni.showToast({ title: '请选择项目并填写次数', icon: 'none' })
        return
      }
      uni.showModal({
        title: '确认保存',
        content: '确定要登记本次消耗吗？',
        confirmText: '保存',
        success: res => {
          if (res.confirm) {
            this.saveConsume()
          }
        }
      })
    },
    async saveConsume() {
      if (!this.customer_id) {
        uni.showToast({ title: '缺少客户ID', icon: 'none' })
        return
      }
      if (this.selectedPurchaseIndex === -1 || !this.form.product_name.trim()) {
        uni.showToast({ title: '请选择项目', icon: 'none' })
        return
      }
      if (!this.form.count || this.form.count <= 0) {
        uni.showToast({ title: '消耗次数需大于0', icon: 'none' })
        return
      }
      try {
        const obj = this.getConsumeObject()
        await obj.add({
          customer_id: this.customer_id,
          buy_id: this.form.buy_id,
          product_name: this.form.product_name.trim(),
          count: this.form.count,
          note: this.form.note
        })
        uni.showToast({ title: '保存成功', icon: 'success' })
        this.fetchRecords()
        this.emitSavedEvent()
        setTimeout(() => {
          uni.navigateBack()
        }, 400)
      } catch (err) {
        uni.showToast({ title: err?.errMsg || err?.message || '保存失败', icon: 'none' })
      }
    },
    emitSavedEvent() {
      try {
        const channel = this.getOpenerEventChannel && this.getOpenerEventChannel()
        channel && channel.emit && channel.emit('consumeSaved')
      } catch (e) {}
    },
    changeCount(delta) {
      const next = Number(this.form.count || 0) + delta
      this.form.count = Math.max(1, Math.floor(next))
    },
    formatDate(value) {
      if (!value) return '--'
      const date = typeof value === 'number' || /^\d+$/.test(value)
        ? new Date(Number(value))
        : new Date(value)
      if (Number.isNaN(date.getTime())) return '--'
      const m = `${date.getMonth() + 1}`.padStart(2, '0')
      const d = `${date.getDate()}`.padStart(2, '0')
      return `${date.getFullYear()}-${m}-${d}`
    }
  }
}
</script>

<style scoped>
.page { padding:16px; background:#f6f7f9; min-height:100vh; box-sizing:border-box; }
.head { font-size:18px; font-weight:600; margin-bottom:16px; color:#333; }
.title { font-size:20px; }
.form { background:#fff; border-radius:16px; padding:18px; box-shadow:0 6px 20px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:16px; }
.field { display:flex; flex-direction:column; gap:6px; }
.field-label { font-size:14px; color:#555; }
.picker-field, .ipt { display:block; width:100%; background:#f6f7f9; border-radius:10px; padding:12px; box-sizing:border-box; border:none; font-size:14px; color:#333; }
.picker-field.placeholder { color:#bbb; }
.textarea { min-height:90px; }
.ipt:focus-visible, .picker-field:focus-visible { outline:none; }
.field-hint { font-size:12px; color:#caa265; }
.count-stepper { display:flex; align-items:center; gap:12px; background:#f6f7f9; border-radius:10px; padding:8px 12px; }
.step-btn { width:32px; height:32px; border-radius:16px; border:none; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,0.05); font-size:18px; line-height:32px; text-align:center; color:#caa265; }
.step-btn:disabled { opacity:.4; }
.count-value { flex:1; text-align:center; font-size:16px; font-weight:600; color:#333; }
.btn { background:#caa265; color:#fff; border:none; padding:14px; border-radius:28px; width:100%; font-size:15px; }
.btn:disabled { opacity:.5; }
.list { margin-top:20px; display:flex; flex-direction:column; gap:12px; }
.item { background:#fff; border-radius:12px; padding:12px 14px; font-size:14px; color:#333; box-shadow:0 2px 10px rgba(0,0,0,0.04); }
.item-head { display:flex; justify-content:space-between; font-weight:600; }
.item-count { color:#caa265; font-weight:600; }
.item-sub { margin-top:6px; display:flex; flex-direction:column; gap:4px; font-size:12px; color:#777; }
.item-note { color:#999; }
.empty { color:#999; text-align:center; margin-top:24px; }
</style>
