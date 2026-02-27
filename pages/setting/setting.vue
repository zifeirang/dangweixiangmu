<template>
  <view class="setting-container">
	<text class="section-title">通用配置</text>
    <!-- 1. 通用接口配置（网关列表用） -->
    <view class="form-item">
      <text class="label">通用地址：</text>
      <input v-model="baseUrl" placeholder="请输入通用地址" class="input" />
    </view>
    <view class="form-item">
      <text class="label">通用Token：</text>
      <input v-model="token" placeholder="请输入通用token" class="input" />
    </view>

    <!-- 2. 网关详情专属接口配置 -->
    <view class="form-item">
      <text class="label">后端地址：</text>
      <input v-model="gatewayDetailBaseUrl" placeholder="请输入后端地址" class="input" />
    </view>
    <view class="form-item">
      <text class="label">后端Token：</text>
      <input v-model="gatewayDetailToken" placeholder="请输入后端Token" class="input" />
    </view>

    <!-- 新增：3. MCU服务器监控专属配置 -->
    <view class="form-section">
      <text class="section-title">运维服务器监控配置</text>
      <view class="form-item">
        <text class="label required">运维服务器地址：</text>
        <input 
          v-model="mcuBaseUrl" 
          placeholder="例：http://47.97.101.214:8000" 
          class="input"
        />
      </view>
      <view class="form-item">
        <text class="label required">运维服务接口Token：</text>
        <input 
          v-model="mcuToken" 
          placeholder="例：123456" 
          class="input"
        />
      </view>
    </view>

    <!-- 4. 扫网&网关参数配置 -->
    <view class="form-section">
      <text class="section-title">网关&扫网参数配置</text>
      <!-- 网关型号 -->
      <view class="form-item">
        <text class="label required">网关型号：</text>
        <input 
          v-model="gatewayProductKey" 
          placeholder="R101Gateway" 
          class="input"
        />
      </view>
	  <!-- 产品型号 -->
	  <view class="form-item">
	    <text class="label required">产品型号：</text>
	    <input 
	      v-model="whiteProductKey" 
	      placeholder="RE03010TCV2" 
	      class="input"
	    />
	  </view>
      <!-- 扫网时长 -->
      <view class="form-item">
        <text class="label required">扫网（秒）：</text>
        <input 
          v-model.number="scanDuration" 
          placeholder="默认60秒" 
          class="input" 
          type="number"
          min="1"
        />
      </view>
    </view>

    <!-- 保存按钮 -->
    <button class="save-btn" @click="saveConfig">保存配置</button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      // 原有：通用接口配置
      baseUrl: '',
      token: '',
      // 原有：网关详情接口配置
      gatewayDetailBaseUrl: '',
      gatewayDetailToken: '',
      // 新增：MCU服务器监控配置
      mcuBaseUrl: '',
      mcuToken: '',
      // 原有：扫网参数
      scanDuration: 60, // 扫网时长默认60秒
      whiteProductKey: '', // 白名单产品Key
      // 新增：网关产品Key（新增网关页面使用）
      gatewayProductKey: ''
    };
  },
  onLoad() {
    // 1. 读取原有接口配置
    this.baseUrl = uni.getStorageSync('config_baseUrl') || '';
    this.token = uni.getStorageSync('config_token') || '';
    this.gatewayDetailBaseUrl = uni.getStorageSync('config_gatewayDetailBaseUrl') || '';
    this.gatewayDetailToken = uni.getStorageSync('config_gatewayDetailToken') || '';

    // 新增：2. 读取MCU服务器监控配置
    this.mcuBaseUrl = uni.getStorageSync('config_mcuBaseUrl') || '';
    this.mcuToken = uni.getStorageSync('config_mcuToken') || '';

    // 3. 读取扫网参数配置
    this.scanDuration = uni.getStorageSync('config_scanDuration') || 60;
    this.whiteProductKey = uni.getStorageSync('config_whiteProductKey') || '';
    
    // 4. 读取新增的网关产品Key配置
    this.gatewayProductKey = uni.getStorageSync('config_gatewayProductKey') || '';
  },
  methods: {
    // 保存所有配置
    saveConfig() {
      // 基础校验：至少填写一组核心配置（通用/网关详情/MCU任选其一）
      const hasCommonConfig = this.baseUrl && this.token;
      const hasGatewayDetailConfig = this.gatewayDetailBaseUrl && this.gatewayDetailToken;
      const hasMcuConfig = this.mcuBaseUrl && this.mcuToken;
      if (!hasCommonConfig && !hasGatewayDetailConfig && !hasMcuConfig) {
        return uni.showToast({ title: '请至少填写一组接口配置', icon: 'none' });
      }

      // 扫网参数校验
      if (this.scanDuration < 1) {
        return uni.showToast({ title: '扫网时长需大于0秒', icon: 'none' });
      }

      // 1. 保存原有接口配置
      if (this.baseUrl && this.token) {
        uni.setStorageSync('config_baseUrl', this.baseUrl);
        uni.setStorageSync('config_token', this.token);
      }
      if (this.gatewayDetailBaseUrl && this.gatewayDetailToken) {
        uni.setStorageSync('config_gatewayDetailBaseUrl', this.gatewayDetailBaseUrl);
        uni.setStorageSync('config_gatewayDetailToken', this.gatewayDetailToken);
      }

      // 新增：2. 保存MCU服务器监控配置
      if (this.mcuBaseUrl && this.mcuToken) {
        uni.setStorageSync('config_mcuBaseUrl', this.mcuBaseUrl);
        uni.setStorageSync('config_mcuToken', this.mcuToken);
      } else {
        // 清空空配置，避免干扰
        uni.removeStorageSync('config_mcuBaseUrl');
        uni.removeStorageSync('config_mcuToken');
      }

      // 3. 保存扫网参数
      uni.setStorageSync('config_scanDuration', this.scanDuration);
      if (this.whiteProductKey) {
        uni.setStorageSync('config_whiteProductKey', this.whiteProductKey);
      } else {
        uni.removeStorageSync('config_whiteProductKey');
      }

      // 4. 保存网关产品Key（新增）
      if (this.gatewayProductKey) {
        uni.setStorageSync('config_gatewayProductKey', this.gatewayProductKey);
      } else {
        uni.removeStorageSync('config_gatewayProductKey');
      }

      uni.showToast({ title: '所有配置保存成功', icon: 'success' });
    }
  }
};
</script>

<style scoped>
.setting-container {
  padding: 20rpx 30rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}
.form-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #fff;
  border-radius: 8rpx;
  margin-bottom: 15rpx;
}
.label {
  width: 180rpx;
  font-size: 28rpx;
  color: #666;
}
.required::after {
  content: '*';
  color: #ff3b30;
  margin-left: 5rpx;
}
.input {
  flex: 1;
  font-size: 28rpx;
  padding: 10rpx;
  border: 1rpx solid #eee;
  border-radius: 6rpx;
}
/* 分区标题 */
.form-section {
  margin-top: 30rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 15rpx;
  padding-left: 10rpx;
  border-left: 4rpx solid #007aff;
}
.save-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #007aff;
  color: #fff;
  border-radius: 8rpx;
  font-size: 32rpx;
  margin-top: 20rpx;
  border: none;
}
</style>