<script setup lang="ts">
import { ref, onMounted } from 'vue'
import TaskModal from '@/components/TaskModal.vue'
import ProjectConfig from '@/components/ProjectConfig.vue'
import ProjectActions from '@/components/ProjectActions.vue'
import GanttChart from '@/components/GanttChart.vue'
import DashboardView from '@/components/DashboardView.vue'
import SquadManagement from '@/components/SquadManagement.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import TourGuide from '@/components/TourGuide.vue'
import { useGantt } from '@/composables/useGantt'
import { useTheme } from '@/composables/useTheme'
import { useTour } from '@/composables/useTour'
import { focusMemberInputFlag } from '@/composables/useSquadFocus'

const { openCreateModal } = useGantt()
const { isDark, toggleDark } = useTheme()
const { start: startTour } = useTour()

const TOUR_KEY = 'gantt-ficator-tutorial-seen'
const currentTab = ref<'dashboard' | 'gantt' | 'config' | 'squads'>('dashboard')
const deferredPrompt = ref<any>(null)
const sidebarCollapsed = ref(false)

onMounted(() => {
	const hasSeenTutorial = localStorage.getItem(TOUR_KEY)
	if (!hasSeenTutorial) startTour()

	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault()
		deferredPrompt.value = e
	})
})

const installPwa = async () => {
	if (deferredPrompt.value) {
		deferredPrompt.value.prompt()
		const { outcome } = await deferredPrompt.value.userChoice
		if (outcome === 'accepted') deferredPrompt.value = null
	}
}

const pageTitles: Record<string, string> = {
	dashboard: 'Dashboard',
	gantt: 'Cronograma',
	squads: 'Squads & Membros',
	config: 'Configurações',
}

const navItems = [
	{
		id: 'dashboard',
		label: 'Dashboard',
		d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
	},
	{
		id: 'gantt',
		label: 'Cronograma',
		d: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 00-2-2h-2a2 2 0 00-2 2',
	},
	{
		id: 'squads',
		label: 'Squads',
		d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
	},
	{
		id: 'config',
		label: 'Config',
		d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
	},
]
</script>

