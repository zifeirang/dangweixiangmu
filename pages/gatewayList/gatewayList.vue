<template>
  <view class="container">
    <view class="safe-area">
      
      <!-- 固定顶部区域 -->
      <view class="fixed-header">
        <!-- 顶部标题区 -->
        <view class="header-section">
          <text class="page-title">网关列表</text>
          <text class="page-subtitle">Gateway List</text>
        </view>

        <!-- 搜索栏（卡片式） -->
        <view class="search-card">
          <view class="search-row">
            <picker 
              mode="selector" 
              :range="searchTypes" 
              range-key="name" 
              @change="onSearchTypeChange" 
              :value="searchTypeIndex"
              class="search-picker"
            >
              <view class="picker-text">{{searchTypes[searchTypeIndex].name}}</view>
              <text class="picker-arrow">›</text>
            </picker>
            
            <input 
              class="search-input" 
              :placeholder="searchTypes[searchTypeIndex].placeholder" 
              v-model="searchValue" 
              @input="onSearchInput"
              placeholder-class="input-placeholder"
            />
            
            <view class="search-btn" @click="onSearch">
              <text class="search-btn-text">搜索</text>
            </view>
            
            <view class="add-btn" @click="handleAddGateway">
              <text class="add-btn-text">新增</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 网关列表（增加顶部内边距，避免被固定头部遮挡） -->
      <view class="list-wrapper">
        <view class="loading" v-if="loading">加载中...</view>
        <view class="empty" v-if="!loading && gatewayList.length === 0">暂无网关数据</view>
        
        <!-- 网关项：大卡片设计 -->
        <view 
          class="gateway-card" 
          v-for="item in gatewayList" 
          :key="item.id"
          @click="handleGoToDetail(item)"
        >
          <!-- 左侧信息区 -->
          <view class="card-left">
            <view class="info-row">
              <text class="info-label">网关名称</text>
              <text class="info-value">{{item.name || '-'}}</text>
            </view>
            <view class="info-row">
              <text class="info-label">设备 MAC</text>
              <text class="info-value mono">{{item.deviceName || '-'}}</text>
            </view>
            <view class="info-row">
              <text class="info-label">产品 Key</text>
              <text class="info-value mono">{{item.productKey || '-'}}</text>
            </view>
          </view>
          
          <!-- 右侧状态与操作区 -->
          <view class="card-right">
            <!-- 状态标签 -->
            <view class="status-tag" :class="item.status === 'ONLINE' ? 'status-online' : (item.status === 'OFFLINE' ? 'status-offline' : 'status-repair')">
              {{statusToText(item.status)}}
            </view>
            
            <!-- 操作按钮（垂直排列） -->
            <view class="action-btns">
              <view class="action-btn config-action" @click.stop="handleGoToConfig(item)">
                <text class="action-text">配网</text>
              </view>
              <view class="action-btn detail-action" @click.stop="handleGoToDetail(item)">
                <text class="action-text">详情</text>
              </view>
            </view>
          </view>
        </view>

        <view class="load-more" v-if="hasMore && !loading">上拉加载更多</view>
        <view class="no-more" v-if="!hasMore && gatewayList.length > 0">已加载全部</view>
      </view>
      
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      searchTypes: [
        { name: '网关名称', key: 'name', placeholder: '请输入网关名称' },
        { name: '设备MAC', key: 'deviceName', placeholder: '请输入设备MAC' },
        { name: '状态', key: 'status', placeholder: 'ONLINE/OFFLINE/REPAIR' }
      ],
      searchTypeIndex: 0,
      searchValue: '',
      offset: 0,
      limit: 10,
      total: 0,
      gatewayList: [],
      loading: false,
      hasMore: true,
      baseUrl: '',
      token: ''
    };
  },
  onLoad() {
    const savedBaseUrl = uni.getStorageSync('config_baseUrl');
    const savedToken = uni.getStorageSync('config_token');
    if (savedBaseUrl && savedToken) {
      this.baseUrl = savedBaseUrl;
      this.token = savedToken;
      this.getGatewayList();
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
      this.getGatewayList();
    }
  },
  methods: {
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
      this.gatewayList = [];
      this.hasMore = true;
      this.getGatewayList();
    },
    getGatewayList(callback) {
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
        url: `${baseUrl}/v1/gateways`,
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
            const validList = list.filter(item => item && item.id);
            this.gatewayList = this.gatewayList.concat(validList);
            this.total = total;
            this.hasMore = this.gatewayList.length < total; // 修复分页逻辑
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
    handleAddGateway() {
      uni.navigateTo({ url: '/pages/gatewayCreate/gatewayCreate' });
    },
    handleGoToConfig(item) {
      uni.navigateTo({
        url: `/pages/scan-web/scan-web?deviceName=${encodeURIComponent(item.deviceName || '')}&productKey=${encodeURIComponent(item.productKey || '')}&name=${encodeURIComponent(item.name || '')}`
      });
    },
    handleGoToDetail(item) {
      uni.navigateTo({
        url: `/pages/gatewayDetail/gatewayDetail?gatewayId=${item.id}&name=${item.name}&deviceName=${item.deviceName}&productKey=${item.productKey}&status=${item.status}`
      });
    }
  }
};
</script>

