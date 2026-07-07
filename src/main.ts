import { createApp } from 'vue'
import MainView from './MainView.vue'
import { i18n } from './i18n'

createApp(MainView).use(i18n).mount('#app')
