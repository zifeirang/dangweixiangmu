<template>
  <view class="container">
    <view class="safe-area">
      <!-- 密码验证弹窗 -->
      <view class="password-modal" v-if="showPasswordModal">
        <view class="modal-content">
          <view class="modal-header">
            <text class="modal-title">请输入密码</text>
          </view>
          <view class="modal-body">
            <input 
              class="password-input" 
              type="password" 
              v-model="inputPassword" 
              placeholder="请输入管理员密码"
              placeholder-class="input-placeholder"
              @confirm="verifyPassword"
            />
          </view>
          <view class="modal-footer">
            <button class="modal-btn cancel-btn" @click="handleCancel">取消</button>
            <button class="modal-btn confirm-btn" @click="verifyPassword">确认</button>
          </view>
        </view>
      </view>
      <view class="modal-mask" v-if="showPasswordModal" @click="handleCancel"></view>

      <!-- 设置页面内容（仅在验证通过后显示） -->
      <template v-if="isAuthenticated">
        <!-- 顶部标题区 -->
        <view class="header-section">
          <text class="page-title">系统设置</text>
          <text class="page-subtitle">Configuration</text>
        </view>

        <!-- 表单区域 -->
        <view class="form-wrapper">
          
          <!-- 第一组：服务器配置 -->
          <view class="form-group">
            <view class="group-header">
              <text class="group-title">服务器配置</text>
            </view>
            
            <!-- 通用地址 -->
            <view class="input-item">
              <text class="input-label">通用地址</text>
              <input 
                v-model="baseUrl" 
                placeholder="请输入通用地址 (如: http://47.97.101.214:10082/bAdmin)" 
                class="input-field" 
                placeholder-class="input-placeholder"
              />
            </view>
            
            <!-- 通用 Token -->
            <view class="input-item">
              <text class="input-label">通用 Token</text>
              <input 
                v-model="token" 
                placeholder="请输入通用接口 Token" 
                class="input-field" 
                placeholder-class="input-placeholder"
              />
            </view>
            
            <!-- 后端地址 -->
            <view class="input-item">
              <text class="input-label">后端地址</text>
              <input 
                v-model="gatewayDetailBaseUrl" 
                placeholder="请输入后端地址 (如: http://47.97.101.214:10081)" 
                class="input-field" 
                placeholder-class="input-placeholder"
              />
            </view>
            
            <!-- 后端 Token -->
            <view class="input-item">
              <text class="input-label">后端 Token</text>
              <input 
                v-model="gatewayDetailToken" 
                placeholder="请输入后端 Token" 
                class="input-field" 
                placeholder-class="input-placeholder"
              />
            </view>
          </view>

          <!-- 第二组：网关参数配置 -->
          <view class="form-group">
            <view class="group-header">
              <text class="group-title">网关 & 扫网参数</text>
            </view>
            
            <view class="input-item">
              <text class="input-label">网关型号</text>
              <input 
                v-model="gatewayProductKey" 
                placeholder="R101Gateway" 
                class="input-field" 
                placeholder-class="input-placeholder"
              />
            </view>
            
            <view class="input-item">
              <text class="input-label">产品型号</text>
              <input 
                v-model="whiteProductKey" 
                placeholder="RE03010TCV2" 
                class="input-field" 
                placeholder-class="input-placeholder"
              />
            </view>
            
            <view class="input-item">
              <text class="input-label">扫网时长 (秒)</text>
              <input 
                v-model.number="scanDuration" 
                placeholder="60" 
                class="input-field" 
                type="number"
                placeholder-class="input-placeholder"
              />
            </view>
          </view>

          <!-- 第三组：密码管理 -->
          <view class="form-group">
            <view class="group-header">
              <text class="group-title">密码管理</text>
            </view>
            
            <view class="input-item">
              <text class="input-label">新密码</text>
              <input 
                v-model="newPassword" 
                type="password"
                placeholder="请输入新密码（至少6位）" 
                class="input-field" 
                placeholder-class="input-placeholder"
              />
            </view>
            
            <view class="input-item">
              <text class="input-label">确认新密码</text>
              <input 
                v-model="confirmNewPassword" 
                type="password"
                placeholder="请再次输入新密码" 
                class="input-field" 
                placeholder-class="input-placeholder"
              />
            </view>
            
            <view class="password-btn-wrapper">
              <button class="password-btn" @click="changePassword">修改密码</button>
            </view>
          </view>

          <!-- 保存按钮 -->
          <view class="btn-section">
            <button class="save-btn" @click="saveConfig">保存配置</button>
          </view>

        </view>
      </template>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      // 密码验证相关
      showPasswordModal: false,
      inputPassword: '',
      isAuthenticated: false,
      
      // 默认密码（首次使用）
      defaultPassword: '123456',
      
      // 通用接口配置
      baseUrl: '',
      token: '',
      // 网关详情接口配置
      gatewayDetailBaseUrl: '',
      gatewayDetailToken: '',
      // 扫网参数
      scanDuration: 60,
      whiteProductKey: 'RE03010TCV2',
      gatewayProductKey: 'R101Gateway',
      
      // 修改密码相关
      newPassword: '',
      confirmNewPassword: ''
    };
  },
  onLoad() {
    this.checkAuthentication();
  },
  onShow() {
    // 每次显示页面时都检查认证状态
    if (!this.isAuthenticated) {
      this.checkAuthentication();
    }
  },
  methods: {
    // 检查是否已认证
    checkAuthentication() {
      // 从本地存储获取已认证状态
      const authenticated = uni.getStorageSync('setting_authenticated');
      const authTimestamp = uni.getStorageSync('setting_auth_timestamp');
      
      // 检查认证是否在有效期内（1小时）
      const now = Date.now();
      const expireTime = 1 * 60 * 60 * 1000; // 1小时
      
      if (authenticated && authTimestamp && (now - authTimestamp < expireTime)) {
        this.isAuthenticated = true;
        this.loadConfig();
      } else {
        this.showPasswordModal = true;
      }
    },
    
    // 验证密码
    verifyPassword() {
      if (!this.inputPassword) {
        uni.showToast({ title: '请输入密码', icon: 'none' });
        return;
      }
      
      // 从本地存储获取密码，如果没有则使用默认密码
      const savedPassword = uni.getStorageSync('admin_password') || this.defaultPassword;
      
      if (this.inputPassword === savedPassword) {
        // 密码正确
        this.isAuthenticated = true;
        this.showPasswordModal = false;
        this.inputPassword = '';
        
        // 保存认证状态和时间戳
        uni.setStorageSync('setting_authenticated', true);
        uni.setStorageSync('setting_auth_timestamp', Date.now());
        
        // 加载配置
        this.loadConfig();
        
        uni.showToast({ title: '验证成功', icon: 'success' });
      } else {
        // 密码错误
        uni.showToast({ title: '密码错误', icon: 'none' });
      }
    },
    
    // 取消验证
    handleCancel() {
      this.showPasswordModal = false;
      this.inputPassword = '';
      
      // 返回到首页
      uni.switchTab({
        url: '/pages/index/index'
      });
    },
    
    // 加载配置
    loadConfig() {
      this.baseUrl = uni.getStorageSync('config_baseUrl') || '';
      this.token = uni.getStorageSync('config_token') || '';
      this.gatewayDetailBaseUrl = uni.getStorageSync('config_gatewayDetailBaseUrl') || '';
      this.gatewayDetailToken = uni.getStorageSync('config_gatewayDetailToken') || '';
      this.scanDuration = uni.getStorageSync('config_scanDuration') || 60;
      this.whiteProductKey = uni.getStorageSync('config_whiteProductKey') || 'RE03010TCV2';
      this.gatewayProductKey = uni.getStorageSync('config_gatewayProductKey') || 'R101Gateway';
    },
    
    // 保存所有配置（保留你原本的逻辑）
    saveConfig() {
      // 基础校验
      if (!this.baseUrl || !this.token) {
        return uni.showToast({ title: '请填写通用地址和Token', icon: 'none' });
      }
      if (this.scanDuration < 1) {
        return uni.showToast({ title: '扫网时长需大于0秒', icon: 'none' });
      }

      // 保存配置
      uni.setStorageSync('config_baseUrl', this.baseUrl);
      uni.setStorageSync('config_token', this.token);
      uni.setStorageSync('config_gatewayDetailBaseUrl', this.gatewayDetailBaseUrl);
      uni.setStorageSync('config_gatewayDetailToken', this.gatewayDetailToken);
      uni.setStorageSync('config_scanDuration', this.scanDuration);
      uni.setStorageSync('config_whiteProductKey', this.whiteProductKey);
      uni.setStorageSync('config_gatewayProductKey', this.gatewayProductKey);

      uni.showToast({ title: '保存成功', icon: 'success' });
      
      // 延迟返回
      setTimeout(() => {
        uni.navigateBack();
      }, 1000);
    },
    
    // 修改密码
    changePassword() {
      if (!this.newPassword) {
        uni.showToast({ title: '请输入新密码', icon: 'none' });
        return;
      }
      
      if (this.newPassword !== this.confirmNewPassword) {
        uni.showToast({ title: '两次输入的密码不一致', icon: 'none' });
        return;
      }
      
      if (this.newPassword.length < 6) {
        uni.showToast({ title: '密码长度至少6位', icon: 'none' });
        return;
      }
      
      uni.showModal({
        title: '确认修改',
        content: '确定要修改密码吗？',
        success: (res) => {
          if (res.confirm) {
            uni.setStorageSync('admin_password', this.newPassword);
            
            // 清除认证状态，需要重新登录
            uni.removeStorageSync('setting_authenticated');
            uni.removeStorageSync('setting_auth_timestamp');
            
            this.newPassword = '';
            this.confirmNewPassword = '';
            this.isAuthenticated = false;
            
            uni.showToast({ title: '密码修改成功，请重新登录', icon: 'success' });
            
            // 延迟显示密码输入框
            setTimeout(() => {
              this.showPasswordModal = true;
            }, 1500);
          }
        }
      });
    }
  }
};
</script>

