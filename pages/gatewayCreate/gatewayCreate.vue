<template>
  <view class="container">
    <!-- 表单项：网关名称 -->
    <view class="form-item">
      <text class="label">网关名称：</text>
      <input 
        class="input" 
        placeholder="请输入网关名称" 
        v-model="name" 
        @input="onNameInput"
        maxlength="50"
      />
    </view>

    <!-- 表单项：设备MAC（图片扫码按钮） -->
    <view class="form-item">
      <text class="label">设备MAC：</text>
      <!-- 输入框+扫码按钮容器 -->
      <view class="input-group">
        <input 
          class="input" 
          placeholder="请输入设备MAC" 
          v-model="deviceName" 
          @input="onDeviceNameInput"
          maxlength="20"
        />
        <!-- 扫码按钮：图片形式 -->
        <button class="scan-btn" @click="handleScan" :loading="false">
          <image src="/static/images/scan-icon.png" class="scan-img" mode="widthFix"></image>
        </button>
      </view>
    </view>

    <!-- 保存按钮 -->
    <button 
      class="save-btn" 
      @click="handleSave"
      :loading="loading"
      :disabled="loading"
    >保存</button>
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
/* 全局容器 */
.container {
  padding: 20rpx;
  background-color: #f9f9f9;
  min-height: 100vh;
}

/* 表单项通用样式 */
.form-item {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 20rpx;
  border-radius: 8rpx;
  margin-bottom: 15rpx;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.05);
}

/* 标签样式 */
.label {
  width: 150rpx;
  font-size: 28rpx;
  color: #666;
  flex-shrink: 0; /* 防止标签被压缩 */
}

/* 输入框+扫码按钮容器 */
.input-group {
  flex: 1;
  display: flex;
  align-items: center;
}

/* 输入框通用样式 */
.input {
  flex: 1;
  font-size: 28rpx;
  padding: 12rpx 15rpx;
  border: 1rpx solid #eee;
  border-right: none;
  border-radius: 6rpx 0 0 6rpx; /* 左圆角 */
  height: 56rpx;
  box-sizing: border-box;
}

/* 扫码按钮样式（图片版） */
.scan-btn {
  width: 70rpx;
  height: 56rpx; /* 与输入框高度完全对齐 */
  background: #ffffff;
  border: none;
  border-radius: 0 6rpx 6rpx 0; /* 右圆角 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
}

/* 扫码图片样式 */
.scan-img {
  width: 32rpx; /* 图片宽度 */
  height: 32rpx; /* 图片高度，保持正方形 */
  vertical-align: middle;
}

/* 保存按钮样式 */
.save-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #007aff;
  color: #fff;
  border-radius: 8rpx;
  font-size: 32rpx;
  margin-top: 30rpx;
  border: none;
}

/* 禁用/加载状态样式 */
.save-btn:disabled {
  background: #999;
  color: #fff;
}
</style>