<script setup lang="ts">
import { ref } from 'vue'
import TaskModal from '@/components/TaskModal.vue'
import ProjectConfig from '@/components/ProjectConfig.vue'
import ProjectActions from '@/components/ProjectActions.vue'
import GanttChart from '@/components/GanttChart.vue'
import DashboardView from '@/components/DashboardView.vue'
import { useGantt } from '@/composables/useGantt'

const { openCreateModal } = useGantt()

const currentTab = ref<'dashboard' | 'gantt'>('dashboard')
</script>

<template>
	<div class="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
		<header class="bg-slate-900 text-white p-4 shadow-md z-50 sticky top-0">
			<div class="max-w-[1600px] mx-auto flex items-center justify-between">
				<div class="flex items-center gap-4 sm:gap-6">
					<div class="flex items-center gap-3">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
						</svg>
						<h1 class="text-xl font-bold tracking-tight hidden md:block">Gantt-ficator</h1>
					</div>

					<nav class="flex bg-slate-800 rounded-lg p-1">
						<button @click="currentTab = 'dashboard'" class="px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2" :class="currentTab === 'dashboard' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
								/>
							</svg>
							<span class="hidden sm:inline">Dashboard</span>
						</button>
						<button @click="currentTab = 'gantt'" class="px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2" :class="currentTab === 'gantt' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
							<span class="hidden sm:inline">Cronograma</span>
						</button>
					</nav>
				</div>

				<div class="flex items-center gap-3">
					<button @click="openCreateModal" class="bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/50 transition-transform hover:scale-105 active:scale-95">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
						<span class="hidden sm:inline">Nova Tarefa</span>
					</button>
				</div>
			</div>
		</header>

		<main class="flex-1 w-full max-w-[1600px] mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
			<aside class="lg:col-span-3 space-y-6 flex flex-col order-2 lg:order-1">
				<ProjectConfig />
				<ProjectActions />
			</aside>

			<section class="lg:col-span-9 order-1 lg:order-2 flex flex-col min-h-[600px]">
				<DashboardView v-if="currentTab === 'dashboard'" />

				<GanttChart v-if="currentTab === 'gantt'" />
			</section>
		</main>

		<TaskModal />
	</div>
</template>

<style>
body {
	margin: 0;
	font-family: 'Inter', 'Segoe UI', sans-serif;
	background-color: #f8fafc;
}
</style>
