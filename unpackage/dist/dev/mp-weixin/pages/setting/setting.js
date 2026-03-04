"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      // 密码验证相关
      showPasswordModal: false,
      inputPassword: "",
      isAuthenticated: false,
      // 默认密码（首次使用）
      defaultPassword: "123456",
      // 通用接口配置
      baseUrl: "",
      token: "",
      // 网关详情接口配置
      gatewayDetailBaseUrl: "",
      gatewayDetailToken: "",
      // 扫网参数
      scanDuration: 60,
      whiteProductKey: "RE03010TCV2",
      gatewayProductKey: "R101Gateway",
      // 修改密码相关
      newPassword: "",
      confirmNewPassword: ""
    };
  },
  onLoad() {
    this.checkAuthentication();
  },
  onShow() {
    if (!this.isAuthenticated) {
      this.checkAuthentication();
    }
  },
  methods: {
    // 检查是否已认证
    checkAuthentication() {
      const authenticated = common_vendor.index.getStorageSync("setting_authenticated");
      const authTimestamp = common_vendor.index.getStorageSync("setting_auth_timestamp");
      const now = Date.now();
      const expireTime = 1 * 60 * 60 * 1e3;
      if (authenticated && authTimestamp && now - authTimestamp < expireTime) {
        this.isAuthenticated = true;
        this.loadConfig();
      } else {
        this.showPasswordModal = true;
      }
    },
    // 验证密码
    verifyPassword() {
      if (!this.inputPassword) {
        common_vendor.index.showToast({ title: "请输入密码", icon: "none" });
        return;
      }
      const savedPassword = common_vendor.index.getStorageSync("admin_password") || this.defaultPassword;
      if (this.inputPassword === savedPassword) {
        this.isAuthenticated = true;
        this.showPasswordModal = false;
        this.inputPassword = "";
        common_vendor.index.setStorageSync("setting_authenticated", true);
        common_vendor.index.setStorageSync("setting_auth_timestamp", Date.now());
        this.loadConfig();
        common_vendor.index.showToast({ title: "验证成功", icon: "success" });
      } else {
        common_vendor.index.showToast({ title: "密码错误", icon: "none" });
      }
    },
    // 取消验证
    handleCancel() {
      this.showPasswordModal = false;
      this.inputPassword = "";
      common_vendor.index.switchTab({
        url: "/pages/index/index"
      });
    },
    // 加载配置
    loadConfig() {
      this.baseUrl = common_vendor.index.getStorageSync("config_baseUrl") || "";
      this.token = common_vendor.index.getStorageSync("config_token") || "";
      this.gatewayDetailBaseUrl = common_vendor.index.getStorageSync("config_gatewayDetailBaseUrl") || "";
      this.gatewayDetailToken = common_vendor.index.getStorageSync("config_gatewayDetailToken") || "";
      this.scanDuration = common_vendor.index.getStorageSync("config_scanDuration") || 60;
      this.whiteProductKey = common_vendor.index.getStorageSync("config_whiteProductKey") || "RE03010TCV2";
      this.gatewayProductKey = common_vendor.index.getStorageSync("config_gatewayProductKey") || "R101Gateway";
    },
    // 保存所有配置（保留你原本的逻辑）
    saveConfig() {
      if (!this.baseUrl || !this.token) {
        return common_vendor.index.showToast({ title: "请填写通用地址和Token", icon: "none" });
      }
      if (this.scanDuration < 1) {
        return common_vendor.index.showToast({ title: "扫网时长需大于0秒", icon: "none" });
      }
      common_vendor.index.setStorageSync("config_baseUrl", this.baseUrl);
      common_vendor.index.setStorageSync("config_token", this.token);
      common_vendor.index.setStorageSync("config_gatewayDetailBaseUrl", this.gatewayDetailBaseUrl);
      common_vendor.index.setStorageSync("config_gatewayDetailToken", this.gatewayDetailToken);
      common_vendor.index.setStorageSync("config_scanDuration", this.scanDuration);
      common_vendor.index.setStorageSync("config_whiteProductKey", this.whiteProductKey);
      common_vendor.index.setStorageSync("config_gatewayProductKey", this.gatewayProductKey);
      common_vendor.index.showToast({ title: "保存成功", icon: "success" });
      setTimeout(() => {
        common_vendor.index.navigateBack();
      }, 1e3);
    },
    // 修改密码
    changePassword() {
      if (!this.newPassword) {
        common_vendor.index.showToast({ title: "请输入新密码", icon: "none" });
        return;
      }
      if (this.newPassword !== this.confirmNewPassword) {
        common_vendor.index.showToast({ title: "两次输入的密码不一致", icon: "none" });
        return;
      }
      if (this.newPassword.length < 6) {
        common_vendor.index.showToast({ title: "密码长度至少6位", icon: "none" });
        return;
      }
      common_vendor.index.showModal({
        title: "确认修改",
        content: "确定要修改密码吗？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.setStorageSync("admin_password", this.newPassword);
            common_vendor.index.removeStorageSync("setting_authenticated");
            common_vendor.index.removeStorageSync("setting_auth_timestamp");
            this.newPassword = "";
            this.confirmNewPassword = "";
            this.isAuthenticated = false;
            common_vendor.index.showToast({ title: "密码修改成功，请重新登录", icon: "success" });
            setTimeout(() => {
              this.showPasswordModal = true;
            }, 1500);
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.showPasswordModal
  }, $data.showPasswordModal ? {
    b: common_vendor.o((...args) => $options.verifyPassword && $options.verifyPassword(...args)),
    c: $data.inputPassword,
    d: common_vendor.o(($event) => $data.inputPassword = $event.detail.value),
    e: common_vendor.o((...args) => $options.handleCancel && $options.handleCancel(...args)),
    f: common_vendor.o((...args) => $options.verifyPassword && $options.verifyPassword(...args))
  } : {}, {
    g: $data.showPasswordModal
  }, $data.showPasswordModal ? {
    h: common_vendor.o((...args) => $options.handleCancel && $options.handleCancel(...args))
  } : {}, {
    i: $data.isAuthenticated
  }, $data.isAuthenticated ? {
    j: $data.baseUrl,
    k: common_vendor.o(($event) => $data.baseUrl = $event.detail.value),
    l: $data.token,
    m: common_vendor.o(($event) => $data.token = $event.detail.value),
    n: $data.gatewayDetailBaseUrl,
    o: common_vendor.o(($event) => $data.gatewayDetailBaseUrl = $event.detail.value),
    p: $data.gatewayDetailToken,
    q: common_vendor.o(($event) => $data.gatewayDetailToken = $event.detail.value),
    r: $data.gatewayProductKey,
    s: common_vendor.o(($event) => $data.gatewayProductKey = $event.detail.value),
    t: $data.whiteProductKey,
    v: common_vendor.o(($event) => $data.whiteProductKey = $event.detail.value),
    w: $data.scanDuration,
    x: common_vendor.o(common_vendor.m(($event) => $data.scanDuration = $event.detail.value, {
      number: true
    })),
    y: $data.newPassword,
    z: common_vendor.o(($event) => $data.newPassword = $event.detail.value),
    A: $data.confirmNewPassword,
    B: common_vendor.o(($event) => $data.confirmNewPassword = $event.detail.value),
    C: common_vendor.o((...args) => $options.changePassword && $options.changePassword(...args)),
    D: common_vendor.o((...args) => $options.saveConfig && $options.saveConfig(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-018cdf56"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/setting/setting.js.map
