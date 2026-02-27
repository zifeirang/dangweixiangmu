<template>
  <view class="mcu-status-container">
    <!-- 搜索+筛选+刷新按钮（优化样式，新增筛选按钮） -->
    <view class="simple-search-bar">
      <view class="search-input-wrapper">
        <uni-icons type="search" size="16" color="#909399" class="search-icon"></uni-icons>
        <input 
          v-model="searchKeyword" 
          placeholder="座位号/MAC地址/MCU型号查询" 
          class="search-input"
          @input="handleSearch"
        ></input>
      </view>
      <button class="simple-filter-btn" @click="openFilter">
        <uni-icons type="filter" size="14" color="#fff" class="btn-icon"></uni-icons>
        筛选
      </button>
      <button 
        class="simple-trigger-btn" 
        :loading="triggerLoading"
        @click="triggerMcuQuery"
      >
        <uni-icons type="refresh" size="14" color="#fff" class="btn-icon"></uni-icons>
        刷新状态
      </button>
    </view>

    <!-- 筛选弹窗（优化单选框样式+点击遮罩关闭） -->
    <uni-popup 
      ref="filterPopup" 
      type="bottom" 
      :mask-click="true" 
      @close="closeFilter"
      @maskClick="handleMaskClick"
    >
      <view class="filter-popup">
        <view class="filter-title">筛选条件</view>
        <!-- 状态筛选（优化单选框布局和样式） -->
        <view class="filter-item">
          <text class="filter-label">设备状态：</text>
          <view class="status-filter-wrapper">
            <radio-group class="radio-group" @change="onStatusChange">
              <label class="radio-label custom-radio-label">
                <view class="radio-box">
                  <radio 
                    value="all" 
                    :checked="statusFilter === 'all'"
                    class="custom-radio"
                  ></radio>
                  <text class="radio-text">全部</text>
                </view>
              </label>
              <label class="radio-label custom-radio-label">
                <view class="radio-box">
                  <radio 
                    value="online" 
                    :checked="statusFilter === 'online'"
                    class="custom-radio"
                  ></radio>
                  <text class="radio-text online-text">在线</text>
                </view>
              </label>
              <label class="radio-label custom-radio-label">
                <view class="radio-box">
                  <radio 
                    value="offline" 
                    :checked="statusFilter === 'offline'"
                    class="custom-radio"
                  ></radio>
                  <text class="radio-text offline-text">离线</text>
                </view>
              </label>
            </radio-group>
          </view>
        </view>
        <!-- 离线次数筛选 -->
        <view class="filter-item">
          <text class="filter-label">离线次数大于：</text>
          <input 
            v-model="offlineCountFilter" 
            type="number" 
            placeholder="如：10（留空不筛选）"
            class="count-input"
            @input="handleCountInput"
          ></input>
        </view>
        <view class="filter-btns">
          <button class="filter-reset" @click="resetFilter">重置</button>
          <button class="filter-confirm" @click="confirmFilter">确认筛选</button>
        </view>
      </view>
    </uni-popup>

    <!-- 统计栏（调整统计逻辑，基于筛选后的数据） -->
    <view class="simple-stats">
      <view class="stats-item">
        <text class="stats-label">总设备</text>
        <text class="stats-value">{{ filteredTotalCount }}</text>
      </view>
      <view class="stats-item">
        <text class="stats-label">在线</text>
        <text class="stats-value online">{{ onlineCount }}</text>
      </view>
      <view class="stats-item">
        <text class="stats-label">离线</text>
        <text class="stats-value offline">{{ offlineCount }}</text>
      </view>
    </view>

    <!-- 加载/空数据提示 -->
    <view v-if="tableLoading && displayList.length === 0" class="simple-loading">
      <uni-load-more status="loading" color="#409eff" content="加载中..."></uni-load-more>
    </view>
    <view v-else-if="filteredTotalCount === 0" class="simple-empty">
      <uni-icons type="empty" size="48" color="#ccc"></uni-icons>
      <text class="empty-text">暂无设备数据</text>
    </view>

    <!-- 核心列表（增加分页加载，保留原有样式） -->
    <scroll-view 
      v-else 
      class="simple-list" 
      scroll-y
      refresher-enabled="true"
      @refresherrefresh="handlePullRefresh"
      refresher-background="#f8f9fa"
      :refresher-triggered="refreshing"
      @scrolltolower="loadMoreData"
      lower-threshold="100"
      scroll-with-animation="true"
    >
      <view 
        class="list-item" 
        v-for="(item, index) in displayList" 
        :key="item.device_mac || index"
        hover-class="item-hover"
      >
        <view class="item-seat">
          <text class="seat-text">{{ item.device_seat }}</text>
        </view>
        <view class="item-mac">
          <text class="mac-text">{{ item.device_mac }}</text>
          <text class="mcu-model-text">{{ item.mcu_model || item.mcu_version || '未知' }}</text>
        </view>
        <view class="item-status">
          <text 
            class="status-tag" 
            :class="item.current_status === 'ONLINE' ? 'status-online' : 'status-offline'"
          >
            {{ item.current_status === 'ONLINE' ? '在线' : '离线' }}
          </text>
        </view>
        <view class="item-last-status">
          <text class="last-label">上次：</text>
          <text class="last-value" :class="item.last_status === 'ONLINE' ? 'last-online' : 'last-offline'">
            {{ item.last_status === 'ONLINE' ? '在线' : '离线' }}
          </text>
          <text class="count-label"> | 累计在线：</text>
          <text class="count-value online">{{ item.total_online || 0 }}</text>
          <text class="count-label"> | 累计离线：</text>
          <text class="count-value offline">{{ item.total_offline || 0 }}</text>
        </view>
      </view>

      <!-- 加载更多提示（新增） -->
      <view v-if="hasMore && !loadMoreLoading" class="load-more-tip">
        <text>上拉加载更多（当前{{ displayList.length }}/{{ filteredTotalCount }}条）</text>
      </view>
      <view v-if="loadMoreLoading" class="load-more-loading">
        <uni-load-more status="loading" color="#409eff" content="加载中..."></uni-load-more>
      </view>
      <view v-if="!hasMore && filteredTotalCount > 0" class="load-more-end">
        <text>已加载全部{{ filteredTotalCount }}条数据</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import uniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'
