<template>
  <view class="page">
    <view class="header">
      <text class="title">新增购买</text>
      <text class="subtitle">{{ customerName ? `客户：${customerName}` : '' }}</text>
    </view>

    <scroll-view class="form" scroll-y>
      <view class="field">
        <text class="label">选择已有产品</text>
        <picker mode="selector" :range="productOptions" range-key="label" :value="productPickerIndex" @change="onProductChange">
          <view class="picker-trigger">{{ productOptions[productPickerIndex]?.label || '请选择产品' }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">手动输入新项目名称</text>
        <input class="input" v-model="customProductName" placeholder="可留空，如不选择产品请填写" />
      </view>

      <view class="field required">
        <text class="label">本次消耗次数</text>
        <input class="input" v-model="form.service_times" type="number" placeholder="请输入消耗次数" />
      </view>

      <view class="field required">
        <text class="label">购买日期</text>
        <picker mode="date" :value="form.purchase_date" @change="e => form.purchase_date = e.detail.value">
          <view class="picker-trigger">{{ form.purchase_date }}</view>
        </picker>
      </view>

      <view class="field required">
        <text class="label">金额（元）</text>
        <input class="input" v-model="form.amount" type="number" placeholder="0.00" />
      </view>
	  
      <view class="field toggle-field">
        <view class="toggle-label">
          <text class="label">是否新客首次购买</text>
          <text class="hint">开启后标记客户为首次购买</text>
        </view>
        <switch
          :checked="form.is_first_purchase"
          color="#caa265"
          @change="form.is_first_purchase = $event.detail.value" />
      </view>

      <view class="field">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="form.remark" placeholder="可记录购买备注" />
      </view>

      <view class="history" v-if="history.length">
        <text class="history-title">最近记录</text>
        <view class="history-item" v-for="item in history" :key="item._id">
          <view class="history-badge" v-if="item.is_first_purchase">新客首次购买</view>
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
import { createOrder, listPurchases } from '@/api/purchases.js'
import { fetchProducts } from '@/api/products.js'

export default {
  data() {
    return {
      customerId: '',
      customerName: '',
      productOptions: [{ label: '请选择产品', value: '' }],
      productPickerIndex: 0,
      selectedProductId: '',
      selectedProductName: '',
      customProductName: '',
      form: {
        package_name: '',
        service_times: '',
        purchase_date: '',
        amount: '',
        remark: '',
		 // 是否新客首次购买（滑动按钮）
		  is_first_purchase: false
      },
      history: []
    }
  },
  onLoad() {
    this.form.purchase_date = this.formatDate(new Date())
    this.loadProducts()
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
    async loadProducts() {
      try {
        const list = await fetchProducts()
        const options = [{ label: '请选择产品', value: '' }]
        ;(list || []).forEach(item => {
          if (item && !item.is_draft && item.status !== 'off_sale') {
            options.push({ label: item.product_name || '未命名产品', value: item.id || item._id })
          }
        })
        this.productOptions = options
        this.productPickerIndex = 0
        this.selectedProductId = ''
        this.selectedProductName = ''
      } catch (err) {
        console.log('load products failed', err)
        this.productOptions = [{ label: '请选择产品', value: '' }]
      }
    },
    onProductChange(e) {
      const idx = Number(e?.detail?.value)
      if (Number.isNaN(idx)) return
      this.productPickerIndex = idx
      const option = this.productOptions[idx]
      this.selectedProductId = option?.value || ''
      this.selectedProductName = option?.label || ''
      this.form.package_name = this.selectedProductName
    },
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
      const finalName = (this.selectedProductName || '').trim() || (this.customProductName || '').trim() || (this.form.package_name || '').trim()
      if (!finalName) {
        uni.showToast({ title: '�������ײ�����', icon: 'none' })
        return false
      }
      this.form.package_name = finalName
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
        remark: this.form.remark.trim(),
        is_first_purchase: !!this.form.is_first_purchase,
        product_id: this.selectedProductId,
        product_name: this.selectedProductId ? '' : (this.customProductName || '').trim()
      }
      try {
        const record = await createOrder(payload)
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
.history-item { background:#fff; border-radius:16px; padding:12px 14px; box-shadow:0 1px 4px rgba(0,0,0,0.04); margin-bottom:10px; position:relative; }
.history-row { display:flex; justify-content:space-between; font-size:14px; color:#333; }
.history-amount { color:#caa265; }
.history-sub { font-size:12px; color:#9a9aa0; margin-top:4px; }
.history-badge { position:absolute; right:10px; top:10px; background:#ffefe0; color:#d16b00; border:1px solid #ffd4a8; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:600; }
.actions { padding:16px; display:flex; gap:12px; }
.btn { flex:1; height:46px; border-radius:24px; font-size:16px; }
.primary { background:#caa265; color:#fff; }
.ghost { background:#fff; color:#333; border:1px solid #eee; }
.toggle-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle-label {
  display: flex;
  flex-direction: column;
}

.toggle-label .hint {
  font-size: 12px;
  color: #9a9aa0;
  margin-top: 2px;
}

</style>
