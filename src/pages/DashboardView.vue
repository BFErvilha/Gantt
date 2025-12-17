<script setup lang="ts">
import { computed } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { differenceInCalendarDays, parseISO, isAfter, startOfDay, format, isValid } from 'date-fns'

import StatCard from '@/components/dashboard/StatCard.vue'
import WorkloadCard from '@/components/dashboard/WorkloadCard.vue'
import SectorCard from '@/components/dashboard/SectorCard.vue'
import BaselineCard from '@/components/dashboard/BaselineCard.vue'
import RisksCard from '@/components/dashboard/RisksCard.vue'

const { tasks, config, automaticRisks, projectCapacityStats, computedTasks } = useGantt()

const totalTasks = computed(() => tasks.value.length)

const timeProgress = computed(() => {
	if (!config.value.projectStartDate || !config.value.deadline) return 0
	const start = parseISO(config.value.projectStartDate)
	const end = parseISO(config.value.deadline)
	if (!isValid(start) || !isValid(end)) return 0
	const today = new Date()
	const totalDuration = differenceInCalendarDays(end, start)
	const elapsed = differenceInCalendarDays(today, start)
	if (totalDuration <= 0) return 0
	if (elapsed < 0) return 0
	if (elapsed > totalDuration) return 100
	return Math.round((elapsed / totalDuration) * 100)
})

const completedStats = computed(() => {
	const completed = computedTasks.value.filter(t => t.isCompleted)
	let onTime = 0
	let late = 0
	completed.forEach(t => {
		if (!t.completedDate || !t.endDate) return
		const doneDate = startOfDay(parseISO(t.completedDate))
		const plannedEnd = startOfDay(t.endDate)
		if (isValid(doneDate) && isValid(plannedEnd) && isAfter(doneDate, plannedEnd)) {
			late++
		} else {
			onTime++
		}
	})
	return { total: completed.length, onTime, late }
})

const notPlannedStats = computed(() => {
	const notPlanned = tasks.value.filter(t => t.isNotPlanned)
	return {
		total: notPlanned.length,
		open: notPlanned.filter(t => !t.isCompleted).length,
	}
})

const teamWorkload = computed(() => {
	return config.value.teamMembers.map(member => {
		const assignedHours = tasks.value.filter(t => t.responsible === member.name && !t.isCompleted && !t.isMilestone).reduce((acc, t) => acc + (t.effort || 0), 0)
		const stat = projectCapacityStats.value.memberStats.find(s => s.name === member.name)
		const totalCapacity = stat ? stat.totalCapacity : 0
		const usagePercentage = totalCapacity > 0 ? Math.round((assignedHours / totalCapacity) * 100) : 0
		return {
			name: member.name,
			assigned: assignedHours,
			capacity: totalCapacity,
			percentage: usagePercentage,
			isOverloaded: assignedHours > totalCapacity,
			sector: member.sector || 'Outro',
		}
	})
})

const tasksByType = computed(() => {
	const types = { frontend: 0, backend: 0, qualidade: 0, other: 0 }
	tasks.value.forEach(t => {
		const typeKey = t.type in types ? (t.type as keyof typeof types) : 'other'
		types[typeKey]++
	})
	return [
		{ label: 'Front-end', value: types.frontend, color: 'bg-blue-500' },
		{ label: 'Back-end', value: types.backend, color: 'bg-green-500' },
		{ label: 'Qualidade', value: types.qualidade, color: 'bg-purple-500' },
		{ label: 'Outros', value: types.other, color: 'bg-gray-400' },
	].filter(t => t.value > 0)
})

const sectorCapacityStats = computed(() => {
	const stats: Record<string, { totalCapacity: number; assignedEffort: number; memberCount: number }> = {}
	teamWorkload.value.forEach(member => {
		const sectorName = member.sector || 'Outro'
		if (!stats[sectorName]) stats[sectorName] = { totalCapacity: 0, assignedEffort: 0, memberCount: 0 }
		stats[sectorName].totalCapacity += member.capacity
		stats[sectorName].assignedEffort += member.assigned
		stats[sectorName].memberCount += 1
	})
	return Object.entries(stats).map(([name, data]) => ({
		name,
		...data,
		percentage: data.totalCapacity > 0 ? Math.round((data.assignedEffort / data.totalCapacity) * 100) : 0,
	}))
})

