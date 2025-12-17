<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGantt } from '@/composables/useGantt'

const emit = defineEmits(['submit'])

const { config, allSprints, addTask } = useGantt()

const flow = ref({
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

const availableSprints = computed(() => {
	if (!flow.value.squadId) return allSprints.value
	return allSprints.value.filter(s => s.squadId === flow.value.squadId)
})

const flowSprintSquad = computed(() => {
	if (!flow.value.sprintId) return null
	const sprint = allSprints.value.find(s => s.id === flow.value.sprintId)
	return sprint?.squadId ? config.value.squads.find(s => s.id === sprint.squadId) : null
})

watch(
	() => flow.value.sprintId,
	newSprintId => {
		if (newSprintId) {
			const sprint = allSprints.value.find(s => s.id === newSprintId)
			if (sprint?.squadId) flow.value.squadId = sprint.squadId
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
		return false
	})
}

const getCapacity = (respName: string) => {
	const member = config.value.teamMembers.find(m => m.name === respName)
	return member ? member.capacity : 8
}

const handleSubmit = () => {
	if (!flow.value.featureName) return

	const backId = crypto.randomUUID()
	const frontId = crypto.randomUUID()
	const qaId = crypto.randomUUID()

	const commonData = {
		usId: flow.value.usId,
		sprintId: flow.value.sprintId || undefined,
		isMilestone: false,
		usType: flow.value.usType,
		classification: flow.value.classification,
		isNotPlanned: !flow.value.sprintId,
	}

	if (flow.value.backend.enabled) {
		const effort = flow.value.backend.effort
		const cap = getCapacity(flow.value.backend.responsible)
		addTask({
			id: backId,
			name: flow.value.isFullstack ? `${flow.value.featureName} (Fullstack)` : `${flow.value.featureName} (Back)`,
			type: 'backend',
			color: '#10b981',
			responsible: flow.value.backend.responsible,
			effort,
			duration: Math.max(1, Math.ceil(effort / cap)),
			dependencyId: null,
			...commonData,
		})
	}

	if (!flow.value.isFullstack && flow.value.frontend.enabled) {
		const effort = flow.value.frontend.effort
		const cap = getCapacity(flow.value.frontend.responsible)
		const depId = flow.value.backend.enabled ? backId : null
		addTask({
			id: frontId,
			name: `${flow.value.featureName} (Front)`,
			type: 'frontend',
			color: '#3b82f6',
			responsible: flow.value.frontend.responsible,
			effort,
			duration: Math.max(1, Math.ceil(effort / cap)),
			dependencyId: depId,
			...commonData,
		})
	}

	if (flow.value.qa.enabled) {
		const effort = flow.value.qa.effort
		const cap = getCapacity(flow.value.qa.responsible)
		let depId = null
		if (!flow.value.isFullstack && flow.value.frontend.enabled) depId = frontId
		else if (flow.value.backend.enabled) depId = backId

		addTask({
			id: qaId,
			name: `${flow.value.featureName} (QA)`,
			type: 'qualidade',
			color: '#8b5cf6',
			responsible: flow.value.qa.responsible,
			effort,
			duration: Math.max(1, Math.ceil(effort / cap)),
			dependencyId: depId,
			...commonData,
		})
	}
	emit('submit')
}
</script>

<template>
	<form id="flow-form" @submit.prevent="handleSubmit" class="space-y-6">
		<div class="bg-purple-50 dark:bg-purple-900/10 p-5 rounded-xl border border-purple-100 dark:border-purple-800/30">
			<h4 class="text-xs font-bold uppercase text-purple-800 dark:text-purple-300 mb-4 flex items-center gap-2">Configuração do Fluxo</h4>

			<div class="grid grid-cols-2 gap-5">
				<div class="col-span-2">
					<label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Squad</label>
					<select v-model="flow.squadId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 p-2.5 text-sm dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 shadow-sm font-medium">
						<option value="">-- Selecione a Squad --</option>
						<option v-for="s in config.squads" :key="s.id" :value="s.id">{{ s.name }}</option>
					</select>
				</div>

				<div class="col-span-2">
					<label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Nome da Feature (Base)</label>
					<input
						v-model="flow.featureName"
						type="text"
						placeholder="Ex: Criação de Login"
						class="w-full rounded-lg border-slate-300 dark:border-slate-600 p-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-800 dark:text-white transition-all shadow-sm placeholder-slate-400"
						required
						autofocus
					/>
				</div>

				<div>
					<label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">Sprint</label>
					<select v-model="flow.sprintId" class="w-full rounded-lg border-slate-300 dark:border-slate-600 p-2.5 text-sm dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 shadow-sm font-medium" :disabled="!flow.squadId">
						<option value="">-- Não Planejado --</option>
						<option v-for="s in availableSprints" :key="s.id" :value="s.id">{{ s.name }}</option>
					</select>
					<div v-if="flowSprintSquad" class="text-[10px] text-indigo-500 mt-1 font-medium">Squad: {{ flowSprintSquad.name }}</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">US ID</label>
					<input v-model="flow.usId" type="text" placeholder="Ex: US-200" class="w-full rounded-lg border-slate-300 dark:border-slate-600 p-2.5 text-sm dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 shadow-sm font-medium" />
				</div>

				<div class="col-span-2 bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Prioridade</label>
						<div class="flex gap-2">
							<label class="flex-1 cursor-pointer relative">
								<input type="radio" v-model="flow.usType" value="goal" class="peer sr-only" />
								<div
									class="text-center py-2 px-2 rounded-md border border-slate-200 dark:border-slate-600 peer-checked:bg-amber-100 peer-checked:text-amber-800 peer-checked:border-amber-300 dark:peer-checked:bg-amber-900/40 dark:peer-checked:text-amber-200 dark:text-slate-300 transition-all text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700"
								>
									🏆 Meta
								</div>
							</label>
							<label class="flex-1 cursor-pointer relative">
								<input type="radio" v-model="flow.usType" value="item" class="peer sr-only" />
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
						<input v-model.number="flow.classification" type="number" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-sm dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-purple-500 shadow-sm font-medium" placeholder="0" />
					</div>
				</div>

				<div class="col-span-2 flex items-center gap-3 mt-1 p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-purple-900/50 shadow-sm cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
					<input type="checkbox" id="isFullstack" v-model="flow.isFullstack" class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300" />
					<label for="isFullstack" class="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">Feature Fullstack (Remove etapa de Frontend)</label>
				</div>
			</div>
		</div>

		<div class="space-y-4">
			<div class="flex gap-3 items-start p-3 rounded-lg border transition-all shadow-sm" :class="flow.backend.enabled ? 'border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10' : 'border-slate-100 bg-slate-50 opacity-60'">
				<div class="pt-2"><input type="checkbox" v-model="flow.backend.enabled" class="rounded text-green-600 focus:ring-green-500 w-4 h-4" /></div>
				<div class="flex-1 grid grid-cols-2 gap-3">
					<div class="col-span-2 text-xs font-bold text-green-800 dark:text-green-400 uppercase tracking-wide">1. {{ flow.isFullstack ? 'Fullstack' : 'Backend' }}</div>
					<div>
						<select v-model="flow.backend.responsible" :disabled="!flow.backend.enabled || !flow.squadId" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-xs dark:bg-slate-800 dark:text-white font-medium">
							<option value="">Responsável</option>
							<option v-for="m in getMembersBySector('backend', flow.squadId)" :key="m.name" :value="m.name">{{ m.name }}</option>
						</select>
					</div>
					<div><input v-model.number="flow.backend.effort" type="number" placeholder="Horas" :disabled="!flow.backend.enabled" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-xs dark:bg-slate-800 dark:text-white font-medium" /></div>
				</div>
			</div>

			<div v-if="!flow.isFullstack" class="flex gap-3 items-start p-3 rounded-lg border transition-all shadow-sm" :class="flow.frontend.enabled ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10' : 'border-slate-100 bg-slate-50 opacity-60'">
				<div class="pt-2"><input type="checkbox" v-model="flow.frontend.enabled" class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" /></div>
				<div class="flex-1 grid grid-cols-2 gap-3">
					<div class="col-span-2 text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wide">2. Frontend</div>
					<div>
						<select v-model="flow.frontend.responsible" :disabled="!flow.frontend.enabled || !flow.squadId" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-xs dark:bg-slate-800 dark:text-white font-medium">
							<option value="">Responsável</option>
							<option v-for="m in getMembersBySector('frontend', flow.squadId)" :key="m.name" :value="m.name">{{ m.name }}</option>
						</select>
					</div>
					<div><input v-model.number="flow.frontend.effort" type="number" placeholder="Horas" :disabled="!flow.frontend.enabled" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-xs dark:bg-slate-800 dark:text-white font-medium" /></div>
				</div>
			</div>

			<div class="flex gap-3 items-start p-3 rounded-lg border transition-all shadow-sm" :class="flow.qa.enabled ? 'border-purple-200 bg-purple-50/50 dark:border-purple-900/30 dark:bg-purple-900/10' : 'border-slate-100 bg-slate-50 opacity-60'">
				<div class="pt-2"><input type="checkbox" v-model="flow.qa.enabled" class="rounded text-purple-600 focus:ring-purple-500 w-4 h-4" /></div>
				<div class="flex-1 grid grid-cols-2 gap-3">
					<div class="col-span-2 text-xs font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wide">{{ flow.isFullstack ? '2.' : '3.' }} QA / Teste</div>
					<div>
						<select v-model="flow.qa.responsible" :disabled="!flow.qa.enabled || !flow.squadId" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-xs dark:bg-slate-800 dark:text-white font-medium">
							<option value="">Responsável</option>
							<option v-for="m in getMembersBySector('qualidade', flow.squadId)" :key="m.name" :value="m.name">{{ m.name }}</option>
						</select>
					</div>
					<div><input v-model.number="flow.qa.effort" type="number" placeholder="Horas" :disabled="!flow.qa.enabled" class="w-full rounded-md border-slate-300 dark:border-slate-600 p-2 text-xs dark:bg-slate-800 dark:text-white font-medium" /></div>
				</div>
			</div>
		</div>
	</form>
</template>
