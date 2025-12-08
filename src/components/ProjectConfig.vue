<script setup lang="ts">
import { ref } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { format, parseISO } from 'date-fns'

const { config, addHoliday, removeHoliday, addRisk, removeRisk } = useGantt()

const newHolidayDate = ref('')
const newRiskText = ref('')

const handleAddHoliday = () => {
	if (newHolidayDate.value) {
		addHoliday(newHolidayDate.value)
		newHolidayDate.value = ''
	}
}

const handleAddRisk = () => {
	if (newRiskText.value) {
		addRisk(newRiskText.value)
		newRiskText.value = ''
	}
}

const formatDateBr = (isoDate: string) => {
	return format(parseISO(isoDate), 'dd/MM/yyyy')
}
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
				Riscos do Prazo
			</h3>

			<div class="flex gap-2 mb-3">
				<input v-model="newRiskText" type="text" placeholder="Ex: Demora na aprovação..." class="flex-1 text-sm rounded border-slate-300 shadow-sm p-2 border focus:ring-2 focus:ring-red-500 focus:outline-none" @keydown.enter.prevent="handleAddRisk" />
				<button @click="handleAddRisk" class="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded text-sm hover:bg-red-100 transition-colors font-bold">+</button>
			</div>

			<ul class="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
				<li v-if="config.risks.length === 0" class="text-xs text-slate-400 italic text-center py-2">Nenhum risco mapeado.</li>
				<li v-for="(risk, index) in config.risks" :key="index" class="flex justify-between items-start gap-2 bg-red-50/50 p-2 rounded border border-red-100 text-xs text-red-800">
					<span>{{ risk }}</span>
					<button @click="removeRisk(index)" class="text-red-300 hover:text-red-600 transition-colors font-bold text-sm">&times;</button>
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
