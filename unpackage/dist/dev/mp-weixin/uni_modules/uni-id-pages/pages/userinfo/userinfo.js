"use strict";
const common_vendor = require("../../../../common/vendor.js");
const uni_modules_uniIdPages_common_store = require("../../common/store.js");
const src_services_home = require("../../../../src/services/home.js");
const uniIdCo = common_vendor.tr.importObject("uni-id-co");
const StatTile = () => "../../../../src/components/metrics/StatTile.js";
const _sfc_main = {
  components: {
    StatTile
  },
  computed: {
    userInfo() {
      return uni_modules_uniIdPages_common_store.store.userInfo;
    },
    realNameStatus() {
      if (!this.userInfo.realNameAuth) {
        return 0;
      }
      return this.userInfo.realNameAuth.authStatus;
    }
  },
  data() {
    return {
      univerifyStyle: {
        authButton: {
          "title": "本机号码一键绑定"
          // 授权按钮文案
        },
        otherLoginButton: {
          "title": "其他号码绑定"
        }
      },
      hasPwd: false,
      setNicknameIng: false,
      stats: {
        store_count: 0,
        customer_count: 0,
        month_sales: 0,
        month_consume_count: 0
      }
    };
  },
  async onShow() {
    this.univerifyStyle.authButton.title = "本机号码一键绑定";
    this.univerifyStyle.otherLoginButton.title = "其他号码绑定";
    await this.loadStats();
  },
  async onLoad(e) {
    let res = await uniIdCo.getAccountInfo();
    this.hasPwd = res.isPasswordSet;
  },
  methods: {
    async loadStats() {
      try {
        this.stats = await src_services_home.getHomeStats();
      } catch (err) {
        common_vendor.index.__f__("log", "at uni_modules/uni-id-pages/pages/userinfo/userinfo.vue:108", "load stats failed", err);
      }
    },
    kfmt(n) {
      const v = Number(n || 0);
      return v >= 1e3 ? Math.round(v / 1e3) + "K" : v;
    },
    fmtNum(n) {
      return Number(n || 0).toLocaleString("zh-CN");
    },
    login() {
      common_vendor.index.navigateTo({
        url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd",
        complete: (e) => {
        }
      });
    },
    logout() {
      uni_modules_uniIdPages_common_store.mutations.logout();
    },
    bindMobileSuccess() {
      uni_modules_uniIdPages_common_store.mutations.updateUserInfo();
    },
    changePassword() {
      common_vendor.index.navigateTo({
        url: "/uni_modules/uni-id-pages/pages/userinfo/change_pwd/change_pwd",
        complete: (e) => {
        }
      });
    },
    bindMobile() {
      this.$refs["bind-mobile-by-sms"].open();
    },
    univerify() {
      common_vendor.index.login({
        "provider": "univerify",
        "univerifyStyle": this.univerifyStyle,
        success: async (e) => {
          uniIdCo.bindMobileByUniverify(e.authResult).then((res) => {
            uni_modules_uniIdPages_common_store.mutations.updateUserInfo();
          }).catch((e2) => {
            common_vendor.index.__f__("log", "at uni_modules/uni-id-pages/pages/userinfo/userinfo.vue:170", e2);
          }).finally((e2) => {
            common_vendor.index.closeAuthView();
          });
        },
        fail: (err) => {
          common_vendor.index.__f__("log", "at uni_modules/uni-id-pages/pages/userinfo/userinfo.vue:177", err);
          if (err.code == "30002" || err.code == "30001") {
            this.bindMobileBySmsCode();
          }
        }
      });
    },
    bindMobileBySmsCode() {
      common_vendor.index.navigateTo({
        url: "./bind-mobile/bind-mobile"
      });
    },
    setNickname(nickname) {
      if (nickname) {
        uni_modules_uniIdPages_common_store.mutations.updateUserInfo({
          nickname
        });
        this.setNicknameIng = false;
        this.$refs.dialog.close();
      } else {
        this.$refs.dialog.open();
      }
    },
    deactivate() {
      common_vendor.index.navigateTo({
        url: "/uni_modules/uni-id-pages/pages/userinfo/deactivate/deactivate"
      });
    },
    async bindThirdAccount(provider) {
      const uniIdCo2 = common_vendor.tr.importObject("uni-id-co");
      const bindField = {
        weixin: "wx_openid",
        alipay: "ali_openid",
        apple: "apple_openid",
        qq: "qq_openid"
      }[provider.toLowerCase()];
      if (this.userInfo[bindField]) {
        await uniIdCo2["unbind" + provider]();
        await uni_modules_uniIdPages_common_store.mutations.updateUserInfo();
      } else {
        common_vendor.index.login({
          provider: provider.toLowerCase(),
          onlyAuthorize: true,
          success: async (e) => {
            const res = await uniIdCo2["bind" + provider]({
              code: e.code
            });
            if (res.errCode) {
              common_vendor.index.showToast({
                title: res.errMsg || "绑定失败",
                duration: 3e3
              });
            }
            await uni_modules_uniIdPages_common_store.mutations.updateUserInfo();
          },
          fail: async (err) => {
            common_vendor.index.__f__("log", "at uni_modules/uni-id-pages/pages/userinfo/userinfo.vue:234", err);
            common_vendor.index.hideLoading();
          }
        });
      }
    },
    realNameVerify() {
      common_vendor.index.navigateTo({
        url: "/uni_modules/uni-id-pages/pages/userinfo/realname-verify/realname-verify"
      });
    }
  }
};
if (!Array) {
  const _easycom_uni_id_pages_avatar2 = common_vendor.resolveComponent("uni-id-pages-avatar");
  const _component_stat_tile = common_vendor.resolveComponent("stat-tile");
  const _easycom_uni_list_item2 = common_vendor.resolveComponent("uni-list-item");
  const _easycom_uni_list2 = common_vendor.resolveComponent("uni-list");
  const _easycom_uni_popup_dialog2 = common_vendor.resolveComponent("uni-popup-dialog");
  const _easycom_uni_popup2 = common_vendor.resolveComponent("uni-popup");
  const _easycom_uni_id_pages_bind_mobile2 = common_vendor.resolveComponent("uni-id-pages-bind-mobile");
  (_easycom_uni_id_pages_avatar2 + _component_stat_tile + _easycom_uni_list_item2 + _easycom_uni_list2 + _easycom_uni_popup_dialog2 + _easycom_uni_popup2 + _easycom_uni_id_pages_bind_mobile2)();
}
const _easycom_uni_id_pages_avatar = () => "../../components/uni-id-pages-avatar/uni-id-pages-avatar.js";
const _easycom_uni_list_item = () => "../../../uni-list/components/uni-list-item/uni-list-item.js";
const _easycom_uni_list = () => "../../../uni-list/components/uni-list/uni-list.js";
const _easycom_uni_popup_dialog = () => "../../../uni-popup/components/uni-popup-dialog/uni-popup-dialog.js";
const _easycom_uni_popup = () => "../../../uni-popup/components/uni-popup/uni-popup.js";
const _easycom_uni_id_pages_bind_mobile = () => "../../components/uni-id-pages-bind-mobile/uni-id-pages-bind-mobile.js";
if (!Math) {
  (_easycom_uni_id_pages_avatar + _easycom_uni_list_item + _easycom_uni_list + _easycom_uni_popup_dialog + _easycom_uni_popup + _easycom_uni_id_pages_bind_mobile)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.p({
      width: "260rpx",
      height: "260rpx"
    }),
    b: common_vendor.p({
      icon: "🏪",
      value: $data.stats.store_count,
      label: "门店数"
    }),
    c: common_vendor.p({
      icon: "👥",
      iconColor: "#20C997",
      value: $options.fmtNum($data.stats.customer_count),
      label: "客户数"
    }),
    d: common_vendor.p({
      icon: "＄",
      iconColor: "#C8A675",
      value: "¥" + $options.kfmt($data.stats.month_sales),
      label: "本月销售额"
    }),
    e: common_vendor.p({
      icon: "🎫",
      value: $options.fmtNum($data.stats.month_consume_count),
      label: "本月消耗次数"
    }),
    f: common_vendor.o(($event) => $options.setNickname("")),
    g: common_vendor.p({
      title: "昵称",
      rightText: $options.userInfo.nickname || "未设置",
      link: true
    }),
    h: common_vendor.o($options.bindMobile),
    i: common_vendor.p({
      title: "手机号",
      rightText: $options.userInfo.mobile || "未绑定",
      link: true
    }),
    j: $options.userInfo.email
  }, $options.userInfo.email ? {
    k: common_vendor.p({
      title: "电子邮箱",
      rightText: $options.userInfo.email
    })
  } : {}, {
    l: $data.hasPwd
  }, $data.hasPwd ? {
    m: common_vendor.o($options.changePassword),
    n: common_vendor.p({
      title: "修改密码",
      link: true
    })
  } : {}, {
    o: common_vendor.o($options.setNickname),
    p: common_vendor.p({
      mode: "input",
      value: $options.userInfo.nickname,
      inputType: $data.setNicknameIng ? "nickname" : "text",
      title: "设置昵称",
      placeholder: "请输入要设置的昵称"
    }),
    q: common_vendor.sr("dialog", "0be2f605-10"),
    r: common_vendor.p({
      type: "dialog"
    }),
    s: common_vendor.sr("bind-mobile-by-sms", "0be2f605-12"),
    t: common_vendor.o($options.bindMobileSuccess),
    v: $options.userInfo._id
  }, $options.userInfo._id ? {
    w: common_vendor.o((...args) => $options.logout && $options.logout(...args))
  } : {
    x: common_vendor.o((...args) => $options.login && $options.login(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-0be2f605"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../../.sourcemap/mp-weixin/uni_modules/uni-id-pages/pages/userinfo/userinfo.js.map