import uniLoadMore from '@dcloudio/uni-ui/lib/uni-load-more/uni-load-more.vue'
import uniPopup from '@dcloudio/uni-ui/lib/uni-popup/uni-popup.vue'

export default {
  components: { uniIcons, uniLoadMore, uniPopup },
  data() {
    return {
      API_BASE_URL: '', 
      TOKEN: '',
      tableLoading: false,
      triggerLoading: false,
      refreshing: false,
      searchKeyword: '',
      mcuList: [],
      isMiniProgram: false,
      // 新增分页相关
      pageSize: 100,       // 初始加载100条
      loadMoreSize: 20,    // 每次加载更多20条
      hasMore: true,       // 是否还有更多数据
      loadMoreLoading: false, // 加载更多中
      displayList: [],     // 分页显示的列表
      // 新增筛选相关
      statusFilter: 'all', // 状态筛选：all/online/offline
      offlineCountFilter: '' // 离线次数筛选
    }
  },
  computed: {
    // 第一步：筛选状态+离线次数
    filterByStatusAndCount() {
      return this.mcuList.filter(item => {
        const currentStatus = (item.current_status || '').toUpperCase()
        const offlineCount = Number(item.total_offline) || 0

        // 状态筛选
        if (this.statusFilter === 'online' && currentStatus !== 'ONLINE') return false
        if (this.statusFilter === 'offline' && currentStatus !== 'OFFLINE') return false
        
        // 离线次数筛选
        if (this.offlineCountFilter && !isNaN(Number(this.offlineCountFilter))) {
          if (offlineCount <= Number(this.offlineCountFilter)) return false
        }
        return true
      })
    },
    // 第二步：搜索筛选（基于状态+离线次数筛选后的结果）
    searchFilteredList() {
      const keyword = (this.searchKeyword || '').trim().toLowerCase()
      if (!keyword) return this.filterByStatusAndCount
      
      return this.filterByStatusAndCount.filter(item => {
        const seat = (item.device_seat || '').toLowerCase()
        const mac = (item.device_mac || '').toLowerCase()
        const model = (item.mcu_model || '').toLowerCase()
        const version = (item.mcu_version || '').toLowerCase()
        return seat.includes(keyword) || mac.includes(keyword) || model.includes(keyword) || version.includes(keyword)
      })
    },
    // 筛选+搜索后的总条数
    filteredTotalCount() {
      return this.searchFilteredList.length
    },
    // 在线数量（基于状态筛选后）
    onlineCount() {
      return this.filterByStatusAndCount.filter(item => (item.current_status || '').toUpperCase() === 'ONLINE').length
    },
    // 离线数量（基于状态筛选后）
    offlineCount() {
      return this.filterByStatusAndCount.length - this.onlineCount
    }
  },
  onLoad() {
    this.API_BASE_URL = uni.getStorageSync('config_mcuBaseUrl') || '';
    this.TOKEN = uni.getStorageSync('config_mcuToken') || '';

    if (!this.API_BASE_URL || !this.TOKEN) {
      uni.showModal({
        title: '配置缺失',
        content: '请先在设置页填写MCU服务器地址和Token',
        confirmText: '去设置',
        success: (res) => res.confirm && uni.navigateTo({ url: '/pages/setting/setting' })
      })
      return;
    }

    this.getMcuStatusList()
  },
  methods: {
    // 新增：点击遮罩层关闭弹窗
    handleMaskClick() {
      if (this.$refs.filterPopup) {
        this.$refs.filterPopup.close()
      }
    },
    // 状态筛选变更
    onStatusChange(e) {
      this.statusFilter = e.detail.value
    },
    // 离线次数输入处理（仅允许数字）
    handleCountInput(e) {
      this.offlineCountFilter = e.detail.value.replace(/\D/g, '')
    },
    // 打开筛选弹窗
    openFilter() {
      if (this.$refs.filterPopup) {
        this.$refs.filterPopup.open()
      }
    },
    // 关闭筛选弹窗
    closeFilter() {},
    // 重置筛选条件
    resetFilter() {
      this.statusFilter = 'all'
      this.offlineCountFilter = ''
    },
    // 确认筛选
    confirmFilter() {
      this.$refs.filterPopup.close()
      this.resetPagination() // 重置分页
      this.renderDisplayList() // 重新渲染列表
      uni.showToast({ title: '筛选生效', icon: 'success' })
    },
    // 重置分页参数
    resetPagination() {
      this.pageSize = 100
      this.hasMore = true
      this.loadMoreLoading = false
    },
    // 渲染分页列表
    renderDisplayList() {
      this.displayList = this.searchFilteredList.slice(0, this.pageSize)
      this.hasMore = this.pageSize < this.filteredTotalCount
    },
    // 加载更多数据
    loadMoreData() {
      if (!this.hasMore || this.loadMoreLoading) return
      this.loadMoreLoading = true
      
      setTimeout(() => {
        try {
          this.pageSize += this.loadMoreSize
          this.renderDisplayList()
          uni.showToast({ title: `加载${this.loadMoreSize}条数据`, icon: 'none', duration: 800 })
        } catch (err) {
          console.error('加载更多失败：', err)
          uni.showToast({ title: '加载更多失败', icon: 'none' })
        } finally {
          this.loadMoreLoading = false
        }
      }, 500)
    },

    request(options) {
      console.log('请求参数：', options)
      return new Promise((resolve, reject) => {
        uni.request({
          url: this.API_BASE_URL + options.url,
          method: options.method || 'GET',
          header: { 
            'Content-Type': 'application/json',
            'x-token': this.TOKEN
          },
          success: (res) => {
            console.log('接口返回：', res)
            if (res.statusCode === 200) {
              resolve(res.data)
            } else {
              uni.showToast({ title: `接口错误：${res.statusCode}`, icon: 'none' })
              reject(res)
            }
          },
          fail: (err) => {
            console.error('请求失败：', err)
            uni.showToast({ title: '请求失败，请检查网络', icon: 'none' })
            reject(err)
          }
        })
      })
    },

    async getMcuStatusList(isRefresh = false) {
      if (!isRefresh) this.tableLoading = true
      
      try {
        const res = await this.request({ url: '/api/device/mcu-status-list' })
        if (res.code === 200) {
          this.mcuList = res.data
          this.resetPagination() // 重置分页
          this.renderDisplayList() // 渲染分页列表
        } else {
          uni.showToast({ title: res.msg || '数据加载失败', icon: 'none' })
        }
      } catch (err) {
        console.error('加载失败：', err)
      } finally {
        this.tableLoading = false
        if (isRefresh) {
          this.refreshing = false
          uni.stopPullDownRefresh()
        }
      }
    },

    async triggerMcuQuery() {
      this.triggerLoading = true
      try {
        const res = await this.request({ 
          url: '/api/device/trigger-mcu-query',
          method: 'GET'
        })
        if (res.code === 200) {
          uni.showToast({ title: '刷新指令已发送', icon: 'success' })
          setTimeout(() => {
            this.getMcuStatusList(true)
          }, 800)
        } else {
          uni.showToast({ title: res.msg || '刷新失败', icon: 'none' })
        }
      } catch (err) {
        console.error('刷新失败：', err)
        uni.showToast({ title: '刷新请求失败', icon: 'none' })
      } finally {
        this.triggerLoading = false
      }
    },

    handleSearch() {
      this.resetPagination()
      this.renderDisplayList()
    },

    handlePullRefresh() {
      this.refreshing = true
      this.getMcuStatusList(true)
    }
  }
}
</script>

