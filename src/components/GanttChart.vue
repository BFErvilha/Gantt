<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useGantt, type Task, type SprintCloseDecision } from '@/composables/useGantt'
import { format, addDays, startOfWeek, endOfWeek, differenceInCalendarDays, isWeekend, parseISO, isValid, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import SprintCloseModal from './SprintCloseModal.vue'

const {
	filteredTasks,
	tasks,
	config,
	totalProjectDays,
	setEditingTask,
	editingTask,
	criticalPathIds,
	viewMode,
	visibleDateRange,
	setViewMode,
	navigateView,
	currentViewDate,
	filterSearch,
	filterResponsible,
	filterType,
	filterSquad,
	moveTask,
	automaticRisks,
	getOptimizationSuggestions,
	createSnapshot,
	restoreSnapshot,
	tasksSnapshotCount,
	lastCascadeReport,
	clearCascadeReport,
	sprintsAwaitingClose,
	closeSprint,
	isTaskLocked,
	isSprintClosed,
} = useGantt()

const showCriticalPath = ref(false)
const showRiskModal = ref(false)
const ganttContainer = ref<HTMLDivElement | null>(null)

// Sprint close modal
const showSprintCloseModal = ref(false)
const sprintToClose = ref<(typeof sprintsAwaitingClose.value)[0] | null>(null)

const sprintTasksToClose = computed(() => {
	if (!sprintToClose.value) return []
	return tasks.value.filter(t => t.sprintId === sprintToClose.value!.id && t.status !== 'cancelled')
})

const futureSprintsForClose = computed(() => {
	if (!sprintToClose.value) return []
	const squadId = sprintToClose.value.squadId
	const squad = config.value.squads.find(s => s.id === squadId)
	if (!squad) return []
	return squad.sprints.filter(sp => !sp.closedAt && sp.id !== sprintToClose.value!.id && sp.startDate > sprintToClose.value!.endDate)
})

const openSprintClose = (sprint: (typeof sprintsAwaitingClose.value)[0]) => {
	sprintToClose.value = sprint
	showSprintCloseModal.value = true
}

const handleSprintCloseConfirm = (decisions: SprintCloseDecision[]) => {
	if (!sprintToClose.value) return
	closeSprint(sprintToClose.value.id, decisions)
	showSprintCloseModal.value = false
	sprintToClose.value = null
}

const handleSprintCloseCancel = () => {
	showSprintCloseModal.value = false
	sprintToClose.value = null
}
const containerWidthPx = ref(0)
const groupBy = ref<'none' | 'responsible' | 'sprint' | 'chain'>('none')
const viewLayout = ref<'gantt' | 'board'>('gantt')

// Cascade feedback panel
const cascadePanel = ref<{ id: string; name: string; deltaDays: number }[]>([])
const isCascadeUndo = ref(false)
const cascadeUndoCount = ref(0)
let cascadeTimer: ReturnType<typeof setTimeout> | null = null
let cascadeUndoTimer: ReturnType<typeof setTimeout> | null = null

watch(lastCascadeReport, (report) => {
	if (report.length === 0) return
	cascadePanel.value = [...report]
	isCascadeUndo.value = true
	cascadeUndoCount.value = report.length
	clearCascadeReport()
	if (cascadeTimer) clearTimeout(cascadeTimer)
	cascadeTimer = setTimeout(() => { cascadePanel.value = [] }, 8000)
	if (cascadeUndoTimer) clearTimeout(cascadeUndoTimer)
	cascadeUndoTimer = setTimeout(() => { isCascadeUndo.value = false }, 5000)
})

const dismissCascadePanel = () => {
	cascadePanel.value = []
	if (cascadeTimer) clearTimeout(cascadeTimer)
}

const boardColumns = computed(() => [
	{ id: 'new', label: 'A Fazer', dotClass: 'bg-slate-400', headerClass: 'text-slate-700 dark:text-slate-200', countClass: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300', tasks: filteredTasks.value.filter(t => t.status === 'new') },
	{ id: 'active', label: 'Em Andamento', dotClass: 'bg-blue-400', headerClass: 'text-blue-700 dark:text-blue-300', countClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300', tasks: filteredTasks.value.filter(t => t.status === 'active') },
	{ id: 'completed', label: 'Concluído', dotClass: 'bg-green-400', headerClass: 'text-green-700 dark:text-green-300', countClass: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300', tasks: filteredTasks.value.filter(t => t.status === 'completed') },
])

const groupTasksByUs = (tasks: Task[]) => {
	const groups = new Map<string, Task[]>()
	tasks.forEach(t => {
		const key = t.usId || `_solo_${t.id}`
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key)!.push(t)
	})
	return Array.from(groups.entries()).map(([key, items]) => ({
		usId: key.startsWith('_solo_') ? '' : key,
		tasks: items,
	}))
}

const getSprintName = (sprintId: string): string => {
	for (const squad of config.value.squads) {
		const s = squad.sprints.find(sp => sp.id === sprintId)
		if (s) return s.name
	}
	return ''
}

const typeColorClass = (type: string): string => {
	const map: Record<string, string> = {
		frontend: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
		backend: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
		qualidade: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
		other: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
	}
	return map[type] || map.other
}

const typeLabel = (type: string): string =>
	({ frontend: 'Front', backend: 'Back', qualidade: 'QA', other: 'Outro' } as Record<string, string>)[type] || type

const jumpToToday = () => {
	currentViewDate.value = startOfDay(new Date())
	if (viewMode.value === 'project') setViewMode('month')
}

const jumpToProjectStart = () => {
	const d = parseISO(config.value.projectStartDate)
	if (isValid(d)) {
		currentViewDate.value = startOfDay(d)
		if (viewMode.value === 'project') setViewMode('month')
	}
}

const jumpToCurrentSprint = () => {
	const today = startOfDay(new Date())
	const projectStart = parseISO(config.value.projectStartDate)
	if (!isValid(projectStart)) return
	const offsetDays = differenceInCalendarDays(today, projectStart)
	if (offsetDays > 0 && ganttContainer.value) {
		const scrollTarget = offsetDays * cellWidth.value - ganttContainer.value.clientWidth / 3
		ganttContainer.value.scrollLeft = Math.max(0, scrollTarget)
	}
}

const isDragging = ref(false)
const draggingTaskId = ref<string | null>(null)
const dragStartX = ref(0)
const dragCurrentX = ref(0)

const showOptimizationModal = ref(false)
const optimizationResults = ref<string[]>([])

const handleOptimize = () => {
	if (tasksSnapshotCount.value === 0) {
		createSnapshot()
	}
	optimizationResults.value = getOptimizationSuggestions()
	showOptimizationModal.value = true
}

const handleUndo = () => {
	restoreSnapshot()
}

const handleCreateBackup = () => {
	createSnapshot()
}

const onTaskMouseDown = (e: MouseEvent, task: Task) => {
	if (e.button !== 0 || viewMode.value === 'month') return
	if (isTaskLocked(task)) {
		// Locked tasks: click opens modal in read-only mode, no drag
		setEditingTask(task)
		return
	}
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
		jumpToCurrentSprint()
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
				const sprint = config.value.squads.flatMap(s => s.sprints).find(s => s.id === task.sprintId)
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

	if (groupBy.value === 'chain') {
		const sorted: Task[] = []
		const addedIds = new Set<string>()
		const taskMap = new Map(filteredTasks.value.map(t => [t.id, t]))
		const addChain = (task: Task) => {
			if (addedIds.has(task.id)) return
			if (task.dependencyId && taskMap.has(task.dependencyId) && !addedIds.has(task.dependencyId)) {
				addChain(taskMap.get(task.dependencyId)!)
			}
			if (!addedIds.has(task.id)) {
				addedIds.add(task.id)
				sorted.push(task)
			}
		}
		filteredTasks.value.forEach(t => addChain(t))
		return [{ id: 'all', title: '', tasks: sorted }]
	}

	return Object.keys(groups)
		.sort()
		.map(key => ({
			id: key,
			title: key,
			tasks: groups[key],
		}))
})

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

const timelineDates = computed(() => {
	const start = visibleDateRange.value.start
	return Array.from({ length: totalProjectDays.value }, (_, i) => {
		const date = addDays(start, i)
		const dateString = format(date, 'yyyy-MM-dd')

		const sprint = config.value.squads.flatMap(s => s.sprints).find(s => dateString >= s.startDate && dateString <= s.endDate)

		const isSprintEvent = sprint ? [sprint.planningDate, sprint.refinementDate, sprint.reviewDate, sprint.retroDate].includes(dateString) : false

		return {
			date,
			label: format(date, 'dd', { locale: ptBR }),
			dayName: format(date, 'EEE', { locale: ptBR }).replace('.', '').toUpperCase(),
			fullDate: format(date, 'dd/MM/yyyy'),
			isWeekend: isWeekend(date),
			isHoliday: config.value.holidays.includes(dateString) || (filterSquad.value ? config.value.squads.find(s => s.id === filterSquad.value)?.holidays.includes(dateString) : false),
			isEvent: isSprintEvent,
			eventTitle: isSprintEvent ? 'Rito da Sprint (Dia não produtivo)' : '',
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
	if (groupBy.value !== 'none' && groupBy.value !== 'chain') return []

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
const clearFilters = () => {
	filterSearch.value = ''
	filterResponsible.value = ''
	filterType.value = ''
}
const hasFilters = computed(() => filterSearch.value || filterResponsible.value || filterType.value)

const tooltipData = ref<{ task: Task | null; x: number; y: number }>({
	task: null,
	x: 0,
	y: 0,
})

const showTooltip = (e: MouseEvent, task: Task) => {
	tooltipData.value = {
		task,
		x: e.clientX + 15,
		y: e.clientY + 15,
	}
}

const hideTooltip = () => {
	tooltipData.value.task = null
}
</script>

<template>
	<div class="relative bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col h-full select-none transition-colors duration-300">
		<div class="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col gap-3 z-30 relative shadow-sm">
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

				<div class="relative z-30 flex items-center gap-2 flex-shrink-0 overflow-x-auto">
					<div class="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1 border border-slate-200 dark:border-slate-600 flex-shrink-0">
						<button @click="viewLayout = 'gantt'; groupBy = 'none'" class="px-2 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1" :class="viewLayout === 'gantt' && groupBy === 'none' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'">
							<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
							Lista
						</button>
						<button @click="viewLayout = 'gantt'; groupBy = 'responsible'" class="px-2 py-1 text-[10px] uppercase font-bold rounded" :class="viewLayout === 'gantt' && groupBy === 'responsible' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'">Pessoa</button>
						<button @click="viewLayout = 'gantt'; groupBy = 'sprint'" class="px-2 py-1 text-[10px] uppercase font-bold rounded" :class="viewLayout === 'gantt' && groupBy === 'sprint' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'">Sprint</button>
						<button @click="viewLayout = 'gantt'; groupBy = 'chain'" class="px-2 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1" :class="viewLayout === 'gantt' && groupBy === 'chain' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'" title="Agrupa tarefas vinculadas próximas">
							<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
							Fluxo
						</button>
						<button data-tour="board-btn" @click="viewLayout = 'board'; groupBy = 'none'" class="px-2 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1" :class="viewLayout === 'board' ? 'bg-indigo-600 shadow-sm text-white' : 'text-slate-400 hover:text-slate-600'" title="Visão estilo board (Kanban)">
							<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>
							Board
						</button>
					</div>

					<div class="flex items-center gap-1">
						<button @click="handleCreateBackup" class="p-1.5 rounded-lg border transition-all text-xs font-bold text-slate-500 border-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-700" title="Salvar Estado Atual (Backup)">
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
							</svg>
						</button>

						<button
							v-if="tasksSnapshotCount > 0"
							@click="handleUndo"
							class="flex items-center gap-1 p-1.5 rounded-lg border transition-all text-xs font-bold"
							:class="isCascadeUndo
								? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700'
								: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'"
							:title="isCascadeUndo ? `Desfazer cascata (${cascadeUndoCount} tarefas afetadas)` : `Desfazer (${tasksSnapshotCount} passo(s))`"
						>
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
							</svg>
							<span v-if="isCascadeUndo" class="text-[10px] font-black whitespace-nowrap">cascata ({{ cascadeUndoCount }})</span>
							<span v-else class="text-[10px] font-black">{{ tasksSnapshotCount }}</span>
						</button>

						<button @click="handleOptimize" class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100">
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
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
							<div class="max-h-60 overflow-y-auto p-2 custom-scrollbar">
								<ul class="space-y-1">
									<li v-for="(risk, idx) in automaticRisks" :key="idx" class="text-[10px] p-2 rounded bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-900/30">{{ risk }}</li>
								</ul>
								<div v-if="automaticRisks.length === 0" class="text-center p-4 text-slate-400 text-xs">Sem riscos.</div>
							</div>
						</div>
					</div>

					<button
						@click="showCriticalPath = !showCriticalPath"
						class="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-bold"
						:class="showCriticalPath ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 border-slate-200 hover:bg-slate-100'"
					>
						<span class="relative flex h-2 w-2"
							><span v-if="showCriticalPath" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2" :class="showCriticalPath ? 'bg-red-500' : 'bg-slate-400'"></span
						></span>
						<span class="hidden md:inline">Caminho Crítico</span>
					</button>
				</div>
			</div>

			<!-- Sprint close notification bar — full width, always visible when sprint is closeable -->
			<Transition name="fade">
				<div v-if="sprintsAwaitingClose.length > 0" class="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border"
					:class="sprintsAwaitingClose.some(s => s.isPast)
						? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800'
						: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'"
				>
					<span class="relative flex h-2 w-2 flex-shrink-0">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
							:class="sprintsAwaitingClose.some(s => s.isPast) ? 'bg-amber-400' : 'bg-blue-400'"></span>
						<span class="relative inline-flex rounded-full h-2 w-2"
							:class="sprintsAwaitingClose.some(s => s.isPast) ? 'bg-amber-500' : 'bg-blue-500'"></span>
					</span>
					<p class="text-xs font-medium flex-1 min-w-0"
						:class="sprintsAwaitingClose.some(s => s.isPast) ? 'text-amber-800 dark:text-amber-300' : 'text-blue-800 dark:text-blue-300'"
					>
						{{ sprintsAwaitingClose.length === 1
							? `${sprintsAwaitingClose[0].name} — ${sprintsAwaitingClose[0].isPast ? 'encerramento pendente' : 'em andamento · pode ser encerrada'}`
							: `${sprintsAwaitingClose.length} sprints disponíveis para encerramento` }}
					</p>
					<div class="flex gap-2 flex-shrink-0 flex-wrap">
						<button
							v-for="sp in sprintsAwaitingClose" :key="sp.id"
							@click="openSprintClose(sp)"
							class="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg text-white transition-colors whitespace-nowrap"
							:class="sp.isPast ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-500 hover:bg-blue-600'"
						>
							<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
							</svg>
							{{ sprintsAwaitingClose.length > 1 ? sp.name : 'Encerrar Sprint' }}
						</button>
					</div>
				</div>
			</Transition>

			<div v-if="viewLayout === 'gantt'" class="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 overflow-x-auto">
				<label class="text-[9px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap">Início do projeto:</label>
				<input
					type="date"
					v-model="config.projectStartDate"
					class="text-xs rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 h-7 px-2 dark:[color-scheme:dark] focus:ring-1 focus:ring-blue-400 outline-none cursor-pointer"
				/>
				<button @click="jumpToProjectStart" class="h-7 px-2.5 text-[10px] font-bold rounded border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors whitespace-nowrap flex items-center gap-1" title="Ir para início do projeto">
					<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
					Início
				</button>
				<button @click="jumpToToday" class="h-7 px-2.5 text-[10px] font-bold rounded border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 transition-colors whitespace-nowrap">
					Hoje
				</button>
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
						<option value="">Todos Resp.</option>
						<option v-for="member in config.teamMembers" :key="member.name" :value="member.name">{{ member.name }}</option>
					</select>
					<select
						v-model="filterType"
						class="flex-1 lg:flex-none py-1.5 pl-2 pr-6 text-xs rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						<option value="">Todos Tipos</option>
						<option value="frontend">Front</option>
						<option value="backend">Back</option>
						<option value="qualidade">QA</option>
						<option value="other">Outro</option>
					</select>
				</div>
				<button v-if="hasFilters" @click="clearFilters" class="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 flex items-center gap-1">
					<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg> Limpar
				</button>
			</div>
		</div>

		<!-- Board View -->
		<div v-if="viewLayout === 'board'" class="flex gap-4 p-4 overflow-x-auto flex-1 bg-slate-50 dark:bg-slate-900/50 custom-scrollbar">
			<div v-for="col in boardColumns" :key="col.id" class="flex-shrink-0 w-72 flex flex-col gap-3">
				<!-- Column header -->
				<div class="flex items-center gap-2 px-1">
					<span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="col.dotClass"></span>
					<h3 class="font-bold text-sm" :class="col.headerClass">{{ col.label }}</h3>
					<span class="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" :class="col.countClass">{{ col.tasks.length }}</span>
				</div>
				<div class="h-0.5 w-full rounded-full" :class="{ 'bg-slate-200 dark:bg-slate-700': col.id === 'todo', 'bg-blue-200 dark:bg-blue-800': col.id === 'doing', 'bg-green-200 dark:bg-green-800': col.id === 'done' }"></div>

				<!-- Task cards -->
				<div class="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
					<template v-for="group in groupTasksByUs(col.tasks)" :key="group.usId || (group.tasks[0] && group.tasks[0].id)">
						<!-- US group: multiple tasks sharing the same usId -->
						<div v-if="group.tasks.length > 1 && group.usId" class="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
							<div class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
								<span class="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{{ group.usId }}</span>
								<span class="text-[9px] text-slate-400">{{ group.tasks.length }} tarefas vinculadas</span>
							</div>
							<div class="divide-y divide-slate-100 dark:divide-slate-700/50">
								<div
									v-for="(task, ti) in group.tasks"
									:key="task.id"
									class="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group/card"
									@click="setEditingTask(task)"
								>
									<div class="flex items-center gap-2 mb-1.5">
										<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" :class="typeColorClass(task.type)">{{ typeLabel(task.type) }}</span>
										<span v-if="ti > 0 && task.dependencyId" class="text-[9px] text-amber-500 flex items-center gap-0.5">
											<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
										</span>
										<div v-if="task.responsible" class="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" :style="{ backgroundColor: task.color }">{{ getInitials(task.responsible) }}</div>
									</div>
									<p class="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">{{ task.name }}</p>
								</div>
							</div>
						</div>

						<!-- Single task card -->
						<div
							v-else
							v-for="task in group.tasks"
							:key="task.id"
							class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group/card"
							:style="{ borderTopColor: task.color, borderTopWidth: '3px' }"
							@click="setEditingTask(task)"
						>
							<div class="flex items-center justify-between mb-2">
								<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" :class="typeColorClass(task.type)">{{ typeLabel(task.type) }}</span>
								<span v-if="task.usId" class="text-[9px] text-slate-400 font-mono font-bold">{{ task.usId }}</span>
							</div>
							<p class="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 leading-tight">{{ task.name }}</p>
							<div class="flex items-center gap-2 mt-1">
								<span v-if="task.sprintId" class="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded truncate max-w-[120px]">{{ getSprintName(task.sprintId) }}</span>
								<span v-if="task.dependencyId" class="text-amber-500 flex items-center" title="Tem dependência">
									<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
								</span>
								<div v-if="task.responsible" class="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" :style="{ backgroundColor: task.color }">{{ getInitials(task.responsible) }}</div>
							</div>
						</div>
					</template>

					<div v-if="col.tasks.length === 0" class="text-center py-10 text-slate-300 dark:text-slate-600 text-xs italic">Nenhuma tarefa</div>
				</div>
			</div>
		</div>

		<!-- Gantt View -->
		<div v-else ref="ganttContainer" class="overflow-x-auto flex-1 relative custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
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
								'bg-blue-100/50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300': day.isEvent,
								'bg-red-50/50 dark:bg-red-900/20 text-red-300 dark:text-red-400': day.isWeekend && !day.isHoliday && !day.isEvent,
								'bg-white dark:bg-slate-800': !day.isWeekend && !day.isHoliday && !day.isEvent,
							}"
							:style="{ width: cellWidth + 'px' }"
							:title="day.isEvent ? day.eventTitle : day.fullDate"
						>
							<span class="font-bold">{{ day.label }}</span>
							<span class="text-[8px] uppercase">{{ day.dayName }}</span>
						</div>

						<div class="absolute inset-0 flex pointer-events-none">
							<div
								v-for="(day, index) in timelineDates"
								:key="index"
								class="border-r border-slate-200/50 dark:border-slate-700/50 h-full box-border"
								:class="{
									'bg-purple-50/40 dark:bg-purple-900/10': day.isHoliday,
									'bg-blue-50/30 dark:bg-blue-900/10': day.isEvent,
									'bg-red-50/30 dark:bg-red-900/10': day.isWeekend && !day.isHoliday && !day.isEvent,
								}"
								:style="{ width: cellWidth + 'px' }"
							></div>
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

					<!-- Empty state educativo -->
					<div v-if="filteredTasks.length === 0" class="flex flex-col items-center justify-center py-16 px-8 text-center sticky left-0">
						<div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
							<svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>
						</div>
						<h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Nenhuma tarefa ainda</h3>
						<p class="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed mb-4">
							Crie pelo menos 2 tarefas e vincule-as por dependência. Quando uma atrasar, as seguintes avançam automaticamente.
						</p>
						<div class="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/60 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
							<svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
							<span>Tarefa A</span>
							<svg class="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
							<span>Tarefa B</span>
							<svg class="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
							<span>Tarefa C</span>
						</div>
					</div>

					<div class="py-2 space-y-1 relative z-10">
						<div v-for="group in groupedTasks" :key="group.id">
							<div
								v-if="groupBy !== 'none' && groupBy !== 'chain'"
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
										'border-2 border-amber-400': isOverloaded(task) && !isTaskLocked(task),
										'ring-2 ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] z-20': showCriticalPath && criticalPathIds.includes(task.id),
										'opacity-60': task.isCompleted,
										'opacity-40 grayscale': isTaskLocked(task),
										'shadow-lg scale-[1.02]': isDragging && draggingTaskId === task.id,
										'rotate-45 !w-5 !h-5 !rounded-sm !p-0 justify-center ml-2.5': task.isMilestone,
										'!cursor-default': isTaskLocked(task),
										'!opacity-25 !grayscale': task.status === 'cancelled',
									}"
									@mousedown="e => onTaskMouseDown(e, task)"
									@mouseenter="e => showTooltip(e, task)"
									@mouseleave="hideTooltip"
									@mousemove="e => showTooltip(e, task)"
									:style="getTaskStyle(task)"
								>
									<div v-if="!task.isMilestone && (task.progress ?? 0) > 0" class="absolute bottom-0 left-0 h-1 rounded-b-md bg-white/40" :style="{ width: (task.progress ?? 0) + '%' }"></div>
									<span v-if="!task.isMilestone && (task.calendarDuration || 1) * cellWidth >= 60" class="truncate font-medium drop-shadow-md flex items-center gap-1">
										<span v-if="task.usId && (task.calendarDuration || 1) * cellWidth >= 90" class="font-bold opacity-80">[{{ task.usId }}]</span>
										<span class="truncate">{{ task.name }}</span>
										<span v-if="isOverloaded(task)">⚠️</span>
									</span>

									<div v-if="task.responsible && !task.isMilestone" class="absolute right-1 top-0.5 w-5 h-5 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-[9px] font-bold border border-white/40">
										{{ getInitials(task.responsible) }}
									</div>
								</div>
							</div>

							<Teleport to="body">
								<Transition name="fade">
									<div
										v-if="tooltipData.task"
										class="fixed z-[999] pointer-events-none bg-white dark:bg-slate-800 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-700 p-4 min-w-[220px] backdrop-blur-md bg-opacity-90 dark:bg-opacity-90"
										:style="{ left: tooltipData.x + 'px', top: tooltipData.y + 'px' }"
									>
										<div class="flex items-start justify-between mb-2 gap-4">
											<span class="text-[10px] font-black uppercase px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full">
												{{ tooltipData.task.usId || 'SEM ID' }}
											</span>
											<span class="text-[10px] font-bold text-slate-400">
												{{ tooltipData.task.type?.toUpperCase() }}
											</span>
										</div>

										<h4 class="text-sm font-bold text-slate-800 dark:text-white mb-3 leading-tight">
											{{ tooltipData.task.name }}
										</h4>

										<div class="space-y-2 border-t border-slate-100 dark:border-slate-700 pt-2">
											<div class="flex items-center justify-between text-[11px]">
												<span class="text-slate-500 dark:text-slate-400">Responsável:</span>
												<span class="font-bold text-slate-700 dark:text-slate-200">{{ tooltipData.task.responsible || 'Não atribuído' }}</span>
											</div>
											<div class="flex items-center justify-between text-[11px]">
												<span class="text-slate-500 dark:text-slate-400">Esforço:</span>
												<span class="font-bold text-slate-700 dark:text-slate-200">{{ tooltipData.task.effort || 0 }}h</span>
											</div>
											<div class="flex items-center justify-between text-[11px]">
												<span class="text-slate-500 dark:text-slate-400">Período:</span>
												<span class="font-bold text-blue-600 dark:text-blue-400">{{ tooltipData.task.formattedStartDate }} - {{ tooltipData.task.formattedEndDate }}</span>
											</div>
											<div v-if="!tooltipData.task.isMilestone" class="text-[11px]">
												<div class="flex justify-between mb-1">
													<span class="text-slate-500 dark:text-slate-400">Progresso:</span>
													<span class="font-bold text-slate-700 dark:text-slate-200">{{ tooltipData.task.progress ?? 0 }}%</span>
												</div>
												<div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
													<div
														class="h-full rounded-full transition-all"
														:class="(tooltipData.task.progress ?? 0) === 100 ? 'bg-green-500' : 'bg-blue-500'"
														:style="{ width: (tooltipData.task.progress ?? 0) + '%' }"
													></div>
												</div>
											</div>
										</div>

										<div v-if="isOverloaded(tooltipData.task)" class="mt-3 p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">⚠️ Sobrecarga de Horas</div>
									</div>
								</Transition>
							</Teleport>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div v-if="showOptimizationModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
			<div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
				<div class="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20">
					<h3 class="font-bold text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
						Sugestões de Otimização de Sprint
					</h3>
					<button @click="showOptimizationModal = false" class="text-slate-400 hover:text-slate-600">&times;</button>
				</div>
				<div class="p-6 overflow-y-auto custom-scrollbar space-y-4">
					<p class="text-sm text-slate-600 dark:text-slate-300">Analisamos as prioridades (Meta > Item), dependências e capacidade da equipe para sugerir a melhor ordem de execução:</p>

					<div v-if="optimizationResults.length > 0" class="space-y-2">
						<div
							v-for="(msg, idx) in optimizationResults"
							:key="idx"
							class="p-3 rounded border text-sm flex gap-3 items-start"
							:class="
								msg.includes('PRIORIDADE')
									? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200'
									: msg.includes('SOBRECARGA')
									? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
									: msg.includes('SEQUÊNCIA')
									? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
									: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
							"
						>
							<span class="text-xl mt-[-2px]">{{ msg.includes('PRIORIDADE') ? '⚡' : msg.includes('SOBRECARGA') ? '⚠️' : msg.includes('SEQUÊNCIA') ? '🔢' : '✅' }}</span>
							<span>{{ msg }}</span>
						</div>
					</div>
				</div>
				<div class="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
					<button @click="showOptimizationModal = false" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-sm">Entendido</button>
				</div>
			</div>
		</div>

		<!-- Cascade feedback panel -->
		<Transition name="cascade-slide">
			<div
				v-if="cascadePanel.length > 0"
				class="absolute bottom-0 left-0 right-0 z-30 bg-amber-50 dark:bg-amber-950/95 border-t border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center gap-3 shadow-lg"
			>
				<svg class="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
				<span class="text-xs text-amber-800 dark:text-amber-200 font-medium flex-1 min-w-0">
					<span class="font-bold">Cascata:</span>
					<template v-for="(t, idx) in cascadePanel.slice(0, 3)" :key="t.id">
						<button
							@click="setEditingTask(filteredTasks.find(ft => ft.id === t.id) ?? filteredTasks[0])"
							class="underline mx-1 font-semibold hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
						>{{ t.name }}</button>
						<span class="text-amber-600 dark:text-amber-400 font-bold">{{ t.deltaDays > 0 ? '+' : '' }}{{ t.deltaDays }}d</span>
						<span v-if="idx < Math.min(cascadePanel.length, 3) - 1" class="mx-0.5">·</span>
					</template>
					<span v-if="cascadePanel.length > 3" class="text-amber-600 dark:text-amber-500 ml-1">+{{ cascadePanel.length - 3 }} tarefas</span>
				</span>
				<button
					@click="handleUndo(); dismissCascadePanel()"
					class="flex-shrink-0 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 transition-colors whitespace-nowrap"
				>
					↩ Desfazer
				</button>
				<button @click="dismissCascadePanel" class="flex-shrink-0 text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 transition-colors p-0.5">
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
		</Transition>
	</div>

	<!-- Sprint Close Modal -->
	<SprintCloseModal
		:open="showSprintCloseModal"
		:sprint="sprintToClose"
		:tasks="sprintTasksToClose"
		:future-sprints-for-squad="futureSprintsForClose"
		@confirm="handleSprintCloseConfirm"
		@cancel="handleSprintCloseCancel"
	/>
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
.animate-fade-in {
	animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
	from { opacity: 0; transform: translateY(5px); }
	to { opacity: 1; transform: translateY(0); }
}
.cascade-slide-enter-active,
.cascade-slide-leave-active {
	transition: transform 0.25s ease, opacity 0.25s ease;
}
.cascade-slide-enter-from,
.cascade-slide-leave-to {
	transform: translateY(100%);
	opacity: 0;
}
</style>
