"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      name: "",
      deviceName: "",
      loading: false,
      baseUrl: "",
      token: "",
      // 新增：从配置页读取网关产品Key
      gatewayProductKey: ""
    };
  },
  onLoad() {
    const savedBaseUrl = common_vendor.index.getStorageSync("config_baseUrl");
    const savedToken = common_vendor.index.getStorageSync("config_token");
    if (savedBaseUrl && savedToken) {
      this.baseUrl = savedBaseUrl;
      this.token = savedToken;
    } else {
      common_vendor.index.showToast({ title: "请先配置接口信息", icon: "none" });
      setTimeout(() => common_vendor.index.navigateBack(), 1500);
      return;
    }
    this.gatewayProductKey = common_vendor.index.getStorageSync("config_gatewayProductKey") || "";
    if (!this.gatewayProductKey) {
      common_vendor.index.showToast({ title: "请先在配置页设置网关产品Key", icon: "none" });
    }
  },
  methods: {
    // 输入事件（移除产品Key相关）
    onNameInput(e) {
      this.name = e.detail.value.trim();
    },
    onDeviceNameInput(e) {
      this.deviceName = e.detail.value.trim();
    },
    // 扫码入口：直接调用扫码（跳过不支持的权限检查）
    handleScan() {
      this.doScanCode();
    },
    // 核心扫码逻辑：兼容小程序/App双端，失败时处理权限
    doScanCode() {
      common_vendor.index.scanCode({
        onlyFromCamera: true,
        scanType: ["qrCode"],
        success: (res) => {
          this.deviceName = res.result.trim();
          common_vendor.index.showToast({ title: "扫码成功", icon: "success", duration: 1e3 });
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/gatewayCreate/gatewayCreate.vue:98", "扫码失败：", err);
          if (err.errMsg.includes("permission") || err.errMsg.includes("getSetting")) {
            common_vendor.index.showModal({
              title: "需要摄像头权限",
              content: common_vendor.index.getSystemInfoSync().platform === "app-plus" ? "请在手机设置中开启App的摄像头权限" : "请在微信中开启小程序的摄像头权限",
              confirmText: "去设置",
              success: (modalRes) => {
                if (modalRes.confirm) {
                  if (common_vendor.index.getSystemInfoSync().platform === "app-plus") {
                    common_vendor.index.openAppAuthorizeSetting({
                      success: () => common_vendor.index.showToast({ title: "请重新扫码", icon: "none" })
                    });
                  } else {
                    common_vendor.index.openSetting({
                      success: () => common_vendor.index.showToast({ title: "请重新扫码", icon: "none" })
                    });
                  }
                }
              }
            });
          } else if (err.errMsg.includes("cancel")) {
            common_vendor.index.showToast({ title: "已取消扫码", icon: "none" });
          } else {
            common_vendor.index.showToast({ title: "扫码失败，请重试", icon: "none" });
          }
        }
      });
    },
    // 保存按钮逻辑（适配网关产品Key）
    handleSave() {
      const { name, deviceName, gatewayProductKey, baseUrl, token } = this;
      if (!name)
        return common_vendor.index.showToast({ title: "请输入网关名称", icon: "none" });
      if (!deviceName)
        return common_vendor.index.showToast({ title: "请输入/扫码设备MAC", icon: "none" });
      if (!gatewayProductKey) {
        return common_vendor.index.showToast({ title: "请先在配置页设置网关产品Key", icon: "none" });
      }
      this.loading = true;
      common_vendor.index.request({
        url: `${baseUrl}/v1/gateways`,
        method: "POST",
        header: {
          "Authorization": token,
          "Content-Type": "application/json"
        },
        // 产品Key使用配置页读取的值
        data: { name, deviceName, productKey: gatewayProductKey },
        success: (res) => {
          if (res.statusCode === 200) {
            common_vendor.index.showToast({ title: "新增成功", icon: "success" });
            setTimeout(() => common_vendor.index.navigateBack(), 1500);
          } else {
            common_vendor.index.showToast({ title: "新增失败", icon: "none" });
          }
        },
        fail: () => {
          common_vendor.index.showToast({ title: "网络错误", icon: "none" });
        },
        complete: () => {
          this.loading = false;
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o([($event) => $data.name = $event.detail.value, (...args) => $options.onNameInput && $options.onNameInput(...args)]),
    b: $data.name,
    c: common_vendor.o([($event) => $data.deviceName = $event.detail.value, (...args) => $options.onDeviceNameInput && $options.onDeviceNameInput(...args)]),
    d: $data.deviceName,
    e: common_assets._imports_0$1,
    f: common_vendor.o((...args) => $options.handleScan && $options.handleScan(...args)),
    g: common_vendor.o((...args) => $options.handleSave && $options.handleSave(...args)),
    h: $data.loading,
    i: $data.loading
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-36c94b3b"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/gatewayCreate/gatewayCreate.js.map
