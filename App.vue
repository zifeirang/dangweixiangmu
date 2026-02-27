<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  onLaunch() {
    // 原app.js的全局启动逻辑（已适配uni-app）
    console.log('App Launch');
    // 初始化本地存储（如有需要）
    const initConfig = uni.getStorageSync('config_baseUrl') || '';
    if (!initConfig) {
      uni.showToast({ title: '请先进入设置页配置接口', icon: 'none' });
    }
  },
  onShow() {
    console.log('App Show');
  },
  onHide() {
    console.log('App Hide');
  },
  globalData: {
    userInfo: null
  }
};
</script>

<style>
/* 原app.wxss全局样式 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  background-color: #f5f5f5;
  margin: 0;
  padding: 0;
}
</style>