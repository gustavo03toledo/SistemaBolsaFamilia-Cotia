# SBF Panorama â€” Sistema de GestÃ£o Escolar, DeclaraÃ§Ãµes, Lista Piloto, QE e Bolsa FamÃ­lia

AplicaÃ§Ã£o web moderna em **React + TypeScript + Tailwind CSS** (hospedada na **Vercel**) integrada via Proxy Serverless (`/api/gas`) a um backend em **Google Apps Script + Google Sheets + Google Drive**, desenvolvida para automatizar rotinas da secretaria escolar: conferÃªncia bimestral do Bolsa FamÃ­lia, emissÃ£o de declaraÃ§Ãµes em papel timbrado, atualizaÃ§Ã£o das Listas Piloto (SED Ã— Drive) e geraÃ§Ã£o do **QE â€” Quadro Escolar**.

> **Guia para FuncionÃ¡rios (Sem Termos TÃ©cnicos):**  
> Consulte o tutorial completo de uso diÃ¡rio e configuraÃ§Ã£o passo a passo em **[docs/MANUAL_DE_USABILIDADE_SISTEMA_ESCOLAR.md](../docs/MANUAL_DE_USABILIDADE_SISTEMA_ESCOLAR.md)** (dividido em **Parte 1 â€” Uso DiÃ¡rio** e **Parte 2 â€” ConfiguraÃ§Ãµes e Virada de Ano**).

---

## VisÃ£o Geral dos MÃ³dulos

### 1. Bolsa FamÃ­lia (ConferÃªncia de FrequÃªncia)
- **ConexÃ£o Direta Ã  Pasta de DiÃ¡rios (Google Drive)**: aceita o link ou ID da pasta dos diÃ¡rios pelo Frontend e realiza a varredura recursiva das turmas, separando automaticamente **EducaÃ§Ã£o Infantil (limite 60%)** e **Ensino Fundamental (limite 75%)**.
- **Ãndice Acelerado de Alunos (`Indice Alunos Diarios`)**: indexa os alunos das turmas em lotes para acelerar o processamento dos ciclos bimestrais.
- **ExtraÃ§Ã£o InstantÃ¢nea do PDF no Navegador (`pdfjs-dist`)**: lÃª o PDF oficial do Bolsa FamÃ­lia diretamente no cliente, exibindo prÃ©via imediata de `Nome`, `Data de Nascimento`, `NIS` e `ResponsÃ¡vel Familiar` antes de iniciar a varredura.
- **Mesa de ConferÃªncia por Ciclo Bimestral**:
  - **Fila de PendÃªncias (Split-View)**: revisÃ£o assistida lado a lado com busca por nome, sÃ©rie/turma ou chamada, navegaÃ§Ã£o por teclado (`â†‘` / `â†“`) e avanÃ§o automÃ¡tico.
  - **Tratamento de MovimentaÃ§Ã£o Escolar**: registro de transferÃªncias, transferÃªncia parcial, remanejamento interno, nÃ£o pertencente Ã  U.E., abandono ou afastamento justificado.
  - **MemÃ³ria Permanente de VÃ­nculos por NIS**: associaÃ§Ãµes manuais e exceÃ§Ãµes confirmadas ficam vinculadas ao **NIS** e sÃ£o reaproveitadas nos ciclos seguintes.
  - **Abaixo do Limite e AprovaÃ§Ã£o**: tabela operacional com cÃ³pia rÃ¡pida de NIS, ediÃ§Ã£o inline de presenÃ§as/faltas, checklist de lanÃ§amento, impressÃ£o A4 e geraÃ§Ã£o de planilha oficial **Lista Aprovada** no Google Drive.

