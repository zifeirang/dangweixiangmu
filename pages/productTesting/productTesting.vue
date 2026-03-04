<template>
  <view class="container">
    <view class="safe-area">
      <!-- 固定顶部区域（红框内容，滑动不动） -->
      <view class="fixed-header">
        <!-- 顶部标题 -->
        <view class="header-section">
          <text class="page-title">设备列表</text>
          <text class="page-subtitle">Device List</text>
        </view>

        <!-- 搜索卡片 -->
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
          </view>
        </view>

        <!-- 全选栏 -->
        <view class="select-bar">
          <view class="select-left">
            <checkbox 
              @click.stop="handleSelectAll"  
              :checked="isAllSelected"
              value="all"
            />
            <text class="select-text">全选设备</text>
          </view>
          <text class="count-text" v-if="selectedDevices.length>0">已选 {{selectedDevices.length}} 台</text>
        </view>
      </view>

      <!-- 设备列表（核心调整：加大顶部内边距，完全避开固定头部） -->
      <view class="list-wrapper">
        <view class="loading" v-if="loading">加载中...</view>
        <view class="empty" v-if="!loading && deviceList.length === 0">暂无设备数据</view>

        <!-- 设备卡片 -->
        <view 
          class="device-card" 
          v-for="item in deviceList" 
          :key="item.deviceName"
          @click="handleExpandDevice(item.deviceName)"
        >
          <!-- 卡片主体 -->
          <view class="card-main">
            <checkbox 
              class="card-checkbox"
              :data-device="item" 
              @click.stop="handleSelectDevice(item)"  
              :value="item.deviceName"  
              :checked="isSelected(item)" 
            />

            <view class="card-info">
              <view class="info-row">
                <text class="info-label">座位号</text>
                <text class="info-value">{{item.name || '-'}}</text>
              </view>
              <view class="info-row">
                <text class="info-label">MAC 地址</text>
                <text class="info-value mono">{{item.deviceName || '-'}}</text>
              </view>
              <view class="info-row">
                <text class="info-label">设备型号</text>
                <text class="info-value">{{item.productKey || '-'}}</text>
              </view>
              <view class="info-row">
                <text class="info-label">设备状态</text>
                <view class="status-tag" :class="item.status === 'ONLINE' ? 'status-online' : (item.status === 'OFFLINE' ? 'status-offline' : 'status-repair')">
                  {{statusToText(item.status)}}
                </view>
              </view>
              <!-- 显示 MCU 版本（如果有） -->
              <view class="info-row" v-if="item.mcuVersion">
                <text class="info-label">MCU 版本</text>
                <text class="info-value">{{item.mcuVersion}}</text>
              </view>
              <!-- 显示灯状态（如果有） -->
              <view class="info-row" v-if="item.lightStatus !== undefined">
                <text class="info-label">灯状态</text>
                <view class="status-tag" :class="item.lightStatus ? 'status-online' : 'status-offline'">
                  {{item.lightStatus ? '开启' : '关闭'}}
                </view>
              </view>
              <!-- 显示插座状态（如果有） -->
              <view class="info-row" v-if="item.socketStatus !== undefined">
                <text class="info-label">插座状态</text>
                <view class="status-tag" :class="item.socketStatus ? 'status-online' : 'status-offline'">
                  {{item.socketStatus ? '开启' : '关闭'}}
                </view>
              </view>
              <!-- 修改：计量状态显示（适配0=告警、1=正常） -->
              <view class="info-row" v-if="item.measurementStatus !== undefined">
                <text class="info-label">计量状态</text>
                <view class="status-with-action">
                  <view class="status-tag" :class="item.measurementStatus === 1 ? 'status-normal' : 'status-alarm'">
                    {{measurementStatusToText(item.measurementStatus)}}
                  </view>
                  <!-- 新增：解除告警按钮（仅在告警状态时显示） -->
                  <view 
                    class="clear-alarm-btn" 
                    v-if="item.measurementStatus === 0"
                    @click.stop="handleClearAlarm(item)"
                    :loading="btnLoading[`${item.deviceName}_clearAlarm`]"
                  >
                    <text class="clear-alarm-text">解除</text>
                  </view>
                </view>
              </view>
              <!-- 电参数显示区域（仅在有数据时显示） -->
              <view 
                class="device-metrics-row" 
                v-if="item.voltage !== undefined || item.current !== undefined || item.power !== undefined || item.energy !== undefined"
              >
                <view class="metrics-item">
                  <text class="metrics-label">电压：</text>
                  <text class="metrics-value">{{item.voltage !== undefined ? item.voltage + ' V' : '-'}}</text>
                </view>
                <view class="metrics-item">
                  <text class="metrics-label">电流：</text>
                  <text class="metrics-value">{{item.current !== undefined ? item.current + ' A' : '-'}}</text>
                </view>
                <view class="metrics-item">
                  <text class="metrics-label">功率：</text>
                  <text class="metrics-value">{{item.power !== undefined ? item.power + ' W' : '-'}}</text>
                </view>
                <view class="metrics-item">
                  <text class="metrics-label">电量：</text>
                  <text class="metrics-value">{{item.energy !== undefined ? item.energy + ' kWh' : '-'}}</text>
                </view>
              </view>
            </view>

            <view class="expand-icon" :class="expandedDevice === item.deviceName ? 'active' : ''">
              <text class="arrow">{{expandedDevice === item.deviceName ? '↑' : '↓'}}</text>
            </view>
          </view>

          <!-- 展开操作区 -->
          <view class="card-actions" v-if="expandedDevice === item.deviceName">
            <view class="action-grid">
              <view class="action-item light-on" @click.stop="openLight(item)" :loading="btnLoading[`${item.deviceName}_lightOn`]">
                <text class="action-text">开灯</text>
              </view>
              <view class="action-item light-off" @click.stop="closeLight(item)" :loading="btnLoading[`${item.deviceName}_lightOff`]">
                <text class="action-text">关灯</text>
              </view>
              <view class="action-item socket-on" @click.stop="openSocket(item)" :loading="btnLoading[`${item.deviceName}_socketOn`]">
                <text class="action-text">开插座</text>
              </view>
              <view class="action-item socket-off" @click.stop="closeSocket(item)" :loading="btnLoading[`${item.deviceName}_socketOff`]">
                <text class="action-text">关插座</text>
              </view>
              <view class="action-item screen" @click.stop="screenDisplay(item)" :loading="btnLoading[`${item.deviceName}_screen`]">
                <text class="action-text">刷屏</text>
              </view>
              <view class="action-item kick" @click.stop="handleKickOut(item)" :loading="btnLoading[`${item.deviceName}_kickOut`]">
                <text class="action-text">踢出</text>
              </view>
              <!-- 查询 MCU 版本 -->
              <view class="action-item mcu-version" @click.stop="getMcuVersion(item)" :loading="btnLoading[`${item.deviceName}_mcu`]">
                <text class="action-text">MCU版本</text>
              </view>
              <!-- 读取灯状态 -->
              <view class="action-item light-status" @click.stop="getLightStatus(item)" :loading="btnLoading[`${item.deviceName}_lightStatus`]">
                <text class="action-text">灯状态</text>
              </view>
              <!-- 读取插座状态 -->
              <view class="action-item socket-status" @click.stop="getSocketStatus(item)" :loading="btnLoading[`${item.deviceName}_socketStatus`]">
                <text class="action-text">插座状态</text>
              </view>
              <!-- 读取计量状态 -->
              <view class="action-item measurement-status" @click.stop="getMeasurementStatus(item)" :loading="btnLoading[`${item.deviceName}_measurement`]">
                <text class="action-text">计量状态</text>
              </view>
            </view>
          </view>
        </view>

        <view class="load-more" v-if="hasMore && !loading">上拉加载更多</view>
        <view class="no-more" v-if="!hasMore && deviceList.length > 0">已加载全部</view>
      </view>

      <!-- 批量测试按钮 -->
      <view class="batch-btn" v-if="selectedDevices.length > 0" @click="batchExecuteCommands">
        开始批量测试
      </view>

    </view>
  </view>
