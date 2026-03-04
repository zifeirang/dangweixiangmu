<template>
  <view class="container">
    <view class="safe-area">
      <!-- 顶部标题区 -->
      <view class="header-section">
        <text class="page-title">网关管理</text>
        <text class="page-subtitle">Gateway Management</text>
      </view>

      <!-- 网关信息卡片 -->
      <view class="form-group">
        <view class="group-header">
          <text class="group-title">网关信息</text>
        </view>
        <view class="info-item">
          <text class="label">MAC：</text>
          <text class="value">{{gateway.deviceName}}</text>
          <button class="copy-btn" @click="copyMAC">复制</button>
        </view>
        <view class="info-item">
          <text class="label">名称：</text>
          <text class="value">{{gateway.name || '无'}}</text>
        </view>
        <view class="info-item">
          <text class="label">Key：</text>
          <text class="value">{{gateway.productKey || '无'}}</text>
        </view>
      </view>

      <!-- 设备列表卡片 -->
      <view class="form-group">
        <view class="group-header">
          <text class="group-title">设备列表</text>
          <view class="header-btn-group">
            <button class="mini-add-btn" @click="handleAddDevice">添加</button>
          </view>
        </view>

        <!-- 操作按钮组 -->
        <view class="operate-row">
          <view class="operate-btn-group">
            <button class="operate-btn light-on" @click="handleBatchLightOn">开灯</button>
            <button class="operate-btn light-off" @click="handleBatchLightOff">关灯</button>
            <button class="operate-btn socket-on" @click="handleBatchSocketOn">开插座</button>
            <button class="operate-btn socket-off" @click="handleBatchSocketOff">关插座</button>
            <button class="operate-btn screen-btn" @click="handleBatchScreen">刷屏</button>
            <button class="operate-btn init-btn" @click="handleBatchInit">初始化</button>
            <button class="operate-btn kick-out-btn" @click="handleBatchKickOut">踢出</button>
          </view>
        </view>

        <!-- 设备表格 -->
        <view class="device-table">
          <view class="table-header">
            <view class="table-col col-select">
              <checkbox 
                @click.stop="handleSelectAll"  
                :checked="isAllSelected"
                class="device-checkbox all-select-checkbox"
              />
            </view>
            <view class="table-col col-index">序号</view>
            <view class="table-col col-mac">MAC地址</view>
            <view class="table-col col-seat">座位号</view>
          </view>
          <view class="table-body">
            <!-- 设备行和电参数合并在一起 -->
            <template v-for="(device, index) in deviceList" :key="device.id">
              <view 
                class="table-row" 
                :class="{ 'selected-row': isSelected(device) }"
              >
                <view class="table-col col-select">
                  <checkbox 
                    @click.stop="handleSelectDevice(device)"  
                    :checked="isSelected(device)"
                    class="device-checkbox"
                  />
                </view>
                <view class="table-col col-index">{{index + 1}}</view>
                <view class="table-col col-mac">{{device.deviceName}}</view>
                <view class="table-col col-seat">{{device.name || '-'}}</view>
              </view>
              
              <!-- 电参数显示区域（仅在有数据时显示） -->
              <view 
                class="device-metrics-row" 
                v-if="device.voltage !== undefined || device.current !== undefined || device.power !== undefined || device.energy !== undefined"
              >
                <view class="metrics-item">
                  <text class="metrics-label">电压：</text>
                  <text class="metrics-value">{{device.voltage !== undefined ? device.voltage + ' V' : '-'}}</text>
                </view>
                <view class="metrics-item">
                  <text class="metrics-label">电流：</text>
                  <text class="metrics-value">{{device.current !== undefined ? device.current + ' A' : '-'}}</text>
                </view>
                <view class="metrics-item">
                  <text class="metrics-label">功率：</text>
                  <text class="metrics-value">{{device.power !== undefined ? device.power + ' W' : '-'}}</text>
                </view>
                <view class="metrics-item">
                  <text class="metrics-label">电量：</text>
                  <text class="metrics-value">{{device.energy !== undefined ? device.energy + ' kWh' : '-'}}</text>
                </view>
              </view>
            </template>
            
            <view class="empty" v-if="deviceList.length === 0 && !loading">暂无设备</view>
            <view class="loading" v-if="loading">加载中...</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部批量测试按钮 -->
    <view 
      class="batch-btn" 
      @click="batchExecuteCommands" 
      v-if="selectedDevices.length > 0">
      开始测试 ({{selectedDevices.length}})
    </view>
  </view>
