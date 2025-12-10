<script setup lang="ts">
import { ref } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { format, parseISO } from 'date-fns'

const { config, addHoliday, removeHoliday, addMember, updateMember, removeMember, addMemberDayOff, removeMemberDayOff, automaticRisks, projectCapacityStats, addSprint, updateSprint, removeSprint } = useGantt()

const newHolidayDate = ref('')
const memberNameInput = ref('')
const memberCapacityInput = ref(8)
const memberSectorInput = ref('')
const editingMemberIndex = ref<number | null>(null)
const memberDayOffInput = ref('')

const sprintName = ref('')
const sprintStart = ref('')
const sprintEnd = ref('')
const editingSprintId = ref<string | null>(null)

const handleSaveSprint = () => {
	if (sprintName.value && sprintStart.value && sprintEnd.value) {
		if (editingSprintId.value) {
			updateSprint(editingSprintId.value, sprintName.value, sprintStart.value, sprintEnd.value)
			cancelSprintEdit()
		} else {
			addSprint(sprintName.value, sprintStart.value, sprintEnd.value)
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

const availableSectors = ['Frontend', 'Backend', 'Fullstack', 'QA', 'Design', 'Produto', 'DevOps', 'Gestão']

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
	<div class="space-y-6">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
			<div class="space-y-6">
				<div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
					<h3 class="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
						<svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
						Definições Gerais
					</h3>
					<div class="flex gap-4 items-end">
						<div class="flex-1">
							<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Início do Projeto</label>
							<input v-model="config.projectStartDate" type="date" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 bg-slate-50 dark:bg-slate-700 dark:text-white" />
						</div>
						<div class="flex items-center gap-2 pb-2">
							<input v-model="config.skipWeekends" id="skipWeekends" type="checkbox" class="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-50 dark:bg-slate-700" />
							<label for="skipWeekends" class="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">Pular Fim de Semana</label>
						</div>
					</div>
				</div>

				<div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
					<h3 class="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
						<svg class="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
						Gestão de Sprints
					</h3>

					<div class="flex flex-col gap-2 mb-4 bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100 dark:border-purple-800/30">
						<input v-model="sprintName" type="text" placeholder="Nome (Ex: Sprint 1)" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
						<div class="flex gap-2">
							<div class="flex-1">
								<label class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Início</label>
								<input v-model="sprintStart" type="date" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
							</div>
							<div class="flex-1">
								<label class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Fim</label>
								<input v-model="sprintEnd" type="date" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
							</div>
						</div>

						<div class="flex gap-2 mt-1">
							<button @click="handleSaveSprint" class="flex-1 bg-purple-600 text-white border border-purple-700 px-3 py-1.5 rounded text-xs uppercase font-bold hover:bg-purple-700 transition-colors shadow-sm">
								{{ editingSprintId ? 'Salvar Alteração' : 'Adicionar Sprint' }}
							</button>
							<button v-if="editingSprintId" @click="cancelSprintEdit" class="bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-500 px-3 py-1.5 rounded text-xs uppercase font-bold">Cancelar</button>
						</div>
					</div>

					<div class="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
						<div v-if="config.sprints.length === 0" class="text-xs text-slate-400 italic w-full text-center py-4">Nenhuma sprint cadastrada.</div>
						<div v-for="sprint in config.sprints" :key="sprint.id" class="flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 p-2 rounded border border-slate-100 dark:border-slate-700 group hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
							<div class="flex flex-col">
								<span class="text-sm font-bold text-slate-700 dark:text-slate-300">{{ sprint.name }}</span>
								<span class="text-[10px] text-slate-500 dark:text-slate-400">{{ formatDateBr(sprint.startDate) }} até {{ formatDateBr(sprint.endDate) }}</span>
							</div>
							<div class="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
								<button @click="startEditSprint(sprint)" class="p-1 hover:text-blue-600 text-slate-400" title="Editar">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
								</button>
								<button @click="removeSprint(sprint.id)" class="p-1 hover:text-red-600 text-slate-400" title="Excluir">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>
						</div>
					</div>
				</div>

				<div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
					<h3 class="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
						<svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						Análise de Riscos
					</h3>
					<ul class="space-y-2 max-h-40 overflow-y-auto custom-scrollbar bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
						<li v-if="automaticRisks.length === 0" class="text-xs text-green-600 dark:text-green-400 flex items-center gap-2 py-1"><span class="text-lg">✅</span> Projeto saudável.</li>
						<li v-for="(risk, index) in automaticRisks" :key="index" class="flex items-start gap-2 text-xs text-red-800 dark:text-red-300 border-b border-red-200/50 dark:border-red-800/50 last:border-0 pb-2 last:pb-0">
							<span class="mt-0.5 font-bold">•</span>
							<span>{{ risk }}</span>
						</li>
					</ul>
				</div>
			</div>

			<div class="space-y-6">
				<div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full">
					<h3 class="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
						<svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
						Equipe e Capacidade
					</h3>

					<div class="flex flex-col gap-2 mb-4 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
						<div class="flex gap-2">
							<input v-model="memberNameInput" type="text" placeholder="Nome" class="flex-1 text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
							<input v-model.number="memberCapacityInput" type="number" placeholder="8h" min="1" max="24" class="w-16 text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 dark:bg-slate-700 dark:text-white" title="Capacidade/dia" />
						</div>
						<div>
							<input list="sectors-list" v-model="memberSectorInput" placeholder="Setor (Ex: Frontend)" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
							<datalist id="sectors-list"><option v-for="s in availableSectors" :key="s" :value="s"></option></datalist>
						</div>

						<div v-if="editingMemberIndex !== null" class="mt-2 border-t border-blue-200 dark:border-blue-800 pt-2">
							<label class="text-[10px] font-bold text-blue-800 dark:text-blue-300 block mb-1 uppercase">Folgas de {{ memberNameInput }}</label>
							<div class="flex gap-2 mb-2">
								<input v-model="memberDayOffInput" type="date" class="flex-1 text-xs rounded border-slate-300 dark:border-slate-600 p-1 dark:bg-slate-700 dark:text-white" />
								<button @click="handleAddMemberDayOff" class="bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 rounded text-xs font-bold">+</button>
							</div>
							<div class="flex flex-wrap gap-1">
								<span v-for="dayOff in config.teamMembers[editingMemberIndex].daysOff" :key="dayOff" class="text-[10px] bg-white dark:bg-slate-700 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded flex items-center gap-1">
									{{ formatDateBr(dayOff) }}
									<button @click="removeMemberDayOffHandler(editingMemberIndex!, dayOff)" class="hover:text-red-500 font-bold">&times;</button>
								</span>
							</div>
						</div>

						<div class="flex gap-2 mt-1">
							<button @click="handleSaveMember" class="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs uppercase font-bold hover:bg-blue-700 transition-colors shadow-sm">
								{{ editingMemberIndex !== null ? 'Salvar Alterações' : 'Adicionar Membro' }}
							</button>
							<button v-if="editingMemberIndex !== null" @click="cancelMemberEdit" class="bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-500 px-3 py-1.5 rounded text-xs uppercase font-bold">Cancelar</button>
						</div>
					</div>

					<div class="space-y-2 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar">
						<div v-if="config.teamMembers.length === 0" class="text-xs text-slate-400 italic text-center py-2">Sem equipe.</div>
						<div v-for="(member, index) in config.teamMembers" :key="index" class="flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 p-2 rounded border border-slate-100 dark:border-slate-700 group">
							<div class="flex items-center gap-2">
								<span class="w-8 h-8 rounded-full bg-white dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-200 border shadow-sm">
									{{ member.name.substring(0, 2).toUpperCase() }}
								</span>
								<div class="flex flex-col leading-none">
									<span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ member.name }}</span>
									<span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{{ member.sector || 'Outro' }} • {{ member.capacity }}h/dia</span>
								</div>
							</div>
							<div class="flex gap-1 opacity-60 group-hover:opacity-100">
								<button @click="startEditMember(index)" class="p-1 hover:text-blue-600 text-slate-400" title="Editar">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
								</button>
								<button @click="removeMember(index)" class="p-1 hover:text-red-600 text-slate-400" title="Excluir">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>
						</div>
					</div>

					<div v-if="config.teamMembers.length > 0" class="bg-blue-50 dark:bg-blue-900/10 rounded p-3 border border-blue-100 dark:border-blue-800/30 mb-4">
						<div class="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
							<span>Total ({{ projectCapacityStats.workingDays }} dias úteis)</span>
							<span class="text-blue-600 dark:text-blue-400">{{ projectCapacityStats.totalTeamCapacity }}h</span>
						</div>

						<div class="space-y-1 mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
							<div v-for="stat in projectCapacityStats.memberStats" :key="stat.name" class="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 hover:bg-blue-100/50 dark:hover:bg-blue-800/20 rounded px-1 py-0.5 transition-colors">
								<span>{{ stat.name }}</span>
								<span class="font-medium">{{ stat.totalCapacity }}h</span>
							</div>
						</div>
					</div>

					<div class="pt-4 border-t border-slate-100 dark:border-slate-700">
						<h4 class="font-bold text-sm text-slate-600 dark:text-slate-400 mb-2">Feriados Gerais</h4>
						<div class="flex gap-2 mb-2">
							<input v-model="newHolidayDate" type="date" class="flex-1 text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-1.5 dark:bg-slate-700 dark:text-white" />
							<button @click="handleAddHoliday" class="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-bold">+</button>
						</div>
						<div class="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
							<div v-for="date in config.holidays" :key="date" class="flex items-center bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-700">
								<span>{{ formatDateBr(date) }}</span>
								<button @click="removeHoliday(date)" class="ml-2 text-slate-400 hover:text-red-500 font-bold">&times;</button>
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
</style>
