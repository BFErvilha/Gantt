<script setup lang="ts">
defineProps<{
	step: {
		icon: string
		title: string
		highlight?: string
	}
	totalSteps: number
	currentStepIndex: number
}>()

const emit = defineEmits(['goTo'])
</script>

<template>
	<div class="bg-slate-900 text-white p-8 md:w-1/3 flex flex-col justify-between relative overflow-hidden transition-colors">
		<div class="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
			<svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
				<path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
			</svg>
		</div>

		<div class="relative z-10">
			<div class="text-6xl mb-6 transform transition-transform hover:scale-110 duration-300 select-none">
				{{ step.icon }}
			</div>
			<h2 class="text-2xl font-bold leading-tight">{{ step.title }}</h2>
			<p v-if="step.highlight" class="text-blue-400 font-bold text-xs uppercase tracking-wider mt-3 bg-blue-400/10 inline-block px-2 py-1 rounded">
				{{ step.highlight }}
			</p>
		</div>

		<div class="flex gap-2 mt-8 relative z-10">
			<button
				v-for="(_, index) in totalSteps"
				:key="index"
				class="h-1.5 rounded-full transition-all duration-500 cursor-pointer"
				:class="index === currentStepIndex ? 'w-8 bg-blue-500' : 'w-2 bg-slate-700 hover:bg-slate-600'"
				@click="emit('goTo', index)"
				:aria-label="`Ir para passo ${index + 1}`"
			></button>
		</div>
	</div>
</template>
