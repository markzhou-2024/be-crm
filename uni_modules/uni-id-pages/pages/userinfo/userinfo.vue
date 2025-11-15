<template>
  <view class="mine-page">
    <!-- 顶部大背景 + 头像 + 名称 -->
    <view class="hero">
      <view class="hero-top">
</view>
<view class="hero-main">
        <uni-id-pages-avatar
          width="120rpx"
          height="120rpx"
          class="hero-avatar"
        ></uni-id-pages-avatar>
        <view class="hero-info">
          <text class="hero-name">{{ displayName }}</text>
          <view class="hero-tags">
            <text v-if="isLogin" class="hero-tag online">已登录</text>
            <text v-else class="hero-tag offline">未登录</text>
            <text v-if="isAdmin" class="hero-tag admin">管理员</text>
          </view>
          <text class="hero-desc">
            {{ isLogin ? '欢迎回来，开始你的本月经营复盘吧' : '登录后可查看月度经营分析与账号信息' }}
          </text>
        </view>
      </view>

      <!-- 关键操作：月度统计分析 -->
      <button class="hero-cta" @tap="goMonthlyAnalysis">
        <view class="cta-left">
          <view class="cta-icon">📊</view>
          <view class="cta-texts">
            <text class="cta-title">月度统计分析</text>
            <text class="cta-sub">
              查看门店到客、新客/老客与消耗金额
            </text>
          </view>
        </view>
        <text class="cta-arrow">›</text>
      </button>
    </view>

    <!-- 中部信息卡片：基础账号信息 -->
    <view class="card">
      <view class="card-header">
        <text class="card-title">账号信息</text>
        <text class="card-sub">昵称、手机号与登录状态</text>
      </view>

      <view class="card-list">
        <view class="card-item" @tap="openNicknameDialog">
          <view class="item-left">
            <text class="item-icon">👤</text>
            <view class="item-texts">
              <text class="item-label">昵称</text>
              <text class="item-desc">点击设置或修改昵称</text>
            </view>
          </view>
          <text class="item-value">
            {{ userInfo.nickname || '未设置' }}
          </text>
        </view>

        <view class="card-item" @tap="bindMobile">
          <view class="item-left">
            <text class="item-icon">📞</text>
            <view class="item-texts">
              <text class="item-label">手机号</text>
              <text class="item-desc">
                {{ userInfo.mobile ? '已绑定手机号' : '用于登录与安全通知' }}
              </text>
            </view>
          </view>
          <text
            class="item-value"
            :class="{ 'item-value-muted': !userInfo.mobile }"
          >
            {{ userInfo.mobile || '未绑定' }}
          </text>
        </view>

        <view class="card-item">
          <view class="item-left">
            <text class="item-icon">🛡</text>
            <view class="item-texts">
              <text class="item-label">角色</text>
              <text class="item-desc">决定可见门店与统计范围</text>
            </view>
          </view>
          <text class="item-value">
            <block v-if="isAdmin">管理员</block>
            <block v-else-if="isLogin">普通用户</block>
            <block v-else>未登录</block>
          </text>
        </view>
      </view>
    </view>

    <!-- 其他入口：预留给后续扩展 -->
    <view class="card">
      <view class="card-header">
        <text class="card-title">更多功能</text>
        <text class="card-sub">预留给后台管理、帮助反馈等入口</text>
      </view>

      <view class="card-list">
        <view class="card-item disabled">
          <view class="item-left">
            <text class="item-icon">🏬</text>
            <view class="item-texts">
              <text class="item-label">门店与顾问管理</text>
              <text class="item-desc">后续可为管理员开放</text>
            </view>
          </view>
          <text class="item-value">敬请期待</text>
        </view>

        <view class="card-item disabled">
          <view class="item-left">
            <text class="item-icon">❓</text>
            <view class="item-texts">
              <text class="item-label">帮助与反馈</text>
              <text class="item-desc">产品使用问题与优化建议</text>
            </view>
          </view>
          <text class="item-value">暂未开放</text>
        </view>
      </view>
    </view>

    <!-- 底部登录 / 退出按钮 -->
    <view class="footer">
      <button class="footer-btn" @tap="isLogin ? logout() : login()">
        <text class="footer-icon">{{ isLogin ? '↪' : '➜' }}</text>
        <text class="footer-text">
          {{ isLogin ? '退出登录' : '微信一键登录 / 账号登录' }}
        </text>
      </button>
    </view>

    <!-- 设置昵称弹窗 -->
    <uni-popup ref="dialog" type="dialog">
      <uni-popup-dialog
        mode="input"
        :value="userInfo.nickname"
        @confirm="setNickname"
        :inputType="setNicknameIng ? 'nickname' : 'text'"
        title="设置昵称"
        placeholder="请输入要设置的昵称"
      ></uni-popup-dialog>
    </uni-popup>

    <!-- 绑定手机号组件（短信方式） -->
    <uni-id-pages-bind-mobile
      ref="bind-mobile-by-sms"
      @success="bindMobileSuccess"
    ></uni-id-pages-bind-mobile>
  </view>
