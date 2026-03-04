"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/index/index.js";
  "./pages/setting/setting.js";
  "./pages/gatewayCreate/gatewayCreate.js";
  "./pages/gatewayList/gatewayList.js";
  "./pages/productTesting/productTesting.js";
  "./pages/gatewayDetail/gatewayDetail.js";
  "./pages/scan-web/scan-web.js";
}
function createApp() {
  const app = common_vendor.createSSRApp({
    onShow: function() {
    },
    onLaunch: function() {
    }
  });
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
//# sourceMappingURL=../.sourcemap/mp-weixin/app.js.map
