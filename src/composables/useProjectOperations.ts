import { format } from 'date-fns'
import { useGanttState } from './useGanttState'

export function useProjectOperations() {
	const { config, tasks } = useGanttState()

	const addHoliday = (date: string) => {
		if (!config.value.holidays.includes(date)) config.value.holidays.push(date)
	}
	const removeHoliday = (date: string) => {
		config.value.holidays = config.value.holidays.filter(d => d !== date)
	}
	const addRisk = (risk: string) => {
		if (risk && !config.value.risks.includes(risk)) config.value.risks.push(risk)
	}
	const removeRisk = (idx: number) => {
		config.value.risks.splice(idx, 1)
	}

	const addMember = (name: string, capacity = 8, sector = 'Outro', squadIds: string[] = []) => {
		if (name && !config.value.teamMembers.some(m => m.name === name)) {
			config.value.teamMembers.push({ name, capacity, daysOff: [], sector, squadIds })
		}
	}
	const updateMember = (index: number, newName: string, newCapacity: number, newSector: string, newSquadIds: string[]) => {
		const oldName = config.value.teamMembers[index].name
		config.value.teamMembers[index] = { ...config.value.teamMembers[index], name: newName, capacity: newCapacity, sector: newSector, squadIds: newSquadIds }
		if (oldName !== newName)
			tasks.value.forEach(t => {
				if (t.responsible === oldName) t.responsible = newName
			})
	}
	const removeMember = (index: number) => config.value.teamMembers.splice(index, 1)

	const linkMemberToSquad = (idx: number, sId: string, newCapacity?: number) => {
		if (!config.value.teamMembers[idx].squadIds.includes(sId)) {
			config.value.teamMembers[idx].squadIds.push(sId)
		}
		if (newCapacity !== undefined) {
			config.value.teamMembers[idx].capacity = newCapacity
		}
	}

	const unlinkMemberFromSquad = (idx: number, sId: string) => {
		config.value.teamMembers[idx].squadIds = config.value.teamMembers[idx].squadIds.filter(id => id !== sId)
	}
	const addMemberDayOff = (idx: number, date: string) => {
		if (!config.value.teamMembers[idx].daysOff.includes(date)) config.value.teamMembers[idx].daysOff.push(date)
	}
	const removeMemberDayOff = (idx: number, date: string) => {
		config.value.teamMembers[idx].daysOff = config.value.teamMembers[idx].daysOff.filter(d => d !== date)
	}

	const addSquad = (name: string, color: string) => {
		config.value.squads.push({ id: crypto.randomUUID(), name, color, startDate: format(new Date(), 'yyyy-MM-dd'), deadline: '', skipWeekends: true, holidays: [], sprints: [] })
	}
	const updateSquad = (id: string, name: string, color: string) => {
		const s = config.value.squads.find(sq => sq.id === id)
		if (s) {
			s.name = name
			s.color = color
		}
	}
	const removeSquad = (id: string) => {
		config.value.squads = config.value.squads.filter(s => s.id !== id)
		config.value.teamMembers.forEach(m => (m.squadIds = m.squadIds.filter(sid => sid !== id)))
	}
	const addSprint = (name: string, start: string, end: string, sId?: string) => {
		config.value.sprints.push({ id: crypto.randomUUID(), name, startDate: start, endDate: end, squadId: sId })
		config.value.sprints.sort((a, b) => a.startDate.localeCompare(b.startDate))
	}
	const updateSprint = (id: string, name: string, start: string, end: string, sId?: string) => {
		const idx = config.value.sprints.findIndex(s => s.id === id)
		if (idx !== -1) config.value.sprints[idx] = { ...config.value.sprints[idx], name, startDate: start, endDate: end, squadId: sId }
	}
	const removeSprint = (id: string) => {
		config.value.sprints = config.value.sprints.filter(s => s.id !== id)
		tasks.value.forEach(t => {
			if (t.sprintId === id) t.sprintId = undefined
		})
	}
	const addSprintToSquad = (squadId: string, name: string, start: string, end: string) => {
		const squad = config.value.squads.find(s => s.id === squadId)
		if (squad) {
			squad.sprints.push({ id: crypto.randomUUID(), name, startDate: start, endDate: end, squadId })
			squad.sprints.sort((a, b) => a.startDate.localeCompare(b.startDate))
		}
	}
	const updateSprintInSquad = (sid: string, spid: string, name: string, st: string, en: string) => {
		const sq = config.value.squads.find(s => s.id === sid)
		const sp = sq?.sprints.find(s => s.id === spid)
		if (sp) {
			sp.name = name
			sp.startDate = st
			sp.endDate = en
			sq?.sprints.sort((a, b) => a.startDate.localeCompare(b.startDate))
		}
	}
	const removeSprintFromSquad = (sid: string, spid: string) => {
		const sq = config.value.squads.find(s => s.id === sid)
		if (sq) {
			sq.sprints = sq.sprints.filter(s => s.id !== spid)
			tasks.value.forEach(t => {
				if (t.sprintId === spid) t.sprintId = undefined
			})
		}
	}
	const addHolidayToSquad = (sid: string, date: string) => {
		const sq = config.value.squads.find(s => s.id === sid)
		if (sq && !sq.holidays.includes(date)) sq.holidays.push(date)
	}
	const removeHolidayFromSquad = (sid: string, date: string) => {
		const sq = config.value.squads.find(s => s.id === sid)
		if (sq) sq.holidays = sq.holidays.filter(d => d !== date)
	}

	return {
		addHoliday,
		removeHoliday,
		addRisk,
		removeRisk,
		addMember,
		updateMember,
		removeMember,
		addMemberDayOff,
		removeMemberDayOff,
		linkMemberToSquad,
		unlinkMemberFromSquad,
		addSquad,
		updateSquad,
		removeSquad,
		addHolidayToSquad,
		removeHolidayFromSquad,
		addSprint,
		updateSprint,
		removeSprint,
		addSprintToSquad,
		updateSprintInSquad,
		removeSprintFromSquad,
	}
}
