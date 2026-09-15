import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'element-plus/es/components/message/style/css'
import App from './App.vue'
import router from './router'
import './assets/styles/theme.scss'

const app = createApp(App)

// 正文 v-html 图片懒加载：v-lazy-imgs 指令，mounted/updated 时把容器内 img 设为 lazy
app.directive('lazy-imgs', {
  mounted(el: HTMLElement) {
    el.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy')
    })
  },
  updated(el: HTMLElement) {
    el.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy')
    })
  },
})

app.use(createPinia())
app.use(router)
app.mount('#app')
