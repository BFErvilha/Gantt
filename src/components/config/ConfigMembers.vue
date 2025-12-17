<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { format, parseISO } from 'date-fns'
import type { TeamMember } from '@/types/gantt'

const props = defineProps<{
	squadId: string
}>()

const { config, updateMember, addMemberDayOff, removeMemberDayOff } = useGantt()

const editingMemberIndex = ref<number | null>(null)
const memberDayOffInput = ref('')
const memberCapacityInput = ref(8)

const contextMembers = computed(() => {
	if (props.squadId) {
		return config.value.teamMembers.filter(m => m.squadIds.includes(props.squadId))
	}
	return config.value.teamMembers
})

const startEditMemberContext = (memberLocal: TeamMember) => {
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
</script>

<template>
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
