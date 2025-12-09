<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGantt, type Task } from '@/composables/useGantt'
import { format, addDays, startOfDay, isWeekend, differenceInCalendarDays, startOfWeek, endOfWeek, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const { filteredTasks, config, totalProjectDays, setEditingTask, editingTask, criticalPathIds, viewMode, visibleDateRange, setViewMode, navigateView, currentViewDate, filterSearch, filterResponsible, filterType, moveTask } = useGantt()

const showCriticalPath = ref(false)
const ganttContainer = ref<HTMLDivElement | null>(null)
const containerWidthPx = ref(0)

const isDragging = ref(false)
const draggingTaskId = ref<string | null>(null)
const dragStartX = ref(0)
const dragCurrentX = ref(0)
const taskInitialLeft = ref(0)

const onTaskMouseDown = (e: MouseEvent, task: Task, currentLeft: number) => {
	if (e.button !== 0 || viewMode.value === 'month') return

	e.stopPropagation()

	isDragging.value = true
	draggingTaskId.value = task.id
	dragStartX.value = e.clientX
	dragCurrentX.value = e.clientX
	taskInitialLeft.value = currentLeft

	window.addEventListener('mousemove', onGlobalMouseMove)
	window.addEventListener('mouseup', onGlobalMouseUp)
}

const onGlobalMouseMove = (e: MouseEvent) => {
	if (!isDragging.value) return
	dragCurrentX.value = e.clientX
}

const onGlobalMouseUp = () => {
	if (!isDragging.value) return

	const deltaX = dragCurrentX.value - dragStartX.value
	if (Math.abs(deltaX) < 5) {
		const task = filteredTasks.value.find(t => t.id === draggingTaskId.value)
		if (task) setEditingTask(task)
	} else {
		const daysMoved = Math.round(deltaX / cellWidth.value)
		if (daysMoved !== 0) {
			const task = filteredTasks.value.find(t => t.id === draggingTaskId.value)
			if (task && task.startDate) {
				const newDate = addDays(task.startDate, daysMoved)
				moveTask(task.id, newDate)
			}
		}
	}

	isDragging.value = false
	draggingTaskId.value = null
	window.removeEventListener('mousemove', onGlobalMouseMove)
	window.removeEventListener('mouseup', onGlobalMouseUp)
}

const getTaskStyle = (task: Task) => {
	if (!task.startDate) return {}

	const viewStart = visibleDateRange.value.start
	const offsetDays = differenceInCalendarDays(task.startDate, viewStart)
	let leftPos = offsetDays * cellWidth.value

	if (isDragging.value && draggingTaskId.value === task.id) {
		const delta = dragCurrentX.value - dragStartX.value
		leftPos += delta
	}

	return {
		left: leftPos + 'px',
		width: task.calendarDuration! * cellWidth.value + 'px',
		backgroundColor: task.color,
		cursor: viewMode.value === 'month' ? 'default' : isDragging.value ? 'grabbing' : 'grab',
		zIndex: isDragging.value && draggingTaskId.value === task.id ? 50 : 10,
	}
}

const updateDimensions = () => {
	if (ganttContainer.value) containerWidthPx.value = ganttContainer.value.clientWidth
}
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
	updateDimensions()
	window.addEventListener('resize', updateDimensions)
	if (ganttContainer.value) {
		resizeObserver = new ResizeObserver(() => updateDimensions())
		resizeObserver.observe(ganttContainer.value)
	}
})
onUnmounted(() => {
	window.removeEventListener('resize', updateDimensions)
	if (resizeObserver) resizeObserver.disconnect()
})

const cellWidth = computed(() => {
	switch (viewMode.value) {
		case 'week':
			return containerWidthPx.value > 0 ? containerWidthPx.value / 7 : 100
		case 'month':
			return 40
		default:
			return 40
	}
})

const navigationLabel = computed(() => {
	if (viewMode.value === 'project') return 'Visão Geral do Projeto'
	const cursor = currentViewDate.value
	if (viewMode.value === 'month') return format(cursor, 'MMMM yyyy', { locale: ptBR }).toUpperCase()
	if (viewMode.value === 'week') {
		const start = startOfWeek(cursor, { weekStartsOn: 0 })
		const end = endOfWeek(cursor, { weekStartsOn: 0 })
		return `Semana: ${format(start, 'dd/MM')} a ${format(end, 'dd/MM')}`
	}
	return ''
})

