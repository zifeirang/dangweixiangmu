<template>
  <!-- 背景图容器（绝对定位，作为底层） -->
  <view class="container">
    <!-- 注意：uni-app 静态资源需放在 static 目录下，路径改为 /static/images/bj.jpg -->
    <image class="bg-img" src="/static/images/bj.jpg" mode="widthFix"></image>

    <!-- 按钮区域（在背景图上层） -->
    <view class="btn-group">
      <navigator url="/pages/deviceList/deviceList" class="btn" @click="goToDeviceList">
        设备列表
      </navigator>
      <navigator url="/pages/gatewayList/gatewayList" class="btn" @click="goToGatewayList">
        网关列表
      </navigator>
      <navigator url="/pages/productTesting/productTesting" class="btn" @click="goToProductTest">
        产品测试
      </navigator>
      <!-- 新增：服务器监控跳转按钮 -->
      <navigator url="/pages/server-monitor/server-monitor" class="btn" @click="goToServerMonitor">
        服务器监控
      </navigator>
      <!-- 新增：MCU状态列表跳转按钮 -->
      <navigator url="/pages/mcu-status-list/mcu-status-list" class="btn" @click="goToMcuStatusList">
        状态列表
      </navigator>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    // 跳转到设备列表（兼容 uni-app 所有端）
    goToDeviceList() {
      uni.navigateTo({
        url: '/pages/deviceList/deviceList'
      })
    },
    
    // 跳转到网关列表
    goToGatewayList() {
      uni.navigateTo({
        url: '/pages/gatewayList/gatewayList'
      })
    },

    // 跳转到测试列表
    goToProductTest() {
      uni.navigateTo({
        url: '/pages/productTesting/productTesting'
      })
    },

    // 新增：跳转到服务器监控页面
    goToServerMonitor() {
      uni.navigateTo({
        url: '/pages/server-monitor/server-monitor'
      })
    },

    // 新增：跳转到MCU状态列表页面
    goToMcuStatusList() {
      uni.navigateTo({
        url: '/pages/mcu-status-list/mcu-status-list'
      })
    }
  }
};
</script>

<style scoped>
/* 容器设为相对定位，方便子元素绝对定位 */
.container {
  width: 100vw;
  height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  /* 防止内容溢出 */
  overflow: hidden;
}

/* 背景图：绝对定位覆盖全屏，层级调低 */
.bg-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 40%;
  z-index: -1; /* 让按钮在背景图上层 */
  /* 适配不同屏幕，保持比例 */
  object-fit: cover;
}

/* 按钮组样式 */
.btn-group {
  width: 80%;
  display: flex;
  flex-direction: column;
  gap: 30rpx;
  /* 原200px改为400rpx，适配移动端rpx单位 */
  margin-top: 400rpx;
}

/* 按钮样式 */
.btn {
  height: 100rpx;
  line-height: 100rpx;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 50rpx;
  text-align: center;
  font-size: 36rpx;
  color: #000;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
  /* 去除navigator默认下划线 */
  text-decoration: none;
  /* 新增：按钮hover/点击动效，提升体验 */
  transition: all 0.2s ease;
}

/* 按钮点击/hover效果 */
.btn:active {
  background-color: rgba(255, 255, 255, 1);
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}
</style>