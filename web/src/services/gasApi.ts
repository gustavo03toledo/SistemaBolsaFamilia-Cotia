import { ConfigPublica, PayloadMovimentacaoAluno, VinculoAluno } from '../types/sbf';

export function getGasDirectUrl(): string {
  return (
    localStorage.getItem('SBF_GAS_WEBAPP_URL') ||
    (import.meta as any).env?.VITE_GAS_WEBAPP_URL ||
    ''
  );
}

export function setGasDirectUrl(url: string) {
  if (url && url.trim()) {
    localStorage.setItem('SBF_GAS_WEBAPP_URL', url.trim());
  }
}

export async function callGasApi<T = any>(action: string, payload: Record<string, any> = {}): Promise<T> {
  const apiKey = localStorage.getItem('SBF_GAS_API_SECRET') || '';

  // 1. Tenta primeiro o Proxy Serverless da Vercel (/api/gas) quando em producao
  try {
    const proxyRes = await fetch('/api/gas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload, apiKey })
    });

    const contentType = proxyRes.headers.get('content-type') || '';
    if (proxyRes.ok && contentType.includes('application/json')) {
      const json = await proxyRes.json();
      if (!json.ok) {
        throw new Error(json.error || `Falha na action ${action}`);
      }
      return json.data as T;
    }
  } catch (err: any) {
    if (err?.message && !err.message.includes('Failed to fetch') && !err.message.includes('Unexpected token')) {
      throw err;
    }
  }

  // 2. Fallback direto para o Google Apps Script usando text/plain (evita preflight OPTIONS de CORS)
  const directUrl = getGasDirectUrl();
  if (!directUrl) {
    throw new Error(
      'URL da API do Google Apps Script nao configurada. Defina VITE_GAS_WEBAPP_URL no .env ou informe a URL /exec na aba Configuracoes.'
    );
  }
  const directRes = await fetch(directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload, apiKey }),
    redirect: 'follow'
  });

  const text = await directRes.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      'Nao foi possivel ler a resposta JSON do Google Apps Script. Verifique se o deploy do Web App esta com acesso "Qualquer pessoa".'
    );
  }

  if (!parsed.ok) {
    throw new Error(parsed.error || `Erro ao executar ${action}`);
  }

  return parsed.data as T;
}

export const gasApi = {
  getConfigPublica: () => callGasApi<ConfigPublica>('GET_CONFIG_PUBLICA'),
  bootstrapSistema: (anoReferencia?: number, periodoId?: string, pastaDiariosId?: string, abaCiclo = '') =>
    callGasApi<{
      ok: boolean;
      config: ConfigPublica;
      painel: any;
      dadosCiclo: any;
      vinculos: VinculoAluno[];
    }>('BOOTSTRAP_SISTEMA', {
      anoReferencia,
      periodoId,
      pastaDiariosId,
      abaCiclo,
      modoCompacto: true
    }),
  escanearPastaDiarios: (pastaDiariosId: string, anoReferencia: number) =>
    callGasApi('ESCANEAR_PASTA_DIARIOS', { pastaDiariosId, anoReferencia }),
  obterPainelOperacional: (anoReferencia: number, periodoId: string, pastaDiariosId: string) =>
    callGasApi('OBTER_PAINEL_OPERACIONAL', { anoReferencia, periodoId, pastaDiariosId }),
  prepararSistema: (anoReferencia: number, periodoId: string, pastaDiariosId: string) =>
    callGasApi('PREPARAR_SISTEMA', { anoReferencia, periodoId, pastaDiariosId }),
  atualizarIndiceDiarios: (anoReferencia: number, operacaoId: string, pastaDiariosId: string) =>
    callGasApi('ATUALIZAR_INDICE_DIARIOS', { anoReferencia, operacaoId, pastaDiariosId }),
  recriarIndiceDiarios: (anoReferencia: number, operacaoId: string, pastaDiariosId: string) =>
    callGasApi('RECRIAR_INDICE_DIARIOS', { anoReferencia, operacaoId, pastaDiariosId }),
  verificarCicloBolsa: (periodoId: string, anoReferencia: number) =>
    callGasApi('VERIFICAR_CICLO_BOLSA', { periodoId, anoReferencia }),
  iniciarProcessamento: (dadosEntrada: Record<string, any>) =>
    callGasApi('INICIAR_PROCESSAMENTO', dadosEntrada),
  continuarProcessamento: (processamentoId: string, operacaoId: string) =>
    callGasApi('CONTINUAR_PROCESSAMENTO', { processamentoId, operacaoId }),
  obterProgresso: (operacaoId: string) =>
    callGasApi('OBTER_PROGRESSO', { operacaoId }),
  obterDadosCiclo: (abaCiclo = '', modoCompacto = true) =>
    callGasApi('OBTER_DADOS_CICLO', { abaCiclo, modoCompacto }),
  buscarRevisaoAssistida: (dadosBusca: Record<string, any>) =>
    callGasApi('BUSCAR_REVISAO_ASSISTIDA', dadosBusca),
  confirmarCorrecao: (dadosCorrecao: Record<string, any>) =>
    callGasApi('CONFIRMAR_CORRECAO', dadosCorrecao),
  salvarAjusteFrequencia: (dados: Record<string, any>) =>
    callGasApi('SALVAR_AJUSTE_FREQUENCIA', dados),
  registrarMovimentacaoAluno: (dados: PayloadMovimentacaoAluno) =>
    callGasApi('REGISTRAR_MOVIMENTACAO_ALUNO', dados),
  salvarConfiguracaoMvp2: (dados: { limiteRevisao: number; maxCandidatos: number }) =>
    callGasApi('SALVAR_CONFIGURACAO', dados),
  listarContextoEscolasAnos: () =>
    callGasApi('LISTAR_CONTEXTO_ESCOLAS_ANOS'),
  selecionarOuCriarEscola: (dados: {
    escolaId?: string;
    nomeEscola?: string;
    pastaDiariosId?: string;
    anoReferencia?: number;
    renomearEscolaAtual?: boolean;
  }) => callGasApi('SELECIONAR_OU_CRIAR_ESCOLA', dados),
  selecionarOuCriarAnoLetivo: (dados: {
    anoReferencia: number;
    copiarVinculosNis?: boolean;
  }) => callGasApi('SELECIONAR_OU_CRIAR_ANO_LETIVO', dados),
  zerarAnoLetivoCiclos: (dados: {
    anoReferencia?: number;
    manterVinculosNis?: boolean;
    manterDiariosIndexados?: boolean;
    arquivarBackup?: boolean;
  }) => callGasApi('ZERAR_ANO_LETIVO_CICLOS', dados),
  aprovarLista: (dados: Record<string, any>) =>
    callGasApi('APROVAR_LISTA', dados),
  limparBanco: (operacaoId: string) =>
    callGasApi('LIMPAR_BANCO', { operacaoId }),
  organizarAbas: () =>
    callGasApi('ORGANIZAR_ABAS'),
  listarVinculosAlunos: () =>
    callGasApi<{ ok: boolean; total: number; vinculos: VinculoAluno[] }>('LISTAR_VINCULOS_ALUNOS'),
  salvarVinculoAluno: (dados: Partial<VinculoAluno>) =>
    callGasApi('SALVAR_VINCULO_ALUNO', dados),
  removerVinculoAluno: (dados: { nis?: string; nomeBolsa?: string }) =>
    callGasApi('REMOVER_VINCULO_ALUNO', dados)
};
