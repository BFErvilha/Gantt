<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { differenceInCalendarDays, parseISO, isAfter, startOfDay, format, isValid, eachDayOfInterval, isWeekend, addDays } from 'date-fns'

const { tasks, config, automaticRisks, computedTasks } = useGantt()

const dashboardSquadFilter = ref('')

const totalTasks = computed(() => {
	if (!dashboardSquadFilter.value) return tasks.value.length
	return tasks.value.filter(t => {
		const member = config.value.teamMembers.find(m => m.name === t.responsible)
		return member?.squadIds.includes(dashboardSquadFilter.value)
	}).length
})

const timeProgress = computed(() => {
	const squad = config.value.squads.find(s => s.id === dashboardSquadFilter.value)
	const startStr = dashboardSquadFilter.value ? squad?.startDate : config.value.projectStartDate
	const endStr = dashboardSquadFilter.value ? squad?.deadline : config.value.deadline

	if (!startStr || !endStr) return 0

	const start = parseISO(startStr)
	const end = parseISO(endStr)
	if (!isValid(start) || !isValid(end)) return 0

	const today = new Date()
	const totalDuration = differenceInCalendarDays(end, start)
	const elapsed = differenceInCalendarDays(today, start)

	if (elapsed < 0) return 0
	if (elapsed > totalDuration) return 100
	return Math.round((elapsed / totalDuration) * 100)
})

const completedStats = computed(() => {
	const source = dashboardSquadFilter.value
		? computedTasks.value.filter(t => {
				const member = config.value.teamMembers.find(m => m.name === t.responsible)
				return member?.squadIds.includes(dashboardSquadFilter.value)
		  })
		: computedTasks.value

	const completed = source.filter(t => t.isCompleted)
	const total = completed.length
	let onTime = 0
	let late = 0

	completed.forEach(t => {
		if (!t.completedDate || !t.endDate) return
		const doneDate = startOfDay(parseISO(t.completedDate))
		if (isAfter(doneDate, t.endDate)) late++
		else onTime++
	})

	return { total, onTime, late }
})

const notPlannedStats = computed(() => {
	const source = dashboardSquadFilter.value
		? tasks.value.filter(t => {
				const member = config.value.teamMembers.find(m => m.name === t.responsible)
				return member?.squadIds.includes(dashboardSquadFilter.value)
		  })
		: tasks.value

	const notPlanned = source.filter(t => t.isNotPlanned)
	return { total: notPlanned.length, open: notPlanned.filter(t => !t.isCompleted).length }
})

const teamWorkload = computed(() => {
	const members = dashboardSquadFilter.value ? config.value.teamMembers.filter(m => m.squadIds.includes(dashboardSquadFilter.value)) : config.value.teamMembers

	return members.map(member => {
		const assignedHours = tasks.value.filter(t => t.responsible === member.name && !t.isCompleted && !t.isMilestone).reduce((acc, t) => acc + (t.effort || 0), 0)

		let totalCapacity = 0
		config.value.squads.forEach(squad => {
			if (member.squadIds.includes(squad.id)) {
				squad.sprints.forEach(sprint => {
					const start = parseISO(sprint.startDate)
					const end = parseISO(sprint.endDate)
					if (isValid(start) && isValid(end)) {
						const interval = eachDayOfInterval({ start, end })
						const ritos = [sprint.planningDate, sprint.refinementDate, sprint.reviewDate, sprint.retroDate]
						const workingDays = interval.filter(day => {
							const dStr = format(day, 'yyyy-MM-dd')
							const isWeekEnd = (sprint.skipWeekends ?? squad.skipWeekends) && isWeekend(day)
							return !isWeekEnd && !squad.holidays.includes(dStr) && !config.value.holidays.includes(dStr) && !member.daysOff.includes(dStr) && !ritos.includes(dStr)
						}).length
						totalCapacity += workingDays * member.capacity
					}
				})
			}
		})

		if (totalCapacity === 0) {
			const start = parseISO(config.value.projectStartDate)
			const end = config.value.deadline ? parseISO(config.value.deadline) : addDays(start, 30)
			if (isValid(start) && isValid(end)) {
				totalCapacity = eachDayOfInterval({ start, end }).filter(d => !isWeekend(d)).length * member.capacity
			}
		}

		const usagePercentage = totalCapacity > 0 ? Math.round((assignedHours / totalCapacity) * 100) : 0
		return { name: member.name, assigned: assignedHours, capacity: totalCapacity, percentage: usagePercentage, isOverloaded: assignedHours > totalCapacity, sector: member.sector || 'Outro' }
	})
})

