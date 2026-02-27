<template>
  <view class="scan-web-container">
    <!-- 扫网表单 -->
    <view class="scan-form">
      <!-- 网关基础信息 -->
      <view class="form-item">
        <text class="label">网关MAC：</text>
        <text class="value">{{ formData.deviceName }}</text>
      </view>
      <view class="form-item">
        <text class="label">网关名称：</text>
        <text class="value">{{ formData.name }}</text>
      </view>

      <!-- 设备名称模板配置 -->
      <view class="form-item">
        <text class="label required">设备名称模板：</text>
        <input 
          class="input template-input" 
          v-model="deviceNameTemplate" 
          placeholder="示例：108 1B001、1B001、1|001、1,001"
          @blur="parseTemplate"
        />
      </view>

      <!-- 白名单设备列表：仅当列表有数据时显示 -->
      <view class="form-item" v-if="formData.whiteList.length > 0">
        <text class="label required">白名单设备：</text>
        <view class="white-list">
          <!-- 新增设备按钮 -->
          <button class="add-white-btn" @click="addWhiteDeviceWithScan" :loading="addLoading">+ 新增设备</button>

          <!-- 设备列表 -->
          <view class="white-device-item" v-for="(item, index) in formData.whiteList" :key="index">
            <view class="device-form-item">
              <text class="sub-label">MAC：</text>
              <view class="input-group">
                <input 
                  class="input small" 
                  v-model="item.deviceName" 
                  placeholder="请输入设备MAC"
                />
                <button class="scan-btn" @click="handleScan(index)" :loading="false">
                  <image src="/static/images/scan-icon.png" class="scan-img" mode="widthFix" />
                </button>
              </view>
            </view>
            <view class="device-form-item">
              <text class="sub-label">设备名称：</text>
              <input 
                class="input small" 
                v-model="item.name" 
                placeholder="自动生成/手动修改"
                readonly
              />
            </view>
            <button class="del-btn" @click="delWhiteDevice(index)">删除</button>
          </view>
        </view>
      </view>

      <!-- 新增设备按钮（列表为空时显示） -->
      <view class="form-item" v-else>
        <text class="label required">白名单设备：</text>
        <button class="add-white-btn" @click="addWhiteDeviceWithScan" :loading="addLoading">+ 新增设备</button>
      </view>

      <!-- 提交按钮：支持重复点击，加载中禁用 -->
      <button class="submit-btn" @click="handleScanWeb" :disabled="loading">
        <text v-if="!loading">开始扫网</text>
        <text v-if="loading">扫网中...</text>
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      addLoading: false,
      scanDuration: 60,
      whiteProductKey: '',
      deviceNameTemplate: '',
      namePrefix: '',
      nameDigit: 0,
      initNumber: 1,
      formData: {
        deviceName: '',
        productKey: '',
        name: '',
        whiteList: [] // 初始为空数组，无默认项
      },
      operateBaseUrl: '',
      operateToken: ''
    };
  },
  onLoad(options) {
    // 接收从网关列表传递的参数
    if (options.deviceName) this.formData.deviceName = decodeURIComponent(options.deviceName);
    if (options.productKey) this.formData.productKey = decodeURIComponent(options.productKey);
    if (options.name) this.formData.name = decodeURIComponent(options.name);

    this.operateBaseUrl = uni.getStorageSync('config_baseUrl') || '';
    this.operateToken = uni.getStorageSync('config_token') || '';
    this.loadScanConfig();

    if (!this.operateBaseUrl || !this.operateToken) {
      uni.showToast({ title: '通用接口配置缺失，请先配置', icon: 'none' });
      setTimeout(() => uni.navigateTo({ url: '/pages/setting/setting' }), 1500);
    }
  },
  onShow() {
    this.loadScanConfig();
  },
  methods: {
    loadScanConfig() {
      this.scanDuration = uni.getStorageSync('config_scanDuration') || 60;
      this.whiteProductKey = uni.getStorageSync('config_whiteProductKey') || '';
    },
    parseTemplate() {
      if (!this.deviceNameTemplate) {
        uni.showToast({ title: '请输入设备名称模板', icon: 'none' });
        return;
      }
      const reg = /^(.*?)(\d+)$/;
      const match = this.deviceNameTemplate.match(reg);
      if (!match || !match[2]) {
        uni.showToast({ title: '模板格式错误，示例：108 1B001、1B001、1|001', icon: 'none' });
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
        if (!this.namePrefix && this.nameDigit === 0) return '';
      }
      const currentCount = this.formData.whiteList.length;
      const nextNumber = this.initNumber + currentCount;
      const nextNumStr = nextNumber.toString().padStart(this.nameDigit, '0');
      return this.namePrefix + nextNumStr;
    },
    addWhiteDeviceWithScan() {
      if (!this.deviceNameTemplate) {
        uni.showToast({ title: '请先配置设备名称模板', icon: 'none' });
        return;
      }
      this.addLoading = true;
      this.doScanCodeForAdd();
    },
    doScanCodeForAdd() {
      uni.scanCode({
        onlyFromCamera: true,
        scanType: ['qrCode'],
        success: (res) => {
          const mac = res.result.trim();
          if (!mac) {
            uni.showToast({ title: '扫码结果为空', icon: 'none' });
            this.addLoading = false;
            return;
          }
          const nextName = this.generateNextName();
          this.formData.whiteList.push({ deviceName: mac, name: nextName });
          uni.showToast({ title: '新增设备成功', icon: 'success', duration: 1000 });
          this.addLoading = false;
        },
        fail: (err) => {
          console.error('新增设备扫码失败：', err);
          this.addLoading = false;
          if (err.errMsg.includes('permission') || err.errMsg.includes('getSetting')) {
            uni.showModal({
              title: '需要摄像头权限',
              content: uni.getSystemInfoSync().platform === 'app-plus' 
                ? '请在手机设置中开启App的摄像头权限' 
                : '请在微信中开启小程序的摄像头权限',
              confirmText: '去设置',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  uni.getSystemInfoSync().platform === 'app-plus'
                    ? uni.openAppAuthorizeSetting({ success: () => uni.showToast({ title: '请重新新增设备', icon: 'none' }) })
                    : uni.openSetting({ success: () => uni.showToast({ title: '请重新新增设备', icon: 'none' }) });
                }
              }
            });
          } else if (err.errMsg.includes('cancel')) {
            uni.showToast({ title: '已取消扫码', icon: 'none' });
          } else {
            uni.showToast({ title: '扫码失败，请重试', icon: 'none' });
          }
        }
      });
    },
    delWhiteDevice(index) {
      uni.showModal({
        title: '删除确认',
        content: '确定要删除该设备吗？删除后不可恢复',
        confirmText: '确认删除',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.formData.whiteList.splice(index, 1);
            uni.showToast({ title: '设备删除成功', icon: 'success', duration: 1000 });
          }
        }
      });
    },
    handleScan(index) {
      this.doScanCode(index);
    },
    doScanCode(index) {
      uni.scanCode({
        onlyFromCamera: true,
        scanType: ['qrCode'],
        success: (res) => {
          this.formData.whiteList[index].deviceName = res.result.trim();
          uni.showToast({ title: '扫码成功', icon: 'success', duration: 1000 });
        },
        fail: (err) => {
          console.error('扫码失败：', err);
          if (err.errMsg.includes('permission') || err.errMsg.includes('getSetting')) {
            uni.showModal({
              title: '需要摄像头权限',
              content: uni.getSystemInfoSync().platform === 'app-plus' 
                ? '请在手机设置中开启App的摄像头权限' 
                : '请在微信中开启小程序的摄像头权限',
              confirmText: '去设置',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  uni.getSystemInfoSync().platform === 'app-plus'
                    ? uni.openAppAuthorizeSetting({ success: () => uni.showToast({ title: '请重新扫码', icon: 'none' }) })
                    : uni.openSetting({ success: () => uni.showToast({ title: '请重新扫码', icon: 'none' }) });
                }
              }
            });
          } else if (err.errMsg.includes('cancel')) {
            uni.showToast({ title: '已取消扫码', icon: 'none' });
          } else {
            uni.showToast({ title: '扫码失败，请重试', icon: 'none' });
          }
        }
      });
    },
    validateForm() {
      if (this.scanDuration < 1) {
        uni.showToast({ title: '扫网时长配置无效，请前往配置页修改', icon: 'none' });
        return false;
      }
      if (!this.whiteProductKey) {
        uni.showToast({ title: '请先在配置页设置白名单产品Key', icon: 'none' });
        return false;
      }
      if (this.formData.whiteList.length === 0) {
        uni.showToast({ title: '请至少添加一个白名单设备', icon: 'none' });
        return false;
      }
      for (let item of this.formData.whiteList) {
        if (!item.deviceName) {
          uni.showToast({ title: '白名单设备MAC不能为空', icon: 'none' });
          return false;
        }
        if (!item.name) {
          uni.showToast({ title: '设备名称不能为空', icon: 'none' });
          return false;
        }
      }
      return true;
    },
    handleScanWeb() {
      if (!this.validateForm()) return;
      
      const requestData = {
        ...this.formData,
        duration: this.scanDuration,
        whiteList: this.formData.whiteList.map(item => ({
          productKey: this.whiteProductKey,
          deviceName: item.deviceName,
          name: item.name || ''
        }))
      };

      this.loading = true;
      uni.request({
        url: `${this.operateBaseUrl}/v1/commands/gateways/scan`,
        method: 'POST',
        header: {
          'Authorization': this.operateToken,
          'Content-Type': 'application/json'
        },
        data: requestData,
        success: (res) => {
          // 保留当前页面，不返回上一页
          if (res.statusCode === 200) {
            uni.showToast({ 
              title: '扫网成功！', 
              icon: 'success',
              duration: 2500
            });
          } else {
            uni.showToast({ 
              title: `扫网失败：${res.statusCode}，可重试`, 
              icon: 'none',
              duration: 2500
            });
          }
        },
        fail: (err) => {
          console.error('扫网失败：', err);
          // 失败后保留当前页面，提示可重试
          uni.showToast({ 
            title: '网络异常！请重试', 
            icon: 'none',
            duration: 2500
          });
        },
        complete: () => {
          // 重置loading，支持重复点击
          this.loading = false;
        }
      });
    }
  }
};
</script>

