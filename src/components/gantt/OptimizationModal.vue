<script setup lang="ts">
defineProps<{
	isOpen: boolean
	results: string[]
}>()

const emit = defineEmits(['close'])
</script>

<template>
	<div v-if="isOpen" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
		<div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
			<div class="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20">
				<h3 class="font-bold text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
					Sugestões de Otimização de Sprint
				</h3>
				<button @click="emit('close')" class="text-slate-400 hover:text-slate-600">&times;</button>
			</div>
			<div class="p-6 overflow-y-auto custom-scrollbar space-y-4">
				<p class="text-sm text-slate-600 dark:text-slate-300">Analisamos as prioridades (Meta > Item), dependências e capacidade da equipe para sugerir a melhor ordem de execução:</p>

				<div v-if="results.length > 0" class="space-y-2">
					<div
						v-for="(msg, idx) in results"
						:key="idx"
						class="p-3 rounded border text-sm flex gap-3 items-start"
						:class="
							msg.includes('PRIORIDADE')
								? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200'
								: msg.includes('SOBRECARGA')
								? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
								: msg.includes('SEQUÊNCIA')
								? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
								: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
						"
					>
						<span class="text-xl mt-[-2px]">{{ msg.includes('PRIORIDADE') ? '⚡' : msg.includes('SOBRECARGA') ? '⚠️' : msg.includes('SEQUÊNCIA') ? '🔢' : '✅' }}</span>
						<span>{{ msg }}</span>
					</div>
				</div>
				<div v-else class="text-center text-slate-500 text-sm italic">Nenhuma sugestão no momento.</div>
			</div>
			<div class="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
				<button @click="emit('close')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-sm">Entendido</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
	height: 8px;
	width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background-color: #cbd5e1;
	border-radius: 4px;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
	background-color: #475569;
}
</style>