<style scoped>
/* 全局容器（和其他页面完全统一） */
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

/* 顶部标题 */
.header-section {
  margin-bottom: 60rpx;
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

/* 表单 */
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

/* 输入项 */
.input-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 24rpx 36rpx;
  box-sizing: border-box;
  border-bottom: 1rpx solid #F5F5F7;
}
.input-item:last-child {
  border-bottom: none;
}
.input-label {
  font-size: 26rpx;
  font-weight: 400;
  color: #86868B;
  margin-bottom: 12rpx;
}
.input-field {
  width: 100%;
  font-size: 30rpx;
  font-weight: 400;
  color: #1D1D1F;
  line-height: 1.5;
}
.input-placeholder {
  color: #C7C7CC;
  font-weight: 400;
}

/* 密码修改按钮 */
.password-btn-wrapper {
  padding: 0 36rpx 24rpx;
}
.password-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #F5F5F7;
  color: #1D1D1F;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 500;
  border: none;
}

/* 按钮 */
.btn-section {
  width: 100%;
  margin-top: 40rpx;
  padding-bottom: 40rpx;
}
.save-btn {
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
.save-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.2);
  background-color: #0066CC;
}

/* 密码弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 998;
}
.password-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 999;
  width: 560rpx;
}
.modal-content {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
}
.modal-header {
  padding: 40rpx 40rpx 20rpx;
  text-align: center;
}
.modal-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #1D1D1F;
}
.modal-body {
  padding: 20rpx 40rpx 40rpx;
}
.password-input {
  width: 100%;
  height: 88rpx;
  background: #F7F8FA;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1D1D1F;
  box-sizing: border-box;
}
.modal-footer {
  display: flex;
  border-top: 1rpx solid #F5F5F7;
}
.modal-btn {
  flex: 1;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
  background: transparent;
}
.cancel-btn {
  color: #86868B;
  border-right: 1rpx solid #F5F5F7;
}
.confirm-btn {
  color: #007AFF;
}
</style>