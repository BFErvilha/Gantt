export interface Sprint {
	id: string
	name: string
	startDate: string
	endDate: string
	squadId?: string
}

export interface Squad {
	id: string
	name: string
	color: string
	startDate: string
	deadline: string
	skipWeekends: boolean
	holidays: string[]
	sprints: Sprint[]
}

export interface TeamMember {
	name: string
	capacity: number
	daysOff: string[]
	sector: string
	squadIds: string[]
}

export interface Task {
	id: string
	name: string
	usId?: string
	customId?: string
	duration: number
	dependencyId: string | null
	color: string
	type: 'frontend' | 'backend' | 'qualidade' | 'other'
	responsible?: string
	effort?: number
	manualStartDate?: string
	startDate?: Date
	endDate?: Date
	offsetDays?: number
	calendarDuration?: number
	formattedStartDate?: string
	formattedEndDate?: string
	sprintId?: string
	isNotPlanned?: boolean
	isCompleted?: boolean
	completedDate?: string
	isMilestone?: boolean
	originalStartDate?: string
	originalEndDate?: string
	usType?: 'goal' | 'item'
	classification?: number
}

export interface ProjectConfig {
	projectStartDate: string
	deadline: string
	skipWeekends: boolean
	holidays: string[]
	risks: string[]
	teamMembers: TeamMember[]
	sprints: Sprint[]
	squads: Squad[]
}

export type ViewMode = 'project' | 'month' | 'week'