### 2. DeclaraÃ§Ãµes Escolares e com Faltas
Todas as declaraÃ§Ãµes sÃ£o geradas em folha **A4 com Papel Timbrado oficial** (com suporte a upload de papel timbrado personalizado e cabeÃ§alho escolar editÃ¡vel):
- **DeclaraÃ§Ã£o de MatrÃ­cula**: preenche automaticamente nome, R.A., data de nascimento, ano/turma e horÃ¡rio padrÃ£o (**ManhÃ£ `07:00 Ã s 11:40`** / **Tarde `13:00 Ã s 17:40`**), sem exibir bloco de faltas.
- **SolicitaÃ§Ã£o de TransferÃªncia**: modelo oficial com prazo de entrega do histÃ³rico/documentaÃ§Ã£o (`40 dias`) e observaÃ§Ã£o 100% editÃ¡veis.
- **DeclaraÃ§Ã£o de ConclusÃ£o (Individual ou em Lote)**: permite emitir para um aluno especÃ­fico ou gerar **em lote todas as declaraÃ§Ãµes dos alunos ativos de uma turma** selecionada diretamente das Listas Piloto.
- **DeclaraÃ§Ã£o de FrequÃªncia com Faltas (CRAS / Bolsa FamÃ­lia)**: calcula automaticamente dias letivos, comparecimentos e percentuais mÃªs a mÃªs (Fevereiro a Dezembro) direto dos diÃ¡rios, destaca meses abaixo do limite em amarelo e **preenche o nÃºmero do R.A. automaticamente a partir das Listas Piloto** (mantendo ediÃ§Ã£o manual livre).

### 3. Lista Piloto (ConferÃªncia SED Ã— Google Drive & Ficha de Alunos)
- **ComparaÃ§Ã£o AutomÃ¡tica SED Ã— Drive**: compara o relatÃ³rio PDF **"Alunos por Classe"** da SED com as planilhas das Listas Piloto no Google Drive, identificando chegadas (`MS`), movimentaÃ§Ãµes (`BXTR`, `TRAN`, `NCOM`, `REMA`, `CEDE`, `ABAN`) e preenchimento de R.A. ausente.
- **Direito de Imagem (`IM`) e ObservaÃ§Ãµes Acumulativas**: seleÃ§Ã£o rÃ¡pida de `P+UE`, `P`, `UE`, `NÃƒO` ou em branco, alÃ©m de marcadores acumulativos configurÃ¡veis para a coluna `OBS` (ex.: `@`, `TEG`, `TIO TIAGO`, `TIO ZEZINHO` e outras peruas escolares).
- **Sub-aba Procurar e Editar Aluno**: pesquisa unificada por nome, R.A., RM, NIS ou observaÃ§Ã£o, com filtros por ano/sÃ©rie, sala especÃ­fica, transporte/peruas e vÃ­nculo no Bolsa FamÃ­lia, permitindo ediÃ§Ã£o direta na planilha do Google Drive e atalho para emitir declaraÃ§Ãµes.
- **Turmas & Planilhas no Drive**: visualizaÃ§Ã£o individual por sala com totais de ativos, movimentados e acesso direto Ã  planilha.

### 4. QE â€” Quadro Escolar
- **AdaptaÃ§Ã£o DinÃ¢mica Ano a Ano**: lÃª automaticamente os nomes das planilhas de Listas Piloto, a contagem de alunos ativos e os turnos (**MANHÃƒ** na linha superior e **TARDE** na linha inferior, com suporte a `AEE`).
- **Capacidades EditÃ¡veis Persistidas no Banco de Dados**: ediÃ§Ã£o inline da capacidade de cada sala gravada diretamente na aba **`Quadro Escolar`** do Banco de Dados no Google Sheets.
- **ConsolidaÃ§Ã£o por Etapas e Resumo de MatrÃ­culas**: cÃ¡lculo automÃ¡tico de `Cap. da Sala`, `Quant. Salas`, `Total de Alunos`, `Capacidade`, `Vagas`, `PerÃ­odo`, `Total ManhÃ£`, `Total Tarde`, `Total sem AEE` e `Total Geral`.
- **ImpressÃ£o em A4 Paisagem**: botÃ£o dedicado **Imprimir Quadro Escolar (QE)** abaixo dos quadros, gerando versÃ£o limpa para impressÃ£o ou PDF.

### 5. GestÃ£o Multi-Escola, Multi-Ano e VinculaÃ§Ã£o Manual de Banco/Pastas
- Estrutura isolada por **Escola** e **Ano Letivo** no Google Drive (`[Pasta Raiz] / [Nome da Escola] / [Ano Letivo]`).
- Suporte para cadastrar/alternar escolas, abrir novos anos letivos, zerar ciclos com backup automÃ¡tico em `Historico_Arquivado`, e **vincular manualmente IDs/links de Banco de Dados, Pasta do Ano e Pasta da Escola** pela tela de ConfiguraÃ§Ãµes (ideal para reaproveitar bancos existentes ou operar instÃ¢ncias separadas por unidade escolar).

---

## Arquitetura do Projeto

