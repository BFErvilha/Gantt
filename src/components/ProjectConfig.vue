<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGantt } from '@/composables/useGantt'
import { format, parseISO, eachDayOfInterval, isWeekend } from 'date-fns'

const { config, addHolidayToSquad, removeHolidayFromSquad, updateSprintInSquad, updateMember, addMemberDayOff, removeMemberDayOff, automaticRisks } = useGantt()

const selectedSquadId = ref<string>('')
const selectedSprintId = ref<string>('')

const sprintForm = ref({
	id: '',
	name: '',
	startDate: '',
	endDate: '',
	reviewDate: '',
	retroDate: '',
	refinementDate: '',
	planningDate: '',
	skipWeekends: true,
})

const newHolidayDate = ref('')
const editingMemberIndex = ref<number | null>(null)
const memberDayOffInput = ref('')
const memberCapacityInput = ref(8)

const selectedSquad = computed(() => config.value.squads.find(s => s.id === selectedSquadId.value))
const squadSprints = computed(() => selectedSquad.value?.sprints || [])
const currentSprint = computed(() => squadSprints.value.find(s => s.id === selectedSprintId.value))

const contextMembers = computed(() => {
	if (!selectedSquadId.value) return []
	return config.value.teamMembers.filter(m => m.squadIds.includes(selectedSquadId.value))
})

watch(selectedSprintId, newId => {
	if (newId && currentSprint.value) {
		sprintForm.value = {
			...currentSprint.value,
			reviewDate: currentSprint.value.reviewDate || '',
			retroDate: currentSprint.value.retroDate || '',
			refinementDate: currentSprint.value.refinementDate || '',
			planningDate: currentSprint.value.planningDate || '',
			skipWeekends: currentSprint.value.skipWeekends ?? true,
		}
	}
})

const sprintMetrics = computed(() => {
	if (!sprintForm.value.startDate || !sprintForm.value.endDate) return { working: 0, calendar: 0 }

	const start = parseISO(sprintForm.value.startDate)
	const end = parseISO(sprintForm.value.endDate)
	const interval = eachDayOfInterval({ start, end })

	const calendarDays = interval.length
	const holidays = selectedSquad.value?.holidays || []

	const events = [sprintForm.value.reviewDate, sprintForm.value.retroDate, sprintForm.value.refinementDate, sprintForm.value.planningDate]

	const workingDays = interval.filter(day => {
		const dayStr = format(day, 'yyyy-MM-dd')
		const isWeekEnd = sprintForm.value.skipWeekends && isWeekend(day)
		const isHoliday = holidays.includes(dayStr)
		const isEventDay = events.includes(dayStr)

		return !isWeekEnd && !isHoliday && !isEventDay
	}).length

	return { working: workingDays, calendar: calendarDays }
})

const saveSprintChanges = () => {
	if (selectedSquadId.value && selectedSprintId.value) {
		updateSprintInSquad(selectedSquadId.value, selectedSprintId.value, { ...sprintForm.value })
	}
}

const handleAddHoliday = () => {
	if (newHolidayDate.value && selectedSquadId.value) {
		addHolidayToSquad(selectedSquadId.value, newHolidayDate.value)
		newHolidayDate.value = ''
	}
}

const startEditMember = (member: any) => {
	const index = config.value.teamMembers.findIndex(m => m.name === member.name)
	if (index !== -1) {
		editingMemberIndex.value = index
		memberCapacityInput.value = config.value.teamMembers[index].capacity
	}
}

const saveMemberCapacity = () => {
	if (editingMemberIndex.value !== null) {
		const m = config.value.teamMembers[editingMemberIndex.value]
		updateMember(editingMemberIndex.value, m.name, memberCapacityInput.value, m.sector, m.squadIds)
		editingMemberIndex.value = null
	}
}

const addDayOff = () => {
	if (editingMemberIndex.value !== null && memberDayOffInput.value) {
		addMemberDayOff(editingMemberIndex.value, memberDayOffInput.value)
		memberDayOffInput.value = ''
	}
}

const openPicker = (e: any) => {
	if ('showPicker' in HTMLInputElement.prototype) {
		e.target.showPicker()
	}
}

