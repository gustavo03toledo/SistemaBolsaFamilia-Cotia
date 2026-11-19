# Manual de Usabilidade do Sistema de Gestão Escolar e Bolsa Família

Este manual foi preparado para orientar todos os funcionários da secretaria e da equipe escolar no uso diário e na configuração do sistema, com explicações simples e passo a passo de cada tela e funcionalidade.

---

## Sumário Rápido

- **Parte 1 — Uso Diário do Sistema (Sistema Já Configurado)**
  1. [Visão Geral das Telas Principais](#1-visão-geral-das-telas-principais)
  2. [Módulo 1: Bolsa Família (Conferência de Frequência)](#2-módulo-1-bolsa-família-conferência-de-frequência)
  3. [Módulo 2: Declarações Escolares e com Faltas](#3-módulo-2-declarações-escolares-e-com-faltas)
  4. [Módulo 3: Lista Piloto (Conferência com SED e Ficha dos Alunos)](#4-módulo-3-lista-piloto-conferência-com-sed-e-ficha-dos-alunos)
  5. [Módulo 4: QE — Quadro Escolar](#5-módulo-4-qe--quadro-escolar)
- **Parte 2 — Configurações, Cadastros e Virada de Ano**
  6. [Alternar ou Cadastrar Nova Escola](#6-alternar-ou-cadastrar-nova-escola)
  7. [Mudar de Ano Letivo ou Zerar Ciclos do Ano](#7-mudar-de-ano-letivo-ou-zerar-ciclos-do-ano)
  8. [Conectar e Atualizar a Pasta de Diários de Classe](#8-conectar-e-atualizar-a-pasta-de-diários-de-classe)
  9. [Cadastrar e Conectar a Pasta das Listas Piloto](#9-cadastrar-e-conectar-a-pasta-das-listas-piloto)
  10. [Vincular Manualmente Banco de Dados e Pastas (Reaproveitamento)](#10-vincular-manualmente-banco-de-dados-e-pastas-reaproveitamento)
  11. [Configurar Peruas Escolares, TEG e Marcadores de Observação](#11-configurar-peruas-escolares-teg-e-marcadores-de-observação)
  12. [Personalizar Papel Timbrado e Cabeçalho das Declarações](#12-personalizar-papel-timbrado-e-cabeçalho-das-declarações)
  13. [Padrão de Nomes das Planilhas no Google Drive](#13-padrão-de-nomes-das-planilhas-no-google-drive)
  14. [Dúvidas Comuns do Dia a Dia](#14-dúvidas-comuns-do-dia-a-dia)

---

# PARTE 1 — USO DIÁRIO DO SISTEMA (SISTEMA JÁ CONFIGURADO)

Nesta primeira parte, consideramos que a escola, o ano letivo, as pastas do Google Drive (Diários e Listas Piloto) e o Banco de Dados já estão conectados e prontos para o uso rotineiro da secretaria.

---

## 1. Visão Geral das Telas Principais

Ao abrir o sistema, você verá o **menu lateral à esquerda** e os **botões rápidos no topo**, divididos em **4 áreas principais**:

1. **Bolsa Família** — Conferência bimestral da frequência exigida pelo programa a partir do relatório PDF e dos diários de classe.
2. **Declarações** — Emissão e impressão em folha A4 timbrada das declarações de **Matrícula**, **Solicitação de Transferência**, **Conclusão (individual ou turma inteira)** e **Frequência com Faltas (CRAS)**.
3. **Lista Piloto** — Conferência automática das planilhas das turmas com o relatório **Alunos por Classe** da SED, pesquisa avançada de alunos e edição direta de dados na ficha da Lista Piloto.
4. **QE - Quadro Escolar** — Painel consolidado com o total de alunos ativos por turma e turno (Manhã/Tarde), controle de capacidade e vagas por etapa, resumo geral de matrículas e impressão do Quadro Escolar.

> **Dica:** Na barra superior do sistema também ficam visíveis o nome da **Escola Ativa**, o **Ano Letivo** selecionado e os botões rápidos para abrir diretamente a pasta de dados e a planilha oficial no Google Drive.

---

## 2. Módulo 1: Bolsa Família (Conferência de Frequência)

Dentro de **Bolsa Família**, existem 5 abas principais:

### 2.1. Aba "Painel do Bolsa"
É a tela inicial com o resumo do último ciclo conferido no ano:
- **Cartões de indicadores:** mostram rapidamente quantos alunos foram **Encontrados**, quantos estão **Abaixo do Limite**, quantos têm **Movimentação / Transferência** e quantos ainda estão **Pendentes (Para Revisar + Não Encontrados)**.
  - *Clicar em qualquer cartão leva você direto para a lista correspondente na Mesa de Conferência.*
- **Ciclos Salvos:** lista todos os bimestres já conferidos no ano atual (ex.: Fevereiro/Março, Abril/Maio). Clique em qualquer ciclo para abrir os resultados dele novamente.

### 2.2. Aba "Nova Conferência (PDF)"
Use esta aba sempre que chegar um novo relatório bimestral do Bolsa Família para conferir:
1. Em **Período / Ciclo do Bolsa Família**, escolha o bimestre correto (ex.: *Abril a maio*).
2. Confirme o **Ano de Referência** (ex.: `2026`).
3. Confira se o link da pasta dos diários está preenchido. *(Se houve alterações recentes nos diários de classe antes da conferência, clique em **Pré-aquecer Índice de Diários** para garantir a leitura atualizada de todos os alunos.)*
4. Clique em **Selecionar arquivo PDF do Bolsa Família** e escolha o arquivo no computador.
   - O sistema mostra na hora uma **pré-visualização** com os nomes, NIS, datas de nascimento e responsáveis extraídos do PDF.
   - *(Opcional: se não tiver o arquivo em PDF, você pode colar a lista de nomes no campo de texto manual ao lado.)*
5. Clique no botão verde **Iniciar Varredura nos Diários e Conferir Frequência**.
6. Ao concluir, você será levado automaticamente para a **Mesa de Conferência** com os resultados prontos.

### 2.3. Aba "Mesa de Conferência"
Aqui você resolve as pendências, confere alunos com frequência baixa e gera a planilha final aprovada. A tela é dividida em sub-abas:

- **Pendências** *(tela principal de trabalho)*:
  - Reúne todos os alunos que precisam de atenção (**Não Encontrados** e **Para Revisar**).
  - **Coluna da esquerda (Fila de Resolução):** lista os alunos pendentes. Você pode filtrar digitando nome ou NIS, e usar as setas **`↑`** e **`↓`** do teclado para navegar rapidamente entre eles.
  - **Coluna da direita (Busca Assistida e Exceções):**
    - Para **vincular o aluno ao diário certo**: ajuste o nome (ou digite parte do nome), turma ou número de chamada e clique em **Buscar nos Diários**. Selecione o aluno correto nos resultados e clique em **Confirmar Vínculo**.
    - O sistema memoriza esse vínculo pelo **NIS** para os próximos bimestres — assim, nas próximas conferências ele já reconhece o aluno automaticamente!
    - Para alunos que **saíram ou mudaram de turma**, clique no botão de **Movimentação / Exceção** e escolha a opção real:
      - *Transferido de Escola* (com data e escola de destino, se souber);
      - *Transferido Parcial* (estudou parte do bimestre na unidade);
      - *Remanejado Interno* (trocou de turma dentro da mesma escola);
      - *Não pertence à Unidade Escolar*;
      - *Abandono / Evasão*;
      - *Atestado / Faltas Justificadas*.
    - Ao confirmar uma ação, o sistema avança automaticamente para o próximo aluno pendente da fila.

- **Movimentação / Transferidos**: mostra todos os alunos com transferência ou exceção registrada neste ciclo, separados dos demais.

- **Abaixo do Limite**:
  - Exibe todos os alunos que ficaram abaixo da frequência mínima exigida (**60%** para Educação Infantil e **75%** para Ensino Fundamental).
  - Para facilitar o lançamento no portal do Bolsa Família, há botões para copiar o **NIS**, consultar a presença/faltas de cada mês do bimestre e uma caixinha de marcação (**Lançado**) para controle interno do funcionário.
  - Se precisar corrigir manualmente presenças, faltas ou acrescentar uma justificativa/observação, clique em **Editar** na linha do aluno e salve.
  - Você também pode clicar diretamente no botão **Declaração** na linha do aluno para abrir a **Declaração com Faltas** já preenchida com o nome e turma dele.

- **Conferidos (OK)**: lista todos os alunos encontrados nos diários com frequência dentro do esperado.

- **Não Encontrados** / **Para Revisar**: visões individuais das mesmas filas exibidas em **Pendências**.

- **Vínculos Salvos (NIS)**: mostra toda a memória de associações entre nomes do Bolsa Família e nomes dos diários (por NIS). Se algum vínculo antigo estiver incorreto, você pode removê-lo nesta aba.

- **Histórico**: mostra todas as conferências já executadas com data, período e totais encontrados.

- **Botões no topo direito da Mesa de Conferência:**
  - **Imprimir Abaixo Limite:** gera a impressão limpa da lista de alunos abaixo da frequência mínima.
  - **Aprovar e Salvar Planilha:** gera na pasta do Google Drive da escola/ano a planilha oficial fechada daquele ciclo (**Lista Aprovada**).

---

## 3. Módulo 2: Declarações Escolares e com Faltas

Todas as declarações abrem com visualização em **tempo real em folha A4** com papel timbrado oficial e ficam prontas para impressão pelo botão **Imprimir / Salvar PDF (A4)** (ou pelo botão **Imprimir A4** no cabeçalho superior).

> **Dica de impressão no navegador:** na janela de impressão que abrir, marque a opção **Gráficos de segundo plano / Imagens de fundo** (caso não esteja marcada) e defina as **Margens como Nenhuma** para o papel timbrado sair exatamente preenchido na folha inteira sem bordas brancas extras.

### 3.1. Sub-aba "Declaração de Matrícula"
- **Como preencher rápido:** digite o nome do aluno no campo de busca no topo (ele puxa sugestões direto das Listas Piloto e Diários) e selecione o aluno desejado.
- O sistema preenche automaticamente **Nome**, **R.A.**, **Data de Nascimento**, **Ano/Turma** e o **Horário das aulas**:
  - Turmas da **Manhã**: `07:00 às 11:40`
  - Turmas da **Tarde**: `13:00 às 17:40`
- Você pode ajustar livremente qualquer campo (ex.: ano letivo, turno, observação ou data da assinatura) antes de clicar em **Imprimir / Salvar PDF (A4)**.
- Esta declaração **não inclui** o texto de entrega de documentação nem o quadro de faltas.

### 3.2. Sub-aba "Solicitação de Transferência"
- Busque e selecione o aluno como na declaração de matrícula.
- O documento já traz o texto oficial de solicitação de transferência e entrega de documentação (**40 dias** por padrão), porém tanto o **texto do prazo/histórico** quanto o campo de **Observação** são **100% editáveis** caso precise alterar para alguma situação específica antes de imprimir.

### 3.3. Sub-aba "Conclusão (Indiv. / Lote)"
Permite emitir a Declaração de Conclusão do Ensino Fundamental de **duas formas**, alternando pelos botões no topo:
1. **Aluno Específico (Individual):** busque o aluno pelo nome e emita a declaração individual.
2. **Emitir em Lote por Turma (Todos os Alunos Ativos):**
   - Escolha a turma desejada (ex.: `5º ANO A`, `5º ANO B`, `5º ANO C`) carregada das Listas Piloto.
   - O sistema lista automaticamente todos os alunos ativos daquela sala com **Nome**, **R.A.** e **Data de Nascimento**.
   - Você pode conferir ou editar qualquer dado na própria tabela e marcar/desmarcar quais alunos deseja incluir.
   - Ao clicar em **Imprimir Lote Selecionado**, o sistema gera **uma página A4 completa por aluno**, pronta para imprimir todas de uma vez!

### 3.4. Sub-aba "Declaração com Faltas (CRAS / Bolsa Família)"
Usada para comprovar frequência detalhada mês a mês (Fevereiro a Dezembro) ao CRAS ou ao responsável:
1. Digite o nome do aluno (com sugestões automáticas) e, se desejar, filtre pela turma. Clique em **Buscar e Calcular nos Diários**.
2. O sistema lê o diário de classe e calcula sozinho, mês a mês: **Dias Letivos**, **Comparecimento**, **% de Frequência**, **% Exigida** (60% Infantil / 75% Fundamental) e se está **Apto (SIM / NÃO)**, destacando em **amarelo** os meses em que o aluno ficou abaixo da frequência mínima.
3. **Preenchimento automático do R.A.:** o número do **R.A.** é trazido automaticamente da **Lista Piloto** do aluno (caso já esteja cadastrado lá), continuando **editável** se você precisar digitar ou corrigir manualmente.
4. **Filtros de meses:** com 1 clique você pode escolher mostrar **Todos os meses**, **Somente até o mês atual**, ou **Selecionar meses específicos** / limpar meses zerados.
5. Edite **Observações**, **Alinhamento** ou **Data da Assinatura** se necessário e clique em **Confirmar e Imprimir / Salvar PDF**.

---

## 4. Módulo 3: Lista Piloto (Conferência com SED e Ficha dos Alunos)

Este módulo mantém as planilhas das turmas no Google Drive sempre em dia com a SED e centraliza a ficha completa dos estudantes. Possui as seguintes sub-abas:

### 4.1. Sub-aba "Conferência SED × Listas Piloto"
Compara o relatório oficial **Alunos por Classe** (exportado em PDF da SED) com as planilhas das Listas Piloto salvas no Google Drive:
1. Confira no **Card 1** se as turmas do Drive estão carregadas (clique em **Sincronizar Listas do Drive** sempre que quiser reler alterações feitas manualmente fora do sistema).
2. No **Card 2**, clique em **Escolher PDF** e selecione o PDF **"Alunos por Classe"** baixado da SED. *(Antes de enviar, confira se a **Data Chegada (MS)** está com o dia/mês desejado para alunos novos.)*
3. Assim que selecionar o PDF, o sistema compara todas as salas automaticamente e mostra:
   - **Salas 100% OK (faixa verde):** salas em que não há nenhuma novidade ou diferença entre SED e Lista Piloto.
   - **Salas com Alterações:** lista cada turma que teve mudança, indicando:
     - **ALUNO NOVO (CHEGADA):** aluno ativo na SED que ainda não está na Lista Piloto da turma. Já traz sugerido o número seguinte da chamada (`N°`), Data de Nascimento, R.A., Situação (`MS`) e Data de Movimentação. Antes de gravar, você pode digitar o **RM**, escolher o **Direito de Imagem (IM)** e marcar as **Observações extras** (`@`, `TEG`, peruas escolares etc.).
     - **MOVIMENTAÇÃO (`BXTR`, `TRAN`, `NCOM`, `REMA`, `CEDE`, `ABAN`):** aluno que mudou de situação na SED. O sistema sugere a nova sigla, a data da movimentação e preserva o histórico anterior.
     - **COMPLEMENTO DE R.A.:** quando o aluno já existia na Lista Piloto sem R.A. e a SED trouxe o número completo.
4. **Aplicando as atualizações nas planilhas:**
   - Revise os itens marcados com a caixinha **Aplicar** (desmarque se não quiser enviar algum registro).
   - Clique em **Aplicar na Lista Piloto** (dentro da turma) ou em **Aplicar Todas as Mudanças no Drive** (no topo, para gravar todas as salas de uma só vez).
   - O sistema grava os novos alunos na linha seguinte, atualiza movimentações e preenche as cores de destaque diretamente nas planilhas do Google Drive.
5. **Imprimir todas as alterações editadas *(quando disponível na barra)*:**
   - Após aplicar as correções divergentes, utilize o botão **Imprimir Editadas** para gerar uma folha de resumo organizada por turma com o antes e depois de cada registro atualizado na sessão (com botão de lixeira ao lado para limpar a fila quando iniciar nova conferência).

### 4.2. Sub-aba "Procurar e Editar Aluno"
Funciona como uma ficha geral pesquisável de todos os alunos de todas as Listas Piloto:
- **Filtros disponíveis:**
  - Caixa de busca por **Nome, R.A., RM, NIS ou texto da Observação**;
  - Filtro por **Ano / Série** (ex.: *Todos do 1º Ano*, *Todos do 2º Ano*, *Educação Infantil*, *AEE*);
  - Filtro por **Sala / Turma Específica**;
  - Filtro por **Transporte / Saída / Observação** (*TEG*, *Todas as Peruas*, *Tio Tiago*, *Tio Zezinho*, *@ Vai Sozinho* ou marcadores cadastrados);
  - Filtro **Bolsa Família** (para listar somente beneficiários, apenas ativos ou apenas movimentados).
- **Lista de resultados (um aluno abaixo do outro):**
  - Exibe nome, sala, número da chamada, RM, R.A., data de nascimento, situação atual, se faz parte do **Bolsa Família** (com NIS e frequência, se houver ciclo conferido) e as observações cadastradas.
  - **Botões rápidos por aluno:** permitem abrir diretamente uma **Declaração** (Matrícula, Transferência, Conclusão ou com Faltas) já com os dados desse aluno preenchidos.
- **Editar diretamente na Lista Piloto:**
  - Clique em **Editar na Lista Piloto** no cartão do aluno para abrir a edição de **Nome**, **RM**, **R.A.**, **Data de Nascimento**, **Situação**, **Data de Movimentação**, **Direito de Imagem (`IM`)** e **Observações (OBS)**.
  - **Direito de Imagem (`IM`):** escolha facilmente entre **`P+UE`** *(Público + Unidade Escolar)*, **`P`** *(Público)*, **`UE`** *(Unidade Escolar)*, **`NÃO`** *(Não Autorizado)* ou deixe **Em branco** quando não houver informação.
  - **Observações Acumulativas (Checkboxes):** marque ou desmarque com um clique **`@` (Vai Sozinho)**, **`TEG` (Transporte Escolar Gratuito)**, **`TIO TIAGO`**, **`TIO ZEZINHO`** ou outras peruas cadastradas — o sistema soma essas informações na coluna `OBS` sem apagar anotações existentes (como *REMA*, *BXTR*, *TR* etc.).
  - Clique em **Salvar na Planilha** para gravar na hora no Google Drive.

### 4.3. Sub-aba "Turmas & Planilhas no Drive"
Mostra todas as planilhas de Lista Piloto carregadas com o nome de cada turma, total de alunos ativos e total geral. Clique em uma sala para ver todos os seus alunos na tela (RM, Nº, Nome, Situação, Data Mov., Nascimento, RA, IM e OBS) ou abrir a planilha original no Google Drive.

---

## 5. Módulo 4: QE — Quadro Escolar

Esta tela mostra o resumo completo de ocupação das salas da escola em tempo real a partir das Listas Piloto ativas (você pode acessá-la pelo botão **QE - Quadro Escolar** no topo, no menu lateral ou dentro da barra de **Lista Piloto**):

1. **Quadro superior de Turmas Carregadas:** exibe os mesmos cartões das turmas carregadas das Listas Piloto (com a contagem automática de alunos ativos de cada sala). Se alguma Lista Piloto foi modificada recentemente, clique em **Atualizar Ativos do Drive**.
2. **Quadro Geral por Turno (Manhã em cima e Tarde em baixo):**
   - Na linha de cima ficam todas as turmas do turno da **MANHÃ**; na linha de baixo ficam todas as turmas do turno da **TARDE** (seguindo automaticamente os nomes e turnos das planilhas das Listas Piloto, com `AEE` ao final de cada turno).
   - Para cada turma são exibidos o **TOTAL DE ALUNOS** ativos e a linha **capacidade**.
   - **Como editar a capacidade:** digite o novo número diretamente na caixinha da linha **capacidade** abaixo da turma que deseja alterar e clique em **Salvar Capacidades no Banco**. A alteração fica gravada no Banco de Dados da escola/ano para as próximas consultas.
3. **Tabela de Etapas e Resumo Geral de Matrículas:**
   - **Tabela Etapas (à esquerda):** calcula automaticamente **Cap. da Sala**, **Quant. Salas**, **Total de Alunos**, **Capacidade**, **Vagas disponíveis** e **Período** (`MANHÃ`, `TARDE` ou `MANHÃ/TARDE`) de todas as etapas regulares da escola.
   - **Resumo Geral de Matrículas (à direita):** mostra **Total de Alunos Manhã**, **Total de Alunos Tarde**, **Total sem AEE** e **Total** geral de matrículas.
4. **Impressão do Quadro Escolar:**
   - Se desejar alterar o nome do mês no título (ex.: `NOVEMBRO`), ajuste o campo **Mês Título** no topo do quadro.
   - Abaixo dos quadros, clique no botão **Imprimir Quadro Escolar (QE)** para imprimir o Quadro Escolar completo em folha A4 no formato paisagem.

---
---

# PARTE 2 — CONFIGURAÇÕES, CADASTROS E VIRADA DE ANO LETIVO

Esta segunda parte explica tudo o que é necessário para **configurar o sistema inicialmente**, **trocar pastas**, **cadastrar novas escolas**, **virar o ano letivo**, **reaproveitar bancos antigos** e **ajustar opções da unidade escolar**.

---

## 6. Alternar ou Cadastrar Nova Escola

No menu lateral, clique em **Configurações & Banco BF** (no módulo **Bolsa Família**).

- **Alternar de escola:** no cartão **Gestão de Escolas**, basta clicar sobre o nome de outra escola cadastrada — ou usar o seletor rápido de escolas no canto superior esquerdo do sistema. Cada escola mantém sua própria pasta no Google Drive e seus próprios arquivos separados.
- **Cadastrar e abrir uma nova escola:**
  1. No bloco **Cadastrar e Abrir Nova Escola**, digite o **Nome da Nova Escola** (ex.: `EM PROF MARIA APARECIDA`).
  2. *(Opcional)* Cole o link ou ID da **Pasta de Diários** dessa nova escola no Google Drive.
  3. Clique em **Criar Pasta da Nova Escola e Iniciar Banco**. O sistema organiza automaticamente uma pasta exclusiva e cria um banco limpo para ela.
- **Renomear a escola atual:** digite o novo nome no bloco **Renomear Escola Ativa** e clique em **Salvar Novo Nome da Escola Atual**. O sistema renomeia também a pasta dela no Google Drive sem perder nenhum dado.

---

## 7. Mudar de Ano Letivo ou Zerar Ciclos do Ano

Cada ano letivo trabalha com sua própria pasta e seu próprio Banco de Dados, evitando lentidão e misturas entre anos anteriores.

### 7.1. Abrir ou Criar um Novo Ano Letivo (Virada de Ano)
1. Vá em **Configurações & Banco BF** → cartão **Separação por Ano Letivo e Virada de Ano** (ou clique no botão **Ano** no cabeçalho superior).
2. Informe o número do novo ano (ex.: `2027`) e clique em **Abrir / Criar Banco do Ano 2027**.
3. O sistema cria uma pasta limpa para o novo ano dentro da pasta da escola e prepara um novo Banco de Dados para iniciar os ciclos bimestrais do zero.
   - Os dados do ano anterior (`2026`, por exemplo) permanecem salvos e podem ser consultados a qualquer momento clicando no botão do ano desejado (`Ano 2026 ✓` / `Ano 2027`).
   - A memória de vínculos de **NIS** dos alunos pode ser aproveitada automaticamente para o novo ano.

### 7.2. Zerar Informações do Ano Atual (Reiniciar Ciclos)
Se você precisar limpar os ciclos de conferência do ano atual para recomeçar:
1. No bloco **Zerar Informações do Ano**, marque as opções desejadas:
   - **Salvar cópia de segurança antes de zerar** *(recomendado — guarda um backup completo no Drive)*;
   - **Manter memória de Vínculos de Alunos (NIS)** *(recomendado — evita ter que vincular os mesmos alunos novamente)*.
2. Clique em **Zerar Ciclos e Reiniciar Ano** e confirme.

> **Observação:** Depois de virar para um novo ano ou limpar os dados, lembre-se também de atualizar os links da **Pasta de Diários** e da **Pasta das Listas Piloto** caso as planilhas do novo ano fiquem em pastas diferentes no Google Drive!

---

## 8. Conectar e Atualizar a Pasta de Diários de Classe

Sempre que começar um novo ano ou mudar o local dos diários no Google Drive:
1. No Google Drive, abra a pasta principal onde estão os diários da escola e copie o **link da barra de endereço** do navegador (ou apenas o ID final da pasta).
2. No sistema, entre em **Bolsa Família → Diários da Escola** (ou em **Declarações → Base de Diários**).
3. Cole o link no campo **Pasta de Diários de Classe (Google Drive)** e clique em **Salvar Link e Escanear Diários**.
4. O sistema irá ler todas as pastas e planilhas, separando automaticamente os diários de **Educação Infantil (60%)** e **Ensino Fundamental (75%)**.
5. **Importante:** Após escanear pela primeira vez (ou quando houver mudanças grandes nos diários), clique em **Pré-aquecer / Atualizar Índice em Lotes** e aguarde a barra terminar. Isso prepara a leitura rápida dos alunos para as conferências do Bolsa Família e para as Declarações com Faltas.

---

## 9. Cadastrar e Conectar a Pasta das Listas Piloto

Para que o sistema reconheça todas as turmas (usadas na conferência da SED, na pesquisa de alunos, nas declarações e no QE — Quadro Escolar):
1. No Google Drive, coloque todas as planilhas das turmas (Listas Piloto no formato Planilhas Google) dentro de uma pasta organizada.
2. Copie o **link** ou **ID** dessa pasta no Google Drive.
3. No sistema, acesse **Lista Piloto → Pasta, Peruas & Configurações**.
4. Cole o link no campo **Link ou ID da Pasta das Listas Piloto** e clique em **Salvar e Carregar Pasta**.
5. Confira logo abaixo o campo **Data Padrão de Chegada (Matrícula Suplementar - MS)** no formato `DD/MM` (use a data desejada como padrão ao incluir alunos novos vindos da SED).

> **Lembrete:** Ao trocar para um novo ano letivo com novas Listas Piloto em outra pasta, basta repetir os passos 2 a 4 acima e depois clicar em **Sincronizar Listas** no topo.

---

## 10. Vincular Manualmente Banco de Dados e Pastas (Reaproveitamento)

Se você já tiver um **Banco de Dados** antigo ou pastas já existentes no Google Drive (por exemplo, ao transferir dados ou reaproveitar um histórico já montado) e quiser conectá-los diretamente ao sistema:

1. Acesse **Bolsa Família → Configurações & Banco BF**.
2. Localize o cartão **Vincular IDs do Banco de Dados, Pasta do Ano e Pasta da Escola**.
3. Copie do navegador o **link completo** (ou apenas o **ID**) e cole nos campos correspondentes:
   - **ID ou Link do Banco de Dados (Planilhas Google):** planilha oficial que guarda os ciclos, vínculos e capacidades do QE.
   - **ID ou Link da Pasta do Ano:** pasta do Google Drive correspondente ao ano letivo ativo.
   - **ID ou Link da Pasta da Escola:** pasta da escola no Google Drive.
   - *(Opcional)* **ID ou Link da Pasta Raiz de Saída:** pasta geral onde ficam as pastas das escolas.
4. Clique em **Vincular IDs e Carregar Banco de Dados**. O sistema valida se há acesso, vincula os caminhos e recarrega os dados na tela.

> **Atenção importante sobre permissões:** Se a planilha do Banco de Dados ou as pastas do Google Drive pertencerem a outra conta Google, é obrigatório primeiro compartilhá-las com permissão de **Editor** para a conta responsável pelo sistema no Google Drive (ou fazer uma cópia na conta atual e usar o link da cópia).

---

## 11. Configurar Peruas Escolares, TEG e Marcadores de Observação

Para facilitar o preenchimento da coluna `OBS` nas Listas Piloto (com caixinhas de seleção acumulativas e filtros na pesquisa):
1. Vá em **Lista Piloto → Pasta, Peruas & Configurações**.
2. Role até o cartão **Configurar Peruas Escolares e Informações de Observação**.
3. O sistema já traz os padrões principais:
   - **`@`** — Aluno vai embora sozinho;
   - **`TEG`** — Transporte Escolar Gratuito;
   - **`TIO TIAGO`** e **`TIO ZEZINHO`** — Peruas escolares.
4. **Para adicionar uma nova perua ou sigla:**
   - Em **Texto na Coluna OBS**, digite como deve aparecer na planilha (ex.: `TIO JOÃO`);
   - Escolha a **Categoria** (*Perua Escolar*, *Transporte*, *Saída* ou *Outro Marcador*);
   - Digite uma **Descrição amigável** e clique em **Adicionar Marcador**.
5. **Para remover** algum marcador que não exista mais na escola, clique no ícone da **lixeira** no cartão correspondente (ou clique em **Restaurar Padrões** para voltar à lista inicial).

---

## 12. Personalizar Papel Timbrado e Cabeçalho das Declarações

### 12.1. Alterar a Imagem do Papel Timbrado
Caso o município ou a escola atualize o modelo do papel timbrado anual:
1. Entre em qualquer uma das abas de **Declarações** (*Matrícula*, *Transferência*, *Conclusão* ou *Com Faltas*).
2. Clique no botão **Alterar Papel Timbrado** no topo.
3. Escolha uma imagem do computador (PNG ou JPEG em formato A4 retrato).
4. A troca passa a valer para as declarações impressas. Caso deseje voltar ao papel timbrado padrão original, clique em **Timbrado Padrão**.

### 12.2. Configurar Nome, Endereço, Telefone e Assinatura da Escola
Nas telas de **Declaração de Matrícula**, **Solicitação de Transferência** ou **Declaração de Conclusão**:
1. Clique em **Configurar Cabeçalho da Escola**.
2. Preencha os campos da sua unidade: **Nome Curto**, **Nome por Extenso**, **Endereço Completo**, **Telefone**, **E-mail da Escola**, **Cidade** e **Rótulo da Linha de Assinatura** (ex.: *Direção / Secretaria Escolar*).
3. Você também pode marcar ou desmarcar se deseja exibir a caixinha `[ X ]` de modelo ao lado do título. As informações ficam salvas para as próximas emissões.

### 12.3. Ajustar Sensibilidade de Nomes na Conferência do Bolsa Família
Em **Configurações & Banco BF → Parâmetros de Similaridade e Revisão**:
- **Limite de Similaridade (`0.50` a `0.99`, padrão `0.82`):** controla o quão parecidos dois nomes (entre PDF do Bolsa Família e Diário) precisam ser para serem associados automaticamente. Diminuir um pouco ajuda quando há abreviações ou erros de digitação; aumentar evita associações erradas entre nomes muito parecidos.
- **Máximo de Candidatos na Revisão:** define quantas sugestões parecidas aparecem por vez quando você revisa um aluno manualmente.

---

## 13. Padrão de Nomes das Planilhas no Google Drive

Para que o sistema identifique automaticamente **todas as turmas**, **etapas** e **turnos** todo início de ano sem precisar configurar nada à mão:

1. **Planilhas das Listas Piloto:**
   - Nomeie cada planilha no Google Drive com o **nome da turma e o turno**, por exemplo:
     - `JD. II A - MANHÃ`
     - `1º A - MANHÃ` *(ou `1º ANO A - MANHÃ`)*
     - `1º C - TARDE`
     - `4º B - TARDE`
     - `AEE - MANHÃ` e `AEE - TARDE`
   - Colocando **MANHÃ** ou **TARDE** no nome da planilha, o **QE — Quadro Escolar** separa automaticamente a linha da Manhã (em cima) e a linha da Tarde (em baixo), mesmo quando mudarem as salas de um ano para o outro.
   - Prefira usar **Planilhas Google** (em vez de manter arquivos `.xlsx` sem converter), pois assim o botão **Aplicar na Lista Piloto** e a edição pela tela **Procurar Aluno** gravam as alterações diretamente na hora.

2. **Planilhas dos Diários de Classe:**
   - Mantenha uma pasta organizada para os diários do ano atual e dê nomes claros contendo a turma (ex.: `1º ANO A`, `JD II B`), garantindo que as abas de bimestre (`1o BIMESTRE`, `2o BIMESTRE`, etc.) estejam preenchidas no padrão da escola.
   - Sempre que novos alunos ou turmas entrarem nos diários no meio do ano, abra **Diários da Escola** e clique em **Pré-aquecer / Atualizar Índice em Lotes** para manter as buscas rápidas e atualizadas.

---

## 14. Dúvidas Comuns do Dia a Dia

- **Alterei uma Lista Piloto diretamente pelo Google Planilhas, mas o sistema ainda mostra a lista antiga. O que faço?**
  - Clique no botão **Sincronizar Listas** no topo da aba **Lista Piloto** (ou **Atualizar Ativos do Drive** dentro do **QE — Quadro Escolar**) para reler as planilhas do Google Drive na hora.

- **Um aluno aparece sem número de R.A. na Declaração com Faltas. Como resolver?**
  - Confira se o R.A. do aluno está preenchido na Lista Piloto da turma dele (e sincronize as Listas Piloto). Caso ainda não esteja na Lista Piloto, basta digitar o número diretamente no campo **R.A. Nº do Aluno** na própria tela da declaração.

- **Quando tento vincular um Banco de Dados ou Pasta de outro e-mail, dá erro de permissão. Por quê?**
  - No Google Drive, a pasta ou planilha precisa estar compartilhada como **Editor** (não apenas Leitor) com a conta Google vinculada à escola no sistema.

- **Ao imprimir uma Declaração, saiu apenas o texto sem o fundo do papel timbrado (ou cortado em duas folhas). Como corrigir?**
  - Na janela de impressão do navegador, clique em **Mais definições**, marque a opção **Gráficos de segundo plano** e altere **Margens** para **Nenhuma** e **Escala** para **Padrão (100%)**.
