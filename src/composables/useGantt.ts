import { ref, computed, watch } from 'vue'
import { addDays, format, startOfDay, isWeekend, differenceInCalendarDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, addWeeks, isAfter, isBefore, isValid } from 'date-fns'
import { useToast } from './useToast'

export interface Squad {
	id: string
	name: string
	color: string
	startDate: string
	deadline: string
	skipWeekends: boolean
	holidays: string[]
	sprints: Sprint[]
}

export interface TeamMember {
	name: string
	capacity: number
	daysOff: string[]
	sector: string
	squadIds: string[]
}

export interface Sprint {
	id: string
	name: string
	startDate: string
	endDate: string
	squadId?: string
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
	isMilestone?: boolean
	originalStartDate?: string
	originalEndDate?: string
	usType?: 'goal' | 'item'
	classification?: number
}

export interface ProjectConfig {
	projectStartDate: string
	deadline: string
	skipWeekends: boolean
	holidays: string[]
	risks: string[]
	teamMembers: TeamMember[]
	sprints: Sprint[]
	squads: Squad[]
}

export type ViewMode = 'project' | 'month' | 'week'

const STORAGE_KEY_TASKS = 'gantt-pro-tasks'
const STORAGE_KEY_CONFIG = 'gantt-pro-config'

const loadInitialTasks = (): Task[] => {
	try {
		const saved = localStorage.getItem(STORAGE_KEY_TASKS)
		if (saved) {
			return JSON.parse(saved).map((t: any) => ({
				...t,
				isNotPlanned: t.isNotPlanned ?? false,
				isCompleted: t.isCompleted ?? false,
				isMilestone: t.isMilestone ?? false,
				usType: t.usType || 'item',
				classification: typeof t.classification === 'number' ? t.classification : 0,
			}))
		}
	} catch (e) {
		console.error('Erro ao carregar tarefas:', e)
	}
	return []
}

const loadInitialConfig = (): ProjectConfig => {
	const defaultConfig: ProjectConfig = {
		projectStartDate: format(new Date(), 'yyyy-MM-dd'),
		deadline: '',
		skipWeekends: true,
		holidays: [],
		risks: [],
		teamMembers: [],
		sprints: [],
		squads: [],
	}

	try {
		const saved = localStorage.getItem(STORAGE_KEY_CONFIG)
		if (saved) {
			const parsed = JSON.parse(saved)

			let members: TeamMember[] = []
			if (Array.isArray(parsed.teamMembers)) {
				members = parsed.teamMembers.map((m: any) => ({
					name: m.name || 'Sem Nome',
					capacity: typeof m.capacity === 'number' ? m.capacity : 8,
					daysOff: Array.isArray(m.daysOff) ? m.daysOff : [],
					sector: m.sector || 'Outro',
					squadIds: Array.isArray(m.squadIds) ? m.squadIds : [],
				}))
			}

			let squads = Array.isArray(parsed.squads) ? parsed.squads : []

			if (squads.length === 0 && Array.isArray(parsed.sprints) && parsed.sprints.length > 0) {
				squads.push({
					id: 'default-squad',
					name: 'Squad Padrão',
					color: '#3b82f6',
					startDate: parsed.projectStartDate || defaultConfig.projectStartDate,
					deadline: parsed.deadline || '',
					skipWeekends: true,
					holidays: [],
					sprints: parsed.sprints.map((s: any) => ({ ...s, squadId: 'default-squad' })),
				})
			}

			squads = squads.map((s: any) => ({
				...s,
				sprints: Array.isArray(s.sprints) ? s.sprints : [],
				holidays: Array.isArray(s.holidays) ? s.holidays : [],
				startDate: s.startDate || defaultConfig.projectStartDate,
				deadline: s.deadline || '',
				skipWeekends: s.skipWeekends ?? true,
			}))

			return {
				...defaultConfig,
				...parsed,
				projectStartDate: parsed.projectStartDate || defaultConfig.projectStartDate,
				deadline: parsed.deadline || '',
				teamMembers: members,
				sprints: [],
				squads: squads,
				holidays: Array.isArray(parsed.holidays) ? parsed.holidays : [],
			}
		}
	} catch (e) {
		console.error('Erro ao carregar configurações:', e)
	}

	return defaultConfig
}

const tasks = ref<Task[]>(loadInitialTasks())
const config = ref<ProjectConfig>(loadInitialConfig())
const editingTask = ref<Task | null>(null)
const tasksSnapshot = ref<string | null>(null)

const isTaskModalOpen = ref(false)

