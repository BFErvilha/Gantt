import { ref, computed, watch } from 'vue'
import { addDays, format, startOfDay, isWeekend, differenceInCalendarDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, addWeeks, isAfter, isBefore } from 'date-fns'

export interface TeamMember {
	name: string
	capacity: number
	daysOff: string[]
	sector: string
}

export interface Sprint {
	id: string
	name: string
	startDate: string
	endDate: string
}

export interface Task {
	id: string
	name: string
	usId?: string
	customId?: string
	duration: number
	dependencyId: string | null
	color: string
	type: 'frontend' | 'backend' | 'qualidade' | 'other'
	responsible?: string
	effort?: number
	manualStartDate?: string
	startDate?: Date
	endDate?: Date
	offsetDays?: number
	calendarDuration?: number
	formattedStartDate?: string
	formattedEndDate?: string
	sprintId?: string
	isNotPlanned?: boolean
	isCompleted?: boolean
	completedDate?: string
}

export interface ProjectConfig {
	projectStartDate: string
	deadline: string
	skipWeekends: boolean
	holidays: string[]
	risks: string[]
	teamMembers: TeamMember[]
	sprints: Sprint[]
}

export type ViewMode = 'project' | 'month' | 'week'

const STORAGE_KEY_TASKS = 'gantt-pro-tasks'
const STORAGE_KEY_CONFIG = 'gantt-pro-config'

const loadInitialTasks = (): Task[] => {
	const saved = localStorage.getItem(STORAGE_KEY_TASKS)
	if (saved) {
		return JSON.parse(saved).map((t: any) => ({
			...t,
			isNotPlanned: t.isNotPlanned ?? false,
			isCompleted: t.isCompleted ?? false,
		}))
	}
	return []
}

const loadInitialConfig = (): ProjectConfig => {
	const saved = localStorage.getItem(STORAGE_KEY_CONFIG)
	if (saved) {
		const parsed = JSON.parse(saved)
		let members: TeamMember[] = []
		if (Array.isArray(parsed.teamMembers)) {
			members = parsed.teamMembers.map((m: any) => {
				if (typeof m === 'string') return { name: m, capacity: 8, daysOff: [], sector: 'Outro' }
				return { ...m, daysOff: m.daysOff || [], sector: m.sector || 'Outro' }
			})
		}
		return {
			holidays: [],
			risks: [],
			...parsed,
			teamMembers: members,
			sprints: parsed.sprints || [],
		}
	}
	return {
		projectStartDate: format(new Date(), 'yyyy-MM-dd'),
		deadline: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
		skipWeekends: true,
		holidays: [],
		risks: [],
		teamMembers: [],
		sprints: [],
	}
}

const tasks = ref<Task[]>(loadInitialTasks())
const config = ref<ProjectConfig>(loadInitialConfig())
const editingTask = ref<Task | null>(null)

const isTaskModalOpen = ref(false)

const viewMode = ref<ViewMode>('project')
const currentViewDate = ref<Date>(startOfDay(new Date(config.value.projectStartDate)))

const filterSearch = ref('')
const filterResponsible = ref('')
const filterType = ref('')

