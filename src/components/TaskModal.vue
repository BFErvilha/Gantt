<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useGantt, type Task } from '@/composables/useGantt'
import ConfirmationModal from './ConfirmationModal.vue'

const { tasks, addTask, editingTask, updateTask, cancelEditing, removeTask, toggleTaskCompletion, config, isTaskModalOpen } = useGantt()

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const defaultFormState = {
	name: '',
	duration: 1,
	dependencyId: '',
	color: '#3b82f6',
	type: 'frontend' as Task['type'],
	responsible: '',
	effort: 0,
	sprintId: '',
}

const formState = ref({ ...defaultFormState })
const isDeleteModalOpen = ref(false)
const isCompleteModalOpen = ref(false)

watch(editingTask, newTask => {
	if (newTask) {
		formState.value = {
			name: newTask.name,
			duration: newTask.duration,
			dependencyId: newTask.dependencyId || '',
			color: newTask.color,
			type: newTask.type || 'other',
			responsible: newTask.responsible || '',
			effort: newTask.effort || 0,
			sprintId: newTask.sprintId || '',
		}
	} else {
		resetForm()
	}
})

const getCurrentResponsibleCapacity = () => {
	if (!formState.value.responsible) return 8
	const member = config.value.teamMembers.find(m => m.name === formState.value.responsible)
	return member ? member.capacity : 8
}

watch([() => formState.value.effort, () => formState.value.responsible], ([newEffort]) => {
	if (newEffort && newEffort > 0) {
		const capacity = getCurrentResponsibleCapacity()
		const daysNeeded = Math.ceil(newEffort / capacity)
		formState.value.duration = Math.max(1, daysNeeded)
	}
})

const capacityAlert = computed(() => {
	const hours = formState.value.effort
	const days = formState.value.duration
	const capacity = getCurrentResponsibleCapacity()

	if (hours > days * capacity) {
		return `Atenção: ${hours}h excede a capacidade de ${days} dia(s) (${capacity}h/dia).`
	}
	return null
})

const resetForm = () => {
	formState.value = { ...defaultFormState, color: colors[Math.floor(Math.random() * colors.length)] }
	isDeleteModalOpen.value = false
	isCompleteModalOpen.value = false
}

const submit = () => {
	if (!formState.value.name) return

	if (editingTask.value) {
		updateTask({
			...editingTask.value,
			...formState.value,
			...{ dependencyId: formState.value.dependencyId || null },
			...{ sprintId: formState.value.sprintId || undefined },
			isNotPlanned: !formState.value.sprintId,
		})
	} else {
		addTask({
			name: formState.value.name,
			duration: formState.value.duration,
			dependencyId: formState.value.dependencyId || null,
			color: formState.value.color,
			type: formState.value.type,
			responsible: formState.value.responsible,
			effort: formState.value.effort,
			sprintId: formState.value.sprintId || undefined,
		})
		cancelEditing()
	}
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
		<div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-300">
			<div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
				<h3 class="text-lg font-bold text-slate-800 dark:text-slate-100">
					{{ editingTask ? 'Editar Tarefa' : 'Nova Tarefa' }}
				</h3>
				<button @click="handleCancel" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>

			<div class="p-6 overflow-y-auto custom-scrollbar">
				<form @submit.prevent="submit" class="space-y-5">
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

					<div class="grid grid-cols-2 gap-5">
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
						<div>
							<label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Responsável</label>
							<select v-model="formState.responsible" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-700 dark:text-white transition-colors">
								<option value="">-- Selecione --</option>
								<option v-for="member in config.teamMembers" :key="member.name" :value="member.name">{{ member.name }}</option>
							</select>
						</div>
						<div>
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

					<div class="grid grid-cols-2 gap-5">
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
							<span class="text-[10px] text-blue-500 dark:text-blue-400 mt-1 block font-medium" v-if="formState.effort > 0">Automático ({{ Math.ceil(formState.effort / getCurrentResponsibleCapacity()) }}d)</span>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Dependência</label>
							<select v-model="formState.dependencyId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-700 dark:text-white transition-colors">
								<option value="">Nenhuma</option>
								<option v-for="t in tasks" :key="t.id" :value="t.id" v-show="!editingTask || t.id !== editingTask.id">{{ t.name }}</option>
							</select>
						</div>
					</div>

					<div v-if="capacityAlert" class="text-xs text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						<span>{{ capacityAlert }}</span>
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
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
								<svg v-if="!editingTask.isCompleted" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								<svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
</style>
