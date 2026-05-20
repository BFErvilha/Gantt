<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useGantt, type Task, type TaskStatus } from '@/composables/useGantt'
import ConfirmationModal from './ConfirmationModal.vue'

const { tasks, addTask, editingTask, updateTask, cancelEditing, removeTask, setTaskStatus, toggleTaskCompletion, config, isTaskModalOpen, allSprints, duplicateTask, hasCyclicDependency, isTaskLocked, isSprintClosed } = useGantt()

// Read-only lock state for tasks in closed sprints
const isLockedTask = computed(() => !!editingTask.value && isTaskLocked(editingTask.value))
const isLockedOverride = ref(false)
const isEffectivelyReadOnly = computed(() => isLockedTask.value && !isLockedOverride.value)

const lockedSprintName = computed(() => {
	if (!editingTask.value?.sprintId) return ''
	const sprint = allSprints.value.find(s => s.id === editingTask.value!.sprintId)
	return sprint?.name ?? ''
})

watch(editingTask, () => {
	isLockedOverride.value = false
})

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const defaultFormState = {
	name: '',
	usId: '',
	customId: '',
	duration: 1,
	dependencyId: '',
	color: '#3b82f6',
	type: 'frontend' as Task['type'],
	responsible: '',
	effort: 0,
	status: 'new' as TaskStatus,
	sprintId: '',
	squadId: '',
	isMilestone: false,
	usType: 'item' as 'goal' | 'item',
	classification: 0,
}

const formState = ref({ ...defaultFormState })

const isFlowMode = ref(false)
const flowState = ref({
	featureName: '',
	usId: '',
	sprintId: '',
	squadId: '',
	isFullstack: false,
	usType: 'item' as 'goal' | 'item',
	classification: 0,
	backend: { responsible: '', effort: 0, enabled: true },
	frontend: { responsible: '', effort: 0, enabled: true },
	qa: { responsible: '', effort: 0, enabled: true },
})

const isDeleteModalOpen = ref(false)
const isCompleteModalOpen = ref(false)

const DEPT_HINT_KEY = 'gantt-ficator-dep-hint-seen'
const showDependencyHint = ref(false)
const dependencyHintDismissed = ref(false)

onMounted(() => {
	dependencyHintDismissed.value = !!localStorage.getItem(DEPT_HINT_KEY)
})

const onDependencyFocus = () => {
	if (!dependencyHintDismissed.value) showDependencyHint.value = true
}
const dismissDependencyHint = (permanent = false) => {
	showDependencyHint.value = false
	if (permanent) {
		dependencyHintDismissed.value = true
		localStorage.setItem(DEPT_HINT_KEY, 'true')
	}
}

const sectionRelOpen = ref(false)
const sectionVisOpen = ref(false)

watch(editingTask, newTask => {
	if (newTask) {
		isFlowMode.value = false

		let squadId = ''
		if (newTask.sprintId) {
			const sprint = allSprints.value.find(s => s.id === newTask.sprintId)
			if (sprint && sprint.squadId) squadId = sprint.squadId
		}

		formState.value = {
			name: newTask.name,
			usId: newTask.usId || '',
			customId: newTask.customId || '',
			duration: newTask.duration,
			dependencyId: newTask.dependencyId || '',
			color: newTask.color,
			type: newTask.type || 'other',
			responsible: newTask.responsible || '',
			effort: newTask.effort || 0,
			status: (newTask.status as TaskStatus) || 'new',
			sprintId: newTask.sprintId || '',
			squadId: squadId,
			isMilestone: newTask.isMilestone || false,
			usType: newTask.usType || 'item',
			classification: newTask.classification || 0,
		}
	} else {
		resetForm()
	}
})

const availableSprintsSimple = computed(() => {
	if (!formState.value.squadId) return allSprints.value
	return allSprints.value.filter(s => s.squadId === formState.value.squadId)
})

const availableSprintsFlow = computed(() => {
	if (!flowState.value.squadId) return allSprints.value
	return allSprints.value.filter(s => s.squadId === flowState.value.squadId)
})

