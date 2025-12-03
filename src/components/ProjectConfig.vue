<script setup lang="ts">
import { useGantt } from '@/composables/useGantt'

const { config, computedTasks, removeTask } = useGantt()
</script>

<template>
	<div class="space-y-6">
		<div class="bg-white p-6 rounded-lg shadow border border-slate-200">
			<h3 class="text-lg font-bold mb-4 text-slate-800 border-b pb-2">Configuração do Projeto</h3>
			<div class="space-y-4">
				<div>
					<label class="block text-xs font-bold uppercase text-slate-500 mb-1">Início do Projeto</label>
					<input v-model="config.projectStartDate" type="date" class="w-full rounded border-slate-300 bg-slate-50 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
				</div>
				<div>
					<label class="block text-xs font-bold uppercase text-slate-500 mb-1">Prazo Final (Deadline)</label>
					<input v-model="config.deadline" type="date" class="w-full rounded border-slate-300 bg-slate-50 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
				</div>
				<div class="flex items-center pt-2">
					<input id="weekend" v-model="config.skipWeekends" type="checkbox" class="h-4 w-4 text-blue-600 rounded cursor-pointer" />
					<label for="weekend" class="ml-2 block text-sm text-slate-700 cursor-pointer select-none"> Pular Finais de Semana </label>
				</div>
			</div>
		</div>

		<div class="bg-white p-6 rounded-lg shadow border border-slate-200 flex-1 flex flex-col">
			<h3 class="text-lg font-bold mb-4 text-slate-800 border-b pb-2">
				Cronograma <span class="text-xs font-normal text-slate-500 ml-2">({{ computedTasks.length }} tarefas)</span>
			</h3>
			<div class="space-y-3 overflow-y-auto pr-2 custom-scroll flex-1 min-h-[200px] max-h-[400px]">
				<div v-for="task in computedTasks" :key="task.id" class="p-3 bg-white rounded border border-slate-200 hover:border-blue-300 transition-colors group relative shadow-sm">
					<div class="flex justify-between items-start mb-2">
						<div class="flex items-center gap-2">
							<span class="w-3 h-3 rounded-full shadow-sm" :style="{ background: task.color }"></span>
							<span class="font-bold text-slate-700 text-sm">{{ task.name }}</span>
						</div>
						<button @click="removeTask(task.id)" class="text-slate-300 hover:text-red-500 transition-colors" title="Remover tarefa">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
					<div class="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">
						<div>
							<span class="block text-[10px] uppercase text-slate-400 font-bold">Início</span>
							{{ task.formattedStartDate }}
						</div>
						<div>
							<span class="block text-[10px] uppercase text-slate-400 font-bold">Fim</span>
							<span class="font-semibold text-slate-800">{{ task.formattedEndDate }}</span>
						</div>
						<div class="col-span-2 pt-1 border-t border-slate-200 mt-1">
							Duração: <b>{{ task.duration }} dias</b>
						</div>
					</div>
				</div>

				<div v-if="computedTasks.length === 0" class="text-sm text-slate-400 text-center py-8 italic border-2 border-dashed border-slate-100 rounded">Nenhuma tarefa cadastrada.</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar {
	width: 6px;
}
.custom-scroll::-webkit-scrollbar-track {
	background: #f1f5f9;
}
.custom-scroll::-webkit-scrollbar-thumb {
	background: #cbd5e1;
	border-radius: 3px;
}
</style>
