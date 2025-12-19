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
			head: [['ID', 'Tarefa', 'Tipo', 'Resp.', 'Início', 'Fim']],
			body: tasks.map(t => [t.usId || '-', t.usId ? `[${t.usId}] ${t.name}` : t.name, t.type.toUpperCase(), t.responsible || '-', t.formattedStartDate || '', t.formattedEndDate || '']),
			theme: 'grid',
			headStyles: { fillColor: [59, 130, 246] },
			styles: { fontSize: 7, cellPadding: 2 },
			alternateRowStyles: { fillColor: [249, 250, 251] },
		})

		doc.save(`Gantt-Relatorio-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
	}

	const exportToExcel = (tasks: Task[], config: ProjectConfig) => {
		const wb = XLSX.utils.book_new()

		const wsTasks = XLSX.utils.json_to_sheet(
			tasks.map(t => ({
				Tarefa: t.usId ? `[${t.usId}] ${t.name}` : t.name,
				US_ID: t.usId || '-',
				ID_Tarefa: t.customId || t.id,
				Tipo: t.type,
				Responsavel: t.responsible,
				Esforco_Horas: t.effort,
				Duracao_Dias: t.duration,
				Inicio: t.formattedStartDate,
				Fim: t.formattedEndDate,
				Dependencia: t.dependencyId,
				Meta: t.usType === 'goal' ? 'Sim' : 'Não',
			})),
		)
		XLSX.utils.book_append_sheet(wb, wsTasks, 'Tarefas')

		const wsConfig = XLSX.utils.json_to_sheet(
			config.squads.map(s => ({
				ID: s.id,
				Nome: s.name,
				Cor: s.color,
				Inicio_Squad: s.startDate,
				Prazo_Squad: s.deadline,
			})),
		)
		XLSX.utils.book_append_sheet(wb, wsConfig, 'Squads')

		const wsMembers = XLSX.utils.json_to_sheet(
			config.teamMembers.map(m => ({
				Nome: m.name,
				Capacidade: m.capacity,
				Setor: m.sector,
				Squads: m.squadIds.join(', '),
			})),
		)
		XLSX.utils.book_append_sheet(wb, wsMembers, 'Membros')

		XLSX.writeFile(wb, `Gantt-Backup-Completo-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
	}

	const importFromExcel = (file: File): Promise<{ tasks: Partial<Task>[]; config: Partial<ProjectConfig> }> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = e => {
				try {
					const data = new Uint8Array(e.target?.result as ArrayBuffer)
					const workbook = XLSX.read(data, { type: 'array' })

					const sheetTasks = workbook.Sheets['Tarefas']
					const tasksData = XLSX.utils.sheet_to_json(sheetTasks).map((row: any) => {
						let cleanName = row.Tarefa || row.Nome
						if (cleanName && cleanName.startsWith('[')) {
							cleanName = cleanName.split(']').slice(1).join(']').trim()
						}

						return {
							id: row.ID || row.ID_Tarefa || crypto.randomUUID(),
							usId: row.US_ID !== '-' ? row.US_ID : '',
							name: cleanName,
							duration: Number(row.Duracao_Dias || row.Duracao) || 1,
							type: row.Tipo || 'other',
							responsible: row.Responsavel,
							effort: Number(row.Esforco_Horas || row.Esforco) || 0,
							dependencyId: row.Dependencia || null,
							sprintId: row.Sprint_ID,
							usType: (row.Meta === 'Sim' ? 'goal' : 'item') as 'goal' | 'item',
						}
					})

					const sheetSquads = workbook.Sheets['Squads']
					const squadsData = sheetSquads
						? XLSX.utils.sheet_to_json(sheetSquads).map((row: any) => ({
								id: row.ID || crypto.randomUUID(),
								name: row.Nome,
								color: row.Cor || '#3b82f6',
								startDate: row.Inicio_Squad || format(new Date(), 'yyyy-MM-dd'),
								deadline: row.Prazo_Squad || '',
								sprints: [],
								holidays: [],
								skipWeekends: true,
						  }))
						: []

					resolve({ tasks: tasksData, config: { squads: squadsData as any } })
				} catch (error) {
					reject(error)
				}
			}
			reader.readAsArrayBuffer(file)
		})
	}

	const downloadImportTemplate = () => {
		const wb = XLSX.utils.book_new()
		const templateTasks = [{ Nome: 'Tarefa Exemplo', US_ID: 'US-001', Tipo: 'backend', Responsavel: '', Esforco_Horas: 8, Duracao_Dias: 1, Meta: 'Sim' }]
		XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(templateTasks), 'Tarefas')
		XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Nome: 'Squad Exemplo', Cor: '#3b82f6' }]), 'Squads')
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
