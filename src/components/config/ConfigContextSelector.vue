<script setup lang="ts">
import { useGantt } from '@/composables/useGantt'

const selectedSquadId = defineModel<string>('modelValue', { required: true })

const { config } = useGantt()
</script>

<template>
	<div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
		<div>
			<h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><span class="text-2xl">⚙️</span> Configuração do Projeto</h2>
			<p class="text-sm text-slate-500">Selecione o contexto que deseja gerenciar.</p>
		</div>

		<select v-model="selectedSquadId" class="w-full md:w-64 rounded-lg border-slate-300 dark:border-slate-600 p-2.5 text-sm dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-bold shadow-sm">
			<option value="">🌍 Visão Global do Projeto</option>
			<option disabled>──────────</option>
			<option v-for="s in config.squads" :key="s.id" :value="s.id">Squad: {{ s.name }}</option>
		</select>
	</div>
</template>
