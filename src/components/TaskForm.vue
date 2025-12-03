<script setup lang="ts">
import { ref } from 'vue'
import { useGantt } from '@/composables/useGantt'

const { tasks, addTask } = useGantt()

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const newTask = ref({
	name: '',
	duration: 1,
	dependencyId: '',
	color: '#3b82f6',
})

const submit = () => {
	if (!newTask.value.name) return

	addTask({
		name: newTask.value.name,
		duration: newTask.value.duration,
		dependencyId: newTask.value.dependencyId || null,
		color: newTask.value.color,
	})

	newTask.value.name = ''
	newTask.value.duration = 1
	newTask.value.dependencyId = ''
	newTask.value.color = colors[Math.floor(Math.random() * colors.length)]
}
</script>

<template>
	<div class="bg-white p-6 rounded-lg shadow border border-slate-200">
		<h3 class="text-lg font-bold mb-4 text-slate-800">Adicionar Tarefa</h3>

		<form @submit.prevent="submit" class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-1">Nome</label>
				<input v-model="newTask.name" type="text" placeholder="Ex: Validar Protótipo" class="w-full rounded border-slate-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">Duração (Dias)</label>
					<input v-model.number="newTask.duration" type="number" min="1" class="w-full rounded border-slate-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500 focus:outline-none" />
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">Cor</label>
					<div class="flex gap-2 mt-1">
						<button
							type="button"
							v-for="c in colors"
							:key="c"
							@click="newTask.color = c"
							class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
							:class="newTask.color === c ? 'border-slate-800 scale-110' : 'border-transparent'"
							:style="{ backgroundColor: c }"
						></button>
					</div>
				</div>
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700 mb-1">Dependência</label>
				<select v-model="newTask.dependencyId" class="w-full rounded border-slate-300 shadow-sm p-2 border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
					<option value="">Nenhuma (Inicia no Projeto)</option>
					<option v-for="t in tasks" :key="t.id" :value="t.id">{{ t.name }}</option>
				</select>
			</div>

			<button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors font-medium shadow-sm">Adicionar ao Gráfico</button>
		</form>
	</div>
</template>
