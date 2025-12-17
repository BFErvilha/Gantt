<script setup lang="ts">
interface WorkloadItem {
	name: string
	assigned: number
	capacity: number
	percentage: number
	isOverloaded: boolean
	sector: string
}

defineProps<{
	data: WorkloadItem[]
}>()
</script>

<template>
	<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors h-full">
		<h3 class="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
				/>
			</svg>
			Carga de Trabalho (Individual)
		</h3>

		<div v-if="data.length === 0" class="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">Nenhum membro na equipe.</div>

		<div class="space-y-4">
			<div v-for="member in data" :key="member.name">
				<div class="flex justify-between text-xs mb-1">
					<span class="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
						{{ member.name }}
						<span class="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1 rounded font-normal">{{ member.sector }}</span>
					</span>
					<span :class="member.isOverloaded ? 'text-red-500 dark:text-red-400 font-bold' : 'text-slate-500 dark:text-slate-400'"> {{ member.assigned }}h / {{ member.capacity }}h </span>
				</div>
				<div class="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden relative">
					<div class="h-full rounded-full transition-all duration-500" :class="member.isOverloaded ? 'bg-red-500' : 'bg-blue-500'" :style="{ width: Math.min(member.percentage, 100) + '%' }"></div>
				</div>
				<div v-if="member.isOverloaded" class="text-[10px] text-red-500 dark:text-red-400 mt-0.5">⚠️ Sobrecarga detectada</div>
			</div>
		</div>
	</div>
</template>