```mermaid
flowchart LR
  subgraph Cliente["Frontend (React + Vite na Vercel)"]
    UI["Interface Operacional\n(Bolsa, DeclaraÃ§Ãµes, Lista Piloto, QE)"]
    PDF["Leitura Client-Side de PDFs\n(Bolsa FamÃ­lia, SED e Piloto)"]
    DEC["Emissor A4 + ImpressÃ£o QE\n(Timbrado Oficial e Quadros)"]
    SWR["Cache InstantÃ¢neo SWR\n(sessionStorage)"]
  end

  subgraph Proxy["Vercel Serverless Function"]
    API["POST /api/gas\n(Proxy Seguro + CORS)"]
  end

  subgraph Google["Backend Google Workspace (Apps Script)"]
    GAS["Web App JSON API\n(doPost / doGet)"]
    DB["Bancos Anuais no Google Sheets\n(Bolsa, VÃ­nculos e Quadro Escolar)"]
    DRIVE["Google Drive\n(DiÃ¡rios, Listas Piloto e SaÃ­da)"]
  end

  UI --> PDF
  UI --> DEC
  UI <--> SWR
  UI -->|JSON POST| API
  API -->|HTTPS Redirect Follow| GAS
  GAS <--> DB
  GAS <--> DRIVE
```

---

## Tecnologias Utilizadas

