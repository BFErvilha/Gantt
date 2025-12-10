<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useGantt, type Task } from '@/composables/useGantt'
import ConfirmationModal from './ConfirmationModal.vue'

const { tasks, addTask, editingTask, updateTask, cancelEditing, removeTask, toggleTaskCompletion, config, isTaskModalOpen } = useGantt()

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
	sprintId: '',
	isMilestone: false,
}

const formState = ref({ ...defaultFormState })

const isFlowMode = ref(false)
const flowState = ref({
	featureName: '',
	usId: '',
	sprintId: '',
	isFullstack: false,
	backend: { responsible: '', effort: 0, enabled: true },
	frontend: { responsible: '', effort: 0, enabled: true },
	qa: { responsible: '', effort: 0, enabled: true },
})

const isDeleteModalOpen = ref(false)
const isCompleteModalOpen = ref(false)

watch(editingTask, newTask => {
	if (newTask) {
		isFlowMode.value = false
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
			sprintId: newTask.sprintId || '',
			isMilestone: newTask.isMilestone || false,
		}
	} else {
		resetForm()
	}
})

const getMembersBySector = (sectorType: string) => {
	return config.value.teamMembers.filter(member => {
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
	if (!formState.value.type || formState.value.type === 'other') {
		return config.value.teamMembers
	}
	return getMembersBySector(formState.value.type)
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
		isFullstack: false,
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
			sprintId: formState.value.sprintId || undefined,
			isMilestone: formState.value.isMilestone,
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
		toggleTaskCompletion(editingTask.value.id)
		isCompleteModalOpen.value = false
		cancelEditing()
	}
}
</script>

<template>
	<div v-if="isTaskModalOpen" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
		<div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh] transition-colors duration-300">
			<div class="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
				<div class="flex justify-between items-center px-6 py-3" v-if="editingTask">
					<h3 class="text-lg font-bold text-slate-800 dark:text-slate-100">Editar Tarefa</h3>
					<button @click="handleCancel" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">&times;</button>
				</div>

				<div v-else class="flex items-center">
					<button
						@click="isFlowMode = false"
						class="flex-1 py-3 text-sm font-bold border-b-2 transition-colors"
						:class="!isFlowMode ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'"
					>
						Tarefa Simples
					</button>
					<button
						@click="isFlowMode = true"
						class="flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2"
						:class="isFlowMode ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'"
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
						Fluxo Completo
					</button>
					<button @click="handleCancel" class="absolute right-4 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">&times;</button>
				</div>
			</div>

			<div class="p-6 overflow-y-auto custom-scrollbar">
				<form v-if="isFlowMode && !editingTask" @submit.prevent="submitFlow" class="space-y-6">
					<div class="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg border border-purple-100 dark:border-purple-800/30">
						<h4 class="text-xs font-bold uppercase text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">Configuração do Fluxo</h4>
						<div class="grid grid-cols-2 gap-4">
							<div class="col-span-2">
								<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Nome da Feature (Base)</label>
								<input v-model="flowState.featureName" type="text" placeholder="Ex: Criação de Login" class="w-full rounded border-slate-300 dark:border-slate-600 p-2 text-sm focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white" required autofocus />
							</div>
							<div>
								<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Sprint</label>
								<select v-model="flowState.sprintId" class="w-full rounded border-slate-300 dark:border-slate-600 p-2 text-sm dark:bg-slate-700 dark:text-white">
									<option value="">-- Não Planejado --</option>
									<option v-for="s in config.sprints" :key="s.id" :value="s.id">{{ s.name }}</option>
								</select>
							</div>
							<div>
								<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">US ID</label>
								<input v-model="flowState.usId" type="text" placeholder="Ex: US-200" class="w-full rounded border-slate-300 dark:border-slate-600 p-2 text-sm dark:bg-slate-700 dark:text-white" />
							</div>
							<div class="col-span-2 flex items-center gap-2 mt-1 p-2 bg-white dark:bg-slate-800 rounded border border-purple-100 dark:border-purple-900/50">
								<input type="checkbox" id="isFullstack" v-model="flowState.isFullstack" class="rounded text-purple-600 focus:ring-purple-500" />
								<label for="isFullstack" class="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">Feature Fullstack (Remove etapa de Frontend)</label>
							</div>
						</div>
					</div>
					<div class="space-y-4">
						<div class="flex gap-3 items-start p-3 rounded-lg border transition-colors" :class="flowState.backend.enabled ? 'border-green-200 bg-green-50/30 dark:border-green-900/30 dark:bg-green-900/10' : 'border-slate-100 opacity-50'">
							<div class="pt-2"><input type="checkbox" v-model="flowState.backend.enabled" class="rounded text-green-600 focus:ring-green-500" /></div>
							<div class="flex-1 grid grid-cols-2 gap-3">
								<div class="col-span-2 text-xs font-bold text-green-700 dark:text-green-400 uppercase">1. {{ flowState.isFullstack ? 'Fullstack' : 'Backend' }}</div>
								<div>
									<select v-model="flowState.backend.responsible" :disabled="!flowState.backend.enabled" class="w-full rounded border-slate-300 dark:border-slate-600 p-1.5 text-xs dark:bg-slate-700 dark:text-white">
										<option value="">Responsável</option>
										<option v-for="m in getMembersBySector('backend')" :key="m.name" :value="m.name">{{ m.name }}</option>
									</select>
								</div>
								<div><input v-model.number="flowState.backend.effort" type="number" placeholder="Horas" :disabled="!flowState.backend.enabled" class="w-full rounded border-slate-300 dark:border-slate-600 p-1.5 text-xs dark:bg-slate-700 dark:text-white" /></div>
							</div>
						</div>
						<div v-if="!flowState.isFullstack" class="flex gap-3 items-start p-3 rounded-lg border transition-colors" :class="flowState.frontend.enabled ? 'border-blue-200 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-900/10' : 'border-slate-100 opacity-50'">
							<div class="pt-2"><input type="checkbox" v-model="flowState.frontend.enabled" class="rounded text-blue-600 focus:ring-blue-500" /></div>
							<div class="flex-1 grid grid-cols-2 gap-3">
								<div class="col-span-2 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase flex items-center gap-2">2. Frontend</div>
								<div>
									<select v-model="flowState.frontend.responsible" :disabled="!flowState.frontend.enabled" class="w-full rounded border-slate-300 dark:border-slate-600 p-1.5 text-xs dark:bg-slate-700 dark:text-white">
										<option value="">Responsável</option>
										<option v-for="m in getMembersBySector('frontend')" :key="m.name" :value="m.name">{{ m.name }}</option>
									</select>
								</div>
								<div><input v-model.number="flowState.frontend.effort" type="number" placeholder="Horas" :disabled="!flowState.frontend.enabled" class="w-full rounded border-slate-300 dark:border-slate-600 p-1.5 text-xs dark:bg-slate-700 dark:text-white" /></div>
							</div>
						</div>
						<div class="flex gap-3 items-start p-3 rounded-lg border transition-colors" :class="flowState.qa.enabled ? 'border-purple-200 bg-purple-50/30 dark:border-purple-900/30 dark:bg-purple-900/10' : 'border-slate-100 opacity-50'">
							<div class="pt-2"><input type="checkbox" v-model="flowState.qa.enabled" class="rounded text-purple-600 focus:ring-purple-500" /></div>
							<div class="flex-1 grid grid-cols-2 gap-3">
								<div class="col-span-2 text-xs font-bold text-purple-700 dark:text-purple-400 uppercase flex items-center gap-2">{{ flowState.isFullstack ? '2.' : '3.' }} QA / Teste</div>
								<div>
									<select v-model="flowState.qa.responsible" :disabled="!flowState.qa.enabled" class="w-full rounded border-slate-300 dark:border-slate-600 p-1.5 text-xs dark:bg-slate-700 dark:text-white">
										<option value="">Responsável</option>
										<option v-for="m in getMembersBySector('qa')" :key="m.name" :value="m.name">{{ m.name }}</option>
									</select>
								</div>
								<div><input v-model.number="flowState.qa.effort" type="number" placeholder="Horas" :disabled="!flowState.qa.enabled" class="w-full rounded border-slate-300 dark:border-slate-600 p-1.5 text-xs dark:bg-slate-700 dark:text-white" /></div>
							</div>
						</div>
					</div>
					<div class="pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-3">
						<button type="button" @click="handleCancel" class="px-4 py-2 rounded border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 text-sm">Cancelar</button>
						<button type="submit" class="flex-1 bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 font-bold shadow-lg shadow-purple-200 dark:shadow-none text-sm">Criar Fluxo Completo</button>
					</div>
				</form>

				<form v-else @submit.prevent="submitSimple" class="space-y-5 animate-fade-in">
					<div class="grid grid-cols-2 gap-5">
						<div>
							<label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">ID da US <span class="text-xs text-slate-400">(Op.)</span></label>
							<input
								v-model="formState.usId"
								type="text"
								placeholder="Ex: US-104"
								class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-700 dark:text-white transition-colors"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">ID da Tarefa</label>
							<input
								v-model="formState.customId"
								type="text"
								placeholder="Ex: T-01"
								class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-700 dark:text-white transition-colors"
							/>
						</div>
					</div>

					<div>
						<label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Tarefa</label>
						<input
							v-model="formState.name"
							type="text"
							placeholder="Ex: Desenvolver API..."
							class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 transition-colors"
							required
							autofocus
						/>
					</div>

					<div class="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
						<input type="checkbox" id="isMilestone" v-model="formState.isMilestone" class="rounded text-indigo-600 focus:ring-indigo-500" />
						<label for="isMilestone" class="text-sm font-medium text-indigo-800 dark:text-indigo-200 cursor-pointer"> 🚩 É um Marco (Milestone)? <span class="text-xs font-normal opacity-70 block">Marcos têm duração fixa e servem como pontos de controle.</span> </label>
					</div>

					<div class="grid grid-cols-2 gap-5" v-if="!formState.isMilestone">
						<div>
							<label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Tipo</label>
							<select v-model="formState.type" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-700 dark:text-white transition-colors">
								<option value="frontend">Front-end</option>
								<option value="backend">Back-end</option>
								<option value="qualidade">Qualidade</option>
								<option value="other">Outro</option>
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Cor da Barra</label>
							<div class="flex gap-2">
								<button
									type="button"
									v-for="c in colors"
									:key="c"
									@click="formState.color = c"
									class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shadow-sm"
									:class="formState.color === c ? 'border-slate-800 dark:border-white scale-110 ring-2 ring-offset-1 ring-slate-300 dark:ring-slate-600' : 'border-transparent'"
									:style="{ backgroundColor: c }"
								></button>
							</div>
						</div>
					</div>

					<hr class="border-slate-100 dark:border-slate-700" />

					<div>
						<label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Sprint (Opcional)</label>
						<select v-model="formState.sprintId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm bg-white dark:bg-slate-700 dark:text-white transition-colors">
							<option value="">-- Sem Sprint (Não Planejado) --</option>
							<option v-for="s in config.sprints" :key="s.id" :value="s.id">{{ s.name }}</option>
						</select>
					</div>

					<div class="grid grid-cols-2 gap-5">
						<div v-if="!formState.isMilestone">
							<label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Responsável</label>
							<select v-model="formState.responsible" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-700 dark:text-white transition-colors">
								<option value="">-- Selecione --</option>
								<option v-for="member in filteredMembersSimple" :key="member.name" :value="member.name">{{ member.name }} ({{ member.sector || 'Geral' }})</option>
							</select>
						</div>
						<div v-if="!formState.isMilestone">
							<label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Esforço Estimado</label>
							<div class="relative">
								<input
									v-model.number="formState.effort"
									type="number"
									min="0"
									class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm pr-12 bg-white dark:bg-slate-700 dark:text-white transition-colors"
								/>
								<span class="absolute right-3 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">HORAS</span>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-5" v-if="!formState.isMilestone">
						<div>
							<label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Duração</label>
							<div class="relative">
								<input
									v-model.number="formState.duration"
									type="number"
									min="1"
									class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 dark:bg-slate-600 dark:text-white text-sm pr-10 transition-colors"
									title="Calculado automaticamente"
								/>
								<span class="absolute right-3 top-2.5 text-xs text-slate-400 dark:text-slate-300 font-bold">DIAS</span>
							</div>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Dependência</label>
							<select v-model="formState.dependencyId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-700 dark:text-white transition-colors">
								<option value="">Nenhuma</option>
								<option v-for="t in tasks" :key="t.id" :value="t.id" v-show="!editingTask || t.id !== editingTask.id">{{ t.name }}</option>
							</select>
						</div>
					</div>
					<div v-else>
						<label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Dependência (Define a data do Marco)</label>
						<select v-model="formState.dependencyId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-700 dark:text-white transition-colors">
							<option value="">Nenhuma (Início do Projeto)</option>
							<option v-for="t in tasks" :key="t.id" :value="t.id" v-show="!editingTask || t.id !== editingTask.id">{{ t.name }}</option>
						</select>
					</div>

					<div v-if="capacityAlertSimple" class="text-xs text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2">
						<svg class="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						<span>{{ capacityAlertSimple }}</span>
					</div>

					<div class="flex flex-col gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
						<div class="flex gap-3">
							<button type="button" @click="handleCancel" class="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm">Cancelar</button>
							<button type="submit" class="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-200 dark:shadow-none text-sm">
								{{ editingTask ? 'Salvar Alterações' : 'Criar Tarefa' }}
							</button>
						</div>

						<div v-if="editingTask" class="flex gap-3 pt-2">
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
								@click="requestCompletion"
								class="flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-transparent rounded"
								:class="
									editingTask.isCompleted
										? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700'
										: 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30'
								"
							>
								<svg v-if="!editingTask.isCompleted" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
								<svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								{{ editingTask.isCompleted ? 'Reabrir Tarefa' : 'Concluir Tarefa' }}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>

		<ConfirmationModal :is-open="isDeleteModalOpen" title="Excluir Tarefa" :message="`Tem a certeza que deseja excluir a tarefa '${editingTask?.name}'?`" @confirm="confirmDelete" @cancel="isDeleteModalOpen = false" />

		<ConfirmationModal
			:is-open="isCompleteModalOpen"
			:title="editingTask?.isCompleted ? 'Reabrir Tarefa' : 'Concluir Tarefa'"
			:message="editingTask?.isCompleted ? `Deseja marcar '${editingTask?.name}' como em andamento novamente?` : `Confirmar a conclusão da tarefa '${editingTask?.name}'?`"
			@confirm="confirmCompletion"
			@cancel="isCompleteModalOpen = false"
		/>
	</div>
</template>

<style scoped>
.custom-scrollbar {
	scrollbar-width: thin;
	scrollbar-color: #cbd5e1 transparent;
}
:global(.dark) .custom-scrollbar {
	scrollbar-color: #475569 transparent;
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
