<template>
  <view class="container">
    <!-- 网关信息区域 -->
    <view class="gateway-info-section">
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

    <!-- 设备列表区域 -->
    <view class="device-section">
      <!-- 标题栏 + 常驻操作按钮 + 添加按钮 -->
      <view class="add-btn-container">
        <text class="device-list-title">设备列表</text>
        
        <!-- 常驻操作按钮组 -->
        <view class="operate-btn-group">
          <button class="operate-btn light-on" @click="handleBatchLightOn">开灯</button>
          <button class="operate-btn light-off" @click="handleBatchLightOff">关灯</button>
          <button class="operate-btn socket-on" @click="handleBatchSocketOn">开插座</button>
          <button class="operate-btn socket-off" @click="handleBatchSocketOff">关插座</button>
          <button class="operate-btn screen-btn" @click="handleBatchScreen">刷屏</button>
          <button class="operate-btn kick-out-btn" @click="handleBatchKickOut">踢出</button>
        </view>

        <button class="add-btn" @click="handleAddDevice">添加</button>
      </view>

      <!-- 设备表格（带全选框） -->
      <view class="device-table">
        <view class="table-header">
          <!-- 全选框列 -->
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
          <view 
            class="table-row" 
            v-for="(device, index) in deviceList" 
            :key="device.id"
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
          <view class="empty" v-if="deviceList.length === 0 && !loading">暂无设备</view>
          <view class="loading" v-if="loading">加载中...</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
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
      isAllSelected: false // 全选状态
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
      return this.selectedDevices.some(item => item.id === device.id);
    },

    // 全选/取消全选逻辑
    handleSelectAll() {
      if (this.deviceList.length === 0) {
        uni.showToast({ title: '暂无设备可选择', icon: 'none' });
        return;
      }
      
      this.isAllSelected = !this.isAllSelected;
      if (this.isAllSelected) {
        // 全选：把所有设备加入选中列表
        this.selectedDevices = [...this.deviceList];
      } else {
        // 取消全选：清空选中列表
        this.selectedDevices = [];
      }
    },

    // 单个设备选择逻辑
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
            this.deviceList = res.data.list || res.data || [];
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

    openLight(device) {
      const btnKey = `${device.deviceName}_lightOn`;
      this.sendDeviceCommand(device, '/v1/commands/lights/on', btnKey);
    },

    closeLight(device) {
      const btnKey = `${device.deviceName}_lightOff`;
      this.sendDeviceCommand(device, '/v1/commands/lights/off', btnKey);
    },

    openSocket(device) {
      const btnKey = `${device.deviceName}_socketOn`;
      this.sendDeviceCommand(device, '/v1/commands/sockets/on', btnKey);
    },

    closeSocket(device) {
      const btnKey = `${device.deviceName}_socketOff`;
      this.sendDeviceCommand(device, '/v1/commands/sockets/off', btnKey);
    },

    screenDisplay(device) {
      const btnKey = `${device.deviceName}_screen`;

      if (!this.operateBaseUrl || !this.operateToken) {
        uni.showToast({ title: '设备操作配置缺失，请重新配置', icon: 'none' });
        return;
      }
      if (!device?.deviceName) return;
      if (device.status !== 'ONLINE') {
        uni.showToast({ title: `${device.name} 离线，无法操作`, icon: 'none' });
        return;
      }

      this.btnLoading[btnKey] = true;

      const requestUrl = `${this.operateBaseUrl}/v1/commands/screens/display`;
      uni.request({
        url: requestUrl,
        method: 'POST',
        header: { 
          'Authorization': this.operateToken,
          'Content-Type': 'application/json' 
        },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || '',
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
            uni.showToast({ title: `${device.name} 刷屏成功`, icon: 'success', duration: 1000 });
          } else {
            uni.showToast({ title: `${device.name} 刷屏失败`, icon: 'none', duration: 1000 });
          }
        },
        fail: (err) => {
          console.error('刷屏操作失败：', err);
          uni.showToast({ title: `${device.name} 刷屏失败`, icon: 'none', duration: 1000 });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },

    executeKickOut(device) {
      const btnKey = `${device.deviceName}_kickOut`;
      if (!this.operateBaseUrl || !this.operateToken) {
        uni.showToast({ title: '设备操作配置缺失，请重新配置', icon: 'none' });
        return;
      }
      if (!device?.id) { 
        uni.showToast({ title: '设备ID缺失，无法踢出', icon: 'none' });
        return;
      }

      this.btnLoading[btnKey] = true;

      const requestUrl = `${this.operateBaseUrl}/v1/devices/kick-out`;
      const queryParams = this.tenantId ? { tenantId: this.tenantId } : {};
      
      uni.request({
        url: requestUrl,
        method: 'POST',
        header: { 
          'Authorization': this.operateToken,
          'Content-Type': 'application/json' 
        },
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
        fail: (err) => {
          console.error('踢出操作失败：', err);
          uni.showToast({ title: `${device.name || device.deviceName} 踢出失败`, icon: 'none' });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },

    sendDeviceCommand(device, path, btnKey) {
      if (!this.operateBaseUrl || !this.operateToken) {
        uni.showToast({ title: '设备操作配置缺失，请重新配置', icon: 'none' });
        return;
      }
      if (!device?.deviceName) return;
      if (device.status !== 'ONLINE') {
        uni.showToast({ title: `${device.name} 离线，无法操作`, icon: 'none' });
        return;
      }

      this.btnLoading[btnKey] = true;
      const cmdName = path.includes('lights/on') ? '开灯' : 
                      path.includes('lights/off') ? '关灯' : 
                      path.includes('sockets/on') ? '开插座' : '关插座';

      const requestUrl = `${this.operateBaseUrl}${path}`;
      uni.request({
        url: requestUrl,
        method: 'POST',
        header: { 
          'Authorization': this.operateToken,
          'Content-Type': 'application/json' 
        },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ''
        },
        success: (res) => {
          if (res.statusCode === 200) {
            uni.showToast({ title: `${device.name} ${cmdName}成功`, icon: 'success' });
          } else {
            console.error(`${cmdName}操作返回异常：`, res);
            uni.showToast({ title: `${device.name} ${cmdName}失败`, icon: 'none' });
          }
        },
        fail: (err) => {
          console.error(`${cmdName}操作请求失败：`, err);
          uni.showToast({ title: `${device.name} ${cmdName}失败`, icon: 'none' });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },

    removeDeviceFromList(deviceId) {
      this.deviceList = this.deviceList.filter(item => item.id !== deviceId);
      this.selectedDevices = this.selectedDevices.filter(item => item.id !== deviceId);
    },

    // 核心修改：跳转到扫网（配网）页面
    handleAddDevice() { 
      // 1. 校验网关核心参数是否完整
      if (!this.gateway.deviceName || !this.gateway.productKey) {
        uni.showToast({ title: '网关MAC/产品Key缺失，无法配网', icon: 'none' });
        return;
      }

      // 2. 拼接参数并跳转（适配uniapp路由规则）
      const jumpUrl = `/pages/scan-web/scan-web?deviceName=${encodeURIComponent(this.gateway.deviceName)}&productKey=${encodeURIComponent(this.gateway.productKey)}&name=${encodeURIComponent(this.gateway.name || '')}`;
      uni.navigateTo({
        url: jumpUrl,
        fail: (err) => {
          console.error('跳转配网页面失败：', err);
          uni.showToast({ title: '配网页面不存在，请检查路由配置', icon: 'none' });
        }
      });
    }
  }
};
</script>

<style scoped>
.container {
  background-color: #fff;
  min-height: 100vh;
  padding-top: 20rpx;
  padding-bottom: 20rpx;
}

.gateway-info-section {
  padding: 0 20rpx;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  font-size: 28rpx;
  padding: 10rpx 0;
}

.label {
  width: 120rpx;
  color: #666;
}

.value {
  flex: 1;
  color: #333;
}

.copy-btn {
  width: 80rpx;
  height: 40rpx;
  line-height: 40rpx;
  font-size: 24rpx;
  background: #007aff;
  color: #fff;
  border-radius: 4rpx;
  padding: 0;
}

.device-section {
  padding: 0;
}

.add-btn-container {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10rpx 20rpx;
  margin-bottom: 10rpx;
  box-sizing: border-box;
  gap: 10rpx;
  justify-content: space-between;
}

.device-list-title {
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}

.operate-btn-group {
  display: flex;
  gap: 5rpx;
  flex-wrap: nowrap;
  overflow-x: auto;
  flex: 1;
  margin: 0 10rpx;
}

.operate-btn {
  height: 40rpx;
  line-height: 40rpx;
  padding: 0 10rpx;
  font-size: 22rpx;
  min-width: auto;
  border-radius: 4rpx;
  border: none;
  color: #fff;
}

.light-on { background-color: #00c800; }
.light-off { background-color: #999; }
.socket-on { background-color: #007aff; }
.socket-off { background-color: #ff3b30; }
.screen-btn { background-color: #9c27b0; }
.kick-out-btn { background-color: #ff6700; }

.add-btn {
  width: 80rpx;
  height: 40rpx;
  line-height: 40rpx;
  font-size: 24rpx;
  background: #007aff;
  color: #fff;
  border-radius: 4rpx;
  padding: 0;
  margin: 0;
  flex-shrink: 0;
}

/* ========== 表格样式 ========== */
.device-table {
  width: calc(100% - 40rpx);
  border: 1rpx solid #e5e9f2;
  border-radius: 12rpx;
  overflow: hidden;
  margin: 0 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.table-header {
  display: flex;
  background: #f5f7fa;
  font-weight: 600;
  color: #333;
}

.table-row {
  display: flex;
  border-bottom: 1rpx solid #e5e9f2;
  min-height: 80rpx;
  transition: background-color 0.2s;
}

/* 交替行背景色 */
.table-row:nth-child(even) {
  background-color: #fcfdff;
}

/* 选中行高亮 */
.selected-row {
  background-color: #e6f7ff;
}

/* ========== 列宽对齐 ========== */
.table-col {
  padding: 20rpx 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 26rpx;
}

.col-select {
  width: 80rpx;
  flex: none;
}

.col-index {
  width: 60rpx;
  flex: none;
}

.col-mac {
  flex: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-seat {
  flex: 1;
}

/* 复选框样式统一 */
.device-checkbox {
  transform: scale(0.9);
}
/* 全选框样式（和普通复选框一致） */
.all-select-checkbox {
  transform: scale(0.9);
}

.empty, .loading {
  padding: 40rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
</style>