const flowSprintSquad = computed(() => {
	if (!flowState.value.sprintId) return null
	const sprint = allSprints.value.find(s => s.id === flowState.value.sprintId)
	if (sprint && sprint.squadId) {
		return config.value.squads.find(s => s.id === sprint.squadId)
	}
	return null
})

const selectedSprintSquad = computed(() => {
	if (!formState.value.sprintId) return null
	const sprint = allSprints.value.find(s => s.id === formState.value.sprintId)
	if (sprint && sprint.squadId) {
		return config.value.squads.find(s => s.id === sprint.squadId)
	}
	return null
})

const currentFormId = computed(() => {
	if (!editingTask.value && isFlowMode.value) return 'flow-form'
	return 'simple-form'
})

const dependencyCycleWarning = computed(() => {
	if (!formState.value.dependencyId || !editingTask.value) return null
	if (hasCyclicDependency(editingTask.value.id, formState.value.dependencyId)) {
		return 'Esta dependência cria um ciclo e será ignorada no cálculo de datas.'
	}
	return null
})

const handleDuplicate = () => {
	if (editingTask.value) {
		duplicateTask(editingTask.value.id)
		cancelEditing()
	}
}

watch(
	() => formState.value.sprintId,
	newSprintId => {
		if (newSprintId) {
			const sprint = allSprints.value.find(s => s.id === newSprintId)
			if (sprint && sprint.squadId) formState.value.squadId = sprint.squadId
		}
	},
)
watch(
	() => flowState.value.sprintId,
	newSprintId => {
		if (newSprintId) {
			const sprint = allSprints.value.find(s => s.id === newSprintId)
			if (sprint && sprint.squadId) flowState.value.squadId = sprint.squadId
		}
	},
)

const getMembersBySector = (sectorType: string, squadId?: string) => {
	return config.value.teamMembers.filter(member => {
		if (squadId && !member.squadIds.includes(squadId)) return false

		const s = (member.sector || '').toLowerCase()
		if (s.includes('fullstack') || s.includes('full stack')) return true
		if (sectorType === 'backend' && (s.includes('back') || s.includes('devops'))) return true
		if (sectorType === 'frontend' && (s.includes('front') || s.includes('design'))) return true
		if (sectorType === 'qualidade' && (s.includes('qa') || s.includes('qualidade'))) return true
		if (sectorType === 'other') return true
		return false
	})
}

const filteredMembersSimple = computed(() => {
	let members = config.value.teamMembers
	if (formState.value.squadId) {
		members = members.filter(m => m.squadIds.includes(formState.value.squadId))
	}
	if (!formState.value.type || formState.value.type === 'other') {
		return members
	}
	return getMembersBySector(formState.value.type, formState.value.squadId)
})

watch(
	() => formState.value.type,
	() => {
		const currentResp = formState.value.responsible
		if (currentResp && filteredMembersSimple.value.length > 0) {
			const isValid = filteredMembersSimple.value.some(m => m.name === currentResp)
			if (!isValid) formState.value.responsible = ''
		}
	},
)

const getCapacity = (respName: string) => {
	if (!respName) return 8
	const member = config.value.teamMembers.find(m => m.name === respName)
	return member ? member.capacity : 8
}

watch([() => formState.value.effort, () => formState.value.responsible], ([newEffort]) => {
	if (newEffort && newEffort > 0 && !formState.value.isMilestone) {
		const cap = getCapacity(formState.value.responsible)
		formState.value.duration = Math.max(1, Math.ceil(newEffort / cap))
	}
})

const capacityAlertSimple = computed(() => {
	if (formState.value.isMilestone) return null
	const hours = formState.value.effort
	const days = formState.value.duration
	const cap = getCapacity(formState.value.responsible)
	if (hours > days * cap) return `Atenção: ${hours}h excede a capacidade de ${days} dia(s).`
	return null
})

