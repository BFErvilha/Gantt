<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useGantt } from '@/composables/useGantt'
import type { Task } from '@/types/gantt'
import { addDays, format, differenceInCalendarDays, isWeekend, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import GanttToolbar from '@/components/gantt/GanttToolbar.vue'
import GanttFilters from '@/components/gantt/GanttFilters.vue'
import OptimizationModal from '@/components/gantt/OptimizationModal.vue'

const { filteredTasks, config, totalProjectDays, setEditingTask, editingTask, criticalPathIds, viewMode, visibleDateRange, moveTask, getOptimizationSuggestions, createSnapshot, tasksSnapshot, filterSquad } = useGantt()

const ganttContainer = ref<HTMLDivElement | null>(null)
const containerWidthPx = ref(0)
const groupBy = ref<'none' | 'responsible' | 'sprint'>('none')
const showCriticalPath = ref(false)
const showOptimizationModal = ref(false)
const optimizationResults = ref<string[]>([])

const isDragging = ref(false)
const draggingTaskId = ref<string | null>(null)
const dragStartX = ref(0)
const dragCurrentX = ref(0)

const handleOptimize = () => {
	if (!tasksSnapshot.value) {
		createSnapshot()
	}
	optimizationResults.value = getOptimizationSuggestions()
	showOptimizationModal.value = true
}

const onTaskMouseDown = (e: MouseEvent, task: Task) => {
	if (e.button !== 0 || viewMode.value === 'month') return
	e.stopPropagation()
	isDragging.value = true
	draggingTaskId.value = task.id
	dragStartX.value = e.clientX
	dragCurrentX.value = e.clientX
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
	nextTick(() => {
		if (ganttContainer.value) ganttContainer.value.scrollLeft = 0
	})
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

const containerWidth = computed(() => {
	if (viewMode.value === 'week') return containerWidthPx.value
	return totalProjectDays.value * cellWidth.value
})

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
		width: (task.calendarDuration || 1) * cellWidth.value + 'px',
		backgroundColor: task.isMilestone ? '#1e293b' : task.color,
		cursor: viewMode.value === 'month' ? 'default' : isDragging.value ? 'grabbing' : 'grab',
		zIndex: isDragging.value && draggingTaskId.value === task.id ? 50 : 10,
	}
}

const groupedTasks = computed(() => {
	if (groupBy.value === 'none') {
		return [{ id: 'all', title: '', tasks: filteredTasks.value }]
	}
	const groups: Record<string, any[]> = {}

	filteredTasks.value.forEach(task => {
		let key = ''
		if (groupBy.value === 'responsible') {
			key = task.responsible || 'Sem Responsável'
		} else if (groupBy.value === 'sprint') {
			if (task.sprintId) {
				const sprint = config.value.sprints.find(s => s.id === task.sprintId)
				if (sprint) {
					if (!filterSquad.value && sprint.squadId) {
						const squad = config.value.squads.find(s => s.id === sprint.squadId)
						key = squad ? `${squad.name} : ${sprint.name}` : sprint.name
					} else {
						key = sprint.name
					}
				} else {
					key = 'Sprint Desconhecida'
				}
			} else {
				key = 'Não Planejado'
			}
		}
		if (!groups[key]) groups[key] = []
		groups[key].push(task)
	})

	return Object.keys(groups)
		.sort()
		.map(key => ({ id: key, title: key, tasks: groups[key] }))
})

