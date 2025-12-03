import { createApp } from 'vue'
import '@/assets/style.scss'
import App from './App.vue'

import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
	onNeedRefresh() {
		if (confirm('Nova versão disponível. Recarregar?')) {
			updateSW(true)
		}
	},
	onOfflineReady() {
		console.log('App pronto para funcionar offline!')
	},
})

createApp(App).mount('#app')
