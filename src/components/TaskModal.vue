<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useGantt, type Task } from '@/composables/useGantt'
import ConfirmationModal from './ConfirmationModal.vue'

const { tasks, addTask, editingTask, updateTask, cancelEditing, removeTask, config, isTaskModalOpen } = useGantt()

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const defaultFormState = {
	name: '',
	duration: 1,
	dependencyId: '',
	color: '#3b82f6',
	type: 'frontend' as Task['type'],
	responsible: '',
	effort: 0,
}

const formState = ref({ ...defaultFormState })
const isDeleteModalOpen = ref(false)

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
}

const submit = () => {
	if (!formState.value.name) return

	if (editingTask.value) {
		updateTask({
			...editingTask.value,
			...formState.value,
			dependencyId: formState.value.dependencyId || null,
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
</script>

<template>
	<div v-if="isTaskModalOpen" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
			<div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
				<h3 class="text-lg font-bold text-slate-800">
					{{ editingTask ? 'Editar Tarefa' : 'Nova Tarefa' }}
				</h3>
				<button @click="handleCancel" class="text-slate-400 hover:text-slate-600 transition-colors">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>

			<div class="p-6 overflow-y-auto">
				<form @submit.prevent="submit" class="space-y-5">
					<div>
						<label class="block text-sm font-bold text-slate-700 mb-1">Nome da Tarefa</label>
						<input v-model="formState.name" type="text" placeholder="Ex: Desenvolver API..." class="w-full rounded-lg border-slate-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" required autofocus />
					</div>

					<div class="grid grid-cols-2 gap-5">
						<div>
							<label class="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
							<select v-model="formState.type" class="w-full rounded-lg border-slate-300 shadow-sm p-2.5 border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
								<option value="frontend">Front-end</option>
								<option value="backend">Back-end</option>
								<option value="qualidade">Qualidade</option>
								<option value="outro">Outro</option>
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-600 mb-2">Cor da Barra</label>
							<div class="flex gap-2">
								<button
									type="button"
									v-for="c in colors"
									:key="c"
									@click="formState.color = c"
									class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shadow-sm"
									:class="formState.color === c ? 'border-slate-800 scale-110 ring-2 ring-offset-1 ring-slate-300' : 'border-transparent'"
									:style="{ backgroundColor: c }"
								></button>
							</div>
						</div>
					</div>

					<hr class="border-slate-100" />

					<div class="grid grid-cols-2 gap-5">
						<div>
							<label class="block text-sm font-medium text-slate-600 mb-1">Responsável</label>
							<select v-model="formState.responsible" class="w-full rounded-lg border-slate-300 shadow-sm p-2.5 border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
								<option value="">-- Selecione --</option>
								<option v-for="member in config.teamMembers" :key="member.name" :value="member.name">{{ member.name }}</option>
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-600 mb-1">Esforço Estimado</label>
							<div class="relative">
								<input v-model.number="formState.effort" type="number" min="0" class="w-full rounded-lg border-slate-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm pr-12" />
								<span class="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">HORAS</span>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-5">
						<div>
							<label class="block text-sm font-medium text-slate-600 mb-1">Duração</label>
							<div class="relative">
								<input v-model.number="formState.duration" type="number" min="1" class="w-full rounded-lg border-slate-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 text-sm pr-10" title="Calculado automaticamente" />
								<span class="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">DIAS</span>
							</div>
							<span class="text-[10px] text-blue-500 mt-1 block font-medium" v-if="formState.effort > 0">Automático ({{ Math.ceil(formState.effort / getCurrentResponsibleCapacity()) }}d)</span>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-600 mb-1">Dependência</label>
							<select v-model="formState.dependencyId" class="w-full rounded-lg border-slate-300 shadow-sm p-2.5 border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
								<option value="">Nenhuma</option>
								<option v-for="t in tasks" :key="t.id" :value="t.id" v-show="!editingTask || t.id !== editingTask.id">{{ t.name }}</option>
							</select>
						</div>
					</div>

					<div v-if="capacityAlert" class="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						<span>{{ capacityAlert }}</span>
					</div>

					<div class="flex flex-col gap-3 pt-4 border-t border-slate-100">
						<div class="flex gap-3">
							<button type="button" @click="handleCancel" class="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition text-sm">Cancelar</button>
							<button type="submit" class="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-200 text-sm">
								{{ editingTask ? 'Salvar Alterações' : 'Criar Tarefa' }}
							</button>
						</div>
						<button v-if="editingTask" type="button" @click="requestDelete" class="w-full text-red-500 hover:text-red-700 py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
							Excluir Tarefa
						</button>
					</div>
				</form>
			</div>
		</div>

		<ConfirmationModal :is-open="isDeleteModalOpen" title="Excluir Tarefa" :message="`Tem a certeza que deseja excluir a tarefa '${editingTask?.name}'?`" @confirm="confirmDelete" @cancel="isDeleteModalOpen = false" />
	</div>
</template>
