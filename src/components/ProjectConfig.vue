<script setup lang="ts">
import { ref } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { format, parseISO } from 'date-fns'

const { config, addHoliday, removeHoliday, addMember, updateMember, removeMember, addMemberDayOff, removeMemberDayOff, automaticRisks, projectCapacityStats, addSprint, removeSprint } = useGantt()

const activeSections = ref({
	period: true,
	sprints: true,
	team: false,
	holidays: false,
})

const toggleSection = (section: keyof typeof activeSections.value) => {
	activeSections.value[section] = !activeSections.value[section]
}

const newHolidayDate = ref('')
const memberNameInput = ref('')
const memberCapacityInput = ref(8)
const memberSectorInput = ref('')
const editingMemberIndex = ref<number | null>(null)
const memberDayOffInput = ref('')

const sprintName = ref('')
const sprintStart = ref('')
const sprintEnd = ref('')

const availableSectors = ['Frontend', 'Backend', 'Fullstack', 'QA', 'Design', 'Produto', 'DevOps', 'Gestão']

const handleAddSprint = () => {
	if (sprintName.value && sprintStart.value && sprintEnd.value) {
		addSprint(sprintName.value, sprintStart.value, sprintEnd.value)
		sprintName.value = ''
		sprintStart.value = ''
		sprintEnd.value = ''
	}
}

const handleAddHoliday = () => {
	if (newHolidayDate.value) {
		addHoliday(newHolidayDate.value)
		newHolidayDate.value = ''
	}
}

const handleSaveMember = () => {
	if (memberNameInput.value && memberCapacityInput.value > 0) {
		const sector = memberSectorInput.value || 'Outro'
		if (editingMemberIndex.value !== null) {
			updateMember(editingMemberIndex.value, memberNameInput.value, memberCapacityInput.value, sector)
			cancelMemberEdit()
		} else {
			addMember(memberNameInput.value, memberCapacityInput.value, sector)
			memberNameInput.value = ''
			memberCapacityInput.value = 8
			memberSectorInput.value = ''
		}
	}
}

const startEditMember = (index: number) => {
	const member = config.value.teamMembers[index]
	memberNameInput.value = member.name
	memberCapacityInput.value = member.capacity
	memberSectorInput.value = member.sector || ''
	editingMemberIndex.value = index
}

const cancelMemberEdit = () => {
	memberNameInput.value = ''
	memberCapacityInput.value = 8
	memberSectorInput.value = ''
	editingMemberIndex.value = null
	memberDayOffInput.value = ''
}

const handleAddMemberDayOff = () => {
	if (editingMemberIndex.value !== null && memberDayOffInput.value) {
		addMemberDayOff(editingMemberIndex.value, memberDayOffInput.value)
		memberDayOffInput.value = ''
	}
}

const removeMemberDayOffHandler = (memberIndex: number, dayOff: string) => {
	removeMemberDayOff(memberIndex, dayOff)
}

const formatDateBr = (isoDate: string) => format(parseISO(isoDate), 'dd/MM/yyyy')
</script>

