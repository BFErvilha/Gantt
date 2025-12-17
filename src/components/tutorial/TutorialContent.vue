<script setup lang="ts">
defineProps<{
	content: string
	points?: string[]
}>()
</script>

<template>
	<div class="flex-1">
		<p class="text-lg text-slate-600 dark:text-slate-300 mb-6 leading-relaxed border-b border-slate-100 dark:border-slate-700 pb-4">
			{{ content }}
		</p>

		<ul v-if="points" class="space-y-3">
			<li v-for="(point, idx) in points" :key="idx" class="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 transition-all hover:translate-x-1">
				<svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span class="text-sm text-slate-700 dark:text-slate-200 leading-snug">{{ point }}</span>
			</li>
		</ul>
	</div>
</template>
