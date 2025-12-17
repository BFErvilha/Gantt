<script setup lang="ts">
defineProps<{
	label: string
	colorClass: string
	onClick: () => void
}>()
</script>

<template>
	<div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group cursor-pointer flex flex-col items-center justify-center gap-2 text-center" @click="onClick">
		<div class="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform" :class="colorClass">
			<slot name="icon"></slot>
		</div>
		<div>
			<h3 class="font-bold text-slate-700 dark:text-slate-200 text-sm group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
				{{ label }}
			</h3>
		</div>
	</div>
</template>
