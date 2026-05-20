<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { format, parseISO, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useGantt, type Sprint, type Task, type SprintCloseDecision } from '@/composables/useGantt'

const { addSprintToSquad, config } = useGantt()

interface ClosingSprint extends Sprint {
	squadId: string
	squadName?: string
	isPast?: boolean
}

interface Props {
	open: boolean
	sprint: ClosingSprint | null
	tasks: Task[]
	futureSprintsForSquad: Sprint[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
	confirm: [decisions: SprintCloseDecision[]]
	cancel: []
}>()

// ── Inline create sprint ──────────────────────────────────────────
const showCreateSprint = ref(false)
const newSprintName = ref('')
const newSprintStart = ref('')
const newSprintEnd = ref('')
const createSprintError = ref('')

watch(
	() => props.open,
	open => {
		if (!open) {
			showCreateSprint.value = false
			newSprintName.value = ''
			newSprintStart.value = ''
			newSprintEnd.value = ''
			createSprintError.value = ''
		} else if (props.sprint) {
			// Default: new sprint starts day after the closing sprint ends
			const endDate = parseISO(props.sprint.endDate)
			const nextStart = addDays(endDate, 1)
			newSprintStart.value = format(nextStart, 'yyyy-MM-dd')
			newSprintEnd.value = format(addDays(nextStart, 13), 'yyyy-MM-dd') // 2 weeks default
			newSprintName.value = ''
		}
	},
)

const availableSprintsForCarryover = computed(() => {
	if (!props.sprint) return props.futureSprintsForSquad
	// Include sprints from the squad that aren't the current one and aren't closed
	const squad = config.value.squads.find(s => s.id === props.sprint!.squadId)
	if (!squad) return props.futureSprintsForSquad
	return squad.sprints.filter(sp => sp.id !== props.sprint!.id && !sp.closedAt)
})

const handleCreateSprint = () => {
	createSprintError.value = ''
	if (!newSprintName.value.trim()) { createSprintError.value = 'Informe o nome da sprint.'; return }
	if (!newSprintStart.value) { createSprintError.value = 'Informe a data de início.'; return }
	if (!newSprintEnd.value) { createSprintError.value = 'Informe a data de término.'; return }
	if (newSprintEnd.value <= newSprintStart.value) { createSprintError.value = 'Término deve ser após o início.'; return }
	if (!props.sprint) return

	const newSprint = addSprintToSquad(props.sprint.squadId, newSprintName.value.trim(), newSprintStart.value, newSprintEnd.value)
	if (newSprint) {
		// Auto-select the new sprint for all carry-over tasks without a target
		Object.keys(decisions.value).forEach(id => {
			if (decisions.value[id].action === 'carryover' && !decisions.value[id].targetSprintId) {
				decisions.value[id].targetSprintId = newSprint.id
			}
		})
	}

	showCreateSprint.value = false
	newSprintName.value = ''
}

type Action = 'completed' | 'carryover' | 'cancelled'

const decisions = ref<Record<string, { action: Action; targetSprintId: string }>>({})

watch(
	() => props.open,
	open => {
		if (!open || !props.sprint) return
		const init: typeof decisions.value = {}
		props.tasks.forEach(t => {
			init[t.id] = {
				action: t.status === 'completed' ? 'completed' : 'carryover',
				targetSprintId: props.futureSprintsForSquad[0]?.id ?? '',
			}
		})
		decisions.value = init
	},
	{ immediate: true },
)

const summary = computed(() => {
	const vals = Object.values(decisions.value)
	return {
		completed: vals.filter(d => d.action === 'completed').length,
		carryover: vals.filter(d => d.action === 'carryover').length,
		cancelled: vals.filter(d => d.action === 'cancelled').length,
	}
})

const hasCarryoverWithoutTarget = computed(() =>
	Object.values(decisions.value).some(d => d.action === 'carryover' && !d.targetSprintId),
)

const fmtDate = (d: string) => {
	try { return format(parseISO(d), 'dd/MM', { locale: ptBR }) } catch { return d }
}

const statusLabel = (task: Task) => {
	if (task.status === 'completed') return { text: 'Concluída', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' }
	if (task.status === 'active') return { text: 'Em andamento', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' }
	return { text: 'A fazer', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' }
}

const actionOptions: { value: Action; label: string; icon: string; cls: string }[] = [
	{
		value: 'completed',
		label: 'Concluída',
		icon: 'M5 13l4 4L19 7',
		cls: 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300',
	},
	{
		value: 'carryover',
		label: 'Carry-over',
		icon: 'M17 8l4 4m0 0l-4 4m4-4H3',
		cls: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
	},
	{
		value: 'cancelled',
		label: 'Descontinuada',
		icon: 'M6 18L18 6M6 6l12 12',
		cls: 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300',
	},
]

const handleConfirm = () => {
	if (!props.sprint) return
	const result: SprintCloseDecision[] = Object.entries(decisions.value).map(([taskId, d]) => ({
		taskId,
		action: d.action,
		targetSprintId: d.action === 'carryover' ? d.targetSprintId : undefined,
	}))
	emit('confirm', result)
}

const setAllTo = (action: Action) => {
	Object.keys(decisions.value).forEach(id => {
		decisions.value[id].action = action
	})
}
</script>

<template>
	<Teleport to="body">
		<Transition name="sprint-close-fade">
			<div v-if="open && sprint" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
				<!-- Backdrop -->
				<div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('cancel')"></div>

				<!-- Modal -->
				<div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">

					<!-- Header -->
					<div class="flex-shrink-0 px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl">
						<div class="flex items-start justify-between gap-4">
							<div>
								<div class="flex items-center gap-2 mb-1">
									<span class="text-2xl">🏁</span>
									<h2 class="text-xl font-bold text-white">Encerrar Sprint</h2>
								</div>
								<p class="text-indigo-200 text-sm font-medium">{{ sprint.name }}</p>
								<p class="text-indigo-300 text-xs mt-0.5">
									{{ fmtDate(sprint.startDate) }} → {{ fmtDate(sprint.endDate) }}
									<span v-if="sprint.squadName" class="ml-2 opacity-75">· {{ sprint.squadName }}</span>
								</p>
							</div>
							<button @click="emit('cancel')" class="text-white/60 hover:text-white transition-colors mt-0.5">
								<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>

					<!-- Quick actions -->
					<div class="flex-shrink-0 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 flex-wrap">
						<span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mr-1">Aplicar a todas:</span>
						<button
							v-for="opt in actionOptions" :key="opt.value"
							@click="setAllTo(opt.value)"
							class="px-3 py-1 text-xs font-bold rounded-full border transition-all hover:opacity-80"
							:class="opt.cls"
						>
							{{ opt.label }}
						</button>
					</div>

					<!-- Task list -->
					<div class="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-3">
						<div v-if="tasks.length === 0" class="text-center py-8 text-slate-400 text-sm">
							Nenhuma tarefa nesta sprint.
						</div>

						<div
							v-for="task in tasks" :key="task.id"
							class="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800 shadow-sm"
						>
							<!-- Task info -->
							<div class="flex items-start justify-between gap-3 mb-3">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2 flex-wrap mb-1">
										<span v-if="task.usId" class="text-[10px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
											{{ task.usId }}
										</span>
										<span class="text-[10px] px-1.5 py-0.5 rounded font-bold" :class="statusLabel(task).cls">
											{{ statusLabel(task).text }}
										</span>
									</div>
									<p class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{{ task.name }}</p>
									<p v-if="task.responsible" class="text-xs text-slate-400 mt-0.5">{{ task.responsible }}</p>
								</div>
								<div class="flex-shrink-0 text-right text-xs text-slate-400">
									<div>{{ task.duration }}d</div>
									<div v-if="task.effort">{{ task.effort }}h</div>
								</div>
							</div>

							<!-- Action selector -->
							<div class="flex flex-wrap gap-2">
								<button
									v-for="opt in actionOptions" :key="opt.value"
									@click="decisions[task.id].action = opt.value"
									class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all"
									:class="decisions[task.id]?.action === opt.value
										? opt.cls + ' shadow-sm scale-[1.02]'
										: 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-slate-300'"
								>
									<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" :d="opt.icon" />
									</svg>
									{{ opt.label }}
								</button>
							</div>

							<!-- Carry-over sprint selector -->
							<Transition name="fade">
								<div v-if="decisions[task.id]?.action === 'carryover'" class="mt-3 space-y-2">
									<div class="flex items-center gap-2">
										<svg class="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
										</svg>
										<label class="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Mover para:</label>
										<select
											v-model="decisions[task.id].targetSprintId"
											class="flex-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 focus:ring-1 focus:ring-blue-400 outline-none dark:[color-scheme:dark]"
										>
											<option value="">— Selecionar sprint —</option>
											<option v-for="sp in availableSprintsForCarryover" :key="sp.id" :value="sp.id">
												{{ sp.name }} ({{ fmtDate(sp.startDate) }} → {{ fmtDate(sp.endDate) }})
											</option>
										</select>
										<span v-if="!decisions[task.id].targetSprintId" class="text-[10px] text-red-500 font-bold whitespace-nowrap">Selecione</span>
									</div>
								</div>
							</Transition>
						</div>
					</div>

					<!-- Create new sprint inline -->
					<div class="flex-shrink-0 px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
						<button
							v-if="!showCreateSprint"
							@click="showCreateSprint = true"
							class="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
						>
							<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
							</svg>
							Criar nova sprint para receber as tarefas
						</button>

						<Transition name="fade">
							<div v-if="showCreateSprint" class="space-y-3">
								<div class="flex items-center justify-between">
									<p class="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
										<svg class="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
										</svg>
										Nova Sprint
									</p>
									<button @click="showCreateSprint = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
								<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
									<input
										v-model="newSprintName"
										type="text"
										placeholder="Nome da sprint"
										class="sm:col-span-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-400 outline-none placeholder-slate-400"
									/>
									<input
										v-model="newSprintStart"
										type="date"
										class="text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-400 outline-none dark:[color-scheme:dark]"
									/>
									<input
										v-model="newSprintEnd"
										type="date"
										class="text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-400 outline-none dark:[color-scheme:dark]"
									/>
								</div>
								<p v-if="createSprintError" class="text-xs text-red-500 font-medium">{{ createSprintError }}</p>
								<button
									@click="handleCreateSprint"
									class="w-full py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
								>
									Criar Sprint e selecionar para carry-over
								</button>
							</div>
						</Transition>
					</div>

				<!-- Footer -->
					<div class="flex-shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
						<!-- Summary chips -->
						<div class="flex flex-wrap gap-2 mb-4">
							<div class="flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
								<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
								{{ summary.completed }} concluída{{ summary.completed !== 1 ? 's' : '' }}
							</div>
							<div class="flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
								<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
								{{ summary.carryover }} carry-over
							</div>
							<div class="flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-bold">
								<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
								{{ summary.cancelled }} descontinuada{{ summary.cancelled !== 1 ? 's' : '' }}
							</div>
						</div>

						<div class="flex items-center justify-between gap-3">
							<p class="text-xs text-slate-400 dark:text-slate-500 flex-1">
								Após encerrar, as tarefas ficam visíveis no cronograma em modo consulta (somente leitura).
							</p>
							<div class="flex gap-2 flex-shrink-0">
								<button @click="emit('cancel')" class="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
									Cancelar
								</button>
								<button
									@click="handleConfirm"
									:disabled="hasCarryoverWithoutTarget"
									class="px-5 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-sm"
									:class="hasCarryoverWithoutTarget
										? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed'
										: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'"
								>
									Encerrar Sprint
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.sprint-close-fade-enter-active,
.sprint-close-fade-leave-active {
	transition: opacity 0.2s ease;
}
.sprint-close-fade-enter-from,
.sprint-close-fade-leave-to {
	opacity: 0;
}
.sprint-close-fade-enter-active .relative,
.sprint-close-fade-leave-active .relative {
	transition: transform 0.2s ease;
}
.sprint-close-fade-enter-from .relative {
	transform: scale(0.96) translateY(8px);
}
.sprint-close-fade-leave-to .relative {
	transform: scale(0.96) translateY(8px);
}
.fade-enter-active, .fade-leave-active { transition: all 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
