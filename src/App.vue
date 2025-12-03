<script setup lang="ts">
import TaskForm from '@/components/TaskForm.vue'
import ProjectConfig from '@/components/ProjectConfig.vue'
import ProjectActions from '@/components/ProjectActions.vue'
import GanttChart from '@/components/GanttChart.vue'
</script>

<template>
	<div class="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
		<header class="bg-slate-900 text-white p-4 shadow-md z-30 sticky top-0">
			<div class="max-w-[1600px] mx-auto flex items-center justify-between">
				<div class="flex items-center gap-3">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
					</svg>
					<h1 class="text-xl font-bold tracking-tight">Gantt-ficator <span class="text-blue-400 font-light"></span></h1>
				</div>
				<div class="text-sm text-slate-400 hidden sm:block"></div>
			</div>
		</header>

		<main class="flex-1 w-full max-w-[1600px] mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
			<aside class="lg:col-span-4 space-y-6 flex flex-col order-2 lg:order-1">
				<TaskForm />
				<ProjectConfig />
				<ProjectActions />
			</aside>

			<section class="lg:col-span-8 h-[500px] lg:h-auto min-h-[500px] order-1 lg:order-2">
				<GanttChart />
			</section>
		</main>
	</div>
</template>

<style>
/* Reset global simples */
body {
	margin: 0;
	font-family: 'Inter', 'Segoe UI', sans-serif;
	background-color: #f8fafc;
}
</style>
