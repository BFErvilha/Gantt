<script setup lang="ts">
import { ref, computed } from 'vue'

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

const isLastStep = computed(() => currentStep.value === steps.length - 1)

const nextStep = () => {
	if (!isLastStep.value) currentStep.value++
}

const prevStep = () => {
	if (currentStep.value > 0) currentStep.value--
}

const finish = () => {
	emit('complete')
}
</script>

<template>
	<div class="flex flex-col items-center justify-center min-h-[500px] p-4 animate-fade-in">
		<div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row min-h-[550px] border border-slate-100 dark:border-slate-700">
			<div class="bg-slate-900 text-white p-8 md:w-1/3 flex flex-col justify-between relative overflow-hidden transition-colors">
				<div class="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
					<svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
						<path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
					</svg>
				</div>

				<div class="relative z-10">
					<div class="text-6xl mb-6 transform transition-transform hover:scale-110 duration-300">{{ steps[currentStep].icon }}</div>
					<h2 class="text-2xl font-bold leading-tight">{{ steps[currentStep].title }}</h2>
					<p v-if="steps[currentStep].highlight" class="text-blue-400 font-bold text-xs uppercase tracking-wider mt-3 bg-blue-400/10 inline-block px-2 py-1 rounded">
						{{ steps[currentStep].highlight }}
					</p>
				</div>

				<div class="flex gap-2 mt-8 relative z-10">
					<div v-for="(_, index) in steps" :key="index" class="h-1.5 rounded-full transition-all duration-500 cursor-pointer" :class="index === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-slate-700 hover:bg-slate-600'" @click="currentStep = index"></div>
				</div>
			</div>

			<div class="p-8 md:w-2/3 flex flex-col bg-white dark:bg-slate-800 transition-colors">
				<div class="flex-1">
					<p class="text-lg text-slate-600 dark:text-slate-300 mb-6 leading-relaxed border-b border-slate-100 dark:border-slate-700 pb-4">
						{{ steps[currentStep].content }}
					</p>

					<ul v-if="steps[currentStep].points" class="space-y-3">
						<li v-for="(point, idx) in steps[currentStep].points" :key="idx" class="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 transition-all hover:translate-x-1">
							<svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span class="text-sm text-slate-700 dark:text-slate-200 leading-snug">{{ point }}</span>
						</li>
					</ul>
				</div>

				<div class="flex justify-between items-center mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
					<button @click="prevStep" class="px-4 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm transition-colors flex items-center gap-1" :class="{ invisible: currentStep === 0 }">
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
						Anterior
					</button>

					<button v-if="!isLastStep" @click="nextStep" class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2">
						Próximo
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
					</button>

					<button v-else @click="finish" class="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-green-900/20 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2">Começar a Usar 🚀</button>
				</div>
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