const baselineStats = computed(() => {
	const delayedTasks: any[] = []
	let totalDelayDays = 0
	computedTasks.value.forEach(t => {
		if (t.originalEndDate && t.endDate) {
			const originalEnd = parseISO(t.originalEndDate)
			const diff = differenceInCalendarDays(t.endDate, originalEnd)
			if (diff > 0) {
				delayedTasks.push({
					name: t.name,
					responsible: t.responsible || 'N/A',
					delay: diff,
					planned: format(originalEnd, 'dd/MM'),
					current: format(t.endDate, 'dd/MM'),
					isMilestone: t.isMilestone,
				})
				totalDelayDays += diff
			}
		}
	})
	return {
		count: delayedTasks.length,
		totalDelay: totalDelayDays,
		tasks: delayedTasks.sort((a, b) => b.delay - a.delay).slice(0, 5),
	}
})

const parsedRisks = computed(() => {
	return automaticRisks.value.map(risk => {
		let type = 'INFO',
			title = 'Aviso',
			message = risk,
			icon = 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
		let styles = 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'

		if (risk.includes('CAPACIDADE:')) {
			type = 'CAPACIDADE'
			title = 'Sobrecarga Detectada'
			message = risk.replace('CAPACIDADE:', '').trim()
			styles = 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
			icon = 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
		} else if (risk.includes('SPRINT:')) {
			type = 'SPRINT'
			title = 'Conflito de Sprint'
			message = risk.replace('SPRINT:', '').trim()
			styles = 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200'
			icon = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
		} else if (risk.includes('CALENDÁRIO:') || risk.includes('feriado')) {
			type = 'CALENDÁRIO'
			title = 'Conflito de Agenda'
			message = risk.replace('CALENDÁRIO:', '').trim()
			styles = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
			icon = 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
		} else if (risk.includes('CARRY-OVER:') || risk.includes('Não Planejadas')) {
			type = 'RISCO'
			title = 'Risco de Entrega'
			message = risk.replace('CARRY-OVER:', '').trim()
			styles = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
			icon = 'M13 10V3L4 14h7v7l9-11h-7z'
		}
		return { type, title, message, styles, icon }
	})
})
</script>

<template>
	<div class="space-y-6 animate-fade-in">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<StatCard title="Total de Tarefas">
				<template #value>
					<div class="text-3xl font-black text-slate-700 dark:text-slate-200 mt-1">{{ totalTasks }}</div>
				</template>
				<template #footer>
					<div class="text-xs text-slate-400 dark:text-slate-500 mt-2">No cronograma</div>
				</template>
			</StatCard>

			<StatCard title="Concluídas">
				<template #value>
					<div class="text-3xl font-black text-green-600 dark:text-green-500 mt-1">{{ completedStats.total }}</div>
				</template>
				<template #footer>
					<div class="flex gap-2 text-xs mt-2">
						<span class="text-green-600 dark:text-green-500 font-bold">{{ completedStats.onTime }} no prazo</span>
						<span v-if="completedStats.late > 0" class="text-red-500 dark:text-red-400 font-bold">{{ completedStats.late }} com atraso</span>
					</div>
				</template>
			</StatCard>

			<StatCard title="Não Planejadas">
				<template #value>
					<div class="text-3xl font-black text-slate-700 dark:text-slate-200 mt-1">
						{{ notPlannedStats.open }} <span class="text-lg text-slate-400 dark:text-slate-600 font-normal">/ {{ notPlannedStats.total }}</span>
					</div>
				</template>
				<template #footer>
					<div class="text-xs text-slate-400 dark:text-slate-500 mt-2">Tarefas abertas sem Sprint</div>
				</template>
				<template #decoration>
					<div v-if="notPlannedStats.open > 0" class="absolute right-0 top-0 bottom-0 w-1 bg-amber-400"></div>
				</template>
			</StatCard>

			<StatCard title="Tempo Decorrido">
				<template #value>
					<div class="flex items-end gap-2 mt-1">
						<span class="text-3xl font-black text-slate-700 dark:text-slate-200">{{ timeProgress }}%</span>
					</div>
				</template>
				<template #footer>
					<div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
						<div class="bg-slate-800 dark:bg-slate-400 h-full rounded-full transition-all duration-1000" :style="{ width: timeProgress + '%' }"></div>
					</div>
				</template>
			</StatCard>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<WorkloadCard :data="teamWorkload" />
			<SectorCard :sectors="sectorCapacityStats" :types="tasksByType" />
		</div>

		<div>
			<BaselineCard :stats="baselineStats" />
		</div>

		<RisksCard :risks="parsedRisks" />
	</div>
</template>

<style scoped>
.animate-fade-in {
	animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
