<template>
  <view class="container">
    <view class="safe-area">
      <!-- 顶部标题区 -->
      <view class="header-section">
        <text class="page-title">设备配网</text>
        <text class="page-subtitle">DEVICE PROVISIONING</text>
      </view>

      <!-- 扫网表单卡片 -->
      <view class="form-wrapper">
        <view class="form-group">
          <view class="group-header">
            <text class="group-title">网关信息</text>
          </view>
          
          <!-- 网关基础信息 -->
          <view class="form-item">
            <text class="label">网关MAC</text>
            <text class="value">{{ formData.deviceName }}</text>
          </view>
          <view class="form-item">
            <text class="label">网关名称</text>
            <text class="value">{{ formData.name }}</text>
          </view>
        </view>

        <view class="form-group">
          <view class="group-header">
            <text class="group-title">配置模板</text>
          </view>
          
          <!-- 设备名称模板配置（修复显示异常） -->
          <view class="form-item">
            <text class="label">设备名称模板</text>
            <input 
              class="input-field" 
              v-model="deviceNameTemplate" 
              placeholder="示例：108 1B001、1B001、1|001、1,001"
              @blur="parseTemplate"
              placeholder-class="input-placeholder"
            />
          </view>
        </view>

        <view class="form-group">
          <view class="group-header">
            <text class="group-title">白名单设备</text>
          </view>
          
          <!-- 白名单设备列表 -->
          <view class="form-item" v-if="formData.whiteList.length > 0">
            <!-- 新增设备按钮 -->
            <view class="add-btn-row">
              <button class="add-white-btn" @click="addWhiteDeviceWithScan" :loading="addLoading">+ 新增设备</button>
            </view>

            <!-- 设备列表 -->
            <view class="white-device-item" v-for="(item, index) in formData.whiteList" :key="index">
              <view class="device-form-row">
                <text class="sub-label">MAC</text>
                <view class="input-group">
                  <input 
                    class="input-field small-input" 
                    v-model="item.deviceName" 
                    placeholder="请输入设备MAC"
                    placeholder-class="input-placeholder"
                  />
                  <view class="scan-icon-btn" @click="handleScan(index)">
                    <text class="scan-icon-text">📷</text>
                  </view>
                </view>
              </view>
              <view class="device-form-row">
                <text class="sub-label">设备名称</text>
                <input 
                  class="input-field small-input" 
                  v-model="item.name" 
                  placeholder="自动生成/手动修改"
                  readonly
                  placeholder-class="input-placeholder"
                />
              </view>
              <view class="del-btn-row">
                <button class="del-btn" @click="delWhiteDevice(index)">删除</button>
              </view>
            </view>
          </view>

          <!-- 新增设备按钮（列表为空时显示） -->
          <view class="form-item" v-else>
            <button class="add-white-btn" @click="addWhiteDeviceWithScan" :loading="addLoading">+ 新增设备</button>
          </view>
        </view>

        <!-- 提交按钮 -->
        <view class="btn-section">
          <button class="submit-btn" @click="handleScanWeb" :disabled="loading">
            <text v-if="!loading">开始扫网</text>
            <text v-if="loading">扫网中...</text>
          </button>
        </view>
      </view>
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
/* ---------------- 全局容器（统一风格） ---------------- */
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
  padding: 80rpx 40rpx 40rpx;
  box-sizing: border-box;
}

/* ---------------- 顶部标题（统一风格） ---------------- */
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

/* ---------------- 表单卡片（统一风格） ---------------- */
.form-wrapper {
  width: 100%;
}
.form-group {
  width: 100%;
  background-color: #FFFFFF;
  border-radius: 20rpx;
  padding: 0;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
  overflow: hidden;
}
.group-header {
  width: 100%;
  padding: 30rpx 36rpx 20rpx;
  box-sizing: border-box;
  border-bottom: 1rpx solid #F5F5F7;
}
.group-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1D1D1F;
}

/* ---------------- 表单项（统一风格） ---------------- */
.form-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 24rpx 36rpx;
  box-sizing: border-box;
  border-bottom: 1rpx solid #F5F5F7;
}
.form-item:last-child {
  border-bottom: none;
}
.label {
  font-size: 26rpx;
  font-weight: 400;
  color: #86868B;
  margin-bottom: 16rpx;
}
.value {
  font-size: 28rpx;
  font-weight: 400;
  color: #1D1D1F;
  line-height: 1.5;
}

/* ---------------- 输入框（核心修复：解决文字显示异常） ---------------- */
.input-field {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 400;
  color: #1D1D1F;
  background-color: #F7F8FA;
  border-radius: 12rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  font-family: "PingFang SC", "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible;
}
.input-placeholder {
  color: #C7C7CC;
  font-weight: 400;
  font-size: 28rpx;
  line-height: 80rpx;
  font-family: "PingFang SC", "Helvetica Neue", Helvetica, Arial, sans-serif;
}
.small-input {
  height: 64rpx;
  line-height: 64rpx;
  font-size: 26rpx;
}
.small-input .input-placeholder {
  font-size: 26rpx;
  line-height: 64rpx;
}

/* ---------------- 白名单设备项 ---------------- */
.white-device-item {
  width: 100%;
  background-color: #F7F8FA;
  border-radius: 16rpx;
  padding: 24rpx;
  box-sizing: border-box;
  margin-bottom: 20rpx;
}
.white-device-item:last-child {
  margin-bottom: 0;
}
.device-form-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
  gap: 16rpx;
}
.device-form-row:last-child {
  margin-bottom: 0;
}
.sub-label {
  font-size: 24rpx;
  color: #86868B;
  width: 100rpx;
  flex-shrink: 0;
}
.input-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0;
}
.scan-icon-btn {
  width: 72rpx;
  height: 64rpx;
  background: #F0F7FF;
  border-radius: 0 12rpx 12rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -12rpx;
}
.scan-icon-text {
  font-size: 28rpx;
}

/* ---------------- 按钮（统一风格） ---------------- */
.add-btn-row {
  width: 100%;
  margin-bottom: 20rpx;
}
.add-white-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #007AFF;
  color: #FFFFFF;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 500;
  border: none;
  box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.25);
}
.del-btn-row {
  width: 100%;
  margin-top: 20rpx;
}
.del-btn {
  width: 100%;
  height: 64rpx;
  line-height: 64rpx;
  background-color: #FFEAEA;
  color: #FF3B30;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 500;
  border: none;
}
.btn-section {
  width: 100%;
  margin-top: 40rpx;
  padding-bottom: 40rpx;
}
.submit-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background-color: #007AFF;
  color: #FFFFFF;
  border-radius: 24rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.25);
  transition: all 0.2s ease;
}
.submit-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.2);
  background-color: #0066CC;
}
.submit-btn:disabled {
  background-color: #C7C7CC;
  box-shadow: none;
}
</style>