<script setup lang="ts">
import { ref, computed } from 'vue'
import TutorialSidebar from '@/components/tutorial/TutorialSidebar.vue'
import TutorialContent from '@/components/tutorial/TutorialContent.vue'
import TutorialControls from '@/components/tutorial/TutorialControls.vue'

const emit = defineEmits(['complete'])

const currentStep = ref(0)

const steps = [
	{
		title: 'Bem-vindo ao Gantt-ficator',
		icon: '👋',
		content: 'Sua ferramenta completa para planejamento ágil e visual. O sistema foi atualizado para suportar múltiplas Squads e Otimização Inteligente.',
		points: ['Gestão por Squads.', 'Planejamento de Sprints.', 'Sugestões de Otimização via IA.'],
	},
	{
		title: '1. Gestão de Squads (Novo!)',
		icon: '👥',
		highlight: 'Aba: Squads',
		content: 'O ponto de partida. Agora você organiza sua equipe em células ágeis.',
		points: [
			'Crie Squads: Defina o nome e a cor para identificar cada time.',
			'Diretório Geral: Cadastre todos os colaboradores em uma lista única.',
			'Vínculo Flexível: Adicione membros às Squads e defina a capacidade (horas/dia) específica para aquele time.',
			'Day-Offs: Gerencie as folgas dos membros diretamente no cadastro.',
		],
	},
	{
		title: '2. Configuração & Sprints',
		icon: '⚙️',
		highlight: 'Aba: Configurações',
		content: 'Onde o tempo é gerenciado. Agora as configurações são contextualizadas.',
		points: [
			'Seletor de Contexto: Escolha se quer configurar o "Projeto Global" ou uma "Squad" específica.',
			'Ciclo de Sprints: Crie Sprints dentro de cada Squad (ex: Sprint 24 - Squad Alpha).',
			'Datas e Feriados: Defina feriados globais ou específicos por Squad.',
			'Ajuste Fino: Altere a capacidade ou adicione folgas de um membro apenas para a duração de uma Sprint específica.',
		],
	},
	{
		title: '3. Planejamento de Tarefas',
		icon: '📝',
		highlight: 'Botão: Nova Tarefa',
		content: 'Mais inteligência na criação de demandas.',
		points: [
			'Prioridade da US: Defina se é uma "Meta" (Goal - Alta prioridade) ou "Item" (Normal).',
			'Classificação: Use números (1, 2, 3...) para ordenar a importância dentro da prioridade.',
			'Vínculo Automático: Ao selecionar uma Sprint, o sistema filtra apenas os membros daquela Squad.',
			'Fluxo Completo: Gera automaticamente a cadeia "Backend → Frontend → QA" com os gaps de tempo corretos.',
		],
	},
	{
		title: '4. Cronograma Inteligente',
		icon: '📅',
		highlight: 'Aba: Cronograma',
		content: 'Visualize e otimize o trabalho no tempo.',
		points: [
			'Filtro de Squad: Alterne entre a "Visão Geral" (todas as squads) ou foque em um time específico.',
			'Botão Otimizar ⚡: Receba sugestões automáticas para resolver conflitos de prioridade (Item antes de Meta) e sobrecarga.',
			'Linhas de Dependência: O sistema respeita intervalos (ex: 3 dias entre Back e Front).',
			'Edição Rápida: Arraste tarefas para mudar datas ou clique para editar.',
		],
	},
	{
		title: '5. Dashboard e Riscos',
		icon: '🚨',
		highlight: 'Aba: Dashboard',
		content: 'Monitoramento proativo da saúde do projeto.',
		points: [
			'Análise de Riscos: O sistema avisa automaticamente sobre sobrecarga, estouro de sprint e conflitos de agenda (férias/feriados).',
			'Desvio de Prazos: Compare o planejado (Baseline) com o real.',
			'Carga de Trabalho: Veja quem está sobrecarregado (vermelho) ou livre (azul).',
			'Progresso: Acompanhe o avanço físico e temporal do projeto.',
		],
	},
]

const currentStepData = computed(() => steps[currentStep.value])
const isLastStep = computed(() => currentStep.value === steps.length - 1)

const nextStep = () => {
	if (!isLastStep.value) currentStep.value++
}
const prevStep = () => {
	if (currentStep.value > 0) currentStep.value--
}
const goToStep = (index: number) => {
	currentStep.value = index
}
const finish = () => {
	emit('complete')
}
</script>

<template>
	<div class="flex flex-col items-center justify-center min-h-[500px] p-4 animate-fade-in">
		<div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row min-h-[550px] border border-slate-100 dark:border-slate-700">
			<TutorialSidebar :step="currentStepData" :total-steps="steps.length" :current-step-index="currentStep" @go-to="goToStep" />

			<div class="p-8 md:w-2/3 flex flex-col bg-white dark:bg-slate-800 transition-colors">
				<TutorialContent :content="currentStepData.content" :points="currentStepData.points" />

				<TutorialControls :is-first="currentStep === 0" :is-last="isLastStep" @prev="prevStep" @next="nextStep" @finish="finish" />
			</div>
		</div>
	</div>
</template>

<style scoped>
.animate-fade-in {
	animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
	from {
		opacity: 0;
		transform: scale(0.98);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}
</style>
