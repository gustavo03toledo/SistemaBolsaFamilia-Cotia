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
