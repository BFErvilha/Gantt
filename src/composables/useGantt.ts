import { ref, computed, watch } from 'vue'
// Adicionei 'parseISO' que estava a faltar nas importações
import { addDays, format, startOfDay, isWeekend, differenceInCalendarDays, parseISO } from 'date-fns'

export interface Task {
	id: string
	name: string
	duration: number
	dependencyId: string | null
	color: string
	type: 'frontend' | 'backend' | 'other'
	responsible?: string
	effort?: number
	startDate?: Date
	endDate?: Date
	offsetDays?: number
	calendarDuration?: number
	formattedStartDate?: string
	formattedEndDate?: string
}

export interface ProjectConfig {
	projectStartDate: string
	deadline: string
	skipWeekends: boolean
	holidays: string[]
	risks: string[]
	teamMembers: string[]
}

const STORAGE_KEY_TASKS = 'gantt-pro-tasks'
const STORAGE_KEY_CONFIG = 'gantt-pro-config'

const loadInitialTasks = (): Task[] => {
	const saved = localStorage.getItem(STORAGE_KEY_TASKS)
	return saved ? JSON.parse(saved) : []
}

const loadInitialConfig = (): ProjectConfig => {
	const saved = localStorage.getItem(STORAGE_KEY_CONFIG)
	if (saved) {
		const parsed = JSON.parse(saved)
		return {
			holidays: [],
			risks: [],
			teamMembers: [],
			...parsed,
		}
	}
	return {
		projectStartDate: format(new Date(), 'yyyy-MM-dd'),
		deadline: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
		skipWeekends: true,
		holidays: [],
		risks: [],
		teamMembers: [],
	}
}

const tasks = ref<Task[]>(loadInitialTasks())
const config = ref<ProjectConfig>(loadInitialConfig())
const editingTask = ref<Task | null>(null)

