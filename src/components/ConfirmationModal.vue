<script setup lang="ts">
defineProps<{
	isOpen: boolean
	title: string
	message: string
}>()

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
	<div v-if="isOpen" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
		<div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm overflow-hidden transform transition-all">
			<div class="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
				<h3 class="font-bold text-slate-800 dark:text-slate-100">{{ title }}</h3>
				<button @click="emit('cancel')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</button>
			</div>
			<div class="p-6">
				<p class="text-slate-600 dark:text-slate-300 text-sm">{{ message }}</p>
			</div>
			<div class="p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
				<button @click="emit('cancel')" class="px-4 py-2 rounded text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
				<button @click="emit('confirm')" class="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">Confirmar</button>
			</div>
		</div>
	</div>
</template>
