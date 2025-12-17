<script setup lang="ts">
defineProps<{
	title: string
}>()
</script>

<template>
	<div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between transition-colors relative overflow-hidden h-full">
		<span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{{ title }}</span>

		<div class="mt-1">
			<slot name="value"></slot>
		</div>

		<div class="mt-2">
			<slot name="footer"></slot>
		</div>

		<slot name="decoration"></slot>
	</div>
</template>
