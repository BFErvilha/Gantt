<script setup lang="ts">
import { ref } from 'vue'
import { useDataPersistence } from '@/composables/useDataPersistence'
import { useGantt } from '@/composables/useGantt'
import { useToast } from '@/composables/useToast'
import ActionCard from './actions/ActionCard.vue'

const { exportToExcel, exportToPDF, downloadImportTemplate, importFromExcel, clearAllData } = useDataPersistence()
const { tasks, config, importTasks, saveBaseline } = useGantt()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)

const triggerImport = () => {
	fileInput.value?.click()
}

const handleFileChange = async (event: Event) => {
	const target = event.target as HTMLInputElement
	if (target.files && target.files[0]) {
		try {
			const importedTasks = await importFromExcel(target.files[0])
			if (importedTasks && importedTasks.length > 0) {
				if (confirm(`Encontradas ${importedTasks.length} tarefas. Deseja substituir as atuais (OK) ou adicionar (Cancelar)?`)) {
					importTasks(importedTasks)
				} else {
					importTasks([...tasks.value, ...importedTasks])
				}
				toast.show('Importação concluída com sucesso!', 'success')
			}
		} catch (error) {
			console.error(error)
			toast.show('Erro ao ler o arquivo Excel. Verifique se segue o modelo.', 'error')
		} finally {
			target.value = ''
		}
	}
}

const handleClear = () => {
	if (confirm('Tem certeza? Isso apagará todos os dados locais permanentemente.')) {
		clearAllData()
		window.location.reload()
	}
}
</script>

<template>
	<div class="grid grid-cols-2 md:grid-cols-6 gap-4 animate-fade-in mb-8">
		<input type="file" ref="fileInput" class="hidden" @change="handleFileChange" accept=".xlsx" />

		<ActionCard label="Salvar Excel" color-class="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" @click="exportToExcel(tasks)">
			<template #icon>
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
			</template>
		</ActionCard>

		<ActionCard label="Gerar PDF" color-class="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" @click="exportToPDF(tasks, config, [])">
			<template #icon>
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
			</template>
		</ActionCard>

		<ActionCard label="Baixar Modelo" color-class="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" @click="downloadImportTemplate">
			<template #icon>
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
			</template>
		</ActionCard>

		<ActionCard label="Importar Dados" color-class="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" @click="triggerImport">
			<template #icon>
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
			</template>
		</ActionCard>

		<ActionCard label="Definir Baseline" color-class="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" @click="saveBaseline">
			<template #icon>
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
			</template>
		</ActionCard>

		<ActionCard label="Resetar" color-class="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 group-hover:text-red-600" @click="handleClear">
			<template #icon>
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
			</template>
		</ActionCard>
	</div>
</template>

<style scoped>
.animate-fade-in {
	animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
