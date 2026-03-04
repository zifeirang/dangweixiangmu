"use strict";
const common_vendor = require("../../common/vendor.js");
const API_PATHS = {
  DEVICES: "/v1/devices",
  KICK_OUT: "/v1/devices/kick-out",
  LIGHT_ON: "/v1/commands/lights/on",
  LIGHT_OFF: "/v1/commands/lights/off",
  LIGHT_BRIGHTNESS: "/v1/commands/lights/brightness",
  SOCKET_ON: "/v1/commands/sockets/on",
  SOCKET_OFF: "/v1/commands/sockets/off",
  SCREEN_DISPLAY: "/v1/commands/screens/display",
  // 三个查询接口
  MCU_VERSION: "/v1/commands/mcu",
  LIGHT_STATUS: "/v1/commands/lights/status",
  SOCKET_STATUS: "/v1/commands/sockets/status",
  // 计量状态接口
  MEASUREMENT_STATUS: "/v1/commands/measurements/status",
  // 电参数读取接口
  VOLTAGE: "/v1/commands/voltage",
  CURRENT: "/v1/commands/current",
  POWER: "/v1/commands/power",
  ENERGY: "/v1/commands/energy",
  // 解除告警接口
  CLEAR_ALARM: "/v1/commands/power/alarm/clear"
};
const _sfc_main = {
  data() {
    return {
      searchTypes: [
        { name: "座位号", key: "name", placeholder: "请输入座位号" },
        { name: "设备MAC", key: "deviceName", placeholder: "请输入设备MAC" },
        { name: "状态", key: "status", placeholder: "在线/离线/维修中" }
      ],
      searchTypeIndex: 0,
      searchValue: "",
      offset: 0,
      limit: 10,
      total: 0,
      deviceList: [],
      loading: false,
      hasMore: true,
      selectedDevices: [],
      isAllSelected: false,
      baseUrl: "",
      token: "",
      tenantId: "",
      expandedDevice: "",
      btnLoading: {}
    };
  },
  onLoad() {
    const savedBaseUrl = common_vendor.index.getStorageSync("config_baseUrl");
    const savedToken = common_vendor.index.getStorageSync("config_token");
    this.tenantId = common_vendor.index.getStorageSync("config_tenantId") || "";
    if (savedBaseUrl && savedToken) {
      this.baseUrl = savedBaseUrl;
      this.token = savedToken;
      this.getDeviceList();
    } else {
      common_vendor.index.showToast({ title: "请先配置接口信息", icon: "none" });
      setTimeout(() => common_vendor.index.navigateTo({ url: "/pages/setting/setting" }), 1500);
    }
  },
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.offset += this.limit;
      this.getDeviceList();
    }
  },
  methods: {
    clean_date_str(s) {
      return s ? s.split(" ")[0] : "";
    },
    isSelected(d) {
      return this.selectedDevices.some((i) => i.deviceName === d.deviceName);
    },
    statusToText(s) {
      switch (s) {
        case "ONLINE":
          return "在线";
        case "OFFLINE":
          return "离线";
        case "REPAIR":
          return "维修中";
        default:
          return "-";
      }
    },
    // 新增：计量状态文本转换（0=告警、1=正常）
    measurementStatusToText(val) {
      const numVal = Number(val);
      if (numVal === 1)
        return "正常";
      if (numVal === 0)
        return "告警";
      return "未知";
    },
    onSearchTypeChange(e) {
      this.searchTypeIndex = e.detail.value;
      this.searchValue = "";
    },
    onSearchInput(e) {
      this.searchValue = e.detail.value.trim();
    },
    onSearch() {
      this.offset = 0;
      this.deviceList = [];
      this.hasMore = true;
      this.selectedDevices = [];
      this.isAllSelected = false;
      this.getDeviceList();
    },
    getDeviceList(c) {
      if (this.loading)
        return;
      this.loading = true;
      const p = { offset: this.offset, limit: this.limit };
      if (this.searchValue)
        p[this.searchTypes[this.searchTypeIndex].key] = this.searchValue;
      if (!this.baseUrl || !this.token) {
        this.loading = false;
        common_vendor.index.showToast({ icon: "none", title: "配置未完成" });
        c && c();
        return;
      }
      common_vendor.index.request({
        url: this.baseUrl + API_PATHS.DEVICES,
        header: { Authorization: this.token },
        data: p,
        success: (r) => {
          this.loading = false;
          if (r.statusCode === 200 && r.data) {
            const l = (r.data.list || []).filter((i) => i.deviceName);
            this.deviceList = this.deviceList.concat(l.map((item) => ({
              ...item,
              voltage: void 0,
              current: void 0,
              power: void 0,
              energy: void 0
            })));
            this.hasMore = this.deviceList.length < (r.data.total || 0);
          } else
            common_vendor.index.showToast({ icon: "none", title: "加载失败" });
          c && c();
        },
        fail: () => {
          this.loading = false;
          common_vendor.index.showToast({ icon: "none", title: "请求失败" });
          c && c();
        }
      });
    },
    handleSelectDevice(d) {
      const exist = this.selectedDevices.some((i) => i.deviceName === d.deviceName);
      this.selectedDevices = exist ? this.selectedDevices.filter((i) => i.deviceName !== d.deviceName) : [...this.selectedDevices, d];
      this.isAllSelected = this.selectedDevices.length === this.deviceList.length;
    },
    handleSelectAll() {
      this.isAllSelected = !this.isAllSelected;
      this.selectedDevices = this.isAllSelected ? this.deviceList.filter((i) => i.deviceName) : [];
    },
    handleExpandDevice(n) {
      this.expandedDevice = this.expandedDevice === n ? "" : n;
    },
    // 开灯后自动读取状态
    openLight(d) {
      if (d.status != "ONLINE")
        return common_vendor.index.showToast({ icon: "none", title: "设备离线" });
      const k = `${d.deviceName}_lightOn`;
      this.btnLoading[k] = true;
      common_vendor.index.request({
        url: this.baseUrl + API_PATHS.LIGHT_ON,
        method: "POST",
        header: { Authorization: this.token },
        data: { deviceName: d.deviceName, productKey: d.productKey },
        success: () => {
          common_vendor.index.showToast({ title: "开灯成功" });
          setTimeout(() => {
            this.getLightStatusSilent(d);
          }, 500);
        },
        fail: () => common_vendor.index.showToast({ icon: "none", title: "开灯失败" }),
        complete: () => this.btnLoading[k] = false
      });
    },
    // 关灯后自动读取状态
    closeLight(d) {
      if (d.status != "ONLINE")
        return common_vendor.index.showToast({ icon: "none", title: "设备离线" });
      const k = `${d.deviceName}_lightOff`;
      this.btnLoading[k] = true;
      common_vendor.index.request({
        url: this.baseUrl + API_PATHS.LIGHT_OFF,
        method: "POST",
        header: { Authorization: this.token },
        data: { deviceName: d.deviceName, productKey: d.productKey },
        success: () => {
          common_vendor.index.showToast({ title: "关灯成功" });
          setTimeout(() => {
            this.getLightStatusSilent(d);
          }, 500);
        },
        fail: () => common_vendor.index.showToast({ icon: "none", title: "关灯失败" }),
        complete: () => this.btnLoading[k] = false
      });
    },
    // 开插座后自动读取状态
    openSocket(d) {
      if (d.status != "ONLINE")
        return common_vendor.index.showToast({ icon: "none", title: "设备离线" });
      const k = `${d.deviceName}_socketOn`;
      this.btnLoading[k] = true;
      common_vendor.index.request({
        url: this.baseUrl + API_PATHS.SOCKET_ON,
        method: "POST",
        header: { Authorization: this.token },
        data: { deviceName: d.deviceName, productKey: d.productKey },
        success: () => {
          common_vendor.index.showToast({ title: "开插座成功" });
          setTimeout(() => {
            this.getSocketStatusSilent(d);
          }, 500);
        },
        fail: () => common_vendor.index.showToast({ icon: "none", title: "开插座失败" }),
        complete: () => this.btnLoading[k] = false
      });
    },
    // 关插座后自动读取状态
    closeSocket(d) {
      if (d.status != "ONLINE")
        return common_vendor.index.showToast({ icon: "none", title: "设备离线" });
      const k = `${d.deviceName}_socketOff`;
      this.btnLoading[k] = true;
      common_vendor.index.request({
        url: this.baseUrl + API_PATHS.SOCKET_OFF,
        method: "POST",
        header: { Authorization: this.token },
        data: { deviceName: d.deviceName, productKey: d.productKey },
        success: () => {
          common_vendor.index.showToast({ title: "关插座成功" });
          setTimeout(() => {
            this.getSocketStatusSilent(d);
          }, 500);
        },
        fail: () => common_vendor.index.showToast({ icon: "none", title: "关插座失败" }),
        complete: () => this.btnLoading[k] = false
      });
    },
    screenDisplay(d) {
      const k = `${d.deviceName}_screen`;
      if (d.status != "ONLINE")
        return common_vendor.index.showToast({ icon: "none", title: "设备离线" });
      this.btnLoading[k] = true;
      this.sendScreenCommand(d).then((s) => common_vendor.index.showToast({ title: s ? "刷屏成功" : "失败" })).finally(() => this.btnLoading[k] = false);
    },
    handleKickOut(d) {
      common_vendor.index.showModal({
        title: "确认踢出",
        content: `确定踢出 ${d.name || d.deviceName}？`,
        success: (m) => m.confirm && this.executeKickOut(d)
      });
    },
    executeKickOut(d) {
      const k = `${d.deviceName}_kickOut`;
      this.btnLoading[k] = true;
      common_vendor.index.request({
        url: this.baseUrl + API_PATHS.KICK_OUT,
        method: "POST",
        header: { Authorization: this.token },
        data: { deviceIds: [d.id] },
        success: () => {
          this.removeDeviceFromList(d.deviceName);
          common_vendor.index.showToast({ title: "踢出成功" });
        },
        complete: () => this.btnLoading[k] = false
      });
    },
    removeDeviceFromList(n) {
      this.deviceList = this.deviceList.filter((i) => i.deviceName !== n);
      this.selectedDevices = this.selectedDevices.filter((i) => i.deviceName !== n);
      this.isAllSelected = this.selectedDevices.length === this.deviceList.length;
    },
    sendDeviceCommand(d, p, k, t) {
      if (d.status != "ONLINE")
        return common_vendor.index.showToast({ icon: "none", title: "设备离线" });
      this.btnLoading[k] = true;
      common_vendor.index.request({
        url: this.baseUrl + p,
        method: "POST",
        header: { Authorization: this.token },
        data: { deviceName: d.deviceName, productKey: d.productKey },
        success: () => common_vendor.index.showToast({ title: t + "成功" }),
        fail: () => common_vendor.index.showToast({ icon: "none", title: t + "失败" }),
        complete: () => this.btnLoading[k] = false
      });
    },
    generateScreenContents(s, m) {
      return [{ "type": 3, "content": "", "width": 0, "length": 0, "x": 72, "y": 20, "fontHeight": 32, "fontWidth": 32, "fontWeight": 55, "center": true }, { "type": 4, "content": s, "width": 0, "length": 0, "x": 10, "y": 100, "fontHeight": 32, "fontWidth": 32, "fontWeight": 55, "center": true }, { "type": 5, "content": " ", "width": 0, "length": 0, "x": 100, "y": 110, "fontHeight": 32, "fontWidth": 32, "fontWeight": 40, "center": true }, { "type": 1, "content": "", "width": 0, "length": 0, "x": 72, "y": 115, "fontHeight": 48, "fontWidth": 48, "fontWeight": 55 }, { "type": 2, "content": " ", "width": 0, "length": 0, "x": 72, "y": 145, "fontHeight": 32, "fontWidth": 32, "fontWeight": 40, "center": true }, { "type": 9, "content": " ", "width": 0, "length": 0, "x": 0, "y": 0, "fontHeight": 32, "fontWidth": 32, "fontWeight": 55 }, { "type": 11, "content": "", "width": 0, "length": 0, "x": 50, "y": 190, "fontHeight": 24, "fontWidth": 24, "fontWeight": 30, "center": true }, { "type": 8, "content": "", "width": 0, "length": 0, "x": 200, "y": 10, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 }, { "type": 12, "content": m, "width": 0, "length": 0, "x": 20, "y": 20, "fontHeight": 32, "fontWidth": 32, "fontWeight": 48 }, { "type": 10, "content": "", "width": 0, "length": 0, "x": 135, "y": 225, "fontHeight": 24, "fontWidth": 24, "fontWeight": 27 }, { "type": 13, "content": "", "width": 0, "length": 0, "x": 135, "y": 256, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 }, { "type": 13, "content": "", "width": 0, "length": 0, "x": 135, "y": 272, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 }, { "type": 13, "content": "", "width": 0, "length": 0, "x": 135, "y": 288, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 }, { "type": 13, "content": "", "width": 0, "length": 0, "x": 135, "y": 304, "fontHeight": 16, "fontWidth": 16, "fontWeight": 21 }];
    },
    sendScreenCommand(d) {
      return new Promise((r) => {
        common_vendor.index.request({
          url: this.baseUrl + API_PATHS.SCREEN_DISPLAY,
          method: "POST",
          header: { Authorization: this.token },
          data: { deviceName: d.deviceName, productKey: d.productKey, contents: this.generateScreenContents(d.name, d.deviceName) },
          success: () => r(true),
          fail: () => r(false)
        });
      });
    },
    // ================== 批量测试（调整顺序并去除中间提示） ==================
    async batchExecuteCommands() {
      const l = this.selectedDevices;
      if (l.length === 0)
        return common_vendor.index.showToast({ icon: "none", title: "请选择设备" });
      if (!this.baseUrl || !this.token) {
        return common_vendor.index.showToast({ title: "接口配置未完成", icon: "none", duration: 1e3 });
      }
      let totalSuccess = 0;
      const totalDevice = l.length;
      const totalStepsPerDevice = 12;
      const sendCommand = (device, path, extraData = {}, method = "POST") => {
        return new Promise((resolve) => {
          const requestConfig = {
            url: `${this.baseUrl}${path}`,
            method,
            header: { "Authorization": this.token, "Content-Type": "application/json" },
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
          const deviceIndex = this.deviceList.findIndex((d) => d.deviceName === device.deviceName);
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
          const deviceIndex = this.deviceList.findIndex((d) => d.deviceName === device.deviceName);
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
          const deviceIndex = this.deviceList.findIndex((d) => d.deviceName === device.deviceName);
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
          const deviceIndex = this.deviceList.findIndex((d) => d.deviceName === device.deviceName);
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
        const screen = await this.sendScreenCommand(device);
        if (screen) {
          deviceSuccess++;
        }
        await new Promise((r) => setTimeout(r, 3e3));
        return deviceSuccess;
      };
      for (let i = 0; i < l.length; i++) {
        const device = l[i];
        const seatNum = device.name || "未知座位";
        common_vendor.index.showToast({ title: `处理 ${seatNum}`, icon: "none" });
        await new Promise((r) => setTimeout(r, 1e3));
        const ok = await executeSingleDevice(device);
        totalSuccess += ok;
        common_vendor.index.showToast({ title: `${seatNum} 完成`, icon: "none" });
        if (i < l.length - 1)
          await new Promise((r) => setTimeout(r, 3e3));
      }
      common_vendor.index.showToast({
        title: `测试完成`,
        icon: totalSuccess === totalDevice * totalStepsPerDevice ? "success" : "none",
        duration: 3e3
      });
    },
    // 查询 MCU 版本
    getMcuVersion(device) {
      const btnKey = `${device.deviceName}_mcu`;
      if (device.status !== "ONLINE") {
        return common_vendor.index.showToast({ icon: "none", title: "设备离线" });
      }
      this.btnLoading[btnKey] = true;
      common_vendor.index.request({
        url: `${this.baseUrl}${API_PATHS.MCU_VERSION}`,
        method: "GET",
        header: { "Authorization": this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ""
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            const deviceIndex = this.deviceList.findIndex((d) => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], "mcuVersion", res.data.data || "未知");
            }
            common_vendor.index.showToast({ title: "MCU版本获取成功", icon: "success" });
          } else {
            common_vendor.index.showToast({ icon: "none", title: "获取失败" });
          }
        },
        fail: () => {
          common_vendor.index.showToast({ icon: "none", title: "网络请求失败" });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },
    // 读取灯状态（有 Toast）
    getLightStatus(device) {
      const btnKey = `${device.deviceName}_lightStatus`;
      if (device.status !== "ONLINE") {
        return common_vendor.index.showToast({ icon: "none", title: "设备离线" });
      }
      this.btnLoading[btnKey] = true;
      common_vendor.index.request({
        url: `${this.baseUrl}${API_PATHS.LIGHT_STATUS}`,
        method: "GET",
        header: { "Authorization": this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ""
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            const deviceIndex = this.deviceList.findIndex((d) => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], "lightStatus", res.data.data);
            }
            common_vendor.index.showToast({ title: `灯状态：${res.data.data ? "开启" : "关闭"}`, icon: "success" });
          } else {
            common_vendor.index.showToast({ icon: "none", title: "获取失败" });
          }
        },
        fail: () => {
          common_vendor.index.showToast({ icon: "none", title: "网络请求失败" });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },
    // 读取灯状态（静默，无 Toast）
    getLightStatusSilent(device) {
      if (device.status !== "ONLINE")
        return;
      common_vendor.index.request({
        url: `${this.baseUrl}${API_PATHS.LIGHT_STATUS}`,
        method: "GET",
        header: { "Authorization": this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ""
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            const deviceIndex = this.deviceList.findIndex((d) => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], "lightStatus", res.data.data);
            }
          }
        }
      });
    },
    // 读取插座状态（有 Toast）
    getSocketStatus(device) {
      const btnKey = `${device.deviceName}_socketStatus`;
      if (device.status !== "ONLINE") {
        return common_vendor.index.showToast({ icon: "none", title: "设备离线" });
      }
      this.btnLoading[btnKey] = true;
      common_vendor.index.request({
        url: `${this.baseUrl}${API_PATHS.SOCKET_STATUS}`,
        method: "GET",
        header: { "Authorization": this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ""
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            const deviceIndex = this.deviceList.findIndex((d) => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], "socketStatus", res.data.data);
            }
            common_vendor.index.showToast({ title: `插座状态：${res.data.data ? "开启" : "关闭"}`, icon: "success" });
          } else {
            common_vendor.index.showToast({ icon: "none", title: "获取失败" });
          }
        },
        fail: () => {
          common_vendor.index.showToast({ icon: "none", title: "网络请求失败" });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },
    // 读取插座状态（静默，无 Toast）
    getSocketStatusSilent(device) {
      if (device.status !== "ONLINE")
        return;
      common_vendor.index.request({
        url: `${this.baseUrl}${API_PATHS.SOCKET_STATUS}`,
        method: "GET",
        header: { "Authorization": this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ""
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            const deviceIndex = this.deviceList.findIndex((d) => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], "socketStatus", res.data.data);
            }
          }
        }
      });
    },
    // 修改：读取计量状态（适配0=告警、1=正常）
    getMeasurementStatus(device) {
      const btnKey = `${device.deviceName}_measurement`;
      if (device.status !== "ONLINE") {
        return common_vendor.index.showToast({ icon: "none", title: "设备离线" });
      }
      this.btnLoading[btnKey] = true;
      common_vendor.index.request({
        url: `${this.baseUrl}${API_PATHS.MEASUREMENT_STATUS}`,
        method: "GET",
        header: { "Authorization": this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ""
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            const statusVal = Number(res.data.data);
            const deviceIndex = this.deviceList.findIndex((d) => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], "measurementStatus", statusVal);
            }
            const statusText = this.measurementStatusToText(statusVal);
            common_vendor.index.showToast({
              title: `计量状态：${statusText}`,
              icon: statusVal === 1 ? "success" : "none"
            });
          } else {
            common_vendor.index.showToast({ icon: "none", title: "获取失败" });
          }
        },
        fail: () => {
          common_vendor.index.showToast({ icon: "none", title: "网络请求失败" });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },
    // 新增：解除告警
    handleClearAlarm(device) {
      const btnKey = `${device.deviceName}_clearAlarm`;
      if (device.status !== "ONLINE") {
        return common_vendor.index.showToast({ icon: "none", title: "设备离线" });
      }
      this.btnLoading[btnKey] = true;
      common_vendor.index.request({
        url: `${this.baseUrl}${API_PATHS.CLEAR_ALARM}`,
        method: "POST",
        header: { "Authorization": this.token, "Content-Type": "application/json" },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ""
        },
        success: (res) => {
          if (res.statusCode === 200) {
            common_vendor.index.showToast({ title: "解除告警成功", icon: "success" });
            setTimeout(() => {
              this.getMeasurementStatusSilent(device);
            }, 500);
          } else {
            common_vendor.index.showToast({ icon: "none", title: "解除告警失败" });
          }
        },
        fail: () => {
          common_vendor.index.showToast({ icon: "none", title: "网络请求失败" });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },
    // 读取计量状态（静默，无 Toast）
    getMeasurementStatusSilent(device) {
      if (device.status !== "ONLINE")
        return;
      common_vendor.index.request({
        url: `${this.baseUrl}${API_PATHS.MEASUREMENT_STATUS}`,
        method: "GET",
        header: { "Authorization": this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ""
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            const statusVal = Number(res.data.data);
            const deviceIndex = this.deviceList.findIndex((d) => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], "measurementStatus", statusVal);
            }
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.searchTypes[$data.searchTypeIndex].name),
    b: $data.searchTypes,
    c: common_vendor.o((...args) => $options.onSearchTypeChange && $options.onSearchTypeChange(...args)),
    d: $data.searchTypeIndex,
    e: $data.searchTypes[$data.searchTypeIndex].placeholder,
    f: common_vendor.o([($event) => $data.searchValue = $event.detail.value, (...args) => $options.onSearchInput && $options.onSearchInput(...args)]),
    g: $data.searchValue,
    h: common_vendor.o((...args) => $options.onSearch && $options.onSearch(...args)),
    i: common_vendor.o((...args) => $options.handleSelectAll && $options.handleSelectAll(...args)),
    j: $data.isAllSelected,
    k: $data.selectedDevices.length > 0
  }, $data.selectedDevices.length > 0 ? {
    l: common_vendor.t($data.selectedDevices.length)
  } : {}, {
    m: $data.loading
  }, $data.loading ? {} : {}, {
    n: !$data.loading && $data.deviceList.length === 0
  }, !$data.loading && $data.deviceList.length === 0 ? {} : {}, {
    o: common_vendor.f($data.deviceList, (item, k0, i0) => {
      return common_vendor.e({
        a: item,
        b: common_vendor.o(($event) => $options.handleSelectDevice(item), item.deviceName),
        c: item.deviceName,
        d: $options.isSelected(item),
        e: common_vendor.t(item.name || "-"),
        f: common_vendor.t(item.deviceName || "-"),
        g: common_vendor.t(item.productKey || "-"),
        h: common_vendor.t($options.statusToText(item.status)),
        i: common_vendor.n(item.status === "ONLINE" ? "status-online" : item.status === "OFFLINE" ? "status-offline" : "status-repair"),
        j: item.mcuVersion
      }, item.mcuVersion ? {
        k: common_vendor.t(item.mcuVersion)
      } : {}, {
        l: item.lightStatus !== void 0
      }, item.lightStatus !== void 0 ? {
        m: common_vendor.t(item.lightStatus ? "开启" : "关闭"),
        n: common_vendor.n(item.lightStatus ? "status-online" : "status-offline")
      } : {}, {
        o: item.socketStatus !== void 0
      }, item.socketStatus !== void 0 ? {
        p: common_vendor.t(item.socketStatus ? "开启" : "关闭"),
        q: common_vendor.n(item.socketStatus ? "status-online" : "status-offline")
      } : {}, {
        r: item.measurementStatus !== void 0
      }, item.measurementStatus !== void 0 ? common_vendor.e({
        s: common_vendor.t($options.measurementStatusToText(item.measurementStatus)),
        t: common_vendor.n(item.measurementStatus === 1 ? "status-normal" : "status-alarm"),
        v: item.measurementStatus === 0
      }, item.measurementStatus === 0 ? {
        w: common_vendor.o(($event) => $options.handleClearAlarm(item), item.deviceName),
        x: $data.btnLoading[`${item.deviceName}_clearAlarm`]
      } : {}) : {}, {
        y: item.voltage !== void 0 || item.current !== void 0 || item.power !== void 0 || item.energy !== void 0
      }, item.voltage !== void 0 || item.current !== void 0 || item.power !== void 0 || item.energy !== void 0 ? {
        z: common_vendor.t(item.voltage !== void 0 ? item.voltage + " V" : "-"),
        A: common_vendor.t(item.current !== void 0 ? item.current + " A" : "-"),
        B: common_vendor.t(item.power !== void 0 ? item.power + " W" : "-"),
        C: common_vendor.t(item.energy !== void 0 ? item.energy + " kWh" : "-")
      } : {}, {
        D: common_vendor.t($data.expandedDevice === item.deviceName ? "↑" : "↓"),
        E: common_vendor.n($data.expandedDevice === item.deviceName ? "active" : ""),
        F: $data.expandedDevice === item.deviceName
      }, $data.expandedDevice === item.deviceName ? {
        G: common_vendor.o(($event) => $options.openLight(item), item.deviceName),
        H: $data.btnLoading[`${item.deviceName}_lightOn`],
        I: common_vendor.o(($event) => $options.closeLight(item), item.deviceName),
        J: $data.btnLoading[`${item.deviceName}_lightOff`],
        K: common_vendor.o(($event) => $options.openSocket(item), item.deviceName),
        L: $data.btnLoading[`${item.deviceName}_socketOn`],
        M: common_vendor.o(($event) => $options.closeSocket(item), item.deviceName),
        N: $data.btnLoading[`${item.deviceName}_socketOff`],
        O: common_vendor.o(($event) => $options.screenDisplay(item), item.deviceName),
        P: $data.btnLoading[`${item.deviceName}_screen`],
        Q: common_vendor.o(($event) => $options.handleKickOut(item), item.deviceName),
        R: $data.btnLoading[`${item.deviceName}_kickOut`],
        S: common_vendor.o(($event) => $options.getMcuVersion(item), item.deviceName),
        T: $data.btnLoading[`${item.deviceName}_mcu`],
        U: common_vendor.o(($event) => $options.getLightStatus(item), item.deviceName),
        V: $data.btnLoading[`${item.deviceName}_lightStatus`],
        W: common_vendor.o(($event) => $options.getSocketStatus(item), item.deviceName),
        X: $data.btnLoading[`${item.deviceName}_socketStatus`],
        Y: common_vendor.o(($event) => $options.getMeasurementStatus(item), item.deviceName),
        Z: $data.btnLoading[`${item.deviceName}_measurement`]
      } : {}, {
        aa: item.deviceName,
        ab: common_vendor.o(($event) => $options.handleExpandDevice(item.deviceName), item.deviceName)
      });
    }),
    p: $data.hasMore && !$data.loading
  }, $data.hasMore && !$data.loading ? {} : {}, {
    q: !$data.hasMore && $data.deviceList.length > 0
  }, !$data.hasMore && $data.deviceList.length > 0 ? {} : {}, {
    r: $data.selectedDevices.length > 0
  }, $data.selectedDevices.length > 0 ? {
    s: common_vendor.o((...args) => $options.batchExecuteCommands && $options.batchExecuteCommands(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-15045a0f"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/productTesting/productTesting.js.map
