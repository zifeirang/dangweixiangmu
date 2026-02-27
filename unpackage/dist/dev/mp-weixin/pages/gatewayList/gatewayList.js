"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      searchTypes: [
        { name: "网关名称", key: "name", placeholder: "请输入网关名称" },
        { name: "设备MAC", key: "deviceName", placeholder: "请输入设备MAC" },
        { name: "状态", key: "status", placeholder: "ONLINE/OFFLINE/REPAIR" }
      ],
      searchTypeIndex: 0,
      searchValue: "",
      offset: 0,
      limit: 10,
      total: 0,
      gatewayList: [],
      loading: false,
      hasMore: true,
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
      this.getGatewayList();
    } else {
      common_vendor.index.showToast({ title: "请先配置接口信息", icon: "none" });
      setTimeout(() => {
        common_vendor.index.navigateTo({ url: "/pages/setting/setting" });
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
      if (!status)
        return "-";
      switch (status) {
        case "ONLINE":
          return "在线";
        case "OFFLINE":
          return "离线";
        case "REPAIR":
          return "维修中";
        default:
          return "-";
      }
    },
    onSearchTypeChange(e) {
      this.searchTypeIndex = e.detail.value;
      this.searchValue = "";
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
      if (this.loading)
        return;
      this.loading = true;
      const { searchTypes, searchTypeIndex, searchValue, offset, limit, baseUrl, token } = this;
      const params = { offset, limit };
      if (searchValue)
        params[searchTypes[searchTypeIndex].key] = searchValue;
      if (!baseUrl || !token) {
        this.loading = false;
        common_vendor.index.showToast({ title: "接口配置未完成", icon: "none" });
        callback && callback();
        return;
      }
      common_vendor.index.request({
        url: `${baseUrl}/v1/gateways`,
        method: "GET",
        header: {
          "Authorization": token,
          "Content-Type": "application/json"
        },
        data: params,
        success: (res) => {
          this.loading = false;
          if (res.statusCode === 200 && res.data) {
            const list = res.data.list || [];
            const total = res.data.total || 0;
            const validList = list.filter((item) => item && item.id);
            this.gatewayList = this.gatewayList.concat(validList);
            this.total = total;
            this.hasMore = this.gatewayList.length + validList.length < total;
          } else {
            common_vendor.index.showToast({ title: "接口返回异常", icon: "none" });
          }
          callback && callback();
        },
        fail: (err) => {
          this.loading = false;
          common_vendor.index.__f__("error", "at pages/gatewayList/gatewayList.vue:157", "接口请求失败：", err);
          common_vendor.index.showToast({ title: "加载失败", icon: "none" });
          callback && callback();
        }
      });
    },
    handleAddGateway() {
      common_vendor.index.navigateTo({ url: "/pages/gatewayCreate/gatewayCreate" });
    },
    handleGoToConfig(item) {
      common_vendor.index.navigateTo({
        url: `/pages/scan-web/scan-web?deviceName=${encodeURIComponent(item.deviceName || "")}&productKey=${encodeURIComponent(item.productKey || "")}&name=${encodeURIComponent(item.name || "")}`
      });
    },
    handleGoToDetail(item) {
      common_vendor.index.navigateTo({
        url: `/pages/gatewayDetail/gatewayDetail?gatewayId=${item.id}&name=${item.name}&deviceName=${item.deviceName}&productKey=${item.productKey}&status=${item.status}`
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
    i: common_vendor.o((...args) => $options.handleAddGateway && $options.handleAddGateway(...args)),
    j: $data.loading
  }, $data.loading ? {} : {}, {
    k: !$data.loading && $data.gatewayList.length === 0
  }, !$data.loading && $data.gatewayList.length === 0 ? {} : {}, {
    l: common_vendor.f($data.gatewayList, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.name || "-"),
        b: common_vendor.t(item.deviceName || "-"),
        c: common_vendor.t(item.productKey || "-"),
        d: common_vendor.t($options.statusToText(item.status)),
        e: common_vendor.n(item.status === "ONLINE" ? "online" : item.status === "OFFLINE" ? "offline" : "repair"),
        f: common_vendor.o(($event) => $options.handleGoToConfig(item), item.id),
        g: common_vendor.o(($event) => $options.handleGoToDetail(item), item.id),
        h: item.id
      };
    }),
    m: $data.hasMore && !$data.loading
  }, $data.hasMore && !$data.loading ? {} : {}, {
    n: !$data.hasMore && $data.gatewayList.length > 0
  }, !$data.hasMore && $data.gatewayList.length > 0 ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-45953eac"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/gatewayList/gatewayList.js.map