const tasksByType = computed(() => {
	const source = dashboardSquadFilter.value
		? tasks.value.filter(t => {
				const member = config.value.teamMembers.find(m => m.name === t.responsible)
				return member?.squadIds.includes(dashboardSquadFilter.value)
		  })
		: tasks.value

	const types = { frontend: 0, backend: 0, qualidade: 0, other: 0 }
	source.forEach(t => {
		if (t.type in types) types[t.type as keyof typeof types]++
		else types.other++
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
		if (!stats[member.sector]) stats[member.sector] = { totalCapacity: 0, assignedEffort: 0, memberCount: 0 }
		stats[member.sector].totalCapacity += member.capacity
		stats[member.sector].assignedEffort += member.assigned
		stats[member.sector].memberCount += 1
	})
	return Object.entries(stats).map(([name, data]) => ({ name, ...data, percentage: data.totalCapacity > 0 ? Math.round((data.assignedEffort / data.totalCapacity) * 100) : 0 }))
})

const baselineStats = computed(() => {
	const source = dashboardSquadFilter.value
		? computedTasks.value.filter(t => {
				const member = config.value.teamMembers.find(m => m.name === t.responsible)
				return member?.squadIds.includes(dashboardSquadFilter.value)
		  })
		: computedTasks.value

	const delayedTasks: any[] = []
	let totalDelayDays = 0
	source.forEach(t => {
		if (t.originalEndDate && t.endDate) {
			const originalEnd = parseISO(t.originalEndDate)
			const diff = differenceInCalendarDays(t.endDate, originalEnd)
			if (diff > 0) {
				delayedTasks.push({ name: t.name, responsible: t.responsible || 'N/A', delay: diff, planned: format(originalEnd, 'dd/MM'), current: format(t.endDate, 'dd/MM'), isMilestone: t.isMilestone })
				totalDelayDays += diff
			}
		}
	})
	return { count: delayedTasks.length, totalDelay: totalDelayDays, tasks: delayedTasks.sort((a, b) => b.delay - a.delay).slice(0, 5) }
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
			title = 'Sobrecarga'
			message = risk.replace('CAPACIDADE:', '').trim()
			styles = 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
			icon = 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
		} else if (risk.includes('SPRINT:')) {
			type = 'SPRINT'
			title = 'Conflito de Sprint'
			message = risk.replace('SPRINT:', '').trim()
			styles = 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200'
			icon = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
		} else if (risk.includes('CALENDÁRIO:')) {
			type = 'CALENDÁRIO'
			title = 'Agenda'
			message = risk.replace('CALENDÁRIO:', '').trim()
			styles = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
			icon = 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
		}
		return { type, title, message, styles, icon }
	})
})
</script>