const resetForm = () => {
	formState.value = { ...defaultFormState, color: colors[Math.floor(Math.random() * colors.length)] }
	flowState.value = {
		featureName: '',
		usId: '',
		sprintId: '',
		squadId: '',
		isFullstack: false,
		usType: 'item',
		classification: 0,
		backend: { responsible: '', effort: 0, enabled: true },
		frontend: { responsible: '', effort: 0, enabled: true },
		qa: { responsible: '', effort: 0, enabled: true },
	}
	isDeleteModalOpen.value = false
	isCompleteModalOpen.value = false
}

const submitSimple = () => {
	if (!formState.value.name) return

	if (editingTask.value) {
		updateTask({
			...editingTask.value,
			...formState.value,
			dependencyId: formState.value.dependencyId || null,
			sprintId: formState.value.sprintId || undefined,
			isNotPlanned: !formState.value.sprintId,
		})
	} else {
		addTask({
			name: formState.value.name,
			usId: formState.value.usId,
			customId: formState.value.customId,
			duration: formState.value.isMilestone ? 0 : formState.value.duration,
			dependencyId: formState.value.dependencyId || null,
			color: formState.value.color,
			type: formState.value.type,
			responsible: formState.value.responsible,
			effort: formState.value.effort,
			status: formState.value.status,
			sprintId: formState.value.sprintId || undefined,
			isMilestone: formState.value.isMilestone,
			usType: formState.value.usType,
			classification: formState.value.classification,
		})
	}
	cancelEditing()
}

const submitFlow = () => {
	if (!flowState.value.featureName) return

	const backId = crypto.randomUUID()
	const frontId = crypto.randomUUID()
	const qaId = crypto.randomUUID()

	const commonData = {
		usId: flowState.value.usId,
		sprintId: flowState.value.sprintId || undefined,
		isMilestone: false,
		usType: flowState.value.usType,
		classification: flowState.value.classification,
	}

	if (flowState.value.backend.enabled) {
		const effort = flowState.value.backend.effort
		const cap = getCapacity(flowState.value.backend.responsible)
		const taskName = flowState.value.isFullstack ? `${flowState.value.featureName} (Fullstack)` : `${flowState.value.featureName} (Back)`

		addTask({
			id: backId,
			name: taskName,
			type: 'backend',
			color: '#10b981',
			responsible: flowState.value.backend.responsible,
			effort: effort,
			duration: Math.max(1, Math.ceil(effort / cap)),
			dependencyId: null,
			...commonData,
		})
	}

	if (!flowState.value.isFullstack && flowState.value.frontend.enabled) {
		const effort = flowState.value.frontend.effort
		const cap = getCapacity(flowState.value.frontend.responsible)
		const depId = flowState.value.backend.enabled ? backId : null

		addTask({
			id: frontId,
			name: `${flowState.value.featureName} (Front)`,
			type: 'frontend',
			color: '#3b82f6',
			responsible: flowState.value.frontend.responsible,
			effort: effort,
			duration: Math.max(1, Math.ceil(effort / cap)),
			dependencyId: depId,
			...commonData,
		})
	}

	if (flowState.value.qa.enabled) {
		const effort = flowState.value.qa.effort
		const cap = getCapacity(flowState.value.qa.responsible)
		let depId = null
		if (!flowState.value.isFullstack && flowState.value.frontend.enabled) {
			depId = frontId
		} else if (flowState.value.backend.enabled) {
			depId = backId
		}

		addTask({
			id: qaId,
			name: `${flowState.value.featureName} (QA)`,
			type: 'qualidade',
			color: '#8b5cf6',
			responsible: flowState.value.qa.responsible,
			effort: effort,
			duration: Math.max(1, Math.ceil(effort / cap)),
			dependencyId: depId,
			...commonData,
		})
	}

	cancelEditing()
}

const handleCancel = () => {
	cancelEditing()
	resetForm()
}

const requestDelete = () => {
	if (editingTask.value) isDeleteModalOpen.value = true
}
const confirmDelete = () => {
	if (editingTask.value) {
		removeTask(editingTask.value.id)
		isDeleteModalOpen.value = false
	}
}

