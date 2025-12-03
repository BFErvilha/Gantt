import { utils, writeFile, read } from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { type Task } from './useGantt'

export function useDataPersistence() {
	const exportToExcel = (tasks: Task[]) => {
		const dataToExport = tasks.map(t => ({
			ID: t.id,
			Tarefa: t.name,
			'Duração (dias)': t.duration,
			Início: t.formattedStartDate,
			Fim: t.formattedEndDate,
			'Dependência (ID)': t.dependencyId || '',
			Cor: t.color,
		}))

		const worksheet = utils.json_to_sheet(dataToExport)
		const workbook = utils.book_new()
		utils.book_append_sheet(workbook, worksheet, 'Cronograma')

		worksheet['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]

		writeFile(workbook, 'Cronograma_Projeto.xlsx')
	}

	const exportToPDF = (tasks: Task[], projectConfig: any) => {
		const doc = new jsPDF()

		doc.setFontSize(18)
		doc.text('Relatório do Projeto', 14, 22)

		doc.setFontSize(11)
		doc.setTextColor(100)
		doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 30)
		doc.text(`Prazo Final do Projeto: ${new Date(projectConfig.deadline).toLocaleDateString()}`, 14, 36)

		const tableBody = tasks.map(t => [t.name, `${t.duration} dias`, t.formattedStartDate || '-', t.formattedEndDate || '-', t.dependencyId ? `Dep: ${t.dependencyId}` : '-'])

		autoTable(doc, {
			head: [['Tarefa', 'Duração', 'Início', 'Fim', 'Obs']],
			body: tableBody,
			startY: 44,
			theme: 'grid',
			headStyles: { fillColor: [59, 130, 246] },
		})

		doc.save('Relatorio_Gantt.pdf')
	}

	const importFromExcel = (file: File): Promise<Partial<Task>[]> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()

			reader.onload = e => {
				try {
					const data = new Uint8Array(e.target?.result as ArrayBuffer)
					const workbook = read(data, { type: 'array' })

					const firstSheetName = workbook.SheetNames[0]
					const worksheet = workbook.Sheets[firstSheetName]

					const jsonData: any[] = utils.sheet_to_json(worksheet)

					const parsedTasks: Partial<Task>[] = jsonData.map(row => ({
						id: row['ID'] ? String(row['ID']) : crypto.randomUUID(),
						name: row['Tarefa'] || 'Tarefa Importada',
						duration: Number(row['Duração (dias)']) || 1,
						dependencyId: row['Dependência (ID)'] ? String(row['Dependência (ID)']) : null,
						color: row['Cor'] || '#3b82f6',
					}))

					resolve(parsedTasks)
				} catch (error) {
					reject(error)
				}
			}

			reader.onerror = error => reject(error)
			reader.readAsArrayBuffer(file)
		})
	}

	return { exportToExcel, exportToPDF, importFromExcel }
}
