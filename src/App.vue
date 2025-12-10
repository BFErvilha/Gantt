<script setup lang="ts">
import { ref, onMounted } from 'vue'
import TaskModal from '@/components/TaskModal.vue'
import ProjectConfig from '@/components/ProjectConfig.vue'
import ProjectActions from '@/components/ProjectActions.vue'
import GanttChart from '@/components/GanttChart.vue'
import DashboardView from '@/components/DashboardView.vue'
import TutorialView from '@/components/TutorialView.vue'
import { useGantt } from '@/composables/useGantt'
import { useTheme } from '@/composables/useTheme'

const { openCreateModal } = useGantt()
const { isDark, toggleDark } = useTheme()

const STORAGE_KEY_TUTORIAL = 'gantt-ficator-tutorial-seen'
const currentTab = ref<'dashboard' | 'gantt' | 'config' | 'tutorial'>('dashboard')

onMounted(() => {
	const hasSeenTutorial = localStorage.getItem(STORAGE_KEY_TUTORIAL)
	if (!hasSeenTutorial) {
		currentTab.value = 'tutorial'
	}
})

const completeTutorial = () => {
	localStorage.setItem(STORAGE_KEY_TUTORIAL, 'true')
	currentTab.value = 'dashboard'
	window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
	<div class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
		<header class="bg-slate-900 dark:bg-slate-950 text-white p-4 shadow-md z-50 sticky top-0 border-b border-slate-800">
			<div class="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
				<div class="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
					<div class="flex items-center gap-3">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
						</svg>
						<h1 class="text-xl font-bold tracking-tight hidden lg:block">Gantt-ficator</h1>
					</div>

					<nav class="flex bg-slate-800 dark:bg-slate-900 rounded-lg p-1 border border-slate-700 overflow-x-auto">
						<button
							@click="currentTab = 'dashboard'"
							class="px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap"
							:class="currentTab === 'dashboard' ? 'bg-slate-700 dark:bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'"
							title="Dashboard"
						>
							<span class="text-lg">📊</span>
							<span class="hidden sm:inline">Dashboard</span>
						</button>
						<button
							@click="currentTab = 'gantt'"
							class="px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap"
							:class="currentTab === 'gantt' ? 'bg-slate-700 dark:bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'"
							title="Cronograma"
						>
							<span class="text-lg">📅</span>
							<span class="hidden sm:inline">Cronograma</span>
						</button>
						<button
							@click="currentTab = 'config'"
							class="px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap"
							:class="currentTab === 'config' ? 'bg-slate-700 dark:bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'"
							title="Configurações"
						>
							<span class="text-lg">⚙️</span>
							<span class="hidden sm:inline">Configurações</span>
						</button>
						<button
							@click="currentTab = 'tutorial'"
							class="px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap"
							:class="currentTab === 'tutorial' ? 'bg-slate-700 dark:bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'"
							title="Tutorial"
						>
							<span class="text-lg">🎓</span>
							<span class="hidden sm:inline">Tutorial</span>
						</button>
					</nav>
				</div>

				<div class="flex items-center gap-3 w-full md:w-auto justify-end">
					<button @click="toggleDark" class="p-2 rounded-lg bg-slate-800 dark:bg-slate-700 text-yellow-400 dark:text-slate-200 hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors border border-slate-700">
						<svg v-if="isDark" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
						</svg>
						<svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
					</button>

					<button @click="openCreateModal" class="bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/50 transition-transform hover:scale-105 active:scale-95 whitespace-nowrap">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
						<span class="hidden sm:inline">Nova Tarefa</span>
						<span class="sm:hidden">Nova</span>
					</button>
				</div>
			</div>
		</header>

		<main class="flex-1 w-full max-w-[1600px] mx-auto p-4 lg:p-6">
			<transition name="fade" mode="out-in">
				<div v-if="currentTab === 'dashboard'" key="dashboard">
					<DashboardView />
				</div>

				<div v-else-if="currentTab === 'gantt'" key="gantt">
					<GanttChart />
				</div>

				<div v-else-if="currentTab === 'config'" key="config" class="max-w-6xl mx-auto space-y-8 animate-fade-in">
					<section>
						<h2 class="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 px-1">Gerenciamento de Dados</h2>
						<ProjectActions />
					</section>
					<ProjectConfig />
				</div>

				<div v-else-if="currentTab === 'tutorial'" key="tutorial">
					<TutorialView @complete="completeTutorial" />
				</div>
			</transition>
		</main>

		<TaskModal />
	</div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