const requestCompletion = () => {
	if (editingTask.value) isCompleteModalOpen.value = true
}
const confirmCompletion = () => {
	if (editingTask.value) {
		const next: TaskStatus = editingTask.value.status === 'completed' ? 'new' : 'completed'
		setTaskStatus(editingTask.value.id, next)
		isCompleteModalOpen.value = false
		cancelEditing()
	}
}
</script>

<template>
	<Transition name="slide">
		<div v-if="isTaskModalOpen" class="fixed inset-0 z-50 flex justify-end overflow-hidden">
			<div class="absolute inset-0 bg-black/30 transition-opacity" @click="handleCancel"></div>

			<div class="relative w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transition-all duration-300 ease-out transform">
				<div class="flex-shrink-0 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
					<h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
						{{ editingTask ? '✏️ Editar Tarefa' : '✨ Nova Tarefa' }}
					</h3>
					<button @click="handleCancel" class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
						<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
					</button>
				</div>

				<!-- Locked sprint banner -->
				<Transition name="fade">
					<div v-if="isLockedTask" class="flex-shrink-0 px-6 py-3 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
						<div class="flex items-center gap-2 min-w-0">
							<svg class="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
							</svg>
							<p class="text-xs text-amber-800 dark:text-amber-300 font-medium truncate">
								Sprint encerrada<span v-if="lockedSprintName"> — <span class="font-bold">{{ lockedSprintName }}</span></span>. Somente leitura.
							</p>
						</div>
						<button
							v-if="!isLockedOverride"
							@click="isLockedOverride = true"
							class="flex-shrink-0 text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline whitespace-nowrap transition-colors"
						>
							Editar mesmo assim
						</button>
						<span v-else class="flex-shrink-0 text-xs font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
							Modo edição ativo
						</span>
					</div>
				</Transition>

				<div v-if="!editingTask" class="px-6 pt-4 bg-white dark:bg-slate-900 flex-shrink-0">
					<div class="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
						<button @click="isFlowMode = false" class="flex-1 py-2 text-sm font-bold rounded-md transition-all shadow-sm" :class="!isFlowMode ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'">
							Tarefa Simples
						</button>
						<button
							@click="isFlowMode = true"
							class="flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2"
							:class="isFlowMode ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'"
						>
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
							</svg>
							Fluxo Completo
						</button>
					</div>
				</div>

				<div class="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white dark:bg-slate-900">
					<form v-if="isFlowMode && !editingTask" id="flow-form" @submit.prevent="submitFlow" class="space-y-6">
						<div class="bg-purple-50 dark:bg-purple-900/10 p-5 rounded-xl border border-purple-100 dark:border-purple-800/30">
							<h4 class="text-xs font-bold uppercase text-purple-800 dark:text-purple-300 mb-4 flex items-center gap-2">Configuração do Fluxo</h4>

							<div class="grid grid-cols-2 gap-5">
								<div class="col-span-2">
									<label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Squad</label>
									<select v-model="flowState.squadId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 p-2.5 text-sm dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 shadow-sm font-medium">
										<option value="">-- Selecione a Squad --</option>
										<option v-for="s in config.squads" :key="s.id" :value="s.id">{{ s.name }}</option>
									</select>
								</div>

								<div class="col-span-2">
									<label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Nome da Feature (Base)</label>
									<input
										v-model="flowState.featureName"
										type="text"
										placeholder="Ex: Criação de Login"
										class="w-full rounded-lg border-slate-300 dark:border-slate-600 p-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-800 dark:text-white transition-all shadow-sm placeholder-slate-400"
										required
										autofocus
									/>
								</div>

								<div>
									<label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Sprint</label>
									<select v-model="flowState.sprintId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 p-2.5 text-sm dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 shadow-sm font-medium" :disabled="!flowState.squadId">
										<option value="">-- Não Planejado --</option>
										<option v-for="s in availableSprintsFlow" :key="s.id" :value="s.id">{{ s.name }}</option>
									</select>
									<div v-if="flowSprintSquad" class="text-[10px] text-indigo-500 mt-1 font-medium">Squad: {{ flowSprintSquad.name }}</div>
								</div>

								<div>
									<label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">US ID</label>
									<input v-model="flowState.usId" type="text" placeholder="Ex: US-200" class="w-full rounded-lg border-slate-300 dark:border-slate-600 p-2.5 text-sm dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 shadow-sm font-medium" />
								</div>

								<div class="col-span-2 bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-4">
									<div>
										<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Prioridade</label>
										<div class="flex gap-2">
											<label class="flex-1 cursor-pointer relative">
												<input type="radio" v-model="flowState.usType" value="goal" class="peer sr-only" />
												<div
													class="text-center py-2 px-2 rounded-md border border-slate-200 dark:border-slate-600 peer-checked:bg-amber-100 peer-checked:text-amber-800 peer-checked:border-amber-300 dark:peer-checked:bg-amber-900/40 dark:peer-checked:text-amber-200 dark:text-slate-300 transition-all text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700"
												>
													🏆 Meta
												</div>
											</label>
											<label class="flex-1 cursor-pointer relative">
												<input type="radio" v-model="flowState.usType" value="item" class="peer sr-only" />
												<div
													class="text-center py-2 px-2 rounded-md border border-slate-200 dark:border-slate-600 peer-checked:bg-slate-200 peer-checked:text-slate-800 dark:peer-checked:bg-slate-600 dark:peer-checked:text-white dark:text-slate-300 transition-all text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700"
												>
													📝 Item
												</div>
											</label>
										</div>
									</div>
									<div>
										<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Classificação</label>
										<input v-model.number="flowState.classification" type="number" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-sm dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-purple-500 shadow-sm font-medium" placeholder="0" />
									</div>
								</div>

								<div class="col-span-2 flex items-center gap-3 mt-1 p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-purple-900/50 shadow-sm cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
									<input type="checkbox" id="isFullstack" v-model="flowState.isFullstack" class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300" />
									<label for="isFullstack" class="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">Feature Fullstack (Remove etapa de Frontend)</label>
								</div>
							</div>
						</div>

						<div class="space-y-4">
							<div class="flex gap-3 items-start p-3 rounded-lg border transition-all shadow-sm" :class="flowState.backend.enabled ? 'border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10' : 'border-slate-100 bg-slate-50 opacity-60'">
								<div class="pt-2"><input type="checkbox" v-model="flowState.backend.enabled" class="rounded text-green-600 focus:ring-green-500 w-4 h-4" /></div>
								<div class="flex-1 grid grid-cols-2 gap-3">
									<div class="col-span-2 text-xs font-bold text-green-800 dark:text-green-400 uppercase tracking-wide">1. {{ flowState.isFullstack ? 'Fullstack' : 'Backend' }}</div>
									<div>
										<select v-model="flowState.backend.responsible" :disabled="!flowState.backend.enabled || !flowState.squadId" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-xs dark:bg-slate-800 dark:text-white font-medium">
											<option value="">Responsável</option>
											<option v-for="m in getMembersBySector('backend', flowState.squadId)" :key="m.name" :value="m.name">{{ m.name }}</option>
										</select>
									</div>
									<div><input v-model.number="flowState.backend.effort" type="number" placeholder="Horas" :disabled="!flowState.backend.enabled" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-xs dark:bg-slate-800 dark:text-white font-medium" /></div>
								</div>
							</div>

							<div v-if="!flowState.isFullstack" class="flex gap-3 items-start p-3 rounded-lg border transition-all shadow-sm" :class="flowState.frontend.enabled ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10' : 'border-slate-100 bg-slate-50 opacity-60'">
								<div class="pt-2"><input type="checkbox" v-model="flowState.frontend.enabled" class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" /></div>
								<div class="flex-1 grid grid-cols-2 gap-3">
									<div class="col-span-2 text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wide">2. Frontend</div>
									<div>
										<select v-model="flowState.frontend.responsible" :disabled="!flowState.frontend.enabled || !flowState.squadId" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-xs dark:bg-slate-800 dark:text-white font-medium">
											<option value="">Responsável</option>
											<option v-for="m in getMembersBySector('frontend', flowState.squadId)" :key="m.name" :value="m.name">{{ m.name }}</option>
										</select>
									</div>
									<div><input v-model.number="flowState.frontend.effort" type="number" placeholder="Horas" :disabled="!flowState.frontend.enabled" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-xs dark:bg-slate-800 dark:text-white font-medium" /></div>
								</div>
							</div>

							<div class="flex gap-3 items-start p-3 rounded-lg border transition-all shadow-sm" :class="flowState.qa.enabled ? 'border-purple-200 bg-purple-50/50 dark:border-purple-900/30 dark:bg-purple-900/10' : 'border-slate-100 bg-slate-50 opacity-60'">
								<div class="pt-2"><input type="checkbox" v-model="flowState.qa.enabled" class="rounded text-purple-600 focus:ring-purple-500 w-4 h-4" /></div>
								<div class="flex-1 grid grid-cols-2 gap-3">
									<div class="col-span-2 text-xs font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wide">{{ flowState.isFullstack ? '2.' : '3.' }} QA / Teste</div>
									<div>
										<select v-model="flowState.qa.responsible" :disabled="!flowState.qa.enabled || !flowState.squadId" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-xs dark:bg-slate-800 dark:text-white font-medium">
											<option value="">Responsável</option>
											<option v-for="m in getMembersBySector('qualidade', flowState.squadId)" :key="m.name" :value="m.name">{{ m.name }}</option>
										</select>
									</div>
									<div><input v-model.number="flowState.qa.effort" type="number" placeholder="Horas" :disabled="!flowState.qa.enabled" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-xs dark:bg-slate-800 dark:text-white font-medium" /></div>
								</div>
							</div>
						</div>
					</form>

					<form v-else id="simple-form" @submit.prevent="submitSimple" class="space-y-5 animate-fade-in" :class="{ 'pointer-events-none opacity-60 select-none': isEffectivelyReadOnly }">

						<!-- ── CAMADA 1: ESSENCIAL ───────────────────────────── -->
						<div>
							<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Squad</label>
							<select v-model="formState.squadId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
								<option value="">-- Selecione a Squad --</option>
								<option v-for="s in config.squads" :key="s.id" :value="s.id">{{ s.name }}</option>
							</select>
						</div>

						<div>
							<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Nome da Tarefa *</label>
							<input
								v-model="formState.name"
								type="text"
								placeholder="Ex: Desenvolver API..."
								class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-colors placeholder-slate-400"
								required
								autofocus
							/>
						</div>

						<div class="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
							<input type="checkbox" id="isMilestone" v-model="formState.isMilestone" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-200" />
							<label for="isMilestone" class="text-sm font-semibold text-indigo-800 dark:text-indigo-200 cursor-pointer select-none">Marco (Milestone)</label>
						</div>

						<div v-if="!formState.isMilestone" class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Tipo</label>
								<select v-model="formState.type" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium">
									<option value="frontend">Front-end</option>
									<option value="backend">Back-end</option>
									<option value="qualidade">Qualidade</option>
									<option value="other">Outro</option>
								</select>
							</div>
							<div>
								<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Responsável</label>
								<select v-model="formState.responsible" :disabled="!formState.squadId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium">
									<option value="">-- Selecione --</option>
									<option v-for="member in filteredMembersSimple" :key="member.name" :value="member.name">{{ member.name }}</option>
								</select>
								<div v-if="!formState.squadId" class="text-[10px] text-red-400 mt-1">Selecione uma Squad primeiro</div>
								<div v-else-if="formState.type && formState.type !== 'other'" class="text-[10px] text-slate-400 mt-1">Filtrado por tipo</div>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Sprint</label>
								<select v-model="formState.sprintId" :disabled="!formState.squadId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium">
									<option value="">-- Não Planejado --</option>
									<option v-for="s in availableSprintsSimple" :key="s.id" :value="s.id">{{ s.name }}</option>
								</select>
							</div>
							<div v-if="!formState.isMilestone">
								<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Esforço</label>
								<div class="relative">
									<input v-model.number="formState.effort" type="number" min="0" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm pr-12 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium" />
									<span class="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold">HRS</span>
								</div>
							</div>
						</div>

						<div v-if="!formState.isMilestone">
							<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Cor da Barra</label>
							<div class="flex gap-2">
								<button type="button" v-for="c in colors" :key="c" @click="formState.color = c"
									class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shadow-sm flex items-center justify-center"
									:class="formState.color === c ? 'border-slate-800 dark:border-white scale-110 ring-2 ring-offset-1 ring-slate-300' : 'border-transparent'"
									:style="{ backgroundColor: c }"
								>
									<svg v-if="formState.color === c" class="w-3.5 h-3.5 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
								</button>
							</div>
						</div>

						<div v-if="capacityAlertSimple" class="text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2">
							<svg class="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
							<span>{{ capacityAlertSimple }}</span>
						</div>

						<!-- ── CAMADA 2: RELACIONAL ──────────────────────────── -->
						<div class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
							<button
								type="button"
								@click="sectionRelOpen = !sectionRelOpen"
								class="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							>
								<span class="flex items-center gap-2">
									<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
									Dependências &amp; Contexto
									<span v-if="formState.dependencyId || formState.usId" class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
								</span>
								<svg class="w-4 h-4 transition-transform duration-200" :class="sectionRelOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
							</button>

							<div v-show="sectionRelOpen" class="px-4 py-4 space-y-4">
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">ID da US</label>
										<input v-model="formState.usId" type="text" placeholder="Ex: US-104" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium" />
									</div>
									<div>
										<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">ID da Tarefa</label>
										<input v-model="formState.customId" type="text" placeholder="Ex: T-01" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium" />
									</div>
								</div>

								<!-- Dependency field com JIT hint -->
								<div class="relative">
									<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">
										{{ formState.isMilestone ? 'Dependência (define data do marco)' : 'Tarefa predecessora' }}
									</label>
									<select
										v-model="formState.dependencyId"
										@focus="onDependencyFocus"
										@blur="dismissDependencyHint(false)"
										class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
									>
										<option value="">{{ formState.isMilestone ? 'Nenhuma (Início do Projeto)' : 'Nenhuma' }}</option>
										<option v-for="t in tasks" :key="t.id" :value="t.id" v-show="!editingTask || t.id !== editingTask.id">{{ t.name }}</option>
									</select>

									<!-- JIT hint popover -->
									<Transition name="hint-fade">
										<div v-if="showDependencyHint" class="absolute left-0 right-0 top-full mt-1 z-20 bg-indigo-950 text-indigo-100 text-xs rounded-lg p-3 shadow-xl border border-indigo-800 flex items-start gap-2">
											<svg class="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
											<span class="flex-1 leading-relaxed">Quando a predecessora atrasar, esta tarefa avança automaticamente — <strong>efeito cascata</strong>.</span>
											<button type="button" @mousedown.prevent="dismissDependencyHint(true)" class="text-indigo-400 hover:text-white transition-colors ml-1 flex-shrink-0 text-[10px] underline">não mostrar</button>
										</div>
									</Transition>
								</div>

								<div v-if="dependencyCycleWarning" class="text-xs font-medium text-orange-800 dark:text-orange-200 bg-orange-50 dark:bg-orange-900/40 p-3 rounded-lg border border-orange-200 dark:border-orange-800 flex items-start gap-2">
									<svg class="h-4 w-4 flex-shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
									<span>{{ dependencyCycleWarning }}</span>
								</div>

								<div>
									<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Status</label>
									<div class="flex gap-1.5">
										<button type="button" @click="formState.status = 'new'"
											class="flex-1 py-2 text-xs font-bold rounded-lg border transition-all"
											:class="formState.status === 'new' ? 'bg-slate-200 dark:bg-slate-600 border-slate-400 dark:border-slate-500 text-slate-800 dark:text-white' : 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'">
											Novo
										</button>
										<button type="button" @click="formState.status = 'active'"
											class="flex-1 py-2 text-xs font-bold rounded-lg border transition-all"
											:class="formState.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-200' : 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'">
											Ativo
										</button>
										<button type="button" @click="formState.status = 'completed'"
											class="flex-1 py-2 text-xs font-bold rounded-lg border transition-all"
											:class="formState.status === 'completed' ? 'bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600 text-green-800 dark:text-green-200' : 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'">
											Concluído
										</button>
									</div>
								</div>

								<div class="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
									<div>
										<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Prioridade</label>
										<div class="flex gap-1.5">
											<label class="flex-1 cursor-pointer">
												<input type="radio" v-model="formState.usType" value="goal" class="peer sr-only" />
												<div class="text-center py-2 px-1 rounded-lg border border-slate-200 dark:border-slate-600 peer-checked:bg-amber-100 peer-checked:text-amber-800 peer-checked:border-amber-300 dark:peer-checked:bg-amber-900/40 dark:peer-checked:text-amber-200 dark:text-slate-300 transition-all text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700">Meta</div>
											</label>
											<label class="flex-1 cursor-pointer">
												<input type="radio" v-model="formState.usType" value="item" class="peer sr-only" />
												<div class="text-center py-2 px-1 rounded-lg border border-slate-200 dark:border-slate-600 peer-checked:bg-slate-200 peer-checked:text-slate-800 dark:peer-checked:bg-slate-600 dark:peer-checked:text-white dark:text-slate-300 transition-all text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700">Item</div>
											</label>
										</div>
									</div>
									<div>
										<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Classificação</label>
										<input v-model.number="formState.classification" type="number" placeholder="0" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium" />
									</div>
								</div>
							</div>
						</div>
					</form>
				</div>

				<div class="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950 z-20 flex flex-col gap-3">
					<div class="flex gap-3">
						<button type="button" @click="handleCancel" class="px-5 py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm w-1/3">Cancelar</button>
						<button
							type="submit"
							:form="currentFormId"
							:disabled="isEffectivelyReadOnly"
							class="flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-colors shadow-lg"
							:class="isEffectivelyReadOnly
								? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
								: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none'"
						>
							{{ editingTask ? 'Salvar Alterações' : 'Criar Tarefa' }}
						</button>
					</div>

					<div v-if="editingTask" class="flex gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/50 mt-1">
						<button
							type="button"
							@click="requestDelete"
							class="flex-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900 rounded"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
							Excluir
						</button>

						<button
							type="button"
							@click="handleDuplicate"
							class="flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
							</svg>
							Duplicar
						</button>

						<button
							type="button"
							@click="requestCompletion"
							class="flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-transparent rounded"
							:class="
								editingTask.status === 'completed'
									? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700'
									: 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30'
							"
						>
							<svg v-if="editingTask.status !== 'completed'" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
							<svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{{ editingTask.status === 'completed' ? 'Reabrir' : 'Concluir' }}
						</button>
					</div>
				</div>
			</div>

			<ConfirmationModal :is-open="isDeleteModalOpen" title="Excluir Tarefa" :message="`Tem a certeza que deseja excluir a tarefa '${editingTask?.name}'?`" @confirm="confirmDelete" @cancel="isDeleteModalOpen = false" />
			<ConfirmationModal
				:is-open="isCompleteModalOpen"
				:title="editingTask?.status === 'completed' ? 'Reabrir Tarefa' : 'Concluir Tarefa'"
				:message="editingTask?.status === 'completed' ? `Deseja marcar '${editingTask?.name}' como novo novamente?` : `Confirmar a conclusão da tarefa '${editingTask?.name}'?`"
				@confirm="confirmCompletion"
				@cancel="isCompleteModalOpen = false"
			/>
		</div>
	</Transition>
</template>

<style scoped>
/* Animação Slide para a Drawer */
.slide-enter-active,
.slide-leave-active {
	transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
	transform: translateX(100%);
}

.hint-fade-enter-active,
.hint-fade-leave-active {
	transition: opacity 0.15s ease, transform 0.15s ease;
}
.hint-fade-enter-from,
.hint-fade-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

.custom-scrollbar::-webkit-scrollbar {
	width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background: #cbd5e1;
	border-radius: 3px;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
	background: #475569;
}
</style>
