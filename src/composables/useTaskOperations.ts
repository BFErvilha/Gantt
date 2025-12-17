import { format } from 'date-fns'
import { useGanttState } from './useGanttState'
import type { Task } from '../types/gantt'

export function useTaskOperations() {
	const { tasks } = useGanttState()

	const addTask = (task: Partial<Task>) => {
		tasks.value.push({
			id: task.id || crypto.randomUUID(),
			usId: task.usId || '',
			customId: task.customId || '',
			name: task.name || 'Nova Tarefa',
			duration: task.duration || 1,
			dependencyId: task.dependencyId || null,
			color: task.color || '#3b82f6',
			type: task.type || 'other',
			responsible: task.responsible || '',
			effort: task.effort || 0,
			sprintId: task.sprintId,
			squadId: task.squadId,
			isNotPlanned: !task.sprintId,
			isCompleted: false,
			isMilestone: task.isMilestone || false,
			usType: task.usType || 'item',
			classification: task.classification || 0,
		})
	}

	const updateTask = (updatedTask: Task) => {
		const index = tasks.value.findIndex(t => t.id === updatedTask.id)
		if (index !== -1) tasks.value[index] = { ...updatedTask }
	}

	const removeTask = (id: string) => {
		tasks.value = tasks.value.filter(t => t.id !== id)
		tasks.value.forEach(t => {
			if (t.dependencyId === id) t.dependencyId = null
		})
	}

	const toggleTaskCompletion = (taskId: string) => {
		const task = tasks.value.find(t => t.id === taskId)
		if (task) {
			task.isCompleted = !task.isCompleted
			task.completedDate = task.isCompleted ? format(new Date(), 'yyyy-MM-dd') : undefined
		}
	}

	const moveTask = (taskId: string, newStartDate: Date) => {
		const task = tasks.value.find(t => t.id === taskId)
		if (task) task.manualStartDate = format(newStartDate, 'yyyy-MM-dd')
	}

	const importTasks = (newTasks: Partial<Task>[]) => {
		tasks.value = newTasks.map(t => ({
			id: t.id || crypto.randomUUID(),
			name: t.name || 'Sem nome',
			duration: t.duration || 1,
			dependencyId: t.dependencyId || null,
			type: t.type || 'other',
			responsible: t.responsible || '',
			effort: t.effort || 0,
			sprintId: t.sprintId || undefined,
			squadId: t.squadId || undefined,
			isNotPlanned: !t.sprintId,
			isCompleted: false,
			usType: t.usType || 'item',
			color: t.color || '#3b82f6',
			classification: t.classification || 0,
		})) as Task[]
	}

	return {
		addTask,
		updateTask,
		removeTask,
		toggleTaskCompletion,
		moveTask,
		importTasks,
	}
}
