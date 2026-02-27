"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      loading: false,
      addLoading: false,
      scanDuration: 60,
      whiteProductKey: "",
      deviceNameTemplate: "",
      namePrefix: "",
      nameDigit: 0,
      initNumber: 1,
      formData: {
        deviceName: "",
        productKey: "",
        name: "",
        whiteList: []
        // 初始为空数组，无默认项
      },
      operateBaseUrl: "",
      operateToken: ""
    };
  },
  onLoad(options) {
    if (options.deviceName)
      this.formData.deviceName = decodeURIComponent(options.deviceName);
    if (options.productKey)
      this.formData.productKey = decodeURIComponent(options.productKey);
    if (options.name)
      this.formData.name = decodeURIComponent(options.name);
    this.operateBaseUrl = common_vendor.index.getStorageSync("config_baseUrl") || "";
    this.operateToken = common_vendor.index.getStorageSync("config_token") || "";
    this.loadScanConfig();
    if (!this.operateBaseUrl || !this.operateToken) {
      common_vendor.index.showToast({ title: "通用接口配置缺失，请先配置", icon: "none" });
      setTimeout(() => common_vendor.index.navigateTo({ url: "/pages/setting/setting" }), 1500);
    }
  },
  onShow() {
    this.loadScanConfig();
  },
  methods: {
    loadScanConfig() {
      this.scanDuration = common_vendor.index.getStorageSync("config_scanDuration") || 60;
      this.whiteProductKey = common_vendor.index.getStorageSync("config_whiteProductKey") || "";
    },
    parseTemplate() {
      if (!this.deviceNameTemplate) {
        common_vendor.index.showToast({ title: "请输入设备名称模板", icon: "none" });
        return;
      }
      const reg = /^(.*?)(\d+)$/;
      const match = this.deviceNameTemplate.match(reg);
      if (!match || !match[2]) {
        common_vendor.index.showToast({ title: "模板格式错误，示例：108 1B001、1B001、1|001", icon: "none" });
        return;
      }
      this.namePrefix = match[1];
      const numStr = match[2];
      this.nameDigit = numStr.length;
      this.initNumber = parseInt(numStr);
    },
    generateNextName() {
      if (!this.namePrefix && this.nameDigit === 0) {
        this.parseTemplate();
        if (!this.namePrefix && this.nameDigit === 0)
          return "";
      }
      const currentCount = this.formData.whiteList.length;
      const nextNumber = this.initNumber + currentCount;
      const nextNumStr = nextNumber.toString().padStart(this.nameDigit, "0");
      return this.namePrefix + nextNumStr;
    },
    addWhiteDeviceWithScan() {
      if (!this.deviceNameTemplate) {
        common_vendor.index.showToast({ title: "请先配置设备名称模板", icon: "none" });
        return;
      }
      this.addLoading = true;
      this.doScanCodeForAdd();
    },
    doScanCodeForAdd() {
      common_vendor.index.scanCode({
        onlyFromCamera: true,
        scanType: ["qrCode"],
        success: (res) => {
          const mac = res.result.trim();
          if (!mac) {
            common_vendor.index.showToast({ title: "扫码结果为空", icon: "none" });
            this.addLoading = false;
            return;
          }
          const nextName = this.generateNextName();
          this.formData.whiteList.push({ deviceName: mac, name: nextName });
          common_vendor.index.showToast({ title: "新增设备成功", icon: "success", duration: 1e3 });
          this.addLoading = false;
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/scan-web/scan-web.vue:173", "新增设备扫码失败：", err);
          this.addLoading = false;
          if (err.errMsg.includes("permission") || err.errMsg.includes("getSetting")) {
            common_vendor.index.showModal({
              title: "需要摄像头权限",
              content: common_vendor.index.getSystemInfoSync().platform === "app-plus" ? "请在手机设置中开启App的摄像头权限" : "请在微信中开启小程序的摄像头权限",
              confirmText: "去设置",
              success: (modalRes) => {
                if (modalRes.confirm) {
                  common_vendor.index.getSystemInfoSync().platform === "app-plus" ? common_vendor.index.openAppAuthorizeSetting({ success: () => common_vendor.index.showToast({ title: "请重新新增设备", icon: "none" }) }) : common_vendor.index.openSetting({ success: () => common_vendor.index.showToast({ title: "请重新新增设备", icon: "none" }) });
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
    delWhiteDevice(index) {
      common_vendor.index.showModal({
        title: "删除确认",
        content: "确定要删除该设备吗？删除后不可恢复",
        confirmText: "确认删除",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.formData.whiteList.splice(index, 1);
            common_vendor.index.showToast({ title: "设备删除成功", icon: "success", duration: 1e3 });
          }
        }
      });
    },
    handleScan(index) {
      this.doScanCode(index);
    },
    doScanCode(index) {
      common_vendor.index.scanCode({
        onlyFromCamera: true,
        scanType: ["qrCode"],
        success: (res) => {
          this.formData.whiteList[index].deviceName = res.result.trim();
          common_vendor.index.showToast({ title: "扫码成功", icon: "success", duration: 1e3 });
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/scan-web/scan-web.vue:224", "扫码失败：", err);
          if (err.errMsg.includes("permission") || err.errMsg.includes("getSetting")) {
            common_vendor.index.showModal({
              title: "需要摄像头权限",
              content: common_vendor.index.getSystemInfoSync().platform === "app-plus" ? "请在手机设置中开启App的摄像头权限" : "请在微信中开启小程序的摄像头权限",
              confirmText: "去设置",
              success: (modalRes) => {
                if (modalRes.confirm) {
                  common_vendor.index.getSystemInfoSync().platform === "app-plus" ? common_vendor.index.openAppAuthorizeSetting({ success: () => common_vendor.index.showToast({ title: "请重新扫码", icon: "none" }) }) : common_vendor.index.openSetting({ success: () => common_vendor.index.showToast({ title: "请重新扫码", icon: "none" }) });
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
    validateForm() {
      if (this.scanDuration < 1) {
        common_vendor.index.showToast({ title: "扫网时长配置无效，请前往配置页修改", icon: "none" });
        return false;
      }
      if (!this.whiteProductKey) {
        common_vendor.index.showToast({ title: "请先在配置页设置白名单产品Key", icon: "none" });
        return false;
      }
      if (this.formData.whiteList.length === 0) {
        common_vendor.index.showToast({ title: "请至少添加一个白名单设备", icon: "none" });
        return false;
      }
      for (let item of this.formData.whiteList) {
        if (!item.deviceName) {
          common_vendor.index.showToast({ title: "白名单设备MAC不能为空", icon: "none" });
          return false;
        }
        if (!item.name) {
          common_vendor.index.showToast({ title: "设备名称不能为空", icon: "none" });
          return false;
        }
      }
      return true;
    },
    handleScanWeb() {
      if (!this.validateForm())
        return;
      const requestData = {
        ...this.formData,
        duration: this.scanDuration,
        whiteList: this.formData.whiteList.map((item) => ({
          productKey: this.whiteProductKey,
          deviceName: item.deviceName,
          name: item.name || ""
        }))
      };
      this.loading = true;
      common_vendor.index.request({
        url: `${this.operateBaseUrl}/v1/commands/gateways/scan`,
        method: "POST",
        header: {
          "Authorization": this.operateToken,
          "Content-Type": "application/json"
        },
        data: requestData,
        success: (res) => {
          if (res.statusCode === 200) {
            common_vendor.index.showToast({
              title: "扫网成功！",
              icon: "success",
              duration: 2500
            });
          } else {
            common_vendor.index.showToast({
              title: `扫网失败：${res.statusCode}，可重试`,
              icon: "none",
              duration: 2500
            });
          }
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/scan-web/scan-web.vue:312", "扫网失败：", err);
          common_vendor.index.showToast({
            title: "网络异常！请重试",
            icon: "none",
            duration: 2500
          });
        },
        complete: () => {
          this.loading = false;
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.formData.deviceName),
    b: common_vendor.t($data.formData.name),
    c: common_vendor.o((...args) => $options.parseTemplate && $options.parseTemplate(...args)),
    d: $data.deviceNameTemplate,
    e: common_vendor.o(($event) => $data.deviceNameTemplate = $event.detail.value),
    f: $data.formData.whiteList.length > 0
  }, $data.formData.whiteList.length > 0 ? {
    g: common_vendor.o((...args) => $options.addWhiteDeviceWithScan && $options.addWhiteDeviceWithScan(...args)),
    h: $data.addLoading,
    i: common_vendor.f($data.formData.whiteList, (item, index, i0) => {
      return {
        a: item.deviceName,
        b: common_vendor.o(($event) => item.deviceName = $event.detail.value, index),
        c: common_vendor.o(($event) => $options.handleScan(index), index),
        d: item.name,
        e: common_vendor.o(($event) => item.name = $event.detail.value, index),
        f: common_vendor.o(($event) => $options.delWhiteDevice(index), index),
        g: index
      };
    }),
    j: common_assets._imports_0$1
  } : {
    k: common_vendor.o((...args) => $options.addWhiteDeviceWithScan && $options.addWhiteDeviceWithScan(...args)),
    l: $data.addLoading
  }, {
    m: !$data.loading
  }, !$data.loading ? {} : {}, {
    n: $data.loading
  }, $data.loading ? {} : {}, {
    o: common_vendor.o((...args) => $options.handleScanWeb && $options.handleScanWeb(...args)),
    p: $data.loading
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-759cfe4d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/scan-web/scan-web.js.map
