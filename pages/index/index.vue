<template>
  <view class="container">
    <view class="safe-area">
      <!-- 顶部品牌 -->
      <view class="header-section">
        <view class="logo-dot"></view>
        <text class="app-name">设备管理</text>
        <text class="app-slogan">Device Management</text>
      </view>

      <!-- 中部菜单 -->
      <view class="menu-section">
        <!-- 设备列表 -->
        <view class="menu-item" @click="goToDeviceList">
          <view class="menu-left">
            <view class="menu-icon-box device-color">
              <text class="icon-line">—</text>
            </view>
            <view class="menu-text">
              <text class="menu-title">设备列表</text>
              <text class="menu-sub">终端设备管控</text>
            </view>
          </view>
          <view class="menu-arrow">
            <text class="arrow-icon">›</text>
          </view>
        </view>

        <!-- 网关列表 -->
        <view class="menu-item" @click="goToGatewayList">
          <view class="menu-left">
            <view class="menu-icon-box gateway-color">
              <text class="icon-line">○</text>
            </view>
            <view class="menu-text">
              <text class="menu-title">网关列表</text>
              <text class="menu-sub">网关与子设备</text>
            </view>
          </view>
          <view class="menu-arrow">
            <text class="arrow-icon">›</text>
          </view>
        </view>
      </view>

      <view class="footer-section">
        <text class="version-text">Version 2.0.0</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    goToDeviceList() {
      // 尝试跳转，并捕获错误
      uni.navigateTo({
        url: '/pages/productTesting/productTesting',
        fail: (err) => {
          console.error('跳转失败:', err);
          uni.showToast({
            title: '页面未找到，请检查配置',
            icon: 'none',
            duration: 2000
          });
        }
      });
    },
    
    goToGatewayList() {
      uni.navigateTo({
        url: '/pages/gatewayList/gatewayList',
        fail: (err) => {
          console.error('跳转失败:', err);
          uni.showToast({
            title: '页面未找到，请检查配置',
            icon: 'none',
            duration: 2000
          });
        }
      });
    }
  }
};
</script>

<style scoped>
/* 样式保持不变，和之前的高级简约版一样 */
.container {
  width: 100vw;
  height: 100vh;
  background-color: #F7F8FA;
  display: flex;
  justify-content: center;
}

.safe-area {
  width: 100%;
  max-width: 600px;
  padding: 120rpx 60rpx 80rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.header-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: 80rpx;
}

.logo-dot {
  width: 12rpx;
  height: 12rpx;
  background-color: #007AFF;
  border-radius: 50%;
  margin-bottom: 40rpx;
}

.app-name {
  font-size: 56rpx;
  font-weight: 300;
  color: #1D1D1F;
  letter-spacing: -1rpx;
  margin-bottom: 8rpx;
}

.app-slogan {
  font-size: 28rpx;
  font-weight: 400;
  color: #86868B;
  text-transform: uppercase;
  letter-spacing: 2rpx;
}

.menu-section {
  width: 100%;
  margin-top: 120rpx;
}

.menu-item {
  width: 100%;
  height: 140rpx;
  background-color: #FFFFFF;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
  padding: 0 36rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
}

.menu-item:active {
  transform: scale(0.995);
  background-color: #FBFBFB;
}

.menu-left {
  display: flex;
  align-items: center;
}

.menu-icon-box {
  width: 64rpx;
  height: 64rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 28rpx;
}

.device-color { background-color: #E3F2FD; color: #1976D2; }
.gateway-color { background-color: #E8F5E9; color: #388E3C; }

.menu-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #1D1D1F;
  margin-bottom: 6rpx;
  display: block;
}

.menu-sub {
  font-size: 24rpx;
  font-weight: 400;
  color: #86868B;
  display: block;
}

.arrow-icon {
  font-size: 40rpx;
  color: #C7C7CC;
  font-weight: 300;
}

.footer-section {
  display: flex;
  justify-content: center;
  padding-bottom: 20rpx;
}

.version-text {
  font-size: 22rpx;
  color: #C7C7CC;
  letter-spacing: 1rpx;
}
</style>