<script setup lang="ts">
defineProps<{
	isOpen: boolean
	title: string
	message: string
}>()

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
	<Teleport to="body">
		<div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="emit('cancel')"></div>

			<div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-200 transform transition-all scale-100">
				<div class="flex items-start gap-4">
					<div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
						<svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>

					<div class="flex-1">
						<h3 class="text-lg font-bold text-slate-800">{{ title }}</h3>
						<p class="text-sm text-slate-600 mt-2">{{ message }}</p>
					</div>
				</div>

				<div class="mt-6 flex justify-end gap-3">
					<button @click="emit('cancel')" class="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 font-medium transition-colors text-sm">Cancelar</button>
					<button @click="emit('confirm')" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium transition-colors text-sm shadow-sm">Sim, excluir</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>
