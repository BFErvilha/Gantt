<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { format, parseISO } from 'date-fns'

const { config, addHolidayToSquad, removeHolidayFromSquad, addHoliday, removeHoliday, addSprintToSquad, updateSprintInSquad, removeSprintFromSquad, getSquadStats, projectCapacityStats, automaticRisks, updateMember, addMemberDayOff, removeMemberDayOff } = useGantt()

const selectedSquadId = ref<string>('')
const activeHelp = ref<string | null>(null)

const newHolidayDate = ref('')
const squadStats = ref({ calendarDays: 0, workingDays: 0, totalTeamCapacity: 0 })

const sprintName = ref('')
const sprintStart = ref('')
const sprintEnd = ref('')
const editingSprintId = ref<string | null>(null)

const editingMemberIndex = ref<number | null>(null)
const memberDayOffInput = ref('')
const memberCapacityInput = ref(8)

const selectedSquad = computed(() => config.value.squads.find(s => s.id === selectedSquadId.value))

watch(
	[selectedSquadId, () => selectedSquad.value?.startDate, () => selectedSquad.value?.deadline, () => selectedSquad.value?.skipWeekends],
	() => {
		if (selectedSquadId.value) {
			squadStats.value = getSquadStats(selectedSquadId.value)
		}
	},
	{ deep: true },
)

const toggleHelp = (section: string) => {
	activeHelp.value = activeHelp.value === section ? null : section
}

const handleAddHoliday = () => {
	if (newHolidayDate.value) {
		if (selectedSquadId.value) {
			addHolidayToSquad(selectedSquadId.value, newHolidayDate.value)
		} else {
			addHoliday(newHolidayDate.value)
		}
		newHolidayDate.value = ''
	}
}

const handleRemoveHoliday = (date: string) => {
	if (selectedSquadId.value) {
		removeHolidayFromSquad(selectedSquadId.value, date)
	} else {
		removeHoliday(date)
	}
}

const handleSaveSprint = () => {
	if (selectedSquadId.value && sprintName.value && sprintStart.value && sprintEnd.value) {
		if (editingSprintId.value) {
			updateSprintInSquad(selectedSquadId.value, editingSprintId.value, sprintName.value, sprintStart.value, sprintEnd.value)
			cancelSprintEdit()
		} else {
			addSprintToSquad(selectedSquadId.value, sprintName.value, sprintStart.value, sprintEnd.value)
			resetSprintForm()
		}
	}
}

const startEditSprint = (sprint: any) => {
	sprintName.value = sprint.name
	sprintStart.value = sprint.startDate
	sprintEnd.value = sprint.endDate
	editingSprintId.value = sprint.id
}

const cancelSprintEdit = () => {
	resetSprintForm()
	editingSprintId.value = null
}

const resetSprintForm = () => {
	sprintName.value = ''
	sprintStart.value = ''
	sprintEnd.value = ''
}

const contextMembers = computed(() => {
	if (selectedSquadId.value) {
		return config.value.teamMembers.filter(m => m.squadIds.includes(selectedSquadId.value))
	}
	return config.value.teamMembers
})

const startEditMemberContext = (memberLocal: any) => {
	const index = config.value.teamMembers.findIndex(m => m.name === memberLocal.name)
	if (index !== -1) {
		editingMemberIndex.value = index
		memberCapacityInput.value = config.value.teamMembers[index].capacity
	}
}

const cancelMemberEdit = () => {
	editingMemberIndex.value = null
	memberDayOffInput.value = ''
}

const saveMemberCapacity = () => {
	if (editingMemberIndex.value !== null) {
		const m = config.value.teamMembers[editingMemberIndex.value]
		updateMember(editingMemberIndex.value, m.name, memberCapacityInput.value, m.sector, m.squadIds)
		cancelMemberEdit()
	}
}

const addDayOffContext = () => {
	if (editingMemberIndex.value !== null && memberDayOffInput.value) {
		addMemberDayOff(editingMemberIndex.value, memberDayOffInput.value)
		memberDayOffInput.value = ''
	}
}