const viewMode = ref<ViewMode>('project')
const initialDate = parseISO(config.value.projectStartDate)
const currentViewDate = ref<Date>(isValid(initialDate) ? startOfDay(initialDate) : startOfDay(new Date()))

const filterSearch = ref('')
const filterResponsible = ref('')
const filterType = ref('')
const filterSquad = ref('')

export function useGantt() {
	const toast = useToast()

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
			if (newDate && isValid(parseISO(newDate))) {
				currentViewDate.value = startOfDay(new Date(newDate))
			}
		},
	)

	const findSprintById = (sprintId: string): Sprint | undefined => {
		if (!config.value.squads) return undefined
		for (const squad of config.value.squads) {
			if (squad.sprints && Array.isArray(squad.sprints)) {
				const sprint = squad.sprints.find(s => s.id === sprintId)
				if (sprint) return sprint
			}
		}
		return undefined
	}

	const suggestedEndDate = computed(() => {
		let maxDate = startOfDay(new Date(config.value.projectStartDate))
		if (!isValid(maxDate)) maxDate = startOfDay(new Date())

		config.value.squads.forEach(squad => {
			if (squad.sprints) {
				squad.sprints.forEach(s => {
					const end = startOfDay(parseISO(s.endDate))
					if (isValid(end) && isAfter(end, maxDate)) maxDate = end
				})
			}
		})

		computedTasks.value.forEach(t => {
			if (t.endDate && isValid(t.endDate) && isAfter(t.endDate, maxDate)) maxDate = t.endDate
		})

		return maxDate
	})

	const projectDeadlineComputed = computed(() => {
		let limitDate = suggestedEndDate.value

		if (config.value.deadline) {
			const manual = startOfDay(parseISO(config.value.deadline))
			if (isValid(manual)) {
				if (isAfter(manual, limitDate)) {
					limitDate = manual
				}
			}
		}

		return addDays(limitDate, 7)
	})

	const isNonWorkingDay = (date: Date, responsibleName?: string) => {
		if (!isValid(date)) return false
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
		if (!isValid(start)) return new Date()
		if (duration === 0) return start

		let daysAdded = 0
		let current = start
		const targetDays = Math.max(0, duration - 1)

		let safeLoop = 0
		while (daysAdded < targetDays && safeLoop < 1000) {
			current = addDays(current, 1)
			if (!isNonWorkingDay(current, responsibleName)) daysAdded++
			safeLoop++
		}
		return current
	}

	const getNextValidStartDate = (date: Date, responsibleName?: string) => {
		if (!isValid(date)) return new Date()
		let current = date
		let safeLoop = 0
		while (isNonWorkingDay(current, responsibleName) && safeLoop < 365) {
			current = addDays(current, 1)
			safeLoop++
		}
		return current
	}

	const computedTasks = computed(() => {
		const projectStart = isValid(parseISO(config.value.projectStartDate)) ? startOfDay(parseISO(config.value.projectStartDate)) : startOfDay(new Date())

		const tempDates = new Map<string, { start: Date; end: Date; type: string }>()
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
					if (isValid(manualDate)) {
						start = getNextValidStartDate(manualDate, task.responsible)
					}
				} else if (task.dependencyId) {
					const depData = tempDates.get(task.dependencyId)
					if (depData) {
						let gapDays = 1
						if (depData.type === 'backend' && task.type === 'frontend') {
							gapDays = 3
						}
						let tentativeStart = addDays(depData.end, gapDays)
						start = getNextValidStartDate(tentativeStart, task.responsible)
					}
				} else {
					if (task.sprintId) {
						const sprint = findSprintById(task.sprintId)
						if (sprint) {
							const sDate = parseISO(sprint.startDate)
							if (isValid(sDate)) start = getNextValidStartDate(sDate, task.responsible)
						} else {
							start = getNextValidStartDate(projectStart, task.responsible)
						}
					} else {
						start = getNextValidStartDate(projectStart, task.responsible)
					}
				}

				const end = calculateEndDate(start, task.isMilestone ? 0 : task.duration, task.responsible)
				const currentData = tempDates.get(task.id)

				if (!currentData || currentData.start.getTime() !== start.getTime()) {
					tempDates.set(task.id, { start, end, type: task.type })
					hasChanges = true
				}
			}
		}

		const baseDate = isValid(parseISO(config.value.projectStartDate)) ? startOfDay(parseISO(config.value.projectStartDate)) : startOfDay(new Date())

		return tasks.value.map(task => {
			const dates = tempDates.get(task.id) || { start: baseDate, end: baseDate, type: task.type }
			const calendarDuration = differenceInCalendarDays(dates.end, dates.start) + 1
			return {
				...task,
				startDate: dates.start,
				endDate: dates.end,
				offsetDays: differenceInCalendarDays(dates.start, baseDate),
				calendarDuration: task.isMilestone ? 1 : calendarDuration,
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

			let matchSquad = true
			if (filterSquad.value) {
				if (task.sprintId) {
					const sprint = findSprintById(task.sprintId)
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
			isMilestone: t.isMilestone || false,
			usType: t.usType || 'item',
			classification: typeof t.classification === 'number' ? t.classification : 0,
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
			isMilestone: task.isMilestone || false,
			usType: task.usType || 'item',
			classification: task.classification || 0,
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

	const saveBaseline = () => {
		const snapshot = new Map<string, { start: string; end: string }>()
		computedTasks.value.forEach(t => {
			if (t.startDate && t.endDate) {
				snapshot.set(t.id, {
					start: format(t.startDate, 'yyyy-MM-dd'),
					end: format(t.endDate, 'yyyy-MM-dd'),
				})
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

	const addMember = (name: string, capacity: number = 8, sector: string = 'Outro', squadIds: string[] = []) => {
		if (name && !config.value.teamMembers.some(m => m.name === name)) {
			config.value.teamMembers.push({ name, capacity, daysOff: [], sector, squadIds })
		}
	}

	const updateMember = (index: number, newName: string, newCapacity: number, newSector: string, newSquadIds: string[]) => {
		const oldName = config.value.teamMembers[index].name
		config.value.teamMembers[index].name = newName
		config.value.teamMembers[index].capacity = newCapacity
		config.value.teamMembers[index].sector = newSector
		config.value.teamMembers[index].squadIds = newSquadIds

		if (oldName !== newName) {
			tasks.value.forEach(t => {
				if (t.responsible === oldName) t.responsible = newName
			})
		}
	}

	const removeMember = (index: number) => {
		config.value.teamMembers.splice(index, 1)
	}

	const linkMemberToSquad = (memberIndex: number, squadId: string, newCapacity?: number) => {
		const member = config.value.teamMembers[memberIndex]
		if (!member.squadIds.includes(squadId)) {
			member.squadIds.push(squadId)
		}
		if (newCapacity !== undefined) {
			member.capacity = newCapacity
		}
	}

	const unlinkMemberFromSquad = (memberIndex: number, squadId: string) => {
		const member = config.value.teamMembers[memberIndex]
		member.squadIds = member.squadIds.filter(id => id !== squadId)
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

	const addSquad = (name: string, color: string) => {
		config.value.squads.push({
			id: crypto.randomUUID(),
			name,
			color,
			startDate: format(new Date(), 'yyyy-MM-dd'),
			deadline: '',
			skipWeekends: true,
			holidays: [],
			sprints: [],
		})
	}
	const updateSquad = (id: string, name: string, color: string) => {
		const idx = config.value.squads.findIndex(s => s.id === id)
		if (idx !== -1) {
			config.value.squads[idx].name = name
			config.value.squads[idx].color = color
		}
	}
	const removeSquad = (id: string) => {
		config.value.squads = config.value.squads.filter(s => s.id !== id)
		config.value.teamMembers.forEach(m => {
			m.squadIds = m.squadIds.filter(sid => sid !== id)
		})
	}

	const addSprint = (name: string, startDate: string, endDate: string, squadId?: string) => {
		config.value.sprints.push({
			id: crypto.randomUUID(),
			name,
			startDate,
			endDate,
			squadId,
		})
		config.value.sprints.sort((a, b) => a.startDate.localeCompare(b.startDate))
	}

	const updateSprint = (id: string, name: string, startDate: string, endDate: string, squadId?: string) => {
		const index = config.value.sprints.findIndex(s => s.id === id)
		if (index !== -1) {
			config.value.sprints[index] = { ...config.value.sprints[index], name, startDate, endDate, squadId }
			config.value.sprints.sort((a, b) => a.startDate.localeCompare(b.startDate))
		}
	}

	const removeSprint = (id: string) => {
		config.value.sprints = config.value.sprints.filter(s => s.id !== id)
		tasks.value.forEach(t => {
			if (t.sprintId === id) t.sprintId = undefined
		})
	}

	const addHolidayToSquad = (squadId: string, date: string) => {
		const squad = config.value.squads.find(s => s.id === squadId)
		if (squad && !squad.holidays.includes(date)) squad.holidays.push(date)
	}
	const removeHolidayFromSquad = (squadId: string, date: string) => {
		const squad = config.value.squads.find(s => s.id === squadId)
		if (squad) squad.holidays = squad.holidays.filter(d => d !== date)
	}

	const addSprintToSquad = (squadId: string, name: string, startDate: string, endDate: string) => {
		const squad = config.value.squads.find(s => s.id === squadId)
		if (squad) {
			squad.sprints.push({
				id: crypto.randomUUID(),
				name,
				startDate,
				endDate,
				squadId,
			})
			squad.sprints.sort((a, b) => a.startDate.localeCompare(b.startDate))
		}
	}

	const updateSprintInSquad = (squadId: string, sprintId: string, name: string, startDate: string, endDate: string) => {
		const squad = config.value.squads.find(s => s.id === squadId)
		if (squad) {
			const idx = squad.sprints.findIndex(s => s.id === sprintId)
			if (idx !== -1) {
				squad.sprints[idx] = { ...squad.sprints[idx], name, startDate, endDate }
				squad.sprints.sort((a, b) => a.startDate.localeCompare(b.startDate))
			}
		}
	}

	const removeSprintFromSquad = (squadId: string, sprintId: string) => {
		const squad = config.value.squads.find(s => s.id === squadId)
		if (squad) {
			squad.sprints = squad.sprints.filter(s => s.id !== sprintId)
			tasks.value.forEach(t => {
				if (t.sprintId === sprintId) t.sprintId = undefined
			})
		}
	}

	const projectCapacityStats = computed(() => {
		const start = isValid(parseISO(config.value.projectStartDate)) ? startOfDay(parseISO(config.value.projectStartDate)) : startOfDay(new Date())

		let end = projectDeadlineComputed.value
		if (config.value.deadline) {
			const manual = startOfDay(parseISO(config.value.deadline))
			if (isValid(manual)) {
				end = projectDeadlineComputed.value
			}
		}

		const calendarDays = differenceInCalendarDays(end, start) + 1
		let workingDays = 0

		let current = start
		while (current <= end) {
			if (!isNonWorkingDay(current)) workingDays++
			current = addDays(current, 1)
		}

		const memberStats = config.value.teamMembers.map(m => {
			let individualLoss = 0
			if (m.daysOff && m.daysOff.length > 0) {
				m.daysOff.forEach(dayOff => {
					const d = startOfDay(parseISO(dayOff))
					if (d >= start && d <= end) {
						const isGlobalWeekendOrHoliday = config.value.holidays.includes(dayOff) || (config.value.skipWeekends && isWeekend(d))
						if (!isGlobalWeekendOrHoliday) {
							individualLoss++
						}
					}
				})
			}

			const effectiveDays = Math.max(0, workingDays - individualLoss)

			return {
				name: m.name,
				capacityPerDay: m.capacity,
				totalCapacity: m.capacity * effectiveDays,
				sector: m.sector,
				effectiveDays,
			}
		})

		const totalTeamCapacity = memberStats.reduce((sum, m) => sum + m.totalCapacity, 0)
		return { workingDays, calendarDays, totalTeamCapacity, memberStats }
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

				if (!task.isMilestone && task.effort && task.duration && task.effort > task.duration * dailyCapacity) {
					risks.push(`CAPACIDADE: "${task.name}" requer ${task.effort}h. Limite atual: ${task.duration * dailyCapacity}h.`)
				}

				if (task.sprintId && task.startDate && task.endDate) {
					const sprint = findSprintById(task.sprintId)

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

	const getOptimizationSuggestions = () => {
		const suggestions: string[] = []

		const tasksBySprint = new Map<string, Task[]>()

		config.value.squads.forEach(squad => {
			squad.sprints.forEach(sprint => {
				tasksBySprint.set(sprint.id, [])
			})
		})

		tasks.value.forEach(t => {
			if (t.sprintId && tasksBySprint.has(t.sprintId)) {
				tasksBySprint.get(t.sprintId)?.push(t)
			}
		})

		config.value.squads.forEach(squad => {
			squad.sprints.forEach(sprint => {
				const tasksInSprint = tasksBySprint.get(sprint.id) || []
				if (tasksInSprint.length === 0) return

				const sortedByDate = [...tasksInSprint].sort((a, b) => {
					const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
					const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
					return dateA - dateB
				})

				const membersInSprint = new Set(tasksInSprint.map(t => t.responsible).filter(Boolean))

				membersInSprint.forEach(member => {
					const memberTasks = sortedByDate.filter(t => t.responsible === member)

					let firstGoalIndex = memberTasks.findIndex(t => t.usType === 'goal')
					if (firstGoalIndex > 0) {
						const goalTask = memberTasks[firstGoalIndex]
						for (let i = 0; i < firstGoalIndex; i++) {
							const taskBefore = memberTasks[i]
							if (taskBefore.usType !== 'goal') {
								suggestions.push(`PRIORIDADE (${squad.name}): ${member} está fazendo "${taskBefore.name}" (Item) antes de "${goalTask.name}" (Meta).`)
							}
						}
					}

					for (let i = 0; i < memberTasks.length - 1; i++) {
						const current = memberTasks[i]
						const next = memberTasks[i + 1]

						if (current.usType === next.usType) {
							const classCurr = current.classification || 999
							const classNext = next.classification || 999

							if (classNext < classCurr) {
								suggestions.push(`SEQUÊNCIA (${squad.name}): "${next.name}" (Classif. ${classNext}) deveria ser feita antes de "${current.name}" (Classif. ${classCurr}).`)
							}
						}
					}
				})

				const sprintStart = parseISO(sprint.startDate)
				const sprintEnd = parseISO(sprint.endDate)
				const days = differenceInCalendarDays(sprintEnd, sprintStart)

				const squadMembers = config.value.teamMembers.filter(m => m.squadIds.includes(squad.id))

				const sprintCapacityStats = squadMembers.map(m => {
					const totalHours = days * m.capacity * 0.7
					return { name: m.name, limit: totalHours, used: 0 }
				})

				tasksInSprint.forEach(t => {
					if (t.responsible && t.effort) {
						const stat = sprintCapacityStats.find(s => s.name === t.responsible)
						if (stat) stat.used += t.effort
					}
				})

				sprintCapacityStats.forEach(stat => {
					if (stat.used > stat.limit) {
						const diff = stat.used - stat.limit
						const nonGoalTasks = tasksInSprint.filter(t => t.responsible === stat.name && t.usType !== 'goal')
						if (nonGoalTasks.length > 0) {
							suggestions.push(`SOBRECARGA (${squad.name}): ${stat.name} estourou a Sprint (+${diff.toFixed(1)}h). Mova "${nonGoalTasks[0].name}" para a próxima.`)
						} else {
							suggestions.push(`RISCO CRÍTICO (${squad.name}): ${stat.name} não entregará as Metas da Sprint.`)
						}
					}
				})
			})
		})

		if (suggestions.length === 0) {
			return ['OTIMIZADO: O planejamento segue prioridades (Meta > Item), Classificação e respeita a capacidade.']
		}

		return suggestions
	}

	const getSquadStats = (squadId: string) => {
		const squad = config.value.squads.find(s => s.id === squadId)
		if (!squad) return { calendarDays: 0, workingDays: 0, totalTeamCapacity: 0 }

		const start = isValid(parseISO(squad.startDate)) ? startOfDay(parseISO(squad.startDate)) : startOfDay(new Date())
		let end = addDays(start, 30)

		if (squad.deadline && isValid(parseISO(squad.deadline))) {
			end = startOfDay(parseISO(squad.deadline))
		}

		const calendarDays = differenceInCalendarDays(end, start) + 1
		let workingDays = 0
		let current = start

		let loop = 0
		while (current <= end && loop < 3650) {
			if (!isNonWorkingDay(current)) workingDays++
			current = addDays(current, 1)
			loop++
		}

		const members = config.value.teamMembers.filter(m => m.squadIds.includes(squadId))
		const totalTeamCapacity = members.reduce((acc, m) => acc + workingDays * m.capacity, 0)

		return { calendarDays, workingDays, totalTeamCapacity }
	}

	const allSprints = computed(() => {
		return config.value.squads.flatMap(s => s.sprints.map(sp => ({ ...sp, squadId: s.id })))
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
		filterSquad,
		addSprint,
		updateSprint,
		removeSprint,
		projectDeadlineComputed,
		saveBaseline,
		getOptimizationSuggestions,
		createSnapshot,
		restoreSnapshot,
		tasksSnapshot,
		addSquad,
		updateSquad,
		removeSquad,
		linkMemberToSquad,
		unlinkMemberFromSquad,
		suggestedEndDate,
		getSquadStats,
		allSprints,
		addHolidayToSquad,
		removeHolidayFromSquad,
		addSprintToSquad,
		updateSprintInSquad,
		removeSprintFromSquad,
	}
}
