<!-- 用户资料 -->
<template>
  <view class="uni-content">
    <view class="avatar">
      <uni-id-pages-avatar width="260rpx" height="260rpx"></uni-id-pages-avatar>
    </view>
    <view class="profile-card">
      <view class="section-header">
        <text class="section-title">经营概览</text>
        <text class="section-subtitle">本月</text>
      </view>
      <view class="stats-grid">
        <stat-tile icon="🏪" :value="stats.store_count" label="门店数" />
        <stat-tile icon="👥" :iconColor="'#20C997'" :value="fmtNum(stats.customer_count)" label="客户数" />
        <stat-tile icon="＄" :iconColor="'#C8A675'" :value="'¥' + kfmt(stats.month_sales)" label="本月销售额" />
        <stat-tile icon="🎫" :value="fmtNum(stats.month_consume_count)" label="本月消耗次数" />
      </view>
    </view>
    <uni-list>
      <uni-list-item class="item" @click="setNickname('')" title="昵称" :rightText="userInfo.nickname||'未设置'" link>
      </uni-list-item>
      <uni-list-item class="item" @click="bindMobile" title="手机号" :rightText="userInfo.mobile||'未绑定'" link>
      </uni-list-item>
      <uni-list-item v-if="userInfo.email" class="item" title="电子邮箱" :rightText="userInfo.email">
      </uni-list-item>
      <!-- #ifdef APP -->
      <!-- 如未开通实人认证服务，可以将实名认证入口注释 -->
      <uni-list-item class="item" @click="realNameVerify" title="实名认证" :rightText="realNameStatus !== 2 ? '未认证' : '已认证'" link>
      </uni-list-item>
      <!-- #endif -->
      <uni-list-item v-if="hasPwd" class="item" @click="changePassword" title="修改密码" link>
      </uni-list-item>
    </uni-list>
    <!-- #ifndef MP -->
    <uni-list class="mt10">
      <uni-list-item @click="deactivate" title="注销账号" link="navigateTo"></uni-list-item>
    </uni-list>
    <!-- #endif -->
    <uni-popup ref="dialog" type="dialog">
      <uni-popup-dialog mode="input" :value="userInfo.nickname" @confirm="setNickname" :inputType="setNicknameIng?'nickname':'text'"
        title="设置昵称" placeholder="请输入要设置的昵称">
      </uni-popup-dialog>
    </uni-popup>
    <uni-id-pages-bind-mobile ref="bind-mobile-by-sms" @success="bindMobileSuccess"></uni-id-pages-bind-mobile>
    <view class="login-actions">
      <button v-if="userInfo._id" @click="logout">退出登录</button>
      <button v-else @click="login">去登录</button>
    </view>
  </view>
  </template>
<script>
const uniIdCo = uniCloud.importObject("uni-id-co")
import { store, mutations } from '@/uni_modules/uni-id-pages/common/store.js'
import StatTile from '@/src/components/metrics/StatTile.vue'
import { getHomeStats } from '@/src/services/home.js'

