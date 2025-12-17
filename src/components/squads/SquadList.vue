<script setup lang="ts">
import { ref } from 'vue'
import { useGantt } from '@/composables/useGantt'
import type { Squad } from '@/types/gantt'

defineProps<{
	selectedId: string | null
}>()

const emit = defineEmits(['select'])

const { config, addSquad, updateSquad, removeSquad } = useGantt()

const nameInput = ref('')
const colorInput = ref('#3b82f6')
const editingId = ref<string | null>(null)

const handleSave = () => {
	if (nameInput.value) {
		if (editingId.value) {
			updateSquad(editingId.value, nameInput.value, colorInput.value)
			editingId.value = null
		} else {
			addSquad(nameInput.value, colorInput.value)
		}
		nameInput.value = ''
		colorInput.value = '#3b82f6'
	}
}

const startEdit = (squad: Squad) => {
	nameInput.value = squad.name
	colorInput.value = squad.color
	editingId.value = squad.id
}

const handleRemove = (id: string) => {
	if (confirm('Tem certeza que deseja excluir esta Squad? Os membros voltarão para o diretório geral.')) {
		removeSquad(id)
		emit('select', null)
	}
}
</script>

<template>
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
			<input v-model="nameInput" type="text" placeholder="Nome da Squad" class="flex-1 text-sm rounded border-slate-300 dark:border-slate-600 shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
			<input v-model="colorInput" type="color" class="w-10 h-10 p-1 rounded border-slate-300 dark:border-slate-600 cursor-pointer" />
			<button @click="handleSave" class="bg-indigo-600 text-white px-3 rounded text-sm font-bold hover:bg-indigo-700 transition-colors">
				{{ editingId ? 'Salvar' : '+' }}
			</button>
		</div>

		<div class="space-y-2 overflow-y-auto custom-scrollbar flex-1">
			<div v-if="config.squads.length === 0" class="text-xs text-slate-400 italic">Nenhuma squad criada.</div>
			<div
				v-for="squad in config.squads"
				:key="squad.id"
				class="flex items-center justify-between p-2 rounded border transition-all cursor-pointer group"
				:class="selectedId === squad.id ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-700 ring-1 ring-indigo-300' : 'bg-slate-50 border-slate-100 dark:bg-slate-700/30 dark:border-slate-700 hover:bg-slate-100'"
				@click="emit('select', selectedId === squad.id ? null : squad.id)"
			>
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 rounded-full shadow-sm" :style="{ backgroundColor: squad.color }"></span>
					<span class="text-sm font-bold text-slate-700 dark:text-slate-300">{{ squad.name }}</span>
				</div>
				<div class="flex gap-1 opacity-60 group-hover:opacity-100">
					<button @click.stop="startEdit(squad)" class="text-slate-400 hover:text-blue-500">
						<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
					</button>
					<button @click.stop="handleRemove(squad.id)" class="text-slate-400 hover:text-red-500">
						<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
					</button>
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
