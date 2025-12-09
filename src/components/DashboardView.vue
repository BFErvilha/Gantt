<script setup lang="ts">
import { computed } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { differenceInCalendarDays, parseISO, isAfter, startOfDay } from 'date-fns'

const { tasks, config, automaticRisks, projectCapacityStats, computedTasks } = useGantt()

const totalTasks = computed(() => tasks.value.length)
// const totalEffort = computed(() => tasks.value.reduce((acc, t) => acc + (t.effort || 0), 0))

const timeProgress = computed(() => {
	const start = new Date(config.value.projectStartDate)
	const end = new Date(config.value.deadline)
	const today = new Date()
	const totalDuration = differenceInCalendarDays(end, start)
	const elapsed = differenceInCalendarDays(today, start)

	if (elapsed < 0) return 0
	if (elapsed > totalDuration) return 100
	return Math.round((elapsed / totalDuration) * 100)
})

const completedStats = computed(() => {
	const completed = computedTasks.value.filter(t => t.isCompleted)
	const total = completed.length

	let onTime = 0
	let late = 0

	completed.forEach(t => {
		if (!t.completedDate || !t.endDate) return
		const doneDate = startOfDay(parseISO(t.completedDate))
		if (isAfter(doneDate, t.endDate)) {
			late++
		} else {
			onTime++
		}
	})

	return { total, onTime, late }
})

const notPlannedStats = computed(() => {
	const notPlanned = tasks.value.filter(t => t.isNotPlanned)
	const total = notPlanned.length
	const open = notPlanned.filter(t => !t.isCompleted).length
	return { total, open }
})

const teamWorkload = computed(() => {
	return config.value.teamMembers.map(member => {
		const assignedHours = tasks.value.filter(t => t.responsible === member.name && !t.isCompleted).reduce((acc, t) => acc + (t.effort || 0), 0)

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
		if (t.type in types) {
			types[t.type as keyof typeof types]++
		} else {
			types.other++
		}
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
		if (!stats[member.sector]) {
			stats[member.sector] = { totalCapacity: 0, assignedEffort: 0, memberCount: 0 }
		}
		stats[member.sector].totalCapacity += member.capacity
		stats[member.sector].assignedEffort += member.assigned
		stats[member.sector].memberCount += 1
	})

	return Object.entries(stats).map(([name, data]) => ({
		name,
		...data,
		percentage: data.totalCapacity > 0 ? Math.round((data.assignedEffort / data.totalCapacity) * 100) : 0,
	}))
})

const parsedRisks = computed(() => {
	return automaticRisks.value.map(risk => {
		let type = 'INFO'
		let title = 'Aviso'
		let message = risk
		let styles = 'bg-slate-50 border-slate-200 text-slate-700'
		let icon = 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'

		if (risk.includes('CAPACIDADE:')) {
			type = 'CAPACIDADE'
			title = 'Sobrecarga Detectada'
			message = risk.replace('CAPACIDADE:', '').trim()
			styles = 'bg-amber-50 border-amber-200 text-amber-800'
			icon = 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
		} else if (risk.includes('SPRINT:')) {
			type = 'SPRINT'
			title = 'Conflito de Sprint'
			message = risk.replace('SPRINT:', '').trim()
			styles = 'bg-purple-50 border-purple-200 text-purple-800'
			icon = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
		} else if (risk.includes('CALENDÁRIO:') || risk.includes('feriado')) {
			type = 'CALENDÁRIO'
			title = 'Conflito de Agenda'
			message = risk.replace('CALENDÁRIO:', '').trim()
			styles = 'bg-blue-50 border-blue-200 text-blue-800'
			icon = 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
		} else if (risk.includes('CARRY-OVER:') || risk.includes('Não Planejadas')) {
			type = 'RISCO'
			title = 'Risco de Entrega'
			message = risk.replace('CARRY-OVER:', '').trim()
			styles = 'bg-red-50 border-red-200 text-red-800'
			icon = 'M13 10V3L4 14h7v7l9-11h-7z'
		}

		return { type, title, message, styles, icon }
	})
})
</script>

