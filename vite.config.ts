import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
	base: '/gantt-ficator/',
	plugins: [
		vue(),
		VitePWA({
			registerType: 'autoUpdate',

			devOptions: {
				enabled: true,
			},

			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
				maximumFileSizeToCacheInBytes: 3000000,
			},

			includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],

			manifest: {
				name: 'Gantt-ficator',
				short_name: 'GanttFicator',
				description: 'Gerenciador de tarefas e gráfico de Gantt inteligente',
				theme_color: '#ffffff',
				background_color: '#f8fafc',
				display: 'standalone',
				orientation: 'portrait',

				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any',
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any',
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
			},
		}),
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},

	build: {
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules')) {
						if (id.includes('jspdf') || id.includes('html2canvas')) {
							return 'pdf-libs'
						}
						if (id.includes('xlsx')) {
							return 'excel-libs'
						}
						return 'vendor'
					}
				},
			},
		},
	},
})
