<script setup lang="ts">
interface BaselineData {
	count: number
	totalDelay: number
	tasks: {
		name: string
		responsible: string
		delay: number
		planned: string
		current: string
		isMilestone: boolean
	}[]
}

defineProps<{
	stats: BaselineData
}>()
</script>

<template>
	<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors h-full">
		<div class="flex justify-between items-center mb-4">
			<h3 class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
				<svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				Desvio de Prazos (Baseline)
			</h3>
			<span v-if="stats.count > 0" class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">{{ stats.totalDelay }} dias total</span>
		</div>

		<div v-if="stats.count === 0" class="text-center py-8 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
			<div class="text-slate-400 text-sm">Nenhum atraso em relação ao planejado.</div>
			<div class="text-[10px] text-slate-400 mt-1">Defina uma Baseline nas configurações.</div>
		</div>

		<div v-else class="space-y-3">
			<div v-for="task in stats.tasks" :key="task.name" class="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
				<div class="flex flex-col min-w-0">
					<span class="font-bold text-slate-700 dark:text-slate-200 text-sm truncate flex items-center gap-1">
						<span v-if="task.isMilestone">🚩</span>
						{{ task.name }}
					</span>
					<span class="text-[10px] text-slate-500 dark:text-slate-400">{{ task.responsible }}</span>
				</div>
				<div class="flex flex-col items-end flex-shrink-0">
					<span class="text-red-600 dark:text-red-400 font-black text-sm">+{{ task.delay }} dias</span>
					<span class="text-[10px] text-slate-400">Era: {{ task.planned }} ➝ {{ task.current }}</span>
				</div>
			</div>
			<div v-if="stats.count > 5" class="text-center text-xs text-slate-400 italic pt-2">+{{ stats.count - 5 }} outras tarefas atrasadas</div>
		</div>
	</div>
</template>
