<script setup lang="ts">
interface SectorItem {
	name: string
	totalCapacity: number
	assignedEffort: number
	memberCount: number
	percentage: number
}

interface TypeItem {
	label: string
	value: number
	color: string
}

defineProps<{
	sectors: SectorItem[]
	types: TypeItem[]
}>()
</script>

<template>
	<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors h-full">
		<h3 class="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
			</svg>
			Capacidade por Setor
		</h3>

		<div v-if="sectors.length === 0" class="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">Sem dados de setores.</div>

		<div class="space-y-4">
			<div v-for="sector in sectors" :key="sector.name">
				<div class="flex justify-between text-xs mb-1">
					<span class="font-bold text-slate-700 dark:text-slate-300">
						{{ sector.name }} <span class="text-slate-400 dark:text-slate-500 font-normal">({{ sector.memberCount }} pessoas)</span>
					</span>
					<span class="text-slate-500 dark:text-slate-400">{{ sector.assignedEffort }}h / {{ sector.totalCapacity }}h</span>
				</div>
				<div class="w-full bg-slate-100 dark:bg-slate-700 h-6 rounded-lg overflow-hidden relative border border-slate-200 dark:border-slate-600">
					<div class="h-full bg-indigo-500 transition-all duration-500 flex items-center justify-end px-2" :style="{ width: Math.min(sector.percentage, 100) + '%' }">
						<span v-if="sector.percentage > 10" class="text-[10px] text-white font-bold">{{ sector.percentage }}%</span>
					</div>
					<span v-if="sector.percentage <= 10" class="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 font-bold">{{ sector.percentage }}%</span>
				</div>
			</div>
		</div>

		<div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
			<h4 class="font-bold text-slate-700 dark:text-slate-300 text-xs mb-3">Tarefas por Tipo</h4>
			<div class="flex gap-2 flex-wrap">
				<div v-for="type in types" :key="type.label" class="flex-1 min-w-[100px] bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700">
					<div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">{{ type.label }}</div>
					<div class="text-lg font-black text-slate-700 dark:text-slate-200">{{ type.value }}</div>
				</div>
			</div>
		</div>
	</div>
</template>
