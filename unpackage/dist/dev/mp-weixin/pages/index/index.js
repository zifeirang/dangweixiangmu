"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  methods: {
    // 跳转到设备列表（兼容 uni-app 所有端）
    goToDeviceList() {
      common_vendor.index.navigateTo({
        url: "/pages/deviceList/deviceList"
      });
    },
    // 跳转到网关列表
    goToGatewayList() {
      common_vendor.index.navigateTo({
        url: "/pages/gatewayList/gatewayList"
      });
    },
    // 跳转到测试列表
    goToProductTest() {
      common_vendor.index.navigateTo({
        url: "/pages/productTesting/productTesting"
      });
    },
    // 新增：跳转到服务器监控页面
    goToServerMonitor() {
      common_vendor.index.navigateTo({
        url: "/pages/server-monitor/server-monitor"
      });
    },
    // 新增：跳转到MCU状态列表页面
    goToMcuStatusList() {
      common_vendor.index.navigateTo({
        url: "/pages/mcu-status-list/mcu-status-list"
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_assets._imports_0,
    b: common_vendor.o((...args) => $options.goToDeviceList && $options.goToDeviceList(...args)),
    c: common_vendor.o((...args) => $options.goToGatewayList && $options.goToGatewayList(...args)),
    d: common_vendor.o((...args) => $options.goToProductTest && $options.goToProductTest(...args)),
    e: common_vendor.o((...args) => $options.goToServerMonitor && $options.goToServerMonitor(...args)),
    f: common_vendor.o((...args) => $options.goToMcuStatusList && $options.goToMcuStatusList(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1cf27b2a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