const formatDateBr = (isoDate: string) => (isoDate ? format(parseISO(isoDate), 'dd/MM/yyyy') : '-')
</script>

<template>
	<div class="space-y-6 animate-fade-in pb-10">
		<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-6">
			<div class="flex-1">
				<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">1. Selecione a Squad</label>
				<select v-model="selectedSquadId" @change="selectedSprintId = ''" class="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold h-12 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer">
					<option value="" disabled>Escolha uma Squad</option>
					<option v-for="s in config.squads" :key="s.id" :value="s.id">Squad: {{ s.name }}</option>
				</select>
			</div>

			<div class="flex-1" :class="{ 'opacity-50 pointer-events-none': !selectedSquadId }">
				<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">2. Selecione a Sprint</label>
				<select v-model="selectedSprintId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold h-12 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer">
					<option value="" disabled>Escolha a Sprint para configurar</option>
					<option v-for="s in squadSprints" :key="s.id" :value="s.id">{{ s.name }} ({{ formatDateBr(s.startDate) }})</option>
				</select>
			</div>
		</div>

		<div v-if="!selectedSprintId" class="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-20 text-center transition-colors">
			<div class="text-5xl mb-4">🗓️</div>
			<h3 class="text-xl font-bold text-slate-600 dark:text-slate-300">Aguardando Seleção</h3>
			<p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2">Selecione uma Squad e uma Sprint acima para liberar as configurações.</p>
		</div>

		<div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
			<div class="space-y-6">
				<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
					<h3 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
						<span class="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400 text-xl">📅</span>
						Período da Sprint
					</h3>

					<div class="grid grid-cols-2 gap-6 mb-8">
						<div>
							<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-wider">Início</label>
							<input
								type="date"
								v-model="sprintForm.startDate"
								@change="saveSprintChanges"
								@click="openPicker"
								class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base h-12 px-4 dark:[color-scheme:dark] focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-sm"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-wider">Fim</label>
							<input
								type="date"
								v-model="sprintForm.endDate"
								@change="saveSprintChanges"
								@click="openPicker"
								class="w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base h-12 px-4 dark:[color-scheme:dark] focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-sm"
							/>
						</div>
					</div>

					<div class="space-y-4 mb-8">
						<h4 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Ritos (Dias não produtivos)</h4>
						<div
							v-for="event in ['Planning', 'Refinement', 'Review', 'Retrospective']"
							:key="event"
							class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
						>
							<span class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ event }}</span>
							<input
								type="date"
								v-model="sprintForm[`${event.toLowerCase()}Date` as keyof typeof sprintForm]"
								@change="saveSprintChanges"
								@click="openPicker"
								class="text-sm font-medium rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white h-10 px-3 dark:[color-scheme:dark] focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
							/>
						</div>
					</div>

					<div class="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
						<input type="checkbox" v-model="sprintForm.skipWeekends" @change="saveSprintChanges" class="w-6 h-6 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer" id="skipW" />
						<label for="skipW" class="text-base font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">Pular Finais de Semana</label>
					</div>
				</div>

				<div class="bg-slate-900 dark:bg-indigo-950 text-white p-6 rounded-xl shadow-lg border border-slate-800 dark:border-indigo-900 transition-colors">
					<h3 class="text-xs font-bold uppercase text-slate-400 dark:text-indigo-300 mb-6 tracking-wider">Capacidade da Sprint</h3>
					<div class="grid grid-cols-2 gap-8">
						<div class="border-r border-slate-700 dark:border-indigo-900">
							<span class="block text-4xl font-black mb-1">{{ sprintMetrics.calendar }}</span>
							<span class="text-[11px] font-bold text-slate-500 dark:text-indigo-400 uppercase tracking-wider">Dias Corridos</span>
						</div>
						<div class="text-emerald-400">
							<span class="block text-4xl font-black mb-1">{{ sprintMetrics.working }}</span>
							<span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">Dias Úteis Produtivos</span>
						</div>
					</div>
				</div>

				<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
					<h3 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
						<div class="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">⚠️</div>
						Riscos Detectados
					</h3>
					<div class="bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
						<ul class="space-y-1 max-h-56 overflow-y-auto p-2">
							<li v-if="automaticRisks.length === 0" class="text-sm text-green-600 dark:text-green-400 flex items-center gap-2 p-3 font-semibold bg-white dark:bg-slate-800 rounded-lg shadow-sm">✅ Nenhum risco crítico detectado.</li>
							<li v-for="(risk, index) in automaticRisks" :key="index" class="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 text-sm text-slate-700 dark:text-slate-300 shadow-sm">
								<span class="text-red-500 font-bold text-lg leading-none">•</span>
								<span>{{ risk }}</span>
							</li>
						</ul>
					</div>
				</div>
			</div>

			<div class="space-y-6">
				<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
					<h3 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
						<span class="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400 text-xl">🏝️</span>
						Feriados Coletivos
					</h3>
					<div class="flex gap-3 mb-6">
						<input
							v-model="newHolidayDate"
							type="date"
							@click="openPicker"
							class="flex-1 rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm h-12 px-4 dark:[color-scheme:dark] focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
						/>
						<button @click="handleAddHoliday" class="bg-amber-500 hover:bg-amber-600 text-white px-6 rounded-xl font-bold transition-all shadow-md active:scale-95 text-lg">+</button>
					</div>
					<div class="flex flex-wrap gap-2">
						<div v-for="date in selectedSquad?.holidays" :key="date" class="flex items-center bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 group transition-all">
							{{ formatDateBr(date) }}
							<button @click="removeHolidayFromSquad(selectedSquadId, date)" class="ml-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 font-black">&times;</button>
						</div>
					</div>
				</div>

				<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
					<h3 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
						<span class="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400 text-xl">👤</span>
						Day Off Individual
					</h3>
					<div class="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
						<div v-for="member in contextMembers" :key="member.name" class="p-4 border rounded-2xl border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 transition-all hover:shadow-md">
							<div v-if="editingMemberIndex !== null && config.teamMembers[editingMemberIndex].name === member.name" class="space-y-4 animate-fade-in">
								<div class="flex items-center justify-between">
									<span class="font-bold text-base text-slate-700 dark:text-slate-200">{{ member.name }}</span>
									<div class="flex gap-3">
										<input v-model.number="memberCapacityInput" type="number" class="w-20 h-10 px-2 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500" />
										<button @click="saveMemberCapacity" class="text-green-600 font-bold text-sm hover:text-green-700 transition-colors bg-green-50 dark:bg-green-900/20 px-3 rounded-lg">OK</button>
									</div>
								</div>
								<div class="flex gap-3">
									<input
										v-model="memberDayOffInput"
										type="date"
										@click="openPicker"
										class="flex-1 text-sm h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:[color-scheme:dark] focus:ring-2 focus:ring-indigo-500"
									/>
									<button @click="addDayOff" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-xl text-lg font-bold transition-all shadow-md active:scale-95">+</button>
								</div>
								<div class="flex flex-wrap gap-2 mt-3">
									<span v-for="d in member.daysOff" :key="d" class="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center border border-red-100 dark:border-red-800 group shadow-sm">
										{{ formatDateBr(d) }}
										<button @click="removeMemberDayOff(editingMemberIndex!, d)" class="ml-2 transition-transform hover:scale-125">&times;</button>
									</span>
								</div>
							</div>
							<div v-else class="flex justify-between items-center">
								<div class="flex flex-col">
									<span class="text-base font-bold text-slate-700 dark:text-slate-200">{{ member.name }}</span>
									<span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{{ member.daysOff.length }} Folgas</span>
								</div>
								<button
									@click="startEditMember(member)"
									class="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95"
								>
									⚙️
								</button>
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
	width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background: #cbd5e1;
	border-radius: 10px;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
	background: #334155;
}
.animate-fade-in {
	animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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

/* Garante que o calendário cubra toda a área clicável no Safari/Chrome mobile */
input[type='date'] {
	position: relative;
	appearance: none;
	-webkit-appearance: none;
}

input[type='date']::-webkit-calendar-picker-indicator {
	background: transparent;
	bottom: 0;
	color: transparent;
	cursor: pointer;
	height: auto;
	left: 0;
	position: absolute;
	right: 0;
	top: 0;
	width: auto;
}
</style>
