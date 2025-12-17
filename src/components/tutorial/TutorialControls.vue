<script setup lang="ts">
defineProps<{
	isFirst: boolean
	isLast: boolean
}>()

const emit = defineEmits(['prev', 'next', 'finish'])
</script>

<template>
	<div class="flex justify-between items-center mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
		<button @click="emit('prev')" class="px-4 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm transition-colors flex items-center gap-1" :class="{ invisible: isFirst }">
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Anterior
		</button>

		<button v-if="!isLast" @click="emit('next')" class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2">
			Próximo
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>

		<button v-else @click="emit('finish')" class="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-green-900/20 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2">Começar a Usar 🚀</button>
	</div>
</template>
