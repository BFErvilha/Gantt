import { ref, computed } from 'vue'

export interface TourStep {
  title: string
  description: string
  targetSelector: string | null
  tab: 'dashboard' | 'gantt' | 'squads' | 'config' | null
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center'
  padding?: number
}

const TOUR_KEY = 'gantt-ficator-tutorial-seen'

const steps: TourStep[] = [
  {
    title: 'Bem-vindo ao Gantt-ficator!',
    description: 'Ferramenta de planejamento ágil para squads de desenvolvimento. Este tour mostra os recursos principais em menos de 1 minuto.',
    targetSelector: null,
    tab: null,
    placement: 'center',
  },
  {
    title: 'Squads & Membros',
    description: 'Comece aqui: cadastre colaboradores com nome e setor, depois organize-os em squads.',
    targetSelector: '[data-tour="nav-squads"]',
    tab: 'squads',
    placement: 'right',
    padding: 6,
  },
  {
    title: 'Configure as Sprints',
    description: 'Defina datas de início e fim, ritos de cerimônia e capacidade de cada sprint por squad.',
    targetSelector: '[data-tour="nav-config"]',
    tab: 'config',
    placement: 'right',
    padding: 6,
  },
  {
    title: 'Cronograma',
    description: 'Visualize todas as tarefas no tempo. Agrupe por responsável, sprint ou fluxo de dependência.',
    targetSelector: '[data-tour="nav-gantt"]',
    tab: 'gantt',
    placement: 'right',
    padding: 6,
  },
  {
    title: 'Criar Tarefas',
    description: 'Crie tarefas, vincule-as por User Story (US) e defina dependências para montar o fluxo do projeto.',
    targetSelector: '[data-tour="new-task-btn"]',
    tab: 'gantt',
    placement: 'bottom',
    padding: 6,
  },
  {
    title: 'Board Kanban',
    description: 'Alterne para o Board e veja tarefas em colunas. Tarefas do mesmo US ficam agrupadas com badges de tipo e responsável.',
    targetSelector: '[data-tour="board-btn"]',
    tab: 'gantt',
    placement: 'bottom',
    padding: 6,
  },
  {
    title: 'Dashboard',
    description: 'Métricas de capacidade, carga por membro e progresso das sprints — atualizadas em tempo real.',
    targetSelector: '[data-tour="nav-dashboard"]',
    tab: 'dashboard',
    placement: 'right',
    padding: 6,
  },
]

const active = ref(false)
const currentIndex = ref(0)

export function useTour() {
  const currentStep = computed(() => steps[currentIndex.value])
  const totalSteps = steps.length
  const isFirst = computed(() => currentIndex.value === 0)
  const isLast = computed(() => currentIndex.value === totalSteps - 1)

  const start = () => {
    currentIndex.value = 0
    active.value = true
  }

  const next = () => {
    if (!isLast.value) currentIndex.value++
  }

  const prev = () => {
    if (!isFirst.value) currentIndex.value--
  }

  const finish = () => {
    active.value = false
    localStorage.setItem(TOUR_KEY, 'true')
  }

  return { active, currentStep, currentIndex, totalSteps, isFirst, isLast, start, next, prev, finish }
}
