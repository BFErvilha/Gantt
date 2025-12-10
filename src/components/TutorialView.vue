<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits(['complete'])

const currentStep = ref(0)

const steps = [
	{
		title: 'Bem-vindo ao Gantt-ficator',
		icon: '👋',
		content: 'Sua ferramenta completa para planejamento ágil e visual. Vamos fazer um tour rápido para você dominar o controle dos seus projetos.',
		points: ['Planejamento visual intuitivo.', 'Cálculo automático de prazos.', 'Gestão de capacidade da equipe.'],
	},
	{
		title: '1. Configuração (O Alicerce)',
		icon: '⚙️',
		highlight: 'Aba: Configurações',
		content: 'Antes de criar tarefas, é essencial configurar o ambiente do projeto.',
		points: [
			'Data de Início: Define o "dia zero" do seu cronograma.',
			'Equipe e Capacidade: Cadastre os membros e suas cargas horárias (ex: 8h/dia). Isso define a duração real das tarefas.',
			'Sprints: Defina os ciclos de desenvolvimento. O sistema avisará se uma tarefa "estourar" a data da sprint.',
			'Feriados: Adicione dias não úteis para o cálculo pular essas datas.',
		],
	},
	{
		title: '2. Planejamento de Tarefas',
		icon: '📝',
		highlight: 'Botão: Nova Tarefa',
		content: 'Você tem dois modos poderosos para adicionar trabalho:',
		points: [
			'Tarefa Simples: Para atividades isoladas. O sistema sugere a duração baseada no esforço (horas) e na capacidade do responsável.',
			'Fluxo Completo (Recomendado): Cria automaticamente a cadeia "Backend → Frontend → QA" (ou Fullstack) já com as dependências vinculadas.',
			'Filtro Inteligente: Ao selecionar um setor, mostramos apenas os profissionais qualificados.',
		],
	},
	{
		title: '3. O Cronograma (Gantt)',
		icon: '📅',
		highlight: 'Aba: Cronograma',
		content: 'A visualização principal onde você gerencia o tempo.',
		points: [
			'Identificação Visual: Use cores personalizadas para organizar tarefas por tipo, setor ou prioridade.',
			'Dependências: Setas mostram o que impede o quê (tarefa bloqueadora → tarefa dependente).',
			'Caminho Crítico: Use o botão de filtro para ver as tarefas que impactam diretamente o prazo final.',
			'Análise de Riscos: Fique de olho no botão de alerta no topo. Ele avisa sobre sobrecarga de equipe e conflitos de férias.',
		],
	},
	{
		title: '4. Dashboard Gerencial',
		icon: '📊',
		highlight: 'Aba: Dashboard',
		content: 'Acompanhe a saúde do projeto sem planilhas complexas.',
		points: [
			'Progresso Físico: % de tempo decorrido vs. % de tarefas entregues.',
			'Carga de Trabalho: Gráficos mostram quem está sobrecarregado (vermelho) ou ocioso (azul).',
			'Status das Sprints: Visão clara do planejado vs. realizado por ciclo.',
			'Carry-over: Monitoramento de tarefas não planejadas que entraram no escopo.',
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
