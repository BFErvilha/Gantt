<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGantt } from '@/composables/useGantt'
import type { TeamMember } from '@/types/gantt'

const props = defineProps<{
	squadId: string
}>()

const emit = defineEmits(['back'])

const { config, linkMemberToSquad, unlinkMemberFromSquad } = useGantt()

const selectedMemberIdToAdd = ref('')
const capacityInput = ref(8)

const squadName = computed(() => config.value.squads.find(s => s.id === props.squadId)?.name || 'Squad')

const membersInSquad = computed(() => {
	return config.value.teamMembers.filter(m => m.squadIds.includes(props.squadId))
})

const availableMembers = computed(() => {
	return config.value.teamMembers.filter(m => !m.squadIds.includes(props.squadId))
})

const handleLink = () => {
	if (selectedMemberIdToAdd.value) {
		const idx = config.value.teamMembers.findIndex(m => m.name === selectedMemberIdToAdd.value)
		if (idx !== -1) {
			linkMemberToSquad(idx, props.squadId, capacityInput.value)
			selectedMemberIdToAdd.value = ''
			capacityInput.value = 8
		}
	}
}

const handleUnlink = (member: TeamMember) => {
	const idx = config.value.teamMembers.findIndex(m => m.name === member.name)
	if (idx !== -1) {
		unlinkMemberFromSquad(idx, props.squadId)
	}
}
</script>

<template>
	<div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col animate-fade-in">
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
				Membros da Squad: <span class="text-indigo-600 dark:text-indigo-400">{{ squadName }}</span>
			</h3>
			<button @click="emit('back')" class="text-xs text-slate-400 hover:text-slate-600 underline">Voltar ao Diretório</button>
		</div>

		<div class="mb-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30">
			<p class="text-xs text-blue-800 dark:text-blue-200 mb-3 font-medium">Vincule um membro existente a esta squad e defina sua capacidade de trabalho.</p>
			<div class="flex gap-2 items-end">
				<div class="flex-1">
					<label class="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Membro</label>
					<select v-model="selectedMemberIdToAdd" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 p-2 dark:bg-slate-700 dark:text-white">
						<option value="">-- Selecione --</option>
						<option v-for="m in availableMembers" :key="m.name" :value="m.name">{{ m.name }} ({{ m.sector }})</option>
					</select>
				</div>
				<div class="w-24">
					<label class="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Capacidade</label>
					<input v-model.number="capacityInput" type="number" class="w-full text-sm rounded border-slate-300 dark:border-slate-600 p-2 dark:bg-slate-700 dark:text-white" />
				</div>
				<button @click="handleLink" :disabled="!selectedMemberIdToAdd" class="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">Vincular</button>
			</div>
			<div v-if="availableMembers.length === 0 && config.teamMembers.length > 0" class="mt-2 text-[10px] text-amber-600">* Todos os membros cadastrados já estão nesta squad.</div>
			<div v-if="config.teamMembers.length === 0" class="mt-2 text-[10px] text-red-500 cursor-pointer" @click="emit('back')">* Nenhum membro cadastrado. Clique aqui para ir ao Diretório.</div>
		</div>

		<div class="space-y-2 overflow-y-auto custom-scrollbar flex-1">
			<div v-if="membersInSquad.length === 0" class="text-center py-8 text-slate-400 italic bg-slate-50 dark:bg-slate-900/30 rounded border border-dashed border-slate-200">Nenhum membro vinculado.</div>
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
				<button @click="handleUnlink(member)" class="text-red-400 hover:text-red-600 text-xs border border-red-100 hover:bg-red-50 px-2 py-1 rounded transition-colors">Desvincular</button>
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
