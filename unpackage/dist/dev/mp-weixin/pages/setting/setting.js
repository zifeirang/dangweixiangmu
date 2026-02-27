"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      // 原有：通用接口配置
      baseUrl: "",
      token: "",
      // 原有：网关详情接口配置
      gatewayDetailBaseUrl: "",
      gatewayDetailToken: "",
      // 新增：MCU服务器监控配置
      mcuBaseUrl: "",
      mcuToken: "",
      // 原有：扫网参数
      scanDuration: 60,
      // 扫网时长默认60秒
      whiteProductKey: "",
      // 白名单产品Key
      // 新增：网关产品Key（新增网关页面使用）
      gatewayProductKey: ""
    };
  },
  onLoad() {
    this.baseUrl = common_vendor.index.getStorageSync("config_baseUrl") || "";
    this.token = common_vendor.index.getStorageSync("config_token") || "";
    this.gatewayDetailBaseUrl = common_vendor.index.getStorageSync("config_gatewayDetailBaseUrl") || "";
    this.gatewayDetailToken = common_vendor.index.getStorageSync("config_gatewayDetailToken") || "";
    this.mcuBaseUrl = common_vendor.index.getStorageSync("config_mcuBaseUrl") || "";
    this.mcuToken = common_vendor.index.getStorageSync("config_mcuToken") || "";
    this.scanDuration = common_vendor.index.getStorageSync("config_scanDuration") || 60;
    this.whiteProductKey = common_vendor.index.getStorageSync("config_whiteProductKey") || "";
    this.gatewayProductKey = common_vendor.index.getStorageSync("config_gatewayProductKey") || "";
  },
  methods: {
    // 保存所有配置
    saveConfig() {
      const hasCommonConfig = this.baseUrl && this.token;
      const hasGatewayDetailConfig = this.gatewayDetailBaseUrl && this.gatewayDetailToken;
      const hasMcuConfig = this.mcuBaseUrl && this.mcuToken;
      if (!hasCommonConfig && !hasGatewayDetailConfig && !hasMcuConfig) {
        return common_vendor.index.showToast({ title: "请至少填写一组接口配置", icon: "none" });
      }
      if (this.scanDuration < 1) {
        return common_vendor.index.showToast({ title: "扫网时长需大于0秒", icon: "none" });
      }
      if (this.baseUrl && this.token) {
        common_vendor.index.setStorageSync("config_baseUrl", this.baseUrl);
        common_vendor.index.setStorageSync("config_token", this.token);
      }
      if (this.gatewayDetailBaseUrl && this.gatewayDetailToken) {
        common_vendor.index.setStorageSync("config_gatewayDetailBaseUrl", this.gatewayDetailBaseUrl);
        common_vendor.index.setStorageSync("config_gatewayDetailToken", this.gatewayDetailToken);
      }
      if (this.mcuBaseUrl && this.mcuToken) {
        common_vendor.index.setStorageSync("config_mcuBaseUrl", this.mcuBaseUrl);
        common_vendor.index.setStorageSync("config_mcuToken", this.mcuToken);
      } else {
        common_vendor.index.removeStorageSync("config_mcuBaseUrl");
        common_vendor.index.removeStorageSync("config_mcuToken");
      }
      common_vendor.index.setStorageSync("config_scanDuration", this.scanDuration);
      if (this.whiteProductKey) {
        common_vendor.index.setStorageSync("config_whiteProductKey", this.whiteProductKey);
      } else {
        common_vendor.index.removeStorageSync("config_whiteProductKey");
      }
      if (this.gatewayProductKey) {
        common_vendor.index.setStorageSync("config_gatewayProductKey", this.gatewayProductKey);
      } else {
        common_vendor.index.removeStorageSync("config_gatewayProductKey");
      }
      common_vendor.index.showToast({ title: "所有配置保存成功", icon: "success" });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: $data.baseUrl,
    b: common_vendor.o(($event) => $data.baseUrl = $event.detail.value),
    c: $data.token,
    d: common_vendor.o(($event) => $data.token = $event.detail.value),
    e: $data.gatewayDetailBaseUrl,
    f: common_vendor.o(($event) => $data.gatewayDetailBaseUrl = $event.detail.value),
    g: $data.gatewayDetailToken,
    h: common_vendor.o(($event) => $data.gatewayDetailToken = $event.detail.value),
    i: $data.mcuBaseUrl,
    j: common_vendor.o(($event) => $data.mcuBaseUrl = $event.detail.value),
    k: $data.mcuToken,
    l: common_vendor.o(($event) => $data.mcuToken = $event.detail.value),
    m: $data.gatewayProductKey,
    n: common_vendor.o(($event) => $data.gatewayProductKey = $event.detail.value),
    o: $data.whiteProductKey,
    p: common_vendor.o(($event) => $data.whiteProductKey = $event.detail.value),
    q: $data.scanDuration,
    r: common_vendor.o(common_vendor.m(($event) => $data.scanDuration = $event.detail.value, {
      number: true
    })),
    s: common_vendor.o((...args) => $options.saveConfig && $options.saveConfig(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-018cdf56"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/setting/setting.js.map
