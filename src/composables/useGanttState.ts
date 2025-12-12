import { ref, watch } from 'vue'
import { format } from 'date-fns'
import type { Task, ProjectConfig } from '../types/gantt'

const STORAGE_KEY_TASKS = 'gantt-pro-tasks'
const STORAGE_KEY_CONFIG = 'gantt-pro-config'

const loadInitialTasks = (): Task[] => {
	try {
		const saved = localStorage.getItem(STORAGE_KEY_TASKS)
		if (saved) {
			return JSON.parse(saved).map((t: any) => ({
				...t,
				isNotPlanned: t.isNotPlanned ?? false,
				isCompleted: t.isCompleted ?? false,
				isMilestone: t.isMilestone ?? false,
				usType: t.usType || 'item',
				classification: typeof t.classification === 'number' ? t.classification : 0,
			}))
		}
	} catch (e) {
		console.error('Erro ao carregar tarefas:', e)
	}
	return []
}

const loadInitialConfig = (): ProjectConfig => {
	const defaultConfig: ProjectConfig = {
		projectStartDate: format(new Date(), 'yyyy-MM-dd'),
		deadline: '',
		skipWeekends: true,
		holidays: [],
		risks: [],
		teamMembers: [],
		sprints: [],
		squads: [],
	}

	try {
		const saved = localStorage.getItem(STORAGE_KEY_CONFIG)
		if (saved) {
			const parsed = JSON.parse(saved)
			return {
				...defaultConfig,
				...parsed,
				teamMembers: Array.isArray(parsed.teamMembers) ? parsed.teamMembers : [],
				squads: Array.isArray(parsed.squads) ? parsed.squads : [],
				holidays: Array.isArray(parsed.holidays) ? parsed.holidays : [],
			}
		}
	} catch (e) {
		console.error('Erro ao carregar configurações:', e)
	}
	return defaultConfig
}

const tasks = ref<Task[]>(loadInitialTasks())
const config = ref<ProjectConfig>(loadInitialConfig())

export function useGanttState() {
	watch(
		[tasks, config],
		() => {
			localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks.value))
			localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config.value))
		},
		{ deep: true },
	)

	return { tasks, config }
}
