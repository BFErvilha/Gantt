<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { format, parseISO } from 'date-fns'

const props = defineProps<{
	squadId: string
}>()

const { config, addHoliday, removeHoliday, addHolidayToSquad, removeHolidayFromSquad, getSquadStats, projectCapacityStats } = useGantt()

const newHolidayDate = ref('')
const activeHelp = ref(false)
const squadStats = ref({ calendarDays: 0, workingDays: 0, totalTeamCapacity: 0 })

const selectedSquad = computed(() => (props.squadId ? config.value.squads.find(s => s.id === props.squadId) : null))

watch(
	[() => props.squadId, () => selectedSquad.value?.startDate, () => selectedSquad.value?.deadline, () => selectedSquad.value?.skipWeekends],
	() => {
		if (props.squadId) {
			squadStats.value = getSquadStats(props.squadId)
		}
	},
	{ deep: true, immediate: true },
)

const currentStats = computed(() => (props.squadId ? squadStats.value : projectCapacityStats.value))

const formatDateBr = (isoDate: string) => format(parseISO(isoDate), 'dd/MM/yyyy')

const handleAddHoliday = () => {
	if (newHolidayDate.value) {
		if (props.squadId) addHolidayToSquad(props.squadId, newHolidayDate.value)
		else addHoliday(newHolidayDate.value)
		newHolidayDate.value = ''
	}
}

const handleRemoveHoliday = (date: string) => {
	if (props.squadId) removeHolidayFromSquad(props.squadId, date)
	else removeHoliday(date)
}
</script>

<template>
	<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
		<h3 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
			<div class="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
				<svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
			</div>
			{{ squadId ? 'Tempo & Feriados da Squad' : 'Definições Globais' }}
			<button @click="activeHelp = !activeHelp" class="ml-auto text-slate-400 hover:text-blue-500">
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
			</button>
		</h3>

		<div v-if="activeHelp" class="mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-slate-600 dark:text-slate-300">
			Defina o início e o fim deste contexto. O gráfico Gantt respeitará essas datas, mas se expandirá caso haja tarefas fora do prazo.
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
			<div>
				<label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5">Início</label>
				<input v-if="selectedSquad" v-model="selectedSquad.startDate" type="date" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm dark:bg-slate-950 dark:text-white dark:[color-scheme:dark]" />
				<input v-else v-model="config.projectStartDate" type="date" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm dark:bg-slate-950 dark:text-white dark:[color-scheme:dark]" />
			</div>
			<div>
				<label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5">Término (Estimado)</label>
				<input v-if="selectedSquad" v-model="selectedSquad.deadline" type="date" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm dark:bg-slate-950 dark:text-white dark:[color-scheme:dark]" />
				<input v-else v-model="config.deadline" type="date" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm dark:bg-slate-950 dark:text-white dark:[color-scheme:dark]" />
			</div>
		</div>

		<div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Resumo de Capacidade</span>
				<span class="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full"> {{ currentStats.totalTeamCapacity }}h Totais </span>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-center">
					<span class="block text-2xl font-black text-slate-700 dark:text-white">{{ currentStats.calendarDays }}</span>
					<span class="text-[10px] font-bold text-slate-400 uppercase">Dias Corridos</span>
				</div>
				<div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-center">
					<span class="block text-2xl font-black text-slate-700 dark:text-white">{{ currentStats.workingDays }}</span>
					<span class="text-[10px] font-bold text-slate-400 uppercase">Dias Úteis</span>
				</div>
			</div>
		</div>

		<div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
			<input v-if="selectedSquad" v-model="selectedSquad.skipWeekends" type="checkbox" class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
			<input v-else v-model="config.skipWeekends" type="checkbox" class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
			<label class="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">Pular Finais de Semana</label>
		</div>

		<div class="pt-4">
			<h4 class="font-bold text-sm text-slate-700 dark:text-slate-200 mb-3 flex items-center justify-between">Feriados {{ selectedSquad ? '(Específicos)' : '(Gerais)' }}</h4>
			<div class="flex gap-2 mb-3">
				<input v-model="newHolidayDate" type="date" class="flex-1 rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2 text-sm dark:bg-slate-950 dark:text-white dark:[color-scheme:dark]" />
				<button @click="handleAddHoliday" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50" :disabled="!newHolidayDate">+</button>
			</div>
			<div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
				<div v-for="date in selectedSquad ? selectedSquad.holidays : config.holidays" :key="date" class="flex items-center bg-white dark:bg-slate-700 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-600 shadow-sm text-slate-700 dark:text-slate-200 group">
					<span>{{ formatDateBr(date) }}</span>
					<button @click="handleRemoveHoliday(date)" class="ml-2 text-slate-400 hover:text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
				</div>
				<span v-if="(selectedSquad ? selectedSquad.holidays.length : config.holidays.length) === 0" class="text-xs text-slate-400 italic">Nenhum feriado cadastrado.</span>
			</div>
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
</style>