export default {
  components: {
    StatTile
  },
  computed: {
    userInfo() {
      return store.userInfo
    },
    realNameStatus () {
      if (!this.userInfo.realNameAuth) {
        return 0
      }

      return this.userInfo.realNameAuth.authStatus
    }
  },
  data() {
    return {
      univerifyStyle: {
        authButton: {
          "title": "本机号码一键绑定", // 授权按钮文案
        },
        otherLoginButton: {
          "title": "其他号码绑定",
        }
      },
      hasPwd: false,
      setNicknameIng:false,
      stats: {
        store_count: 0,
        customer_count: 0,
        month_sales: 0,
        month_consume_count: 0
      }
    }
  },
  async onShow() {
    this.univerifyStyle.authButton.title = "本机号码一键绑定"
    this.univerifyStyle.otherLoginButton.title = "其他号码绑定"
    await this.loadStats()
  },
		async onLoad(e) {
			// 判断当前用户是否有密码，否则就不显示密码修改功能
			let res = await uniIdCo.getAccountInfo()
			this.hasPwd = res.isPasswordSet
		},
		methods: {
      async loadStats() {
        try {
          this.stats = await getHomeStats()
        } catch (err) {
          console.log('load stats failed', err)
        }
      },
      kfmt(n) {
        const v = Number(n || 0)
        return v >= 1000 ? Math.round(v / 1000) + 'K' : v
      },
      fmtNum (n) {
        return Number(n || 0).toLocaleString('zh-CN')
      },
			login() {
				uni.navigateTo({
					url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd',
					complete: (e) => {
						// console.log(e);
					}
				})
			},
			logout() {
				mutations.logout()
			},
			bindMobileSuccess() {
				mutations.updateUserInfo()
			},
			changePassword() {
				uni.navigateTo({
					url: '/uni_modules/uni-id-pages/pages/userinfo/change_pwd/change_pwd',
					complete: (e) => {
						// console.log(e);
					}
				})
			},
			bindMobile() {
				// #ifdef APP-PLUS
				uni.preLogin({
					provider: 'univerify',
					success: this.univerify(), // 预登录成功
					fail: (res) => { // 预登录失败
						// 不显示一键登录选项（或置灰）
						console.log(res)
						this.bindMobileBySmsCode()
					}
				})
				// #endif

				// #ifdef MP-WEIXIN
				this.$refs['bind-mobile-by-sms'].open()
				// #endif

				// #ifdef H5
				//...去用验证码绑定
				this.bindMobileBySmsCode()
				// #endif
			},
			univerify() {
				uni.login({
					"provider": 'univerify',
					"univerifyStyle": this.univerifyStyle,
					success: async e => {
						uniIdCo.bindMobileByUniverify(e.authResult).then(res => {
							mutations.updateUserInfo()
						}).catch(e => {
							console.log(e);
						}).finally(e => {
							// console.log(e);
							uni.closeAuthView()
						})
					},
					fail: (err) => {
						console.log(err);
						if (err.code == '30002' || err.code == '30001') {
							this.bindMobileBySmsCode()
						}
					}
				})
			},
			bindMobileBySmsCode() {
				uni.navigateTo({
					url: './bind-mobile/bind-mobile'
				})
			},
			setNickname(nickname) {
				if (nickname) {
					mutations.updateUserInfo({
						nickname
					})
					this.setNicknameIng = false
					this.$refs.dialog.close()
				} else {
					this.$refs.dialog.open()
				}
			},
			deactivate(){
				uni.navigateTo({
					url:"/uni_modules/uni-id-pages/pages/userinfo/deactivate/deactivate"
				})
			},
			async bindThirdAccount(provider) {
				const uniIdCo = uniCloud.importObject("uni-id-co")
				const bindField = {
					weixin: 'wx_openid',
					alipay: 'ali_openid',
					apple: 'apple_openid',
					qq: 'qq_openid'
				}[provider.toLowerCase()]

				if (this.userInfo[bindField]) {
					await uniIdCo['unbind' + provider]()
					await mutations.updateUserInfo()
				} else {
					uni.login({
						provider: provider.toLowerCase(),
						onlyAuthorize: true,
						success: async e => {
							const res = await uniIdCo['bind' + provider]({
								code: e.code
							})
							if (res.errCode) {
								uni.showToast({
									title: res.errMsg || '绑定失败',
									duration: 3000
								})
							}
							await mutations.updateUserInfo()
						},
						fail: async (err) => {
							console.log(err);
							uni.hideLoading()
						}
					})
				}
			},
			realNameVerify () {
				uni.navigateTo({
					url: "/uni_modules/uni-id-pages/pages/userinfo/realname-verify/realname-verify"
				})
			}
		}
	}
</script>
<style lang="scss" scoped>
	@import "@/uni_modules/uni-id-pages/common/login-page.scss";

	.uni-content {
		padding: 0;
	}

	/* #ifndef APP-NVUE */
	view {
		display: flex;
		box-sizing: border-box;
		flex-direction: column;
	}

	@media screen and (min-width: 690px) {
		.uni-content {
			padding: 0;
			max-width: 690px;
			margin-left: calc(50% - 345px);
			border: none;
			max-height: none;
			border-radius: 0;
			box-shadow: none;
		}
	}

	/* #endif */
	.avatar {
		align-items: center;
		justify-content: center;
		margin: 22px 0;
		width: 100%;
	}

	.profile-card {
		margin: 0 16px 24px;
		background: #fff;
		border-radius: 24px;
		padding: 20px;
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 14px;
	}

	.section-title {
		font-size: 16px;
		font-weight: 600;
		color: #111;
	}

	.section-subtitle {
		font-size: 13px;
		color: #6f6f73;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		grid-gap: 12px;
	}

	.item {
		flex: 1;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
	}

	button {
		margin: 10%;
		margin-top: 40px;
		border-radius: 0;
		background-color: #FFFFFF;
		width: 80%;
	}

	.mt10 {
		margin-top: 10px;
	}
</style>
