<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

defineProps<{
	groupBy: string
	showCriticalPath: boolean
}>()

const emit = defineEmits(['update:groupBy', 'update:showCriticalPath', 'optimize'])

const { viewMode, setViewMode, navigateView, currentViewDate, filterSquad, config, automaticRisks, createSnapshot, restoreSnapshot, tasksSnapshot } = useGantt()

const showRiskModal = ref(false)

const navigationLabel = computed(() => {
	if (viewMode.value === 'project') return 'Visão Geral'
	const cursor = currentViewDate.value
	if (viewMode.value === 'month') return format(cursor, 'MMMM yyyy', { locale: ptBR }).toUpperCase()
	if (viewMode.value === 'week') {
		const start = startOfWeek(cursor, { weekStartsOn: 0 })
		const end = endOfWeek(cursor, { weekStartsOn: 0 })
		return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM')}`
	}
	return ''
})

const handleUndo = () => {
	if (confirm('Deseja descartar todas as alterações atuais e voltar para o ponto salvo?')) {
		restoreSnapshot()
	}
}
</script>

<template>
	<div class="p-4 bg-white dark:bg-slate-800 flex flex-col gap-3 z-30 relative shadow-sm border-b border-slate-200 dark:border-slate-700">
		<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center w-full gap-4">
			<div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
				<h2 class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">Gantt</h2>

				<div v-if="config.squads.length > 0" class="flex items-center gap-2">
					<select
						v-model="filterSquad"
						class="bg-indigo-50 dark:bg-slate-950 text-indigo-700 dark:text-indigo-100 font-bold text-xs py-1.5 px-2 rounded border border-indigo-200 dark:border-indigo-900 cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-none transition-colors dark:[color-scheme:dark]"
					>
						<option value="">Todas as Squads (Overview)</option>
						<option v-for="squad in config.squads" :key="squad.id" :value="squad.id">
							{{ squad.name }}
						</option>
					</select>
				</div>

				<div class="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1 overflow-x-auto max-w-full">
					<button
						@click="setViewMode('project')"
						class="px-3 py-1 text-xs font-medium rounded transition-all whitespace-nowrap"
						:class="viewMode === 'project' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
					>
						Projeto
					</button>
					<button
						@click="setViewMode('month')"
						class="px-3 py-1 text-xs font-medium rounded transition-all whitespace-nowrap"
						:class="viewMode === 'month' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
					>
						Mês
					</button>
					<button
						@click="setViewMode('week')"
						class="px-3 py-1 text-xs font-medium rounded transition-all whitespace-nowrap"
						:class="viewMode === 'week' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
					>
						Semana
					</button>
				</div>

				<div v-if="viewMode !== 'project'" class="flex items-center gap-2 lg:ml-4 self-center sm:self-auto">
					<button @click="navigateView('prev')" class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 transition-colors">&lt;</button>
					<span class="text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[120px] text-center select-none uppercase text-[11px] tracking-wide">{{ navigationLabel }}</span>
					<button @click="navigateView('next')" class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 transition-colors">&gt;</button>
				</div>
			</div>

			<div class="relative ml-auto z-30 flex items-center gap-3">
				<div class="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
					<button @click="emit('update:groupBy', 'none')" class="px-2 py-1 text-[10px] uppercase font-bold rounded" :class="groupBy === 'none' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'">Lista</button>
					<button @click="emit('update:groupBy', 'responsible')" class="px-2 py-1 text-[10px] uppercase font-bold rounded" :class="groupBy === 'responsible' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'">Pessoa</button>
					<button @click="emit('update:groupBy', 'sprint')" class="px-2 py-1 text-[10px] uppercase font-bold rounded" :class="groupBy === 'sprint' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'">Sprint</button>
				</div>

				<div class="flex items-center gap-1">
					<button @click="createSnapshot" class="p-1.5 rounded-lg border transition-all text-xs font-bold text-slate-500 border-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-700" title="Salvar Backup">
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
					</button>
					<button v-if="tasksSnapshot" @click="handleUndo" class="p-1.5 rounded-lg border transition-all text-xs font-bold bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 text-amber-600" title="Restaurar Backup">
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
					</button>
					<button @click="emit('optimize')" class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100">
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
						<span class="hidden xl:inline">Otimizar</span>
					</button>
				</div>

				<div class="relative">
					<button
						@click="showRiskModal = !showRiskModal"
						class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm border"
						:class="automaticRisks.length > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 hover:bg-slate-50'"
					>
						<svg v-if="automaticRisks.length > 0" class="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						<svg v-else class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
						<span class="hidden xl:inline">Riscos</span>
						<span v-if="automaticRisks.length > 0" class="bg-red-500 text-white text-[9px] px-1 rounded-full">{{ automaticRisks.length }}</span>
					</button>
					<div v-if="showRiskModal" class="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in z-50">
						<div class="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
							<h3 class="font-bold text-slate-700 dark:text-slate-200 text-xs">Alertas</h3>
							<button @click="showRiskModal = false" class="text-slate-400 hover:text-slate-600">&times;</button>
						</div>
						<div class="max-h-60 overflow-y-auto custom-scrollbar p-2">
							<ul class="space-y-1">
								<li v-for="(risk, idx) in automaticRisks" :key="idx" class="text-[10px] p-2 rounded bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-900/30">{{ risk }}</li>
							</ul>
							<div v-if="automaticRisks.length === 0" class="text-center p-4 text-slate-400 text-xs">Sem riscos.</div>
						</div>
					</div>
				</div>

				<button
					@click="emit('update:showCriticalPath', !showCriticalPath)"
					class="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-bold"
					:class="showCriticalPath ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 border-slate-200 hover:bg-slate-100'"
				>
					<span class="relative flex h-2 w-2">
						<span v-if="showCriticalPath" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-2 w-2" :class="showCriticalPath ? 'bg-red-500' : 'bg-slate-400'"></span>
					</span>
					<span class="hidden md:inline">Caminho Crítico</span>
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
	height: 8px;
	width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background-color: #cbd5e1;
	border-radius: 4px;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
	background-color: #475569;
}
.animate-fade-in {
	animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(5px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