const timelineDates = computed(() => {
	const start = visibleDateRange.value.start
	return Array.from({ length: totalProjectDays.value }, (_, i) => {
		const date = addDays(start, i)
		const dateString = format(date, 'yyyy-MM-dd')
		const isHoliday = config.value.holidays.includes(dateString)
		const isWknd = isWeekend(date)
		return {
			date,
			label: format(date, 'dd', { locale: ptBR }),
			dayName: format(date, 'EEE', { locale: ptBR }).replace('.', '').toUpperCase(),
			fullDate: format(date, 'dd/MM/yyyy'),
			isWeekend: isWknd,
			isHoliday: isHoliday,
		}
	})
})

const timelineMonths = computed(() => {
	if (timelineDates.value.length === 0) return []
	const months: { label: string; count: number }[] = []
	let currentMonth = ''
	let count = 0
	timelineDates.value.forEach((day, index) => {
		const monthLabel = format(day.date, 'MMMM yyyy', { locale: ptBR })
		if (monthLabel !== currentMonth) {
			if (currentMonth !== '') months.push({ label: currentMonth, count })
			currentMonth = monthLabel
			count = 1
		} else {
			count++
		}
		if (index === timelineDates.value.length - 1) months.push({ label: currentMonth, count })
	})
	return months
})

const deadlinePosition = computed(() => {
	const deadline = startOfDay(new Date(config.value.deadline))
	const viewStart = visibleDateRange.value.start
	const diff = differenceInCalendarDays(deadline, viewStart)
	if (diff < 0) return -100
	return (diff + 1) * cellWidth.value
})

const containerWidth = computed(() => {
	if (viewMode.value === 'week') return containerWidthPx.value
	return totalProjectDays.value * cellWidth.value
})

const dependencyLines = computed(() => {
	const lines: { path: string; isCritical: boolean }[] = []
	const taskMap = new Map<string, { index: number; task: Task }>()
	filteredTasks.value.forEach((t, i) => taskMap.set(t.id, { index: i, task: t }))
	const ROW_HEIGHT = 44
	const ROW_PADDING_TOP = 8
	const BAR_HEIGHT = 40
	const HALF_BAR = BAR_HEIGHT / 2

	filteredTasks.value.forEach(task => {
		if (task.dependencyId && taskMap.has(task.dependencyId)) {
			const parent = taskMap.get(task.dependencyId)!
			const current = taskMap.get(task.id)!
			const viewStart = visibleDateRange.value.start
			const parentOffset = differenceInCalendarDays(parent.task.startDate!, viewStart)
			const parentX = (parentOffset + parent.task.calendarDuration!) * cellWidth.value
			const parentY = ROW_PADDING_TOP + parent.index * ROW_HEIGHT + HALF_BAR
			const currentOffset = differenceInCalendarDays(task.startDate!, viewStart)
			const childX = currentOffset * cellWidth.value
			const childY = ROW_PADDING_TOP + current.index * ROW_HEIGHT + HALF_BAR

			const gap = 15
			const path = `M ${parentX} ${parentY} L ${parentX + gap} ${parentY} L ${parentX + gap} ${childY} L ${childX} ${childY}`
			const isCritical = criticalPathIds.value.includes(task.id) && criticalPathIds.value.includes(parent.task.id)
			lines.push({ path, isCritical })
		}
	})
	return lines
})

const getInitials = (name: string) => {
	if (!name) return '?'
	return name
		.split(' ')
		.map(n => n[0])
		.slice(0, 2)
		.join('')
		.toUpperCase()
}

const isOverloaded = (task: Task) => {
	if (!task.effort || !task.duration) return false
	if (task.isCompleted) return false
	const member = config.value.teamMembers.find(m => m.name === task.responsible)
	const capacity = member ? member.capacity : 8
	return task.effort > task.duration * capacity
}

const clearFilters = () => {
	filterSearch.value = ''
	filterResponsible.value = ''
	filterType.value = ''
}
const hasFilters = computed(() => filterSearch.value || filterResponsible.value || filterType.value)
</script>

