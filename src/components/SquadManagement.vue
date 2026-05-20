<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGantt, type Squad } from '@/composables/useGantt'
import { useToast } from '@/composables/useToast'
import { focusMemberInputFlag } from '@/composables/useSquadFocus'

const { config, addMember, removeMember, addSquad, updateSquad, removeSquad, linkMemberToSquad, unlinkMemberFromSquad, updateMember, addSprintToSquad } = useGantt()

const toast = useToast()

const squadNameInput = ref('')
const squadColorInput = ref('#3b82f6')
const editingSquadId = ref<string | null>(null)
const selectedSquadId = ref<string | null>(null)

const memberNameInput = ref('')
const memberSectorInput = ref('')
const memberCapacityInput = ref(8)
const selectedMemberIdToAdd = ref('')

const newSprintName = ref('')
const newSprintStartDate = ref('')
const newSprintEndDate = ref('')

const editingMemberIndex = ref<number | null>(null)
const memberNameInputEl = ref<HTMLInputElement | null>(null)

watch(focusMemberInputFlag, () => {
	memberNameInputEl.value?.focus()
	memberNameInputEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

const handleSaveSquad = () => {
	if (squadNameInput.value) {
		if (editingSquadId.value) {
			updateSquad(editingSquadId.value, squadNameInput.value, squadColorInput.value)
			editingSquadId.value = null
		} else {
			addSquad(squadNameInput.value, squadColorInput.value)
		}
		squadNameInput.value = ''
		squadColorInput.value = '#3b82f6'
	}
}

const startEditSquad = (squad: Squad) => {
	squadNameInput.value = squad.name
	squadColorInput.value = squad.color
	editingSquadId.value = squad.id
}

const selectSquad = (id: string) => {
	selectedSquadId.value = selectedSquadId.value === id ? null : id
	memberNameInput.value = ''
	memberSectorInput.value = ''
	memberCapacityInput.value = 8
	editingMemberIndex.value = null
	newSprintName.value = ''
}

const removeSquadHandler = (id: string) => {
	if (confirm('Tem certeza que deseja excluir esta Squad? Os membros voltarão para o diretório geral.')) {
		removeSquad(id)
		if (selectedSquadId.value === id) selectedSquadId.value = null
	}
}

const handleAddSprint = () => {
	if (selectedSquadId.value && newSprintName.value) {
		const hasDates = !!newSprintStartDate.value
		addSprintToSquad(selectedSquadId.value, newSprintName.value, newSprintStartDate.value, newSprintEndDate.value)
		newSprintName.value = ''
		newSprintStartDate.value = ''
		newSprintEndDate.value = ''
		toast.show(hasDates ? 'Sprint criada! Configure os ritos em Configurações.' : 'Sprint criada! Defina as datas em Configurações.', 'success')
	}
}

const handleSaveNewMember = () => {
	if (memberNameInput.value) {
		const sector = memberSectorInput.value || 'Outro'
		if (editingMemberIndex.value !== null) {
			const current = config.value.teamMembers[editingMemberIndex.value]
			updateMember(editingMemberIndex.value, memberNameInput.value, current.capacity, sector, current.squadIds)
			editingMemberIndex.value = null
		} else {
			addMember(memberNameInput.value, 8, sector, [])
		}
		memberNameInput.value = ''
		memberSectorInput.value = ''
	}
}

const startEditMemberGlobal = (member: any) => {
	const idx = config.value.teamMembers.findIndex(m => m.name === member.name)
	if (idx !== -1) {
		editingMemberIndex.value = idx
		memberNameInput.value = member.name
		memberSectorInput.value = member.sector
	}
}

const deleteMemberGlobal = (member: any) => {
	const idx = config.value.teamMembers.findIndex(m => m.name === member.name)
	if (idx !== -1 && confirm(`Excluir ${member.name} permanentemente?`)) {
		removeMember(idx)
	}
}

const cancelMemberEdit = () => {
	editingMemberIndex.value = null
	memberNameInput.value = ''
	memberSectorInput.value = ''
}

const membersInSquad = computed(() => {
	if (!selectedSquadId.value) return []
	return config.value.teamMembers.filter(m => m.squadIds.includes(selectedSquadId.value!))
})

const availableMembersToLink = computed(() => {
	if (!selectedSquadId.value) return []
	return config.value.teamMembers.filter(m => !m.squadIds.includes(selectedSquadId.value!))
})

const handleLinkMember = () => {
	if (selectedMemberIdToAdd.value && selectedSquadId.value) {
		const idx = config.value.teamMembers.findIndex(m => m.name === selectedMemberIdToAdd.value)
		if (idx !== -1) {
			linkMemberToSquad(idx, selectedSquadId.value, memberCapacityInput.value)

			selectedMemberIdToAdd.value = ''
			memberCapacityInput.value = 8
		}
	}
}

const handleUnlinkMember = (member: any) => {
	const idx = config.value.teamMembers.findIndex(m => m.name === member.name)
	if (idx !== -1 && selectedSquadId.value) {
		unlinkMemberFromSquad(idx, selectedSquadId.value)
	}
}

const availableSectors = ['Frontend', 'Backend', 'Fullstack', 'QA', 'Design', 'Produto', 'DevOps', 'Gestão']
</script>

<template>
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start lg:h-[calc(100vh-200px)]">
		<div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
			<h3 class="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
				<svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
					/>
				</svg>
				1. Squads
			</h3>

			<div class="flex gap-2 mb-4">
				<input v-model="squadNameInput" type="text" placeholder="Nome da Squad" class="flex-1 text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
				<input v-model="squadColorInput" type="color" class="w-10 h-10 p-1 rounded border-slate-300 dark:border-slate-600 cursor-pointer" />
				<button @click="handleSaveSquad" class="bg-indigo-600 text-white px-3 rounded text-sm font-bold hover:bg-indigo-700 transition-colors">
					{{ editingSquadId ? 'Salvar' : '+' }}
				</button>
			</div>

			<div class="space-y-2 overflow-y-auto custom-scrollbar flex-1">
				<div v-if="config.squads.length === 0" class="text-xs text-slate-400 italic">Nenhuma squad criada.</div>
				<div
					v-for="squad in config.squads"
					:key="squad.id"
					class="flex items-center justify-between p-2 rounded border transition-all cursor-pointer group"
					:class="selectedSquadId === squad.id ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-700 ring-1 ring-indigo-300' : 'bg-slate-50 border-slate-100 dark:bg-slate-700/30 dark:border-slate-700 hover:bg-slate-100'"
					@click="selectSquad(squad.id)"
				>
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded-full shadow-sm" :style="{ backgroundColor: squad.color }"></span>
						<span class="text-sm font-bold text-slate-700 dark:text-slate-300">{{ squad.name }}</span>
					</div>
					<div class="flex gap-1 opacity-60 group-hover:opacity-100">
						<button @click.stop="startEditSquad(squad)" class="text-slate-400 hover:text-blue-500">
							<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
						</button>
						<button @click.stop="removeSquadHandler(squad.id)" class="text-slate-400 hover:text-red-500">
							<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
						</button>
					</div>
				</div>
			</div>
		</div>

		<div class="lg:col-span-2 h-full flex flex-col">
			<div v-if="!selectedSquadId" class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col animate-fade-in">
				<h3 class="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
					<svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
					</svg>
					2. Diretório Geral de Membros
				</h3>

				<div class="mb-4 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
					<p class="text-xs text-emerald-800 dark:text-emerald-200 mb-3 font-medium">Cadastre aqui todos os colaboradores. Depois, selecione uma Squad à esquerda para vinculá-los.</p>
					<datalist id="sectors-list"><option v-for="s in availableSectors" :key="s" :value="s"></option></datalist>
					<div class="space-y-2">
						<input ref="memberNameInputEl" v-model="memberNameInput" type="text" placeholder="Nome do Colaborador" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
						<div class="flex flex-col sm:flex-row gap-2">
							<input list="sectors-list" v-model="memberSectorInput" placeholder="Setor (Opcional)" class="flex-1 min-w-0 text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
							<div class="flex gap-2">
								<button @click="handleSaveNewMember" class="flex-1 sm:flex-none bg-emerald-600 text-white px-4 rounded text-sm font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap">
									{{ editingMemberIndex !== null ? 'Atualizar' : 'Cadastrar' }}
								</button>
								<button v-if="editingMemberIndex !== null" @click="cancelMemberEdit" class="bg-slate-200 text-slate-600 px-3 rounded text-sm font-bold whitespace-nowrap">Cancelar</button>
							</div>
						</div>
					</div>
				</div>

				<div class="overflow-y-auto overflow-x-auto custom-scrollbar flex-1 border rounded-lg border-slate-100 dark:border-slate-700">
					<table class="w-full text-sm text-left">
						<thead class="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 font-bold sticky top-0">
							<tr>
								<th class="px-3 py-2">Nome</th>
								<th class="px-3 py-2 hidden sm:table-cell">Setor</th>
								<th class="px-3 py-2">Squads</th>
								<th class="px-3 py-2 text-right">Ações</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
							<tr v-for="member in config.teamMembers" :key="member.name" class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
								<td class="px-3 py-2 font-medium text-slate-700 dark:text-slate-200 max-w-[90px] truncate">{{ member.name }}</td>
								<td class="px-3 py-2 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{{ member.sector }}</td>
								<td class="px-3 py-2">
									<div class="flex flex-wrap gap-1">
										<span v-for="sid in member.squadIds" :key="sid" class="text-[10px] px-1.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 whitespace-nowrap">
											{{ config.squads.find(s => s.id === sid)?.name || '?' }}
										</span>
										<span v-if="member.squadIds.length === 0" class="text-slate-400 text-xs italic">—</span>
									</div>
								</td>
								<td class="px-3 py-2 text-right whitespace-nowrap">
									<button @click="startEditMemberGlobal(member)" class="text-blue-500 hover:text-blue-700 transition-colors inline-flex items-center mr-2" title="Editar">
										<svg class="w-3.5 h-3.5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
										<span class="hidden sm:inline text-xs underline-offset-2 hover:underline">Editar</span>
									</button>
									<button @click="deleteMemberGlobal(member)" class="text-red-500 hover:text-red-700 transition-colors inline-flex items-center" title="Excluir">
										<svg class="w-3.5 h-3.5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
										<span class="hidden sm:inline text-xs underline-offset-2 hover:underline">Excluir</span>
									</button>
								</td>
							</tr>
							<tr v-if="config.teamMembers.length === 0">
								<td colspan="4" class="px-3 py-8 text-center text-slate-400 italic">Nenhum membro cadastrado. Use o formulário acima.</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<div v-else class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col animate-fade-in">
				<div class="flex justify-between items-center mb-4">
					<h3 class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
						<svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
						Membros da Squad: <span class="text-indigo-600 dark:text-indigo-400">{{ config.squads.find(s => s.id === selectedSquadId)?.name }}</span>
					</h3>
					<button @click="selectedSquadId = null" class="text-xs text-slate-400 hover:text-slate-600 underline">Voltar ao Diretório</button>
				</div>

				<div class="mb-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30">
					<p class="text-xs text-blue-800 dark:text-blue-200 mb-3 font-medium">Vincule um membro existente a esta squad.</p>
					<div class="flex flex-col sm:flex-row gap-2 sm:items-end">
						<div class="flex-1">
							<label class="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Membro</label>
							<select v-model="selectedMemberIdToAdd" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 p-2 dark:bg-slate-700 dark:text-white">
								<option value="">-- Selecione --</option>
								<option v-for="m in availableMembersToLink" :key="m.name" :value="m.name">{{ m.name }} ({{ m.sector }})</option>
							</select>
						</div>
						<div class="flex gap-2 sm:contents">
							<div class="w-28 sm:w-24">
								<label class="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Capacidade</label>
								<input v-model.number="memberCapacityInput" type="number" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 p-2 dark:bg-slate-700 dark:text-white" />
							</div>
							<button @click="handleLinkMember" :disabled="!selectedMemberIdToAdd" class="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap self-end">Vincular</button>
						</div>
					</div>
				</div>

				<div class="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800/30 transition-all">
					<h4 class="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 mb-3 tracking-wider flex items-center gap-2"><span>🚀</span> Nova Sprint</h4>
					<div class="space-y-2">
						<input v-model="newSprintName" type="text" placeholder="Nome da Sprint (ex: Sprint 01)" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 p-2 dark:bg-slate-700 dark:text-white" @keyup.enter="handleAddSprint" />
						<div class="grid grid-cols-2 gap-2">
							<div>
								<label class="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Início</label>
								<input v-model="newSprintStartDate" type="date" class="w-full text-xs rounded border-slate-300 dark:border-slate-600 p-1.5 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark]" />
							</div>
							<div>
								<label class="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Fim</label>
								<input v-model="newSprintEndDate" type="date" class="w-full text-xs rounded border-slate-300 dark:border-slate-600 p-1.5 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark]" />
							</div>
						</div>
						<div class="flex items-center justify-between">
							<p class="text-[10px] text-slate-400 italic">Ritos configuráveis em Configurações.</p>
							<button @click="handleAddSprint" :disabled="!newSprintName" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-all disabled:opacity-50">Criar Sprint</button>
						</div>
					</div>
				</div>

				<div class="space-y-2 overflow-y-auto custom-scrollbar flex-1">
					<div v-if="membersInSquad.length === 0" class="text-center py-8 text-slate-400 italic bg-slate-50 dark:bg-slate-900/30 rounded border border-dashed border-slate-200">Nenhum membro vinculado a esta squad.</div>
					<div v-for="member in membersInSquad" :key="member.name" class="flex items-center justify-between bg-white border border-slate-100 dark:bg-slate-700/20 dark:border-slate-700 p-3 rounded hover:shadow-sm transition-all">
						<div class="flex items-center gap-3">
							<div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
								{{ member.name.substring(0, 2).toUpperCase() }}
							</div>
							<div>
								<div class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ member.name }}</div>
								<div class="text-xs text-slate-500">{{ member.sector }} • {{ member.capacity }}h/dia</div>
							</div>
						</div>
						<button @click="handleUnlinkMember(member)" class="text-red-400 hover:text-red-600 text-xs border border-red-100 hover:bg-red-50 px-2 py-1 rounded transition-colors">Desvincular</button>
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
	}
	to {
		opacity: 1;
	}
}
</style>
