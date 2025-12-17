<script setup lang="ts">
interface RiskItem {
	type: string
	title: string
	message: string
	styles: string
	icon: string
}

defineProps<{
	risks: RiskItem[]
}>()
</script>

<template>
	<div v-if="risks.length > 0" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm animate-fade-in transition-colors">
		<h3 class="text-slate-700 dark:text-slate-200 font-bold text-base mb-4 flex items-center gap-2">
			<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
			Monitoramento de Riscos
			<span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-extrabold">{{ risks.length }}</span>
		</h3>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
			<div v-for="(risk, idx) in risks" :key="idx" class="flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-md" :class="risk.styles">
				<div class="flex-shrink-0 mt-0.5 p-1.5 bg-white/50 dark:bg-black/20 rounded-full">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="risk.icon" />
					</svg>
				</div>
				<div class="flex-1 min-w-0">
					<div class="text-xs font-black uppercase tracking-wide opacity-80 mb-0.5">{{ risk.title }}</div>
					<div class="text-sm font-medium leading-snug">{{ risk.message }}</div>
				</div>
			</div>
		</div>
	</div>
</template>