</template>

<script>
const API_PATHS = {
  DEVICES: '/v1/devices',
  KICK_OUT: '/v1/devices/kick-out',
  LIGHT_ON: '/v1/commands/lights/on',
  LIGHT_OFF: '/v1/commands/lights/off',
  LIGHT_BRIGHTNESS: '/v1/commands/lights/brightness',
  SOCKET_ON: '/v1/commands/sockets/on',
  SOCKET_OFF: '/v1/commands/sockets/off',
  SCREEN_DISPLAY: '/v1/commands/screens/display',
  // 三个查询接口
  MCU_VERSION: '/v1/commands/mcu',
  LIGHT_STATUS: '/v1/commands/lights/status',
  SOCKET_STATUS: '/v1/commands/sockets/status',
  // 计量状态接口
  MEASUREMENT_STATUS: '/v1/commands/measurements/status',
  // 电参数读取接口
  VOLTAGE: '/v1/commands/voltage',
  CURRENT: '/v1/commands/current',
  POWER: '/v1/commands/power',
  ENERGY: '/v1/commands/energy',
  // 解除告警接口
  CLEAR_ALARM: '/v1/commands/power/alarm/clear'
};

export default {
  data() {
    return {
      searchTypes: [
        { name: '座位号', key: 'name', placeholder: '请输入座位号' },
        { name: '设备MAC', key: 'deviceName', placeholder: '请输入设备MAC' },
        { name: '状态', key: 'status', placeholder: '在线/离线/维修中' }
      ],
      searchTypeIndex: 0,
      searchValue: '',
      offset: 0, limit: 10, total: 0,
      deviceList: [], loading: false, hasMore: true,
      selectedDevices: [], isAllSelected: false,
      baseUrl: '', token: '', tenantId: '', 
      expandedDevice: '', btnLoading: {}
    };
  },
  onLoad() {
    const savedBaseUrl = uni.getStorageSync('config_baseUrl');
    const savedToken = uni.getStorageSync('config_token');
    this.tenantId = uni.getStorageSync('config_tenantId') || '';
    if (savedBaseUrl && savedToken) {
      this.baseUrl = savedBaseUrl;
      this.token = savedToken;
      this.getDeviceList();
    } else {
      uni.showToast({ title: '请先配置接口信息', icon: 'none' });
      setTimeout(() => uni.navigateTo({ url: '/pages/setting/setting' }), 1500);
    }
  },
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.offset += this.limit;
      this.getDeviceList();
    }
  },
  methods: {
    clean_date_str(s){return s?s.split(" ")[0]:""},
    isSelected(d){return this.selectedDevices.some(i=>i.deviceName===d.deviceName)},
    statusToText(s){switch(s){case'ONLINE':return'在线';case'OFFLINE':return'离线';case'REPAIR':return'维修中';default:return'-'}},
    // 新增：计量状态文本转换（0=告警、1=正常）
    measurementStatusToText(val){
      const numVal = Number(val);
      if(numVal === 1) return '正常';
      if(numVal === 0) return '告警';
      return '未知';
    },
    onSearchTypeChange(e){this.searchTypeIndex=e.detail.value;this.searchValue=''},
    onSearchInput(e){this.searchValue=e.detail.value.trim()},
    onSearch(){this.offset=0;this.deviceList=[];this.hasMore=true;this.selectedDevices=[];this.isAllSelected=false;this.getDeviceList()},
    getDeviceList(c){
      if(this.loading)return;this.loading=true;
      const p={offset:this.offset,limit:this.limit};
      if(this.searchValue)p[this.searchTypes[this.searchTypeIndex].key]=this.searchValue;
      if(!this.baseUrl||!this.token){this.loading=false;uni.showToast({icon:'none',title:'配置未完成'});c&&c();return}
      uni.request({
        url:this.baseUrl+API_PATHS.DEVICES,header:{Authorization:this.token},data:p,
        success:r=>{
          this.loading=false;
          if(r.statusCode===200&&r.data){
            const l=(r.data.list||[]).filter(i=>i.deviceName);
            // 初始化电参数字段
            this.deviceList=this.deviceList.concat(l.map(item => ({
              ...item,
              voltage: undefined,
              current: undefined,
              power: undefined,
              energy: undefined
            })));
            this.hasMore=this.deviceList.length<(r.data.total||0);
          }else uni.showToast({icon:'none',title:'加载失败'})
          c&&c()
        },
        fail:()=>{this.loading=false;uni.showToast({icon:'none',title:'请求失败'});c&&c()}
      })
    },
    handleSelectDevice(d){
      const exist=this.selectedDevices.some(i=>i.deviceName===d.deviceName);
      this.selectedDevices=exist?this.selectedDevices.filter(i=>i.deviceName!==d.deviceName):[...this.selectedDevices,d];
      this.isAllSelected=this.selectedDevices.length===this.deviceList.length;
    },
    handleSelectAll(){
      this.isAllSelected=!this.isAllSelected;
      this.selectedDevices=this.isAllSelected?this.deviceList.filter(i=>i.deviceName):[];
    },
    handleExpandDevice(n){this.expandedDevice=this.expandedDevice===n?'':n},
    
    // 开灯后自动读取状态
    openLight(d){
      if(d.status!='ONLINE')return uni.showToast({icon:'none',title:'设备离线'});
      const k=`${d.deviceName}_lightOn`;
      this.btnLoading[k]=true;
      uni.request({
        url:this.baseUrl+API_PATHS.LIGHT_ON,method:'POST',header:{Authorization:this.token},
        data:{deviceName:d.deviceName,productKey:d.productKey},
        success:()=>{
          uni.showToast({title:'开灯成功'});
          // 500ms 后自动读取灯状态
          setTimeout(() => {
            this.getLightStatusSilent(d);
          }, 500);
        },
        fail:()=>uni.showToast({icon:'none',title:'开灯失败'}),
        complete:()=>this.btnLoading[k]=false
      })
    },
    
    // 关灯后自动读取状态
    closeLight(d){
      if(d.status!='ONLINE')return uni.showToast({icon:'none',title:'设备离线'});
      const k=`${d.deviceName}_lightOff`;
      this.btnLoading[k]=true;
      uni.request({
        url:this.baseUrl+API_PATHS.LIGHT_OFF,method:'POST',header:{Authorization:this.token},
        data:{deviceName:d.deviceName,productKey:d.productKey},
        success:()=>{
          uni.showToast({title:'关灯成功'});
          // 500ms 后自动读取灯状态
          setTimeout(() => {
            this.getLightStatusSilent(d);
          }, 500);
        },
        fail:()=>uni.showToast({icon:'none',title:'关灯失败'}),
        complete:()=>this.btnLoading[k]=false
      })
    },
    
    // 开插座后自动读取状态
    openSocket(d){
      if(d.status!='ONLINE')return uni.showToast({icon:'none',title:'设备离线'});
      const k=`${d.deviceName}_socketOn`;
      this.btnLoading[k]=true;
      uni.request({
        url:this.baseUrl+API_PATHS.SOCKET_ON,method:'POST',header:{Authorization:this.token},
        data:{deviceName:d.deviceName,productKey:d.productKey},
        success:()=>{
          uni.showToast({title:'开插座成功'});
          // 500ms 后自动读取插座状态
          setTimeout(() => {
            this.getSocketStatusSilent(d);
          }, 500);
        },
        fail:()=>uni.showToast({icon:'none',title:'开插座失败'}),
        complete:()=>this.btnLoading[k]=false
      })
    },
    
    // 关插座后自动读取状态
    closeSocket(d){
      if(d.status!='ONLINE')return uni.showToast({icon:'none',title:'设备离线'});
      const k=`${d.deviceName}_socketOff`;
      this.btnLoading[k]=true;
      uni.request({
        url:this.baseUrl+API_PATHS.SOCKET_OFF,method:'POST',header:{Authorization:this.token},
        data:{deviceName:d.deviceName,productKey:d.productKey},
        success:()=>{
          uni.showToast({title:'关插座成功'});
          // 500ms 后自动读取插座状态
          setTimeout(() => {
            this.getSocketStatusSilent(d);
          }, 500);
        },
        fail:()=>uni.showToast({icon:'none',title:'关插座失败'}),
        complete:()=>this.btnLoading[k]=false
      })
    },

    screenDisplay(d){
      const k=`${d.deviceName}_screen`;
      if(d.status!='ONLINE')return uni.showToast({icon:'none',title:'设备离线'});
      this.btnLoading[k]=true;
      this.sendScreenCommand(d).then(s=>uni.showToast({title:s?'刷屏成功':'失败'})).finally(()=>this.btnLoading[k]=false)
    },
    handleKickOut(d){
      uni.showModal({title:'确认踢出',content:`确定踢出 ${d.name||d.deviceName}？`,
        success:m=>m.confirm&&this.executeKickOut(d)
      })
    },
    executeKickOut(d){
      const k=`${d.deviceName}_kickOut`;
      this.btnLoading[k]=true;
      uni.request({
        url:this.baseUrl+API_PATHS.KICK_OUT,method:'POST',header:{Authorization:this.token},data:{deviceIds:[d.id]},
        success:()=>{this.removeDeviceFromList(d.deviceName);uni.showToast({title:'踢出成功'})},
        complete:()=>this.btnLoading[k]=false
      })
    },
    removeDeviceFromList(n){
      this.deviceList=this.deviceList.filter(i=>i.deviceName!==n);
      this.selectedDevices=this.selectedDevices.filter(i=>i.deviceName!==n);
      this.isAllSelected=this.selectedDevices.length===this.deviceList.length;
    },
    sendDeviceCommand(d,p,k,t){
      if(d.status!='ONLINE')return uni.showToast({icon:'none',title:'设备离线'});
      this.btnLoading[k]=true;
      uni.request({
        url:this.baseUrl+p,method:'POST',header:{Authorization:this.token},
        data:{deviceName:d.deviceName,productKey:d.productKey},
        success:()=>uni.showToast({title:t+'成功'}),
        fail:()=>uni.showToast({icon:'none',title:t+'失败'}),
        complete:()=>this.btnLoading[k]=false
      })
    },
    generateScreenContents(s,m){return [{"type":3,"content":"","width":0,"length":0,"x":72,"y":20,"fontHeight":32,"fontWidth":32,"fontWeight":55,"center":true},{"type":4,"content":s,"width":0,"length":0,"x":10,"y":100,"fontHeight":32,"fontWidth":32,"fontWeight":55,"center":true},{"type":5,"content":" ","width":0,"length":0,"x":100,"y":110,"fontHeight":32,"fontWidth":32,"fontWeight":40,"center":true},{"type":1,"content":"","width":0,"length":0,"x":72,"y":115,"fontHeight":48,"fontWidth":48,"fontWeight":55},{"type":2,"content":" ","width":0,"length":0,"x":72,"y":145,"fontHeight":32,"fontWidth":32,"fontWeight":40,"center":true},{"type":9,"content":" ","width":0,"length":0,"x":0,"y":0,"fontHeight":32,"fontWidth":32,"fontWeight":55},{"type":11,"content":"","width":0,"length":0,"x":50,"y":190,"fontHeight":24,"fontWidth":24,"fontWeight":30,"center":true},{"type":8,"content":"","width":0,"length":0,"x":200,"y":10,"fontHeight":16,"fontWidth":16,"fontWeight":21},{"type":12,"content":m,"width":0,"length":0,"x":20,"y":20,"fontHeight":32,"fontWidth":32,"fontWeight":48},{"type":10,"content":"","width":0,"length":0,"x":135,"y":225,"fontHeight":24,"fontWidth":24,"fontWeight":27},{"type":13,"content":"","width":0,"length":0,"x":135,"y":256,"fontHeight":16,"fontWidth":16,"fontWeight":21},{"type":13,"content":"","width":0,"length":0,"x":135,"y":272,"fontHeight":16,"fontWidth":16,"fontWeight":21},{"type":13,"content":"","width":0,"length":0,"x":135,"y":288,"fontHeight":16,"fontWidth":16,"fontWeight":21},{"type":13,"content":"","width":0,"length":0,"x":135,"y":304,"fontHeight":16,"fontWidth":16,"fontWeight":21}]},
    sendScreenCommand(d){
      return new Promise(r=>{
        uni.request({
          url:this.baseUrl+API_PATHS.SCREEN_DISPLAY,method:'POST',header:{Authorization:this.token},
          data:{deviceName:d.deviceName,productKey:d.productKey,contents:this.generateScreenContents(d.name,d.deviceName)},
          success:()=>r(true),fail:()=>r(false)
        })
      })
    },

    // ================== 批量测试（调整顺序并去除中间提示） ==================
    async batchExecuteCommands(){
      const l=this.selectedDevices;
      if(l.length===0)return uni.showToast({icon:'none',title:'请选择设备'});
      if(!this.baseUrl || !this.token){
        return uni.showToast({ title: '接口配置未完成', icon: 'none', duration: 1000 });
      }

      let totalSuccess = 0;
      const totalDevice = l.length;
      const totalStepsPerDevice = 12; // 12个步骤

      const sendCommand = (device, path, extraData = {}, method = 'POST') => {
        return new Promise((resolve) => {
          const requestConfig = {
            url: `${this.baseUrl}${path}`,
            method: method,
            header: { 'Authorization': this.token, 'Content-Type': 'application/json' },
            success: (res) => resolve(res), 
            fail: () => resolve(null)
          };
          
          // 区分 GET 和 POST 的参数传递
          if (method === 'GET') {
            requestConfig.data = { deviceName: device.deviceName, productKey: device.productKey || '', ...extraData };
          } else {
            requestConfig.data = { deviceName: device.deviceName, productKey: device.productKey || '', ...extraData };
          }
          
          uni.request(requestConfig);
        });
      };

      const executeSingleDevice = async (device) => {
        let deviceSuccess = 0;
        const seatNum = device.name || '未知座位';

        // 1. 读取电压
        uni.showToast({ title: `${seatNum} 读取电压`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const voltageRes = await sendCommand(device, API_PATHS.VOLTAGE, {}, 'GET');
        if(voltageRes && voltageRes.statusCode === 200 && voltageRes.data){
          deviceSuccess++;
          const deviceIndex = this.deviceList.findIndex(d => d.deviceName === device.deviceName);
          if(deviceIndex !== -1){
            this.$set(this.deviceList[deviceIndex], 'voltage', voltageRes.data.data);
          }
        }
        await new Promise(r=>setTimeout(r,2000));

        // 2. 读取电流
        uni.showToast({ title: `${seatNum} 读取电流`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const currentRes = await sendCommand(device, API_PATHS.CURRENT, {}, 'GET');
        if(currentRes && currentRes.statusCode === 200 && currentRes.data){
          deviceSuccess++;
          const deviceIndex = this.deviceList.findIndex(d => d.deviceName === device.deviceName);
          if(deviceIndex !== -1){
            this.$set(this.deviceList[deviceIndex], 'current', currentRes.data.data);
          }
        }
        await new Promise(r=>setTimeout(r,2000));

        // 3. 读取功率
        uni.showToast({ title: `${seatNum} 读取功率`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const powerRes = await sendCommand(device, API_PATHS.POWER, {}, 'GET');
        if(powerRes && powerRes.statusCode === 200 && powerRes.data){
          deviceSuccess++;
          const deviceIndex = this.deviceList.findIndex(d => d.deviceName === device.deviceName);
          if(deviceIndex !== -1){
            this.$set(this.deviceList[deviceIndex], 'power', powerRes.data.data);
          }
        }
        await new Promise(r=>setTimeout(r,2000));

        // 4. 读取电量
        uni.showToast({ title: `${seatNum} 读取电量`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const energyRes = await sendCommand(device, API_PATHS.ENERGY, {}, 'GET');
        if(energyRes && energyRes.statusCode === 200 && energyRes.data){
          deviceSuccess++;
          const deviceIndex = this.deviceList.findIndex(d => d.deviceName === device.deviceName);
          if(deviceIndex !== -1){
            this.$set(this.deviceList[deviceIndex], 'energy', energyRes.data.data);
          }
        }
        await new Promise(r=>setTimeout(r,2000));

        // 5. 开灯
        uni.showToast({ title: `${seatNum} 执行开灯`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const lightOn = await sendCommand(device, API_PATHS.LIGHT_ON);
        if(lightOn && lightOn.statusCode === 200){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,2000));

        // 6. 设置亮度50%
        uni.showToast({ title: `${seatNum} 设置亮度50%`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const brightness50 = await sendCommand(device, API_PATHS.LIGHT_BRIGHTNESS,{brightness:50});
        if(brightness50 && brightness50.statusCode === 200){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,2000));

        // 7. 设置亮度25%（新增）
        uni.showToast({ title: `${seatNum} 设置亮度25%`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const brightness25 = await sendCommand(device, API_PATHS.LIGHT_BRIGHTNESS,{brightness:25});
        if(brightness25 && brightness25.statusCode === 200){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,2000));

        // 8. 关灯
        uni.showToast({ title: `${seatNum} 执行关灯`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const lightOff = await sendCommand(device, API_PATHS.LIGHT_OFF);
        if(lightOff && lightOff.statusCode === 200){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,2000));

        // 9. 开插座
        uni.showToast({ title: `${seatNum} 开插座`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const socketOn = await sendCommand(device, API_PATHS.SOCKET_ON);
        if(socketOn && socketOn.statusCode === 200){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,2000));

        // 10. 关插座
        uni.showToast({ title: `${seatNum} 关插座`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const socketOff = await sendCommand(device, API_PATHS.SOCKET_OFF);
        if(socketOff && socketOff.statusCode === 200){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,2000));

        // 11. 刷屏
        uni.showToast({ title: `${seatNum} 刷屏`, icon: 'none', duration: 1000 });
        await new Promise(r=>setTimeout(r,1000));
        const screen = await this.sendScreenCommand(device);
        if(screen){deviceSuccess++;}
        await new Promise(r=>setTimeout(r,3000));

        return deviceSuccess;
      };

      for(let i=0;i<l.length;i++){
        const device = l[i];
        const seatNum = device.name || '未知座位';
        uni.showToast({title:`处理 ${seatNum}`,icon:'none'});
        await new Promise(r=>setTimeout(r,1000));
        const ok = await executeSingleDevice(device);
        totalSuccess += ok;
        uni.showToast({title:`${seatNum} 完成`,icon:'none'});
        if(i<l.length-1)await new Promise(r=>setTimeout(r,3000));
      }

      uni.showToast({
        title: `测试完成`,
        icon: totalSuccess === totalDevice * totalStepsPerDevice ? 'success' : 'none',
        duration: 3000
      });
    },

    // 查询 MCU 版本
    getMcuVersion(device) {
      const btnKey = `${device.deviceName}_mcu`;
      if (device.status !== 'ONLINE') {
        return uni.showToast({ icon: 'none', title: '设备离线' });
      }
      this.btnLoading[btnKey] = true;
      
      uni.request({
        url: `${this.baseUrl}${API_PATHS.MCU_VERSION}`,
        method: 'GET',
        header: { 'Authorization': this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ''
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            // 更新设备列表中的 MCU 版本
            const deviceIndex = this.deviceList.findIndex(d => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], 'mcuVersion', res.data.data || '未知');
            }
            uni.showToast({ title: 'MCU版本获取成功', icon: 'success' });
          } else {
            uni.showToast({ icon: 'none', title: '获取失败' });
          }
        },
        fail: () => {
          uni.showToast({ icon: 'none', title: '网络请求失败' });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },

    // 读取灯状态（有 Toast）
    getLightStatus(device) {
      const btnKey = `${device.deviceName}_lightStatus`;
      if (device.status !== 'ONLINE') {
        return uni.showToast({ icon: 'none', title: '设备离线' });
      }
      this.btnLoading[btnKey] = true;
      
      uni.request({
        url: `${this.baseUrl}${API_PATHS.LIGHT_STATUS}`,
        method: 'GET',
        header: { 'Authorization': this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ''
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            // 更新设备列表中的灯状态
            const deviceIndex = this.deviceList.findIndex(d => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], 'lightStatus', res.data.data);
            }
            uni.showToast({ title: `灯状态：${res.data.data ? '开启' : '关闭'}`, icon: 'success' });
          } else {
            uni.showToast({ icon: 'none', title: '获取失败' });
          }
        },
        fail: () => {
          uni.showToast({ icon: 'none', title: '网络请求失败' });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },

    // 读取灯状态（静默，无 Toast）
    getLightStatusSilent(device) {
      if (device.status !== 'ONLINE') return;
      
      uni.request({
        url: `${this.baseUrl}${API_PATHS.LIGHT_STATUS}`,
        method: 'GET',
        header: { 'Authorization': this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ''
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            // 更新设备列表中的灯状态
            const deviceIndex = this.deviceList.findIndex(d => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], 'lightStatus', res.data.data);
            }
          }
        }
      });
    },

    // 读取插座状态（有 Toast）
    getSocketStatus(device) {
      const btnKey = `${device.deviceName}_socketStatus`;
      if (device.status !== 'ONLINE') {
        return uni.showToast({ icon: 'none', title: '设备离线' });
      }
      this.btnLoading[btnKey] = true;
      
      uni.request({
        url: `${this.baseUrl}${API_PATHS.SOCKET_STATUS}`,
        method: 'GET',
        header: { 'Authorization': this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ''
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            // 更新设备列表中的插座状态
            const deviceIndex = this.deviceList.findIndex(d => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], 'socketStatus', res.data.data);
            }
            uni.showToast({ title: `插座状态：${res.data.data ? '开启' : '关闭'}`, icon: 'success' });
          } else {
            uni.showToast({ icon: 'none', title: '获取失败' });
          }
        },
        fail: () => {
          uni.showToast({ icon: 'none', title: '网络请求失败' });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },

    // 读取插座状态（静默，无 Toast）
    getSocketStatusSilent(device) {
      if (device.status !== 'ONLINE') return;
      
      uni.request({
        url: `${this.baseUrl}${API_PATHS.SOCKET_STATUS}`,
        method: 'GET',
        header: { 'Authorization': this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ''
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            // 更新设备列表中的插座状态
            const deviceIndex = this.deviceList.findIndex(d => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], 'socketStatus', res.data.data);
            }
          }
        }
      });
    },

    // 修改：读取计量状态（适配0=告警、1=正常）
    getMeasurementStatus(device) {
      const btnKey = `${device.deviceName}_measurement`;
      if (device.status !== 'ONLINE') {
        return uni.showToast({ icon: 'none', title: '设备离线' });
      }
      this.btnLoading[btnKey] = true;
      
      uni.request({
        url: `${this.baseUrl}${API_PATHS.MEASUREMENT_STATUS}`,
        method: 'GET',
        header: { 'Authorization': this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ''
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            // 转成数字，兼容字符串类型的返回值
            const statusVal = Number(res.data.data);
            // 更新设备列表中的计量状态
            const deviceIndex = this.deviceList.findIndex(d => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], 'measurementStatus', statusVal);
            }
            // 适配提示文案
            const statusText = this.measurementStatusToText(statusVal);
            uni.showToast({ 
              title: `计量状态：${statusText}`, 
              icon: statusVal === 1 ? 'success' : 'none' 
            });
          } else {
            uni.showToast({ icon: 'none', title: '获取失败' });
          }
        },
        fail: () => {
          uni.showToast({ icon: 'none', title: '网络请求失败' });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },

    // 新增：解除告警
    handleClearAlarm(device) {
      const btnKey = `${device.deviceName}_clearAlarm`;
      if (device.status !== 'ONLINE') {
        return uni.showToast({ icon: 'none', title: '设备离线' });
      }
      this.btnLoading[btnKey] = true;
      
      uni.request({
        url: `${this.baseUrl}${API_PATHS.CLEAR_ALARM}`,
        method: 'POST',
        header: { 'Authorization': this.token, 'Content-Type': 'application/json' },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ''
        },
        success: (res) => {
          if (res.statusCode === 200) {
            uni.showToast({ title: '解除告警成功', icon: 'success' });
            // 500ms 后自动读取计量状态
            setTimeout(() => {
              this.getMeasurementStatusSilent(device);
            }, 500);
          } else {
            uni.showToast({ icon: 'none', title: '解除告警失败' });
          }
        },
        fail: () => {
          uni.showToast({ icon: 'none', title: '网络请求失败' });
        },
        complete: () => {
          this.btnLoading[btnKey] = false;
        }
      });
    },

    // 读取计量状态（静默，无 Toast）
    getMeasurementStatusSilent(device) {
      if (device.status !== 'ONLINE') return;
      
      uni.request({
        url: `${this.baseUrl}${API_PATHS.MEASUREMENT_STATUS}`,
        method: 'GET',
        header: { 'Authorization': this.token },
        data: {
          deviceName: device.deviceName,
          productKey: device.productKey || ''
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            // 转成数字，兼容字符串类型的返回值
            const statusVal = Number(res.data.data);
            // 更新设备列表中的计量状态
            const deviceIndex = this.deviceList.findIndex(d => d.deviceName === device.deviceName);
            if (deviceIndex !== -1) {
              this.$set(this.deviceList[deviceIndex], 'measurementStatus', statusVal);
            }
          }
        }
      });
    }
  }
};
</script>

<style scoped>
/* 全局容器 */
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
  padding: 0 40rpx 120rpx;
  box-sizing: border-box;
}

/* 核心：固定顶部区域 */
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

/* 标题（适配固定布局） */
.header-section {
  margin-bottom: 20rpx;
}
.page-title {
  display: block;
  font-size: 48rpx;
  font-weight: 300;
  color: #1D1D1F;
  margin-bottom: 6rpx;
}
.page-subtitle {
  display: block;
  font-size: 24rpx;
  color: #86868B;
  letter-spacing: 2rpx;
}

/* 搜索卡片 */
.search-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.03);
}
.search-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.search-picker {
  display: flex;
  align-items: center;
  background: #F7F8FA;
  height: 72rpx;
  padding: 0 20rpx;
  border-radius: 12rpx;
}
.picker-text {
  font-size: 26rpx;
  color: #1D1D1F;
}
.picker-arrow {
  font-size: 28rpx;
  color: #C7C7CC;
  font-weight: 300;
  margin-left: 8rpx;
}
.search-input {
  flex: 1;
  height: 72rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #1D1D1F;
}
.input-placeholder {
  color: #C7C7CC;
}
.search-btn {
  height: 72rpx;
  padding: 0 24rpx;
  background: #F0F7FF;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
}
.search-btn-text {
  font-size: 26rpx;
  color: #007AFF;
  font-weight: 500;
}

/* 全选栏 */
.select-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10rpx;
}
.select-left {
  display: flex;
  align-items: center;
}
.select-text {
  font-size: 28rpx;
  color: #1D1D1F;
  margin-left: 12rpx;
}
.count-text {
  font-size: 26rpx;
  color: #007AFF;
  font-weight: 500;
}

/* 列表区域（核心修改：加大顶部内边距，完全避开固定头部） */
.list-wrapper {
  width: 100%;
  padding-top: 380rpx;
}

/* 设备卡片 */
.device-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.03);
  overflow: hidden;
  transition: all 0.2s ease;
}
.device-card:active {
  transform: scale(0.995);
  background-color: #FBFBFB;
}

