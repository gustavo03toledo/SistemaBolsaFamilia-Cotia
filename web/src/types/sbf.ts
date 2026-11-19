export interface PeriodoBolsa {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
}

export interface EscolaRegistrada {
  id: string;
  nome: string;
  pastaDiariosId: string;
  pastaEscolaId: string;
  pastaEscolaUrl: string;
  anosDisponiveis?: number[];
}

export interface InfoAnoAtivo {
  ano: number;
  pastaAnoId: string;
  pastaAnoUrl: string;
  bancoDadosId: string;
  bancoDadosUrl: string;
}

export interface ConfigPublica {
  appName: string;
  versaoSchema?: string;
  pastaDiariosId: string;
  pastaSaidaDadosId: string;
  pastaSaidaDadosUrl: string;
  periodosBolsaFamilia: PeriodoBolsa[];
  anoAtual: number;
  escolaAtiva?: EscolaRegistrada;
  anoAtivo?: number;
  infoAnoAtivo?: InfoAnoAtivo;
  escolasRegistradas?: EscolaRegistrada[];
  anosDisponiveis?: number[];
}

export interface AlunoExtraidoPdf {
  nome: string;
  dataNascimento: string;
  nis: string;
  responsavelFamiliar: string;
}

export interface VinculoAluno {
  nis: string;
  nomeBolsa: string;
  nomeDiario: string;
  turma: string;
  arquivoId: string;
  atualizadoEm: string;
  serie?: string;
  numeroChamada?: string;
  diarioOrigem?: string;
  usuario?: string;
}

export interface CicloRegistrado {
  nomeAba: string;
  periodoId: string;
  ano: number;
  totalRegistros: number;
  atualizadoEm: string;
  url: string;
  cicloBolsa?: {
    id: string;
    nome: string;
    ano: number;
    rotulo: string;
    curto: string;
  };
}

export type TipoMovimentacaoAluno =
  | 'TRANSFERIDO_ESCOLA'
  | 'TRANSFERIDO_PARCIAL'
  | 'REMANEJADO_INTERNO'
  | 'NAO_PERTENCE_UE'
  | 'ABANDONO_EVASAO'
  | 'ATESTADO_JUSTIFICADO';

export interface PayloadMovimentacaoAluno {
  abaCiclo: string;
  nomeBolsa: string;
  nisBolsa?: string;
  ordemOriginal?: string | number;
  tipoMovimentacao: TipoMovimentacaoAluno;
  dataMovimentacao?: string;
  escolaDestino?: string;
  turma?: string;
  presencasMes1?: number;
  faltasMes1?: number;
  presencasMes2?: number;
  faltasMes2?: number;
  observacao?: string;
  memorizarVinculoNis?: boolean;
}

// ============================================================================
// MÓDULO: CONFERÊNCIA E ATUALIZAÇÃO DE LISTAS PILOTO (RELATÓRIO SED)
// ============================================================================

export interface AlunoRelatorioSed {
  serie: string;
  nr: number;
  nome: string;
  nomeNormalizado: string;
  ra: string;
  raLimpo: string;
  digRa: string;
  raFormatado: string;
  ufRa: string;
  dataNascimento: string;
  situacao: string;
  situacaoNormalizada: string;
  dataMovimentacao: string;
  dataMovimentacaoCurta: string;
  deficiencia: string;
}

export interface TurmaRelatorioSed {
  nrClasse: string;
  turmaSed: string;
  turmaCodigo: string;
  tipoEnsino: string;
  sala: string;
  anoLetivo: string;
  dataGeracao: string;
  escola: string;
  resumoTopo: {
    ativos: number;
    transferidos: number;
    abandonos: number;
    ncom: number;
    outros: number;
    cadastrados: number;
  };
  alunos: AlunoRelatorioSed[];
}

export interface AlunoListaPilotoDrive {
  linhaPlanilha: number;
  rm: string;
  nr: number;
  nome: string;
  nomeNormalizado: string;
  situacao: string;
  situacaoNormalizada: string;
  dataMovimentacao: string;
  dataMovimentacaoCurta: string;
  dataNascimento: string;
  ra: string;
  raLimpo: string;
  direitoImagem: string;
  observacoes: string;
}

export interface TurmaListaPilotoDrive {
  idUnico: string;
  planilhaId: string;
  planilhaNome: string;
  planilhaUrl: string;
  mimeType: string;
  editavelNoSheets: boolean;
  nomeAba: string;
  turmaCodigo: string;
  turmaExibicao: string;
  sala: string;
  professora: string;
  horarios: string;
  anoLetivo: string;
  linhaCabecalho: number;
  ultimaLinhaComAluno: number;
  proximaLinhaDisponivel: number;
  totalAlunos: number;
  totalAtivos: number;
  totalMovimentados: number;
  alunos: AlunoListaPilotoDrive[];
}

export interface ResultadoEscanearListasPiloto {
  ok: boolean;
  configurado: boolean;
  pastaListaPilotoId: string;
  pastaNome: string;
  pastaUrl: string;
  totalArquivos: number;
  turmas: TurmaListaPilotoDrive[];
  erros: string[];
  avisos: string[];
  atualizadoEm?: string;
}

export type TipoMudancaPiloto =
  | 'NOVO_ALUNO'
  | 'NOVA_MOVIMENTACAO'
  | 'ALTERACAO_SITUACAO'
  | 'DIVERGENCIA_DADOS';

export interface MudancaDetectadaPiloto {
  id: string;
  tipo: TipoMudancaPiloto;
  selecionada: boolean;
  linhaPlanilha?: number;
  nr: number;
  nome: string;
  // Valores atuais na Lista Piloto (se já existia)
  rmAtual: string;
  situacaoAtual: string;
  dataMovAtual: string;
  raAtual: string;
  imAtual: string;
  obsAtual: string;
  // Valores vindos do SED
  situacaoSed: string;
  dataMovSedCompleta: string;
  dataMovSedCurta: string;
  dataNascimentoSed: string;
  raFormatadoSed: string;
  deficienciaSed: string;
  // Valores editáveis pelo operador para gravar na Lista Piloto
  rmGravar: string;
  situacaoGravar: string;
  dataMovGravar: string;
  dataNascimentoGravar: string;
  raGravar: string;
  direitoImagemGravar: string;
  observacoesGravar: string;
  descricaoMudanca: string;
}

export interface ComparacaoTurmaPiloto {
  idComparacao: string;
  turmaCodigo: string;
  nomeExibicao: string;
  turmaSed: TurmaRelatorioSed | null;
  turmaPiloto: TurmaListaPilotoDrive | null;
  statusSala: 'OK_SEM_ALTERACAO' | 'COM_ALTERACOES' | 'SEM_PLANILHA_DRIVE' | 'SEM_TURMA_SED';
  novosAlunosCount: number;
  novasMovimentacoesCount: number;
  divergenciasDadosCount: number;
  mudancas: MudancaDetectadaPiloto[];
}

export interface ItemCapacidadeQuadroEscolar {
  chaveTurma: string;
  nomePlanilha: string;
  turmaExibicao: string;
  etapa: string;
  turno: 'MANHA' | 'TARDE' | string;
  capacidade: number;
  atualizadoEm?: string;
}

export interface ResultadoQuadroEscolarConfig {
  ok: boolean;
  mensagem?: string;
  escolaId?: string;
  escolaNome?: string;
  anoAtivo?: number;
  bancoDadosId?: string;
  bancoDadosUrl?: string;
  total: number;
  capacidades: Record<string, ItemCapacidadeQuadroEscolar>;
  itens: ItemCapacidadeQuadroEscolar[];
}