const removeDayOffContext = (dayOff: string) => {
	if (editingMemberIndex.value !== null) {
		removeMemberDayOff(editingMemberIndex.value, dayOff)
	}
}

const formatDateBr = (isoDate: string) => format(parseISO(isoDate), 'dd/MM/yyyy')
// const formatDateObj = (date: Date) => format(date, 'dd/MM/yyyy')
</script>

<template>
	<div class="space-y-6 animate-fade-in pb-10">
		<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
			<div>
				<h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><span class="text-2xl">⚙️</span> Configuração do Projeto</h2>
				<p class="text-sm text-slate-500">Selecione o contexto que deseja gerenciar.</p>
			</div>

			<select v-model="selectedSquadId" class="w-full md:w-64 rounded-lg border-slate-300 dark:border-slate-600 p-2.5 text-sm dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-bold shadow-sm">
				<option value="">🌍 Visão Global do Projeto</option>
				<option disabled>──────────</option>
				<option v-for="s in config.squads" :key="s.id" :value="s.id">Squad: {{ s.name }}</option>
			</select>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
			<div class="space-y-6">
				<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
					<h3 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
						<div class="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
							<svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
						</div>
						{{ selectedSquadId ? 'Tempo & Feriados da Squad' : 'Definições Globais' }}
						<button @click="toggleHelp('general')" class="ml-auto text-slate-400 hover:text-blue-500">
							<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
						</button>
					</h3>

					<div v-if="activeHelp === 'general'" class="mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-slate-600 dark:text-slate-300">
						Defina o início e o fim deste contexto. O gráfico Gantt respeitará essas datas, mas se expandirá caso haja tarefas fora do prazo.
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
						<div>
							<label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5">Início</label>
							<input v-if="selectedSquad" v-model="selectedSquad.startDate" type="date" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm dark:bg-slate-950 dark:text-white dark:[color-scheme:dark]" />
							<input v-else v-model="config.projectStartDate" type="date" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm dark:bg-slate-950 dark:text-white dark:[color-scheme:dark]" />
						</div>
						<div>
							<label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5">Término (Estimado)</label>
							<input v-if="selectedSquad" v-model="selectedSquad.deadline" type="date" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm dark:bg-slate-950 dark:text-white dark:[color-scheme:dark]" />
							<input v-else v-model="config.deadline" type="date" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm dark:bg-slate-950 dark:text-white dark:[color-scheme:dark]" />
						</div>
					</div>

					<div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
						<div class="flex items-center justify-between mb-3">
							<span class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Resumo de Capacidade</span>
							<span class="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full"> {{ selectedSquad ? squadStats.totalTeamCapacity : projectCapacityStats.totalTeamCapacity }}h Totais </span>
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-center">
								<span class="block text-2xl font-black text-slate-700 dark:text-white">
									{{ selectedSquad ? squadStats.calendarDays : projectCapacityStats.calendarDays }}
								</span>
								<span class="text-[10px] font-bold text-slate-400 uppercase">Dias Corridos</span>
							</div>
							<div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-center">
								<span class="block text-2xl font-black text-slate-700 dark:text-white">
									{{ selectedSquad ? squadStats.workingDays : projectCapacityStats.workingDays }}
								</span>
								<span class="text-[10px] font-bold text-slate-400 uppercase">Dias Úteis</span>
							</div>
						</div>
					</div>

					<div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
						<input v-if="selectedSquad" v-model="selectedSquad.skipWeekends" type="checkbox" class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
						<input v-else v-model="config.skipWeekends" type="checkbox" class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
						<label class="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">Pular Finais de Semana</label>
					</div>

					<div class="pt-4">
						<h4 class="font-bold text-sm text-slate-700 dark:text-slate-200 mb-3 flex items-center justify-between">Feriados {{ selectedSquad ? '(Específicos)' : '(Gerais)' }}</h4>
						<div class="flex gap-2 mb-3">
							<input v-model="newHolidayDate" type="date" class="flex-1 rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2 text-sm dark:bg-slate-950 dark:text-white dark:[color-scheme:dark]" />
							<button @click="handleAddHoliday" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50" :disabled="!newHolidayDate">+</button>
						</div>
						<div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
							<div
								v-for="date in selectedSquad ? selectedSquad.holidays : config.holidays"
								:key="date"
								class="flex items-center bg-white dark:bg-slate-700 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-600 shadow-sm text-slate-700 dark:text-slate-200 group"
							>
								<span>{{ formatDateBr(date) }}</span>
								<button @click="handleRemoveHoliday(date)" class="ml-2 text-slate-400 hover:text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
							</div>
							<span v-if="(selectedSquad ? selectedSquad.holidays.length : config.holidays.length) === 0" class="text-xs text-slate-400 italic">Nenhum feriado cadastrado.</span>
						</div>
					</div>
				</div>

				<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
					<h3 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
						<div class="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
							<svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						Riscos {{ selectedSquad ? 'da Squad' : 'do Projeto' }}
						<button @click="toggleHelp('risks')" class="ml-auto text-slate-400 hover:text-red-500">
							<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
						</button>
					</h3>

					<div v-if="activeHelp === 'risks'" class="mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800 text-xs text-slate-600 dark:text-slate-300 animate-fade-in">
						Detectamos automaticamente: Sobrecarga de horas, conflitos com feriados/folgas e estouro de datas das Sprints.
					</div>

					<div class="bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
						<ul class="space-y-1 max-h-48 overflow-y-auto custom-scrollbar p-2">
							<li v-if="automaticRisks.length === 0" class="text-sm text-green-600 dark:text-green-400 flex items-center gap-2 p-2 font-medium">
								<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
								Nenhum risco crítico detectado.
							</li>
							<li v-for="(risk, index) in automaticRisks" :key="index" class="flex items-start gap-3 p-2 rounded-lg bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 shadow-sm text-xs text-slate-700 dark:text-slate-300">
								<span class="mt-0.5 text-red-500 font-bold">•</span>
								<span class="leading-snug">{{ risk }}</span>
							</li>
						</ul>
					</div>
				</div>
			</div>

			<div class="space-y-6">
				<div v-if="!selectedSquadId" class="bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-10 text-center flex flex-col items-center justify-center h-64">
					<svg class="w-12 h-12 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					<h3 class="text-lg font-bold text-slate-600 dark:text-slate-300">Selecione uma Squad</h3>
					<p class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Para gerenciar Sprints e Membros, escolha uma Squad no menu acima.</p>
				</div>

				<div v-else class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
					<h3 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
						<div class="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
							<svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
						</div>
						Sprints da Squad {{ selectedSquad?.name }}
					</h3>

					<div class="flex flex-col gap-4 mb-6 bg-purple-50 dark:bg-purple-900/10 p-5 rounded-xl border border-purple-100 dark:border-purple-800/30 shadow-sm">
						<div>
							<label class="block text-xs font-bold text-purple-800 dark:text-purple-300 mb-1.5 uppercase">Nome da Sprint</label>
							<input
								v-model="sprintName"
								type="text"
								placeholder="Ex: Sprint 24"
								class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-950 focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder-slate-400"
							/>
						</div>

						<div class="flex gap-4">
							<div class="flex-1">
								<label class="block text-xs font-bold text-purple-800 dark:text-purple-300 mb-1.5 uppercase">Início</label>
								<input
									v-model="sprintStart"
									type="date"
									class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-950 focus:ring-2 focus:ring-purple-500 focus:outline-none dark:[color-scheme:dark]"
								/>
							</div>
							<div class="flex-1">
								<label class="block text-xs font-bold text-purple-800 dark:text-purple-300 mb-1.5 uppercase">Fim</label>
								<input v-model="sprintEnd" type="date" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-950 focus:ring-2 focus:ring-purple-500 focus:outline-none dark:[color-scheme:dark]" />
							</div>
						</div>

						<div class="flex gap-3 mt-2 pt-2 border-t border-purple-200 dark:border-purple-800/30">
							<button v-if="editingSprintId" @click="cancelSprintEdit" class="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm">Cancelar</button>
							<button @click="handleSaveSprint" class="flex-1 bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 dark:shadow-none flex justify-center items-center gap-2">
								<span v-if="!editingSprintId">+</span>
								{{ editingSprintId ? 'Salvar Alterações' : 'Criar Sprint' }}
							</button>
						</div>
					</div>

					<div class="flex-1 overflow-hidden flex flex-col">
						<h4 class="font-bold text-sm text-slate-600 dark:text-slate-400 mb-3 flex items-center justify-between">
							Sprints Cadastradas
							<span class="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{{ selectedSquad?.sprints.length || 0 }}</span>
						</h4>
						<div class="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
							<div v-if="!selectedSquad || selectedSquad.sprints.length === 0" class="text-sm text-slate-400 italic text-center py-10 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200">Nenhuma sprint criada para esta squad.</div>
							<div v-else v-for="sprint in selectedSquad.sprints" :key="sprint.id" class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all group">
								<div class="flex justify-between items-start">
									<div class="flex flex-col gap-1">
										<span class="text-sm font-bold text-slate-800 dark:text-slate-200">
											{{ sprint.name }}
										</span>
										<div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
											<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
											{{ formatDateBr(sprint.startDate) }} até {{ formatDateBr(sprint.endDate) }}
										</div>
									</div>
									<div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
										<button @click="startEditSprint(sprint)" class="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="Editar">
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
										</button>
										<button @click="removeSprintFromSquad(selectedSquadId, sprint.id)" class="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Excluir">
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</div>
								</div>
							</div>
						</div>

						<div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
							<div class="flex justify-between items-center mb-3">
								<h4 class="font-bold text-sm text-slate-600 dark:text-slate-400">Membros da Squad</h4>
								<button v-if="editingMemberIndex === null" class="text-xs text-blue-500 hover:underline" title="Para adicionar, vá na aba Squads">Gerenciar em Squads</button>
							</div>

							<div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
								<div v-for="member in contextMembers" :key="member.name" class="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-700 text-xs">
									<div v-if="editingMemberIndex !== null && config.teamMembers[editingMemberIndex].name === member.name" class="space-y-2">
										<div class="flex items-center gap-2">
											<span class="font-bold text-slate-700 dark:text-slate-200">{{ member.name }}</span>
											<input v-model.number="memberCapacityInput" type="number" class="w-12 p-1 rounded border dark:bg-slate-800" />
											<button @click="saveMemberCapacity" class="text-green-600 font-bold">OK</button>
											<button @click="cancelMemberEdit" class="text-slate-400">X</button>
										</div>
										<div class="flex items-center gap-2">
											<input v-model="memberDayOffInput" type="date" class="flex-1 p-1 rounded border dark:bg-slate-800 dark:[color-scheme:dark]" />
											<button @click="addDayOffContext" class="text-blue-500 font-bold">+</button>
										</div>
										<div class="flex flex-wrap gap-1">
											<span v-for="d in member.daysOff" :key="d" class="bg-red-100 text-red-600 px-1 rounded flex items-center">{{ formatDateBr(d) }} <button @click="removeDayOffContext(d)" class="ml-1 font-bold">&times;</button></span>
										</div>
									</div>

									<div v-else class="flex justify-between items-center">
										<span class="font-bold text-slate-700 dark:text-slate-300">{{ member.name }}</span>
										<div class="flex items-center gap-2">
											<span class="text-slate-500">{{ member.capacity }}h</span>
											<span v-if="member.daysOff.length" class="text-red-500 font-bold">{{ member.daysOff.length }} folgas</span>
											<button @click="startEditMemberContext(member)" class="text-blue-500 hover:text-blue-700">⚙️</button>
										</div>
									</div>
								</div>
								<div v-if="contextMembers.length === 0" class="text-center italic text-slate-400 py-2">Sem membros vinculados.</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
	width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background: #cbd5e1;
	border-radius: 2px;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
	background: #475569;
}
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
