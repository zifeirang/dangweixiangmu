<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <picker 
        mode="selector" 
        :range="searchTypes" 
        range-key="name" 
        @change="onSearchTypeChange" 
        :value="searchTypeIndex"
      >
        <view class="picker">{{searchTypes[searchTypeIndex].name}}</view>
      </picker>
      <input 
        class="search-input" 
        :placeholder="searchTypes[searchTypeIndex].placeholder" 
        v-model="searchValue" 
        @input="onSearchInput"
      />
      <button class="search-btn" @click="onSearch">搜索</button>
      <button class="add-btn" @click="handleAddGateway">新增</button>
    </view>

    <!-- 网关列表 -->
    <view class="gateway-list">
      <view class="loading" v-if="loading">加载中...</view>
      <view class="empty" v-if="!loading && gatewayList.length === 0">暂无网关数据</view>
      
      <!-- 网关项：按钮垂直排列 -->
      <view class="gateway-item" v-for="item in gatewayList" :key="item.id">
        <view class="gateway-info">
          <view class="item-row"><text class="label">网关名称：</text><text class="value">{{item.name || '-'}}</text></view>
          <view class="item-row"><text class="label">设备MAC：</text><text class="value">{{item.deviceName || '-'}}</text></view>
          <view class="item-row"><text class="label">产品Key：</text><text class="value">{{item.productKey || '-'}}</text></view>
          <view class="item-row">
            <text class="label">状态：</text>
            <text class="value" :class="item.status === 'ONLINE' ? 'online' : (item.status === 'OFFLINE' ? 'offline' : 'repair')">
              {{statusToText(item.status)}}
            </text>
          </view>
        </view>
        <!-- 操作按钮组：垂直排列 + 均分触摸区域 -->
        <view class="action-group">
          <text class="config-btn" @click="handleGoToConfig(item)">配网</text>
          <!-- 中间空格（间距） -->
          <view class="space"></view>
          <text class="detail-btn" @click="handleGoToDetail(item)">详情</text>
        </view>
      </view>

      <view class="load-more" v-if="hasMore && !loading">上拉加载更多</view>
      <view class="no-more" v-if="!hasMore && gatewayList.length > 0">已加载全部</view>
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
            this.hasMore = this.gatewayList.length + validList.length < total;
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
/* 全局容器 */
.container {
  width: 100%;
  height: 100vh;
  background-color: #f5f5f5;
}

/* 搜索栏：极简风格 */
.search-bar {
  display: flex;
  align-items: center;
  padding: 10rpx 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}

.picker {
  width: 130rpx;
  height: 68rpx;
  line-height: 68rpx;
  text-align: center;
  border: 1rpx solid #eee;
  border-radius: 4rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.search-input {
  flex: 1;
  height: 68rpx;
  margin: 0 10rpx;
  padding: 0 12rpx;
  border: 1rpx solid #eee;
  border-radius: 4rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.search-btn {
  width: 100rpx;
  height: 68rpx;
  line-height: 68rpx;
  font-size: 26rpx;
  padding: 0;
  border-radius: 4rpx;
}

.add-btn {
  width: 110rpx;
  height: 68rpx;
  line-height: 68rpx;
  background: #3cc800;
  color: #fff;
  border-radius: 4rpx;
  font-size: 26rpx;
  margin-left: 8rpx;
  border: none;
}

/* 网关列表容器 */
.gateway-list {
  padding: 10rpx;
}

/* 加载/空状态 */
.empty, .loading, .load-more, .no-more {
  padding: 25rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

/* 网关项：极简卡片 */
.gateway-item {
  background: #fff;
  padding: 20rpx 15rpx;
  margin: 0 5rpx 12rpx;
  border-radius: 6rpx;
  box-shadow: 0 1rpx 3rpx rgba(0,0,0,0.03);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 140rpx; /* 固定最小高度，适配按钮垂直排列 */
}

/* 网关信息区域 */
.gateway-info {
  flex: 1;
}

.item-row {
  display: flex;
  align-items: center;
  height: 56rpx;
  margin-bottom: 8rpx;
}

.item-row:last-child {
  margin-bottom: 0;
}

.label {
  width: 130rpx;
  color: #666;
  font-size: 26rpx;
  text-align: right;
  padding-right: 15rpx;
  white-space: nowrap;
}

.value {
  flex: 1;
  color: #333;
  font-size: 26rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 状态颜色 */
.online { color: #00c800; }
.offline { color: #999; }
.repair { color: #ff9500; }

/* 操作按钮组：垂直排列 + 均分触摸区域（核心调整） */
.action-group {
  display: flex;
  flex-direction: column; /* 垂直排列 */
  height: 120rpx; /* 固定高度，适配网关项 */
  width: 80rpx; /* 按钮宽度 */
  justify-content: space-between; /* 均分空间 */
  align-items: center; /* 文字居中 */
  margin-left: 15rpx;
}

/* 中间空格 */
.space {
  height: 8rpx; /* 空格高度（间距） */
  width: 100%;
}

/* 配网按钮：占上半部分触摸区域 */
.config-btn {
  font-size: 26rpx;
  color: #007aff;
  cursor: pointer;
  width: 100%;
  height: 50%; /* 占按钮组高度的一半 */
  line-height: 60rpx; /* 垂直居中 */
  text-align: center; /* 水平居中 */
}

/* 详情按钮：占下半部分触摸区域 */
.detail-btn {
  font-size: 26rpx;
  color: #666;
  cursor: pointer;
  width: 100%;
  height: 50%; /* 占按钮组高度的一半 */
  line-height: 60rpx; /* 垂直居中 */
  text-align: center; /* 水平居中 */
}

/* 点击反馈 */
.config-btn:active {
  color: #0066cc;
  background-color: #f0f7ff;
  border-radius: 4rpx;
}

.detail-btn:active {
  color: #333;
  background-color: #f5f5f5;
  border-radius: 4rpx;
}
</style>