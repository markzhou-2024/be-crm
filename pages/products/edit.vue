<template>
  <view class="page">
    <view class="form-card">
      <view class="field required">
        <text class="label">产品名称</text>
        <input class="input" v-model="form.product_name" placeholder="请输入产品名称" />
      </view>
      <view class="field required">
        <text class="label">价格（元）</text>
        <input class="input" type="number" v-model="form.price" placeholder="0.00" />
      </view>
      <view class="field required">
        <text class="label">包含次数</text>
        <input class="input" type="number" v-model="form.total_times" placeholder="请输入次数" />
      </view>
      <view v-if="isDraft" class="hint">
        草稿来源于自动补充，请完善价格与次数后保存。
      </view>
    </view>
    <view class="actions">
      <button class="btn ghost" @tap="cancel">取消</button>
      <button class="btn primary" @tap="submit">{{ submitText }}</button>
    </view>
  </view>
</template>

<script>
import {
  createProduct,
  updateProduct,
  confirmProductDraft,
  fetchProductDetail
} from '@/api/products.js'

export default {
  data() {
    return {
      productId: '',
      isDraft: false,
      originalName: '',
      form: {
        product_name: '',
        price: '',
        total_times: ''
      }
    }
  },
  computed: {
    submitText() {
      if (!this.productId) return '创建产品'
      if (this.isDraft) return '确认草稿'
      return '保存'
    }
  },
  async onLoad(query = {}) {
    this.productId = query.id || ''
    if (this.productId) {
      await this.loadDetail()
    }
  },
  methods: {
    async loadDetail() {
      try {
        const detail = await fetchProductDetail(this.productId)
        if (!detail) return
        this.isDraft = !!detail.is_draft
        this.originalName = detail.product_name || ''
        this.form.product_name = detail.product_name || ''
        this.form.price = detail.price != null ? String(detail.price) : ''
        this.form.total_times = detail.total_times != null ? String(detail.total_times) : ''
      } catch (err) {
        uni.showToast({ title: err?.message || '加载失败', icon: 'none' })
      }
    },
    cancel() {
      uni.navigateBack()
    },
    validate() {
      const name = (this.form.product_name || '').trim()
      if (!name) {
        uni.showToast({ title: '请输入产品名称', icon: 'none' })
        return false
      }
      const price = Number(this.form.price)
      if (!Number.isFinite(price) || price < 0) {
        uni.showToast({ title: '价格格式不正确', icon: 'none' })
        return false
      }
      const times = Number(this.form.total_times)
      if (!Number.isInteger(times) || times < 0) {
        uni.showToast({ title: '次数格式不正确', icon: 'none' })
        return false
      }
      this.form.product_name = name
      this.form.price = price.toFixed(2)
      this.form.total_times = String(times)
      return true
    },
    async submit() {
      if (!this.validate()) return
      try {
        if (!this.productId) {
          await createProduct({
            product_name: this.form.product_name,
            price: Number(this.form.price),
            total_times: Number(this.form.total_times)
          })
        } else if (this.isDraft) {
          if (this.form.product_name !== this.originalName) {
            await updateProduct({
              product_id: this.productId,
              product_name: this.form.product_name
            })
          }
          await confirmProductDraft({
            product_id: this.productId,
            price: Number(this.form.price),
            total_times: Number(this.form.total_times)
          })
        } else {
          await updateProduct({
            product_id: this.productId,
            product_name: this.form.product_name,
            price: Number(this.form.price),
            total_times: Number(this.form.total_times)
          })
        }
        uni.showToast({ title: '已保存', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 300)
      } catch (err) {
        uni.showToast({ title: err?.message || '保存失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f6f7f9;
  padding: 20px;
  box-sizing: border-box;
}
.form-card {
  background: #fff;
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.05);
}
.field {
  margin-bottom: 16px;
}
.field:last-child { margin-bottom: 0; }
.label {
  display:block;
  font-size:13px;
  color:#8c8c95;
  margin-bottom:6px;
}
.field.required .label::after {
  content:'*';
  color:#dd524d;
  margin-left:4px;
}
.input {
  width:100%;
  background:#f6f7f9;
  border-radius:12px;
  padding:10px 14px;
  font-size:15px;
  color:#222;
  box-sizing:border-box;
}
.hint {
  margin-top:12px;
  font-size:12px;
  color:#caa265;
  background:#fff7ec;
  border-radius:12px;
  padding:10px;
}
.actions {
  display:flex;
  gap:12px;
  margin-top:24px;
}
.btn {
  flex:1;
  height:46px;
  border-radius:24px;
  font-size:16px;
}
.primary {
  background:#caa265;
  color:#fff;
}
.ghost {
  background:#fff;
  color:#333;
  border:1px solid #e0e0e0;
}
</style>
