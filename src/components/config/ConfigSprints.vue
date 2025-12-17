<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { format, parseISO } from 'date-fns'
import type { Sprint } from '@/types/gantt'

const props = defineProps<{
	squadId: string
}>()

const { config, addSprintToSquad, updateSprintInSquad, removeSprintFromSquad } = useGantt()

const sprintName = ref('')
const sprintStart = ref('')
const sprintEnd = ref('')
const editingSprintId = ref<string | null>(null)

const selectedSquad = computed(() => config.value.squads.find(s => s.id === props.squadId))

const handleSaveSprint = () => {
	if (props.squadId && sprintName.value && sprintStart.value && sprintEnd.value) {
		if (editingSprintId.value) {
			updateSprintInSquad(props.squadId, editingSprintId.value, sprintName.value, sprintStart.value, sprintEnd.value)
			cancelSprintEdit()
		} else {
			addSprintToSquad(props.squadId, sprintName.value, sprintStart.value, sprintEnd.value)
			resetSprintForm()
		}
	}
}

const startEditSprint = (sprint: Sprint) => {
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

const formatDateBr = (isoDate: string) => format(parseISO(isoDate), 'dd/MM/yyyy')
</script>

<template>
	<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
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
					<input v-model="sprintStart" type="date" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-950 focus:ring-2 focus:ring-purple-500 focus:outline-none dark:[color-scheme:dark]" />
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
							<span class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ sprint.name }}</span>
							<div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
								<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
								{{ formatDateBr(sprint.startDate) }} até {{ formatDateBr(sprint.endDate) }}
							</div>
						</div>
						<div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
							<button @click="startEditSprint(sprint)" class="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="Editar">
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
							</button>
							<button @click="removeSprintFromSquad(squadId, sprint.id)" class="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Excluir">
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
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
