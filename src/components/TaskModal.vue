<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGantt } from '@/composables/useGantt'
import ConfirmationModal from './ConfirmationModal.vue'
import SimpleTaskForm from './task/SimpleTaskForm.vue'
import FlowTaskForm from './task/FlowTaskForm.vue'

const { editingTask, cancelEditing, removeTask, toggleTaskCompletion, isTaskModalOpen } = useGantt()

const isFlowMode = ref(false)
const isDeleteModalOpen = ref(false)
const isCompleteModalOpen = ref(false)

watch(editingTask, task => {
	if (task) isFlowMode.value = false
})

const currentFormId = computed(() => (!editingTask.value && isFlowMode.value ? 'flow-form' : 'simple-form'))

const handleCancel = () => {
	cancelEditing()
	isFlowMode.value = false
}

const handleSuccess = () => {
	handleCancel()
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
		handleCancel()
	}
}
</script>

<template>
	<Transition name="slide">
		<div v-if="isTaskModalOpen" class="fixed inset-0 z-50 flex justify-end overflow-hidden">
			<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" @click="handleCancel"></div>

			<div class="relative w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transition-all duration-300 ease-out transform">
				<div class="flex-shrink-0 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
					<h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
						{{ editingTask ? '✏️ Editar Tarefa' : '✨ Nova Tarefa' }}
					</h3>
					<button @click="handleCancel" class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
						<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
					</button>
				</div>

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
					<FlowTaskForm v-if="isFlowMode && !editingTask" @submit="handleSuccess" />
					<SimpleTaskForm v-else :task="editingTask" @submit="handleSuccess" />
				</div>

				<div class="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950 z-20 flex flex-col gap-3">
					<div class="flex gap-3">
						<button type="button" @click="handleCancel" class="px-5 py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm w-1/3">Cancelar</button>

						<button type="submit" :form="currentFormId" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-bold shadow-lg shadow-blue-200 dark:shadow-none text-sm transition-colors">
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
							@click="requestCompletion"
							class="flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-transparent rounded"
							:class="
								editingTask.isCompleted
									? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700'
									: 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30'
							"
						>
							<svg v-if="!editingTask.isCompleted" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
							<svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
							{{ editingTask.isCompleted ? 'Reabrir' : 'Concluir' }}
						</button>
					</div>
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
