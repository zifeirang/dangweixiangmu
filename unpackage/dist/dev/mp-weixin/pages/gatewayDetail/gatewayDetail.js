"use strict";
const common_vendor = require("../../common/vendor.js");
const API_PATHS = {
  LIGHT_ON: "/v1/commands/lights/on",
  LIGHT_OFF: "/v1/commands/lights/off",
  LIGHT_BRIGHTNESS: "/v1/commands/lights/brightness",
  SOCKET_ON: "/v1/commands/sockets/on",
  SOCKET_OFF: "/v1/commands/sockets/off",
  SCREEN_DISPLAY: "/v1/commands/screens/display",
  // 初始化接口
  SCREEN_INIT: "/v1/commands/screens/init",
  // 电参数读取接口
  VOLTAGE: "/v1/commands/voltage",
  CURRENT: "/v1/commands/current",
  POWER: "/v1/commands/power",
  ENERGY: "/v1/commands/energy"
};
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
    selectedDevices(newVal) {
      this.isAllSelected = this.deviceList.length > 0 && newVal.length === this.deviceList.length;
    },
    deviceList() {
      this.isAllSelected = false;
      this.selectedDevices = [];
    }
  },
  methods: {
    // ================== 刷屏内容生成 ==================
    generateScreenContents(seatNumber, macAddress) {
      return [
        { "type": 3, "content": "", "width": 0, "length": 0, "x": 72, "y": 20, "fontHeight": 32, "fontWidth": 32, "fontWeight": 55, "center": true },
        { "type": 4, "content": seatNumber, "width": 0, "length": 0, "x": 10, "y": 100, "fontHeight": 32, "fontWidth": 32, "fontWeight": 55, "center": true },
        { "type": 5, "content": " ", "width": 0, "length": 0, "x": 100, "y": 110, "fontHeight": 32, "fontWidth": 32, "fontWeight": 40, "center": true },
        { "type": 1, "content": "", "width": 0, "length": 0, "x": 72, "y": 115, "fontHeight": 48, "fontWidth": 48, "fontWeight": 55 },
        { "type": 2, "content": " ", "width": 0, "length": 0, "x": 72, "y": 145, "fontHeight": 32, "fontWidth": 32, "fontWeight": 40, "center": true },
        { "type": 9, "content": " ", "width": 0, "length": 0, "x": 0, "y": 0, "fontHeight": 32, "fontWidth": 32, "fontWeight": 55 },
        { "type": 11, "content": "", "width": 0, "length": 0, "x": 50, "y": 190, "fontHeight": 24, "fontWidth": 24, "fontWeight": 30, "center": true },
        { "type": 8, "content": "", "width": 0, "length": 0, "x": 200, "y": 10, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 },
        { "type": 12, "content": macAddress, "width": 0, "length": 0, "x": 20, "y": 20, "fontHeight": 32, "fontWidth": 32, "fontWeight": 48 },
        { "type": 10, "content": "", "width": 0, "length": 0, "x": 135, "y": 225, "fontHeight": 24, "fontWidth": 24, "fontWeight": 27 },
        { "type": 13, "content": "", "width": 0, "length": 0, "x": 135, "y": 256, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 },
        { "type": 13, "content": "", "width": 0, "length": 0, "x": 135, "y": 272, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 },
        { "type": 13, "content": "", "width": 0, "length": 0, "x": 135, "y": 288, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 },
        { "type": 13, "content": "", "width": 0, "length": 0, "x": 135, "y": 304, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 }
      ];
    },
    isSelected(device) {
      return this.selectedDevices.some((item) => item.id === device.id);
    },
    handleSelectAll() {
      if (this.deviceList.length === 0) {
        common_vendor.index.showToast({ title: "暂无设备可选择", icon: "none" });
        return;
      }
      this.isAllSelected = !this.isAllSelected;
      this.selectedDevices = this.isAllSelected ? [...this.deviceList] : [];
    },
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
            this.deviceList = (res.data.list || res.data || []).map((item) => ({
              ...item,
              voltage: void 0,
              current: void 0,
              power: void 0,
              energy: void 0
            }));
            if (this.deviceList.length === 0) {
              common_vendor.index.showToast({ title: "该网关暂无绑定设备", icon: "none" });
            }
          } else {
            common_vendor.index.showToast({ title: `网关详情查询失败：${res.statusCode}`, icon: "none" });
          }
        },
        fail: (err) => {
          this.loading = false;
          common_vendor.index.__f__("error", "at pages/gatewayDetail/gatewayDetail.vue:275", "网关详情请求失败：", err);
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
    // 批量初始化
    handleBatchInit() {
      if (this.selectedDevices.length === 0) {
        common_vendor.index.showToast({ title: "请选择要操作的设备", icon: "none" });
        return;
      }
      common_vendor.index.showModal({
        title: "确认初始化",
        content: `确定要初始化选中的${this.selectedDevices.length}个设备吗？`,
        confirmText: "确定",
        cancelText: "取消",
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.selectedDevices.forEach((device) => this.initDevice(device));
          }
        }
      });
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
      this.sendDeviceCommand(device, API_PATHS.LIGHT_ON, btnKey);
    },
    closeLight(device) {
      const btnKey = `${device.deviceName}_lightOff`;
      this.sendDeviceCommand(device, API_PATHS.LIGHT_OFF, btnKey);
    },
    openSocket(device) {
      const btnKey = `${device.deviceName}_socketOn`;
      this.sendDeviceCommand(device, API_PATHS.SOCKET_ON, btnKey);
    },
    closeSocket(device) {
      const btnKey = `${device.deviceName}_socketOff`;
      this.sendDeviceCommand(device, API_PATHS.SOCKET_OFF, btnKey);
    },
    // 单个设备初始化
    initDevice(device) {
      const btnKey = `${device.deviceName}_init`;
      this.sendDeviceCommand(device, API_PATHS.SCREEN_INIT, btnKey, "初始化");
    },
    screenDisplay(device) {
      const btnKey = `${device.deviceName}_screen`;
      if (!this.operateBaseUrl || !this.operateToken) {
        common_vendor.index.showToast({ title: "设备操作配置缺失", icon: "none" });
        return;
      }
      if (!(device == null ? void 0 : device.deviceName))
        return;
      this.btnLoading[btnKey] = true;
      common_vendor.index.request({
        url: `${this.operateBaseUrl}${API_PATHS.SCREEN_DISPLAY}`,
        method: "POST",
        header: { "Authorization": this.operateToken, "Content-Type": "application/json" },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || "",
          contents: this.generateScreenContents(device.name || "001", device.deviceName || "")
        },
        success: (res) => {
          common_vendor.index.showToast({
            title: res.statusCode === 200 ? `${device.name} 刷屏成功` : `${device.name} 刷屏失败`,
            icon: res.statusCode === 200 ? "success" : "none",
            duration: 1e3
          });
        },
        fail: () => common_vendor.index.showToast({ title: `${device.name} 刷屏失败`, icon: "none", duration: 1e3 }),
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },
    executeKickOut(device) {
      const btnKey = `${device.deviceName}_kickOut`;
      if (!this.operateBaseUrl || !this.operateToken) {
        common_vendor.index.showToast({ title: "设备操作配置缺失", icon: "none" });
        return;
      }
      if (!(device == null ? void 0 : device.id))
        return;
      this.btnLoading[btnKey] = true;
      const queryParams = this.tenantId ? { tenantId: this.tenantId } : {};
      common_vendor.index.request({
        url: `${this.operateBaseUrl}/v1/devices/kick-out`,
        method: "POST",
        header: { "Authorization": this.operateToken, "Content-Type": "application/json" },
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
        fail: () => common_vendor.index.showToast({ title: `${device.name || device.deviceName} 踢出失败`, icon: "none" }),
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },
    sendDeviceCommand(device, path, btnKey, customCmdName) {
      if (!this.operateBaseUrl || !this.operateToken) {
        common_vendor.index.showToast({ title: "设备操作配置缺失", icon: "none" });
        return;
      }
      if (!(device == null ? void 0 : device.deviceName))
        return;
      this.btnLoading[btnKey] = true;
      const cmdName = customCmdName || (path.includes("lights/on") ? "开灯" : path.includes("lights/off") ? "关灯" : path.includes("sockets/on") ? "开插座" : path.includes("screens/init") ? "初始化" : "关插座");
      common_vendor.index.request({
        url: `${this.operateBaseUrl}${path}`,
        method: "POST",
        header: { "Authorization": this.operateToken, "Content-Type": "application/json" },
        data: { deviceName: device.deviceName, productKey: device.productKey || "" },
        success: (res) => {
          common_vendor.index.showToast({
            title: res.statusCode === 200 ? `${device.name} ${cmdName}成功` : `${device.name} ${cmdName}失败`,
            icon: res.statusCode === 200 ? "success" : "none"
          });
        },
        fail: () => common_vendor.index.showToast({ title: `${device.name} ${cmdName}失败`, icon: "none" }),
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },
    removeDeviceFromList(deviceId) {
      this.deviceList = this.deviceList.filter((item) => item.id !== deviceId);
      this.selectedDevices = this.selectedDevices.filter((item) => item.id !== deviceId);
    },
    handleAddDevice() {
      if (!this.gateway.deviceName || !this.gateway.productKey) {
        common_vendor.index.showToast({ title: "网关MAC/产品Key缺失", icon: "none" });
        return;
      }
      const jumpUrl = `/pages/scan-web/scan-web?deviceName=${encodeURIComponent(this.gateway.deviceName)}&productKey=${encodeURIComponent(this.gateway.productKey)}&name=${encodeURIComponent(this.gateway.name || "")}`;
      common_vendor.index.navigateTo({
        url: jumpUrl,
        fail: () => common_vendor.index.showToast({ title: "配网页面不存在", icon: "none" })
      });
    },
    // ================== 批量测试（调整顺序并去除中间提示） ==================
    async batchExecuteCommands() {
      const { selectedDevices, operateBaseUrl, operateToken } = this;
      if (selectedDevices.length === 0) {
        common_vendor.index.showToast({ title: "请选择设备", icon: "none", duration: 1e3 });
        return;
      }
      if (!operateBaseUrl || !operateToken) {
        common_vendor.index.showToast({ title: "接口配置未完成", icon: "none", duration: 1e3 });
        return;
      }
      let totalSuccess = 0;
      const totalDevice = selectedDevices.length;
      const totalStepsPerDevice = 12;
      const sendCommand = (device, path, extraData = {}, method = "POST") => {
        return new Promise((resolve) => {
          const requestConfig = {
            url: `${operateBaseUrl}${path}`,
            method,
            header: { "Authorization": operateToken, "Content-Type": "application/json" },
            success: (res) => resolve(res),
            fail: () => resolve(null)
          };
          if (method === "GET") {
            requestConfig.data = { deviceName: device.deviceName, productKey: device.productKey || "", ...extraData };
          } else {
            requestConfig.data = { deviceName: device.deviceName, productKey: device.productKey || "", ...extraData };
          }
          common_vendor.index.request(requestConfig);
        });
      };
      const executeSingleDevice = async (device) => {
        let deviceSuccess = 0;
        const seatNum = device.name || "未知座位";
        common_vendor.index.showToast({ title: `${seatNum} 读取电压`, icon: "none", duration: 1e3 });
        await new Promise((r) => setTimeout(r, 1e3));
        const voltageRes = await sendCommand(device, API_PATHS.VOLTAGE, {}, "GET");
        if (voltageRes && voltageRes.statusCode === 200 && voltageRes.data) {
          deviceSuccess++;
          const deviceIndex = this.deviceList.findIndex((d) => d.id === device.id);
          if (deviceIndex !== -1) {
            this.$set(this.deviceList[deviceIndex], "voltage", voltageRes.data.data);
          }
        }
        await new Promise((r) => setTimeout(r, 2e3));
        common_vendor.index.showToast({ title: `${seatNum} 读取电流`, icon: "none", duration: 1e3 });
        await new Promise((r) => setTimeout(r, 1e3));
        const currentRes = await sendCommand(device, API_PATHS.CURRENT, {}, "GET");
        if (currentRes && currentRes.statusCode === 200 && currentRes.data) {
          deviceSuccess++;
          const deviceIndex = this.deviceList.findIndex((d) => d.id === device.id);
          if (deviceIndex !== -1) {
            this.$set(this.deviceList[deviceIndex], "current", currentRes.data.data);
          }
        }
        await new Promise((r) => setTimeout(r, 2e3));
        common_vendor.index.showToast({ title: `${seatNum} 读取功率`, icon: "none", duration: 1e3 });
        await new Promise((r) => setTimeout(r, 1e3));
        const powerRes = await sendCommand(device, API_PATHS.POWER, {}, "GET");
        if (powerRes && powerRes.statusCode === 200 && powerRes.data) {
          deviceSuccess++;
          const deviceIndex = this.deviceList.findIndex((d) => d.id === device.id);
          if (deviceIndex !== -1) {
            this.$set(this.deviceList[deviceIndex], "power", powerRes.data.data);
          }
        }
        await new Promise((r) => setTimeout(r, 2e3));
        common_vendor.index.showToast({ title: `${seatNum} 读取电量`, icon: "none", duration: 1e3 });
        await new Promise((r) => setTimeout(r, 1e3));
        const energyRes = await sendCommand(device, API_PATHS.ENERGY, {}, "GET");
        if (energyRes && energyRes.statusCode === 200 && energyRes.data) {
          deviceSuccess++;
          const deviceIndex = this.deviceList.findIndex((d) => d.id === device.id);
          if (deviceIndex !== -1) {
            this.$set(this.deviceList[deviceIndex], "energy", energyRes.data.data);
          }
        }
        await new Promise((r) => setTimeout(r, 2e3));
        common_vendor.index.showToast({ title: `${seatNum} 执行开灯`, icon: "none", duration: 1e3 });
        await new Promise((r) => setTimeout(r, 1e3));
        const lightOn = await sendCommand(device, API_PATHS.LIGHT_ON);
        if (lightOn && lightOn.statusCode === 200) {
          deviceSuccess++;
        }
        await new Promise((r) => setTimeout(r, 2e3));
        common_vendor.index.showToast({ title: `${seatNum} 设置亮度50%`, icon: "none", duration: 1e3 });
        await new Promise((r) => setTimeout(r, 1e3));
        const brightness50 = await sendCommand(device, API_PATHS.LIGHT_BRIGHTNESS, { brightness: 50 });
        if (brightness50 && brightness50.statusCode === 200) {
          deviceSuccess++;
        }
        await new Promise((r) => setTimeout(r, 2e3));
        common_vendor.index.showToast({ title: `${seatNum} 设置亮度25%`, icon: "none", duration: 1e3 });
        await new Promise((r) => setTimeout(r, 1e3));
        const brightness25 = await sendCommand(device, API_PATHS.LIGHT_BRIGHTNESS, { brightness: 25 });
        if (brightness25 && brightness25.statusCode === 200) {
          deviceSuccess++;
        }
        await new Promise((r) => setTimeout(r, 2e3));
        common_vendor.index.showToast({ title: `${seatNum} 执行关灯`, icon: "none", duration: 1e3 });
        await new Promise((r) => setTimeout(r, 1e3));
        const lightOff = await sendCommand(device, API_PATHS.LIGHT_OFF);
        if (lightOff && lightOff.statusCode === 200) {
          deviceSuccess++;
        }
        await new Promise((r) => setTimeout(r, 2e3));
        common_vendor.index.showToast({ title: `${seatNum} 开插座`, icon: "none", duration: 1e3 });
        await new Promise((r) => setTimeout(r, 1e3));
        const socketOn = await sendCommand(device, API_PATHS.SOCKET_ON);
        if (socketOn && socketOn.statusCode === 200) {
          deviceSuccess++;
        }
        await new Promise((r) => setTimeout(r, 2e3));
        common_vendor.index.showToast({ title: `${seatNum} 关插座`, icon: "none", duration: 1e3 });
        await new Promise((r) => setTimeout(r, 1e3));
        const socketOff = await sendCommand(device, API_PATHS.SOCKET_OFF);
        if (socketOff && socketOff.statusCode === 200) {
          deviceSuccess++;
        }
        await new Promise((r) => setTimeout(r, 2e3));
        common_vendor.index.showToast({ title: `${seatNum} 刷屏`, icon: "none", duration: 1e3 });
        await new Promise((r) => setTimeout(r, 1e3));
        const screen = await new Promise((resolve) => {
          common_vendor.index.request({
            url: `${operateBaseUrl}${API_PATHS.SCREEN_DISPLAY}`,
            method: "POST",
            header: { Authorization: operateToken, "Content-Type": "application/json" },
            data: { deviceName: device.deviceName, productKey: device.productKey || "", contents: this.generateScreenContents(device.name || "001", device.deviceName || "") },
            success: () => resolve(true),
            fail: () => resolve(false)
          });
        });
        if (screen) {
          deviceSuccess++;
        }
        await new Promise((r) => setTimeout(r, 3e3));
        return deviceSuccess;
      };
      for (let i = 0; i < selectedDevices.length; i++) {
        const device = selectedDevices[i];
        const seatNum = device.name || "未知座位";
        common_vendor.index.showToast({ title: `处理 ${seatNum}`, icon: "none" });
        await new Promise((r) => setTimeout(r, 1e3));
        const ok = await executeSingleDevice(device);
        totalSuccess += ok;
        common_vendor.index.showToast({ title: `${seatNum} 完成`, icon: "none" });
        if (i < selectedDevices.length - 1)
          await new Promise((r) => setTimeout(r, 3e3));
      }
      common_vendor.index.showToast({
        title: `测试完成`,
        icon: totalSuccess === totalDevice * totalStepsPerDevice ? "success" : "none",
        duration: 3e3
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
    e: common_vendor.o((...args) => $options.handleAddDevice && $options.handleAddDevice(...args)),
    f: common_vendor.o((...args) => $options.handleBatchLightOn && $options.handleBatchLightOn(...args)),
    g: common_vendor.o((...args) => $options.handleBatchLightOff && $options.handleBatchLightOff(...args)),
    h: common_vendor.o((...args) => $options.handleBatchSocketOn && $options.handleBatchSocketOn(...args)),
    i: common_vendor.o((...args) => $options.handleBatchSocketOff && $options.handleBatchSocketOff(...args)),
    j: common_vendor.o((...args) => $options.handleBatchScreen && $options.handleBatchScreen(...args)),
    k: common_vendor.o((...args) => $options.handleBatchInit && $options.handleBatchInit(...args)),
    l: common_vendor.o((...args) => $options.handleBatchKickOut && $options.handleBatchKickOut(...args)),
    m: common_vendor.o((...args) => $options.handleSelectAll && $options.handleSelectAll(...args)),
    n: $data.isAllSelected,
    o: common_vendor.f($data.deviceList, (device, index, i0) => {
      return common_vendor.e({
        a: common_vendor.o(($event) => $options.handleSelectDevice(device), device.id),
        b: $options.isSelected(device),
        c: common_vendor.t(index + 1),
        d: common_vendor.t(device.deviceName),
        e: common_vendor.t(device.name || "-"),
        f: $options.isSelected(device) ? 1 : "",
        g: device.voltage !== void 0 || device.current !== void 0 || device.power !== void 0 || device.energy !== void 0
      }, device.voltage !== void 0 || device.current !== void 0 || device.power !== void 0 || device.energy !== void 0 ? {
        h: common_vendor.t(device.voltage !== void 0 ? device.voltage + " V" : "-"),
        i: common_vendor.t(device.current !== void 0 ? device.current + " A" : "-"),
        j: common_vendor.t(device.power !== void 0 ? device.power + " W" : "-"),
        k: common_vendor.t(device.energy !== void 0 ? device.energy + " kWh" : "-")
      } : {}, {
        l: device.id
      });
    }),
    p: $data.deviceList.length === 0 && !$data.loading
  }, $data.deviceList.length === 0 && !$data.loading ? {} : {}, {
    q: $data.loading
  }, $data.loading ? {} : {}, {
    r: $data.selectedDevices.length > 0
  }, $data.selectedDevices.length > 0 ? {
    s: common_vendor.t($data.selectedDevices.length),
    t: common_vendor.o((...args) => $options.batchExecuteCommands && $options.batchExecuteCommands(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7a762f89"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/gatewayDetail/gatewayDetail.js.map
