<template>
  <view class="container">
    <!-- 搜索栏：对齐接口参数：name/deviceName/status -->
    <view class="search-bar">
      <picker 
        mode="selector" 
        :range="searchTypes" 
        range-key="name" 
        @change="onSearchTypeChange" 
        :value="searchTypeIndex"
      >
        <view class="picker">
          {{searchTypes[searchTypeIndex].name}}
        </view>
      </picker>
      
      <!-- 输入框：适配不同查询类型的占位符 -->
      <input 
        class="search-input" 
        :placeholder="searchTypes[searchTypeIndex].placeholder" 
        v-model="searchValue" 
        @input="onSearchInput"
      />
      
      <button class="search-btn" @click="onSearch">搜索</button>
    </view>

    <!-- 设备列表 -->
    <view class="device-list">
      <view class="empty" v-if="deviceList.length === 0 && !loading">暂无设备数据</view>
      <view class="loading" v-if="loading">加载中...</view>
      
      <!-- 列表项（对齐接口返回字段） -->
      <view class="device-item" v-for="item in deviceList" :key="item.id">
        <view class="item-row">
          <text class="label">座位号：</text>
          <text class="value">{{item.name}}</text>
        </view>
        <view class="item-row">
          <text class="label">MAC：</text>
          <text class="value">{{item.deviceName}}</text>
        </view>
        <view class="item-row">
          <text class="label">型号：</text>
          <text class="value">{{item.model}}</text>
        </view>
        <view class="item-row">
          <text class="label">设备：</text>
          <text 
            class="value" 
            :class="item.status === 'ONLINE' ? 'online' : (item.status === 'OFFLINE' ? 'offline' : 'repair')"
          >
            {{item.status === 'ONLINE' ? '在线' : (item.status === 'OFFLINE' ? '离线' : '维修中')}}
          </text>
        </view>
        <view class="item-row" v-if="item.gateway">
          <text class="label">网关：</text>
          <text class="value">
            {{item.gateway.status === 'ONLINE' ? '在线' : (item.gateway.status === 'OFFLINE' ? '离线' : '维修中')}}
          </text>
        </view>
      </view>
      
      <view class="load-more" v-if="hasMore && !loading">上拉加载更多</view>
      <view class="no-more" v-if="!hasMore && deviceList.length > 0">已加载全部</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      // 搜索配置（对齐接口参数）
      searchTypes: [
        { name: '座位号', key: 'name', placeholder: '请输入座位号' },
        { name: '设备MAC', key: 'deviceName', placeholder: '请输入设备MAC' },
        { name: '设备状态', key: 'status', placeholder: 'ONLINE/OFFLINE/REPAIR' }
      ],
      searchTypeIndex: 0,
      searchValue: '',
      
      // 接口参数（与截图一致）
      offset: 0,
      limit: 10, // 截图中limit为10
      total: 0,
      deviceList: [],
      loading: false,
      hasMore: true,
      
      //初始化为空字符串（不再硬编码）
      baseUrl: '',
      token: ''
    };
  },

  onLoad() {
    //读取本地存储的统一配置
    const savedBaseUrl = uni.getStorageSync('config_baseUrl');
    const savedToken = uni.getStorageSync('config_token');

    if (savedBaseUrl && savedToken) {
      // 配置存在：赋值后加载数据
      this.baseUrl = savedBaseUrl;
      this.token = savedToken;
      setTimeout(() => this.getDeviceList(), 0);
    } else {
      // 配置不存在：提示并跳转到设置页
      uni.showToast({ title: '请先在设置页配置接口信息', icon: 'none' });
      setTimeout(() => {
        uni.navigateTo({ url: '/pages/setting/setting' }); // 确保设置页路径正确
      }, 1500);
    }
  },

  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.offset = this.offset + this.limit;
      this.getDeviceList();
    }
  },

  methods: {
    // ========== 补全缺失的搜索核心方法 ==========
    // 1. 切换下拉搜索类型（比如从“座位号”切到“设备MAC”）
    onSearchTypeChange(e) {
      this.searchTypeIndex = e.detail.value;
      this.searchValue = ''; // 切换类型时清空输入框，避免混淆
    },

    // 2. 输入框输入内容时同步数据
    onSearchInput(e) {
      // trim() 去除首尾空格，避免无效搜索
      this.searchValue = e.detail.value.trim();
    },

    // 3. 点击搜索按钮触发查询
    onSearch() {
      // 重置分页：搜索时从第1页开始加载
      this.offset = 0;
      this.deviceList = []; // 清空原有列表，重新加载搜索结果
      this.hasMore = true;
      // 调用接口获取搜索结果
      this.getDeviceList();
    },

    // ========== 原有接口请求方法（增加配置校验） ==========
    getDeviceList() {
      if (this.loading) return;
      
      // 配置为空时直接返回，防止无效请求
      if (!this.baseUrl || !this.token) {
        uni.showToast({ title: '接口配置未完成', icon: 'none' });
        return;
      }

      this.loading = true;

      // 拼接参数（与截图一致）
      const { searchTypes, searchTypeIndex, searchValue, offset, limit } = this;
      const searchKey = searchTypes[searchTypeIndex].key;
      const params = { offset, limit };
      // 有搜索值时，拼接对应参数（比如座位号→name，设备MAC→deviceName）
      if (searchValue) params[searchKey] = searchValue;

      uni.request({
        url: `${this.baseUrl}/v1/devices`, // 用统一配置的baseUrl
        method: 'GET',
        header: {
          'Authorization': this.token, // 用统一配置的token
          'Content-Type': 'application/json'
        },
        data: params,
        success: (res) => {
          this.loading = false;
          if (res.statusCode === 200 && res.data) {
            const { total, list } = res.data;
            // 过滤无效数据（确保deviceName存在）
            const validList = list.filter(item => item && item.deviceName);
            this.deviceList = this.deviceList.concat(validList);
            this.total = total;
            this.hasMore = this.deviceList.length + validList.length < total;
          }
        },
        fail: (err) => {
          this.loading = false;
          uni.showToast({ title: '请求失败：' + err.errMsg, icon: 'none' });
        }
      });
    }
  }
};
</script>