<style scoped>
.scan-web-container {
  padding: 20rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}
.page-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 30rpx;
  text-align: center;
}
.scan-form {
  background-color: #fff;
  padding: 30rpx;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}
.form-item {
  margin-bottom: 25rpx;
  display: flex;
  flex-direction: column;
}
.label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
}
.required::after {
  content: '*';
  color: #ff3b30;
  margin-left: 5rpx;
}
.value {
  font-size: 26rpx;
  color: #666;
  padding: 10rpx;
  background-color: #fcfdff;
  border-radius: 6rpx;
}
.template-input {
  font-size: 28rpx;
  padding: 12rpx 15rpx;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  height: 60rpx;
  box-sizing: border-box;
}
.white-list {
  width: 100%;
}
.add-white-btn {
  background-color: #007aff;
  color: #fff;
  border-radius: 8rpx;
  height: 60rpx;
  line-height: 60rpx;
  font-size: 24rpx;
  margin-bottom: 20rpx;
  border: none;
}
.add-white-btn:disabled {
  background-color: #999;
}
.white-device-item {
  background-color: #fcfdff;
  padding: 20rpx;
  border-radius: 8rpx;
  margin-bottom: 15rpx;
  border: 1rpx solid #e5e9f2;
}
.device-form-item {
  display: flex;
  align-items: center;
  margin-bottom: 15rpx;
  gap: 10rpx;
}
.sub-label {
  font-size: 24rpx;
  color: #666;
  width: 120rpx;
  flex-shrink: 0;
}
.input-group {
  flex: 1;
  display: flex;
  align-items: center;
}
.input.small {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  padding: 0 15rpx;
  border: 1rpx solid #e5e9f2;
  border-right: none;
  border-radius: 8rpx 0 0 8rpx;
  font-size: 26rpx;
}
.scan-btn {
  width: 70rpx;
  height: 60rpx;
  background: #ffffff;
  border: 1rpx solid #e5e9f2;
  border-left: none;
  border-radius: 0 8rpx 8rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
}
.scan-img {
  width: 32rpx;
  height: 32rpx;
  vertical-align: middle;
}
.del-btn {
  background-color: #ff3b30;
  color: #fff;
  border-radius: 6rpx;
  height: 50rpx;
  line-height: 50rpx;
  font-size: 22rpx;
  border: none;
  width: 100%;
  margin-top: 10rpx;
}
.submit-btn {
  background-color: #00c800;
  color: #fff;
  border-radius: 8rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  border: none;
  width: 100%;
  margin-top: 20rpx;
}
.submit-btn:disabled {
  background-color: #999;
  color: #fff;
}
</style>