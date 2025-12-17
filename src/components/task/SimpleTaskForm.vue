<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGantt } from '@/composables/useGantt'
import type { Task } from '@/types/gantt'

const props = defineProps<{
	task: Task | null
}>()

const emit = defineEmits(['submit'])

const { config, allSprints, addTask, updateTask, tasks } = useGantt()

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
	squadId: '',
	isMilestone: false,
	usType: 'item' as 'goal' | 'item',
	classification: 0,
}

const form = ref({ ...defaultFormState })

const initForm = () => {
	const currentTask = props.task

	if (currentTask) {
		let squadId = ''
		if (currentTask.sprintId) {
			const sprint = allSprints.value.find(s => s.id === currentTask.sprintId)
			if (sprint && sprint.squadId) squadId = sprint.squadId
		}

		form.value = {
			name: currentTask.name,
			usId: currentTask.usId || '',
			customId: currentTask.customId || '',
			duration: currentTask.duration,
			dependencyId: currentTask.dependencyId || '',
			color: currentTask.color,
			type: currentTask.type || 'other',
			responsible: currentTask.responsible || '',
			effort: currentTask.effort || 0,
			sprintId: currentTask.sprintId || '',
			squadId: squadId,
			isMilestone: currentTask.isMilestone || false,
			usType: currentTask.usType || 'item',
			classification: currentTask.classification || 0,
		}
	} else {
		form.value = { ...defaultFormState, color: colors[Math.floor(Math.random() * colors.length)] }
	}
}

watch(() => props.task, initForm, { immediate: true })

const availableSprints = computed(() => {
	if (!form.value.squadId) return allSprints.value
	return allSprints.value.filter(s => s.squadId === form.value.squadId)
})

const selectedSprintSquad = computed(() => {
	if (!form.value.sprintId) return null
	const sprint = allSprints.value.find(s => s.id === form.value.sprintId)
	return sprint?.squadId ? config.value.squads.find(s => s.id === sprint.squadId) : null
})

const filteredMembers = computed(() => {
	let members = config.value.teamMembers
	if (form.value.squadId) {
		members = members.filter(m => m.squadIds.includes(form.value.squadId))
	}
	return members
})

watch(
	() => form.value.sprintId,
	newSprintId => {
		if (newSprintId) {
			const sprint = allSprints.value.find(s => s.id === newSprintId)
			if (sprint?.squadId) form.value.squadId = sprint.squadId
		}
	},
)

const getCapacity = (respName: string) => {
	if (!respName) return 8
	const member = config.value.teamMembers.find(m => m.name === respName)
	return member ? member.capacity : 8
}

watch([() => form.value.effort, () => form.value.responsible], ([newEffort]) => {
	if (newEffort && newEffort > 0 && !form.value.isMilestone) {
		const cap = getCapacity(form.value.responsible)
		form.value.duration = Math.max(1, Math.ceil(newEffort / cap))
	}
})

const capacityAlert = computed(() => {
	if (form.value.isMilestone) return null
	const hours = form.value.effort
	const days = form.value.duration
	const cap = getCapacity(form.value.responsible)
	if (hours > days * cap) return `Atenção: ${hours}h excede a capacidade de ${days} dia(s).`
	return null
})

const handleSubmit = () => {
	if (!form.value.name) return

	const taskData: Partial<Task> = {
		name: form.value.name,
		usId: form.value.usId,
		customId: form.value.customId,
		duration: form.value.isMilestone ? 0 : form.value.duration,
		dependencyId: form.value.dependencyId || null,
		color: form.value.color,
		type: form.value.type,
		responsible: form.value.responsible,
		effort: form.value.effort,
		sprintId: form.value.sprintId || undefined,
		isMilestone: form.value.isMilestone,
		usType: form.value.usType,
		classification: form.value.classification,
		isNotPlanned: !form.value.sprintId,
	}

	if (props.task) {
		updateTask({ ...props.task, ...taskData })
	} else {
		addTask(taskData)
	}
	emit('submit')
}
</script>