<template>
	<div class="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col h-full select-none transition-colors duration-300">
		<div class="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col gap-3 z-30 relative shadow-sm">
			<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center w-full gap-4">
				<div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
					<h2 class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">Gantt</h2>

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
						<span class="text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[150px] text-center select-none uppercase text-[11px] tracking-wide">{{ navigationLabel }}</span>
						<button @click="navigateView('next')" class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 transition-colors">&gt;</button>
					</div>
				</div>

				<div class="flex items-center gap-2 self-end lg:self-auto">
					<button
						@click="showCriticalPath = !showCriticalPath"
						class="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-bold whitespace-nowrap"
						:class="
							showCriticalPath
								? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 shadow-sm ring-1 ring-red-300 dark:ring-red-700'
								: 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
						"
					>
						<span class="relative flex h-2 w-2"
							><span v-if="showCriticalPath" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2" :class="showCriticalPath ? 'bg-red-500' : 'bg-slate-400'"></span
						></span>
						Caminho Crítico
					</button>
				</div>
			</div>

			<div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
				<div class="relative group flex-1 max-w-full lg:max-w-xs">
					<div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
						<svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
					</div>
					<input
						v-model="filterSearch"
						type="text"
						placeholder="Buscar tarefa..."
						class="w-full pl-8 pr-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder-slate-400"
					/>
				</div>
				<div class="flex gap-2 w-full lg:w-auto">
					<select
						v-model="filterResponsible"
						class="flex-1 lg:flex-none py-1.5 pl-2 pr-6 text-xs rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						<option value="">Todos Responsáveis</option>
						<option v-for="member in config.teamMembers" :key="member.name" :value="member.name">{{ member.name }}</option>
					</select>
					<select
						v-model="filterType"
						class="flex-1 lg:flex-none py-1.5 pl-2 pr-6 text-xs rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						<option value="">Todos Tipos</option>
						<option value="frontend">Front-end</option>
						<option value="backend">Back-end</option>
						<option value="qualidade">Qualidade</option>
						<option value="other">Outro</option>
					</select>
				</div>
				<button v-if="hasFilters" @click="clearFilters" class="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1.5 rounded transition-colors flex items-center gap-1 justify-center lg:justify-start">
					<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg> Limpar
				</button>
				<div class="hidden lg:block flex-1"></div>

				<div class="flex flex-wrap justify-center lg:justify-end items-center gap-3 text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-2 lg:mt-0">
					<span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[6px] font-bold text-slate-600 dark:text-slate-300">JS</span> Resp.</span>
					<span class="flex items-center gap-1"><span class="text-amber-500 font-bold text-xs">⚠️</span> Sobrecarga</span>
					<span class="flex items-center gap-1"><span class="w-2 h-2 bg-purple-100 dark:bg-purple-900/50 rounded border border-purple-200 dark:border-purple-800"></span> Feriado</span>
					<span class="flex items-center gap-1"><span class="w-0.5 h-2 bg-red-500"></span> Prazo</span>
				</div>
			</div>
		</div>

		<div ref="ganttContainer" class="overflow-x-auto flex-1 relative custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
			<div :style="{ width: containerWidth + 'px' }" class="relative min-h-[400px]">
				<div v-if="deadlinePosition > 0" class="absolute top-0 bottom-0 border-l-2 border-red-500 z-20 border-dashed pointer-events-none opacity-60" :style="{ left: deadlinePosition + 'px' }">
					<div class="absolute -top-0 -left-[4px] w-2 h-2 bg-red-500 rounded-full"></div>
					<div class="absolute bottom-2 -left-[60px] bg-red-100 dark:bg-red-900/80 text-red-700 dark:text-red-200 text-[10px] px-1 rounded border border-red-200 dark:border-red-800 font-bold whitespace-nowrap">Prazo Final</div>
				</div>

				<div class="sticky top-0 z-30 shadow-sm">
					<div class="flex bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-[25px] text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
						<div v-for="(month, idx) in timelineMonths" :key="idx" class="flex items-center pl-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap overflow-hidden" :style="{ width: month.count * cellWidth + 'px' }">{{ month.label }}</div>
					</div>
					<div class="flex border-b border-slate-200 dark:border-slate-700 h-[30px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
						<div
							v-for="(day, index) in timelineDates"
							:key="index"
							class="flex-shrink-0 border-r border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-[10px] select-none transition-colors"
							:class="{
								'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold': day.isHoliday,
								'bg-red-50/50 dark:bg-red-900/20 text-red-300 dark:text-red-400': day.isWeekend && !day.isHoliday,
								'bg-white dark:bg-slate-800': !day.isWeekend && !day.isHoliday,
							}"
							:style="{ width: cellWidth + 'px' }"
							:title="day.fullDate"
						>
							<span class="font-bold">{{ day.label }}</span>
							<span class="text-[8px] uppercase">{{ day.dayName }}</span>
						</div>
					</div>
				</div>

				<div class="relative">
					<div class="absolute inset-0 flex pointer-events-none">
						<div
							v-for="(day, index) in timelineDates"
							:key="index"
							class="border-r border-slate-200/50 dark:border-slate-700/50 h-full box-border"
							:class="{ 'bg-purple-50/40 dark:bg-purple-900/10': day.isHoliday, 'bg-red-50/30 dark:bg-red-900/10': day.isWeekend && !day.isHoliday }"
							:style="{ width: cellWidth + 'px' }"
						></div>
					</div>

					<svg class="absolute inset-0 pointer-events-none z-0" :width="containerWidth" :height="filteredTasks.length * 44 + 20" style="overflow: visible">
						<path
							v-for="(line, idx) in dependencyLines"
							:key="idx"
							:d="line.path"
							fill="none"
							class="transition-colors duration-300"
							:class="line.isCritical && showCriticalPath ? 'stroke-red-500' : 'stroke-slate-300 dark:stroke-slate-600'"
							:stroke-width="line.isCritical && showCriticalPath ? 2 : 1.5"
							stroke-linejoin="round"
						/>
					</svg>

					<div class="py-2 space-y-1 overflow-hidden relative z-10">
						<div v-for="task in filteredTasks" :key="task.id" class="relative h-10 flex items-center group">
							<div class="absolute inset-x-0 h-full bg-blue-50/0 dark:group-hover:bg-blue-900/20 group-hover:bg-blue-50/50 transition-colors pointer-events-none"></div>

							<div
								class="absolute h-7 rounded-md shadow-sm text-[11px] text-white flex items-center px-2 transition-all z-10 overflow-hidden"
								:class="{
									'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900': editingTask?.id === task.id,
									'border-2 border-amber-400': isOverloaded(task),
									'ring-2 ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] z-20': showCriticalPath && criticalPathIds.includes(task.id),
									'opacity-40 grayscale': showCriticalPath && !criticalPathIds.includes(task.id) && editingTask?.id !== task.id,
									'opacity-60': task.isCompleted,
									'shadow-lg scale-[1.02]': isDragging && draggingTaskId === task.id,
									'border-2 border-dashed border-slate-300': task.isNotPlanned && !isOverloaded(task),
								}"
								@mousedown="(e) => onTaskMouseDown(e, task, parseInt(getTaskStyle(task).left as string))"
								:style="getTaskStyle(task)"
							>
								<span class="truncate font-medium drop-shadow-md flex items-center gap-2" :class="{ 'line-through text-white/80': task.isCompleted }">
									{{ task.name }}
									<span v-if="isOverloaded(task)" class="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 rounded-full px-1 text-[9px] font-bold">⚠️</span>
									<span v-if="task.isCompleted" class="bg-green-500 text-white rounded-full px-1 text-[9px] font-bold">✓</span>
									<span v-if="task.isNotPlanned" class="bg-slate-700 text-white border border-white/30 rounded px-1 text-[8px] font-bold" title="Não Planejada">NP</span>
								</span>
								<div v-if="task.responsible" class="absolute right-1 top-0.5 w-5 h-5 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-[9px] font-bold border border-white/40 shadow-sm" :title="`Responsável: ${task.responsible}`">
									{{ getInitials(task.responsible) }}
								</div>
							</div>

							<div
								v-if="!isDragging"
								class="absolute hidden group-hover:flex flex-col gap-1 z-30 bg-slate-800 dark:bg-slate-950 dark:border dark:border-slate-700 text-white text-xs px-3 py-2 rounded shadow-lg -top-16 pointer-events-none whitespace-nowrap"
								:style="{ left: Math.max(0, parseInt(getTaskStyle(task).left as string)) + 'px' }"
							>
								<div class="font-bold flex justify-between gap-4">
									<span :class="{ 'line-through': task.isCompleted }">{{ task.name }}</span>
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
								<div v-if="task.isNotPlanned" class="text-slate-300 font-bold text-[10px] mt-1 italic">📌 Tarefa Não Planejada</div>
								<div v-if="task.isCompleted" class="text-green-400 font-bold text-[10px] mt-1">✅ Concluída em {{ task.completedDate ? format(parseISO(task.completedDate), 'dd/MM') : '' }}</div>
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

:global(.dark) .custom-scrollbar {
	scrollbar-color: #475569 #1e293b;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-track {
	background: #1e293b;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
	background-color: #475569;
}
</style>
