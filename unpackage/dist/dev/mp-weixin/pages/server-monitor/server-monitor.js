"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
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
        const systemInfo = common_vendor.index.getSystemInfoSync();
        const px2rpx = 750 / systemInfo.screenWidth;
        const windowHeightRpx = systemInfo.windowHeight * px2rpx;
        this.dockerListHeight = Math.max(300, windowHeightRpx - 800);
      } catch (e) {
        this.dockerListHeight = 400;
      }
    },
    formatTime() {
      const now = /* @__PURE__ */ new Date();
      return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    },
    startTimer() {
      if (!this.timer) {
        this.timer = setInterval(() => this.getAllMonitorData(), 5e3);
      }
    },
    stopTimer() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    toggleImageExpand(index) {
      if (!this.dockerData.containers[index])
        return;
      this.dockerData.containers[index].isImageExpanded = !this.dockerData.containers[index].isImageExpanded;
    },
    togglePortExpand(index) {
      if (!this.dockerData.containers[index])
        return;
      this.dockerData.containers[index].isPortExpanded = !this.dockerData.containers[index].isPortExpanded;
    },
    toggleDocker() {
      this.isDockerExpand = !this.isDockerExpand;
    },
    getAllMonitorData() {
      if (this.isRequesting)
        return;
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
        apiList.map((item) => {
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
        common_vendor.index.showToast({ title: `刷新失败：${err.message}`, icon: "none", duration: 2e3 });
      }).finally(() => {
        this.loading = false;
        this.loadingModule = "";
        this.isRequesting = false;
      });
    },
    requestApi(url) {
      return new Promise((resolve, reject) => {
        common_vendor.index.request({
          url,
          method: "GET",
          timeout: 6e3,
          header: { "Content-Type": "application/json" },
          success: (res) => {
            var _a, _b;
            if (res.statusCode === 200 && ((_a = res.data) == null ? void 0 : _a.code) === 200) {
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
              reject(new Error(((_b = res.data) == null ? void 0 : _b.msg) || "接口返回异常"));
            }
          },
          fail: (err) => {
            let errMsg = "网络异常";
            if (err.errMsg.includes("timeout"))
              errMsg = "请求超时";
            else if (err.errMsg.includes("fail"))
              errMsg = "接口不可达";
            reject(new Error(errMsg));
          }
        });
      });
    }
  }
};
if (!Array) {
  const _component_uni_load_more = common_vendor.resolveComponent("uni-load-more");
  _component_uni_load_more();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.updateTime),
    b: $data.loading && $data.loadingModule === "base"
  }, $data.loading && $data.loadingModule === "base" ? {
    c: common_vendor.p({
      type: "spin",
      color: "#007aff"
    })
  } : {}, {
    d: common_vendor.t($data.baseData.hostname || "未知"),
    e: common_vendor.t($data.baseData.ip || "未知"),
    f: common_vendor.t($data.baseData.os_version || "未知"),
    g: common_vendor.t($data.baseData.uptime || "未知"),
    h: common_vendor.t($data.baseData.kernel_version || "未知"),
    i: common_vendor.t($data.baseData.login_user_count || 0),
    j: common_vendor.t($data.baseData.online_users && $data.baseData.online_users.join(", ") || "无"),
    k: $data.loading && $data.loadingModule === "resource"
  }, $data.loading && $data.loadingModule === "resource" ? {
    l: common_vendor.p({
      type: "spin",
      color: "#007aff"
    })
  } : {}, {
    m: common_vendor.t($data.cpuData.usage || 0),
    n: `${$data.cpuData.usage || 0}%`,
    o: common_vendor.t($data.cpuData.physical_cores || 0),
    p: common_vendor.t($data.cpuData.logical_cores || 0),
    q: common_vendor.t($data.memoryData.usage || 0),
    r: `${$data.memoryData.usage || 0}%`,
    s: common_vendor.t($data.memoryData.swap_usage || 0),
    t: `${$data.memoryData.swap_usage || 0}%`,
    v: common_vendor.t($data.dockerData.total_containers || 0),
    w: $data.loading && $data.loadingModule === "docker"
  }, $data.loading && $data.loadingModule === "docker" ? {
    x: common_vendor.p({
      type: "spin",
      color: "#007aff"
    })
  } : {}, {
    y: common_vendor.t($data.isDockerExpand ? "▼" : "▶"),
    z: common_vendor.o((...args) => $options.toggleDocker && $options.toggleDocker(...args)),
    A: $data.isDockerExpand
  }, $data.isDockerExpand ? {
    B: common_vendor.t($data.dockerData.running_containers || 0),
    C: common_vendor.t($data.dockerData.stopped_containers || 0),
    D: common_vendor.t($data.dockerData.docker_version || "未知")
  } : {}, {
    E: $data.isDockerExpand && $data.dockerData.containers && $data.dockerData.containers.length
  }, $data.isDockerExpand && $data.dockerData.containers && $data.dockerData.containers.length ? {
    F: common_vendor.f($data.dockerData.containers, (item, index, i0) => {
      var _a, _b;
      return common_vendor.e({
        a: common_vendor.t(item.id || "未知ID"),
        b: common_vendor.t(item.name || "未知名称"),
        c: item.status === "running"
      }, item.status === "running" ? {} : {}, {
        d: common_vendor.t($data.dockerData.containers[index].isImageExpanded ? item.image || "" : (item.image || "").slice(0, 15) + ((item.image || "").length > 15 ? "..." : "")),
        e: (item.image || "").length > 15
      }, (item.image || "").length > 15 ? {
        f: common_vendor.t($data.dockerData.containers[index].isImageExpanded ? "收起" : "更多")
      } : {}, {
        g: common_vendor.o(() => $options.toggleImageExpand(index), index || item.id),
        h: common_vendor.t(item.run_duration || "未知"),
        i: common_vendor.t($data.dockerData.containers[index].isPortExpanded ? ((_a = item.ports) == null ? void 0 : _a.join(" | ")) || "无" : (((_b = item.ports) == null ? void 0 : _b[0]) || "无") + (item.ports && item.ports.length > 1 ? "..." : "")),
        j: item.ports && item.ports.length > 1
      }, item.ports && item.ports.length > 1 ? {
        k: common_vendor.t($data.dockerData.containers[index].isPortExpanded ? "收起" : "更多")
      } : {}, {
        l: common_vendor.o(() => $options.togglePortExpand(index), index || item.id),
        m: index || item.id
      });
    }),
    G: `${$data.dockerListHeight}rpx`
  } : {}, {
    H: $data.isDockerExpand && (!$data.dockerData.containers || $data.dockerData.containers.length === 0)
  }, $data.isDockerExpand && (!$data.dockerData.containers || $data.dockerData.containers.length === 0) ? {} : {}, {
    I: common_vendor.t($data.loading ? "刷新中..." : "刷新数据"),
    J: common_vendor.o((...args) => $options.getAllMonitorData && $options.getAllMonitorData(...args)),
    K: $data.loading
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-08839abb"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/server-monitor/server-monitor.js.map