<template>
	<div class="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700 space-y-3 transition-colors duration-300">
		<h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 px-1">Configuração do Projeto</h3>

		<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden transition-colors">
			<button @click="toggleSection('period')" class="w-full flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left">
				<span class="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
					<svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
					Início do Projeto
				</span>
				<svg class="w-4 h-4 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': activeSections.period }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			<div v-show="activeSections.period" class="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 space-y-4">
				<div>
					<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data Inicial</label>
					<input v-model="config.projectStartDate" type="date" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-700 dark:text-white transition-colors" />
				</div>
				<div class="flex items-center gap-2 pt-2">
					<input v-model="config.skipWeekends" id="skipWeekends" type="checkbox" class="rounded border-slate-300 dark:border-slate-600 text-blue-600 shadow-sm focus:ring-blue-200 bg-white dark:bg-slate-700" />
					<label for="skipWeekends" class="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">Pular Fins de Semana</label>
				</div>
			</div>
		</div>

		<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden transition-colors">
			<button @click="toggleSection('sprints')" class="w-full flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left">
				<span class="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
					<svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
					Gestão de Sprints
				</span>
				<svg class="w-4 h-4 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': activeSections.sprints }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			<div v-show="activeSections.sprints" class="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
				<div class="flex flex-col gap-2 mb-4 bg-purple-50/50 dark:bg-purple-900/10 p-3 rounded border border-purple-100 dark:border-purple-800">
					<input v-model="sprintName" type="text" placeholder="Nome (Ex: Sprint 1)" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 focus:outline-none focus:border-purple-400 bg-white dark:bg-slate-700 dark:text-white dark:placeholder-slate-400" />
					<div class="flex gap-2">
						<div class="flex-1">
							<label class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Início</label>
							<input v-model="sprintStart" type="date" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 bg-white dark:bg-slate-700 dark:text-white" />
						</div>
						<div class="flex-1">
							<label class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Fim</label>
							<input v-model="sprintEnd" type="date" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 bg-white dark:bg-slate-700 dark:text-white" />
						</div>
					</div>
					<button @click="handleAddSprint" class="mt-1 w-full bg-purple-600 text-white border border-purple-700 px-3 py-1.5 rounded text-xs uppercase font-bold hover:bg-purple-700 transition-colors shadow-sm">Adicionar Sprint</button>
				</div>

				<div class="space-y-2">
					<div v-if="config.sprints.length === 0" class="text-xs text-slate-400 italic w-full text-center py-2">Nenhuma sprint cadastrada.</div>
					<div v-for="sprint in config.sprints" :key="sprint.id" class="flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 p-2 rounded border border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
						<div class="flex flex-col">
							<span class="text-sm font-bold text-slate-700 dark:text-slate-300">{{ sprint.name }}</span>
							<span class="text-[10px] text-slate-500 dark:text-slate-400">{{ formatDateBr(sprint.startDate) }} até {{ formatDateBr(sprint.endDate) }}</span>
						</div>
						<button @click="removeSprint(sprint.id)" class="text-slate-400 hover:text-red-500 font-bold p-1">&times;</button>
					</div>
				</div>
			</div>
		</div>

		<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden transition-colors">
			<button @click="toggleSection('team')" class="w-full flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left">
				<span class="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
					<svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					Equipe e Capacidade
				</span>
				<svg class="w-4 h-4 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': activeSections.team }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			<div v-show="activeSections.team" class="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
				<div class="flex flex-col gap-2 mb-4 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded border border-blue-100 dark:border-blue-800">
					<div class="flex gap-2">
						<input v-model="memberNameInput" type="text" placeholder="Nome" class="flex-1 text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 focus:outline-none focus:border-blue-400 bg-white dark:bg-slate-700 dark:text-white dark:placeholder-slate-400" />
						<input
							v-model.number="memberCapacityInput"
							type="number"
							placeholder="8h"
							min="1"
							max="24"
							class="w-16 text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 focus:outline-none focus:border-blue-400 bg-white dark:bg-slate-700 dark:text-white"
							title="Capacidade diária"
						/>
					</div>

					<div>
						<input
							list="sectors-list"
							v-model="memberSectorInput"
							placeholder="Setor (Ex: Frontend) - Selecione ou Digite"
							class="w-full text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 focus:outline-none focus:border-blue-400 bg-white dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
						/>
						<datalist id="sectors-list">
							<option v-for="s in availableSectors" :key="s" :value="s"></option>
						</datalist>
					</div>

					<div v-if="editingMemberIndex !== null" class="mt-2 border-t border-blue-200 dark:border-blue-800 pt-2">
						<label class="text-[10px] font-bold text-blue-800 dark:text-blue-300 block mb-1 uppercase">Folgas de {{ memberNameInput }}</label>
						<div class="flex gap-2 mb-2">
							<input v-model="memberDayOffInput" type="date" class="flex-1 text-xs rounded border-slate-300 dark:border-slate-600 p-1 bg-white dark:bg-slate-700 dark:text-white" />
							<button @click="handleAddMemberDayOff" class="bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 rounded text-xs font-bold hover:bg-blue-300 dark:hover:bg-blue-800">+</button>
						</div>
						<div class="flex flex-wrap gap-1">
							<span v-for="dayOff in config.teamMembers[editingMemberIndex].daysOff" :key="dayOff" class="text-[10px] bg-white dark:bg-slate-700 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded flex items-center gap-1">
								{{ formatDateBr(dayOff) }}
								<button @click="removeMemberDayOffHandler(editingMemberIndex!, dayOff)" class="hover:text-red-500 font-bold">&times;</button>
							</span>
							<span v-if="!config.teamMembers[editingMemberIndex].daysOff?.length" class="text-[10px] text-slate-400 italic">Sem folgas.</span>
						</div>
					</div>

					<div class="flex gap-2 mt-1">
						<button @click="handleSaveMember" class="flex-1 bg-blue-600 text-white border border-blue-700 px-3 py-1.5 rounded text-xs uppercase font-bold hover:bg-blue-700 transition-colors shadow-sm">
							{{ editingMemberIndex !== null ? 'Salvar' : 'Adicionar' }}
						</button>
						<button
							v-if="editingMemberIndex !== null"
							@click="cancelMemberEdit"
							class="bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-500 px-3 py-1.5 rounded text-xs uppercase font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
						>
							Cancelar
						</button>
					</div>
				</div>

				<div class="space-y-2 mb-4">
					<div v-if="config.teamMembers.length === 0" class="text-xs text-slate-400 italic w-full text-center py-2">Sem equipe.</div>
					<div v-for="(member, index) in config.teamMembers" :key="index" class="flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 p-2 rounded border border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-colors group">
						<div class="flex items-center gap-2">
							<span class="w-6 h-6 rounded-full bg-white dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-500 shadow-sm">
								{{ member.name.substring(0, 2).toUpperCase() }}
							</span>
							<div class="flex flex-col leading-none">
								<span class="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
									{{ member.name }}
									<span class="text-[9px] bg-slate-200 dark:bg-slate-600 px-1 rounded text-slate-500 dark:text-slate-300 font-bold uppercase">{{ member.sector || 'Outro' }}</span>
								</span>
								<span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5"
									>{{ member.capacity }}h/dia <span v-if="member.daysOff?.length" class="text-blue-500 dark:text-blue-400 font-medium">• {{ member.daysOff.length }} folga(s)</span></span
								>
							</div>
						</div>
						<div class="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
							<button @click="startEditMember(index)" class="p-1 hover:text-blue-600 dark:hover:text-blue-400 text-slate-400" title="Editar">
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
							</button>
							<button @click="removeMember(index)" class="p-1 hover:text-red-600 dark:hover:text-red-400 text-slate-400" title="Excluir">
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</div>
					</div>
				</div>

				<div v-if="config.teamMembers.length > 0" class="bg-slate-50 dark:bg-slate-700/30 rounded p-2 border border-slate-200 dark:border-slate-700">
					<div class="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
						<span>Total ({{ projectCapacityStats.workingDays }} dias)</span>
						<span class="text-blue-600 dark:text-blue-400">{{ projectCapacityStats.totalTeamCapacity }}h</span>
					</div>
					<div class="space-y-1">
						<div v-for="stat in projectCapacityStats.memberStats" :key="stat.name" class="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-600/50 last:border-0 pb-0.5">
							<span>{{ stat.name }}</span>
							<span>{{ stat.totalCapacity }}h</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden transition-colors">
			<button @click="toggleSection('holidays')" class="w-full flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left">
				<span class="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
					<svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
					Feriados e Folgas
				</span>
				<svg class="w-4 h-4 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': activeSections.holidays }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			<div v-show="activeSections.holidays" class="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
				<div class="flex gap-2 mb-3">
					<input v-model="newHolidayDate" type="date" class="flex-1 text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 focus:outline-none focus:border-blue-400 bg-white dark:bg-slate-700 dark:text-white" />
					<button @click="handleAddHoliday" class="bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-700 transition-colors">+</button>
				</div>
				<div class="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
					<div v-if="config.holidays.length === 0" class="text-xs text-slate-400 italic text-center py-2">Nenhum feriado.</div>
					<div v-for="date in config.holidays" :key="date" class="flex justify-between items-center bg-slate-50 dark:bg-slate-700/30 p-2 rounded border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
						<span>{{ formatDateBr(date) }}</span>
						<button @click="removeHoliday(date)" class="text-slate-400 hover:text-red-500 font-bold">&times;</button>
					</div>
				</div>
			</div>
		</div>

		<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden transition-colors">
			<div class="p-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
				<span class="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
					<svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					Análise de Riscos
				</span>
			</div>

			<div class="p-4 bg-white dark:bg-slate-800">
				<ul class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
					<li v-if="automaticRisks.length === 0" class="text-xs text-green-600 dark:text-green-400 flex items-center gap-2 py-1"><span class="text-lg">✅</span> Projeto saudável.</li>
					<li v-for="(risk, index) in automaticRisks" :key="index" class="flex items-start gap-2 text-xs text-red-800 dark:text-red-300 border-b border-red-200/50 dark:border-red-800/50 last:border-0 pb-2 last:pb-0">
						<span class="mt-0.5 font-bold">•</span>
						<span>{{ risk }}</span>
					</li>
				</ul>
			</div>
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

:global(.dark) .custom-scrollbar::-webkit-scrollbar-track {
	background: #1e293b;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
	background: #475569;
}
</style>
