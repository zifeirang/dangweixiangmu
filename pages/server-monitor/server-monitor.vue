<template>
  <view class="monitor-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <text class="nav-title">服务器监控面板</text>
    </view>

    <!-- 主内容区 -->
    <view class="content">
      <view class="card-container">
        <!-- 基础信息卡片 -->
        <view class="card base-card">
          <view class="card-header">
            <text class="card-title">基础信息</text>
            <text class="update-time">更新于：{{ updateTime }}</text>
            <uni-load-more 
              v-if="loading && loadingModule === 'base'" 
              type="spin" 
              color="#007aff" 
              style="width: 40rpx; height: 40rpx;"
            ></uni-load-more>
          </view>
          <view class="card-body">
            <view class="info-item">
              <text class="info-label">主机名：</text>
              <text class="info-value">{{ baseData.hostname || "未知" }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">IP地址：</text>
              <text class="info-value">{{ baseData.ip || "未知" }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">系统版本：</text>
              <text class="info-value">{{ baseData.os_version || "未知" }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">运行时长：</text>
              <text class="info-value">{{ baseData.uptime || "未知" }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">内核版本：</text>
              <text class="info-value">{{ baseData.kernel_version || "未知" }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">登录用户数：</text>
              <text class="info-value">{{ baseData.login_user_count || 0 }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">在线用户：</text>
              <text class="info-value">{{ (baseData.online_users && baseData.online_users.join(", ")) || "无" }}</text>
            </view>
          </view>
        </view>

        <!-- CPU&内存资源卡片 -->
        <view class="card resource-card">
          <view class="card-header">
            <text class="card-title">核心资源</text>
            <uni-load-more 
              v-if="loading && loadingModule === 'resource'" 
              type="spin" 
              color="#007aff" 
              style="width: 40rpx; height: 40rpx;"
            ></uni-load-more>
          </view>
          <view class="card-body">
            <!-- CPU使用率 -->
            <view class="resource-item">
              <view class="resource-head">
                <text class="info-label">CPU使用率：</text>
                <text class="info-value">{{ cpuData.usage || 0 }}%</text>
              </view>
              <view class="progress-bar">
                <view class="progress-fill cpu-fill" :style="{ width: `${cpuData.usage || 0}%` }"></view>
              </view>
              <view class="resource-sub">
                <text class="sub-text">物理核心：{{ cpuData.physical_cores || 0 }} | 逻辑核心：{{ cpuData.logical_cores || 0 }}</text>
              </view>
            </view>

            <!-- 内存使用率 -->
            <view class="resource-item">
              <view class="resource-head">
                <text class="info-label">内存使用率：</text>
                <text class="info-value">{{ memoryData.usage || 0 }}%</text>
              </view>
              <view class="progress-bar">
                <view class="progress-fill memory-fill" :style="{ width: `${memoryData.usage || 0}%` }"></view>
              </view>
            </view>

            <!-- 交换分区使用率 -->
            <view class="resource-item">
              <view class="resource-head">
                <text class="info-label">交换分区使用率：</text>
                <text class="info-value">{{ memoryData.swap_usage || 0 }}%</text>
              </view>
              <view class="progress-bar">
                <view class="progress-fill swap-fill" :style="{ width: `${memoryData.swap_usage || 0}%` }"></view>
              </view>
            </view>
          </view>
        </view>

        <!-- Docker容器卡片 -->
        <view class="card docker-card">
          <view class="card-header" @click="toggleDocker">
            <text class="card-title">Docker容器（<text class="count-text">{{ dockerData.total_containers || 0 }}</text>个）</text>
            <uni-load-more 
              v-if="loading && loadingModule === 'docker'" 
              type="spin" 
              color="#007aff" 
              style="width: 40rpx; height: 40rpx; margin-right: 10rpx;"
            ></uni-load-more>
            <text class="expand-icon">{{ isDockerExpand ? "▼" : "▶" }}</text>
          </view>
          
          <!-- Docker统计 -->
          <view class="docker-stats" v-if="isDockerExpand">
            <view class="stats-row">
              <text class="stats-label">运行中：</text>
              <text class="stats-value running">{{ dockerData.running_containers || 0 }}</text>
              <text class="stats-label">已停止：</text>
              <text class="stats-value stopped">{{ dockerData.stopped_containers || 0 }}</text>
              <text class="stats-label docker-ver">Docker版本：</text>
              <text class="stats-value ver-text">{{ dockerData.docker_version || "未知" }}</text>
            </view>
          </view>

          <!-- Docker容器列表 -->
          <scroll-view 
            v-if="isDockerExpand && dockerData.containers && dockerData.containers.length" 
            class="docker-list" 
            scroll-y
            :style="{ height: `${dockerListHeight}rpx` }"
          >
            <view class="container-item" v-for="(item, index) in dockerData.containers" :key="index || item.id">
              <view class="container-header">
                <text class="container-id">{{ item.id || "未知ID" }}</text>
                <view class="name-status-wrapper">
                  <text class="container-name">{{ item.name || "未知名称" }}</text>
                  <text class="container-status running" v-if="item.status === 'running'">运行中</text>
                  <text class="container-status stopped" v-else>已停止</text>
                </view>
              </view>
              <view class="container-detail">
                <view class="detail-line" @click="() => toggleImageExpand(index)">
                  <text class="detail-label">镜像：</text>
                  <view class="content-wrapper">
                    <text class="detail-content">
                      {{ dockerData.containers[index].isImageExpanded ? (item.image || "") : ((item.image || "").slice(0, 15) + ((item.image || "").length > 15 ? "..." : "")) }}
                    </text>
                  </view>
                  <text class="toggle-btn" v-if="(item.image || '').length > 15">
                    {{ dockerData.containers[index].isImageExpanded ? "收起" : "更多" }}
                  </text>
                </view>
                <view class="detail-line run-time-line">
                  <text class="detail-label">运行时长：</text>
                  <text class="detail-content run-time-content">{{ item.run_duration || "未知" }}</text>
                </view>
                <view class="detail-line" @click="() => togglePortExpand(index)">
                  <text class="detail-label">端口：</text>
                  <view class="content-wrapper">
                    <text class="detail-content">
                      {{ dockerData.containers[index].isPortExpanded ? (item.ports?.join(" | ") || "无") : ((item.ports?.[0] || "无") + (item.ports && item.ports.length > 1 ? "..." : "")) }}
                    </text>
                  </view>
                  <text class="toggle-btn" v-if="item.ports && item.ports.length > 1">
                    {{ dockerData.containers[index].isPortExpanded ? "收起" : "更多" }}
                  </text>
                </view>
              </view>
            </view>
          </scroll-view>
          
          <view v-if="isDockerExpand && (!dockerData.containers || dockerData.containers.length === 0)" class="empty-docker">
            <text class="empty-text">暂无容器数据</text>
          </view>
        </view>
      </view>

      <!-- 刷新按钮 -->
      <button class="refresh-btn" @click="getAllMonitorData" :loading="loading">
        {{ loading ? "刷新中..." : "刷新数据" }}
      </button>
    </view>
  </view>
</template>

<script>
export default {
  name: "ServerMonitor",
  data() {
    return {
      loading: false,
      loadingModule: "",
      updateTime: "",
      baseData: {},    
      cpuData: {},     
      memoryData: {},  
      dockerData: { 
        total_containers: 0,
        running_containers: 0,
        stopped_containers: 0,
        docker_version: "",
        containers: []
      },  
      isDockerExpand: true,
      dockerListHeight: 400,
      timer: null,
      isRequesting: false
    };
  },
  onLoad() {
    this.getAllMonitorData();
    this.startTimer();
    this.adjustDockerHeight();
  },
  onUnload() {
    this.stopTimer();
  },
  onShow() {
    this.startTimer();
    this.adjustDockerHeight();
  },
  onHide() {
    this.stopTimer();
  },
  onResize() {
    this.adjustDockerHeight();
  },
  methods: {
    adjustDockerHeight() {
      try {
        const systemInfo = uni.getSystemInfoSync();
        const px2rpx = 750 / systemInfo.screenWidth;
        const windowHeightRpx = systemInfo.windowHeight * px2rpx;
        this.dockerListHeight = Math.max(300, windowHeightRpx - 800);
      } catch (e) {
        this.dockerListHeight = 400;
      }
    },
    formatTime() {
      const now = new Date();
      return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    },
    startTimer() {
      if (!this.timer) {
        this.timer = setInterval(() => this.getAllMonitorData(), 5000);
      }
    },
    stopTimer() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    toggleImageExpand(index) {
      if (!this.dockerData.containers[index]) return;
      this.dockerData.containers[index].isImageExpanded = !this.dockerData.containers[index].isImageExpanded;
    },
    togglePortExpand(index) {
      if (!this.dockerData.containers[index]) return;
      this.dockerData.containers[index].isPortExpanded = !this.dockerData.containers[index].isPortExpanded;
    },
    toggleDocker() {
      this.isDockerExpand = !this.isDockerExpand;
    },
    getAllMonitorData() {
      if (this.isRequesting) return;
      this.isRequesting = true;
      this.loading = true;

      const baseUrl = "http://43.142.27.79:8000/api/host";
      const apiList = [
        { url: `${baseUrl}/base`, key: "baseData", module: "base" },
        { url: `${baseUrl}/cpu`, key: "cpuData", module: "resource" },
        { url: `${baseUrl}/memory`, key: "memoryData", module: "resource" },
        { url: `${baseUrl}/docker`, key: "dockerData", module: "docker" }
      ];

      Promise.allSettled(
        apiList.map(item => {
          this.loadingModule = item.module;
          return this.requestApi(item.url);
        })
      ).then((results) => {
        results.forEach((result, index) => {
          const { key } = apiList[index];
          if (result.status === "fulfilled" && result.value) {
            this[key] = result.value;
          }
        });
        this.updateTime = this.formatTime();
      }).catch((err) => {
        uni.showToast({ title: `刷新失败：${err.message}`, icon: "none", duration: 2000 });
      }).finally(() => {
        this.loading = false;
        this.loadingModule = "";
        this.isRequesting = false;
      });
    },
    requestApi(url) {
      return new Promise((resolve, reject) => {
        uni.request({
          url,
          method: "GET",
          timeout: 6000,
          header: { "Content-Type": "application/json" },
          success: (res) => {
            if (res.statusCode === 200 && res.data?.code === 200) {
              let data = res.data.data;
              if (url.includes("memory")) {
                data = {
                  ...data,
                  usage: data.mem_usage ? Number(data.mem_usage).toFixed(1) : 0,
                  swap_usage: data.swap_usage ? Number(data.swap_usage).toFixed(1) : 0
                };
              }
              resolve(data);
            } else {
              reject(new Error(res.data?.msg || "接口返回异常"));
            }
          },
          fail: (err) => {
            let errMsg = "网络异常";
            if (err.errMsg.includes("timeout")) errMsg = "请求超时";
            else if (err.errMsg.includes("fail")) errMsg = "接口不可达";
            reject(new Error(errMsg));
          }
        });
      });
    }
  }
};
</script>

<style scoped>
.monitor-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f7fa 0%, #e4e8f0 100%);
  padding-bottom: 40rpx;
  box-sizing: border-box;
}
.nav-bar {
  background: #007aff;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 99;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}
.nav-title {
  color: #fff;
  font-size: 36rpx;
  font-weight: 600;
}
.content {
  padding: 30rpx 24rpx;
  box-sizing: border-box;
  width: 100%;
}
.card-container {
  display: flex;
  flex-direction: column;
  margin-bottom: 40rpx;
  width: 100%;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 24rpx;
  width: 100%;
}
.card:last-child {
  margin-bottom: 0;
}
.card-header {
  padding: 24rpx 24rpx 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
}
.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.docker-card .card-title {
  font-size: 34rpx;
  font-weight: 700;
}
.docker-card .count-text {
  color: #007aff;
}
.update-time {
  font-size: 22rpx;
  color: #999;
}
.expand-icon {
  font-size: 24rpx;
  color: #666;
  margin-left: 10rpx;
}
.card-body {
  padding: 24rpx;
}
.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1px solid #f8f8f8;
}
.info-item:last-child {
  border-bottom: none;
}
.info-label {
  font-size: 28rpx;
  color: #666;
}
.info-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}
.resource-item {
  margin-bottom: 24rpx;
}
.resource-item:last-child {
  margin-bottom: 0;
}
.resource-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.resource-sub {
  margin-top: 8rpx;
}
.sub-text {
  font-size: 22rpx;
  color: #999;
  white-space: normal;
  line-height: 1.4;
}
.progress-bar {
  height: 12rpx;
  width: 100%;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.3s ease;
}
.cpu-fill {
  background: linear-gradient(90deg, #007aff 0%, #58b8ff 100%);
}
.memory-fill {
  background: linear-gradient(90deg, #4cd964 0%, #9be15d 100%);
}
.swap-fill {
  background: linear-gradient(90deg, #ff9500 0%, #ffc044 100%);
}
.docker-stats {
  padding: 20rpx 24rpx;
  border-bottom: 1px solid #f5f5f5;
}
.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx 30rpx;
  align-items: center;
}
.stats-label {
  font-size: 26rpx;
  color: #666;
}
.docker-ver {
  font-size: 24rpx;
  color: #999;
}
.ver-text {
  font-size: 24rpx;
  color: #666;
}
.stats-value {
  font-size: 26rpx;
  font-weight: 600;
}
.stats-value.running {
  color: #4cd964;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  background: #e5f8e8;
}
.stats-value.stopped {
  color: #ff3b30;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  background: #ffebe8;
}
.docker-list {
  padding: 16rpx 24rpx;
  width: 100%;
  box-sizing: border-box;
}
.container-item {
  padding: 20rpx 0;
  border-bottom: 1px solid #f0f0f0;
  width: 100%;
  box-sizing: border-box;
}
.container-item:last-child {
  border-bottom: none;
}
.container-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 8rpx;
  gap: 6rpx;
}
.container-id {
  font-size: 22rpx;
  color: #999;
  width: 100%;
}
.name-status-wrapper {
  display: flex;
  align-items: center;
  gap: 8rpx;
  width: 100%;
  box-sizing: border-box;
}
.container-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  max-width: calc(100% - 120rpx);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.container-status {
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  border-radius: 16rpx;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  width: 100rpx;
  text-align: center;
}
.container-status.running {
  background: #e5f8e8;
  color: #4cd964;
  border: 1px solid #d0f5d6;
}
.container-status.stopped {
  background: #ffebe8;
  color: #ff3b30;
  border: 1px solid #ffd8d0;
}
.container-detail {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-left: 4rpx;
  width: 100%;
  box-sizing: border-box;
}
.detail-line {
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: #666;
  line-height: 1.8;
  width: 100%;
  box-sizing: border-box;
  gap: 8rpx;
}
.run-time-line {
  padding: 4rpx 0;
}
.run-time-content {
  font-size: 22rpx;
  color: #666;
  white-space: nowrap;
  margin-left: 35rpx;
}
.detail-label {
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  flex-shrink: 0;
  width: 60rpx;
}
.content-wrapper {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.detail-content {
  font-size: 22rpx;
  color: #666;
}
.detail-content.expanded {
  white-space: normal;
  word-break: break-all;
}
.toggle-btn {
  font-size: 20rpx;
  color: #007aff;
  padding: 0 4rpx;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  width: 60rpx;
  text-align: center;
}
.empty-docker {
  padding: 24rpx;
  text-align: center;
}
.refresh-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(90deg, #007aff 0%, #2d94ff 100%);
  color: #fff;
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: 500;
  box-shadow: 0 6rpx 20rpx rgba(0, 122, 255, 0.3);
}
</style>