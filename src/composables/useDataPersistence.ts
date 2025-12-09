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
		doc.setDrawColor(200, 200, 200)
		doc.line(14, 30, 196, 30)
		doc.setFontSize(12)
		doc.setTextColor(0, 0, 0)
		doc.text('Resumo Executivo', 14, 38)
		doc.setFontSize(10)
		doc.text(`Início: ${format(new Date(config.projectStartDate), 'dd/MM/yyyy')}`, 14, 45)
		doc.text(`Deadline: ${format(new Date(config.deadline), 'dd/MM/yyyy')}`, 80, 45)
		doc.text(`Equipa: ${config.teamMembers.length} membros`, 140, 45)

		let currentY = 55
		if (risks.length > 0) {
			doc.setFillColor(254, 242, 242)
			doc.rect(14, currentY, 182, 8 + risks.length * 6, 'F')
			doc.setFontSize(11)
			doc.setTextColor(185, 28, 28)
			doc.text('⚠️ Riscos e Alertas Identificados:', 18, currentY + 6)
			doc.setFontSize(9)
			doc.setTextColor(60, 60, 60)
			risks.forEach((risk, i) => {
				doc.text(`• ${risk}`, 18, currentY + 12 + i * 6)
			})
			currentY += 16 + risks.length * 6
		}

		const tableBody = tasks.map(t => [t.name, t.type.toUpperCase(), t.responsible || '-', `${t.duration} dias`, t.effort ? `${t.effort}h` : '-', t.formattedStartDate || '', t.formattedEndDate || ''])

		autoTable(doc, {
			startY: currentY,
			head: [['Tarefa', 'Tipo', 'Resp.', 'Duração', 'Esforço', 'Início', 'Fim']],
			body: tableBody,
			theme: 'grid',
			headStyles: { fillColor: [59, 130, 246] },
			styles: { fontSize: 8 },
			alternateRowStyles: { fillColor: [249, 250, 251] },
		})
		doc.save(`Gantt-Relatorio-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
	}

	const exportToExcel = (tasks: Task[]) => {
		const data = tasks.map(t => ({
			ID: t.id,
			Nome: t.name,
			Tipo: t.type,
			Responsavel: t.responsible,
			Esforco_Horas: t.effort,
			Duracao_Dias: t.duration,
			Inicio: t.formattedStartDate,
			Fim: t.formattedEndDate,
			Dependencia: t.dependencyId,
		}))
		const ws = XLSX.utils.json_to_sheet(data)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Tarefas')
		XLSX.writeFile(wb, `Gantt-Export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
	}

	const importFromExcel = (file: File): Promise<Partial<Task>[]> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = e => {
				try {
					const data = new Uint8Array(e.target?.result as ArrayBuffer)
					const workbook = XLSX.read(data, { type: 'array' })
					const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
					const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[]

					const tasks = jsonData.map(row => ({
						id: row.ID || crypto.randomUUID(),
						name: row.Nome || 'Sem Nome',
						duration: Number(row.Duracao_Dias) || 1,
						type: row.Tipo || 'other',
						responsible: row.Responsavel || '',
						effort: Number(row.Esforco_Horas) || 0,
						dependencyId: row.Dependencia || null,
					}))
					resolve(tasks)
				} catch (error) {
					reject(error)
				}
			}
			reader.readAsArrayBuffer(file)
		})
	}

	const downloadImportTemplate = () => {
		const templateData = [
			{
				Nome: 'Exemplo: Criar API',
				Tipo: 'backend',
				Responsavel: 'Nome do Membro',
				Esforco_Horas: 8,
				Duracao_Dias: 1,
				Dependencia: '',
			},
			{
				Nome: 'Exemplo: Criar Tela',
				Tipo: 'frontend',
				Responsavel: 'Outro Membro',
				Esforco_Horas: 16,
				Duracao_Dias: 2,
				Dependencia: '',
			},
		]

		const ws = XLSX.utils.json_to_sheet(templateData)

		const wscols = [{ wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
		ws['!cols'] = wscols

		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Modelo Importacao')
		XLSX.writeFile(wb, 'Modelo-Importacao-Gantt.xlsx')
	}

	return {
		exportToPDF,
		exportToExcel,
		importFromExcel,
		downloadImportTemplate,
	}
}
