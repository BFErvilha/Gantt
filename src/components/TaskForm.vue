<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGantt, type Task } from '@/composables/useGantt'
import ConfirmationModal from './ConfirmationModal.vue'

const { tasks, addTask, editingTask, updateTask, cancelEditing, removeTask } = useGantt()

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const defaultFormState = {
	name: '',
	duration: 1,
	dependencyId: '',
	color: '#3b82f6',
	type: 'frontend' as Task['type'],
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
		}
	} else {
		resetForm()
	}
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
		})
		resetForm()
	}
}

const handleCancel = () => {
	cancelEditing()
	resetForm()
}

const requestDelete = () => {
	if (editingTask.value) {
		isDeleteModalOpen.value = true
	}
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
						<option value="other">Outro</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">Duração (Dias)</label>
					<input v-model.number="formState.duration" type="number" min="1" class="w-full rounded border-slate-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:outline-none" />
				</div>
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700 mb-1">Cor</label>
				<div class="flex gap-2 mt-1 flex-wrap">
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

			<div>
				<label class="block text-sm font-medium text-slate-700 mb-1">Dependência</label>
				<select v-model="formState.dependencyId" class="w-full rounded border-slate-300 shadow-sm p-2 border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
					<option value="">Nenhuma (Inicia no Projeto)</option>
					<option v-for="t in tasks" :key="t.id" :value="t.id" v-show="!editingTask || t.id !== editingTask.id">
						{{ t.name }}
					</option>
				</select>
			</div>

			<div class="flex flex-col gap-2">
				<div class="flex gap-2">
					<button type="submit" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors font-medium shadow-sm">
						{{ editingTask ? 'Salvar' : 'Adicionar ao Gráfico' }}
					</button>

					<button v-if="editingTask" type="button" @click="handleCancel" class="bg-slate-200 text-slate-700 py-2 px-4 rounded hover:bg-slate-300 transition-colors font-medium shadow-sm">Cancelar</button>
				</div>

				<button v-if="editingTask" type="button" @click="requestDelete" class="w-full bg-red-50 text-red-600 border border-red-200 py-2 px-4 rounded hover:bg-red-100 transition-colors font-medium text-sm flex items-center justify-center gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
					Excluir Tarefa
				</button>
			</div>
		</form>

		<ConfirmationModal :is-open="isDeleteModalOpen" title="Excluir Tarefa" :message="`Tem a certeza que deseja excluir a tarefa '${editingTask?.name}'? Esta ação não pode ser desfeita.`" @confirm="confirmDelete" @cancel="isDeleteModalOpen = false" />
	</div>
</template>