<style scoped>
/* 全局容器（新增，避免内容溢出） */
.container {
  width: 100%;
  min-height: 100vh;
  background-color: #f9f9f9;
}

/* 搜索栏：确保组件紧凑对齐 */
.search-bar {
  display: flex;
  align-items: center;
  padding: 12rpx 20rpx; /* 减少上下内边距，避免过高 */
  background: #fff;
  border-bottom: 1rpx solid #eee;
}

.picker {
  width: 110rpx; /* 加宽选择器，避免文字换行 */
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border: 1rpx solid #eee;
  border-radius: 6rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.search-input {
  flex: 1;
  height: 72rpx;
  margin: 0 12rpx; /* 减少左右间距，更紧凑 */
  padding: 0 15rpx;
  border: 1rpx solid #eee;
  border-radius: 6rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.search-btn {
  width: 110rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  padding: 0;
  border-radius: 6rpx;
}

/* 设备列表容器 */
.device-list {
  padding: 10rpx;
  background-color: #f9f9f9;
}

/* 列表项卡片 */
.device-item {
  background: #fff;
  padding: 10rpx 15rpx; /* 左右内边距加宽，给内容留空间 */
  margin: 0 5rpx 1rpx; /* 统一左右外边距 */
  border-radius: 8rpx;
  box-shadow: 0 1rpx 3rpx rgba(0,0,0,0.05);
}

/* 列表项行：确保垂直方向完全居中 */
.item-row {
  display: flex;
  align-items: center; /* 垂直居中 */
  height: 60rpx; /* 适当增加行高，避免内容挤压 */
  margin-bottom: 8rpx; /* 减少行间距，更紧凑 */
}

.item-row:last-child {
  margin-bottom: 0;
}

/* 标签样式：统一宽度+右对齐，确保内容起始点一致 */
.label {
  width: 100rpx; /* 固定宽度，足够容纳"网关："等标签 */
  color: #666;
  font-size: 29rpx;
  text-align: left; /* 标签文字靠右对齐，右侧边缘整齐 */
  padding-right: 10rpx; /* 标签与内容之间留固定间距，避免拥挤 */
  white-space: nowrap; /* 强制不换行 */
}

/* 内容样式：确保所有内容（包括绿色"在线"）左对齐且起始点一致 */
.value {
  flex: 1;
  color: #333;
  font-size: 25rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 新增：强制内容从同一水平位置开始 */
  padding-left: 0; /* 去除左内边距，避免偏移 */
}

/* 状态颜色 */
.online { color: #00c800; }
.offline { color: #999; }
.repair { color: #ff9500; }

/* 加载提示 */
.empty, .loading, .load-more, .no-more {
  padding: 30rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #999;
}
</style>