<script setup lang="ts">
import { computed } from 'vue'
import { useGantt } from '@/composables/useGantt'

const { filterSearch, filterResponsible, filterType, config } = useGantt()

const clearFilters = () => {
	filterSearch.value = ''
	filterResponsible.value = ''
	filterType.value = ''
}

const hasFilters = computed(() => filterSearch.value || filterResponsible.value || filterType.value)
</script>

<template>
	<div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 pb-4">
		<div class="relative group flex-1 max-w-full lg:max-w-xs">
			<div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
				<svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
			</div>
			<input
				v-model="filterSearch"
				type="text"
				placeholder="Buscar tarefa..."
				class="w-full pl-8 pr-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder-slate-400"
			/>
		</div>
		<div class="flex gap-2 w-full lg:w-auto">
			<select
				v-model="filterResponsible"
				class="flex-1 lg:flex-none py-1.5 pl-2 pr-6 text-xs rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			>
				<option value="">Todos Resp.</option>
				<option v-for="member in config.teamMembers" :key="member.name" :value="member.name">{{ member.name }}</option>
			</select>
			<select
				v-model="filterType"
				class="flex-1 lg:flex-none py-1.5 pl-2 pr-6 text-xs rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			>
				<option value="">Todos Tipos</option>
				<option value="frontend">Front</option>
				<option value="backend">Back</option>
				<option value="qualidade">QA</option>
				<option value="other">Outro</option>
			</select>
		</div>
		<button v-if="hasFilters" @click="clearFilters" class="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 flex items-center gap-1">
			<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg> Limpar
		</button>
	</div>
</template>
