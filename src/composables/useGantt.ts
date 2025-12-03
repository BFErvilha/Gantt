import { ref, computed, watch } from 'vue'
import { addDays, addBusinessDays, format, startOfDay, isWeekend, differenceInCalendarDays } from 'date-fns'

export interface Task {
	id: string
	name: string
	duration: number
	dependencyId: string | null
	color: string
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
}

const STORAGE_KEY_TASKS = 'gantt-pro-tasks'
const STORAGE_KEY_CONFIG = 'gantt-pro-config'

const loadInitialTasks = (): Task[] => {
	const saved = localStorage.getItem(STORAGE_KEY_TASKS)
	return saved ? JSON.parse(saved) : []
}

const loadInitialConfig = (): ProjectConfig => {
	const saved = localStorage.getItem(STORAGE_KEY_CONFIG)
	return saved
		? JSON.parse(saved)
		: {
				projectStartDate: format(new Date(), 'yyyy-MM-dd'),
				deadline: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
				skipWeekends: true,
		  }
}

const tasks = ref<Task[]>(loadInitialTasks())
const config = ref<ProjectConfig>(loadInitialConfig())

export function useGantt() {
	watch(
		[tasks, config],
		() => {
			localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks.value))
			localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config.value))
		},
		{ deep: true },
	)

	const calculateEndDate = (start: Date, duration: number) => {
		const durationCalc = Math.max(0, duration - 1)

		if (config.value.skipWeekends) {
			return addBusinessDays(start, durationCalc)
		}
		return addDays(start, durationCalc)
	}

	const getNextValidStartDate = (date: Date) => {
		if (!config.value.skipWeekends) return date

		let current = date
		while (isWeekend(current)) {
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
			const dates = tempDates.get(task.id) || {
				start: projectStart,
				end: projectStart,
			}

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
		})
	}

	const removeTask = (id: string) => {
		tasks.value = tasks.value.filter(t => t.id !== id)
		tasks.value.forEach(t => {
			if (t.dependencyId === id) t.dependencyId = null
		})
	}

	return {
		tasks,
		config,
		computedTasks,
		totalProjectDays,
		addTask,
		removeTask,
		importTasks,
	}
}
