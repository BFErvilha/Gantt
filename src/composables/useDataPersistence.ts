import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import type { Task, ProjectConfig } from './useGantt'

export function useDataPersistence() {
	const exportToPDF = (tasks: Task[], config: ProjectConfig, risks: string[]) => {
		const doc = new jsPDF()

		doc.setFontSize(18)
		doc.setTextColor(40, 40, 40)
		doc.text('Relatório de Projeto: Gantt-ficator', 14, 20)

		doc.setFontSize(10)
		doc.setTextColor(100, 100, 100)
		doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 26)
		doc.line(14, 30, 196, 30)

		doc.setFontSize(12)
		doc.setTextColor(0, 0, 0)
		doc.text('Resumo Executivo', 14, 38)

		doc.setFontSize(10)
		const startDate = config.projectStartDate ? format(new Date(config.projectStartDate), 'dd/MM/yyyy') : 'N/A'
		const deadline = config.deadline ? format(new Date(config.deadline), 'dd/MM/yyyy') : 'N/A'
		doc.text(`Início: ${startDate}`, 14, 45)
		doc.text(`Deadline: ${deadline}`, 80, 45)
		doc.text(`Equipe: ${config.teamMembers?.length || 0} membros`, 140, 45)

		let currentY = 55
		if (risks.length > 0) {
			doc.setFontSize(11)
			doc.setTextColor(185, 28, 28)
			doc.text('⚠️ Riscos e Alertas Identificados:', 14, currentY)
			doc.setFontSize(9)
			doc.setTextColor(60, 60, 60)
			risks.forEach(risk => {
				currentY += 6
				doc.text(`• ${risk}`, 14, currentY)
			})
			currentY += 10
		}

		autoTable(doc, {
			startY: currentY,
			head: [['ID', 'Tarefa', 'Tipo', 'Resp.', 'Status', 'Início', 'Fim']],
			body: tasks.map(t => [
				t.usId || '-',
				t.usId ? `[${t.usId}] ${t.name}` : t.name,
				t.type.toUpperCase(),
				t.responsible || '-',
				t.status === 'completed' ? 'Concluído' : t.status === 'active' ? 'Ativo' : 'Novo',
				t.formattedStartDate || '',
				t.formattedEndDate || '',
			]),
			theme: 'grid',
			headStyles: { fillColor: [59, 130, 246] },
			styles: { fontSize: 7, cellPadding: 2 },
			alternateRowStyles: { fillColor: [249, 250, 251] },
		})

		doc.save(`Gantt-Relatorio-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
	}

	const exportToExcel = (tasks: Task[], config: ProjectConfig) => {
		const wb = XLSX.utils.book_new()

		// === Tarefas (all fields) ===
		const wsTasks = XLSX.utils.json_to_sheet(
			tasks.map(t => ({
				ID: t.id,
				US_ID: t.usId || '',
				ID_Tarefa: t.customId || '',
				Tarefa: t.name,
				Tipo: t.type,
				Responsavel: t.responsible || '',
				Esforco_Horas: t.effort || 0,
				Duracao_Dias: t.duration,
				Cor: t.color || '#3b82f6',
				Sprint_ID: t.sprintId || '',
				Dependencia_ID: t.dependencyId || '',
				Meta: t.usType === 'goal' ? 'Sim' : 'Não',
				Classificacao: t.classification || 0,
				Status: t.status || 'new',
				Marco: t.isMilestone ? 'Sim' : 'Não',
				Nao_Planejado: t.isNotPlanned ? 'Sim' : 'Não',
				Data_Inicio_Manual: t.manualStartDate || '',
				Data_Inicio_Original: t.originalStartDate || '',
				Data_Fim_Original: t.originalEndDate || '',
				Data_Conclusao: t.completedDate || '',
			})),
		)
		XLSX.utils.book_append_sheet(wb, wsTasks, 'Tarefas')

		// === Squads ===
		const wsSquads = XLSX.utils.json_to_sheet(
			config.squads.map(s => ({
				ID: s.id,
				Nome: s.name,
				Cor: s.color,
				Inicio_Squad: s.startDate,
				Prazo_Squad: s.deadline,
				Pular_Fins_Semana: s.skipWeekends ? 'Sim' : 'Não',
				Feriados: s.holidays.join(';'),
			})),
		)
		XLSX.utils.book_append_sheet(wb, wsSquads, 'Squads')

		// === Sprints (separate sheet) ===
		const allSprints = config.squads.flatMap(s =>
			s.sprints.map(sp => ({
				ID: sp.id,
				Nome: sp.name,
				Squad_ID: s.id,
				Inicio: sp.startDate,
				Fim: sp.endDate,
				Planejamento: sp.planningDate || '',
				Refinamento: sp.refinementDate || '',
				Review: sp.reviewDate || '',
				Retro: sp.retroDate || '',
				Pular_Fins_Semana: sp.skipWeekends != null ? (sp.skipWeekends ? 'Sim' : 'Não') : '',
				Encerrada_Em: sp.closedAt || '',
			})),
		)
		if (allSprints.length > 0) {
			XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allSprints), 'Sprints')
		}

		// === Membros ===
		const wsMembers = XLSX.utils.json_to_sheet(
			config.teamMembers.map(m => ({
				Nome: m.name,
				Capacidade: m.capacity,
				Setor: m.sector,
				Squads_IDs: m.squadIds.join(';'),
				Folgas: m.daysOff.join(';'),
			})),
		)
		XLSX.utils.book_append_sheet(wb, wsMembers, 'Membros')

		// === Config global ===
		const wsConfig = XLSX.utils.json_to_sheet([
			{
				Inicio_Projeto: config.projectStartDate,
				Prazo_Global: config.deadline || '',
				Pular_Fins_Semana: config.skipWeekends ? 'Sim' : 'Não',
				Feriados_Globais: config.holidays.join(';'),
				Gap_Tipo_Dias: config.typeGapDays ?? 3,
			},
		])
		XLSX.utils.book_append_sheet(wb, wsConfig, 'Config')

		XLSX.writeFile(wb, `Gantt-Backup-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
	}

	const importFromExcel = (file: File): Promise<{ tasks: Partial<Task>[]; config: Partial<ProjectConfig> }> => {
		return new Promise((resolve, reject) => {
			if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
				reject(new Error('FORMATO_INVALIDO: O arquivo deve ser um Excel (.xlsx ou .xls).'))
				return
			}

			const reader = new FileReader()
			reader.onerror = () => reject(new Error('LEITURA_FALHOU: Não foi possível ler o arquivo. Ele pode estar corrompido.'))
			reader.onload = e => {
				try {
					const data = new Uint8Array(e.target?.result as ArrayBuffer)
					const workbook = XLSX.read(data, { type: 'array' })

					// === Tarefas ===
					const sheetTasks = workbook.Sheets['Tarefas']
					if (!sheetTasks) {
						reject(new Error('ABA_AUSENTE: Aba "Tarefas" não encontrada. Use o botão "Baixar Modelo" para obter o formato correto.'))
						return
					}
					const rawRows = XLSX.utils.sheet_to_json(sheetTasks)
					if (rawRows.length === 0) {
						reject(new Error('ABA_VAZIA: A aba "Tarefas" não contém dados.'))
						return
					}
					const tasksData = (rawRows as any[]).map((row, idx) => {
						let cleanName = row.Tarefa || row.Nome
						if (!cleanName) throw new Error(`CAMPO_FALTANDO: Linha ${idx + 2} da aba "Tarefas" não tem nome de tarefa.`)
						if (cleanName.startsWith('[')) cleanName = cleanName.split(']').slice(1).join(']').trim()
						return {
							id: row.ID || crypto.randomUUID(),
							usId: row.US_ID && row.US_ID !== '-' ? String(row.US_ID) : '',
							customId: row.ID_Tarefa && row.ID_Tarefa !== '-' ? String(row.ID_Tarefa) : '',
							name: cleanName,
							duration: Number(row.Duracao_Dias || row.Duracao) || 1,
							type: row.Tipo || 'other',
							responsible: row.Responsavel || '',
							effort: Number(row.Esforco_Horas || row.Esforco) || 0,
							color: row.Cor || '#3b82f6',
							dependencyId: row.Dependencia_ID || row.Dependencia || null,
							sprintId: row.Sprint_ID || undefined,
							usType: (row.Meta === 'Sim' ? 'goal' : 'item') as 'goal' | 'item',
							classification: Number(row.Classificacao) || 0,
							status: (['new', 'active', 'completed'].includes(row.Status) ? row.Status : 'new') as 'new' | 'active' | 'completed',
							isMilestone: row.Marco === 'Sim',
							isNotPlanned: row.Nao_Planejado === 'Sim' || !row.Sprint_ID,
							manualStartDate: row.Data_Inicio_Manual || undefined,
							originalStartDate: row.Data_Inicio_Original || undefined,
							originalEndDate: row.Data_Fim_Original || undefined,
							completedDate: row.Data_Conclusao || undefined,
						}
					})

					// === Sprints ===
					const sheetSprints = workbook.Sheets['Sprints']
					const sprintsData: any[] = sheetSprints ? (XLSX.utils.sheet_to_json(sheetSprints) as any[]) : []

					// === Squads ===
					const sheetSquads = workbook.Sheets['Squads']
					const squadsData = sheetSquads
						? (XLSX.utils.sheet_to_json(sheetSquads) as any[]).map(row => ({
								id: row.ID || crypto.randomUUID(),
								name: row.Nome || 'Squad Importada',
								color: row.Cor || '#3b82f6',
								startDate: row.Inicio_Squad || format(new Date(), 'yyyy-MM-dd'),
								deadline: row.Prazo_Squad || '',
								skipWeekends: row.Pular_Fins_Semana !== 'Não',
								holidays: row.Feriados ? String(row.Feriados).split(';').filter(Boolean) : [],
								sprints: sprintsData
									.filter(sp => sp.Squad_ID === row.ID)
									.map(sp => ({
										id: sp.ID || crypto.randomUUID(),
										name: sp.Nome,
										squadId: sp.Squad_ID,
										startDate: sp.Inicio,
										endDate: sp.Fim,
										planningDate: sp.Planejamento || undefined,
										refinementDate: sp.Refinamento || undefined,
										reviewDate: sp.Review || undefined,
										retroDate: sp.Retro || undefined,
										skipWeekends: sp.Pular_Fins_Semana === 'Sim' ? true : sp.Pular_Fins_Semana === 'Não' ? false : undefined,
										closedAt: sp.Encerrada_Em || undefined,
									})),
							}))
						: []

					// === Membros ===
					const sheetMembers = workbook.Sheets['Membros']
					const membersData = sheetMembers
						? (XLSX.utils.sheet_to_json(sheetMembers) as any[]).map(row => ({
								name: row.Nome,
								capacity: Number(row.Capacidade) || 8,
								sector: row.Setor || 'Outro',
								squadIds: row.Squads_IDs ? String(row.Squads_IDs).split(';').filter(Boolean) : [],
								daysOff: row.Folgas ? String(row.Folgas).split(';').filter(Boolean) : [],
						  }))
						: []

					// === Config ===
					const sheetConfig = workbook.Sheets['Config']
					const configRow = sheetConfig ? (XLSX.utils.sheet_to_json(sheetConfig) as any[])[0] || {} : {}
					const configData: Partial<ProjectConfig> = {
						projectStartDate: configRow.Inicio_Projeto || undefined,
						deadline: configRow.Prazo_Global || '',
						skipWeekends: configRow.Pular_Fins_Semana !== 'Não',
						holidays: configRow.Feriados_Globais ? String(configRow.Feriados_Globais).split(';').filter(Boolean) : [],
						typeGapDays: configRow.Gap_Tipo_Dias != null ? Number(configRow.Gap_Tipo_Dias) : undefined,
						squads: squadsData as any,
						teamMembers: membersData as any,
					}

					resolve({ tasks: tasksData, config: configData })
				} catch (error) {
					reject(error)
				}
			}
			reader.readAsArrayBuffer(file)
		})
	}

	const downloadImportTemplate = () => {
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(
			wb,
			XLSX.utils.json_to_sheet([
				{ Nome: 'Tarefa Exemplo', US_ID: 'US-001', Tipo: 'backend', Responsavel: '', Esforco_Horas: 8, Duracao_Dias: 1, Meta: 'Sim', Status: 'new', Marco: 'Não' },
			]),
			'Tarefas',
		)
		XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Nome: 'Squad Exemplo', Cor: '#3b82f6', Inicio_Squad: '', Prazo_Squad: '' }]), 'Squads')
		XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Nome: 'Membro Exemplo', Capacidade: 8, Setor: 'Backend', Squads_IDs: '', Folgas: '' }]), 'Membros')
		XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Inicio_Projeto: '', Prazo_Global: '', Pular_Fins_Semana: 'Sim', Feriados_Globais: '', Gap_Tipo_Dias: 3 }]), 'Config')
		XLSX.writeFile(wb, 'Modelo-Importacao-Gantt.xlsx')
	}

	return {
		exportToPDF,
		exportToExcel,
		importFromExcel,
		downloadImportTemplate,
		clearAllData: () => {
			localStorage.clear()
		},
	}
}
