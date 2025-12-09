<script setup lang="ts">
import { computed } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { differenceInCalendarDays } from 'date-fns'

const { tasks, config, automaticRisks, projectCapacityStats } = useGantt()

const totalTasks = computed(() => tasks.value.length)
const totalEffort = computed(() => tasks.value.reduce((acc, t) => acc + (t.effort || 0), 0))

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

const teamWorkload = computed(() => {
	return config.value.teamMembers.map(member => {
		const assignedHours = tasks.value.filter(t => t.responsible === member.name).reduce((acc, t) => acc + (t.effort || 0), 0)

		const stat = projectCapacityStats.value.memberStats.find(s => s.name === member.name)
		const totalCapacity = stat ? stat.totalCapacity : 0

		const usagePercentage = totalCapacity > 0 ? Math.round((assignedHours / totalCapacity) * 100) : 0

		return {
			name: member.name,
			assigned: assignedHours,
			capacity: totalCapacity,
			percentage: usagePercentage,
			isOverloaded: assignedHours > totalCapacity,
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
				<span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Esforço Total</span>
				<div class="text-3xl font-black text-blue-600 mt-1">{{ totalEffort }}<span class="text-lg text-slate-400 font-normal ml-1">h</span></div>
				<div class="text-xs text-slate-400 mt-2">Horas estimadas</div>
			</div>

			<div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
				<span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Riscos Ativos</span>
				<div class="text-3xl font-black mt-1" :class="automaticRisks.length > 0 ? 'text-red-500' : 'text-green-500'">
					{{ automaticRisks.length }}
				</div>
				<div class="text-xs text-slate-400 mt-2">Alertas automáticos</div>
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
					Carga de Trabalho
				</h3>

				<div v-if="teamWorkload.length === 0" class="text-center py-8 text-slate-400 text-sm">Nenhum membro na equipe.</div>

				<div class="space-y-4">
					<div v-for="member in teamWorkload" :key="member.name">
						<div class="flex justify-between text-xs mb-1">
							<span class="font-bold text-slate-700">{{ member.name }}</span>
							<span :class="member.isOverloaded ? 'text-red-500 font-bold' : 'text-slate-500'"> {{ member.assigned }}h / {{ member.capacity }}h </span>
						</div>
						<div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
							<div class="h-full rounded-full transition-all duration-500" :class="member.isOverloaded ? 'bg-red-500' : 'bg-blue-500'" :style="{ width: Math.min(member.percentage, 100) + '%' }"></div>
						</div>
						<div v-if="member.isOverloaded" class="text-[10px] text-red-500 mt-0.5">⚠️ Sobrecarga detetada</div>
					</div>
				</div>
			</div>

			<div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
				<h3 class="font-bold text-slate-700 mb-4 flex items-center gap-2">
					<svg class="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
					</svg>
					Distribuição de Tarefas
				</h3>

				<div v-if="totalTasks === 0" class="text-center py-8 text-slate-400 text-sm">Nenhuma tarefa criada.</div>

				<div v-else class="space-y-3">
					<div v-for="type in tasksByType" :key="type.label" class="flex items-center">
						<div class="w-24 text-xs font-bold text-slate-600">{{ type.label }}</div>
						<div class="flex-1 h-8 bg-slate-50 rounded-lg overflow-hidden flex items-center px-2 relative">
							<div class="absolute left-0 top-0 bottom-0 opacity-20" :class="type.color" :style="{ width: (type.value / totalTasks) * 100 + '%' }"></div>
							<span class="relative z-10 text-xs font-bold text-slate-700">{{ type.value }} tarefas</span>
						</div>
						<div class="w-12 text-right text-xs text-slate-400">{{ Math.round((type.value / totalTasks) * 100) }}%</div>
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
