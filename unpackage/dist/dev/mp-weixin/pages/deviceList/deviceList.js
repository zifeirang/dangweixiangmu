"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      // 搜索配置（对齐接口参数）
      searchTypes: [
        { name: "座位号", key: "name", placeholder: "请输入座位号" },
        { name: "设备MAC", key: "deviceName", placeholder: "请输入设备MAC" },
        { name: "设备状态", key: "status", placeholder: "ONLINE/OFFLINE/REPAIR" }
      ],
      searchTypeIndex: 0,
      searchValue: "",
      // 接口参数（与截图一致）
      offset: 0,
      limit: 10,
      // 截图中limit为10
      total: 0,
      deviceList: [],
      loading: false,
      hasMore: true,
      //初始化为空字符串（不再硬编码）
      baseUrl: "",
      token: ""
    };
  },
  onLoad() {
    const savedBaseUrl = common_vendor.index.getStorageSync("config_baseUrl");
    const savedToken = common_vendor.index.getStorageSync("config_token");
    if (savedBaseUrl && savedToken) {
      this.baseUrl = savedBaseUrl;
      this.token = savedToken;
      setTimeout(() => this.getDeviceList(), 0);
    } else {
      common_vendor.index.showToast({ title: "请先在设置页配置接口信息", icon: "none" });
      setTimeout(() => {
        common_vendor.index.navigateTo({ url: "/pages/setting/setting" });
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
      this.searchValue = "";
    },
    // 2. 输入框输入内容时同步数据
    onSearchInput(e) {
      this.searchValue = e.detail.value.trim();
    },
    // 3. 点击搜索按钮触发查询
    onSearch() {
      this.offset = 0;
      this.deviceList = [];
      this.hasMore = true;
      this.getDeviceList();
    },
    // ========== 原有接口请求方法（增加配置校验） ==========
    getDeviceList() {
      if (this.loading)
        return;
      if (!this.baseUrl || !this.token) {
        common_vendor.index.showToast({ title: "接口配置未完成", icon: "none" });
        return;
      }
      this.loading = true;
      const { searchTypes, searchTypeIndex, searchValue, offset, limit } = this;
      const searchKey = searchTypes[searchTypeIndex].key;
      const params = { offset, limit };
      if (searchValue)
        params[searchKey] = searchValue;
      common_vendor.index.request({
        url: `${this.baseUrl}/v1/devices`,
        // 用统一配置的baseUrl
        method: "GET",
        header: {
          "Authorization": this.token,
          // 用统一配置的token
          "Content-Type": "application/json"
        },
        data: params,
        success: (res) => {
          this.loading = false;
          if (res.statusCode === 200 && res.data) {
            const { total, list } = res.data;
            const validList = list.filter((item) => item && item.deviceName);
            this.deviceList = this.deviceList.concat(validList);
            this.total = total;
            this.hasMore = this.deviceList.length + validList.length < total;
          }
        },
        fail: (err) => {
          this.loading = false;
          common_vendor.index.showToast({ title: "请求失败：" + err.errMsg, icon: "none" });
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.searchTypes[$data.searchTypeIndex].name),
    b: $data.searchTypes,
    c: common_vendor.o((...args) => $options.onSearchTypeChange && $options.onSearchTypeChange(...args)),
    d: $data.searchTypeIndex,
    e: $data.searchTypes[$data.searchTypeIndex].placeholder,
    f: common_vendor.o([($event) => $data.searchValue = $event.detail.value, (...args) => $options.onSearchInput && $options.onSearchInput(...args)]),
    g: $data.searchValue,
    h: common_vendor.o((...args) => $options.onSearch && $options.onSearch(...args)),
    i: $data.deviceList.length === 0 && !$data.loading
  }, $data.deviceList.length === 0 && !$data.loading ? {} : {}, {
    j: $data.loading
  }, $data.loading ? {} : {}, {
    k: common_vendor.f($data.deviceList, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.name),
        b: common_vendor.t(item.deviceName),
        c: common_vendor.t(item.model),
        d: common_vendor.t(item.status === "ONLINE" ? "在线" : item.status === "OFFLINE" ? "离线" : "维修中"),
        e: common_vendor.n(item.status === "ONLINE" ? "online" : item.status === "OFFLINE" ? "offline" : "repair"),
        f: item.gateway
      }, item.gateway ? {
        g: common_vendor.t(item.gateway.status === "ONLINE" ? "在线" : item.gateway.status === "OFFLINE" ? "离线" : "维修中")
      } : {}, {
        h: item.id
      });
    }),
    l: $data.hasMore && !$data.loading
  }, $data.hasMore && !$data.loading ? {} : {}, {
    m: !$data.hasMore && $data.deviceList.length > 0
  }, !$data.hasMore && $data.deviceList.length > 0 ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-e9352d7d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/deviceList/deviceList.js.map