- **Frontend**:
  - [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
  - [Vite 6](https://vite.dev/)
  - [Tailwind CSS 4](https://tailwindcss.com/)
  - [Lucide Icons](https://lucide.dev/)
  - [PDF.js (`pdfjs-dist`)](https://mozilla.github.io/pdf.js/) para leitura client-side de PDFs do Bolsa FamÃ­lia e da SED
- **Hospedagem & Serverless Proxy**:
  - [Vercel](https://vercel.com/) (`vercel.json` + Serverless Function em `api/gas.ts`)
- **IntegraÃ§Ã£o Backend**:
  - Google Apps Script (`ContentService` JSON API), Google Sheets e Google Drive

---

## Estrutura de Pastas (RepositÃ³rio GitHub)

```text
â”œâ”€â”€ api/
â”‚   â””â”€â”€ gas.ts                                       # Serverless Function (Proxy para Google Apps Script na Vercel)
â”œâ”€â”€ docs/
â”‚   â””â”€â”€ MANUAL_DE_USABILIDADE_SISTEMA_ESCOLAR.md   # Manual completo para funcionÃ¡rios (uso diÃ¡rio e configuraÃ§Ã£o)
â”œâ”€â”€ web/
â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â””â”€â”€ gas.ts                                   # Serverless Function (compatÃ­vel quando Root Directory = web)
â”‚   â”œâ”€â”€ public/
â”‚   â”‚   â””â”€â”€ timbrado-cotia.png                       # CabeÃ§alho timbrado oficial padrÃ£o (A4)
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”œâ”€â”€ DeclaracaoFaltasView.tsx             # DeclaraÃ§Ã£o com faltas (CRAS) e busca automÃ¡tica de RA
â”‚   â”‚   â”‚   â”œâ”€â”€ DeclaracoesEscolaresView.tsx         # MatrÃ­cula, SolicitaÃ§Ã£o de TransferÃªncia e ConclusÃ£o (Lote/Indiv.)
â”‚   â”‚   â”‚   â”œâ”€â”€ ListaPilotoSedView.tsx               # ConferÃªncia SED Ã— Listas Piloto, Ficha de Alunos e Peruas/OBS
â”‚   â”‚   â”‚   â”œâ”€â”€ QuadroEscolarView.tsx                # QE - Quadro Escolar dinÃ¢mico, capacidades editÃ¡veis e impressÃ£o A4
â”‚   â”‚   â”‚   â””â”€â”€ RevisaoSplitView.tsx                 # RevisÃ£o assistida lado a lado da Mesa de ConferÃªncia
â”‚   â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”‚   â”œâ”€â”€ configEscolarStore.ts                # Armazenamento local de timbrado, cabeÃ§alho e marcadores OBS
â”‚   â”‚   â”‚   â”œâ”€â”€ gasApi.ts                            # Cliente HTTP tipado para todas as actions da API
â”‚   â”‚   â”‚   â”œâ”€â”€ pdfExtractor.ts                      # ExtraÃ§Ã£o client-side de PDFs do Bolsa FamÃ­lia e IDs do Drive
â”‚   â”‚   â”‚   â””â”€â”€ sedExtractor.ts                      # ExtraÃ§Ã£o de PDFs da SED e cruzamento com Listas Piloto
â”‚   â”‚   â”œâ”€â”€ types/
â”‚   â”‚   â”‚   â””â”€â”€ sbf.ts                               # Tipagens TypeScript (Ciclos, Alunos, Piloto, QE, Escolas)
â”‚   â”‚   â”œâ”€â”€ App.tsx                                  # AplicaÃ§Ã£o principal e roteamento dos 4 mÃ³dulos
â”‚   â”‚   â”œâ”€â”€ main.tsx                                 # Ponto de entrada React
â”‚   â”‚   â””â”€â”€ index.css                                # Estilos globais Tailwind e regras de impressÃ£o A4
â”‚   â”œâ”€â”€ .env.example                                 # Modelo de variÃ¡veis de ambiente
â”‚   â”œâ”€â”€ index.html                                   # Template HTML principal
â”‚   â”œâ”€â”€ package.json                                 # DependÃªncias e scripts do Frontend
â”‚   â”œâ”€â”€ README.md                                    # DocumentaÃ§Ã£o espelhada quando Root Directory = web
â”‚   â”œâ”€â”€ tsconfig.json                                # ConfiguraÃ§Ã£o TypeScript
â”‚   â”œâ”€â”€ vercel.json                                  # Rewrites para SPA + API na Vercel
â”‚   â””â”€â”€ vite.config.ts                               # ConfiguraÃ§Ã£o do bundler Vite
â”œâ”€â”€ .env.example                                     # Modelo de variÃ¡veis de ambiente na raiz
â”œâ”€â”€ package.json                                     # Scripts unificados de build/dev na raiz
â”œâ”€â”€ README.md                                        # DocumentaÃ§Ã£o principal do projeto
â””â”€â”€ vercel.json                                      # ConfiguraÃ§Ã£o de build e rotas da Vercel na raiz
```

---

## ConfiguraÃ§Ã£o de VariÃ¡veis de Ambiente (`.env`)

1. Copie o arquivo de exemplo `.env.example` para `.env` (na raiz e/ou em `web/.env`):

```bash
cp .env.example .env
cp web/.env.example web/.env
```

2. Preencha as variÃ¡veis com os dados do seu ambiente:

```env
# URL do Web App publicado no Google Apps Script (terminando em /exec)
GAS_WEBAPP_URL=
VITE_GAS_WEBAPP_URL=

# URL opcional da pasta raiz de dados gerados no Google Drive
VITE_PASTA_SAIDA_DADOS_URL=

# Chave secreta opcional (se configurada em PropertiesService -> GAS_API_SECRET no Apps Script)
GAS_API_SECRET=
```

> **SeguranÃ§a**: Os arquivos `.env` e `web/.env` estÃ£o listados no `.gitignore` e nunca sÃ£o enviados ao repositÃ³rio Git.

---

## Como Executar Localmente

```bash
# 1. Instalar dependÃªncias do frontend
npm --prefix web install

# 2. Iniciar servidor de desenvolvimento (Vite)
npm --prefix web run dev

# 3. Gerar build de produÃ§Ã£o
npm --prefix web run build
```

---

## Como Hospedar na Vercel

O repositÃ³rio estÃ¡ pronto para publicaÃ§Ã£o na Vercel (inclusive para mÃºltiplas unidades escolares em projetos isolados):

1. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositÃ³rio do GitHub.
2. Em **Environment Variables**, adicione `GAS_WEBAPP_URL` e `VITE_GAS_WEBAPP_URL` apontando para a URL `/exec` da implantaÃ§Ã£o do seu Google Apps Script.
3. Clique em **Deploy**.

---

## Privacidade e ProteÃ§Ã£o de Dados (LGPD)

Este repositÃ³rio contÃ©m **exclusivamente o cÃ³digo-fonte do frontend e a documentaÃ§Ã£o de uso**. Nenhum dado pessoal de alunos (nomes, NIS, RA, datas de nascimento), PDFs do Bolsa FamÃ­lia/SED, planilhas de diÃ¡rios de classe ou credenciais privadas de acesso ao Google Drive fazem parte deste repositÃ³rio ou de seus arquivos de configuraÃ§Ã£o.