</template>

<script>
const uniIdCo = uniCloud.importObject('uni-id-co')
import { store, mutations } from '@/uni_modules/uni-id-pages/common/store.js'

export default {
  data() {
    return {
      setNicknameIng: false
    }
  },
  computed: {
    userInfo() {
      return store.userInfo || {}
    },
    isLogin() {
      return !!this.userInfo._id
    },
    displayName() {
      return (
        this.userInfo.nickname ||
        this.userInfo.username ||
        (this.isLogin ? '欢迎回来' : '您好，请先登录')
      )
    },
    isAdmin() {
      const roles = this.userInfo.role || this.userInfo.roles || []
      return Array.isArray(roles) && roles.includes('admin')
    }
  },
  methods: {
    // 跳转到月度统计分析页面
    goMonthlyAnalysis() {
      if (!this.isLogin) {
        uni.showToast({ title: '请先登录再查看统计分析', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: '/pages/analytics/analytics'
      })
    },

    // 打开昵称输入弹窗
    openNicknameDialog() {
      if (!this.isLogin) {
        uni.showToast({ title: '登录后才能设置昵称', icon: 'none' })
        return
      }
      this.setNicknameIng = true
      this.$refs.dialog && this.$refs.dialog.open()
    },

    // 设置昵称（弹窗确认回调）
    async setNickname(nickname) {
      if (!nickname) {
        uni.showToast({ title: '昵称不能为空', icon: 'none' })
        return
      }
      try {
        uni.showLoading({ title: '保存中...' })
        await uniIdCo.updateUser({
          nickname
        })
        // 更新本地 store 中的 userInfo
        const newUserInfo = Object.assign({}, this.userInfo, { nickname })
        mutations.setUserInfo(newUserInfo)
        uni.showToast({ title: '昵称已更新', icon: 'none' })
      } catch (e) {
        console.error(e)
        uni.showToast({ title: '昵称设置失败', icon: 'none' })
      } finally {
        uni.hideLoading()
        this.$refs.dialog && this.$refs.dialog.close()
      }
    },

    // 打开绑定手机号弹窗
    bindMobile() {
      if (!this.isLogin) {
        uni.showToast({ title: '登录后才能绑定手机号', icon: 'none' })
        return
      }
      this.$refs['bind-mobile-by-sms'] &&
        this.$refs['bind-mobile-by-sms'].open()
    },

    // 绑定手机号成功回调
    async bindMobileSuccess(e) {
      // e 里一般会有 mobile 信息，也可以重新拉一次用户信息
      try {
        const res = await uniIdCo.getUserInfo()
        if (res && res.userInfo) {
          mutations.setUserInfo(res.userInfo)
        }
        uni.showToast({ title: '手机号绑定成功', icon: 'none' })
      } catch (err) {
        console.error(err)
      }
    },

    // 退出登录
    async logout() {
      try {
        await uniIdCo.logout()
        mutations.logout && mutations.logout()
        uni.showToast({ title: '已退出登录', icon: 'none' })
      } catch (e) {
        console.error(e)
        uni.showToast({ title: '退出失败', icon: 'none' })
      }
    },

    // 去登录（统一跳 uni-id 登录页，你可按项目实际调整路径）
    login() {
      uni.navigateTo({
        url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd'
      })
    }
  }
}
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  background-color: #f5f6fa;
  padding-bottom: 40rpx;
  box-sizing: border-box;
}