<style scoped>
/* 移除导航栏后，容器无需顶部 padding */
.mcu-status-container {
  width: 100%;
  min-height: 100vh;
  background-color: #f8f9fa;
  padding-top: 0;
  box-sizing: border-box;
}

/* 搜索栏（优化样式，新增筛选按钮样式） */
.simple-search-bar {
  display: flex;
  padding: 12px 16px;
  background-color: #ffffff;
  gap: 8px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  align-items: center;
}
.search-input-wrapper {
  flex: 1;
  position: relative;
  height: 40px;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}
.search-input {
  width: 100%;
  height: 100%;
  padding: 0 14px 0 38px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  background-color: #ffffff;
  box-sizing: border-box;
  transition: all 0.2s ease;
}
.search-input:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}
.simple-filter-btn, .simple-trigger-btn {
  height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
  transition: all 0.2s ease;
}
.simple-filter-btn {
  background: #909399;
  color: #ffffff;
}
.simple-trigger-btn {
  background: linear-gradient(to right, #409eff, #5cadff);
  color: #ffffff;
}
.simple-filter-btn:active, .simple-trigger-btn:active {
  transform: scale(0.98);
  opacity: 0.9;
}
.btn-icon {
  transition: all 0.3s ease;
}
.simple-trigger-btn[loading] .btn-icon {
  animation: rotate 1s linear infinite;
}
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 筛选弹窗样式（优化视觉+单选框样式） */
.filter-popup {
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 24px 16px;
  box-sizing: border-box;
  animation: slideUp 0.3s ease-out;
}
/* 遮罩层样式强化 */
.uni-popup__mask {
  background-color: rgba(0, 0, 0, 0.5) !important;
}
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.filter-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 24px;
  text-align: center;
  position: relative;
}
.filter-title::after {
  content: '';
  display: block;
  width: 40px;
  height: 3px;
  background: #409eff;
  border-radius: 3px;
  margin: 8px auto 0;
}
.filter-item {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 8px;
}
.filter-label {
  font-size: 15px;
  color: #333;
  width: 80px;
  font-weight: 500;
}
/* 新增：状态筛选包裹层，优化布局 */
.status-filter-wrapper {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  gap: 24px;
}
.radio-group {
  display: flex;
  gap: 20px;
  align-items: center;
}
/* 优化单选框标签样式 */
.custom-radio-label {
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
}
.radio-box {
  display: flex;
  align-items: center;
  gap: 6px;
}
/* 放大单选框，优化选中色 */
.custom-radio {
  transform: scale(1.2);
  margin: 0;
  padding: 0;
}
.custom-radio[checked] {
  color: #409eff;
}
/* 单选框文字配色优化 */
.radio-text {
  font-size: 15px;
  color: #333;
  font-weight: 400;
}
.online-text {
  color: #67c23a;
}
.offline-text {
  color: #f56c6c;
}
/* 单选框点击反馈 */
.custom-radio-label:active .radio-box {
  background-color: #f0f9ff;
  padding: 4px 8px;
  border-radius: 6px;
}

