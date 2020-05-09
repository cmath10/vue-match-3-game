import Vue from 'vue'
import MainView from './MainView.vue'

Vue.config.productionTip = false

// noinspection JSUnusedGlobalSymbols
new Vue({
  render: h => h(MainView)
}).$mount('#app')