<style scoped>
/* ---------------- 全局容器 ---------------- */
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
  padding: 0 40rpx 40rpx;
  box-sizing: border-box;
}

/* ---------------- 核心：固定顶部区域 ---------------- */
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background-color: #F7F8FA;
  padding: 60rpx 40rpx 20rpx;
  padding-top: calc(60rpx + env(safe-area-inset-top));
  box-sizing: border-box;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}

/* ---------------- 顶部标题 ---------------- */
.header-section {
  margin-bottom: 20rpx;
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

/* ---------------- 搜索卡片 ---------------- */
.search-card {
  width: 100%;
  background-color: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  box-sizing: border-box;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
}

.search-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

/* 选择器 */
.search-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #F7F8FA;
  border-radius: 12rpx;
  padding: 0 20rpx;
  height: 72rpx;
  flex-shrink: 0;
}

.picker-text {
  font-size: 26rpx;
  color: #1D1D1F;
  margin-right: 8rpx;
}

.picker-arrow {
  font-size: 28rpx;
  color: #C7C7CC;
  font-weight: 300;
}

/* 输入框 */
.search-input {
  flex: 1;
  height: 72rpx;
  background-color: #F7F8FA;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #1D1D1F;
}

.input-placeholder {
  color: #C7C7CC;
}

/* 按钮 */
.search-btn, .add-btn {
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.search-btn {
  background-color: #F0F7FF;
}

.search-btn-text {
  font-size: 26rpx;
  color: #007AFF;
  font-weight: 500;
}

.add-btn {
  background-color: #007AFF;
  box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.25);
}

.add-btn-text {
  font-size: 26rpx;
  color: #FFFFFF;
  font-weight: 500;
}

/* ---------------- 列表区域（核心：增加顶部内边距） ---------------- */
.list-wrapper {
  width: 100%;
  padding-top: 340rpx;
}

/* 网关大卡片 */
.gateway-card {
  width: 100%;
  background-color: #FFFFFF;
  border-radius: 20rpx;
  padding: 32rpx;
  box-sizing: border-box;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  transition: all 0.2s ease;
}

.gateway-card:active {
  transform: scale(0.995);
  background-color: #FBFBFB;
}

/* 左侧信息 */
.card-left {
  flex: 1;
  margin-right: 20rpx;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  width: 140rpx;
  font-size: 26rpx;
  color: #86868B;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  font-size: 28rpx;
  color: #1D1D1F;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 等宽字体（用于MAC/Key） */
/* .mono {
  font-family: monospace;
  font-size: 26rpx;
} */

/* 右侧状态与操作 */
.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  height: 160rpx;
}

/* 状态标签 */
.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
  font-weight: 500;
}

.status-online {
  background-color: #E8F5E9;
  color: #388E3C;
}

.status-offline {
  background-color: #F5F5F7;
  color: #86868B;
}

.status-repair {
  background-color: #FFF3E0;
  color: #F57C00;
}

/* 操作按钮 */
.action-btns {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 20rpx;
}

.action-btn {
  padding: 8rpx 20rpx;
  border-radius: 10rpx;
}

.config-action {
  background-color: #F0F7FF;
}

.detail-action {
  background-color: #F5F5F7;
}

.action-text {
  font-size: 24rpx;
  color: #1D1D1F;
}

.config-action .action-text {
  color: #007AFF;
}

/* 加载/空状态 */
.empty, .loading, .load-more, .no-more {
  padding: 60rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #86868B;
}
</style>