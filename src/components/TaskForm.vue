<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useGantt, type Task } from '@/composables/useGantt'
import ConfirmationModal from './ConfirmationModal.vue'

const { tasks, addTask, editingTask, updateTask, cancelEditing, removeTask, config } = useGantt()

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

const capacityAlert = computed(() => {
	const hours = formState.value.effort
	const days = formState.value.duration
	if (hours > days * 8) {
		return `Atenção: ${hours}h é muito esforço para apenas ${days} dia(s).`
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
		resetForm()
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
		cancelEditing()
	}
}
</script>

<template>
	<div class="bg-white p-6 rounded-lg shadow border border-slate-200">
		<h3 class="text-lg font-bold mb-4 text-slate-800">
			{{ editingTask ? 'Editar Tarefa' : 'Adicionar Tarefa' }}
		</h3>

		<form @submit.prevent="submit" class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-1">Nome</label>
				<input v-model="formState.name" type="text" placeholder="Ex: Validar Protótipo" class="w-full rounded border-slate-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
					<select v-model="formState.type" class="w-full rounded border-slate-300 shadow-sm p-2 border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
						<option value="frontend">Front-end</option>
						<option value="backend">Back-end</option>
						<option value="qualidade">Qualidade</option>
						<option value="outro">Outro</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">Cor</label>
					<div class="flex gap-2 mt-2">
						<button
							type="button"
							v-for="c in colors"
							:key="c"
							@click="formState.color = c"
							class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
							:class="formState.color === c ? 'border-slate-800 scale-110' : 'border-transparent'"
							:style="{ backgroundColor: c }"
						></button>
					</div>
				</div>
			</div>

			<hr class="border-slate-100" />

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
					<select v-model="formState.responsible" class="w-full rounded border-slate-300 shadow-sm p-2 border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
						<option value="">-- Selecione --</option>
						<option v-for="member in config.teamMembers" :key="member" :value="member">{{ member }}</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">Esforço (Horas)</label>
					<input v-model.number="formState.effort" type="number" min="0" class="w-full rounded border-slate-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:outline-none" />
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">Duração (Dias)</label>
					<input v-model.number="formState.duration" type="number" min="1" class="w-full rounded border-slate-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:outline-none" />
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">Dependência</label>
					<select v-model="formState.dependencyId" class="w-full rounded border-slate-300 shadow-sm p-2 border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
						<option value="">Nenhuma</option>
						<option v-for="t in tasks" :key="t.id" :value="t.id" v-show="!editingTask || t.id !== editingTask.id">{{ t.name }}</option>
					</select>
				</div>
			</div>

			<div v-if="capacityAlert" class="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 flex items-center gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				{{ capacityAlert }}
			</div>

			<div class="flex flex-col gap-2 pt-2">
				<div class="flex gap-2">
					<button type="submit" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors font-medium shadow-sm">
						{{ editingTask ? 'Salvar' : 'Adicionar' }}
					</button>
					<button v-if="editingTask" type="button" @click="handleCancel" class="bg-slate-200 text-slate-700 py-2 px-4 rounded hover:bg-slate-300 transition-colors font-medium shadow-sm">Cancelar</button>
				</div>
				<button v-if="editingTask" type="button" @click="requestDelete" class="w-full bg-red-50 text-red-600 border border-red-200 py-2 px-4 rounded hover:bg-red-100 transition-colors font-medium text-sm flex items-center justify-center gap-2">Excluir Tarefa</button>
			</div>
		</form>

		<ConfirmationModal :is-open="isDeleteModalOpen" title="Excluir Tarefa" :message="`Tem a certeza que deseja excluir a tarefa '${editingTask?.name}'?`" @confirm="confirmDelete" @cancel="isDeleteModalOpen = false" />
	</div>
</template>
