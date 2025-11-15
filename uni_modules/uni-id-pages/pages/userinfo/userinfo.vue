<template>
  <view class="mine-page">
    <view class="top-row">
      <text class="top-title">我的</text>
      <button class="dot-btn" @tap="goMonthlyAnalysis">···</button>
    </view>

    <view class="hero-card">
      <uni-id-pages-avatar width="160rpx" height="160rpx" class="hero-avatar"></uni-id-pages-avatar>
      <text class="hero-name">{{ displayName }}</text>
      <text class="hero-desc">我的</text>
      <button class="hero-cta" @tap="goMonthlyAnalysis">
        <text class="cta-icon">📊</text>
        <text>月度统计分析</text>
      </button>
    </view>

    <view class="info-card">
      <view class="info-item" @tap="setNickname('')">
        <view class="info-left">
          <text class="info-icon user">👤</text>
          <text class="info-label">昵称</text>
        </view>
        <text class="info-value">{{ userInfo.nickname || '未设置' }}</text>
      </view>
      <view class="info-item" @tap="bindMobile">
        <view class="info-left">
          <text class="info-icon phone">📞</text>
          <text class="info-label">手机号</text>
        </view>
        <text class="info-value">{{ userInfo.mobile || '未绑定' }}</text>
      </view>
    </view>

    <view class="logout-wrap">
      <button class="logout-btn" @tap="userInfo._id ? logout() : login()">
        <text class="logout-icon">↪</text>
        <text>{{ userInfo._id ? '退出登录' : '去登录' }}</text>
      </button>
    </view>

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
    <uni-id-pages-bind-mobile ref="bind-mobile-by-sms" @success="bindMobileSuccess"></uni-id-pages-bind-mobile>
  </view>
</template>

<script>
const uniIdCo = uniCloud.importObject('uni-id-co')
import { store, mutations } from '@/uni_modules/uni-id-pages/common/store.js'

export default {
  computed: {
    userInfo () { return store.userInfo || {} },
    displayName () { return this.userInfo.nickname || this.userInfo.username || '欢迎回来' }
  },
  data() {
    return {
      univerifyStyle: {
        authButton: { title: '本机号码一键绑定' },
        otherLoginButton: { title: '其他号码绑定' }
      },
      hasPwd: false,
      setNicknameIng: false
    }
  },
  async onShow() {
    this.univerifyStyle.authButton.title = '本机号码一键绑定'
    this.univerifyStyle.otherLoginButton.title = '其他号码绑定'
  },
  async onLoad() {
    const res = await uniIdCo.getAccountInfo()
    this.hasPwd = res.isPasswordSet
  },
  methods: {
    goMonthlyAnalysis() {
      uni.navigateTo({ url: '/pages/analytics/analytics' })
    },
    login() {
      uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd' })
    },
    logout() {
      mutations.logout()
    },
    bindMobileSuccess() {
      mutations.updateUserInfo()
    },
    changePassword() {
      if (!this.hasPwd) return
      uni.navigateTo({ url: '/uni_modules/uni-id-pages/pages/userinfo/change_pwd/change_pwd' })
    },
    bindMobile() {
      const openSms = () => this.$refs['bind-mobile-by-sms'].open()
      // #ifdef APP-PLUS
      uni.preLogin({
        provider: 'univerify',
        success: this.univerify(),
        fail: () => openSms()
      })
      // #endif
      // #ifdef MP-WEIXIN
      openSms()
      // #endif
      // #ifdef H5
      this.bindMobileBySmsCode()
      // #endif
    },
    univerify() {
      return () => {
        uni.login({
          provider: 'univerify',
          univerifyStyle: this.univerifyStyle,
          success: async e => {
            try {
              await uniIdCo.bindMobileByUniverify(e.authResult)
              mutations.updateUserInfo()
            } finally {
              uni.closeAuthView()
            }
          },
          fail: err => {
            console.log(err)
            if (err.code === '30002' || err.code === '30001') {
              this.bindMobileBySmsCode()
            }
          }
        })
      }
    },
    bindMobileBySmsCode() {
      uni.navigateTo({ url: './bind-mobile/bind-mobile' })
    },
    setNickname(nickname) {
      if (nickname) {
        mutations.updateUserInfo({ nickname })
        this.setNicknameIng = false
        this.$refs.dialog.close()
      } else {
        this.setNicknameIng = true
        this.$refs.dialog.open()
      }
    }
  }
}
</script>

<style scoped>
.mine-page { min-height: 100vh; background: #f3f5fb; padding: 20px 16px 40px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px; }
.top-row { display: flex; align-items: center; justify-content: space-between; }
.top-title { font-size: 20px; font-weight: 600; color: #1c1c1e; }
.dot-btn { width: 40px; height: 40px; border-radius: 20px; background: #fff; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.06); font-size: 16px; color: #555; }

.hero-card { background: linear-gradient(150deg,#7c3aed,#8b5cf6,#c084fc); border-radius: 28px; padding: 36px 20px 28px; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: 0 20px 40px rgba(124,58,237,0.25); }
.hero-avatar { border: 4px solid rgba(255,255,255,0.4); border-radius: 999px; }
.hero-name { font-size: 20px; color:#fff; font-weight: 600; }
.hero-desc { font-size: 13px; color: rgba(255,255,255,0.8); }
.hero-cta { margin-top: 12px; width: 100%; border-radius: 18px; border: 1px solid rgba(255,255,255,0.55); background: rgba(255,255,255,0.2); color:#fff; padding: 12px 0; display:flex; align-items:center; justify-content:center; gap:6px; font-size:14px; backdrop-filter: blur(4px); }
.cta-icon { font-size: 16px; }

.info-card { background:#fff; border-radius:20px; padding: 8px 12px; box-shadow:0 12px 24px rgba(15,23,42,0.08); display:flex; flex-direction:column; gap:4px; }
.info-item { display:flex; align-items:center; justify-content:space-between; padding:14px 8px; border-bottom:1px solid #f1f1f5; }
.info-item:last-child { border-bottom:none; }
.info-left { display:flex; align-items:center; gap:10px; }
.info-icon { width:32px; height:32px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:16px; }
.info-icon.user { background:#3b82f6; }
.info-icon.phone { background:#10b981; }
.info-label { font-size:15px; color:#1f2937; }
.info-value { font-size:14px; color:#6b7280; }

.logout-wrap { background:#fff; border-radius:18px; padding:10px; box-shadow:0 10px 20px rgba(15,23,42,0.06); }
.logout-btn { width:100%; border:none; border-radius:16px; background:#f8fafc; color:#111; font-size:15px; padding:12px 0; display:flex; align-items:center; justify-content:center; gap:6px; }
.logout-icon { font-size:16px; }
</style>