export function useGantt() {
	watch(
		[tasks, config],
		() => {
			localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks.value))
			localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config.value))
		},
		{ deep: true },
	)

	watch(
		() => config.value.projectStartDate,
		newDate => {
			currentViewDate.value = startOfDay(new Date(newDate))
		},
	)

	const projectDeadlineComputed = computed(() => {
		let maxDate = startOfDay(new Date(config.value.projectStartDate))

		if (config.value.sprints.length > 0) {
			config.value.sprints.forEach(s => {
				const end = startOfDay(parseISO(s.endDate))
				if (isAfter(end, maxDate)) maxDate = end
			})
		}

		computedTasks.value.forEach(t => {
			if (t.endDate && isAfter(t.endDate, maxDate)) maxDate = t.endDate
		})

		return addDays(maxDate, 7)
	})

	const isNonWorkingDay = (date: Date, responsibleName?: string) => {
		const dateString = format(date, 'yyyy-MM-dd')
		const isGlobalHoliday = config.value.holidays.includes(dateString)
		if (isGlobalHoliday) return true
		if (config.value.skipWeekends && isWeekend(date)) return true
		if (responsibleName) {
			const member = config.value.teamMembers.find(m => m.name === responsibleName)
			if (member && member.daysOff && member.daysOff.includes(dateString)) {
				return true
			}
		}
		return false
	}

	const calculateEndDate = (start: Date, duration: number, responsibleName?: string) => {
		let daysAdded = 0
		let current = start
		const targetDays = Math.max(0, duration - 1)
		while (daysAdded < targetDays) {
			current = addDays(current, 1)
			if (!isNonWorkingDay(current, responsibleName)) daysAdded++
		}
		return current
	}

	const getNextValidStartDate = (date: Date, responsibleName?: string) => {
		let current = date
		while (isNonWorkingDay(current, responsibleName)) {
			current = addDays(current, 1)
		}
		return current
	}

	const computedTasks = computed(() => {
		const projectStart = startOfDay(new Date(config.value.projectStartDate))
		const tempDates = new Map<string, { start: Date; end: Date }>()
		const taskQueue = [...tasks.value]
		let hasChanges = true
		let iterations = 0
		const maxIterations = taskQueue.length * 2

		while (hasChanges && iterations < maxIterations) {
			hasChanges = false
			iterations++
			for (const task of taskQueue) {
				let start = projectStart

				if (task.manualStartDate) {
					let manualDate = parseISO(task.manualStartDate)
					start = getNextValidStartDate(manualDate, task.responsible)
				} else if (task.dependencyId) {
					const depDates = tempDates.get(task.dependencyId)
					if (depDates) {
						let tentativeStart = addDays(depDates.end, 1)
						start = getNextValidStartDate(tentativeStart, task.responsible)
					}
				} else {
					if (task.sprintId) {
						const sprint = config.value.sprints.find(s => s.id === task.sprintId)
						if (sprint) {
							start = getNextValidStartDate(parseISO(sprint.startDate), task.responsible)
						} else {
							start = getNextValidStartDate(projectStart, task.responsible)
						}
					} else {
						start = getNextValidStartDate(projectStart, task.responsible)
					}
				}

				const end = calculateEndDate(start, task.duration, task.responsible)
				const currentData = tempDates.get(task.id)

				if (!currentData || currentData.start.getTime() !== start.getTime()) {
					tempDates.set(task.id, { start, end })
					hasChanges = true
				}
			}
		}

		return tasks.value.map(task => {
			const dates = tempDates.get(task.id) || { start: projectStart, end: projectStart }
			const calendarDuration = differenceInCalendarDays(dates.end, dates.start) + 1
			return {
				...task,
				startDate: dates.start,
				endDate: dates.end,
				offsetDays: differenceInCalendarDays(dates.start, projectStart),
				calendarDuration,
				formattedStartDate: format(dates.start, 'dd/MM/yyyy'),
				formattedEndDate: format(dates.end, 'dd/MM/yyyy'),
			}
		})
	})

	const filteredTasks = computed(() => {
		return computedTasks.value.filter(task => {
			const matchName = task.name.toLowerCase().includes(filterSearch.value.toLowerCase())
			const matchResponsible = filterResponsible.value ? task.responsible === filterResponsible.value : true
			const matchType = filterType.value ? task.type === filterType.value : true
			return matchName && matchResponsible && matchType
		})
	})

	const visibleDateRange = computed(() => {
		const cursor = startOfDay(currentViewDate.value)
		const projectStart = startOfDay(new Date(config.value.projectStartDate))
		const projectEnd = projectDeadlineComputed.value

		if (viewMode.value === 'week') return { start: startOfWeek(cursor, { weekStartsOn: 0 }), end: endOfWeek(cursor, { weekStartsOn: 0 }) }
		if (viewMode.value === 'month') return { start: startOfMonth(cursor), end: endOfMonth(cursor) }

		return { start: projectStart, end: projectEnd }
	})

	const navigateView = (direction: 'prev' | 'next') => {
		const step = direction === 'next' ? 1 : -1
		if (viewMode.value === 'week') currentViewDate.value = addWeeks(currentViewDate.value, step)
		else if (viewMode.value === 'month') currentViewDate.value = addMonths(currentViewDate.value, step)
	}
	const setViewMode = (mode: ViewMode) => {
		viewMode.value = mode
	}

	const importTasks = (newTasks: Partial<Task>[]) => {
		tasks.value = newTasks.map(t => ({
			id: t.id || crypto.randomUUID(),
			usId: t.usId || '',
			customId: t.customId || '',
			name: t.name || 'Sem nome',
			duration: t.duration || 1,
			dependencyId: t.dependencyId || null,
			color: t.color || '#3b82f6',
			type: t.type || 'other',
			responsible: t.responsible || '',
			effort: t.effort || 0,
			sprintId: t.sprintId || undefined,
			isNotPlanned: !t.sprintId,
			isCompleted: false,
		})) as Task[]
	}
	const totalProjectDays = computed(() => differenceInCalendarDays(visibleDateRange.value.end, visibleDateRange.value.start) + 1)

	const addTask = (task: Partial<Task>) => {
		const idToUse = task.id || crypto.randomUUID()

		tasks.value.push({
			id: idToUse,
			usId: task.usId || '',
			customId: task.customId || '',
			name: task.name || 'Nova Tarefa',
			duration: task.duration || 1,
			dependencyId: task.dependencyId || null,
			color: task.color || '#3b82f6',
			type: task.type || 'other',
			responsible: task.responsible || '',
			effort: task.effort || 0,
			sprintId: task.sprintId,
			isNotPlanned: !task.sprintId,
			isCompleted: false,
			completedDate: undefined,
		})
	}

	const updateTask = (updatedTask: Task) => {
		const index = tasks.value.findIndex(t => t.id === updatedTask.id)
		if (index !== -1) tasks.value[index] = { ...updatedTask }
		editingTask.value = null
		isTaskModalOpen.value = false
	}

	const removeTask = (id: string) => {
		tasks.value = tasks.value.filter(t => t.id !== id)
		tasks.value.forEach(t => {
			if (t.dependencyId === id) t.dependencyId = null
		})
		if (editingTask.value?.id === id) {
			editingTask.value = null
			isTaskModalOpen.value = false
		}
	}

	const toggleTaskCompletion = (taskId: string) => {
		const task = tasks.value.find(t => t.id === taskId)
		if (task) {
			task.isCompleted = !task.isCompleted
			if (task.isCompleted) {
				task.completedDate = format(new Date(), 'yyyy-MM-dd')
			} else {
				task.completedDate = undefined
			}
		}
	}

	const setEditingTask = (task: Task) => {
		editingTask.value = JSON.parse(JSON.stringify(task))
		isTaskModalOpen.value = true
	}

	const openCreateModal = () => {
		editingTask.value = null
		isTaskModalOpen.value = true
	}

	const cancelEditing = () => {
		editingTask.value = null
		isTaskModalOpen.value = false
	}

	const moveTask = (taskId: string, newStartDate: Date) => {
		const task = tasks.value.find(t => t.id === taskId)
		if (task) {
			task.manualStartDate = format(newStartDate, 'yyyy-MM-dd')
		}
	}

	const addHoliday = (date: string) => {
		if (!config.value.holidays.includes(date)) config.value.holidays.push(date)
	}
	const removeHoliday = (date: string) => {
		config.value.holidays = config.value.holidays.filter(d => d !== date)
	}
	const addRisk = (risk: string) => {
		if (risk && !config.value.risks.includes(risk)) config.value.risks.push(risk)
	}
	const removeRisk = (index: number) => {
		config.value.risks.splice(index, 1)
	}

	const addMember = (name: string, capacity: number, sector: string = 'Outro') => {
		if (name && !config.value.teamMembers.some(m => m.name === name)) {
			config.value.teamMembers.push({ name, capacity, daysOff: [], sector })
		}
	}
	const updateMember = (index: number, newName: string, newCapacity: number, newSector: string) => {
		const oldName = config.value.teamMembers[index].name
		config.value.teamMembers[index].name = newName
		config.value.teamMembers[index].capacity = newCapacity
		config.value.teamMembers[index].sector = newSector
		if (oldName !== newName) {
			tasks.value.forEach(t => {
				if (t.responsible === oldName) t.responsible = newName
			})
		}
	}
	const removeMember = (index: number) => {
		config.value.teamMembers.splice(index, 1)
	}
	const addMemberDayOff = (memberIndex: number, date: string) => {
		const member = config.value.teamMembers[memberIndex]
		if (member && !member.daysOff.includes(date)) {
			member.daysOff.push(date)
			member.daysOff.sort()
		}
	}
	const removeMemberDayOff = (memberIndex: number, date: string) => {
		const member = config.value.teamMembers[memberIndex]
		if (member) member.daysOff = member.daysOff.filter(d => d !== date)
	}

	const addSprint = (name: string, startDate: string, endDate: string) => {
		config.value.sprints.push({
			id: crypto.randomUUID(),
			name,
			startDate,
			endDate,
		})
		config.value.sprints.sort((a, b) => a.startDate.localeCompare(b.startDate))
	}

	const updateSprint = (id: string, name: string, startDate: string, endDate: string) => {
		const index = config.value.sprints.findIndex(s => s.id === id)
		if (index !== -1) {
			config.value.sprints[index] = { ...config.value.sprints[index], name, startDate, endDate }
			config.value.sprints.sort((a, b) => a.startDate.localeCompare(b.startDate))
		}
	}

	const removeSprint = (id: string) => {
		config.value.sprints = config.value.sprints.filter(s => s.id !== id)
		tasks.value.forEach(t => {
			if (t.sprintId === id) t.sprintId = undefined
		})
	}

	const projectCapacityStats = computed(() => {
		const start = startOfDay(new Date(config.value.projectStartDate))
		const end = projectDeadlineComputed.value
		let workingDays = 0
		let current = start
		while (current <= end) {
			if (!isNonWorkingDay(current)) workingDays++
			current = addDays(current, 1)
		}
		const memberStats = config.value.teamMembers.map(m => ({
			name: m.name,
			capacityPerDay: m.capacity,
			totalCapacity: m.capacity * workingDays,
			sector: m.sector,
		}))
		const totalTeamCapacity = memberStats.reduce((sum, m) => sum + m.totalCapacity, 0)
		return { workingDays, totalTeamCapacity, memberStats }
	})

	const automaticRisks = computed(() => {
		const risks: string[] = []

		let notPlannedEffort = 0
		let totalEffort = 0

		computedTasks.value.forEach(task => {
			if (!task.isCompleted) {
				totalEffort += task.effort || 0
				if (task.isNotPlanned) {
					notPlannedEffort += task.effort || 0
				}
			}

			if (!task.isCompleted) {
				const responsibleMember = config.value.teamMembers.find(m => m.name === task.responsible)
				const dailyCapacity = responsibleMember ? responsibleMember.capacity : 8

				if (task.effort && task.duration && task.effort > task.duration * dailyCapacity) {
					risks.push(`CAPACIDADE: "${task.name}" requer ${task.effort}h. Limite atual: ${task.duration * dailyCapacity}h.`)
				}

				if (task.sprintId && task.startDate && task.endDate) {
					const sprint = config.value.sprints.find(s => s.id === task.sprintId)
					if (sprint) {
						const sprintStart = startOfDay(parseISO(sprint.startDate))
						const sprintEnd = startOfDay(parseISO(sprint.endDate))

						if (isBefore(task.startDate, sprintStart)) {
							risks.push(`SPRINT: "${task.name}" começa antes da ${sprint.name} (${format(sprintStart, 'dd/MM')}).`)
						}
						if (isAfter(task.endDate, sprintEnd)) {
							const daysOut = differenceInCalendarDays(task.endDate, sprintEnd)
							risks.push(`SPRINT: "${task.name}" estourou a ${sprint.name} em ${daysOut} dia(s).`)
						}
					}
				}

				if (task.startDate && task.endDate) {
					let hasConflict = false
					let conflictType = ''
					const hasGlobalHoliday = config.value.holidays.some(h => {
						const hDate = startOfDay(parseISO(h))
						return task.startDate! <= hDate && task.endDate! >= hDate
					})
					if (hasGlobalHoliday) {
						hasConflict = true
						conflictType = 'feriado'
					}
					if (!hasConflict && responsibleMember) {
						const hasDayOff = responsibleMember.daysOff.some(d => {
							const dDate = startOfDay(parseISO(d))
							return task.startDate! <= dDate && task.endDate! >= dDate
						})
						if (hasDayOff) {
							hasConflict = true
							conflictType = 'folga pessoal'
						}
					}
					if (hasConflict && task.duration < 3) risks.push(`CALENDÁRIO: Tarefa curta "${task.name}" coincide com ${conflictType}.`)
				}
			}
		})

		if (totalEffort > 0 && notPlannedEffort / totalEffort > 0.2) {
			const percent = Math.round((notPlannedEffort / totalEffort) * 100)
			risks.push(`CARRY-OVER: ${percent}% do esforço ativo são tarefas "Não Planejadas". Risco de atraso nas entregas planejadas.`)
		}

		return risks
	})

	const criticalPathIds = computed(() => {
		if (!computedTasks.value.length) return []
		let maxEndDate = 0
		computedTasks.value.forEach(t => {
			if (!t.isCompleted && t.endDate && t.endDate.getTime() > maxEndDate) maxEndDate = t.endDate.getTime()
		})
		const criticalSet = new Set<string>()
		const lastTasks = computedTasks.value.filter(t => !t.isCompleted && t.endDate && t.endDate.getTime() === maxEndDate)
		const traceParents = (taskId: string) => {
			criticalSet.add(taskId)
			const task = computedTasks.value.find(t => t.id === taskId)
			if (task && task.dependencyId) traceParents(task.dependencyId)
		}
		lastTasks.forEach(t => traceParents(t.id))
		return Array.from(criticalSet)
	})

	return {
		tasks,
		config,
		computedTasks,
		filteredTasks,
		totalProjectDays,
		editingTask,
		viewMode,
		visibleDateRange,
		currentViewDate,
		setViewMode,
		navigateView,
		addTask,
		updateTask,
		removeTask,
		toggleTaskCompletion,
		importTasks,
		setEditingTask,
		cancelEditing,
		addHoliday,
		removeHoliday,
		addRisk,
		removeRisk,
		isNonWorkingDay,
		addMember,
		updateMember,
		removeMember,
		addMemberDayOff,
		removeMemberDayOff,
		moveTask,
		isTaskModalOpen,
		openCreateModal,
		automaticRisks,
		criticalPathIds,
		projectCapacityStats,
		filterSearch,
		filterResponsible,
		filterType,
		addSprint,
		updateSprint,
		removeSprint,
		projectDeadlineComputed,
	}
}
