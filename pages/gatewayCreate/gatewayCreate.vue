<template>
  <view class="container">
    <view class="safe-area">
      <!-- 顶部标题区 -->
      <view class="header-section">
        <text class="page-title">新增网关</text>
        <text class="page-subtitle">Add Gateway</text>
      </view>

      <!-- 表单卡片 -->
      <view class="form-wrapper">
        <view class="form-group">
          <view class="group-header">
            <text class="group-title">网关信息</text>
          </view>
          
          <!-- 表单项：网关名称 -->
          <view class="form-item">
            <text class="label">网关名称</text>
            <input 
              class="input-field" 
              placeholder="请输入网关名称" 
              v-model="name" 
              @input="onNameInput"
              maxlength="50"
              placeholder-class="input-placeholder"
            />
          </view>

          <!-- 表单项：设备MAC（图片扫码按钮） -->
          <view class="form-item">
            <text class="label">设备MAC</text>
            <!-- 输入框+扫码按钮容器 -->
            <view class="input-group">
              <input 
                class="input-field scan-input" 
                placeholder="请输入设备MAC" 
                v-model="deviceName" 
                @input="onDeviceNameInput"
                maxlength="20"
                placeholder-class="input-placeholder"
              />
              <!-- 扫码按钮：图片形式 -->
              <view class="scan-icon-btn" @click="handleScan">
                <text class="scan-icon-text">📷</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 保存按钮 -->
        <view class="btn-section">
          <button 
            class="submit-btn" 
            @click="handleSave"
            :loading="loading"
            :disabled="loading"
          >
            <text v-if="!loading">保存</text>
            <text v-if="loading">保存中...</text>
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
      name: '',
      deviceName: '',
      loading: false,
      baseUrl: '',
      token: '',
      // 新增：从配置页读取网关产品Key
      gatewayProductKey: ''
    };
  },

  onLoad() {
    // 1. 读取通用接口配置
    const savedBaseUrl = uni.getStorageSync('config_baseUrl');
    const savedToken = uni.getStorageSync('config_token');
    if (savedBaseUrl && savedToken) {
      this.baseUrl = savedBaseUrl;
      this.token = savedToken;
    } else {
      uni.showToast({ title: '请先配置接口信息', icon: 'none' });
      setTimeout(() => uni.navigateBack(), 1500);
      return;
    }

    // 2. 读取配置页的网关产品Key
    this.gatewayProductKey = uni.getStorageSync('config_gatewayProductKey') || '';
    if (!this.gatewayProductKey) {
      uni.showToast({ title: '请先在配置页设置网关产品Key', icon: 'none' });
    }
  },

  methods: {
    // 输入事件（移除产品Key相关）
    onNameInput(e) { this.name = e.detail.value.trim(); },
    onDeviceNameInput(e) { this.deviceName = e.detail.value.trim(); },

    // 扫码入口：直接调用扫码（跳过不支持的权限检查）
    handleScan() {
      this.doScanCode();
    },

    // 核心扫码逻辑：兼容小程序/App双端，失败时处理权限
    doScanCode() {
      uni.scanCode({
        onlyFromCamera: true,
        scanType: ['qrCode'],
        success: (res) => {
          this.deviceName = res.result.trim();
          uni.showToast({ title: '扫码成功', icon: 'success', duration: 1000 });
        },
        fail: (err) => {
          console.error('扫码失败：', err);
          // 权限相关错误，引导到设置（适配不同端）
          if (err.errMsg.includes('permission') || err.errMsg.includes('getSetting')) {
            uni.showModal({
              title: '需要摄像头权限',
              content: uni.getSystemInfoSync().platform === 'app-plus' 
                ? '请在手机设置中开启App的摄像头权限' 
                : '请在微信中开启小程序的摄像头权限',
              confirmText: '去设置',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 小程序端打开设置，App端跳转到系统设置
                  if (uni.getSystemInfoSync().platform === 'app-plus') {
                    // App端打开应用权限设置（需App平台支持）
                    uni.openAppAuthorizeSetting({
                      success: () => uni.showToast({ title: '请重新扫码', icon: 'none' })
                    });
                  } else {
                    // 小程序端打开设置
                    uni.openSetting({
                      success: () => uni.showToast({ title: '请重新扫码', icon: 'none' })
                    });
                  }
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

    // 保存按钮逻辑（适配网关产品Key）
    handleSave() {
      const { name, deviceName, gatewayProductKey, baseUrl, token } = this;

      // 校验逻辑调整：校验配置页的网关产品Key
      if (!name) return uni.showToast({ title: '请输入网关名称', icon: 'none' });
      if (!deviceName) return uni.showToast({ title: '请输入/扫码设备MAC', icon: 'none' });
      if (!gatewayProductKey) {
        return uni.showToast({ title: '请先在配置页设置网关产品Key', icon: 'none' });
      }

      this.loading = true;
      uni.request({
        url: `${baseUrl}/v1/gateways`,
        method: 'POST',
        header: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        // 产品Key使用配置页读取的值
        data: { name, deviceName, productKey: gatewayProductKey },
        success: (res) => {
          if (res.statusCode === 200) {
            uni.showToast({ title: '新增成功', icon: 'success' });
            setTimeout(() => uni.navigateBack(), 1500);
          } else {
            uni.showToast({ title: '新增失败', icon: 'none' });
          }
        },
        fail: () => {
          uni.showToast({ title: '网络错误', icon: 'none' });
        },
        complete: () => {
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

/* ---------------- 输入框（统一风格） ---------------- */
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
}
.input-placeholder {
  color: #C7C7CC;
  font-weight: 400;
  font-size: 28rpx;
  line-height: 80rpx;
  font-family: "PingFang SC", "Helvetica Neue", Helvetica, Arial, sans-serif;
}

/* ---------------- 扫码输入框组合 ---------------- */
.input-group {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0;
}
.scan-input {
  border-radius: 12rpx 0 0 12rpx;
}
.scan-icon-btn {
  width: 80rpx;
  height: 80rpx;
  background: #F0F7FF;
  border-radius: 0 12rpx 12rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.scan-icon-text {
  font-size: 32rpx;
}

/* ---------------- 按钮（统一风格） ---------------- */
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