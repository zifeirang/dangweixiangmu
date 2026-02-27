"use strict";
const common_vendor = require("../../common/vendor.js");
const uniIcons = () => "../../node-modules/@dcloudio/uni-ui/lib/uni-icons/uni-icons.js";
const uniLoadMore = () => "../../node-modules/@dcloudio/uni-ui/lib/uni-load-more/uni-load-more.js";
const uniPopup = () => "../../node-modules/@dcloudio/uni-ui/lib/uni-popup/uni-popup.js";
const _sfc_main = {
  components: { uniIcons, uniLoadMore, uniPopup },
  data() {
    return {
      API_BASE_URL: "",
      TOKEN: "",
      tableLoading: false,
      triggerLoading: false,
      refreshing: false,
      searchKeyword: "",
      mcuList: [],
      isMiniProgram: false,
      // 新增分页相关
      pageSize: 100,
      // 初始加载100条
      loadMoreSize: 20,
      // 每次加载更多20条
      hasMore: true,
      // 是否还有更多数据
      loadMoreLoading: false,
      // 加载更多中
      displayList: [],
      // 分页显示的列表
      // 新增筛选相关
      statusFilter: "all",
      // 状态筛选：all/online/offline
      offlineCountFilter: ""
      // 离线次数筛选
    };
  },
  computed: {
    // 第一步：筛选状态+离线次数
    filterByStatusAndCount() {
      return this.mcuList.filter((item) => {
        const currentStatus = (item.current_status || "").toUpperCase();
        const offlineCount = Number(item.total_offline) || 0;
        if (this.statusFilter === "online" && currentStatus !== "ONLINE")
          return false;
        if (this.statusFilter === "offline" && currentStatus !== "OFFLINE")
          return false;
        if (this.offlineCountFilter && !isNaN(Number(this.offlineCountFilter))) {
          if (offlineCount <= Number(this.offlineCountFilter))
            return false;
        }
        return true;
      });
    },
    // 第二步：搜索筛选（基于状态+离线次数筛选后的结果）
    searchFilteredList() {
      const keyword = (this.searchKeyword || "").trim().toLowerCase();
      if (!keyword)
        return this.filterByStatusAndCount;
      return this.filterByStatusAndCount.filter((item) => {
        const seat = (item.device_seat || "").toLowerCase();
        const mac = (item.device_mac || "").toLowerCase();
        const model = (item.mcu_model || "").toLowerCase();
        const version = (item.mcu_version || "").toLowerCase();
        return seat.includes(keyword) || mac.includes(keyword) || model.includes(keyword) || version.includes(keyword);
      });
    },
    // 筛选+搜索后的总条数
    filteredTotalCount() {
      return this.searchFilteredList.length;
    },
    // 在线数量（基于状态筛选后）
    onlineCount() {
      return this.filterByStatusAndCount.filter((item) => (item.current_status || "").toUpperCase() === "ONLINE").length;
    },
    // 离线数量（基于状态筛选后）
    offlineCount() {
      return this.filterByStatusAndCount.length - this.onlineCount;
    }
  },
  onLoad() {
    this.API_BASE_URL = common_vendor.index.getStorageSync("config_mcuBaseUrl") || "";
    this.TOKEN = common_vendor.index.getStorageSync("config_mcuToken") || "";
    if (!this.API_BASE_URL || !this.TOKEN) {
      common_vendor.index.showModal({
        title: "配置缺失",
        content: "请先在设置页填写MCU服务器地址和Token",
        confirmText: "去设置",
        success: (res) => res.confirm && common_vendor.index.navigateTo({ url: "/pages/setting/setting" })
      });
      return;
    }
    this.getMcuStatusList();
  },
  methods: {
    // 新增：点击遮罩层关闭弹窗
    handleMaskClick() {
      if (this.$refs.filterPopup) {
        this.$refs.filterPopup.close();
      }
    },
    // 状态筛选变更
    onStatusChange(e) {
      this.statusFilter = e.detail.value;
    },
    // 离线次数输入处理（仅允许数字）
    handleCountInput(e) {
      this.offlineCountFilter = e.detail.value.replace(/\D/g, "");
    },
    // 打开筛选弹窗
    openFilter() {
      if (this.$refs.filterPopup) {
        this.$refs.filterPopup.open();
      }
    },
    // 关闭筛选弹窗
    closeFilter() {
    },
    // 重置筛选条件
    resetFilter() {
      this.statusFilter = "all";
      this.offlineCountFilter = "";
    },
    // 确认筛选
    confirmFilter() {
      this.$refs.filterPopup.close();
      this.resetPagination();
      this.renderDisplayList();
      common_vendor.index.showToast({ title: "筛选生效", icon: "success" });
    },
    // 重置分页参数
    resetPagination() {
      this.pageSize = 100;
      this.hasMore = true;
      this.loadMoreLoading = false;
    },
    // 渲染分页列表
    renderDisplayList() {
      this.displayList = this.searchFilteredList.slice(0, this.pageSize);
      this.hasMore = this.pageSize < this.filteredTotalCount;
    },
    // 加载更多数据
    loadMoreData() {
      if (!this.hasMore || this.loadMoreLoading)
        return;
      this.loadMoreLoading = true;
      setTimeout(() => {
        try {
          this.pageSize += this.loadMoreSize;
          this.renderDisplayList();
          common_vendor.index.showToast({ title: `加载${this.loadMoreSize}条数据`, icon: "none", duration: 800 });
        } catch (err) {
          common_vendor.index.__f__("error", "at pages/mcu-status-list/mcu-status-list.vue:324", "加载更多失败：", err);
          common_vendor.index.showToast({ title: "加载更多失败", icon: "none" });
        } finally {
          this.loadMoreLoading = false;
        }
      }, 500);
    },
    request(options) {
      common_vendor.index.__f__("log", "at pages/mcu-status-list/mcu-status-list.vue:333", "请求参数：", options);
      return new Promise((resolve, reject) => {
        common_vendor.index.request({
          url: this.API_BASE_URL + options.url,
          method: options.method || "GET",
          header: {
            "Content-Type": "application/json",
            "x-token": this.TOKEN
          },
          success: (res) => {
            common_vendor.index.__f__("log", "at pages/mcu-status-list/mcu-status-list.vue:343", "接口返回：", res);
            if (res.statusCode === 200) {
              resolve(res.data);
            } else {
              common_vendor.index.showToast({ title: `接口错误：${res.statusCode}`, icon: "none" });
              reject(res);
            }
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/mcu-status-list/mcu-status-list.vue:352", "请求失败：", err);
            common_vendor.index.showToast({ title: "请求失败，请检查网络", icon: "none" });
            reject(err);
          }
        });
      });
    },
    async getMcuStatusList(isRefresh = false) {
      if (!isRefresh)
        this.tableLoading = true;
      try {
        const res = await this.request({ url: "/api/device/mcu-status-list" });
        if (res.code === 200) {
          this.mcuList = res.data;
          this.resetPagination();
          this.renderDisplayList();
        } else {
          common_vendor.index.showToast({ title: res.msg || "数据加载失败", icon: "none" });
        }
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/mcu-status-list/mcu-status-list.vue:373", "加载失败：", err);
      } finally {
        this.tableLoading = false;
        if (isRefresh) {
          this.refreshing = false;
          common_vendor.index.stopPullDownRefresh();
        }
      }
    },
    async triggerMcuQuery() {
      this.triggerLoading = true;
      try {
        const res = await this.request({
          url: "/api/device/trigger-mcu-query",
          method: "GET"
        });
        if (res.code === 200) {
          common_vendor.index.showToast({ title: "刷新指令已发送", icon: "success" });
          setTimeout(() => {
            this.getMcuStatusList(true);
          }, 800);
        } else {
          common_vendor.index.showToast({ title: res.msg || "刷新失败", icon: "none" });
        }
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/mcu-status-list/mcu-status-list.vue:399", "刷新失败：", err);
        common_vendor.index.showToast({ title: "刷新请求失败", icon: "none" });
      } finally {
        this.triggerLoading = false;
      }
    },
    handleSearch() {
      this.resetPagination();
      this.renderDisplayList();
    },
    handlePullRefresh() {
      this.refreshing = true;
      this.getMcuStatusList(true);
    }
  }
};
if (!Array) {
  const _component_uni_icons = common_vendor.resolveComponent("uni-icons");
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  const _component_uni_load_more = common_vendor.resolveComponent("uni-load-more");
  (_component_uni_icons + _component_uni_popup + _component_uni_load_more)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.p({
      type: "search",
      size: "16",
      color: "#909399"
    }),
    b: common_vendor.o([($event) => $data.searchKeyword = $event.detail.value, (...args) => $options.handleSearch && $options.handleSearch(...args)]),
    c: $data.searchKeyword,
    d: common_vendor.p({
      type: "filter",
      size: "14",
      color: "#fff"
    }),
    e: common_vendor.o((...args) => $options.openFilter && $options.openFilter(...args)),
    f: common_vendor.p({
      type: "refresh",
      size: "14",
      color: "#fff"
    }),
    g: $data.triggerLoading,
    h: common_vendor.o((...args) => $options.triggerMcuQuery && $options.triggerMcuQuery(...args)),
    i: $data.statusFilter === "all",
    j: $data.statusFilter === "online",
    k: $data.statusFilter === "offline",
    l: common_vendor.o((...args) => $options.onStatusChange && $options.onStatusChange(...args)),
    m: common_vendor.o([($event) => $data.offlineCountFilter = $event.detail.value, (...args) => $options.handleCountInput && $options.handleCountInput(...args)]),
    n: $data.offlineCountFilter,
    o: common_vendor.o((...args) => $options.resetFilter && $options.resetFilter(...args)),
    p: common_vendor.o((...args) => $options.confirmFilter && $options.confirmFilter(...args)),
    q: common_vendor.sr("filterPopup", "03a9c718-3"),
    r: common_vendor.o($options.closeFilter),
    s: common_vendor.o($options.handleMaskClick),
    t: common_vendor.p({
      type: "bottom",
      ["mask-click"]: true
    }),
    v: common_vendor.t($options.filteredTotalCount),
    w: common_vendor.t($options.onlineCount),
    x: common_vendor.t($options.offlineCount),
    y: $data.tableLoading && $data.displayList.length === 0
  }, $data.tableLoading && $data.displayList.length === 0 ? {
    z: common_vendor.p({
      status: "loading",
      color: "#409eff",
      content: "加载中..."
    })
  } : $options.filteredTotalCount === 0 ? {
    B: common_vendor.p({
      type: "empty",
      size: "48",
      color: "#ccc"
    })
  } : common_vendor.e({
    C: common_vendor.f($data.displayList, (item, index, i0) => {
      return {
        a: common_vendor.t(item.device_seat),
        b: common_vendor.t(item.device_mac),
        c: common_vendor.t(item.mcu_model || item.mcu_version || "未知"),
        d: common_vendor.t(item.current_status === "ONLINE" ? "在线" : "离线"),
        e: common_vendor.n(item.current_status === "ONLINE" ? "status-online" : "status-offline"),
        f: common_vendor.t(item.last_status === "ONLINE" ? "在线" : "离线"),
        g: common_vendor.n(item.last_status === "ONLINE" ? "last-online" : "last-offline"),
        h: common_vendor.t(item.total_online || 0),
        i: common_vendor.t(item.total_offline || 0),
        j: item.device_mac || index
      };
    }),
    D: $data.hasMore && !$data.loadMoreLoading
  }, $data.hasMore && !$data.loadMoreLoading ? {
    E: common_vendor.t($data.displayList.length),
    F: common_vendor.t($options.filteredTotalCount)
  } : {}, {
    G: $data.loadMoreLoading
  }, $data.loadMoreLoading ? {
    H: common_vendor.p({
      status: "loading",
      color: "#409eff",
      content: "加载中..."
    })
  } : {}, {
    I: !$data.hasMore && $options.filteredTotalCount > 0
  }, !$data.hasMore && $options.filteredTotalCount > 0 ? {
    J: common_vendor.t($options.filteredTotalCount)
  } : {}, {
    K: common_vendor.o((...args) => $options.handlePullRefresh && $options.handlePullRefresh(...args)),
    L: $data.refreshing,
    M: common_vendor.o((...args) => $options.loadMoreData && $options.loadMoreData(...args))
  }), {
    A: $options.filteredTotalCount === 0
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-03a9c718"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/mcu-status-list/mcu-status-list.js.map