export function useGantt() {
	watch(
		[tasks, config],
		() => {
			localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks.value))
			localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config.value))
		},
		{ deep: true },
	)

	const isNonWorkingDay = (date: Date) => {
		const dateString = format(date, 'yyyy-MM-dd')
		const isHoliday = config.value.holidays.includes(dateString)
		if (config.value.skipWeekends) {
			return isWeekend(date) || isHoliday
		}
		return isHoliday
	}

	const calculateEndDate = (start: Date, duration: number) => {
		let daysAdded = 0
		let current = start
		const targetDays = Math.max(0, duration - 1)
		while (daysAdded < targetDays) {
			current = addDays(current, 1)
			if (!isNonWorkingDay(current)) daysAdded++
		}
		return current
	}

	const getNextValidStartDate = (date: Date) => {
		let current = date
		while (isNonWorkingDay(current)) current = addDays(current, 1)
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
				if (task.dependencyId) {
					const depDates = tempDates.get(task.dependencyId)
					if (depDates) {
						let tentativeStart = addDays(depDates.end, 1)
						start = getNextValidStartDate(tentativeStart)
					}
				} else {
					start = getNextValidStartDate(projectStart)
				}
				const end = calculateEndDate(start, task.duration)
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

	const importTasks = (newTasks: Partial<Task>[]) => {
		tasks.value = newTasks.map(t => ({
			id: t.id || crypto.randomUUID(),
			name: t.name || 'Sem nome',
			duration: t.duration || 1,
			dependencyId: t.dependencyId || null,
			color: t.color || '#3b82f6',
			type: t.type || 'other',
			responsible: t.responsible || '',
			effort: t.effort || 0,
		})) as Task[]
	}

	const totalProjectDays = computed(() => {
		if (computedTasks.value.length === 0) return 30
		const projectStart = startOfDay(new Date(config.value.projectStartDate))
		const lastTaskDate = computedTasks.value.reduce((max, t) => {
			return t.endDate && t.endDate > max ? t.endDate : max
		}, projectStart)
		const diffTasks = differenceInCalendarDays(lastTaskDate, projectStart)
		const diffDeadline = differenceInCalendarDays(new Date(config.value.deadline), projectStart)
		return Math.max(diffTasks + 7, diffDeadline + 7, 30)
	})

	const addTask = (task: Partial<Task>) => {
		tasks.value.push({
			id: crypto.randomUUID(),
			name: task.name || 'Nova Tarefa',
			duration: task.duration || 1,
			dependencyId: task.dependencyId || null,
			color: task.color || '#3b82f6',
			type: task.type || 'other',
			responsible: task.responsible || '',
			effort: task.effort || 0,
		})
	}

	const updateTask = (updatedTask: Task) => {
		const index = tasks.value.findIndex(t => t.id === updatedTask.id)
		if (index !== -1) tasks.value[index] = { ...updatedTask }
		editingTask.value = null
	}

	const removeTask = (id: string) => {
		tasks.value = tasks.value.filter(t => t.id !== id)
		tasks.value.forEach(t => {
			if (t.dependencyId === id) t.dependencyId = null
		})
		if (editingTask.value?.id === id) editingTask.value = null
	}

	const setEditingTask = (task: Task) => (editingTask.value = JSON.parse(JSON.stringify(task)))
	const cancelEditing = () => (editingTask.value = null)

	const addHoliday = (date: string) => {
		if (!config.value.holidays.includes(date)) {
			config.value.holidays.push(date)
			config.value.holidays.sort()
		}
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
	const addMember = (name: string) => {
		if (name && !config.value.teamMembers.includes(name)) {
			config.value.teamMembers.push(name)
		}
	}
	const removeMember = (index: number) => {
		config.value.teamMembers.splice(index, 1)
	}

	// Motor de Riscos
	const automaticRisks = computed(() => {
		const risks: string[] = []
		if (computedTasks.value.length > 0) {
			const projectStart = startOfDay(new Date(config.value.projectStartDate))
			const deadlineDate = startOfDay(new Date(config.value.deadline))
			const lastTaskDate = computedTasks.value.reduce((max, t) => {
				return t.endDate && t.endDate > max ? t.endDate : max
			}, projectStart)

			if (lastTaskDate > deadlineDate) {
				const daysLate = differenceInCalendarDays(lastTaskDate, deadlineDate)
				risks.push(`CRÍTICO: O projeto terminará ${daysLate} dia(s) após o prazo final!`)
			} else {
				const margin = differenceInCalendarDays(deadlineDate, lastTaskDate)
				if (margin < 3 && margin >= 0) {
					risks.push(`ALERTA: Margem de segurança baixa (${margin} dias até o prazo).`)
				}
			}
		}
		computedTasks.value.forEach(task => {
			if (task.effort && task.duration && task.effort > task.duration * 8) {
				risks.push(`CAPACIDADE: Tarefa "${task.name}" requer ${task.effort}h em apenas ${task.duration} dia(s).`)
			}
			if (task.startDate && task.endDate) {
				const hasHoliday = config.value.holidays.some(h => {
					const hDate = startOfDay(parseISO(h))
					return task.startDate! <= hDate && task.endDate! >= hDate
				})
				if (hasHoliday && task.duration < 3) {
					risks.push(`CALENDÁRIO: Tarefa curta "${task.name}" é interrompida por um feriado.`)
				}
			}
		})
		return risks
	})

	// --- NOVO: Análise do Caminho Crítico ---
	const criticalPathIds = computed(() => {
		if (!computedTasks.value.length) return []

		// 1. Encontrar a data final absoluta do projeto
		let maxEndDate = 0
		computedTasks.value.forEach(t => {
			if (t.endDate && t.endDate.getTime() > maxEndDate) {
				maxEndDate = t.endDate.getTime()
			}
		})

		const criticalSet = new Set<string>()

		// 2. Identificar tarefas que terminam nessa data (as últimas da cadeia)
		const lastTasks = computedTasks.value.filter(t => t.endDate && t.endDate.getTime() === maxEndDate)

		// 3. Rastrear os pais recursivamente (se o filho é crítico, o pai também é)
		const traceParents = (taskId: string) => {
			criticalSet.add(taskId)
			const task = computedTasks.value.find(t => t.id === taskId)
			if (task && task.dependencyId) {
				traceParents(task.dependencyId)
			}
		}

		lastTasks.forEach(t => traceParents(t.id))

		return Array.from(criticalSet)
	})

	return {
		tasks,
		config,
		computedTasks,
		totalProjectDays,
		editingTask,
		addTask,
		updateTask,
		removeTask,
		importTasks,
		setEditingTask,
		cancelEditing,
		addHoliday,
		removeHoliday,
		addRisk,
		removeRisk,
		isNonWorkingDay,
		addMember,
		removeMember,
		automaticRisks,
		criticalPathIds,
	}
}
