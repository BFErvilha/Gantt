<script setup lang="ts">
import { ref } from 'vue'
import { useGantt } from '@/composables/useGantt'

defineProps<{
	squadId: string
}>()

const { automaticRisks } = useGantt()
const activeHelp = ref(false)
</script>

<template>
	<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
		<h3 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
			<div class="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
				<svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			</div>
			Riscos {{ squadId ? 'da Squad' : 'do Projeto' }}
			<button @click="activeHelp = !activeHelp" class="ml-auto text-slate-400 hover:text-red-500">
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
			</button>
		</h3>

		<div v-if="activeHelp" class="mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800 text-xs text-slate-600 dark:text-slate-300 animate-fade-in">
			Detectamos automaticamente: Sobrecarga de horas, conflitos com feriados/folgas e estouro de datas das Sprints.
		</div>

		<div class="bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
			<ul class="space-y-1 max-h-48 overflow-y-auto custom-scrollbar p-2">
				<li v-if="automaticRisks.length === 0" class="text-sm text-green-600 dark:text-green-400 flex items-center gap-2 p-2 font-medium">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
					Nenhum risco crítico detectado.
				</li>
				<li v-for="(risk, index) in automaticRisks" :key="index" class="flex items-start gap-3 p-2 rounded-lg bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 shadow-sm text-xs text-slate-700 dark:text-slate-300">
					<span class="mt-0.5 text-red-500 font-bold">•</span>
					<span class="leading-snug">{{ risk }}</span>
				</li>
			</ul>
		</div>
	</div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
	width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background: #cbd5e1;
	border-radius: 2px;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
	background: #475569;
}
.animate-fade-in {
	animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
</style>
