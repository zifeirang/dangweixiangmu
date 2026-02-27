import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp({
    onShow: function () {},
    onLaunch: function () {}
  })
  return {
    app
  }
}