/* 顶部 hero 区域 */
.hero {
  padding: 60rpx 32rpx 32rpx;
  background: linear-gradient(145deg, #3b82f6, #8b5cf6);
  border-bottom-left-radius: 40rpx;
  border-bottom-right-radius: 40rpx;
  box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.15);
  color: #ffffff;
}

.hero-top {
  margin-bottom: 40rpx;
}

.hero-title {
  font-size: 36rpx;
  font-weight: 600;
}

.hero-sub {
  font-size: 24rpx;
  opacity: 0.9;
  margin-top: 8rpx;
}

.hero-main {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.hero-avatar {
  border-radius: 999rpx;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.15);
}

.hero-info {
  margin-left: 24rpx;
  flex: 1;
}

.hero-name {
  font-size: 34rpx;
  font-weight: 600;
}

.hero-tags {
  display: flex;
  flex-direction: row;
  margin-top: 8rpx;
}

.hero-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  margin-right: 12rpx;
}

.hero-tag.online {
  background-color: rgba(16, 185, 129, 0.25);
}

.hero-tag.offline {
  background-color: rgba(248, 250, 252, 0.25);
}

.hero-tag.admin {
  background-color: rgba(251, 191, 36, 0.4);
}

.hero-desc {
  font-size: 22rpx;
  opacity: 0.9;
  margin-top: 8rpx;
}

/* 月度统计 CTA */
.hero-cta {
  margin-top: 32rpx;
  width: 100%;
  padding: 20rpx 24rpx;
  border-radius: 24rpx;
  border: none;
  background: rgba(15, 23, 42, 0.9);
  color: #ffffff;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.hero-cta::after {
  border: none;
}

.cta-left {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.cta-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  background-color: rgba(248, 250, 252, 0.12);
  text-align: center;
  line-height: 56rpx;
  margin-right: 18rpx;
}

.cta-texts {
  display: flex;
  flex-direction: column;
}

.cta-title {
  font-size: 28rpx;
  font-weight: 600;
}

.cta-sub {
  font-size: 22rpx;
  opacity: 0.9;
  margin-top: 4rpx;
}

.cta-arrow {
  font-size: 40rpx;
  opacity: 0.8;
}

/* 通用卡片 */
.card {
  margin: 24rpx 24rpx 0;
  padding: 24rpx 24rpx 16rpx;
  border-radius: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.06);
}

.card-header {
  margin-bottom: 12rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.card-sub {
  font-size: 22rpx;
  color: #6b7280;
  margin-top: 4rpx;
}

.card-list {
  margin-top: 8rpx;
}

.card-item {
  padding: 18rpx 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-bottom-width: 1rpx;
  border-bottom-style: solid;
  border-bottom-color: #f3f4f6;
}

.card-item:last-child {
  border-bottom-width: 0;
}

.card-item.disabled {
  opacity: 0.6;
}

.item-left {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.item-icon {
  width: 40rpx;
  text-align: center;
  margin-right: 16rpx;
}

.item-texts {
  display: flex;
  flex-direction: column;
}

.item-label {
  font-size: 26rpx;
  color: #111827;
}

.item-desc {
  font-size: 22rpx;
  color: #9ca3af;
  margin-top: 4rpx;
}

.item-value {
  font-size: 24rpx;
  color: #4b5563;
}

.item-value-muted {
  color: #9ca3af;
}

/* 底部按钮 */
.footer {
  margin-top: 32rpx;
  padding: 0 24rpx;
}

.footer-btn {
  width: 100%;
  padding: 22rpx 24rpx;
  border-radius: 999rpx;
  border: none;
  background-color: #111827;
  color: #ffffff;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.footer-btn::after {
  border: none;
}

.footer-icon {
  margin-right: 8rpx;
  font-size: 30rpx;
}

.footer-text {
  font-size: 26rpx;
}
</style>
