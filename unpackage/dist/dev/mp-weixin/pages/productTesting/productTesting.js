"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      // 搜索配置
      searchTypes: [
        { name: "座位号", key: "name", placeholder: "请输入座位号" },
        { name: "设备MAC", key: "deviceName", placeholder: "请输入设备MAC" },
        { name: "状态", key: "status", placeholder: "在线/离线/维修中" }
      ],
      searchTypeIndex: 0,
      searchValue: "",
      // 分页参数
      offset: 0,
      limit: 10,
      total: 0,
      deviceList: [],
      loading: false,
      hasMore: true,
      // 选中状态
      selectedDevices: [],
      isAllSelected: false,
      // 接口配置
      baseUrl: "",
      token: "",
      tenantId: "",
      // 展开状态+按钮loading
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
      setTimeout(() => {
        common_vendor.index.navigateTo({ url: "/pages/setting/setting" });
      }, 1500);
    }
  },
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.offset = this.offset + this.limit;
      this.getDeviceList();
    }
  },
  methods: {
    isSelected(device) {
      if (!device || !device.deviceName)
        return false;
      return this.selectedDevices.some((item) => item.deviceName === device.deviceName);
    },
    statusToText(status) {
      if (!status)
        return "-";
      switch (status) {
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
    getDeviceList(callback) {
      if (this.loading)
        return;
      this.loading = true;
      const { searchTypes, searchTypeIndex, searchValue, offset, limit, baseUrl, token } = this;
      const params = { offset, limit };
      if (searchValue)
        params[searchTypes[searchTypeIndex].key] = searchValue;
      if (!baseUrl || !token) {
        this.loading = false;
        common_vendor.index.showToast({ title: "接口配置未完成", icon: "none" });
        callback && callback();
        return;
      }
      common_vendor.index.request({
        url: `${baseUrl}/v1/devices`,
        method: "GET",
        header: {
          "Authorization": token,
          "Content-Type": "application/json"
        },
        data: params,
        success: (res) => {
          this.loading = false;
          if (res.statusCode === 200 && res.data) {
            const list = res.data.list || [];
            const total = res.data.total || 0;
            const validList = list.filter((item) => item && item.deviceName);
            this.deviceList = this.deviceList.concat(validList);
            this.total = total;
            this.hasMore = this.deviceList.length + validList.length < total;
          } else {
            common_vendor.index.showToast({ title: "接口返回异常", icon: "none" });
          }
          callback && callback();
        },
        fail: (err) => {
          this.loading = false;
          common_vendor.index.__f__("error", "at pages/productTesting/productTesting.vue:255", "接口请求失败：", err);
          common_vendor.index.showToast({ title: "加载失败", icon: "none" });
          callback && callback();
        }
      });
    },
    handleSelectDevice(device) {
      if (!(device == null ? void 0 : device.deviceName))
        return;
      const isSelected = this.selectedDevices.some((item) => item.deviceName === device.deviceName);
      let newSelected = [...this.selectedDevices];
      if (!isSelected) {
        newSelected.push(device);
      } else {
        newSelected = newSelected.filter((item) => item.deviceName !== device.deviceName);
      }
      this.selectedDevices = newSelected;
      this.isAllSelected = newSelected.length === this.deviceList.length;
    },
    handleSelectAll() {
      const isAllSelected = this.isAllSelected;
      const newSelected = isAllSelected ? [] : [...this.deviceList.filter((item) => item.deviceName)];
      this.selectedDevices = newSelected;
      this.isAllSelected = !isAllSelected;
    },
    handleExpandDevice(deviceName) {
      this.expandedDevice = this.expandedDevice === deviceName ? "" : deviceName;
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
      if (!(device == null ? void 0 : device.deviceName))
        return;
      const { baseUrl, token } = this;
      if (!baseUrl || !token) {
        common_vendor.index.showToast({ title: "接口配置未完成", icon: "none" });
        return;
      }
      if (device.status !== "ONLINE") {
        common_vendor.index.showToast({ title: "设备离线，无法操作", icon: "none" });
        return;
      }
      this.btnLoading[btnKey] = true;
      this.sendScreenCommand(device).then((success) => {
        common_vendor.index.showToast({ title: `${device.name} 刷屏成功`, icon: "success", duration: 1e3 });
      }).catch(() => {
        common_vendor.index.showToast({ title: `${device.name} 刷屏失败`, icon: "none", duration: 1e3 });
      }).finally(() => {
        this.btnLoading[btnKey] = false;
      });
    },
    // 核心修改：新增确认弹窗 + 使用接口返回的id作为踢出ID
    handleKickOut(device) {
      common_vendor.index.showModal({
        title: "确认踢出",
        content: `确定要踢出设备【${device.name || device.deviceName}】吗？`,
        confirmText: "确定",
        cancelText: "取消",
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.executeKickOut(device);
          }
        }
      });
    },
    // 实际执行踢出的逻辑（抽取为单独方法）
    executeKickOut(device) {
      const btnKey = `${device.deviceName}_kickOut`;
      if (!(device == null ? void 0 : device.id)) {
        common_vendor.index.showToast({ title: "设备ID缺失，无法踢出", icon: "none" });
        return;
      }
      const { baseUrl, token } = this;
      if (!baseUrl || !token) {
        common_vendor.index.showToast({ title: "接口配置未完成", icon: "none" });
        return;
      }
      this.btnLoading[btnKey] = true;
      const queryParams = {};
      if (this.tenantId)
        queryParams.tenantId = this.tenantId;
      common_vendor.index.request({
        url: `${baseUrl}/v1/devices/kick-out`,
        method: "POST",
        header: {
          "Authorization": token,
          "Content-Type": "application/json"
        },
        data: {
          deviceIds: [device.id]
          // 使用接口返回的id
        },
        params: queryParams,
        success: (res) => {
          if (res.statusCode === 200) {
            common_vendor.index.showToast({ title: `${device.name || device.deviceName} 踢出成功`, icon: "success", duration: 1e3 });
            this.removeDeviceFromList(device.deviceName);
          } else {
            common_vendor.index.showToast({ title: `${device.name || device.deviceName} 踢出失败`, icon: "none", duration: 1e3 });
          }
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/productTesting/productTesting.vue:397", "踢出设备接口失败：", err);
          common_vendor.index.showToast({ title: `${device.name || device.deviceName} 踢出失败`, icon: "none", duration: 1e3 });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },
    // 踢出后移除设备列表项
    removeDeviceFromList(deviceName) {
      this.deviceList = this.deviceList.filter((item) => item.deviceName !== deviceName);
      this.selectedDevices = this.selectedDevices.filter((item) => item.deviceName !== deviceName);
      this.isAllSelected = this.selectedDevices.length === this.deviceList.length;
    },
    sendDeviceCommand(device, path, btnKey) {
      const { baseUrl, token } = this;
      if (!baseUrl || !token) {
        common_vendor.index.showToast({ title: "接口配置未完成", icon: "none" });
        return Promise.reject("配置为空");
      }
      if (device.status !== "ONLINE") {
        common_vendor.index.showToast({ title: "设备离线，无法操作", icon: "none" });
        return Promise.reject("设备离线");
      }
      this.btnLoading[btnKey] = true;
      const cmdName = path.includes("lights/on") ? "开灯" : path.includes("lights/off") ? "关灯" : path.includes("sockets/on") ? "开插座" : "关插座";
      return new Promise((resolve, reject) => {
        common_vendor.index.request({
          url: `${baseUrl}${path}`,
          method: "POST",
          header: {
            "Authorization": token,
            "Content-Type": "application/json"
          },
          data: {
            deviceName: device.deviceName,
            productKey: device.productKey || ""
          },
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(true);
              common_vendor.index.showToast({ title: `${device.name} ${cmdName}成功`, icon: "success", duration: 1e3 });
            } else {
              reject("接口返回异常");
              common_vendor.index.showToast({ title: `${device.name} ${cmdName}失败`, icon: "none", duration: 1e3 });
            }
          },
          fail: (err) => {
            reject(err);
            common_vendor.index.showToast({ title: `${device.name} ${cmdName}失败`, icon: "none", duration: 1e3 });
          },
          complete: () => {
            this.btnLoading[btnKey] = false;
          }
        });
      });
    },
    sendScreenCommand(device) {
      const { baseUrl, token } = this;
      const seatNumber = device.name || "001";
      const macAddress = device.deviceName || "";
      return new Promise((resolve) => {
        common_vendor.index.request({
          url: `${baseUrl}/v1/commands/screens/display`,
          method: "POST",
          header: { "Authorization": token, "Content-Type": "application/json" },
          data: {
            deviceName: device.deviceName,
            productKey: device.productKey || "",
            contents: [
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
            ]
          },
          success: () => resolve(true),
          fail: () => resolve(false)
        });
      });
    },
    async batchExecuteCommands() {
      const { selectedDevices, baseUrl, token } = this;
      if (selectedDevices.length === 0) {
        common_vendor.index.showToast({ title: "请选择设备", icon: "none", duration: 1e3 });
        return;
      }
      if (!baseUrl || !token) {
        common_vendor.index.showToast({ title: "接口配置未完成", icon: "none", duration: 1e3 });
        return;
      }
      let totalSuccess = 0;
      const totalDevice = selectedDevices.length;
      const totalStepsPerDevice = 5;
      const sendCommand = (device, path) => {
        return new Promise((resolve) => {
          common_vendor.index.request({
            url: `${baseUrl}${path}`,
            method: "POST",
            header: { "Authorization": token, "Content-Type": "application/json" },
            data: { deviceName: device.deviceName, productKey: device.productKey || "" },
            success: () => resolve(true),
            fail: () => resolve(false)
          });
        });
      };
      const executeSingleDevice = async (device) => {
        let deviceSuccess = 0;
        const seatNum = device.name || "未知座位";
        const lightOnCmd = "/v1/commands/lights/on";
        common_vendor.index.showToast({ title: `${seatNum} 执行开灯`, icon: "none", duration: 1e3 });
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        const lightOn = await sendCommand(device, lightOnCmd);
        if (lightOn) {
          deviceSuccess++;
          common_vendor.index.showToast({ title: `${seatNum} 开灯成功`, icon: "success", duration: 1e3 });
        } else {
          common_vendor.index.showToast({ title: `${seatNum} 开灯失败`, icon: "none", duration: 1e3 });
        }
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        const lightOffCmd = "/v1/commands/lights/off";
        common_vendor.index.showToast({ title: `${seatNum} 执行关灯`, icon: "none", duration: 1e3 });
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        const lightOff = await sendCommand(device, lightOffCmd);
        if (lightOff) {
          deviceSuccess++;
          common_vendor.index.showToast({ title: `${seatNum} 关灯成功`, icon: "success", duration: 1e3 });
        } else {
          common_vendor.index.showToast({ title: `${seatNum} 关灯失败`, icon: "none", duration: 1e3 });
        }
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        const socketOnCmd = "/v1/commands/sockets/on";
        common_vendor.index.showToast({ title: `${seatNum} 执行开插座`, icon: "none", duration: 1e3 });
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        const socketOn = await sendCommand(device, socketOnCmd);
        if (socketOn) {
          deviceSuccess++;
          common_vendor.index.showToast({ title: `${seatNum} 开插座成功`, icon: "success", duration: 1e3 });
        } else {
          common_vendor.index.showToast({ title: `${seatNum} 开插座失败`, icon: "none", duration: 1e3 });
        }
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        const socketOffCmd = "/v1/commands/sockets/off";
        common_vendor.index.showToast({ title: `${seatNum} 执行关插座`, icon: "none", duration: 1e3 });
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        const socketOff = await sendCommand(device, socketOffCmd);
        if (socketOff) {
          deviceSuccess++;
          common_vendor.index.showToast({ title: `${seatNum} 关插座成功`, icon: "success", duration: 1e3 });
        } else {
          common_vendor.index.showToast({ title: `${seatNum} 关插座失败`, icon: "none", duration: 1e3 });
        }
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        common_vendor.index.showToast({ title: `${seatNum} 执行刷屏`, icon: "none", duration: 1e3 });
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        const screenCmdRes = await this.sendScreenCommand(device);
        if (screenCmdRes) {
          deviceSuccess++;
          common_vendor.index.showToast({ title: `${seatNum} 刷屏成功`, icon: "success", duration: 1e3 });
        } else {
          common_vendor.index.showToast({ title: `${seatNum} 刷屏失败`, icon: "none", duration: 1e3 });
        }
        await new Promise((resolve) => setTimeout(resolve, 3e3));
        return deviceSuccess;
      };
      for (let i = 0; i < selectedDevices.length; i++) {
        const device = selectedDevices[i];
        const seatNum = device.name || "未知座位";
        common_vendor.index.showToast({ title: `处理 ${seatNum}`, icon: "none", duration: 1e3 });
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        const deviceSuccess = await executeSingleDevice(device);
        totalSuccess += deviceSuccess;
        common_vendor.index.showToast({ title: `${seatNum} 完成`, icon: "none", duration: 1e3 });
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        if (i < selectedDevices.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3e3));
        }
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
    k: common_vendor.t($data.selectedDevices.length),
    l: $data.loading
  }, $data.loading ? {} : {}, {
    m: !$data.loading && $data.deviceList.length === 0
  }, !$data.loading && $data.deviceList.length === 0 ? {} : {}, {
    n: common_vendor.f($data.deviceList, (item, k0, i0) => {
      return common_vendor.e({
        a: item,
        b: common_vendor.o(($event) => $options.handleSelectDevice(item), item.deviceName),
        c: item.deviceName,
        d: $options.isSelected(item),
        e: common_vendor.t(item.name || "-"),
        f: common_vendor.t(item.deviceName || "-"),
        g: common_vendor.t(item.productKey || "-"),
        h: common_vendor.t($options.statusToText(item.status)),
        i: common_vendor.n(item.status === "ONLINE" ? "online" : item.status === "OFFLINE" ? "offline" : item.status === "REPAIR" ? "repair" : ""),
        j: common_vendor.t($data.expandedDevice === item.deviceName ? "↑" : "↓"),
        k: common_vendor.n($data.expandedDevice === item.deviceName ? "active" : ""),
        l: $data.expandedDevice === item.deviceName
      }, $data.expandedDevice === item.deviceName ? {
        m: common_vendor.o(($event) => $options.openLight(item), item.deviceName),
        n: $data.btnLoading[`${item.deviceName}_lightOn`],
        o: common_vendor.o(($event) => $options.closeLight(item), item.deviceName),
        p: $data.btnLoading[`${item.deviceName}_lightOff`],
        q: common_vendor.o(($event) => $options.openSocket(item), item.deviceName),
        r: $data.btnLoading[`${item.deviceName}_socketOn`],
        s: common_vendor.o(($event) => $options.closeSocket(item), item.deviceName),
        t: $data.btnLoading[`${item.deviceName}_socketOff`],
        v: common_vendor.o(($event) => $options.screenDisplay(item), item.deviceName),
        w: $data.btnLoading[`${item.deviceName}_screen`],
        x: common_vendor.o(($event) => $options.handleKickOut(item), item.deviceName),
        y: $data.btnLoading[`${item.deviceName}_kickOut`]
      } : {}, {
        z: item.deviceName,
        A: common_vendor.o(($event) => $options.handleExpandDevice(item.deviceName), item.deviceName)
      });
    }),
    o: $data.hasMore && !$data.loading
  }, $data.hasMore && !$data.loading ? {} : {}, {
    p: !$data.hasMore && $data.deviceList.length > 0
  }, !$data.hasMore && $data.deviceList.length > 0 ? {} : {}, {
    q: $data.selectedDevices.length > 0
  }, $data.selectedDevices.length > 0 ? {
    r: common_vendor.o((...args) => $options.batchExecuteCommands && $options.batchExecuteCommands(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-15045a0f"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/productTesting/productTesting.js.map