</template>

<script>
// ===================== 接口路径常量 =====================
const API_PATHS = {
  LIGHT_ON: '/v1/commands/lights/on',
  LIGHT_OFF: '/v1/commands/lights/off',
  LIGHT_BRIGHTNESS: '/v1/commands/lights/brightness',
  SOCKET_ON: '/v1/commands/sockets/on',
  SOCKET_OFF: '/v1/commands/sockets/off',
  SCREEN_DISPLAY: '/v1/commands/screens/display',
  // 初始化接口
  SCREEN_INIT: '/v1/commands/screens/init',
  // 电参数读取接口
  VOLTAGE: '/v1/commands/voltage',
  CURRENT: '/v1/commands/current',
  POWER: '/v1/commands/power',
  ENERGY: '/v1/commands/energy'
};

export default {
  data() {
    return {
      gateway: { id: '', name: '', deviceName: '', productKey: '', status: '' },
      deviceList: [],
      loading: false,
      operateBaseUrl: '',
      operateToken: '',
      gatewayDetailBaseUrl: '',
      gatewayDetailToken: '',
      tenantId: '',
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

    this.operateBaseUrl = uni.getStorageSync('config_baseUrl') || '';
    this.operateToken = uni.getStorageSync('config_token') || '';
    this.gatewayDetailBaseUrl = uni.getStorageSync('config_gatewayDetailBaseUrl') || '';
    this.gatewayDetailToken = uni.getStorageSync('config_gatewayDetailToken') || '';
    this.tenantId = uni.getStorageSync('config_tenantId') || '';
    
    if (!this.gatewayDetailBaseUrl || !this.gatewayDetailToken) {
      uni.showToast({ 
        title: '请先配置网关详情接口/Token', 
        icon: 'none', 
        duration: 2000 
      });
      setTimeout(() => {
        uni.navigateTo({ url: '/pages/setting/setting' });
      }, 2000);
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
      return this.selectedDevices.some(item => item.id === device.id);
    },
    handleSelectAll() {
      if (this.deviceList.length === 0) {
        uni.showToast({ title: '暂无设备可选择', icon: 'none' });
        return;
      }
      this.isAllSelected = !this.isAllSelected;
      this.selectedDevices = this.isAllSelected ? [...this.deviceList] : [];
    },
    handleSelectDevice(device) {
      const isExist = this.selectedDevices.some(item => item.id === device.id);
      if (isExist) {
        this.selectedDevices = this.selectedDevices.filter(item => item.id !== device.id);
      } else {
        this.selectedDevices.push(device);
      }
    },
    copyMAC() {
      uni.setClipboardData({ 
        data: this.gateway.deviceName, 
        success: () => uni.showToast({ title: '复制成功', icon: 'success' }),
        fail: () => uni.showToast({ title: '复制失败', icon: 'none' })
      });
    },
    getDeviceList() {
      if (this.loading) return;
      this.loading = true;
      const requestUrl = `${this.gatewayDetailBaseUrl}/v1/gateways/${this.gateway.id}/devices`;
      uni.request({
        url: requestUrl,
        method: 'GET',
        header: { 
          'Authorization': this.gatewayDetailToken,
          'Content-Type': 'application/json' 
        },
        success: (res) => {
          this.loading = false;
          if (res.statusCode === 200) {
            this.deviceList = (res.data.list || res.data || []).map(item => ({
              ...item,
              voltage: undefined,
              current: undefined,
              power: undefined,
              energy: undefined
            }));
            if (this.deviceList.length === 0) {
              uni.showToast({ title: '该网关暂无绑定设备', icon: 'none' });
            }
          } else {
            uni.showToast({ title: `网关详情查询失败：${res.statusCode}`, icon: 'none' });
          }
        },
        fail: (err) => {
          this.loading = false;
          console.error('网关详情请求失败：', err);
          uni.showToast({ title: '网关详情接口不可达', icon: 'none' });
        }
      });
    },

    handleBatchLightOn() {
      if (this.selectedDevices.length === 0) {
        uni.showToast({ title: '请选择要操作的设备', icon: 'none' });
        return;
      }
      this.selectedDevices.forEach(device => this.openLight(device));
    },
    handleBatchLightOff() {
      if (this.selectedDevices.length === 0) {
        uni.showToast({ title: '请选择要操作的设备', icon: 'none' });
        return;
      }
      this.selectedDevices.forEach(device => this.closeLight(device));
    },
    handleBatchSocketOn() {
      if (this.selectedDevices.length === 0) {
        uni.showToast({ title: '请选择要操作的设备', icon: 'none' });
        return;
      }
      this.selectedDevices.forEach(device => this.openSocket(device));
    },
    handleBatchSocketOff() {
      if (this.selectedDevices.length === 0) {
        uni.showToast({ title: '请选择要操作的设备', icon: 'none' });
        return;
      }
      this.selectedDevices.forEach(device => this.closeSocket(device));
    },
    handleBatchScreen() {
      if (this.selectedDevices.length === 0) {
        uni.showToast({ title: '请选择要操作的设备', icon: 'none' });
        return;
      }
      this.selectedDevices.forEach(device => this.screenDisplay(device));
    },
    // 批量初始化
    handleBatchInit() {
      if (this.selectedDevices.length === 0) {
        uni.showToast({ title: '请选择要操作的设备', icon: 'none' });
        return;
      }
      uni.showModal({
        title: '确认初始化',
        content: `确定要初始化选中的${this.selectedDevices.length}个设备吗？`,
        confirmText: '确定',
        cancelText: '取消',
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.selectedDevices.forEach(device => this.initDevice(device));
          }
        }
      });
    },
    handleBatchKickOut() {
      if (this.selectedDevices.length === 0) {
        uni.showToast({ title: '请选择要操作的设备', icon: 'none' });
        return;
      }
      uni.showModal({
        title: '确认踢出',
        content: `确定要踢出选中的${this.selectedDevices.length}个设备吗？`,
        confirmText: '确定',
        cancelText: '取消',
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.selectedDevices.forEach(device => this.executeKickOut(device));
          }
        }
      });
    },

    openLight(device) { const btnKey = `${device.deviceName}_lightOn`; this.sendDeviceCommand(device, API_PATHS.LIGHT_ON, btnKey); },
    closeLight(device) { const btnKey = `${device.deviceName}_lightOff`; this.sendDeviceCommand(device, API_PATHS.LIGHT_OFF, btnKey); },
    openSocket(device) { const btnKey = `${device.deviceName}_socketOn`; this.sendDeviceCommand(device, API_PATHS.SOCKET_ON, btnKey); },
    closeSocket(device) { const btnKey = `${device.deviceName}_socketOff`; this.sendDeviceCommand(device, API_PATHS.SOCKET_OFF, btnKey); },
    // 单个设备初始化
    initDevice(device) { 
      const btnKey = `${device.deviceName}_init`; 
      this.sendDeviceCommand(device, API_PATHS.SCREEN_INIT, btnKey, '初始化'); 
    },

    screenDisplay(device) {
      const btnKey = `${device.deviceName}_screen`;
      if (!this.operateBaseUrl || !this.operateToken) {
        uni.showToast({ title: '设备操作配置缺失', icon: 'none' });
        return;
      }
      if (!device?.deviceName) return;
      this.btnLoading[btnKey] = true;
      uni.request({
        url: `${this.operateBaseUrl}${API_PATHS.SCREEN_DISPLAY}`,
        method: 'POST',
        header: { 'Authorization': this.operateToken, 'Content-Type': 'application/json' },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || '',
          contents: this.generateScreenContents(device.name || "001", device.deviceName || "")
        },
        success: (res) => {
          uni.showToast({ 
            title: res.statusCode === 200 ? `${device.name} 刷屏成功` : `${device.name} 刷屏失败`, 
            icon: res.statusCode === 200 ? 'success' : 'none', duration: 1000 
          });
        },
        fail: () => uni.showToast({ title: `${device.name} 刷屏失败`, icon: 'none', duration: 1000 }),
        complete: () => { this.btnLoading[btnKey] = false; }
      });
    },
    executeKickOut(device) {
      const btnKey = `${device.deviceName}_kickOut`;
      if (!this.operateBaseUrl || !this.operateToken) {
        uni.showToast({ title: '设备操作配置缺失', icon: 'none' });
        return;
      }
      if (!device?.id) return;
      this.btnLoading[btnKey] = true;
      const queryParams = this.tenantId ? { tenantId: this.tenantId } : {};
      uni.request({
        url: `${this.operateBaseUrl}/v1/devices/kick-out`,
        method: 'POST',
        header: { 'Authorization': this.operateToken, 'Content-Type': 'application/json' },
        data: { deviceIds: [device.id] },
        params: queryParams,
        success: (res) => {
          if (res.statusCode === 200) {
            uni.showToast({ title: `${device.name || device.deviceName} 踢出成功`, icon: 'success', duration: 1000 });
            this.removeDeviceFromList(device.id);
          } else {
            uni.showToast({ title: `${device.name || device.deviceName} 踢出失败`, icon: 'none', duration: 1000 });
          }
        },
        fail: () => uni.showToast({ title: `${device.name || device.deviceName} 踢出失败`, icon: 'none' }),
        complete: () => { this.btnLoading[btnKey] = false; }
      });
    },
    sendDeviceCommand(device, path, btnKey, customCmdName) {
      if (!this.operateBaseUrl || !this.operateToken) {
        uni.showToast({ title: '设备操作配置缺失', icon: 'none' });
        return;
      }
      if (!device?.deviceName) return;
      this.btnLoading[btnKey] = true;
      const cmdName = customCmdName || (
        path.includes('lights/on') ? '开灯' : 
        path.includes('lights/off') ? '关灯' : 
        path.includes('sockets/on') ? '开插座' : 
        path.includes('screens/init') ? '初始化' : '关插座'
      );
      uni.request({
        url: `${this.operateBaseUrl}${path}`,
        method: 'POST',
        header: { 'Authorization': this.operateToken, 'Content-Type': 'application/json' },
        data: { deviceName: device.deviceName, productKey: device.productKey || '' },
        success: (res) => {
          uni.showToast({ 
            title: res.statusCode === 200 ? `${device.name} ${cmdName}成功` : `${device.name} ${cmdName}失败`, 
            icon: res.statusCode === 200 ? 'success' : 'none' 
          });
        },
        fail: () => uni.showToast({ title: `${device.name} ${cmdName}失败`, icon: 'none' }),
        complete: () => { this.btnLoading[btnKey] = false; }
      });
    },
    removeDeviceFromList(deviceId) {
      this.deviceList = this.deviceList.filter(item => item.id !== deviceId);
      this.selectedDevices = this.selectedDevices.filter(item => item.id !== deviceId);
    },
    handleAddDevice() { 
      if (!this.gateway.deviceName || !this.gateway.productKey) {
        uni.showToast({ title: '网关MAC/产品Key缺失', icon: 'none' });
        return;
      }
      const jumpUrl = `/pages/scan-web/scan-web?deviceName=${encodeURIComponent(this.gateway.deviceName)}&productKey=${encodeURIComponent(this.gateway.productKey)}&name=${encodeURIComponent(this.gateway.name || '')}`;
      uni.navigateTo({
        url: jumpUrl,
        fail: () => uni.showToast({ title: '配网页面不存在', icon: 'none' })
      });
    },

    // ================== 批量测试（调整顺序并去除中间提示） ==================
    async batchExecuteCommands() {
      const { selectedDevices, operateBaseUrl, operateToken } = this;
      if (selectedDevices.length === 0) {
        uni.showToast({ title: '请选择设备', icon: 'none', duration: 1000 });
        return;
      }
      if (!operateBaseUrl || !operateToken) {
        uni.showToast({ title: '接口配置未完成', icon: 'none', duration: 1000 });
        return;
      }

      let totalSuccess = 0;
      const totalDevice = selectedDevices.length;
      const totalStepsPerDevice = 12; // 增加到12个步骤

      const sendCommand = (device, path, extraData = {}, method = 'POST') => {
        return new Promise((resolve) => {
          const requestConfig = {
            url: `${operateBaseUrl}${path}`,
            method: method,
            header: { 'Authorization': operateToken, 'Content-Type': 'application/json' },
            success: (res) => resolve(res), 
            fail: () => resolve(null)
          };
          
          // 区分 GET 和 POST 的参数传递
          if (method === 'GET') {
            requestConfig.data = { deviceName: device.deviceName, productKey: device.productKey || '', ...extraData };
          } else {
            requestConfig.data = { deviceName: device.deviceName, productKey: device.productKey || '', ...extraData };
          }
          
          uni.request(requestConfig);
        });
      };

      const executeSingleDevice = async (device) => {
        let deviceSuccess = 0;
        const seatNum = device.name || '未知座位';

        // 1. 读取电压
        uni.showToast({ title: `${seatNum} 读取电压`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const voltageRes = await sendCommand(device, API_PATHS.VOLTAGE, {}, 'GET');
        if(voltageRes && voltageRes.statusCode === 200 && voltageRes.data){
          deviceSuccess++;
          const deviceIndex = this.deviceList.findIndex(d => d.id === device.id);
          if(deviceIndex !== -1){
            this.$set(this.deviceList[deviceIndex], 'voltage', voltageRes.data.data);
          }
        }
        await new Promise(r=>setTimeout(r,2000));

        // 2. 读取电流
        uni.showToast({ title: `${seatNum} 读取电流`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const currentRes = await sendCommand(device, API_PATHS.CURRENT, {}, 'GET');
        if(currentRes && currentRes.statusCode === 200 && currentRes.data){
          deviceSuccess++;
          const deviceIndex = this.deviceList.findIndex(d => d.id === device.id);
          if(deviceIndex !== -1){
            this.$set(this.deviceList[deviceIndex], 'current', currentRes.data.data);
          }
        }
        await new Promise(r=>setTimeout(r,2000));

        // 3. 读取功率
        uni.showToast({ title: `${seatNum} 读取功率`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const powerRes = await sendCommand(device, API_PATHS.POWER, {}, 'GET');
        if(powerRes && powerRes.statusCode === 200 && powerRes.data){
          deviceSuccess++;
          const deviceIndex = this.deviceList.findIndex(d => d.id === device.id);
          if(deviceIndex !== -1){
            this.$set(this.deviceList[deviceIndex], 'power', powerRes.data.data);
          }
        }
        await new Promise(r=>setTimeout(r,2000));

        // 4. 读取电量
        uni.showToast({ title: `${seatNum} 读取电量`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const energyRes = await sendCommand(device, API_PATHS.ENERGY, {}, 'GET');
        if(energyRes && energyRes.statusCode === 200 && energyRes.data){
          deviceSuccess++;
          const deviceIndex = this.deviceList.findIndex(d => d.id === device.id);
          if(deviceIndex !== -1){
            this.$set(this.deviceList[deviceIndex], 'energy', energyRes.data.data);
          }
        }
        await new Promise(r=>setTimeout(r,2000));

        // 5. 开灯
        uni.showToast({ title: `${seatNum} 执行开灯`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const lightOn = await sendCommand(device, API_PATHS.LIGHT_ON);
        if(lightOn && lightOn.statusCode === 200){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,2000));

        // 6. 设置亮度50%
        uni.showToast({ title: `${seatNum} 设置亮度50%`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const brightness50 = await sendCommand(device, API_PATHS.LIGHT_BRIGHTNESS,{brightness:50});
        if(brightness50 && brightness50.statusCode === 200){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,2000));

        // 7. 设置亮度25%（新增）
        uni.showToast({ title: `${seatNum} 设置亮度25%`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const brightness25 = await sendCommand(device, API_PATHS.LIGHT_BRIGHTNESS,{brightness:25});
        if(brightness25 && brightness25.statusCode === 200){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,2000));

        // 8. 关灯
        uni.showToast({ title: `${seatNum} 执行关灯`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const lightOff = await sendCommand(device, API_PATHS.LIGHT_OFF);
        if(lightOff && lightOff.statusCode === 200){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,2000));

        // 9. 开插座
        uni.showToast({ title: `${seatNum} 开插座`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const socketOn = await sendCommand(device, API_PATHS.SOCKET_ON);
        if(socketOn && socketOn.statusCode === 200){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,2000));

        // 10. 关插座
        uni.showToast({ title: `${seatNum} 关插座`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const socketOff = await sendCommand(device, API_PATHS.SOCKET_OFF);
        if(socketOff && socketOff.statusCode === 200){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,2000));

        // 11. 刷屏
        uni.showToast({ title: `${seatNum} 刷屏`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const screen = await new Promise(resolve=>{
          uni.request({
            url:`${operateBaseUrl}${API_PATHS.SCREEN_DISPLAY}`,method:'POST',
            header:{Authorization:operateToken,'Content-Type':'application/json'},
            data:{deviceName:device.deviceName,productKey:device.productKey||'',contents:this.generateScreenContents(device.name||"001",device.deviceName||"")},
            success:()=>resolve(true),fail:()=>resolve(false)
          });
        });
        if(screen){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,3000));

        return deviceSuccess;
      };

      for(let i=0;i<selectedDevices.length;i++){
        const device = selectedDevices[i];
        const seatNum = device.name || '未知座位';
        uni.showToast({title:`处理 ${seatNum}`,icon:'none'});
        await new Promise(r=>setTimeout(r,1000));
        const ok = await executeSingleDevice(device);
        totalSuccess += ok;
        uni.showToast({title:`${seatNum} 完成`,icon:'none'});
        if(i<selectedDevices.length-1)await new Promise(r=>setTimeout(r,3000));
      }

      uni.showToast({
        title: `测试完成`,
        icon: totalSuccess === totalDevice * totalStepsPerDevice ? 'success' : 'none',
        duration: 3000
      });
    }
  }
};
</script>

<style scoped>
/* 完全对齐设置页样式 */
.container {
  width: 100vw;
  min-height: 100vh;
  background-color: #F7F8FA;
  display: flex;
  justify-content: center;
}
.safe-area {
  width: 100%;
  max-width: 600px;
  padding: 80rpx 40rpx 140rpx;
  box-sizing: border-box;
}

/* 标题 */
.header-section {
  margin-bottom: 40rpx;
}
.page-title {
  display: block;
  font-size: 48rpx;
  font-weight: 300;
  color: #1D1D1F;
  letter-spacing: -1rpx;
  margin-bottom: 8rpx;
}
.page-subtitle {
  display: block;
  font-size: 24rpx;
  font-weight: 400;
  color: #86868B;
  text-transform: uppercase;
  letter-spacing: 2rpx;
}

/* 卡片 */
.form-group {
  width: 100%;
  background-color: #FFFFFF;
  border-radius: 20rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
  overflow: hidden;
}
.group-header {
  width: 100%;
  padding: 30rpx 36rpx;
  box-sizing: border-box;
  border-bottom: 1rpx solid #F5F5F7;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.group-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1D1D1F;
}

/* 网关信息行 */
.info-item {
  display: flex;
  align-items: center;
  padding: 24rpx 36rpx;
  border-bottom: 1rpx solid #F5F5F7;
}
.info-item:last-child {
  border-bottom: none;
}
.label {
  width: 160rpx;
  font-size: 26rpx;
  color: #86868B;
  flex-shrink: 0;
}
.value {
  flex: 1;
  font-size: 28rpx;
  color: #1D1D1F;
}
.copy-btn {
  padding: 8rpx 16rpx;
  background: #F0F7FF;
  color: #007AFF;
  border-radius: 8rpx;
  font-size: 24rpx;
  border: none;
}

/* 操作按钮区域 */
.operate-row {
  padding: 20rpx 36rpx;
  border-bottom: 1rpx solid #F5F5F7;
}
.operate-btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.operate-btn {
  height: 56rpx;
  line-height: 56rpx;
  padding: 0 20rpx;
  font-size: 24rpx;
  border-radius: 12rpx;
  border: none;
  font-weight: 500;
}
.light-on { background-color: #E8F5E9; color: #388E3C; }
.light-off { background-color: #F5F5F7; color: #86868B; }
.socket-on { background-color: #F0F7FF; color: #007AFF; }
.socket-off { background-color: #FFEAEA; color: #FF3B30; }
.screen-btn { background-color: #F3E5F5; color: #9C27B0; }
/* 初始化按钮配色 */
.init-btn { background-color: #EDE7F6; color: #673AB7; }
.kick-out-btn { background-color: #FFF3E0; color: #FF6700; }

/* 添加按钮 */
.mini-add-btn {
  height: 56rpx;
  line-height: 56rpx;
  padding: 0 20rpx;
  background: #E3F2FD;
  color: #1976D2;
  border-radius: 12rpx;
  font-size: 24rpx;
  border: none;
}

/* 表格 */
.device-table {
  width: 100%;
}
.table-header {
  display: flex;
  background: #F7F8FA;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F5F5F7;
}
.table-row {
  display: flex;
  min-height: 80rpx;
  border-bottom: 1rpx solid #F5F5F7;
  align-items: center;
}
.table-row:last-child {
  border-bottom: none;
}
.selected-row {
  background-color: #F0F7FF;
}
.table-col {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: #1D1D1F;
  padding: 20rpx 10rpx;
}
.col-select { width: 80rpx; flex-shrink: 0; }
.col-index { width: 80rpx; flex-shrink: 0; }
.col-mac { flex: 2; }
.col-seat { flex: 1; }

.device-checkbox {
  transform: scale(1);
}

.empty, .loading {
  padding: 60rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #86868B;
}

/* 电参数显示行 */
.device-metrics-row {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx 36rpx;
  background-color: #F9F9F9;
  border-bottom: 1rpx solid #F5F5F7;
}
.metrics-item {
  width: 50%;
  display: flex;
  align-items: center;
  padding: 10rpx 0;
}
.metrics-label {
  font-size: 24rpx;
  color: #86868B;
  margin-right: 8rpx;
}
.metrics-value {
  font-size: 24rpx;
  color: #1D1D1F;
  font-weight: 500;
}

/* 底部批量按钮 */
.batch-btn {
  position: fixed;
  bottom: 40rpx;
  left: 40rpx;
  right: 40rpx;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  background: #007AFF;
  color: #fff;
  border-radius: 24rpx;
  font-size: 32rpx;
  font-weight: 500;
  box-shadow: 0 8rpx 24rpx rgba(0,122,255,0.25);
  z-index: 999;
  max-width: 520rpx;
  margin: 0 auto;
}
</style>