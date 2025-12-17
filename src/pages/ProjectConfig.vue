<script setup lang="ts">
import { ref } from 'vue'
import ConfigContextSelector from '@/components/config/ConfigContextSelector.vue'
import ConfigGeneral from '@/components/config/ConfigGeneral.vue'
import ConfigRisks from '@/components/config/ConfigRisks.vue'
import ConfigSprints from '@/components/config/ConfigSprints.vue'
import ConfigMembers from '@/components/config/ConfigMembers.vue'

const selectedSquadId = ref<string>('')
</script>

<template>
	<div class="space-y-6 animate-fade-in pb-10">
		<ConfigContextSelector v-model="selectedSquadId" />

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
			<div class="space-y-6">
				<ConfigGeneral :squad-id="selectedSquadId" />

				<ConfigRisks :squad-id="selectedSquadId" />
			</div>

			<div class="space-y-6">
				<div v-if="!selectedSquadId" class="bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-10 text-center flex flex-col items-center justify-center h-64">
					<svg class="w-12 h-12 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					<h3 class="text-lg font-bold text-slate-600 dark:text-slate-300">Selecione uma Squad</h3>
					<p class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Para gerenciar Sprints e Membros, escolha uma Squad no menu acima.</p>
				</div>

				<div v-else class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
					<ConfigSprints :squad-id="selectedSquadId" />

					<ConfigMembers :squad-id="selectedSquadId" />
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
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
