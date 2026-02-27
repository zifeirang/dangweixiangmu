<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <picker 
        mode="selector" 
        :range="searchTypes" 
        range-key="name" 
        @change="onSearchTypeChange" 
        :value="searchTypeIndex"
      >
        <view class="picker">{{searchTypes[searchTypeIndex].name}}</view>
      </picker>
      <input 
        class="search-input" 
        :placeholder="searchTypes[searchTypeIndex].placeholder" 
        v-model="searchValue" 
        @input="onSearchInput"
      />
      <button class="search-btn" @click="onSearch">搜索</button>
    </view>

    <!-- 全选栏 -->
    <view class="select-all-bar">
      <checkbox 
        @click="handleSelectAll"  
        :checked="isAllSelected"
        value="all"
      >全选</checkbox>
      <view class="selected-count">已选{{selectedDevices.length}}个设备</view>
    </view>

    <!-- 设备列表 -->
    <view class="device-list">
      <view class="loading" v-if="loading">加载中...</view>
      <view class="empty" v-if="!loading && deviceList.length === 0">暂无设备数据</view>
      
      <!-- 设备项：点击展开/收起操作按钮 -->
      <view 
        class="device-item" 
        v-for="item in deviceList" 
        :key="item.deviceName"
        @click="handleExpandDevice(item.deviceName)"
      >
        <!-- 基础信息区域 -->
        <view class="device-main">
          <checkbox 
            class="device-checkbox"
            :data-device="item" 
            @click.stop="handleSelectDevice(item)"  
            :value="item.deviceName"  
            :checked="isSelected(item)" 
          ></checkbox>
          <view class="device-info">
            <view class="item-row"><text class="label">座位号：</text><text class="value">{{item.name || '-'}}</text></view>
            <view class="item-row"><text class="label">MAC：</text><text class="value">{{item.deviceName || '-'}}</text></view>
            <view class="item-row"><text class="label">型号：</text><text class="value">{{item.productKey || '-'}}</text></view>
            <view class="item-row">
              <text class="label">状态：</text>
              <text class="value" :class="item.status === 'ONLINE' ? 'online' : (item.status === 'OFFLINE' ? 'offline' : (item.status === 'REPAIR' ? 'repair' : ''))">
                {{statusToText(item.status)}}
              </text>
            </view>
          </view>
          <!-- 展开/收起箭头 -->
          <view class="expand-arrow" :class="expandedDevice === item.deviceName ? 'active' : ''">
            {{expandedDevice === item.deviceName ? '↑' : '↓'}}
          </view>
        </view>

        <!-- 操作按钮区域：展开时显示（含踢出按钮） -->
        <view class="device-actions" v-if="expandedDevice === item.deviceName">
          <button 
            class="action-btn light-on" 
            @click.stop="openLight(item)"
            :loading="btnLoading[`${item.deviceName}_lightOn`]"
          >开灯</button>
          <button 
            class="action-btn light-off" 
            @click.stop="closeLight(item)"
            :loading="btnLoading[`${item.deviceName}_lightOff`]"
          >关灯</button>
          <button 
            class="action-btn socket-on" 
            @click.stop="openSocket(item)"
            :loading="btnLoading[`${item.deviceName}_socketOn`]"
          >开插座</button>
          <button 
            class="action-btn socket-off" 
            @click.stop="closeSocket(item)"
            :loading="btnLoading[`${item.deviceName}_socketOff`]"
          >关插座</button>
          <button 
            class="action-btn screen-btn" 
            @click.stop="screenDisplay(item)"
            :loading="btnLoading[`${item.deviceName}_screen`]"
          >刷屏</button>
          <!-- 踢出按钮：点击后先弹确认框 -->
          <button 
            class="action-btn kick-out-btn" 
            @click.stop="handleKickOut(item)"
            :loading="btnLoading[`${item.deviceName}_kickOut`]"
          >踢出</button>
        </view>
      </view>

      <view class="load-more" v-if="hasMore && !loading">上拉加载更多</view>
      <view class="no-more" v-if="!hasMore && deviceList.length > 0">已加载全部</view>
    </view>

    <!-- 批量测试按钮 -->
    <view 
      class="batch-btn" 
      @click="batchExecuteCommands" 
      v-if="selectedDevices.length > 0">
      开始测试
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      // 搜索配置
      searchTypes: [
        { name: '座位号', key: 'name', placeholder: '请输入座位号' },
        { name: '设备MAC', key: 'deviceName', placeholder: '请输入设备MAC' },
        { name: '状态', key: 'status', placeholder: '在线/离线/维修中' }
      ],
      searchTypeIndex: 0,
      searchValue: '',

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
      baseUrl: '',
      token: '',
      tenantId: '', 

      // 展开状态+按钮loading
      expandedDevice: '',
      btnLoading: {}
    };
  },

  onLoad() {
    const savedBaseUrl = uni.getStorageSync('config_baseUrl');
    const savedToken = uni.getStorageSync('config_token');
    this.tenantId = uni.getStorageSync('config_tenantId') || '';
    
    if (savedBaseUrl && savedToken) {
      this.baseUrl = savedBaseUrl;
      this.token = savedToken;
      this.getDeviceList();
    } else {
      uni.showToast({ title: '请先配置接口信息', icon: 'none' });
      setTimeout(() => {
        uni.navigateTo({ url: '/pages/setting/setting' });
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
      if (!device || !device.deviceName) return false;
      return this.selectedDevices.some(item => item.deviceName === device.deviceName);
    },

    statusToText(status) {
      if (!status) return '-';
      switch(status) {
        case 'ONLINE': return '在线';
        case 'OFFLINE': return '离线';
        case 'REPAIR': return '维修中';
        default: return '-';
      }
    },

    onSearchTypeChange(e) {
      this.searchTypeIndex = e.detail.value;
      this.searchValue = '';
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
      if (this.loading) return;
      this.loading = true;

      const { searchTypes, searchTypeIndex, searchValue, offset, limit, baseUrl, token } = this;
      const params = { offset, limit };
      if (searchValue) params[searchTypes[searchTypeIndex].key] = searchValue;

      if (!baseUrl || !token) {
        this.loading = false;
        uni.showToast({ title: '接口配置未完成', icon: 'none' });
        callback && callback();
        return;
      }

      uni.request({
        url: `${baseUrl}/v1/devices`,
        method: 'GET',
        header: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        data: params,
        success: (res) => {
          this.loading = false;
          if (res.statusCode === 200 && res.data) {
            const list = res.data.list || [];
            const total = res.data.total || 0;
            const validList = list.filter(item => item && item.deviceName);

            this.deviceList = this.deviceList.concat(validList);
            this.total = total;
            this.hasMore = this.deviceList.length + validList.length < total;
          } else {
            uni.showToast({ title: '接口返回异常', icon: 'none' });
          }
          callback && callback();
        },
        fail: (err) => {
          this.loading = false;
          console.error('接口请求失败：', err);
          uni.showToast({ title: '加载失败', icon: 'none' });
          callback && callback();
        }
      });
    },

    handleSelectDevice(device) {
      if (!device?.deviceName) return;

      const isSelected = this.selectedDevices.some(item => item.deviceName === device.deviceName);
      let newSelected = [...this.selectedDevices];

      if (!isSelected) {
        newSelected.push(device);
      } else {
        newSelected = newSelected.filter(item => item.deviceName !== device.deviceName);
      }

      this.selectedDevices = newSelected;
      this.isAllSelected = newSelected.length === this.deviceList.length;
    },

    handleSelectAll() {
      const isAllSelected = this.isAllSelected;
      const newSelected = isAllSelected ? [] : [...this.deviceList.filter(item => item.deviceName)];
      
      this.selectedDevices = newSelected;
      this.isAllSelected = !isAllSelected;
    },

    handleExpandDevice(deviceName) {
      this.expandedDevice = this.expandedDevice === deviceName ? '' : deviceName;
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

      if (!device?.deviceName) return;
      const { baseUrl, token } = this;
      if (!baseUrl || !token) {
        uni.showToast({ title: '接口配置未完成', icon: 'none' });
        return;
      }
      if (device.status !== 'ONLINE') {
        uni.showToast({ title: '设备离线，无法操作', icon: 'none' });
        return;
      }

      this.btnLoading[btnKey] = true;

      this.sendScreenCommand(device)
        .then((success) => {
          uni.showToast({ title: `${device.name} 刷屏成功`, icon: 'success', duration: 1000 });
        })
        .catch(() => {
          uni.showToast({ title: `${device.name} 刷屏失败`, icon: 'none', duration: 1000 });
        })
        .finally(() => {
          this.btnLoading[btnKey] = false;
        });
    },

    // 核心修改：新增确认弹窗 + 使用接口返回的id作为踢出ID
    handleKickOut(device) {
      // 1. 先弹出确认框
      uni.showModal({
        title: '确认踢出',
        content: `确定要踢出设备【${device.name || device.deviceName}】吗？`,
        confirmText: '确定',
        cancelText: '取消',
        success: (modalRes) => {
          // 2. 用户确认后再执行踢出逻辑
          if (modalRes.confirm) {
            this.executeKickOut(device);
          }
        }
      });
    },

    // 实际执行踢出的逻辑（抽取为单独方法）
    executeKickOut(device) {
      const btnKey = `${device.deviceName}_kickOut`;
      // 改用接口返回的id字段
      if (!device?.id) { 
        uni.showToast({ title: '设备ID缺失，无法踢出', icon: 'none' });
        return;
      }
      const { baseUrl, token } = this;
      if (!baseUrl || !token) {
        uni.showToast({ title: '接口配置未完成', icon: 'none' });
        return;
      }

      this.btnLoading[btnKey] = true;

      // 拼接接口参数（含tenantId可选参数）
      const queryParams = {};
      if (this.tenantId) queryParams.tenantId = this.tenantId;
      
      // 调用踢出接口
      uni.request({
        url: `${baseUrl}/v1/devices/kick-out`,
        method: 'POST',
        header: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        data: {
          deviceIds: [device.id] // 使用接口返回的id
        },
        params: queryParams,
        success: (res) => {
          if (res.statusCode === 200) {
            uni.showToast({ title: `${device.name || device.deviceName} 踢出成功`, icon: 'success', duration: 1000 });
            // 可选：踢出后从列表移除设备
            this.removeDeviceFromList(device.deviceName);
          } else {
            uni.showToast({ title: `${device.name || device.deviceName} 踢出失败`, icon: 'none', duration: 1000 });
          }
        },
        fail: (err) => {
          console.error('踢出设备接口失败：', err);
          uni.showToast({ title: `${device.name || device.deviceName} 踢出失败`, icon: 'none', duration: 1000 });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },

    // 踢出后移除设备列表项
    removeDeviceFromList(deviceName) {
      this.deviceList = this.deviceList.filter(item => item.deviceName !== deviceName);
      this.selectedDevices = this.selectedDevices.filter(item => item.deviceName !== deviceName);
      this.isAllSelected = this.selectedDevices.length === this.deviceList.length;
    },

    sendDeviceCommand(device, path, btnKey) {
      const { baseUrl, token } = this;
      if (!baseUrl || !token) {
        uni.showToast({ title: '接口配置未完成', icon: 'none' });
        return Promise.reject('配置为空');
      }
      if (device.status !== 'ONLINE') {
        uni.showToast({ title: '设备离线，无法操作', icon: 'none' });
        return Promise.reject('设备离线');
      }
      this.btnLoading[btnKey] = true;

      const cmdName = path.includes('lights/on') ? '开灯' : 
                      path.includes('lights/off') ? '关灯' : 
                      path.includes('sockets/on') ? '开插座' : '关插座';

      return new Promise((resolve, reject) => {
        uni.request({
          url: `${baseUrl}${path}`,
          method: 'POST',
          header: {
            'Authorization': token,
            'Content-Type': 'application/json'
          },
          data: {
            deviceName: device.deviceName,
            productKey: device.productKey || ''
          },
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(true);
              uni.showToast({ title: `${device.name} ${cmdName}成功`, icon: 'success', duration: 1000 });
            } else {
              reject('接口返回异常');
              uni.showToast({ title: `${device.name} ${cmdName}失败`, icon: 'none', duration: 1000 });
            }
          },
          fail: (err) => {
            reject(err);
            uni.showToast({ title: `${device.name} ${cmdName}失败`, icon: 'none', duration: 1000 });
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
        uni.request({
          url: `${baseUrl}/v1/commands/screens/display`,
          method: 'POST',
          header: { 'Authorization': token, 'Content-Type': 'application/json' },
          data: {
            deviceName: device.deviceName,
            productKey: device.productKey || '',
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
        uni.showToast({ title: '请选择设备', icon: 'none', duration: 1000 });
        return;
      }
      if (!baseUrl || !token) {
        uni.showToast({ title: '接口配置未完成', icon: 'none', duration: 1000 });
        return;
      }

      let totalSuccess = 0;
      const totalDevice = selectedDevices.length;
      const totalStepsPerDevice = 5;

      const sendCommand = (device, path) => {
        return new Promise((resolve) => {
          uni.request({
            url: `${baseUrl}${path}`,
            method: 'POST',
            header: { 'Authorization': token, 'Content-Type': 'application/json' },
            data: { deviceName: device.deviceName, productKey: device.productKey || '' },
            success: () => resolve(true),
            fail: () => resolve(false)
          });
        });
      };

      const executeSingleDevice = async (device) => {
        let deviceSuccess = 0;
        const seatNum = device.name || '未知座位';

        const lightOnCmd = '/v1/commands/lights/on';
        uni.showToast({ title: `${seatNum} 执行开灯`, icon: 'none', duration: 1000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const lightOn = await sendCommand(device, lightOnCmd);
        if (lightOn) {
          deviceSuccess++;
          uni.showToast({ title: `${seatNum} 开灯成功`, icon: 'success', duration: 1000 });
        } else {
          uni.showToast({ title: `${seatNum} 开灯失败`, icon: 'none', duration: 1000 });
        }
        await new Promise(resolve => setTimeout(resolve, 2000));

        const lightOffCmd = '/v1/commands/lights/off';
        uni.showToast({ title: `${seatNum} 执行关灯`, icon: 'none', duration: 1000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const lightOff = await sendCommand(device, lightOffCmd);
        if (lightOff) {
          deviceSuccess++;
          uni.showToast({ title: `${seatNum} 关灯成功`, icon: 'success', duration: 1000 });
        } else {
          uni.showToast({ title: `${seatNum} 关灯失败`, icon: 'none', duration: 1000 });
        }
        await new Promise(resolve => setTimeout(resolve, 2000));

        const socketOnCmd = '/v1/commands/sockets/on';
        uni.showToast({ title: `${seatNum} 执行开插座`, icon: 'none', duration: 1000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const socketOn = await sendCommand(device, socketOnCmd);
        if (socketOn) {
          deviceSuccess++;
          uni.showToast({ title: `${seatNum} 开插座成功`, icon: 'success', duration: 1000 });
        } else {
          uni.showToast({ title: `${seatNum} 开插座失败`, icon: 'none', duration: 1000 });
        }
        await new Promise(resolve => setTimeout(resolve, 2000));

        const socketOffCmd = '/v1/commands/sockets/off';
        uni.showToast({ title: `${seatNum} 执行关插座`, icon: 'none', duration: 1000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const socketOff = await sendCommand(device, socketOffCmd);
        if (socketOff) {
          deviceSuccess++;
          uni.showToast({ title: `${seatNum} 关插座成功`, icon: 'success', duration: 1000 });
        } else {
          uni.showToast({ title: `${seatNum} 关插座失败`, icon: 'none', duration: 1000 });
        }
        await new Promise(resolve => setTimeout(resolve, 2000));

        uni.showToast({ title: `${seatNum} 执行刷屏`, icon: 'none', duration: 1000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const screenCmdRes = await this.sendScreenCommand(device);
        if (screenCmdRes) {
          deviceSuccess++;
          uni.showToast({ title: `${seatNum} 刷屏成功`, icon: 'success', duration: 1000 });
        } else {
          uni.showToast({ title: `${seatNum} 刷屏失败`, icon: 'none', duration: 1000 });
        }
        await new Promise(resolve => setTimeout(resolve, 3000));

        return deviceSuccess;
      };

      for (let i = 0; i < selectedDevices.length; i++) {
        const device = selectedDevices[i];
        const seatNum = device.name || '未知座位';
        
        uni.showToast({ title: `处理 ${seatNum}`, icon: 'none', duration: 1000 });
        await new Promise(resolve => setTimeout(resolve, 1000));

        const deviceSuccess = await executeSingleDevice(device);
        totalSuccess += deviceSuccess;

        uni.showToast({ title: `${seatNum} 完成`, icon: 'none', duration: 1000 });
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (i < selectedDevices.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
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
/* 页面容器 */
.container {
  padding-bottom: 100rpx;
  background-color: #f9f9f9;
  min-height: 100vh;
}

/* 搜索栏样式 */
.search-bar {
  display: flex;
  align-items: center;
  padding: 10rpx 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #f5f5f5;
}
.picker {
  width: 180rpx;
  height: 70rpx;
  line-height: 70rpx;
  padding: 0 10rpx;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  text-align: center;
  font-size: 28rpx;
}
.search-input {
  flex: 1;
  height: 70rpx;
  margin: 0 10rpx;
  padding: 0 15rpx;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  font-size: 28rpx;
}
.search-btn {
  width: 120rpx;
  height: 70rpx;
  line-height: 70rpx;
  background: #007aff;
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
}

/* 全选栏样式 */
.select-all-bar {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 20rpx;
  background: #fff;
  font-size: 28rpx;
  border-bottom: 1rpx solid #f5f5f5;
}
.selected-count {
  color: #666;
}

/* 设备列表样式 */
.device-list {
  padding: 20rpx;
}
.device-item {
  background: #fff;
  border-radius: 8rpx;
  margin-bottom: 15rpx;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.05);
  overflow: hidden;
}
.device-main {
  display: flex;
  align-items: center;
  padding: 20rpx;
}
.device-checkbox {
  margin-right: 20rpx;
  transform: scale(1.2);
  flex-shrink: 0;
}
.device-info {
  flex: 1;
}
.item-row {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
  font-size: 28rpx;
  height: 40rpx;
}
.item-row:last-child {
  margin-bottom: 0;
}
.label {
  width: 120rpx;
  color: #666;
}
.value {
  flex: 1;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.online { color: #00c800; }
.offline { color: #999; }
.repair { color: #ff9500; }

/* 展开箭头样式 */
.expand-arrow {
  font-size: 24rpx;
  color: #999;
  margin-left: 10rpx;
  transition: transform 0.3s;
}
.expand-arrow.active {
  transform: rotate(180deg);
}

/* 操作按钮区域 */
.device-actions {
  display: flex;
  flex-wrap: wrap;
  padding: 10rpx 20rpx 20rpx;
  background: #f9f9f9;
  border-top: 1rpx solid #eee;
}
.action-btn {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  margin: 0 5rpx;
  padding: 0;
  font-size: 26rpx;
  border-radius: 6rpx;
}
.light-on { background: #00c800; color: #fff; border: none; }
.light-off { background: #999; color: #fff; border: none; }
.socket-on { background: #007aff; color: #fff; border: none; }
.socket-off { background: #ff3b30; color: #fff; border: none; }
.screen-btn { background: #9c27b0; color: #fff; border: none; }
.kick-out-btn { background: #ff6700; color: #fff; border: none; }

/* 状态提示样式 */
.loading, .empty, .load-more, .no-more {
  text-align: center;
  padding: 30rpx 0;
  color: #999;
  font-size: 28rpx;
}

/* 批量按钮样式（固定底部） */
.batch-btn {
  position: fixed;
  bottom: 20rpx;
  left: 20rpx;
  right: 20rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  background: #007aff;
  color: #fff;
  border-radius: 10rpx;
  font-size: 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}
</style>