import {createApp} from 'vue'
import './assets/css/style.scss'
import App from './App.vue'
// import Mobile from './Mobile.vue'
import {createPinia} from "pinia"
// import ElementPlus from 'element-plus'
import ZH from "@/locales/zh-CN.ts";
import {createI18n} from 'vue-i18n'
import router from "@/router.ts";
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { initAudioOnUserInteraction } from '@/utils/audioContext'

const i18n = createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': ZH
  },
})

const pinia = createPinia()
// const app = createApp(Mobile)
const app = createApp(App)

app.use(VueVirtualScroller)
// app.use(ElementPlus)
app.use(pinia)
app.use(i18n)
app.use(router)

// 初始化音频交互检测
initAudioOnUserInteraction()

// 注册Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

app.mount('#app')