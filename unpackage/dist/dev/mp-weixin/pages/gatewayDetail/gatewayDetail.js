"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      gateway: { id: "", name: "", deviceName: "", productKey: "", status: "" },
      deviceList: [],
      loading: false,
      operateBaseUrl: "",
      operateToken: "",
      gatewayDetailBaseUrl: "",
      gatewayDetailToken: "",
      tenantId: "",
      selectedDevices: [],
      btnLoading: {},
      isAllSelected: false
      // 全选状态
    };
  },
  onLoad(options) {
    this.gateway = {
      id: options.gatewayId,
      name: options.name,
      deviceName: options.deviceName,
      productKey: options.productKey,
      status: options.status
    };
    this.operateBaseUrl = common_vendor.index.getStorageSync("config_baseUrl") || "";
    this.operateToken = common_vendor.index.getStorageSync("config_token") || "";
    this.gatewayDetailBaseUrl = common_vendor.index.getStorageSync("config_gatewayDetailBaseUrl") || "";
    this.gatewayDetailToken = common_vendor.index.getStorageSync("config_gatewayDetailToken") || "";
    this.tenantId = common_vendor.index.getStorageSync("config_tenantId") || "";
    if (!this.gatewayDetailBaseUrl || !this.gatewayDetailToken) {
      common_vendor.index.showToast({
        title: "请先配置网关详情接口/Token",
        icon: "none",
        duration: 2e3
      });
      setTimeout(() => {
        common_vendor.index.navigateTo({ url: "/pages/setting/setting" });
      }, 2e3);
      return;
    }
    this.getDeviceList();
  },
  watch: {
    // 监听选中设备列表变化，自动更新全选状态
    selectedDevices(newVal) {
      this.isAllSelected = this.deviceList.length > 0 && newVal.length === this.deviceList.length;
    },
    // 监听设备列表变化，重置全选状态
    deviceList() {
      this.isAllSelected = false;
      this.selectedDevices = [];
    }
  },
  methods: {
    // 判断单个设备是否选中
    isSelected(device) {
      return this.selectedDevices.some((item) => item.id === device.id);
    },
    // 全选/取消全选逻辑
    handleSelectAll() {
      if (this.deviceList.length === 0) {
        common_vendor.index.showToast({ title: "暂无设备可选择", icon: "none" });
        return;
      }
      this.isAllSelected = !this.isAllSelected;
      if (this.isAllSelected) {
        this.selectedDevices = [...this.deviceList];
      } else {
        this.selectedDevices = [];
      }
    },
    // 单个设备选择逻辑
    handleSelectDevice(device) {
      const isExist = this.selectedDevices.some((item) => item.id === device.id);
      if (isExist) {
        this.selectedDevices = this.selectedDevices.filter((item) => item.id !== device.id);
      } else {
        this.selectedDevices.push(device);
      }
    },
    copyMAC() {
      common_vendor.index.setClipboardData({
        data: this.gateway.deviceName,
        success: () => common_vendor.index.showToast({ title: "复制成功", icon: "success" }),
        fail: () => common_vendor.index.showToast({ title: "复制失败", icon: "none" })
      });
    },
    getDeviceList() {
      if (this.loading)
        return;
      this.loading = true;
      const requestUrl = `${this.gatewayDetailBaseUrl}/v1/gateways/${this.gateway.id}/devices`;
      common_vendor.index.request({
        url: requestUrl,
        method: "GET",
        header: {
          "Authorization": this.gatewayDetailToken,
          "Content-Type": "application/json"
        },
        success: (res) => {
          this.loading = false;
          if (res.statusCode === 200) {
            this.deviceList = res.data.list || res.data || [];
            if (this.deviceList.length === 0) {
              common_vendor.index.showToast({ title: "该网关暂无绑定设备", icon: "none" });
            }
          } else {
            common_vendor.index.showToast({ title: `网关详情查询失败：${res.statusCode}`, icon: "none" });
          }
        },
        fail: (err) => {
          this.loading = false;
          common_vendor.index.__f__("error", "at pages/gatewayDetail/gatewayDetail.vue:203", "网关详情请求失败：", err);
          common_vendor.index.showToast({ title: "网关详情接口不可达", icon: "none" });
        }
      });
    },
    handleBatchLightOn() {
      if (this.selectedDevices.length === 0) {
        common_vendor.index.showToast({ title: "请选择要操作的设备", icon: "none" });
        return;
      }
      this.selectedDevices.forEach((device) => this.openLight(device));
    },
    handleBatchLightOff() {
      if (this.selectedDevices.length === 0) {
        common_vendor.index.showToast({ title: "请选择要操作的设备", icon: "none" });
        return;
      }
      this.selectedDevices.forEach((device) => this.closeLight(device));
    },
    handleBatchSocketOn() {
      if (this.selectedDevices.length === 0) {
        common_vendor.index.showToast({ title: "请选择要操作的设备", icon: "none" });
        return;
      }
      this.selectedDevices.forEach((device) => this.openSocket(device));
    },
    handleBatchSocketOff() {
      if (this.selectedDevices.length === 0) {
        common_vendor.index.showToast({ title: "请选择要操作的设备", icon: "none" });
        return;
      }
      this.selectedDevices.forEach((device) => this.closeSocket(device));
    },
    handleBatchScreen() {
      if (this.selectedDevices.length === 0) {
        common_vendor.index.showToast({ title: "请选择要操作的设备", icon: "none" });
        return;
      }
      this.selectedDevices.forEach((device) => this.screenDisplay(device));
    },
    handleBatchKickOut() {
      if (this.selectedDevices.length === 0) {
        common_vendor.index.showToast({ title: "请选择要操作的设备", icon: "none" });
        return;
      }
      common_vendor.index.showModal({
        title: "确认踢出",
        content: `确定要踢出选中的${this.selectedDevices.length}个设备吗？`,
        confirmText: "确定",
        cancelText: "取消",
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.selectedDevices.forEach((device) => this.executeKickOut(device));
          }
        }
      });
    },
    openLight(device) {
      const btnKey = `${device.deviceName}_lightOn`;
      this.sendDeviceCommand(device, "/v1/commands/lights/on", btnKey);
    },
    closeLight(device) {
      const btnKey = `${device.deviceName}_lightOff`;
      this.sendDeviceCommand(device, "/v1/commands/lights/off", btnKey);
    },
    openSocket(device) {
      const btnKey = `${device.deviceName}_socketOn`;
      this.sendDeviceCommand(device, "/v1/commands/sockets/on", btnKey);
    },
    closeSocket(device) {
      const btnKey = `${device.deviceName}_socketOff`;
      this.sendDeviceCommand(device, "/v1/commands/sockets/off", btnKey);
    },
    screenDisplay(device) {
      const btnKey = `${device.deviceName}_screen`;
      if (!this.operateBaseUrl || !this.operateToken) {
        common_vendor.index.showToast({ title: "设备操作配置缺失，请重新配置", icon: "none" });
        return;
      }
      if (!(device == null ? void 0 : device.deviceName))
        return;
      if (device.status !== "ONLINE") {
        common_vendor.index.showToast({ title: `${device.name} 离线，无法操作`, icon: "none" });
        return;
      }
      this.btnLoading[btnKey] = true;
      const requestUrl = `${this.operateBaseUrl}/v1/commands/screens/display`;
      common_vendor.index.request({
        url: requestUrl,
        method: "POST",
        header: {
          "Authorization": this.operateToken,
          "Content-Type": "application/json"
        },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || "",
          contents: [
            { "type": 3, "content": "", "width": 0, "length": 0, "x": 72, "y": 20, "fontHeight": 32, "fontWidth": 32, "fontWeight": 55, "center": true },
            { "type": 4, "content": device.name || "001", "width": 0, "length": 0, "x": 10, "y": 100, "fontHeight": 32, "fontWidth": 32, "fontWeight": 55, "center": true },
            { "type": 5, "content": " ", "width": 0, "length": 0, "x": 100, "y": 110, "fontHeight": 32, "fontWidth": 32, "fontWeight": 40, "center": true },
            { "type": 1, "content": "", "width": 0, "length": 0, "x": 72, "y": 115, "fontHeight": 48, "fontWidth": 48, "fontWeight": 55 },
            { "type": 2, "content": " ", "width": 0, "length": 0, "x": 72, "y": 145, "fontHeight": 32, "fontWidth": 32, "fontWeight": 40, "center": true },
            { "type": 9, "content": " ", "width": 0, "length": 0, "x": 0, "y": 0, "fontHeight": 32, "fontWidth": 32, "fontWeight": 55 },
            { "type": 11, "content": "", "width": 0, "length": 0, "x": 50, "y": 190, "fontHeight": 24, "fontWidth": 24, "fontWeight": 30, "center": true },
            { "type": 8, "content": "", "width": 0, "length": 0, "x": 200, "y": 10, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 },
            { "type": 12, "content": device.deviceName || "", "width": 0, "length": 0, "x": 20, "y": 20, "fontHeight": 32, "fontWidth": 32, "fontWeight": 48 },
            { "type": 10, "content": "", "width": 0, "length": 0, "x": 135, "y": 225, "fontHeight": 24, "fontWidth": 24, "fontWeight": 27 },
            { "type": 13, "content": "", "width": 0, "length": 0, "x": 135, "y": 256, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 },
            { "type": 13, "content": "", "width": 0, "length": 0, "x": 135, "y": 272, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 },
            { "type": 13, "content": "", "width": 0, "length": 0, "x": 135, "y": 288, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 },
            { "type": 13, "content": "", "width": 0, "length": 0, "x": 135, "y": 304, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 }
          ]
        },
        success: (res) => {
          if (res.statusCode === 200) {
            common_vendor.index.showToast({ title: `${device.name} 刷屏成功`, icon: "success", duration: 1e3 });
          } else {
            common_vendor.index.showToast({ title: `${device.name} 刷屏失败`, icon: "none", duration: 1e3 });
          }
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/gatewayDetail/gatewayDetail.vue:338", "刷屏操作失败：", err);
          common_vendor.index.showToast({ title: `${device.name} 刷屏失败`, icon: "none", duration: 1e3 });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },
    executeKickOut(device) {
      const btnKey = `${device.deviceName}_kickOut`;
      if (!this.operateBaseUrl || !this.operateToken) {
        common_vendor.index.showToast({ title: "设备操作配置缺失，请重新配置", icon: "none" });
        return;
      }
      if (!(device == null ? void 0 : device.id)) {
        common_vendor.index.showToast({ title: "设备ID缺失，无法踢出", icon: "none" });
        return;
      }
      this.btnLoading[btnKey] = true;
      const requestUrl = `${this.operateBaseUrl}/v1/devices/kick-out`;
      const queryParams = this.tenantId ? { tenantId: this.tenantId } : {};
      common_vendor.index.request({
        url: requestUrl,
        method: "POST",
        header: {
          "Authorization": this.operateToken,
          "Content-Type": "application/json"
        },
        data: { deviceIds: [device.id] },
        params: queryParams,
        success: (res) => {
          if (res.statusCode === 200) {
            common_vendor.index.showToast({ title: `${device.name || device.deviceName} 踢出成功`, icon: "success", duration: 1e3 });
            this.removeDeviceFromList(device.id);
          } else {
            common_vendor.index.showToast({ title: `${device.name || device.deviceName} 踢出失败`, icon: "none", duration: 1e3 });
          }
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/gatewayDetail/gatewayDetail.vue:381", "踢出操作失败：", err);
          common_vendor.index.showToast({ title: `${device.name || device.deviceName} 踢出失败`, icon: "none" });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },
    sendDeviceCommand(device, path, btnKey) {
      if (!this.operateBaseUrl || !this.operateToken) {
        common_vendor.index.showToast({ title: "设备操作配置缺失，请重新配置", icon: "none" });
        return;
      }
      if (!(device == null ? void 0 : device.deviceName))
        return;
      if (device.status !== "ONLINE") {
        common_vendor.index.showToast({ title: `${device.name} 离线，无法操作`, icon: "none" });
        return;
      }
      this.btnLoading[btnKey] = true;
      const cmdName = path.includes("lights/on") ? "开灯" : path.includes("lights/off") ? "关灯" : path.includes("sockets/on") ? "开插座" : "关插座";
      const requestUrl = `${this.operateBaseUrl}${path}`;
      common_vendor.index.request({
        url: requestUrl,
        method: "POST",
        header: {
          "Authorization": this.operateToken,
          "Content-Type": "application/json"
        },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ""
        },
        success: (res) => {
          if (res.statusCode === 200) {
            common_vendor.index.showToast({ title: `${device.name} ${cmdName}成功`, icon: "success" });
          } else {
            common_vendor.index.__f__("error", "at pages/gatewayDetail/gatewayDetail.vue:422", `${cmdName}操作返回异常：`, res);
            common_vendor.index.showToast({ title: `${device.name} ${cmdName}失败`, icon: "none" });
          }
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/gatewayDetail/gatewayDetail.vue:427", `${cmdName}操作请求失败：`, err);
          common_vendor.index.showToast({ title: `${device.name} ${cmdName}失败`, icon: "none" });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },
    removeDeviceFromList(deviceId) {
      this.deviceList = this.deviceList.filter((item) => item.id !== deviceId);
      this.selectedDevices = this.selectedDevices.filter((item) => item.id !== deviceId);
    },
    // 核心修改：跳转到扫网（配网）页面
    handleAddDevice() {
      if (!this.gateway.deviceName || !this.gateway.productKey) {
        common_vendor.index.showToast({ title: "网关MAC/产品Key缺失，无法配网", icon: "none" });
        return;
      }
      const jumpUrl = `/pages/scan-web/scan-web?deviceName=${encodeURIComponent(this.gateway.deviceName)}&productKey=${encodeURIComponent(this.gateway.productKey)}&name=${encodeURIComponent(this.gateway.name || "")}`;
      common_vendor.index.navigateTo({
        url: jumpUrl,
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/gatewayDetail/gatewayDetail.vue:454", "跳转配网页面失败：", err);
          common_vendor.index.showToast({ title: "配网页面不存在，请检查路由配置", icon: "none" });
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.gateway.deviceName),
    b: common_vendor.o((...args) => $options.copyMAC && $options.copyMAC(...args)),
    c: common_vendor.t($data.gateway.name || "无"),
    d: common_vendor.t($data.gateway.productKey || "无"),
    e: common_vendor.o((...args) => $options.handleBatchLightOn && $options.handleBatchLightOn(...args)),
    f: common_vendor.o((...args) => $options.handleBatchLightOff && $options.handleBatchLightOff(...args)),
    g: common_vendor.o((...args) => $options.handleBatchSocketOn && $options.handleBatchSocketOn(...args)),
    h: common_vendor.o((...args) => $options.handleBatchSocketOff && $options.handleBatchSocketOff(...args)),
    i: common_vendor.o((...args) => $options.handleBatchScreen && $options.handleBatchScreen(...args)),
    j: common_vendor.o((...args) => $options.handleBatchKickOut && $options.handleBatchKickOut(...args)),
    k: common_vendor.o((...args) => $options.handleAddDevice && $options.handleAddDevice(...args)),
    l: common_vendor.o((...args) => $options.handleSelectAll && $options.handleSelectAll(...args)),
    m: $data.isAllSelected,
    n: common_vendor.f($data.deviceList, (device, index, i0) => {
      return {
        a: common_vendor.o(($event) => $options.handleSelectDevice(device), device.id),
        b: $options.isSelected(device),
        c: common_vendor.t(index + 1),
        d: common_vendor.t(device.deviceName),
        e: common_vendor.t(device.name || "-"),
        f: device.id,
        g: $options.isSelected(device) ? 1 : ""
      };
    }),
    o: $data.deviceList.length === 0 && !$data.loading
  }, $data.deviceList.length === 0 && !$data.loading ? {} : {}, {
    p: $data.loading
  }, $data.loading ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7a762f89"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/gatewayDetail/gatewayDetail.js.map
