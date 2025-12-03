import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
	plugins: [
		vue(),
		VitePWA({
			registerType: 'autoUpdate',

			// 1. Permite testar o PWA em modo de desenvolvimento (pnpm dev)
			devOptions: {
				enabled: true,
			},

			// 2. Aumenta o limite de cache (bibliotecas como jsPDF podem ser grandes)
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
				maximumFileSizeToCacheInBytes: 3000000, // Aumenta para 3MB
			},

			includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],

			manifest: {
				name: 'Gantt-ficator',
				short_name: 'GanttFicator',
				description: 'Gerenciador de tarefas e gráfico de Gantt inteligente',
				theme_color: '#ffffff',
				background_color: '#f8fafc',
				display: 'standalone',
				orientation: 'portrait', // Opcional: força modo retrato no mobile

				// 3. Ícones separados explicitamente para evitar erros de validação
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any', // Importante: 'any' explícito
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any', // Importante: 'any' explícito
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable', // Ícone adaptável para Android
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
	// Opcional: Otimização do Build para separar as libs pesadas
	build: {
		chunkSizeWarningLimit: 1000, // Aumenta o aviso de tamanho de chunk
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