.count-input {
  flex: 1;
  height: 40px;
  padding: 0 14px;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  font-size: 14px;
  background: #f8f9fa;
  transition: all 0.2s ease;
}
.count-input:focus {
  border-color: #409eff;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}
.filter-btns {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
.filter-reset, .filter-confirm {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 22px;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.filter-reset {
  background: #f5f7fa;
  color: #666;
}
.filter-confirm {
  background: #409eff;
  color: #fff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}
.filter-reset:active, .filter-confirm:active {
  transform: scale(0.98);
}
.filter-confirm:active {
  background: #337ecc;
}

/* 统计栏（保留原有样式） */
.simple-stats {
  display: flex;
  justify-content: space-around;
  padding: 12px 0;
  margin: 0 16px 8px;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}
.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stats-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}
.stats-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}
.stats-value.online {
  color: #67c23a;
}
.stats-value.offline {
  color: #f56c6c;
}

/* 加载/空数据（保留原有样式） */
.simple-loading, .simple-empty {
  padding: 40px 0;
  text-align: center;
}
.simple-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-text {
  font-size: 14px;
  color: #999;
  margin-top: 12px;
}

/* 列表容器（调整高度计算，适配加载更多） */
.simple-list {
  height: calc(100vh - 120px);
  padding: 0 16px;
  box-sizing: border-box;
}

/* 列表项（完全保留原有样式） */
.list-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 14px 16px;
  margin-bottom: 8px;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  box-sizing: border-box;
}
.item-hover {
  background-color: #f5f7fa;
  border-color: #dee2e6;
}
.item-seat {
  width: 50px;
}
.seat-text {
  font-size: 15px;
  font-weight: 600;
  color: #409eff;
}
.item-mac {
  flex: 1;
  margin: 0 12px 0 30px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mac-text {
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mcu-model-text {
  font-size: 11px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-status {
  min-width: 70px;
  margin-left: 15px;
}
.status-tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  display: inline-block;
  text-align: center;
}
.status-online {
  background-color: #f0f9ff;
  color: #67c23a;
  border: 1px solid #e1f5e1;
}
.status-offline {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fee2e2;
}
.item-last-status {
  width: 100%;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f5f7fa;
  font-size: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.last-label {
  color: #999;
}
.last-value {
  color: #666;
}
.last-online {
  color: #67c23a;
}
.last-offline {
  color: #f56c6c;
}
.count-label {
  color: #999;
  margin-left: 4px;
}
.count-value {
  font-weight: 500;
}
.count-value.online {
  color: #67c23a;
}
.count-value.offline {
  color: #f56c6c;
}

/* 加载更多提示样式（新增） */
.load-more-tip, .load-more-end {
  padding: 12px 0;
  text-align: center;
  font-size: 12px;
  color: #999;
}
.load-more-loading {
  padding: 8px 0;
  text-align: center;
}

/* 小屏适配（保留原有样式，新增筛选按钮适配） */
@media (max-width: 375px) {
  .simple-search-bar {
    flex-direction: column;
  }
  .search-input-wrapper {
    width: 100%;
  }
  .simple-filter-btn, .simple-trigger-btn {
    width: 48%;
  }
  .simple-list {
    height: calc(100vh - 140px);
  }
  .item-last-status {
    gap: 2px;
    padding-left: 16px;
  }
  .count-label {
    margin-left: 2px;
  }
  .item-mac {
    margin: 0 8px 0 20px;
  }
  /* 小屏适配单选框间距 */
  .status-filter-wrapper {
    gap: 16px;
  }
}
</style>