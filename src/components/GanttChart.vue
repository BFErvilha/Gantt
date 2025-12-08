<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGantt, type Task } from '@/composables/useGantt'
import { format, addDays, startOfDay, isWeekend, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const { computedTasks, config, totalProjectDays, setEditingTask, editingTask, criticalPathIds } = useGantt()
const cellWidth = 40

const showCriticalPath = ref(false)

const timelineDates = computed(() => {
	const start = startOfDay(new Date(config.value.projectStartDate))
	return Array.from({ length: totalProjectDays.value }, (_, i) => {
		const date = addDays(start, i)
		const dateString = format(date, 'yyyy-MM-dd')
		const isHoliday = config.value.holidays.includes(dateString)
		const isWknd = isWeekend(date)

		return {
			date,
			label: format(date, 'dd', { locale: ptBR }),
			dayName: format(date, 'EEEEEE', { locale: ptBR }),
			fullDate: format(date, 'dd/MM/yyyy'),
			isWeekend: isWknd,
			isHoliday: isHoliday,
		}
	})
})

const deadlinePosition = computed(() => {
	const start = startOfDay(new Date(config.value.projectStartDate))
	const end = startOfDay(new Date(config.value.deadline))
	return (differenceInCalendarDays(end, start) + 1) * cellWidth
})

const containerWidth = computed(() => totalProjectDays.value * cellWidth)

const getInitials = (name: string) => {
	if (!name) return '?'
	return name
		.split(' ')
		.map(n => n[0])
		.slice(0, 2)
		.join('')
		.toUpperCase()
}

// ATUALIZAÇÃO: Busca capacidade dinâmica
const isOverloaded = (task: Task) => {
	if (!task.effort || !task.duration) return false

	const member = config.value.teamMembers.find(m => m.name === task.responsible)
	const capacity = member ? member.capacity : 8

	return task.effort > task.duration * capacity
}
</script>

<template>
	<div class="bg-white rounded-lg shadow overflow-hidden border border-slate-200 flex flex-col h-full">
		<div class="p-4 border-b border-slate-200 bg-white flex justify-between items-center z-20 relative shadow-sm">
			<h2 class="font-bold text-slate-700 flex items-center gap-2">Visualização Gantt</h2>

			<div class="flex items-center gap-4 text-xs font-medium text-slate-600">
				<button
					@click="showCriticalPath = !showCriticalPath"
					class="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-bold mr-4"
					:class="showCriticalPath ? 'bg-red-100 text-red-700 border-red-200 shadow-sm ring-1 ring-red-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'"
				>
					<span class="relative flex h-2 w-2">
						<span v-if="showCriticalPath" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-2 w-2" :class="showCriticalPath ? 'bg-red-500' : 'bg-slate-400'"></span>
					</span>
					Caminho Crítico
				</button>

				<div class="flex gap-2 mr-4 border-r border-slate-200 pr-4">
					<span class="flex items-center gap-1" title="Exemplo de ícone de responsável">
						<span class="w-4 h-4 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-600">JS</span>
						Responsável
					</span>
					<span class="flex items-center gap-1" title="Aparece quando horas > dias úteis">
						<span class="text-amber-500 font-bold">⚠️</span>
						Sobrecarga
					</span>
				</div>

				<div class="flex items-center gap-1">
					<span class="w-3 h-3 bg-purple-100 rounded border border-purple-200"></span>
					Feriado
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
						class="flex-shrink-0 border-r border-slate-100 flex flex-col items-center justify-center text-xs select-none transition-colors"
						:class="{
							'bg-purple-100 text-purple-700 font-bold': day.isHoliday,
							'bg-red-50/50 text-red-300': day.isWeekend && !day.isHoliday,
							'bg-white': !day.isWeekend && !day.isHoliday,
						}"
						:style="{ width: cellWidth + 'px' }"
						:title="day.isHoliday ? `Feriado: ${day.fullDate}` : day.fullDate"
					>
						<span class="font-bold">{{ day.label }}</span>
						<span class="text-[9px] uppercase">{{ day.dayName }}</span>
					</div>
				</div>

				<div class="relative">
					<div class="absolute inset-0 flex pointer-events-none">
						<div
							v-for="(day, index) in timelineDates"
							:key="index"
							class="border-r border-slate-200/50 h-full box-border"
							:class="{
								'bg-purple-50/40': day.isHoliday,
								'bg-red-50/30': day.isWeekend && !day.isHoliday,
							}"
							:style="{ width: cellWidth + 'px' }"
						></div>
					</div>

					<div class="py-2 space-y-1">
						<div v-for="task in computedTasks" :key="task.id" class="relative h-10 flex items-center group">
							<div class="absolute inset-x-0 h-full bg-blue-50/0 group-hover:bg-blue-50/50 transition-colors pointer-events-none"></div>

							<div
								class="absolute h-7 rounded-md shadow-sm text-[11px] text-white flex items-center px-2 cursor-pointer hover:ring-2 ring-white ring-offset-2 ring-offset-slate-100 transition-all z-10 overflow-hidden"
								:class="{
									'ring-2 ring-blue-500 ring-offset-2 ring-offset-white': editingTask?.id === task.id,
									'border-2 border-amber-400': isOverloaded(task),
									'ring-2 ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] z-20': showCriticalPath && criticalPathIds.includes(task.id),
									'opacity-40 grayscale': showCriticalPath && !criticalPathIds.includes(task.id) && editingTask?.id !== task.id,
								}"
								@click="setEditingTask(task)"
								:style="{
									left: (task.offsetDays || 0) * cellWidth + 'px',
									width: task.calendarDuration * cellWidth + 'px',
									backgroundColor: task.color,
								}"
							>
								<span class="truncate font-medium drop-shadow-md flex items-center gap-2">
									{{ task.name }}
									<span v-if="isOverloaded(task)" class="bg-amber-100 text-amber-700 rounded-full px-1 text-[9px] font-bold">⚠️</span>
								</span>

								<div v-if="task.responsible" class="absolute right-1 top-0.5 w-5 h-5 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-[9px] font-bold border border-white/40 shadow-sm" :title="`Responsável: ${task.responsible}`">
									{{ getInitials(task.responsible) }}
								</div>
							</div>

							<div class="absolute hidden group-hover:flex flex-col gap-1 z-30 bg-slate-800 text-white text-xs px-3 py-2 rounded shadow-lg -top-16 pointer-events-none whitespace-nowrap" :style="{ left: (task.offsetDays || 0) * cellWidth + 10 + 'px' }">
								<div class="font-bold flex justify-between gap-4">
									{{ task.name }}
									<span v-if="criticalPathIds.includes(task.id)" class="text-[9px] bg-red-500 px-1 rounded">CRÍTICO</span>
									<span class="uppercase text-[9px] bg-white/20 px-1 rounded h-fit">{{ task.type || 'other' }}</span>
								</div>
								<div class="text-slate-300 text-[10px]">{{ task.formattedStartDate }} - {{ task.formattedEndDate }}</div>
								<div class="border-t border-slate-600 my-1"></div>
								<div class="flex items-center gap-3 text-[10px]">
									<span v-if="task.responsible">👤 {{ task.responsible }}</span>
									<span v-if="task.effort">⏱️ {{ task.effort }}h</span>
									<span>📅 {{ task.duration }} dias</span>
								</div>
								<div v-if="isOverloaded(task)" class="text-amber-400 font-bold text-[10px] mt-1">⚠️ Atenção: Pouco tempo para o esforço!</div>
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