<template>
	<div class="space-y-6 animate-fade-in">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
				<span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Tarefas</span>
				<div class="text-3xl font-black text-slate-700 mt-1">{{ totalTasks }}</div>
				<div class="text-xs text-slate-400 mt-2">No cronograma</div>
			</div>

			<div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
				<span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Concluídas</span>
				<div class="text-3xl font-black text-green-600 mt-1">{{ completedStats.total }}</div>
				<div class="flex gap-2 text-xs mt-2">
					<span class="text-green-600 font-bold">{{ completedStats.onTime }} no prazo</span>
					<span v-if="completedStats.late > 0" class="text-red-500 font-bold">{{ completedStats.late }} com atraso</span>
				</div>
			</div>

			<div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
				<span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Não Planejadas</span>
				<div class="text-3xl font-black text-slate-700 mt-1">
					{{ notPlannedStats.open }} <span class="text-lg text-slate-400 font-normal">/ {{ notPlannedStats.total }}</span>
				</div>
				<div class="text-xs text-slate-400 mt-2">Tarefas abertas sem Sprint</div>
				<div v-if="notPlannedStats.open > 0" class="absolute right-0 top-0 bottom-0 w-1 bg-amber-400"></div>
			</div>

			<div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
				<span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tempo Decorrido</span>
				<div class="flex items-end gap-2 mt-1">
					<span class="text-3xl font-black text-slate-700">{{ timeProgress }}%</span>
				</div>
				<div class="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
					<div class="bg-slate-800 h-full rounded-full transition-all duration-1000" :style="{ width: timeProgress + '%' }"></div>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
				<h3 class="font-bold text-slate-700 mb-4 flex items-center gap-2">
					<svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					Carga de Trabalho (Individual)
				</h3>
				<div v-if="teamWorkload.length === 0" class="text-center py-8 text-slate-400 text-sm">Nenhum membro na equipe.</div>
				<div class="space-y-4">
					<div v-for="member in teamWorkload" :key="member.name">
						<div class="flex justify-between text-xs mb-1">
							<span class="font-bold text-slate-700 flex items-center gap-2">
								{{ member.name }}
								<span class="text-[9px] bg-slate-100 text-slate-500 px-1 rounded font-normal">{{ member.sector }}</span>
							</span>
							<span :class="member.isOverloaded ? 'text-red-500 font-bold' : 'text-slate-500'"> {{ member.assigned }}h / {{ member.capacity }}h </span>
						</div>
						<div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
							<div class="h-full rounded-full transition-all duration-500" :class="member.isOverloaded ? 'bg-red-500' : 'bg-blue-500'" :style="{ width: Math.min(member.percentage, 100) + '%' }"></div>
						</div>
						<div v-if="member.isOverloaded" class="text-[10px] text-red-500 mt-0.5">⚠️ Sobrecarga detectada</div>
					</div>
				</div>
			</div>

			<div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
				<h3 class="font-bold text-slate-700 mb-4 flex items-center gap-2">
					<svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
					Capacidade por Setor
				</h3>
				<div v-if="teamWorkload.length === 0" class="text-center py-8 text-slate-400 text-sm">Sem dados de setores.</div>
				<div class="space-y-4">
					<div v-for="sector in sectorCapacityStats" :key="sector.name">
						<div class="flex justify-between text-xs mb-1">
							<span class="font-bold text-slate-700"
								>{{ sector.name }} <span class="text-slate-400 font-normal">({{ sector.memberCount }} pessoas)</span></span
							>
							<span class="text-slate-500">{{ sector.assignedEffort }}h / {{ sector.totalCapacity }}h</span>
						</div>
						<div class="w-full bg-slate-100 h-6 rounded-lg overflow-hidden relative border border-slate-200">
							<div class="h-full bg-indigo-500 transition-all duration-500 flex items-center justify-end px-2" :style="{ width: Math.min(sector.percentage, 100) + '%' }">
								<span v-if="sector.percentage > 10" class="text-[10px] text-white font-bold">{{ sector.percentage }}%</span>
							</div>
							<span v-if="sector.percentage <= 10" class="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 font-bold">{{ sector.percentage }}%</span>
						</div>
					</div>
				</div>

				<div class="mt-6 pt-6 border-t border-slate-100">
					<h4 class="font-bold text-slate-700 text-xs mb-3">Tarefas por Tipo</h4>
					<div class="flex gap-2 flex-wrap">
						<div v-for="type in tasksByType" :key="type.label" class="flex-1 min-w-[100px] bg-slate-50 p-2 rounded border border-slate-100">
							<div class="text-[10px] text-slate-500 uppercase font-bold">{{ type.label }}</div>
							<div class="text-lg font-black text-slate-700">{{ type.value }}</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div v-if="parsedRisks.length > 0" class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-fade-in">
			<h3 class="text-slate-700 font-bold text-base mb-4 flex items-center gap-2">
				<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
				Monitoramento de Riscos
				<span class="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-extrabold">{{ parsedRisks.length }}</span>
			</h3>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div v-for="(risk, idx) in parsedRisks" :key="idx" class="flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-md" :class="risk.styles">
					<div class="flex-shrink-0 mt-0.5 p-1.5 bg-white/50 rounded-full">
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="risk.icon" />
						</svg>
					</div>
					<div class="flex-1 min-w-0">
						<div class="text-xs font-black uppercase tracking-wide opacity-80 mb-0.5">{{ risk.title }}</div>
						<div class="text-sm font-medium leading-snug">{{ risk.message }}</div>
					</div>
				</div>
			</div>
		</div>
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
