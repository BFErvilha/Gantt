<script setup lang="ts">
import { ref } from 'vue'
import { useGantt } from '@/composables/useGantt'
import type { TeamMember } from '@/types/gantt'

const { config, addMember, updateMember, removeMember } = useGantt()

const nameInput = ref('')
const sectorInput = ref('')
const editingIndex = ref<number | null>(null)
const availableSectors = ['Frontend', 'Backend', 'Fullstack', 'QA', 'Design', 'Produto', 'DevOps', 'Gestão']

const handleSave = () => {
	if (nameInput.value) {
		const sector = sectorInput.value || 'Outro'
		if (editingIndex.value !== null) {
			const current = config.value.teamMembers[editingIndex.value]
			updateMember(editingIndex.value, nameInput.value, current.capacity, sector, current.squadIds)
			editingIndex.value = null
		} else {
			addMember(nameInput.value, 8, sector, [])
		}
		nameInput.value = ''
		sectorInput.value = ''
	}
}

const startEdit = (member: TeamMember) => {
	const idx = config.value.teamMembers.findIndex(m => m.name === member.name)
	if (idx !== -1) {
		editingIndex.value = idx
		nameInput.value = member.name
		sectorInput.value = member.sector
	}
}

const cancelEdit = () => {
	editingIndex.value = null
	nameInput.value = ''
	sectorInput.value = ''
}

const handleDelete = (member: TeamMember) => {
	const idx = config.value.teamMembers.findIndex(m => m.name === member.name)
	if (idx !== -1 && confirm(`Excluir ${member.name} permanentemente?`)) {
		removeMember(idx)
	}
}

const getSquadName = (id: string) => config.value.squads.find(s => s.id === id)?.name || '?'
</script>

<template>
	<div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col animate-fade-in">
		<h3 class="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
			</svg>
			2. Diretório Geral de Membros
		</h3>

		<div class="mb-4 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
			<p class="text-xs text-emerald-800 dark:text-emerald-200 mb-3 font-medium">Cadastre aqui todos os colaboradores. Depois, selecione uma Squad à esquerda para vinculá-los.</p>
			<div class="flex gap-2">
				<input v-model="nameInput" type="text" placeholder="Nome do Colaborador" class="flex-1 text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
				<input list="sectors-list" v-model="sectorInput" placeholder="Setor" class="w-1/3 text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
				<datalist id="sectors-list"><option v-for="s in availableSectors" :key="s" :value="s"></option></datalist>

				<button @click="handleSave" class="bg-emerald-600 text-white px-4 rounded text-sm font-bold hover:bg-emerald-700 transition-colors">
					{{ editingIndex !== null ? 'Atualizar' : 'Cadastrar' }}
				</button>
				<button v-if="editingIndex !== null" @click="cancelEdit" class="bg-slate-200 text-slate-600 px-3 rounded text-sm font-bold">Cancelar</button>
			</div>
		</div>

		<div class="overflow-y-auto custom-scrollbar flex-1 border rounded-lg border-slate-100 dark:border-slate-700">
			<table class="w-full text-sm text-left">
				<thead class="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 font-bold sticky top-0">
					<tr>
						<th class="px-4 py-2">Nome</th>
						<th class="px-4 py-2">Setor</th>
						<th class="px-4 py-2">Squads Vinculadas</th>
						<th class="px-4 py-2 text-right">Ações</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
					<tr v-for="member in config.teamMembers" :key="member.name" class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
						<td class="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">{{ member.name }}</td>
						<td class="px-4 py-2 text-slate-500 dark:text-slate-400">{{ member.sector }}</td>
						<td class="px-4 py-2">
							<div class="flex flex-wrap gap-1">
								<span v-for="sid in member.squadIds" :key="sid" class="text-[10px] px-1.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500">
									{{ getSquadName(sid) }}
								</span>
								<span v-if="member.squadIds.length === 0" class="text-slate-400 text-xs italic">Sem vínculo</span>
							</div>
						</td>
						<td class="px-4 py-2 text-right">
							<button @click="startEdit(member)" class="text-blue-500 hover:underline mr-2 text-xs">Editar</button>
							<button @click="handleDelete(member)" class="text-red-500 hover:underline text-xs">Excluir</button>
						</td>
					</tr>
					<tr v-if="config.teamMembers.length === 0">
						<td colspan="4" class="px-4 py-8 text-center text-slate-400 italic">Nenhum membro cadastrado. Use o formulário acima.</td>
					</tr>
				</tbody>
			</table>
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
