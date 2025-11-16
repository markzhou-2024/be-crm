<template>
  <view class="page">
    <!-- 主体内容 -->
    <view class="main">
      <view class="header">
        <view class="title-row">
          <text class="title">
            {{ productId ? '编辑产品' : '新增产品' }}
          </text>
          <text class="badge" v-if="isDraft">草稿</text>
        </view>
        <text class="subtitle">
          完善项目信息，方便前台快速查找
        </text>
      </view>

      <view class="form-card">
        <!-- 产品名称：必填 -->
        <view class="field required">
          <text class="label">产品名称</text>
          <input
            class="input"
            v-model="form.product_name"
            placeholder="请输入产品名称"
            placeholder-style="color:#C2C5CC;font-size:13px;"
          />
        </view>

        <!-- 指导价：选填 -->
        <view class="field">
          <text class="label">指导价（元，选填）</text>
          <input
            class="input"
            type="number"
            v-model="form.price"
            placeholder="可不填，例如 1980"
            placeholder-style="color:#C2C5CC;font-size:13px;"
          />
        </view>

        <view v-if="isDraft" class="hint">
          草稿来源于自动补充，请确认信息后保存。
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
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
      timesValue: 0,
      form: {
        product_name: '',
        price: '' // 选填，可以为空字符串
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

    // 设置导航栏标题
    uni.setNavigationBarTitle({
      title: this.productId ? '编辑产品' : '新增产品'
    })

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
        this.timesValue = Number(detail.total_times || 0)
        this.form.product_name = detail.product_name || ''
        // 价格允许为空
        this.form.price =
          detail.price != null && detail.price !== ''
            ? String(detail.price)
            : ''
      } catch (err) {
        uni.showToast({
          title: err?.message || '加载失败',
          icon: 'none'
        })
      }
    },
    cancel() {
      uni.navigateBack()
    },
    validate() {
      // 产品名称必填
      const name = (this.form.product_name || '').trim()
      if (!name) {
        uni.showToast({
          title: '请输入产品名称',
          icon: 'none'
        })
        return false
      }

      // 指导价选填：有值才校验、格式化；没值直接通过
      const priceStr = (this.form.price || '').toString().trim()
      if (priceStr) {
        const price = Number(priceStr)
        if (!Number.isFinite(price) || price < 0) {
          uni.showToast({
            title: '价格格式不正确',
            icon: 'none'
          })
          return false
        }
        this.form.price = price.toFixed(2)
      } else {
        this.form.price = ''
      }

      this.form.product_name = name
      return true
    },
    async submit() {
      if (!this.validate()) return

      const totalTimes = Number.isFinite(this.timesValue)
        ? this.timesValue
        : 0

      // 公共基础字段
      const baseData = {
        product_name: this.form.product_name,
        total_times: totalTimes
      }
      // 仅在填写了价格时才传给后端
      if (this.form.price !== '') {
        baseData.price = Number(this.form.price)
      }

      try {
        if (!this.productId) {
          // 新建
          await createProduct(baseData)
        } else if (this.isDraft) {
          // 草稿：如果名称有改动，先更新名称
          if (this.form.product_name !== this.originalName) {
            await updateProduct({
              product_id: this.productId,
              product_name: this.form.product_name
            })
          }
          const draftPayload = {
            product_id: this.productId,
            total_times: totalTimes
          }
          if (this.form.price !== '') {
            draftPayload.price = Number(this.form.price)
          }
          await confirmProductDraft(draftPayload)
        } else {
          // 正常编辑
          const updatePayload = {
            product_id: this.productId,
            product_name: this.form.product_name,
            total_times: totalTimes
          }
          if (this.form.price !== '') {
            updatePayload.price = Number(this.form.price)
          }
          await updateProduct(updatePayload)
        }

        uni.showToast({ title: '已保存', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 300)
      } catch (err) {
        uni.showToast({
          title: err?.message || '保存失败',
          icon: 'none'
        })
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f1f2fb 0%, #f9f9fb 60%);
  padding: 16px 20px calc(24px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* 主体内容 */
.main {
  flex: 1;
}

.header {
  margin-bottom: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 22px;
  font-weight: 600;
  color: #121826;
}

.badge {
  padding: 2px 10px;
  font-size: 12px;
  border-radius: 999px;
  background: rgba(202, 162, 101, 0.15);
  color: #caa265;
}

.subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #8c8f9c;
}

.form-card {
  background: #ffffff;
  border-radius: 22px;
  padding: 20px 18px 18px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
}

.field {
  margin-bottom: 18px;
}

.field:last-child {
  margin-bottom: 0;
}

.label {
  display: block;
  font-size: 13px;
  color: #6e7384;
  margin-bottom: 6px;
}

/* 只有必填字段才显示红星 */
.field.required .label::after {
  content: '*';
  color: #dd524d;
  margin-left: 4px;
}

.input {
  width: 100%;
  background: #f6f7fb;
  border-radius: 14px;
  /* 提高输入框高度 */
  height: 48px;
  padding: 0 14px;
  font-size: 14px;
  color: #1f2430;
  box-sizing: border-box;
  border: 1px solid transparent;
}

.input:focus {
  border-color: #caa265;
}

/* 这里可以保留以兼容以前使用 placeholder-class 的地方 */
.placeholder-text {
  color: #c2c5cc;
  font-size: 13px;
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: #caa265;
  background: #fff7ec;
  border-radius: 12px;
  padding: 10px 12px;
}

/* 底部按钮 */
.actions {
  display: flex;
  gap: 14px;
  margin-top: 24px;
}

.btn {
  flex: 1;
  height: 48px;
  border-radius: 26px;
  font-size: 16px;
}

.primary {
  background: #caa265;
  color: #ffffff;
}

.ghost {
  background: #ffffff;
  color: #333333;
  border: 1px solid #e0e3eb;
}
</style>
