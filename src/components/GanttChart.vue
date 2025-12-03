<script setup lang="ts">
import { computed } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { format, addDays, startOfDay, isWeekend, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const { computedTasks, config, totalProjectDays } = useGantt()
const cellWidth = 40

const timelineDates = computed(() => {
	const start = startOfDay(new Date(config.value.projectStartDate))
	return Array.from({ length: totalProjectDays.value }, (_, i) => {
		const date = addDays(start, i)
		return {
			date,
			label: format(date, 'dd', { locale: ptBR }),
			dayName: format(date, 'EEEEEE', { locale: ptBR }),
			fullDate: format(date, 'dd/MM/yyyy'),
			isWeekend: isWeekend(date),
		}
	})
})

const deadlinePosition = computed(() => {
	const start = startOfDay(new Date(config.value.projectStartDate))
	const end = startOfDay(new Date(config.value.deadline))
	return (differenceInCalendarDays(end, start) + 1) * cellWidth
})

const containerWidth = computed(() => totalProjectDays.value * cellWidth)
</script>

<template>
	<div class="bg-white rounded-lg shadow overflow-hidden border border-slate-200 flex flex-col h-full">
		<div class="p-4 border-b border-slate-200 bg-white flex justify-between items-center z-20 relative shadow-sm">
			<h2 class="font-bold text-slate-700 flex items-center gap-2">Visualização Gantt</h2>
			<div class="flex items-center gap-4 text-xs font-medium text-slate-600">
				<div class="flex items-center gap-1">
					<span class="w-3 h-3 bg-red-500 rounded-full opacity-20 border border-red-500"></span>
					Fim de Semana
				</div>
				<div class="flex items-center gap-1">
					<span class="w-0.5 h-3 bg-red-500"></span>
					Prazo: {{ format(new Date(config.deadline), 'dd/MM/yyyy') }}
				</div>
			</div>
		</div>

		<div class="overflow-x-auto flex-1 relative custom-scrollbar bg-slate-50">
			<div :style="{ width: containerWidth + 'px' }" class="relative min-h-[400px]">
				<div class="absolute top-0 bottom-0 border-l-2 border-red-500 z-20 border-dashed pointer-events-none opacity-60" :style="{ left: deadlinePosition + 'px' }">
					<div class="absolute -top-0 -left-[4px] w-2 h-2 bg-red-500 rounded-full"></div>
					<div class="absolute bottom-2 -left-[60px] bg-red-100 text-red-700 text-[10px] px-1 rounded border border-red-200 font-bold whitespace-nowrap">Prazo Final</div>
				</div>

				<div class="flex border-b border-slate-200 h-[50px] sticky top-0 bg-white z-10 shadow-sm text-slate-600">
					<div
						v-for="(day, index) in timelineDates"
						:key="index"
						class="flex-shrink-0 border-r border-slate-100 flex flex-col items-center justify-center text-xs select-none"
						:class="{ 'bg-red-50/50 text-red-300': day.isWeekend, 'bg-white': !day.isWeekend }"
						:style="{ width: cellWidth + 'px' }"
						:title="day.fullDate"
					>
						<span class="font-bold">{{ day.label }}</span>
						<span class="text-[9px] uppercase">{{ day.dayName }}</span>
					</div>
				</div>

				<div class="relative">
					<div class="absolute inset-0 flex pointer-events-none">
						<div v-for="(day, index) in timelineDates" :key="index" class="border-r border-slate-200/50 h-full box-border" :class="{ 'bg-red-50/30': day.isWeekend }" :style="{ width: cellWidth + 'px' }"></div>
					</div>

					<div class="py-2 space-y-1">
						<div v-for="task in computedTasks" :key="task.id" class="relative h-10 flex items-center group">
							<div class="absolute inset-x-0 h-full bg-blue-50/0 group-hover:bg-blue-50/50 transition-colors pointer-events-none"></div>

							<div
								class="absolute h-7 rounded-md shadow-sm text-[11px] text-white flex items-center px-2 cursor-pointer hover:ring-2 ring-white ring-offset-2 ring-offset-slate-100 transition-all z-10 overflow-hidden"
								:style="{
									left: (task.offsetDays || 0) * cellWidth + 'px',
									width: task.calendarDuration * cellWidth + 'px',
									backgroundColor: task.color,
								}"
							>
								<span class="truncate font-medium drop-shadow-md">
									{{ task.name }}
									<span class="opacity-75 text-[10px] ml-1">({{ task.duration }}d)</span>
								</span>
							</div>

							<div class="absolute hidden group-hover:flex items-center gap-2 z-30 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg -top-8 pointer-events-none whitespace-nowrap" :style="{ left: (task.offsetDays || 0) * cellWidth + 10 + 'px' }">
								<span class="font-bold">{{ task.name }}</span>
								<span class="opacity-75">|</span>
								<span>{{ task.formattedStartDate }} até {{ task.formattedEndDate }}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.custom-scrollbar {
	scrollbar-width: thin;
	scrollbar-color: #cbd5e1 #f1f5f9;
}
.custom-scrollbar::-webkit-scrollbar {
	height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
	background: #f1f5f9;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background-color: #cbd5e1;
	border-radius: 4px;
}
</style>
