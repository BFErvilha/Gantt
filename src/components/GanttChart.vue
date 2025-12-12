<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useGantt } from '@/composables/useGantt'
import type { Task } from '@/types/gantt'
import { format, addDays, startOfWeek, endOfWeek, differenceInCalendarDays, isWeekend } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const {
	filteredTasks,
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
	tasksSnapshot,
} = useGantt()

const showCriticalPath = ref(false)
const showRiskModal = ref(false)
const ganttContainer = ref<HTMLDivElement | null>(null)
const containerWidthPx = ref(0)
const groupBy = ref<'none' | 'responsible' | 'sprint'>('none')

const isDragging = ref(false)
const draggingTaskId = ref<string | null>(null)
const dragStartX = ref(0)
const dragCurrentX = ref(0)

const showOptimizationModal = ref(false)
const optimizationResults = ref<string[]>([])

const handleOptimize = () => {
	if (!tasksSnapshot.value) {
		createSnapshot()
	}
	optimizationResults.value = getOptimizationSuggestions()
	showOptimizationModal.value = true
}

const handleUndo = () => {
	if (confirm('Deseja descartar todas as alterações atuais e voltar para o ponto salvo?')) {
		restoreSnapshot()
	}
}

const handleCreateBackup = () => {
	createSnapshot()
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
		return {
			date,
			label: format(date, 'dd', { locale: ptBR }),
			dayName: format(date, 'EEE', { locale: ptBR }).replace('.', '').toUpperCase(),
			fullDate: format(date, 'dd/MM/yyyy'),
			isWeekend: isWeekend(date),
			isHoliday: config.value.holidays.includes(dateString),
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
						<button @click="groupBy = 'none'" class="px-2 py-1 text-[10px] uppercase font-bold rounded" :class="groupBy === 'none' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'">Lista</button>
						<button @click="groupBy = 'responsible'" class="px-2 py-1 text-[10px] uppercase font-bold rounded" :class="groupBy === 'responsible' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'">Pessoa</button>
						<button @click="groupBy = 'sprint'" class="px-2 py-1 text-[10px] uppercase font-bold rounded" :class="groupBy === 'sprint' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'">Sprint</button>
					</div>

					<div class="flex items-center gap-1">
						<button @click="handleCreateBackup" class="p-1.5 rounded-lg border transition-all text-xs font-bold text-slate-500 border-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-700" title="Salvar Estado Atual (Backup)">
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
							</svg>
						</button>

						<button
							v-if="tasksSnapshot"
							@click="handleUndo"
							class="p-1.5 rounded-lg border transition-all text-xs font-bold bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
							title="Desfazer Alterações (Restaurar Backup)"
						>
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
							</svg>
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