const timelineDates = computed(() => {
	const start = visibleDateRange.value.start
	return Array.from({ length: totalProjectDays.value }, (_, i) => {
		const date = addDays(start, i)
		const dateString = format(date, 'yyyy-MM-dd')
		const isToday = isSameDay(date, new Date())
		return {
			date,
			label: format(date, 'dd', { locale: ptBR }),
			dayName: format(date, 'EEE', { locale: ptBR }).replace('.', '').toUpperCase(),
			fullDate: format(date, 'dd/MM/yyyy'),
			isWeekend: isWeekend(date),
			isHoliday: config.value.holidays.includes(dateString),
			isToday,
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

const dependencyLines = computed(() => {
	const lines: { path: string; isCritical: boolean }[] = []
	if (groupBy.value !== 'none') return []

	const taskMap = new Map<string, { index: number; task: Task }>()
	filteredTasks.value.forEach((t, i) => taskMap.set(t.id, { index: i, task: t }))

	filteredTasks.value.forEach((task, idx) => {
		if (task.dependencyId && taskMap.has(task.dependencyId)) {
			const parent = taskMap.get(task.dependencyId)!
			const viewStart = visibleDateRange.value.start
			const parentOffset = differenceInCalendarDays(parent.task.startDate!, viewStart)
			const parentX = (parentOffset + (parent.task.isMilestone ? 1 : parent.task.calendarDuration || 1)) * cellWidth.value
			const parentY = parent.index * 40 + 20
			const currentOffset = differenceInCalendarDays(task.startDate!, viewStart)
			const childX = currentOffset * cellWidth.value
			const childY = idx * 40 + 20

			const gap = 15
			const path = `M ${parentX} ${parentY} L ${parentX + gap} ${parentY} L ${parentX + gap} ${childY} L ${childX} ${childY}`
			const isCritical = criticalPathIds.value.includes(task.id) && criticalPathIds.value.includes(parent.task.id)
			lines.push({ path, isCritical })
		}
	})
	return lines
})

const getInitials = (name: string) =>
	name
		? name
				.split(' ')
				.map(n => n[0])
				.slice(0, 2)
				.join('')
				.toUpperCase()
		: '?'

const isOverloaded = (task: Task) => {
	if (task.isMilestone) return false
	if (!task.effort || !task.duration || task.isCompleted) return false
	const member = config.value.teamMembers.find(m => m.name === task.responsible)
	const capacity = member ? member.capacity : 8
	return task.effort > task.duration * capacity
}
</script>

<template>
	<div class="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col h-full select-none transition-colors duration-300">
		<GanttToolbar v-model:group-by="groupBy" v-model:show-critical-path="showCriticalPath" @optimize="handleOptimize" />

		<GanttFilters />

		<div ref="ganttContainer" class="overflow-x-auto flex-1 relative custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
			<div :style="{ width: containerWidth + 'px' }" class="relative min-h-[400px]">
				<div class="sticky top-0 z-20 shadow-sm">
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
								'bg-blue-100/50 dark:bg-blue-900/30 text-blue-600': day.isToday,
								'bg-white dark:bg-slate-800': !day.isWeekend && !day.isHoliday && !day.isToday,
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
							:class="{ 'bg-purple-50/40 dark:bg-purple-900/10': day.isHoliday, 'bg-red-50/30 dark:bg-red-900/10': day.isWeekend && !day.isHoliday, 'bg-blue-50/20': day.isToday }"
							:style="{ width: cellWidth + 'px' }"
						></div>
					</div>

					<svg class="absolute inset-0 pointer-events-none z-0" :width="containerWidth" :height="filteredTasks.length * 40 + 50" style="overflow: visible">
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

					<div class="py-2 space-y-1 relative z-10">
						<div v-for="group in groupedTasks" :key="group.id">
							<div
								v-if="groupBy !== 'none'"
								class="sticky left-0 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm border-y border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 z-10 my-2"
							>
								<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
								{{ group.title }}
								<span class="ml-auto text-[9px] bg-slate-200 dark:bg-slate-700 px-1.5 rounded text-slate-500">{{ group.tasks.length }}</span>
							</div>

							<div v-for="task in group.tasks" :key="task.id" class="relative h-10 flex items-center group">
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
										'rotate-45 !w-5 !h-5 !rounded-sm !p-0 justify-center ml-2.5': task.isMilestone,
									}"
									@mousedown="e => onTaskMouseDown(e, task)"
									:style="getTaskStyle(task)"
								>
									<span v-if="!task.isMilestone" class="truncate font-medium drop-shadow-md flex items-center gap-2" :class="{ 'line-through text-white/80': task.isCompleted }">
										{{ task.name }}
										<span v-if="isOverloaded(task)" class="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 rounded-full px-1 text-[9px] font-bold">⚠️</span>
										<span v-if="task.isCompleted" class="bg-green-500 text-white rounded-full px-1 text-[9px] font-bold">✓</span>
									</span>
									<div v-if="task.responsible && !task.isMilestone" class="absolute right-1 top-0.5 w-5 h-5 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-[9px] font-bold border border-white/40 shadow-sm">
										{{ getInitials(task.responsible) }}
									</div>
								</div>

								<span v-if="task.isMilestone" class="absolute text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap ml-2 z-20 pointer-events-none" :style="{ left: (parseInt(getTaskStyle(task).left as string) + 25) + 'px' }">
									{{ task.name }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<OptimizationModal :is-open="showOptimizationModal" :results="optimizationResults" @close="showOptimizationModal = false" />
	</div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
	height: 8px;
	width: 8px;
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
