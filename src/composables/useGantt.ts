import { ref, computed, watch } from 'vue'
import { addDays, format, startOfDay, differenceInCalendarDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, addWeeks, isValid } from 'date-fns'
import { useToast } from './useToast'
import { useGanttState } from './useGanttState'
import { useGanttCalculations } from './useGanttCalculations'
import { useTaskOperations } from './useTaskOperations'
import { useProjectOperations } from './useProjectOperations'
import type { Task, ViewMode } from '../types/gantt'

const editingTask = ref<Task | null>(null)
const tasksSnapshot = ref<string | null>(null)
const isTaskModalOpen = ref(false)
const viewMode = ref<ViewMode>('project')

const filterSearch = ref('')
const filterResponsible = ref('')
const filterType = ref('')
const filterSquad = ref('')

const currentViewDate = ref<Date>(new Date())

export function useGantt() {
	const toast = useToast()

	const { tasks, config } = useGanttState()
	const calculations = useGanttCalculations()
	const taskOps = useTaskOperations()
	const projectOps = useProjectOperations()

	watch(
		() => config.value.projectStartDate,
		newDate => {
			if (newDate && isValid(parseISO(newDate))) {
				currentViewDate.value = startOfDay(new Date(newDate))
			}
		},
		{ immediate: true },
	)

	const filteredTasks = computed(() => {
		return calculations.computedTasks.value.filter(task => {
			const matchName = task.name.toLowerCase().includes(filterSearch.value.toLowerCase())
			const matchResponsible = filterResponsible.value ? task.responsible === filterResponsible.value : true
			const matchType = filterType.value ? task.type === filterType.value : true
			let matchSquad = true

			if (filterSquad.value) {
				if (task.sprintId) {
					const sprint = calculations.findSprintById(task.sprintId)
					matchSquad = sprint?.squadId === filterSquad.value
				} else if (task.responsible) {
					const member = config.value.teamMembers.find(m => m.name === task.responsible)
					matchSquad = member ? member.squadIds.includes(filterSquad.value) : false
				} else {
					matchSquad = false
				}
			}
			return matchName && matchResponsible && matchType && matchSquad
		})
	})

	const visibleDateRange = computed(() => {
		const cursor = isValid(currentViewDate.value) ? startOfDay(currentViewDate.value) : startOfDay(new Date())
		const projectStart = isValid(parseISO(config.value.projectStartDate)) ? startOfDay(parseISO(config.value.projectStartDate)) : startOfDay(new Date())

		if (viewMode.value === 'week') return { start: startOfWeek(cursor, { weekStartsOn: 0 }), end: endOfWeek(cursor, { weekStartsOn: 0 }) }
		if (viewMode.value === 'month') return { start: startOfMonth(cursor), end: endOfMonth(cursor) }

		return { start: projectStart, end: calculations.projectDeadlineComputed.value }
	})

	const totalProjectDays = computed(() => differenceInCalendarDays(visibleDateRange.value.end, visibleDateRange.value.start) + 1)
	const allSprints = computed(() => config.value.squads.flatMap(s => s.sprints.map(sp => ({ ...sp, squadId: s.id }))))

	const handleUpdateTask = (updatedTask: Task) => {
		taskOps.updateTask(updatedTask)
		editingTask.value = null
		isTaskModalOpen.value = false
	}

	const handleRemoveTask = (id: string) => {
		taskOps.removeTask(id)
		if (editingTask.value?.id === id) {
			editingTask.value = null
			isTaskModalOpen.value = false
		}
	}

	const openCreateModal = () => {
		editingTask.value = null
		isTaskModalOpen.value = true
	}
	const setEditingTask = (task: Task) => {
		editingTask.value = JSON.parse(JSON.stringify(task))
		isTaskModalOpen.value = true
	}
	const cancelEditing = () => {
		editingTask.value = null
		isTaskModalOpen.value = false
	}

	const saveBaseline = () => {
		const snapshot = new Map<string, { start: string; end: string }>()
		calculations.computedTasks.value.forEach(t => {
			if (t.startDate && t.endDate) {
				snapshot.set(t.id, { start: format(t.startDate, 'yyyy-MM-dd'), end: format(t.endDate, 'yyyy-MM-dd') })
			}
		})
		tasks.value.forEach(t => {
			if (snapshot.has(t.id)) {
				const dates = snapshot.get(t.id)!
				t.originalStartDate = dates.start
				t.originalEndDate = dates.end
			}
		})
		toast.show('Linha de base salva!', 'success')
	}

	const createSnapshot = () => {
		tasksSnapshot.value = JSON.stringify(tasks.value)
	}
	const restoreSnapshot = () => {
		if (tasksSnapshot.value) {
			tasks.value = JSON.parse(tasksSnapshot.value)
			tasksSnapshot.value = null
			toast.show('Alterações desfeitas!', 'success')
		}
	}

	const navigateView = (direction: 'prev' | 'next') => {
		const step = direction === 'next' ? 1 : -1
		if (viewMode.value === 'week') currentViewDate.value = addWeeks(currentViewDate.value, step)
		else if (viewMode.value === 'month') currentViewDate.value = addMonths(currentViewDate.value, step)
	}
	const setViewMode = (mode: ViewMode) => (viewMode.value = mode)

	const getSquadStats = (squadId: string) => {
		const squad = config.value.squads.find(s => s.id === squadId)
		if (!squad) return { calendarDays: 0, workingDays: 0, totalTeamCapacity: 0 }
		const start = isValid(parseISO(squad.startDate)) ? startOfDay(parseISO(squad.startDate)) : startOfDay(new Date())
		let end = squad.deadline ? startOfDay(parseISO(squad.deadline)) : addDays(start, 30)
		let working = 0,
			curr = start
		while (curr <= end) {
			if (!calculations.isNonWorkingDay(curr)) working++
			curr = addDays(curr, 1)
		}
		const members = config.value.teamMembers.filter(m => m.squadIds.includes(squadId))
		return { calendarDays: differenceInCalendarDays(end, start) + 1, workingDays: working, totalTeamCapacity: members.reduce((acc, m) => acc + working * m.capacity, 0) }
	}

	const getOptimizationSuggestions = () => ['Otimizado.']

	return {
		tasks,
		config,
		computedTasks: calculations.computedTasks,
		filteredTasks,
		viewMode,
		currentViewDate,
		visibleDateRange,
		totalProjectDays,
		editingTask,
		isTaskModalOpen,
		tasksSnapshot,
		filterSearch,
		filterResponsible,
		filterType,
		filterSquad,
		addTask: taskOps.addTask,
		updateTask: handleUpdateTask,
		removeTask: handleRemoveTask,
		toggleTaskCompletion: taskOps.toggleTaskCompletion,
		moveTask: taskOps.moveTask,
		importTasks: taskOps.importTasks,
		setViewMode,
		navigateView,
		openCreateModal,
		setEditingTask,
		cancelEditing,
		saveBaseline,
		createSnapshot,
		restoreSnapshot,
		...projectOps,
		isNonWorkingDay: calculations.isNonWorkingDay,
		projectDeadlineComputed: calculations.projectDeadlineComputed,
		suggestedEndDate: calculations.suggestedEndDate,
		projectCapacityStats: calculations.projectCapacityStats,
		automaticRisks: calculations.automaticRisks,
		criticalPathIds: calculations.criticalPathIds,
		getSquadStats,
		getOptimizationSuggestions,
		allSprints,
	}
}
