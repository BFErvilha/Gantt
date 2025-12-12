import { computed } from 'vue'
import { addDays, format, startOfDay, isWeekend, differenceInCalendarDays, parseISO, isValid, isAfter, isBefore } from 'date-fns'
import { useGanttState } from './useGanttState'
import type { Sprint } from '../types/gantt'

export function useGanttCalculations() {
	const { config, tasks } = useGanttState()

	const isNonWorkingDay = (date: Date, responsibleName?: string) => {
		if (!isValid(date)) return false
		const dateString = format(date, 'yyyy-MM-dd')

		if (config.value.holidays.includes(dateString)) return true

		if (config.value.skipWeekends && isWeekend(date)) return true

		if (responsibleName) {
			const member = config.value.teamMembers.find(m => m.name === responsibleName)
			if (member?.daysOff?.includes(dateString)) return true
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

	const findSprintById = (sprintId: string): Sprint | undefined => {
		for (const squad of config.value.squads) {
			const sprint = squad.sprints?.find(s => s.id === sprintId)
			if (sprint) return sprint
		}
		return undefined
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
					const manualDate = parseISO(task.manualStartDate)
					if (isValid(manualDate)) start = getNextValidStartDate(manualDate, task.responsible)
				} else if (task.dependencyId) {
					const depData = tempDates.get(task.dependencyId)
					if (depData) {
						let gapDays = depData.type === 'backend' && task.type === 'frontend' ? 3 : 1
						start = getNextValidStartDate(addDays(depData.end, gapDays), task.responsible)
					}
				} else if (task.sprintId) {
					const sprint = findSprintById(task.sprintId)
					if (sprint && isValid(parseISO(sprint.startDate))) {
						start = getNextValidStartDate(parseISO(sprint.startDate), task.responsible)
					} else {
						start = getNextValidStartDate(projectStart, task.responsible)
					}
				} else {
					start = getNextValidStartDate(projectStart, task.responsible)
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
			return {
				...task,
				startDate: dates.start,
				endDate: dates.end,
				offsetDays: differenceInCalendarDays(dates.start, baseDate),
				calendarDuration: task.isMilestone ? 1 : differenceInCalendarDays(dates.end, dates.start) + 1,
				formattedStartDate: format(dates.start, 'dd/MM/yyyy'),
				formattedEndDate: format(dates.end, 'dd/MM/yyyy'),
			}
		})
	})

	const suggestedEndDate = computed(() => {
		let maxDate = startOfDay(new Date(config.value.projectStartDate || new Date()))
		config.value.squads.forEach(s =>
			s.sprints?.forEach(sp => {
				const end = startOfDay(parseISO(sp.endDate))
				if (isValid(end) && isAfter(end, maxDate)) maxDate = end
			}),
		)
		computedTasks.value.forEach(t => {
			if (t.endDate && isValid(t.endDate) && isAfter(t.endDate, maxDate)) maxDate = t.endDate
		})
		return maxDate
	})

	const projectDeadlineComputed = computed(() => {
		let limit = suggestedEndDate.value
		if (config.value.deadline) {
			const manual = startOfDay(parseISO(config.value.deadline))
			if (isValid(manual) && isAfter(manual, limit)) limit = manual
		}
		return addDays(limit, 7)
	})

	const projectCapacityStats = computed(() => {
		const start = isValid(parseISO(config.value.projectStartDate)) ? startOfDay(parseISO(config.value.projectStartDate)) : startOfDay(new Date())

		const end = projectDeadlineComputed.value
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
		let notPlannedEffort = 0,
			totalEffort = 0

		computedTasks.value.forEach(task => {
			if (task.isCompleted) return
			totalEffort += task.effort || 0
			if (task.isNotPlanned) notPlannedEffort += task.effort || 0

			const member = config.value.teamMembers.find(m => m.name === task.responsible)
			const capacity = member ? member.capacity : 8

			if (!task.isMilestone && task.effort && task.duration && task.effort > task.duration * capacity) {
				risks.push(`CAPACIDADE: "${task.name}" requer ${task.effort}h. Limite: ${task.duration * capacity}h.`)
			}

			if (task.sprintId && task.startDate && task.endDate) {
				const sprint = findSprintById(task.sprintId)
				if (sprint) {
					const sStart = startOfDay(parseISO(sprint.startDate))
					const sEnd = startOfDay(parseISO(sprint.endDate))
					if (isBefore(task.startDate, sStart)) risks.push(`SPRINT: "${task.name}" começa antes de ${sprint.name}.`)
					if (isAfter(task.endDate, sEnd)) risks.push(`SPRINT: "${task.name}" estoura ${sprint.name}.`)
				}
			}

			if (task.startDate && task.endDate) {
				const hasConflict = config.value.holidays.some(h => {
					const d = startOfDay(parseISO(h))
					return task.startDate! <= d && task.endDate! >= d
				})
				if (hasConflict && task.duration < 3) risks.push(`CALENDÁRIO: Tarefa curta "${task.name}" cai em feriado.`)
			}
		})

		if (totalEffort > 0 && notPlannedEffort / totalEffort > 0.2) {
			risks.push(`CARRY-OVER: ${Math.round((notPlannedEffort / totalEffort) * 100)}% do esforço é Não Planejado.`)
		}
		return risks
	})

	const criticalPathIds = computed(() => {
		if (!computedTasks.value.length) return []
		let maxEnd = 0
		computedTasks.value.forEach(t => {
			if (!t.isCompleted && t.endDate) maxEnd = Math.max(maxEnd, t.endDate.getTime())
		})
		const criticalSet = new Set<string>()
		const trace = (tid: string) => {
			criticalSet.add(tid)
			const t = computedTasks.value.find(x => x.id === tid)
			if (t?.dependencyId) trace(t.dependencyId)
		}
		computedTasks.value.filter(t => !t.isCompleted && t.endDate?.getTime() === maxEnd).forEach(t => trace(t.id))
		return Array.from(criticalSet)
	})

	return {
		computedTasks,
		isNonWorkingDay,
		calculateEndDate,
		findSprintById,
		suggestedEndDate,
		projectDeadlineComputed,
		projectCapacityStats,
		automaticRisks,
		criticalPathIds,
	}
}