<template>
	<div class="space-y-6 animate-fade-in pb-10">
		<div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors">
			<div>
				<h2 class="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><span class="text-xl">📊</span> Dashboard de Performance</h2>
				<p class="text-xs text-slate-500">Métricas ajustadas por Squad e ritos de Sprint.</p>
			</div>
			<select v-model="dashboardSquadFilter" class="rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold h-10 px-3 focus:ring-2 focus:ring-indigo-500">
				<option value="">🌍 Visão Global do Projeto</option>
				<option v-for="s in config.squads" :key="s.id" :value="s.id">Squad: {{ s.name }}</option>
			</select>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between transition-colors">
				<span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total de Tarefas</span>
				<div class="text-3xl font-black text-slate-700 dark:text-slate-200 mt-1">{{ totalTasks }}</div>
				<div class="text-xs text-slate-400 dark:text-slate-500 mt-2">Filtradas por contexto</div>
			</div>

			<div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between transition-colors">
				<span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Concluídas</span>
				<div class="text-3xl font-black text-green-600 dark:text-green-500 mt-1">{{ completedStats.total }}</div>
				<div class="flex gap-2 text-xs mt-2">
					<span class="text-green-600 dark:text-green-500 font-bold">{{ completedStats.onTime }} no prazo</span>
					<span v-if="completedStats.late > 0" class="text-red-500 dark:text-red-400 font-bold">{{ completedStats.late }} com atraso</span>
				</div>
			</div>

			<div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between relative overflow-hidden transition-colors">
				<span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Não Planejadas</span>
				<div class="text-3xl font-black text-slate-700 dark:text-slate-200 mt-1">
					{{ notPlannedStats.open }} <span class="text-lg text-slate-400 dark:text-slate-600 font-normal">/ {{ notPlannedStats.total }}</span>
				</div>
				<div class="text-xs text-slate-400 dark:text-slate-500 mt-2">Abertas sem Sprint</div>
				<div v-if="notPlannedStats.open > 0" class="absolute right-0 top-0 bottom-0 w-1 bg-amber-400"></div>
			</div>

			<div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between transition-colors">
				<span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tempo Decorrido</span>
				<div class="flex items-end gap-2 mt-1">
					<span class="text-3xl font-black text-slate-700 dark:text-slate-200">{{ timeProgress }}%</span>
				</div>
				<div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
					<div class="bg-slate-800 dark:bg-slate-400 h-full rounded-full transition-all duration-1000" :style="{ width: timeProgress + '%' }"></div>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
				<h3 class="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-700">
					<svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					Carga Individual Real (Sprints + Ritos)
				</h3>
				<div class="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
					<div v-for="member in teamWorkload" :key="member.name">
						<div class="flex justify-between text-xs mb-1">
							<span class="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
								{{ member.name }}
								<span class="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1 rounded font-normal">{{ member.sector }}</span>
							</span>
							<span :class="member.isOverloaded ? 'text-red-500 dark:text-red-400 font-bold' : 'text-slate-500 dark:text-slate-400'"> {{ member.assigned }}h / {{ member.capacity }}h </span>
						</div>
						<div class="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden relative border dark:border-slate-600">
							<div class="h-full rounded-full transition-all duration-500" :class="member.isOverloaded ? 'bg-red-500' : member.percentage > 85 ? 'bg-amber-400' : 'bg-blue-500'" :style="{ width: Math.min(member.percentage, 100) + '%' }"></div>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
				<h3 class="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-700">
					<svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
					Capacidade por Setor
				</h3>
				<div class="space-y-4">
					<div v-for="sector in sectorCapacityStats" :key="sector.name">
						<div class="flex justify-between text-xs mb-1 font-bold">
							<span class="text-slate-600 dark:text-slate-300">{{ sector.name }} ({{ sector.memberCount }} m)</span>
							<span class="text-slate-500 dark:text-slate-400">{{ sector.assignedEffort }}h / {{ sector.totalCapacity }}h</span>
						</div>
						<div class="w-full bg-slate-100 dark:bg-slate-700 h-6 rounded-lg overflow-hidden relative border border-slate-200 dark:border-slate-600">
							<div class="h-full bg-indigo-500 transition-all duration-500 flex items-center justify-end px-2" :style="{ width: Math.min(sector.percentage, 100) + '%' }">
								<span v-if="sector.percentage > 10" class="text-[10px] text-white font-bold">{{ sector.percentage }}%</span>
							</div>
							<span v-if="sector.percentage <= 10" class="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 font-bold">{{ sector.percentage }}%</span>
						</div>
					</div>
				</div>

				<div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
					<h4 class="font-bold text-slate-700 dark:text-slate-300 text-xs mb-3">Distribuição por Tipo</h4>
					<div class="flex gap-2 flex-wrap">
						<div v-for="typeObj in tasksByType" :key="typeObj.label" class="flex-1 min-w-[100px] bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700">
							<div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">{{ typeObj.label }}</div>
							<div class="text-lg font-black text-slate-700 dark:text-slate-200">{{ typeObj.value }}</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors h-full">
				<div class="flex justify-between items-center mb-4 border-b pb-3 border-slate-100 dark:border-slate-700">
					<h3 class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
						<svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
						Desvio de Prazos (Baseline)
					</h3>
					<span v-if="baselineStats.count > 0" class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">{{ baselineStats.totalDelay }} dias atraso</span>
				</div>

				<div v-if="baselineStats.count === 0" class="text-center py-8 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
					<div class="text-slate-400 text-sm">Tudo conforme o planejado.</div>
				</div>

				<div v-else class="space-y-3">
					<div v-for="task in baselineStats.tasks" :key="task.name" class="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30 shadow-sm">
						<div class="flex flex-col min-w-0">
							<span class="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">
								{{ task.name }}
							</span>
							<span class="text-[10px] text-slate-500 dark:text-slate-400">{{ task.responsible }}</span>
						</div>
						<div class="flex flex-col items-end flex-shrink-0">
							<span class="text-red-600 dark:text-red-400 font-black text-sm">+{{ task.delay }} dias</span>
							<span class="text-[10px] text-slate-400">Era: {{ task.planned }} ➝ {{ task.current }}</span>
						</div>
					</div>
				</div>
			</div>

			<div v-if="parsedRisks.length > 0" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm animate-fade-in transition-colors">
				<h3 class="text-slate-700 dark:text-slate-200 font-bold text-base mb-4 flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-700">
					<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
					Monitoramento de Alertas Reais
				</h3>
				<div class="grid grid-cols-1 gap-3">
					<div v-for="(risk, idx) in parsedRisks" :key="idx" class="flex items-start gap-3 p-4 rounded-lg border shadow-sm transition-all hover:scale-[1.01]" :class="risk.styles">
						<div class="flex-shrink-0 mt-0.5 p-1.5 bg-white/40 dark:bg-black/20 rounded-full">
							<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="risk.icon" />
							</svg>
						</div>
						<div class="flex-1 min-w-0">
							<div class="text-[10px] font-black uppercase tracking-wide opacity-80">{{ risk.title }} [{{ risk.type }}]</div>
							<div class="text-sm font-bold leading-snug">{{ risk.message }}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.custom-scrollbar {
	&::-webkit-scrollbar {
		width: 4px;
	}
	&::-webkit-scrollbar-track {
		background: transparent;
	}
	&::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 10px;
	}
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
	background: #475569;
}

.animate-fade-in {
	animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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
