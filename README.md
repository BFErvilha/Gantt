## 📋 Sobre o Projeto

O **Gantt-ficator** é uma aplicação web desenvolvida para simplificar o planejamento de projetos. Diferente de listas de tarefas comuns, ele permite visualizar o cronograma no tempo, entendendo automaticamente como o atraso de uma tarefa impacta as seguintes através de um sistema de dependências.

O projeto foi construído com foco em performance, usabilidade e funciona totalmente offline graças à tecnologia PWA.

## ✨ Funcionalidades

-   **📊 Gráfico de Gantt Interativo:** Visualização clara da linha do tempo do projeto.
-   **🔗 Sistema de Dependências:** Configure tarefas que só começam após o término de outras.
-   **📅 Cálculo de Dias Úteis:** O sistema pula automaticamente finais de semana ao calcular prazos.
-   **💾 Importação e Exportação:**
    -   **Excel (.xlsx):** Salve seu projeto e carregue novamente quando quiser.
    -   **PDF:** Gere relatórios profissionais prontos para impressão.
-   **📱 PWA (Progressive Web App):** Instale o app no seu computador ou celular e use offline.
-   **🎨 Customização:** Defina cores para cada tarefa para melhor organização visual.

## 🛠 Tecnologias Utilizadas

Este projeto foi desenvolvido utilizando as melhores práticas do ecossistema Vue:

-   **[Vue 3](https://vuejs.org/)** (Composition API + Script Setup)
-   **[TypeScript](https://www.typescriptlang.org/)** (Tipagem estática e segurança)
-   **[Vite](https://vitejs.dev/)** (Build tool extremamente rápida)
-   **[Tailwind CSS](https://tailwindcss.com/)** (Estilização utilitária moderna)
-   **[Date-fns](https://date-fns.org/)** (Manipulação robusta de datas)
-   **[SheetJS (xlsx)](https://sheetjs.com/)** (Manipulação de planilhas Excel)
-   **[jsPDF](https://parall.ax/products/jspdf)** & **AutoTable** (Geração de PDFs)
-   **[Vite Plugin PWA](https://vite-pwa-org.netlify.app/)** (Transformação em App Instalável)

## 🚀 Como Rodar Localmente

Certifique-se de ter o **Node.js** e o **pnpm** instalados.

1. **Clone o repositório:**
    ```bash
    git clone [https://github.com/SEU-USUARIO/gantt-ficator.git](https://github.com/SEU-USUARIO/gantt-ficator.git)
    cd gantt-ficator
    ```