.card-main {
  display: flex;
  align-items: flex-start;
}
.card-checkbox {
  margin-right: 20rpx;
  transform: scale(1.1);
  flex-shrink: 0;
  margin-top: 4rpx;
}
.card-info {
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
.mono {
  font-family: monospace;
  font-size: 26rpx;
}

/* 状态标签 */
.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
  font-weight: 500;
}
.status-online { background-color: #E8F5E9; color: #388E3C; }
.status-offline { background-color: #F5F5F7; color: #86868B; }
.status-repair { background-color: #FFF3E0; color: #F57C00; }
/* 新增：计量状态标签样式 */
.status-normal { background-color: #E8F5E9; color: #388E3C; }
.status-alarm { background-color: #FFEAEA; color: #FF3B30; }

/* 状态和操作按钮容器 */
.status-with-action {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

/* 解除告警按钮 */
.clear-alarm-btn {
  padding: 6rpx 16rpx;
  background-color: #F0F7FF;
  border-radius: 20rpx;
}
.clear-alarm-text {
  font-size: 22rpx;
  font-weight: 500;
  color: #007AFF;
}

/* 展开箭头 */
.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  margin-top: 4rpx;
}
.arrow {
  font-size: 28rpx;
  color: #C7C7CC;
  transition: transform 0.2s;
}
.expand-icon.active .arrow {
  transform: rotate(180deg);
}

/* 展开操作区 */
.card-actions {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #F5F5F7;
}
.action-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.action-item {
  flex: 1;
  min-width: 140rpx;
  height: 72rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-text {
  font-size: 26rpx;
  font-weight: 500;
}

/* 操作按钮配色 */
.light-on { background-color: #E8F5E9; }
.light-on .action-text { color: #388E3C; }
.light-off { background-color: #F5F5F7; }
.light-off .action-text { color: #86868B; }
.socket-on { background-color: #F0F7FF; }
.socket-on .action-text { color: #007AFF; }
.socket-off { background-color: #FFEAEA; }
.socket-off .action-text { color: #FF3B30; }
.screen { background-color: #F3E5F5; }
.screen .action-text { color: #9C27B0; }
.kick { background-color: #FFF3E0; }
.kick .action-text { color: #FF6700; }
/* 三个查询按钮配色 */
.mcu-version { background-color: #E3F2FD; }
.mcu-version .action-text { color: #1976D2; }
.light-status { background-color: #FFF8E1; }
.light-status .action-text { color: #FF8F00; }
.socket-status { background-color: #E8F5E9; }
.socket-status .action-text { color: #2E7D32; }
/* 计量状态按钮配色 */
.measurement-status { background-color: #F3E5F5; }
.measurement-status .action-text { color: #7B1FA2; }

/* 电参数显示行 */
.device-metrics-row {
  display: flex;
  flex-wrap: wrap;
  padding-top: 16rpx;
  margin-top: 16rpx;
  border-top: 1rpx solid #F5F5F7;
}
.metrics-item {
  width: 50%;
  display: flex;
  align-items: center;
  padding: 8rpx 0;
}
.metrics-label {
  font-size: 24rpx;
  color: #86868B;
  margin-right: 8rpx;
}
.metrics-value {
  font-size: 24rpx;
  color: #1D1D1F;
  font-weight: 500;
}

/* 加载/空状态 */
.loading, .empty, .load-more, .no-more {
  text-align: center;
  padding: 60rpx 0;
  font-size: 26rpx;
  color: #86868B;
}

/* 批量按钮 */
.batch-btn {
  position: fixed;
  bottom: 40rpx;
  left: 40rpx;
  right: 40rpx;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  background: #007AFF;
  color: #fff;
  border-radius: 24rpx;
  font-size: 32rpx;
  font-weight: 500;
  box-shadow: 0 8rpx 24rpx rgba(0,122,255,0.25);
  z-index: 999;
}
</style>