<template>
	<form id="simple-form" @submit.prevent="handleSubmit" class="space-y-6 animate-fade-in">
		<div>
			<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Squad</label>
			<select v-model="form.squadId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 text-sm dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
				<option value="">-- Selecione a Squad --</option>
				<option v-for="s in config.squads" :key="s.id" :value="s.id">{{ s.name }}</option>
			</select>
		</div>

		<div class="grid grid-cols-2 gap-5">
			<div>
				<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">ID da US</label>
				<input
					v-model="form.usId"
					type="text"
					placeholder="Ex: US-104"
					class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-colors"
				/>
			</div>
			<div>
				<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">ID da Tarefa</label>
				<input
					v-model="form.customId"
					type="text"
					placeholder="Ex: T-01"
					class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-colors"
				/>
			</div>
		</div>

		<div>
			<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Nome da Tarefa</label>
			<input
				v-model="form.name"
				type="text"
				placeholder="Ex: Desenvolver API..."
				class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-colors placeholder-slate-400"
				required
				autofocus
			/>
		</div>

		<div class="grid grid-cols-2 gap-5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
			<div>
				<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Prioridade da US</label>
				<div class="flex gap-2">
					<label class="flex-1 cursor-pointer relative">
						<input type="radio" v-model="form.usType" value="goal" class="peer sr-only" />
						<div
							class="text-center py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 peer-checked:bg-amber-100 peer-checked:text-amber-800 peer-checked:border-amber-300 dark:peer-checked:bg-amber-900/40 dark:peer-checked:text-amber-200 dark:text-slate-300 transition-all text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700"
						>
							🏆 Meta
						</div>
					</label>
					<label class="flex-1 cursor-pointer relative">
						<input type="radio" v-model="form.usType" value="item" class="peer sr-only" />
						<div
							class="text-center py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 peer-checked:bg-slate-200 peer-checked:text-slate-800 dark:peer-checked:bg-slate-600 dark:peer-checked:text-white dark:text-slate-300 transition-all text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700"
						>
							📝 Item
						</div>
					</label>
				</div>
			</div>
			<div>
				<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Classificação</label>
				<input
					v-model.number="form.classification"
					type="number"
					placeholder="0"
					class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-colors"
				/>
			</div>
		</div>

		<div class="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
			<input type="checkbox" id="isMilestone" v-model="form.isMilestone" class="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-200" />
			<label for="isMilestone" class="text-sm font-bold text-indigo-800 dark:text-indigo-200 cursor-pointer select-none"> 🚩 É um Marco (Milestone)?</label>
		</div>

		<div class="grid grid-cols-2 gap-5" v-if="!form.isMilestone">
			<div>
				<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Tipo da Tarefa</label>
				<select v-model="form.type" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-colors">
					<option value="frontend">Front-end</option>
					<option value="backend">Back-end</option>
					<option value="qualidade">Qualidade</option>
					<option value="other">Outro</option>
				</select>
			</div>
			<div>
				<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Cor da Barra</label>
				<div class="flex gap-2">
					<button
						type="button"
						v-for="c in colors"
						:key="c"
						@click="form.color = c"
						class="w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 shadow-sm flex items-center justify-center"
						:class="form.color === c ? 'border-slate-800 dark:border-white scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-300' : 'border-transparent'"
						:style="{ backgroundColor: c }"
					>
						<svg v-if="form.color === c" class="w-4 h-4 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
					</button>
				</div>
			</div>
		</div>

		<hr class="border-slate-100 dark:border-slate-700" />

		<div>
			<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Sprint (Opcional)</label>
			<select
				v-model="form.sprintId"
				class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-colors"
				:disabled="!form.squadId"
			>
				<option value="">-- Sem Sprint (Não Planejado) --</option>
				<option v-for="s in availableSprints" :key="s.id" :value="s.id">{{ s.name }}</option>
			</select>
			<div v-if="selectedSprintSquad" class="text-xs text-indigo-500 dark:text-indigo-400 mt-2 font-bold flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded border border-indigo-100 dark:border-indigo-800">
				<span class="w-2 h-2 rounded-full bg-indigo-500"></span>
				Restrito à Squad: {{ selectedSprintSquad.name }}
			</div>
		</div>

		<div class="grid grid-cols-2 gap-5">
			<div v-if="!form.isMilestone">
				<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Responsável</label>
				<select
					v-model="form.responsible"
					class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-colors"
					:disabled="!form.squadId"
				>
					<option value="">-- Selecione --</option>
					<option v-for="member in filteredMembers" :key="member.name" :value="member.name">{{ member.name }} ({{ member.sector || 'Geral' }})</option>
				</select>
				<div v-if="!form.squadId" class="text-[10px] text-red-400 mt-1">Selecione uma Squad primeiro</div>
			</div>
			<div v-if="!form.isMilestone">
				<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Esforço Estimado</label>
				<div class="relative">
					<input
						v-model.number="form.effort"
						type="number"
						min="0"
						class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm pr-12 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-colors"
					/>
					<span class="absolute right-3 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">HORAS</span>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-5" v-if="!form.isMilestone">
			<div>
				<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Duração (Dias)</label>
				<div class="relative">
					<input
						v-model.number="form.duration"
						type="number"
						min="1"
						class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-sm pr-10 transition-colors font-medium cursor-not-allowed"
						title="Calculado automaticamente baseado no esforço e capacidade"
						readonly
					/>
					<span class="absolute right-3 top-2.5 text-xs text-slate-400 dark:text-slate-400 font-bold">DIAS</span>
				</div>
			</div>
			<div>
				<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Dependência</label>
				<select v-model="form.dependencyId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-colors">
					<option value="">Nenhuma</option>
					<option v-for="t in tasks" :key="t.id" :value="t.id" v-show="!task || t.id !== task.id">{{ t.name }}</option>
				</select>
			</div>
		</div>

		<div v-else>
			<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Dependência (Define a data do Marco)</label>
			<select v-model="form.dependencyId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-colors">
				<option value="">Nenhuma (Início do Projeto)</option>
				<option v-for="t in tasks" :key="t.id" :value="t.id" v-show="!task || t.id !== task.id">{{ t.name }}</option>
			</select>
		</div>

		<div v-if="capacityAlert" class="text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2">
			<svg class="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			</svg>
			<span>{{ capacityAlert }}</span>
		</div>
	</form>
</template>

<style scoped>
.animate-fade-in {
	animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(5px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
