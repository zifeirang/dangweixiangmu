"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  methods: {
    goToDeviceList() {
      common_vendor.index.navigateTo({
        url: "/pages/productTesting/productTesting",
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/index/index.vue:61", "跳转失败:", err);
          common_vendor.index.showToast({
            title: "页面未找到，请检查配置",
            icon: "none",
            duration: 2e3
          });
        }
      });
    },
    goToGatewayList() {
      common_vendor.index.navigateTo({
        url: "/pages/gatewayList/gatewayList",
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/index/index.vue:75", "跳转失败:", err);
          common_vendor.index.showToast({
            title: "页面未找到，请检查配置",
            icon: "none",
            duration: 2e3
          });
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.goToDeviceList && $options.goToDeviceList(...args)),
    b: common_vendor.o((...args) => $options.goToGatewayList && $options.goToGatewayList(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1cf27b2a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
