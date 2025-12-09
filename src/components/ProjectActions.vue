<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { useDataPersistence } from '@/composables/useDataPersistence'

const { computedTasks, config, importTasks, automaticRisks } = useGantt()
const { exportToExcel, exportToPDF, importFromExcel, downloadImportTemplate } = useDataPersistence()
const fileInput = ref<HTMLInputElement | null>(null)

const deferredPrompt = ref<any>(null)
const showInstallButton = ref(false)

onMounted(() => {
	window.addEventListener('beforeinstallprompt', e => {
		e.preventDefault()
		deferredPrompt.value = e
		showInstallButton.value = true
	})
})

const installPWA = async () => {
	if (!deferredPrompt.value) return
	deferredPrompt.value.prompt()
	const { outcome } = await deferredPrompt.value.userChoice
	console.log(`User response: ${outcome}`)
	deferredPrompt.value = null
	showInstallButton.value = false
}

const handleExportExcel = () => exportToExcel(computedTasks.value)
const handleExportPDF = () => exportToPDF(computedTasks.value, config.value, automaticRisks.value)

const triggerFileInput = () => fileInput.value?.click()

const handleFileChange = async (event: Event) => {
	const target = event.target as HTMLInputElement
	if (target.files && target.files[0]) {
		try {
			const tasks = await importFromExcel(target.files[0])
			if (confirm(`Encontradas ${tasks.length} tarefas. Deseja substituir o projeto atual?`)) {
				importTasks(tasks)
			}
		} catch (e) {
			alert('Erro ao ler arquivo Excel.')
			console.error(e)
		} finally {
			if (fileInput.value) fileInput.value.value = ''
		}
	}
}
</script>

<template>
	<div class="bg-white p-4 rounded-lg shadow border border-slate-200 mb-6">
		<h3 class="text-sm font-bold uppercase text-slate-500 mb-3">Ações e Relatórios</h3>

		<div class="grid grid-cols-1 gap-2">
			<button v-if="showInstallButton" @click="installPWA" class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-2 rounded hover:from-indigo-600 hover:to-purple-700 transition text-sm font-bold shadow-md mb-2">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
				Instalar Aplicativo
			</button>
			<div class="flex gap-2">
				<button @click="handleExportExcel" class="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition text-sm font-medium">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					Excel
				</button>
				<button @click="handleExportPDF" class="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition text-sm font-medium">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
					</svg>
					Relatório PDF
				</button>
			</div>

			<div class="pt-2 border-t border-slate-100 mt-1">
				<input type="file" ref="fileInput" class="hidden" accept=".xlsx, .xls" @change="handleFileChange" />

				<button @click="triggerFileInput" class="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 border border-slate-300 px-3 py-2 rounded hover:bg-slate-200 transition text-sm font-medium">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
					Importar Planilha
				</button>

				<div class="flex justify-between items-center mt-2 px-1">
					<span class="text-[10px] text-slate-400">Formatos: .xlsx</span>
					<button @click="downloadImportTemplate" class="text-[10px] text-blue-500 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
						Baixar Modelo
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
