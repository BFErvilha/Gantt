<script setup lang="ts">
import { ref } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { format, parseISO } from 'date-fns'

const { config, addHoliday, removeHoliday, addMember, removeMember, automaticRisks, projectCapacityStats } = useGantt()

const newHolidayDate = ref('')
const newMemberName = ref('')
const newMemberCapacity = ref(8) // Padrão 8h

const handleAddHoliday = () => {
	if (newHolidayDate.value) {
		addHoliday(newHolidayDate.value)
		newHolidayDate.value = ''
	}
}

const handleAddMember = () => {
	if (newMemberName.value && newMemberCapacity.value > 0) {
		addMember(newMemberName.value, newMemberCapacity.value)
		newMemberName.value = ''
		newMemberCapacity.value = 8
	}
}

const formatDateBr = (isoDate: string) => format(parseISO(isoDate), 'dd/MM/yyyy')
</script>

<template>
	<div class="bg-white p-6 rounded-lg shadow border border-slate-200 space-y-6">
		<div>
			<h3 class="text-lg font-bold mb-4 text-slate-800">Configuração do Projeto</h3>
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">Início do Projeto</label>
					<input v-model="config.projectStartDate" type="date" class="w-full rounded border-slate-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:outline-none" />
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">Prazo Final (Deadline)</label>
					<input v-model="config.deadline" type="date" class="w-full rounded border-slate-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:outline-none" />
				</div>
				<div class="flex items-center gap-2">
					<input v-model="config.skipWeekends" id="skipWeekends" type="checkbox" class="rounded border-slate-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
					<label for="skipWeekends" class="text-sm font-medium text-slate-700 select-none cursor-pointer">Pular Fins de Semana</label>
				</div>
			</div>
		</div>

		<hr class="border-slate-100" />

		<div>
			<h3 class="text-sm font-bold uppercase text-blue-600 mb-3 tracking-wide flex items-center gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
					/>
				</svg>
				Equipe & Capacidade
			</h3>

			<div class="flex gap-2 mb-3">
				<input v-model="newMemberName" type="text" placeholder="Nome" class="flex-1 text-sm rounded border-slate-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:outline-none" />
				<input v-model.number="newMemberCapacity" type="number" placeholder="8h" min="1" max="24" class="w-20 text-sm rounded border-slate-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:outline-none" title="Capacidade diária (horas)" />
				<button @click="handleAddMember" class="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-2 rounded text-sm hover:bg-blue-100 transition-colors font-bold">+</button>
			</div>

			<div class="flex flex-wrap gap-2 mb-4">
				<div v-if="config.teamMembers.length === 0" class="text-xs text-slate-400 italic w-full text-center py-2">Nenhum membro adicionado.</div>
				<div v-for="(member, index) in config.teamMembers" :key="index" class="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 text-xs text-blue-800 font-medium">
					<span>{{ member.name }} ({{ member.capacity }}h)</span>
					<button @click="removeMember(index)" class="text-blue-400 hover:text-blue-700 font-bold">&times;</button>
				</div>
			</div>

			<div v-if="config.teamMembers.length > 0" class="bg-slate-50 rounded p-3 border border-slate-200 text-xs text-slate-700">
				<h4 class="font-bold mb-2 flex justify-between">
					<span>Capacidade do Projeto ({{ projectCapacityStats.workingDays }} dias úteis)</span>
					<span class="text-blue-600">{{ projectCapacityStats.totalTeamCapacity }}h Totais</span>
				</h4>
				<div class="space-y-1">
					<div v-for="stat in projectCapacityStats.memberStats" :key="stat.name" class="flex justify-between border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
						<span>{{ stat.name }}</span>
						<span class="font-medium">{{ stat.totalCapacity }}h disp.</span>
					</div>
				</div>
			</div>
		</div>

		<hr class="border-slate-100" />

		<div>
			<h3 class="text-sm font-bold uppercase text-slate-500 mb-3 tracking-wide">Feriados & Day Offs</h3>
			<div class="flex gap-2 mb-3">
				<input v-model="newHolidayDate" type="date" class="flex-1 text-sm rounded border-slate-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:outline-none" />
				<button @click="handleAddHoliday" class="bg-slate-800 text-white px-3 py-2 rounded text-sm hover:bg-slate-700 transition-colors">+</button>
			</div>
			<div class="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
				<div v-if="config.holidays.length === 0" class="text-xs text-slate-400 italic text-center py-2">Nenhum feriado cadastrado.</div>
				<div v-for="date in config.holidays" :key="date" class="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100 text-sm">
					<span class="text-slate-700">{{ formatDateBr(date) }}</span>
					<button @click="removeHoliday(date)" class="text-slate-400 hover:text-red-500 transition-colors" title="Remover data">&times;</button>
				</div>
			</div>
		</div>

		<hr class="border-slate-100" />

		<div>
			<h3 class="text-sm font-bold uppercase text-red-500 mb-3 tracking-wide flex items-center gap-2">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				Análise de Riscos
			</h3>
			<ul class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar bg-red-50 p-3 rounded-lg border border-red-100">
				<li v-if="automaticRisks.length === 0" class="text-xs text-green-600 flex items-center gap-2 py-2"><span class="text-lg">✅</span> O projeto parece saudável! Nenhum risco crítico detetado.</li>
				<li v-for="(risk, index) in automaticRisks" :key="index" class="flex items-start gap-2 text-xs text-red-800 border-b border-red-200/50 last:border-0 pb-2 last:pb-0">
					<span class="mt-0.5 font-bold">•</span>
					<span>{{ risk }}</span>
				</li>
			</ul>
		</div>
	</div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
	width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
	background: #f1f5f9;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background: #cbd5e1;
	border-radius: 2px;
}
</style>
