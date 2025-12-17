<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { notifications, remove } = useToast()

const getIcon = (type: string) => {
	switch (type) {
		case 'success':
			return '✅'
		case 'error':
			return '❌'
		case 'warning':
			return '⚠️'
		default:
			return 'ℹ️'
	}
}

const getStyles = (type: string) => {
	switch (type) {
		case 'success':
			return 'border-green-500 bg-white dark:bg-slate-800'
		case 'error':
			return 'border-red-500 bg-white dark:bg-slate-800'
		case 'warning':
			return 'border-amber-500 bg-white dark:bg-slate-800'
		default:
			return 'border-blue-500 bg-white dark:bg-slate-800'
	}
}
</script>

<template>
	<div class="fixed top-20 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
		<transition-group name="toast">
			<div v-for="toast in notifications" :key="toast.id" class="pointer-events-auto min-w-[300px] max-w-sm p-4 rounded-lg shadow-xl border-l-4 flex items-start gap-3 transform transition-all duration-300 dark:text-white" :class="getStyles(toast.type)">
				<span class="text-lg">{{ getIcon(toast.type) }}</span>
				<div class="flex-1 text-sm font-medium pt-0.5">{{ toast.message }}</div>
				<button @click="remove(toast.id)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">&times;</button>
			</div>
		</transition-group>
	</div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
	transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
	opacity: 0;
	transform: translateX(30px);
}
</style>