<template>
	<div class="h-screen flex overflow-hidden bg-slate-50 dark:bg-[#0D1117] font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
		<ToastContainer />

		<!-- ── Sidebar (desktop md+) ──────────────────────────── -->
		<aside
			class="hidden md:flex flex-col flex-shrink-0 bg-white dark:bg-[#111318] border-r border-slate-200 dark:border-[#21262D] transition-[width] duration-300 z-40 overflow-hidden"
			:class="sidebarCollapsed ? 'w-14' : 'w-56'"
		>
			<!-- Logo -->
			<div class="flex items-center gap-3 px-3 h-14 border-b border-slate-100 dark:border-[#21262D] flex-shrink-0 overflow-hidden">
				<div class="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
					<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
					</svg>
				</div>
				<transition name="fade-slide">
					<div v-if="!sidebarCollapsed" class="overflow-hidden whitespace-nowrap">
						<span class="font-bold text-slate-800 dark:text-white text-sm tracking-tight">Gantt-ficator</span>
					</div>
				</transition>
			</div>

			<!-- Nav -->
			<nav class="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
				<button
					v-for="item in navItems"
					:key="item.id"
					:data-tour="`nav-${item.id}`"
					@click="currentTab = item.id as any"
					:title="sidebarCollapsed ? item.label : ''"
					class="w-full flex items-center rounded-lg text-sm font-medium transition-all duration-150 group"
					:class="[
						sidebarCollapsed ? 'justify-center py-2.5 px-2' : 'gap-3 px-3 py-2',
						currentTab === item.id
							? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
							: 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-800 dark:hover:text-slate-200',
					]"
				>
					<svg
						class="flex-shrink-0 transition-transform duration-150"
						:class="[sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4', currentTab === item.id ? '' : 'group-hover:scale-110']"
						fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"
					>
						<path stroke-linecap="round" stroke-linejoin="round" :d="item.d" />
					</svg>
					<span v-if="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
					<span v-if="!sidebarCollapsed && currentTab === item.id" class="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></span>
				</button>
			</nav>

			<!-- Bottom -->
			<div class="px-2 py-2 border-t border-slate-100 dark:border-[#21262D] space-y-0.5 flex-shrink-0">
				<button
					v-if="deferredPrompt"
					@click="installPwa"
					:title="sidebarCollapsed ? 'Instalar App' : ''"
					class="w-full flex items-center rounded-lg text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
					:class="sidebarCollapsed ? 'justify-center py-2.5 px-2' : 'gap-3 px-3 py-2'"
				>
					<svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
					<span v-if="!sidebarCollapsed" class="text-xs truncate">Instalar App</span>
				</button>

				<button
					@click="startTour"
					:title="sidebarCollapsed ? 'Ver tour' : ''"
					class="w-full flex items-center rounded-lg text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
					:class="sidebarCollapsed ? 'justify-center py-2.5 px-2' : 'gap-3 px-3 py-2'"
				>
					<svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
						<path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span v-if="!sidebarCollapsed" class="text-xs truncate">Ver tour</span>
				</button>

				<button
					@click="toggleDark"
					:title="isDark ? 'Modo claro' : 'Modo escuro'"
					class="w-full flex items-center rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
					:class="sidebarCollapsed ? 'justify-center py-2.5 px-2' : 'gap-3 px-3 py-2'"
				>
					<svg v-if="isDark" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
					<svg v-else class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
					<span v-if="!sidebarCollapsed" class="text-xs truncate">{{ isDark ? 'Modo claro' : 'Modo escuro' }}</span>
				</button>

				<button
					@click="sidebarCollapsed = !sidebarCollapsed"
					:title="sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'"
					class="w-full flex items-center rounded-lg text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
					:class="sidebarCollapsed ? 'justify-center py-2.5 px-2' : 'gap-3 px-3 py-2'"
				>
					<svg class="w-4 h-4 flex-shrink-0 transition-transform duration-300" :class="sidebarCollapsed ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
						<path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
					</svg>
					<span v-if="!sidebarCollapsed" class="text-xs truncate">Recolher</span>
				</button>
			</div>
		</aside>

		<!-- ── Main area ──────────────────────────────────────── -->
		<div class="flex-1 flex flex-col min-w-0 overflow-hidden">

			<!-- Topbar -->
			<header class="flex-shrink-0 h-14 bg-white dark:bg-[#111318] border-b border-slate-200 dark:border-[#21262D] flex items-center justify-between px-4 gap-3">
				<h1 class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate min-w-0 flex-1">
					{{ pageTitles[currentTab] }}
				</h1>

				<div class="flex items-center gap-2 flex-shrink-0">
					<!-- Tema — mobile only (desktop usa sidebar) -->
					<button
						@click="toggleDark"
						class="md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
						:title="isDark ? 'Modo claro' : 'Modo escuro'"
					>
						<svg v-if="isDark" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
						<svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
					</button>

					<!-- Nova Tarefa -->
					<button
						v-if="currentTab === 'dashboard' || currentTab === 'gantt'"
						data-tour="new-task-btn"
						@click="openCreateModal"
						class="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
					>
						<svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
						</svg>
						<span class="hidden sm:inline">Nova Tarefa</span>
					</button>

					<!-- Novo Membro -->
					<button
						v-else-if="currentTab === 'squads'"
						@click="focusMemberInputFlag++"
						class="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
					>
						<svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
						</svg>
						<span class="hidden sm:inline">Novo Membro</span>
					</button>
				</div>
			</header>

			<!-- Page content -->
			<!-- pb-16 garante espaço para a bottom nav no mobile (md:pb-0 remove no desktop) -->
			<main class="flex-1 overflow-hidden flex flex-col min-h-0">
				<transition name="fade" mode="out-in">
					<div v-if="currentTab === 'dashboard'" key="dashboard" class="flex-1 overflow-y-auto p-4 pb-20 md:p-5 md:pb-5">
						<DashboardView />
					</div>

					<div v-else-if="currentTab === 'gantt'" key="gantt" class="flex-1 p-2 pb-20 md:p-4 md:pb-4 flex flex-col min-h-0">
						<GanttChart class="flex-1 min-h-0" />
					</div>

					<div v-else-if="currentTab === 'squads'" key="squads" class="flex-1 overflow-y-auto p-4 pb-20 md:p-5 md:pb-5">
						<SquadManagement />
					</div>

					<div v-else-if="currentTab === 'config'" key="config" class="flex-1 overflow-y-auto p-4 pb-20 md:p-5 md:pb-5">
						<div class="max-w-5xl mx-auto space-y-6">
							<ProjectActions />
							<ProjectConfig />
						</div>
					</div>
				</transition>
			</main>
		</div>

		<!-- ── Bottom Navigation (mobile < md) ───────────────── -->
		<nav
			class="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-[#111318] border-t border-slate-200 dark:border-[#21262D] safe-bottom"
		>
			<div class="flex items-stretch h-14">
				<button
					v-for="item in navItems"
					:key="item.id"
					:data-tour="`nav-${item.id}`"
					@click="currentTab = item.id as any"
					class="flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors rounded-lg mx-0.5 my-1"
					:class="currentTab === item.id
						? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
						: 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'"
				>
					<svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
						<path stroke-linecap="round" stroke-linejoin="round" :d="item.d" />
					</svg>
					<span class="text-[10px] font-medium leading-none">{{ item.label }}</span>
				</button>
			</div>
		</nav>

		<TaskModal />
		<TourGuide @setTab="currentTab = $event as any" />
	</div>
</template>

<style>
/* Safe area para dispositivos com notch/home indicator (iPhone X+) */
.safe-bottom {
	padding-bottom: env(safe-area-inset-bottom, 0px);
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
.fade-slide-enter-active,
.fade-slide-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
	opacity: 0;
	transform: translateX(-6px);
}
</style>
