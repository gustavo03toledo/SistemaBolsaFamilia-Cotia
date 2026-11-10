import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  FolderSearch,
  FileUp,
  ClipboardCheck,
  Settings,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Search,
  Printer,
  Copy,
  Check,
  ChevronDown,
  FolderOpen,
  FileSpreadsheet,
  Sparkles,
  Trash2,
  Link2,
  Edit3,
  School,
  Calendar,
  Plus,
  RotateCcw,
  Zap
} from 'lucide-react';
import { gasApi, getGasDirectUrl, setGasDirectUrl } from './services/gasApi';
import {
  extrairAlunosDeArquivoPdfNoCliente,
  extrairAlunosDeTextoBolsa,
  extrairIdPastaDrive
} from './services/pdfExtractor';
import {
  AlunoExtraidoPdf,
  ConfigPublica,
  TipoMovimentacaoAluno,
  VinculoAluno
} from './types/sbf';

type ScreenId = 'painel' | 'diarios' | 'processamento' | 'conferencia' | 'configuracoes';
type TabCicloId =
  | 'pendencias'
  | 'movimentacoes'
  | 'abaixoLimite'
  | 'conferidos'
  | 'naoEncontrados'
  | 'revisar'
  | 'vinculos'
  | 'historico';

const PASTA_SAIDA_UNICA_URL =
  (import.meta as any).env?.VITE_PASTA_SAIDA_DADOS_URL ||
  'https://drive.google.com/drive/my-drive';

const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutos (Stale-While-Revalidate)

function classificarEtapaDiarioCliente(
  diario: any,
  nomeEscolaAtiva = ''
): 'INFANTIL' | 'FUNDAMENTAL' | 'ESPECIAL' {
  if (diario?.Etapa === 'INFANTIL' || diario?.Etapa === 'FUNDAMENTAL' || diario?.Etapa === 'ESPECIAL') {
    return diario.Etapa;
  }
  const nomeEscolaNorm = String(nomeEscolaAtiva || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/^(EM|E\.M\.|ESCOLA\s+MUNICIPAL)\s+/g, '')
    .trim();

  let nome = String(diario?.Nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (nomeEscolaNorm) {
    nome = nome.split(nomeEscolaNorm).join(' ').trim();
  }

  if (/\bAEE\b|\bEDUCACAO\s+FISICA\b/.test(nome)) {
    return 'ESPECIAL';
  }
  if (/\b[1-9]\s*(O|º|°)?\s*(ANO|SERIE)\b/.test(nome)) {
    return 'FUNDAMENTAL';
  }
  if (
    /\b(JARDIM|JD|MATERNAL|BERCARIO|CRECHE)\b/.test(nome) ||
    /\bPRE\s*[-–]?\s*(I|II|1|2|ESCOLA)\b/.test(nome) ||
    /\b(EDUCACAO|ED\.?)\s+INFANTIL\b/.test(nome)
  ) {
    return 'INFANTIL';
  }
  return 'FUNDAMENTAL';
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('painel');
  const [config, setConfig] = useState<ConfigPublica | null>(null);
  const [pastaDiariosInput, setPastaDiariosInput] = useState<string>('');
  const [periodoId, setPeriodoId] = useState<string>('ABR_MAI');
  const [anoReferencia, setAnoReferencia] = useState<number>(new Date().getFullYear());

  const [painelOp, setPainelOp] = useState<any>(null);
  const [dadosCiclo, setDadosCiclo] = useState<any>(null);
  const [abaCicloSelecionada, setAbaCicloSelecionada] = useState<string>('');
  const [vinculos, setVinculos] = useState<VinculoAluno[]>([]);

  const [busyMessage, setBusyMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string>('');

  // Menus no Header
  const [menuCiclosOpen, setMenuCiclosOpen] = useState(false);
  const [menuAprovadasOpen, setMenuAprovadasOpen] = useState(false);

  // Estado Diarios e Base
  const [statusScanDiarios, setStatusScanDiarios] = useState<any>(null);
  const [progressoIndice, setProgressoIndice] = useState<any>(null);

  // Estado Novo Processamento (PDF)
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [textoManual, setTextoManual] = useState<string>('');
  const [alunosPreview, setAlunosPreview] = useState<AlunoExtraidoPdf[]>([]);
  const [etapaProcessamento, setEtapaProcessamento] = useState<any>(null);

  // Estado Mesa de Conferencia & Split-View Revisao
  const [activeTabCiclo, setActiveTabCiclo] = useState<TabCicloId>('pendencias');
  const [filtroBuscaTabela, setFiltroBuscaTabela] = useState<string>('');
  const [lancadosMap, setLancadosMap] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('SBF_LANCADOS_MAP') || '{}');
    } catch {
      return {};
    }
  });
  const [copiedNis, setCopiedNis] = useState<string>('');

  // Edicao inline Abaixo do Limite
  const [editandoLinhaKey, setEditandoLinhaKey] = useState<string>('');
  const [formAjuste, setFormAjuste] = useState({
    presencasMes1: 0,
    faltasMes1: 0,
    presencasMes2: 0,
    faltasMes2: 0,
    observacao: ''
  });

  // Split-View Revisao Assistida
  const [alunoRevisaoSel, setAlunoRevisaoSel] = useState<any>(null);
  const [buscaRevNome, setBuscaRevNome] = useState<string>('');
  const [buscaRevSerie, setBuscaRevSerie] = useState<string>('');
  const [buscaRevTurma, setBuscaRevTurma] = useState<string>('');
  const [buscaRevChamada, setBuscaRevChamada] = useState<string>('');
  const [buscaRevObs, setBuscaRevObs] = useState<string>('');
  const [candidatosRevisao, setCandidatosRevisao] = useState<any[]>([]);
  const [candidatoSelIndex, setCandidatoSelIndex] = useState<number>(0);
  const [buscandoRevisao, setBuscandoRevisao] = useState<boolean>(false);

  // Modal de Excecao / Movimentacao / Aluno Transferido
  const [modalMovAluno, setModalMovAluno] = useState<any>(null);
  const [formMov, setFormMov] = useState<{
    tipoMovimentacao: TipoMovimentacaoAluno;
    dataMovimentacao: string;
    escolaDestino: string;
    turma: string;
    presencasMes1: number;
    faltasMes1: number;
    presencasMes2: number;
    faltasMes2: number;
    observacao: string;
    memorizarVinculoNis: boolean;
  }>({
    tipoMovimentacao: 'TRANSFERIDO_ESCOLA',
    dataMovimentacao: '',
    escolaDestino: '',
    turma: '',
    presencasMes1: 0,
    faltasMes1: 0,
    presencasMes2: 0,
    faltasMes2: 0,
    observacao: '',
    memorizarVinculoNis: true
  });

  // Configuracoes + Gestao Multi-Escola e Multi-Ano
  const [limiteSimilaridade, setLimiteSimilaridade] = useState<number>(0.82);
  const [maxCandidatos, setMaxCandidatos] = useState<number>(5);
  const [gasUrlInput, setGasUrlInput] = useState<string>(getGasDirectUrl());
  const [menuEscolasOpen, setMenuEscolasOpen] = useState(false);
  const [menuAnosOpen, setMenuAnosOpen] = useState(false);
  const [novaEscolaNome, setNovaEscolaNome] = useState<string>('');
  const [novaEscolaPastaDiarios, setNovaEscolaPastaDiarios] = useState<string>('');
  const [renomearEscolaInput, setRenomearEscolaInput] = useState<string>('');
  const [novoAnoInput, setNovoAnoInput] = useState<number>(new Date().getFullYear() + 1);
  const [copiarVinculosNovoAno, setCopiarVinculosNovoAno] = useState<boolean>(true);
  const [manterVinculosZerar, setManterVinculosZerar] = useState<boolean>(true);
  const [manterDiariosZerar, setManterDiariosZerar] = useState<boolean>(false);
  const [arquivarBackupZerar, setArquivarBackupZerar] = useState<boolean>(true);

  useEffect(() => {
    carregarInicial();
  }, []);

  function aplicarDadosBootstrap(boot: any) {
    if (!boot) return;
    const cfg = boot.config;
    if (cfg) {
      setConfig(cfg);
      setPastaDiariosInput(cfg.pastaDiariosId || '');
      if (cfg.anoAtivo || cfg.anoAtual) {
        setAnoReferencia(Number(cfg.anoAtivo || cfg.anoAtual));
      }
      if (cfg.escolaAtiva?.nome) {
        setRenomearEscolaInput(cfg.escolaAtiva.nome);
      }
      if (cfg.periodosBolsaFamilia?.length) {
        setPeriodoId(cfg.periodosBolsaFamilia[1]?.id || cfg.periodosBolsaFamilia[0].id);
      }
    }
    if (boot.painel) setPainelOp(boot.painel);
    if (boot.vinculos) setVinculos(boot.vinculos);
    if (boot.dadosCiclo) {
      setDadosCiclo(boot.dadosCiclo);
      const nomeAba = boot.dadosCiclo?.cicloAtivo?.nomeAba || '';
      setAbaCicloSelecionada(nomeAba);
      if (nomeAba) {
        try {
          sessionStorage.setItem(
            `SBF_CICLO_CACHE_V1_${nomeAba}`,
            JSON.stringify({ savedAt: Date.now(), data: boot.dadosCiclo })
          );
        } catch {
          // ignore quota
        }
      }
      if (boot.dadosCiclo?.configuracao) {
        setLimiteSimilaridade(Number(boot.dadosCiclo.configuracao.limiteRevisao || 0.82));
        setMaxCandidatos(Number(boot.dadosCiclo.configuracao.maxCandidatos || 5));
      }
    }
  }

  async function carregarInicial(forcarRede = false) {
    setErrorMessage('');
    let temCacheLocal = false;
    let cacheFresco = false;

    if (!forcarRede) {
      try {
        const cachedRaw = sessionStorage.getItem('SBF_BOOTSTRAP_CACHE_V1');
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          const payload = parsed?.data || parsed;
          const savedAt = Number(parsed?.savedAt || 0);
          aplicarDadosBootstrap(payload);
          temCacheLocal = true;
          cacheFresco = savedAt > 0 && Date.now() - savedAt < STALE_TIME_MS;
        }
      } catch {
        // ignore cache parse error
      }
    }

    if (!temCacheLocal) {
      setBusyMessage('Carregando sistema SBF Panorama (Bootstrap Unificado)...');
    }

    try {
      const boot = await gasApi.bootstrapSistema(anoReferencia, periodoId, '', '');
      aplicarDadosBootstrap(boot);
      try {
        sessionStorage.setItem(
          'SBF_BOOTSTRAP_CACHE_V1',
          JSON.stringify({ savedAt: Date.now(), data: boot })
        );
      } catch {
        // ignore quota
      }
    } catch (err: any) {
      if (!temCacheLocal && !cacheFresco) {
        setErrorMessage(err?.message || 'Erro ao inicializar comunicação com o Apps Script.');
      }
    } finally {
      setBusyMessage('');
    }
  }

  async function recarregarDadosCiclo(abaAlvo?: string, usarCacheInstantaneo = false) {
    const aba = typeof abaAlvo === 'string' ? abaAlvo : abaCicloSelecionada;
    setErrorMessage('');

    let exibiuCache = false;
    if (usarCacheInstantaneo && aba) {
      try {
        const cachedCiclo = sessionStorage.getItem(`SBF_CICLO_CACHE_V1_${aba}`);
        if (cachedCiclo) {
          const parsed = JSON.parse(cachedCiclo);
          const dataCiclo = parsed?.data || parsed;
          setDadosCiclo(dataCiclo);
          setAbaCicloSelecionada(aba);
          exibiuCache = true;
        }
      } catch {
        // ignore
      }
    }

    if (!exibiuCache) {
      setBusyMessage('Atualizando dados do ciclo...');
    }

    try {
      const dados = await gasApi.obterDadosCiclo(aba, true);
      setDadosCiclo(dados);
      const nomeAbaReal = dados?.cicloAtivo?.nomeAba || aba;
      setAbaCicloSelecionada(nomeAbaReal || '');
      if (nomeAbaReal) {
        try {
          sessionStorage.setItem(
            `SBF_CICLO_CACHE_V1_${nomeAbaReal}`,
            JSON.stringify({ savedAt: Date.now(), data: dados })
          );
        } catch {
          // ignore quota
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao carregar dados do ciclo.');
    } finally {
      setBusyMessage('');
    }
  }

  async function handleAlternarEscola(escolaId: string, nomeEscola?: string, pastaDiarios?: string, renomear = false) {
    setMenuEscolasOpen(false);
    setBusyMessage(
      renomear
        ? `Renomeando escola ativa e atualizando pasta no Google Drive...`
        : `Alternando para a escola "${nomeEscola || escolaId}" e organizando pasta exclusiva...`
    );
    setErrorMessage('');
    setSuccessBanner('');
    try {
      const res = await gasApi.selecionarOuCriarEscola({
        escolaId,
        nomeEscola,
        pastaDiariosId: pastaDiarios,
        anoReferencia,
        renomearEscolaAtual: renomear
      });
      sessionStorage.removeItem('SBF_BOOTSTRAP_CACHE_V1');
      if (res?.config) {
        setConfig(res.config);
      }
      setSuccessBanner(res?.mensagem || 'Escola atualizada com sucesso!');
      setNovaEscolaNome('');
      setNovaEscolaPastaDiarios('');
      await carregarInicial(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao alternar/configurar escola.');
    } finally {
      setBusyMessage('');
    }
  }

  async function handleAlternarAnoLetivo(anoAlvo: number, copiarVinculos = true) {
    setMenuAnosOpen(false);
    setBusyMessage(`Abrindo Banco de Dados e Pasta do Ano Letivo ${anoAlvo}...`);
    setErrorMessage('');
    setSuccessBanner('');
    try {
      const res = await gasApi.selecionarOuCriarAnoLetivo({
        anoReferencia: anoAlvo,
        copiarVinculosNis: copiarVinculos
      });
      setAnoReferencia(anoAlvo);
      sessionStorage.removeItem('SBF_BOOTSTRAP_CACHE_V1');
      if (res?.config) {
        setConfig(res.config);
      }
      setSuccessBanner(res?.mensagem || `Ano letivo ${anoAlvo} selecionado!`);
      await carregarInicial(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao alternar ano letivo.');
    } finally {
      setBusyMessage('');
    }
  }

  async function handleZerarAnoLetivo() {
    const nomeEscola = config?.escolaAtiva?.nome || 'Escola Ativa';
    const confirma = window.confirm(
      `ATENÇÃO: Deseja zerar todos os ciclos bimestrais do ano ${anoReferencia} da escola "${nomeEscola}" para iniciar novos ciclos do zero?\n\n` +
        (arquivarBackupZerar
          ? '• Uma cópia completa de backup será salva na subpasta Historico_Arquivado.\n'
          : '') +
        (manterVinculosZerar
          ? '• A memória permanente de Vínculos por NIS será preservada.\n'
          : '• A tabela de Vínculos por NIS também será limpa.\n')
    );
    if (!confirma) return;

    setBusyMessage(`Zerando ciclos do ano ${anoReferencia} e preparando novo ciclo limpo...`);
    setErrorMessage('');
    setSuccessBanner('');
    try {
      const res = await gasApi.zerarAnoLetivoCiclos({
        anoReferencia,
        manterVinculosNis: manterVinculosZerar,
        manterDiariosIndexados: manterDiariosZerar,
        arquivarBackup: arquivarBackupZerar
      });
      sessionStorage.clear();
      setSuccessBanner(res?.mensagem || `Ano ${anoReferencia} zerado com sucesso!`);
      await carregarInicial(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao zerar informações do ano letivo.');
    } finally {
      setBusyMessage('');
    }
  }

  async function carregarVinculos() {
    try {
      const res = await gasApi.listarVinculosAlunos();
      setVinculos(res?.vinculos || []);
    } catch {
      // silencioso
    }
  }

  // ============================================================================
  // Acao: Escanear Pasta de Diarios pelo Link/ID
  // ============================================================================
  async function handleEscanearPastaDiarios() {
    if (!pastaDiariosInput.trim()) {
      setErrorMessage('Cole o link ou ID da pasta do Google Drive onde estão os diários.');
      return;
    }
    setBusyMessage('Escaneando pasta de diários no Google Drive...');
    setErrorMessage('');
    setSuccessBanner('');
    try {
      const status = await gasApi.escanearPastaDiarios(pastaDiariosInput.trim(), anoReferencia);
      setStatusScanDiarios(status);
      if (status?.pastaDiariosId) {
        setPastaDiariosInput(status.pastaDiariosId);
      }
      if (status?.painel) {
        setPainelOp(status.painel);
      }
      const total = status?.confirmacaoLeituraDiarios?.totalDiariosNaPasta ?? 0;
      setSuccessBanner(
        `Pasta escaneada com sucesso${status?.pastaDiariosNome ? ` (${status.pastaDiariosNome})` : ''}: ${total} diário(s) suportado(s) encontrado(s).`
      );
      await recarregarDadosCiclo();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao escanear a pasta dos diários.');
    } finally {
      setBusyMessage('');
    }
  }

  // ============================================================================
  // Acao: Atualizar ou Recriar Indice em Lotes
  // ============================================================================
  async function handleAtualizarIndiceLotes(reiniciar: boolean) {
    setBusyMessage(
      reiniciar
        ? 'Recriando índice leve dos diários em lotes...'
        : 'Atualizando índice leve dos diários em lotes...'
    );
    setErrorMessage('');
    let continuarLoop = true;
    let primeiraRodada = reiniciar;

    try {
      while (continuarLoop) {
        const opId = `IND_${Date.now()}`;
        const res = primeiraRodada
          ? await gasApi.recriarIndiceDiarios(anoReferencia, opId, pastaDiariosInput)
          : await gasApi.atualizarIndiceDiarios(anoReferencia, opId, pastaDiariosInput);

        primeiraRodada = false;
        setProgressoIndice(res);

        const pendentesReais =
          typeof res.arquivosPendentesRestantesEstimados !== 'undefined'
            ? Number(res.arquivosPendentesRestantesEstimados || 0)
            : Number(res.arquivosRestantesEstimados || 0);

        if (!res.concluido && (res.arquivosRestantesEstimados || 0) > 0 && (pendentesReais > 0 || res.interrompido)) {
          setBusyMessage(`Indexando diários... Restantes estimados: ${pendentesReais}`);
          await new Promise((r) => setTimeout(r, 1200));
        } else {
          continuarLoop = false;
        }
      }
      setSuccessBanner('Índice de diários atualizado!');
      const painel = await gasApi.obterPainelOperacional(anoReferencia, periodoId, pastaDiariosInput);
      setPainelOp(painel);
      await recarregarDadosCiclo();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro durante atualização do índice.');
    } finally {
      setBusyMessage('');
    }
  }

  // ============================================================================
  // Acao: Upload de PDF e Pre-visualizacao Instantanea no Navegador
  // ============================================================================
  async function handleSelecionarPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setBusyMessage('Lendo PDF instantaneamente no navegador...');
    setErrorMessage('');
    try {
      const resultado = await extrairAlunosDeArquivoPdfNoCliente(file);
      setPdfBase64(resultado.base64);
      setAlunosPreview(resultado.alunos);
      if (resultado.alunos.length > 0) {
        setSuccessBanner(`${resultado.alunos.length} aluno(s) extraído(s) instantaneamente do PDF! Confira a prévia abaixo antes de iniciar.`);
      } else {
        setSuccessBanner('PDF carregado. A extração será feita via conversão OCR/Docs no servidor durante o processamento.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao ler o PDF.');
    } finally {
      setBusyMessage('');
    }
  }

  function handleTextoManualChange(valor: string) {
    setTextoManual(valor);
    if (!pdfFile) {
      setAlunosPreview(extrairAlunosDeTextoBolsa(valor));
    }
  }

  // ============================================================================
  // Acao: Iniciar e Continuar Processamento em Lotes
  // ============================================================================
  async function handleIniciarConferencia() {
    if (!pdfBase64 && !textoManual.trim() && alunosPreview.length === 0) {
      setErrorMessage('Selecione um arquivo PDF do Bolsa Família ou cole os nomes manualmente.');
      return;
    }

    setBusyMessage('Verificando ciclo no banco de dados...');
    setErrorMessage('');
    setSuccessBanner('');

    try {
      const check = await gasApi.verificarCicloBolsa(periodoId, anoReferencia);
      let substituirCicloExistente = false;

      if (check?.existe) {
        const confirma = window.confirm(
          `Já existe a aba oficial "${check.nomeAba}" com ${check.totalRegistros || 0} registro(s).\n\nDeseja substituir os dados deste ciclo pelo novo processamento?`
        );
        if (!confirma) {
          setBusyMessage('');
          return;
        }
        substituirCicloExistente = true;
      }

      const operacaoId = `PROC_${Date.now()}`;
      setBusyMessage('Etapa 1/6 — Iniciando leitura da lista e preparando varredura...');

      const entradaPayload: Record<string, any> = {
        operacaoId,
        periodoId,
        anoReferencia,
        pastaDiariosId: pastaDiariosInput.trim(),
        substituirCicloExistente,
        textoManual: textoManual.trim()
      };

      if (alunosPreview.length > 0) {
        entradaPayload.alunos = alunosPreview;
        entradaPayload.fonteEntrada = pdfFile ? `PDF (${pdfFile.name})` : 'Texto manual';
      }
      if (pdfFile && pdfBase64) {
        entradaPayload.pdf = {
          nome: pdfFile.name,
          mimeType: pdfFile.type || 'application/pdf',
          conteudoBase64: pdfBase64
        };
      }

      let estado = await gasApi.iniciarProcessamento(entradaPayload);
      setEtapaProcessamento(estado);

      while (estado && estado.parcial && estado.continuar) {
        const pendentes = estado?.estatisticasEtapas?.frequenciasPendentes ?? '?';
        const calculadas = estado?.estatisticasEtapas?.frequenciasCache ?? 0;
        setBusyMessage(
          `Varrendo diários da escola em lotes... (${calculadas} candidato(s) calculado(s) | ${pendentes} diário(s) restante(s))`
        );
        await new Promise((r) => setTimeout(r, 700));
        estado = await gasApi.continuarProcessamento(estado.processamentoId, operacaoId);
        setEtapaProcessamento(estado);
      }

      setSuccessBanner(
        `Conferência concluída com sucesso! Aba oficial gerada: ${estado?.abaCiclo || ''}`
      );
      await recarregarDadosCiclo(estado?.abaCiclo || '');
      setActiveScreen('conferencia');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha durante o processamento da lista.');
    } finally {
      setBusyMessage('');
    }
  }

  // ============================================================================
  // Dados derivados para as telas
  // ============================================================================
  const diariosRows: any[] = useMemo(() => {
    return dadosCiclo?.visoes?.diarios?.rows || [];
  }, [dadosCiclo]);

  const turmasConhecidas: string[] = useMemo(() => {
    const setTurmas = new Set<string>();
    diariosRows.forEach((d) => {
      const nome = String(d.Nome || '')
        .replace(/\.xlsx?$/i, '')
        .replace(/^DIARIO\s+(DE\s+CLASSE\s*)?[-–]?\s*/i, '')
        .trim();
      if (nome) setTurmas.add(nome);
    });
    return Array.from(setTurmas).sort();
  }, [diariosRows]);

  const linhasPendencias: any[] = useMemo(() => {
    const naoEnc = (dadosCiclo?.visoes?.naoEncontrados?.rows || []).map((r: any) => ({
      ...r,
      _tipoPendencia: 'Não encontrado'
    }));
    const rev = (dadosCiclo?.visoes?.revisar?.rows || []).map((r: any) => ({
      ...r,
      _tipoPendencia: r['Situacao do processamento'] || 'Para revisar'
    }));
    return [...naoEnc, ...rev];
  }, [dadosCiclo]);

  const linhasPendenciasFiltradas: any[] = useMemo(() => {
    if (!filtroBuscaTabela.trim()) return linhasPendencias;
    const termo = filtroBuscaTabela.toLowerCase();
    return linhasPendencias.filter((r) =>
      `${r['Nome no Bolsa Familia']} ${r['NIS Bolsa Familia']}`.toLowerCase().includes(termo)
    );
  }, [linhasPendencias, filtroBuscaTabela]);

  // Seleciona automaticamente o primeiro aluno pendente no Split-View
  useEffect(() => {
    if (
      (activeTabCiclo === 'pendencias' ||
        activeTabCiclo === 'naoEncontrados' ||
        activeTabCiclo === 'revisar') &&
      linhasPendenciasFiltradas.length > 0 &&
      !alunoRevisaoSel
    ) {
      selecionarAlunoParaRevisao(linhasPendenciasFiltradas[0]);
    }
  }, [activeTabCiclo, linhasPendenciasFiltradas, alunoRevisaoSel]);

  // Atalho de teclado ↑ / ↓ para navegar na Fila de Pendencias sem cliques repetitivos
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (activeScreen !== 'conferencia') return;
      if (
        activeTabCiclo !== 'pendencias' &&
        activeTabCiclo !== 'naoEncontrados' &&
        activeTabCiclo !== 'revisar'
      ) {
        return;
      }
      if (modalMovAluno) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (linhasPendenciasFiltradas.length === 0) return;

      const idxAtual = linhasPendenciasFiltradas.findIndex(
        (item) =>
          alunoRevisaoSel &&
          item['Nome no Bolsa Familia'] === alunoRevisaoSel['Nome no Bolsa Familia']
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const prox = Math.min(linhasPendenciasFiltradas.length - 1, Math.max(0, idxAtual + 1));
        selecionarAlunoParaRevisao(linhasPendenciasFiltradas[prox]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const ant = Math.max(0, (idxAtual >= 0 ? idxAtual : 0) - 1);
        selecionarAlunoParaRevisao(linhasPendenciasFiltradas[ant]);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScreen, activeTabCiclo, linhasPendenciasFiltradas, alunoRevisaoSel, modalMovAluno]);

  function obterProximoAlunoDaFila(alunoAtual: any) {
    if (!alunoAtual || linhasPendenciasFiltradas.length <= 1) return null;
    const idx = linhasPendenciasFiltradas.findIndex(
      (item) => item['Nome no Bolsa Familia'] === alunoAtual['Nome no Bolsa Familia']
    );
    if (idx >= 0 && idx + 1 < linhasPendenciasFiltradas.length) {
      return linhasPendenciasFiltradas[idx + 1];
    }
    return linhasPendenciasFiltradas[0]?.['Nome no Bolsa Familia'] !==
      alunoAtual['Nome no Bolsa Familia']
      ? linhasPendenciasFiltradas[0]
      : null;
  }

  function selecionarAlunoParaRevisao(aluno: any) {
    setAlunoRevisaoSel(aluno);
    setBuscaRevNome(aluno['Nome no Bolsa Familia'] || '');
    setBuscaRevSerie('');
    setBuscaRevTurma('');
    setBuscaRevChamada('');
    setBuscaRevObs(aluno['Observacoes'] || '');
    setCandidatosRevisao([]);
    setCandidatoSelIndex(0);
  }

  async function handleBuscarCandidatosRevisao() {
    if (!alunoRevisaoSel) return;
    setBuscandoRevisao(true);
    setErrorMessage('');
    try {
      const res = await gasApi.buscarRevisaoAssistida({
        abaCiclo: abaCicloSelecionada,
        nomeBolsa: alunoRevisaoSel['Nome no Bolsa Familia'] || '',
        nomeBusca: buscaRevNome.trim() || alunoRevisaoSel['Nome no Bolsa Familia'] || '',
        serie: buscaRevSerie.trim(),
        turma: buscaRevTurma.trim(),
        numeroChamada: buscaRevChamada.trim()
      });
      setCandidatosRevisao(res?.candidatos || []);
      setCandidatoSelIndex(0);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro na busca assistida.');
    } finally {
      setBuscandoRevisao(false);
    }
  }

  async function handleConfirmarRevisao() {
    const cand = candidatosRevisao[candidatoSelIndex];
    if (!alunoRevisaoSel || !cand) return;
    setBusyMessage('Confirmando revisão e salvando vínculo permanente por NIS...');
    setErrorMessage('');
    try {
      await gasApi.confirmarCorrecao({
        abaCiclo: abaCicloSelecionada,
        aluno: alunoRevisaoSel,
        candidato: cand,
        nomeBolsa: alunoRevisaoSel['Nome no Bolsa Familia'],
        nisBolsa: alunoRevisaoSel['NIS Bolsa Familia'],
        serie: buscaRevSerie,
        turma: buscaRevTurma || cand.turma,
        numeroChamada: buscaRevChamada || cand.numeroChamada,
        observacao: buscaRevObs
      });
      const proximo = obterProximoAlunoDaFila(alunoRevisaoSel);
      setSuccessBanner(
        `Aluno "${alunoRevisaoSel['Nome no Bolsa Familia']}" confirmado na turma ${cand.turma} e vínculo memorizado!`
      );
      setCandidatosRevisao([]);
      await recarregarDadosCiclo();
      if (proximo) {
        selecionarAlunoParaRevisao(proximo);
      } else {
        setAlunoRevisaoSel(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao confirmar revisão.');
    } finally {
      setBusyMessage('');
    }
  }

  function iniciarEdicaoAbaixoLimite(row: any, idx: number) {
    const key = `${row['NIS Bolsa Familia'] || row['Nome no Bolsa Familia']}_${idx}`;
    setEditandoLinhaKey(key);
    setFormAjuste({
      presencasMes1: Number(row['Presencas Mes 1'] || 0),
      faltasMes1: Number(row['Faltas Mes 1'] || 0),
      presencasMes2: Number(row['Presencas Mes 2'] || 0),
      faltasMes2: Number(row['Faltas Mes 2'] || 0),
      observacao: String(row['Observacao'] || row['Observacoes'] || '')
    });
  }

  async function salvarEdicaoAbaixoLimite(row: any) {
    setBusyMessage('Salvando ajuste de frequência na aba oficial do ciclo...');
    setErrorMessage('');
    try {
      await gasApi.salvarAjusteFrequencia({
        abaCiclo: abaCicloSelecionada,
        nomeBolsa: row['Nome no Bolsa Familia'],
        nisBolsa: row['NIS Bolsa Familia'] || '',
        ordemOriginal: row['Ordem original'] || '',
        turma: row['Turma'] || '',
        presencasMes1: formAjuste.presencasMes1,
        faltasMes1: formAjuste.faltasMes1,
        presencasMes2: formAjuste.presencasMes2,
        faltasMes2: formAjuste.faltasMes2,
        observacao: formAjuste.observacao
      });
      setEditandoLinhaKey('');
      setSuccessBanner(`Frequência atualizada para ${row['Nome no Bolsa Familia']}.`);
      await recarregarDadosCiclo();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao salvar ajuste de frequência.');
    } finally {
      setBusyMessage('');
    }
  }

  function abrirModalMovimentacao(aluno: any) {
    if (!aluno) return;
    setModalMovAluno(aluno);
    setFormMov({
      tipoMovimentacao: 'TRANSFERIDO_ESCOLA',
      dataMovimentacao: '',
      escolaDestino: '',
      turma: String(aluno['Turma'] || ''),
      presencasMes1: Number(aluno['Presencas Mes 1'] || 0),
      faltasMes1: Number(aluno['Faltas Mes 1'] || 0),
      presencasMes2: Number(aluno['Presencas Mes 2'] || 0),
      faltasMes2: Number(aluno['Faltas Mes 2'] || 0),
      observacao: String(aluno['Observacao'] || aluno['Observacoes'] || ''),
      memorizarVinculoNis: Boolean(aluno['NIS Bolsa Familia'])
    });
  }

  async function handleSalvarMovimentacao() {
    if (!modalMovAluno) return;
    setBusyMessage('Registrando movimentação / exceção escolar na aba oficial do ciclo...');
    setErrorMessage('');
    try {
      const res = await gasApi.registrarMovimentacaoAluno({
        abaCiclo: abaCicloSelecionada,
        nomeBolsa: modalMovAluno['Nome no Bolsa Familia'],
        nisBolsa: modalMovAluno['NIS Bolsa Familia'] || '',
        ordemOriginal: modalMovAluno['Ordem original'] || '',
        tipoMovimentacao: formMov.tipoMovimentacao,
        dataMovimentacao: formMov.dataMovimentacao,
        escolaDestino: formMov.escolaDestino,
        turma: formMov.turma,
        presencasMes1: formMov.presencasMes1,
        faltasMes1: formMov.faltasMes1,
        presencasMes2: formMov.presencasMes2,
        faltasMes2: formMov.faltasMes2,
        observacao: formMov.observacao,
        memorizarVinculoNis: formMov.memorizarVinculoNis
      });
      const proximo = obterProximoAlunoDaFila(modalMovAluno);
      setModalMovAluno(null);
      setSuccessBanner(
        `Exceção "${res?.rotuloMovimentacao || formMov.tipoMovimentacao}" registrada para ${modalMovAluno['Nome no Bolsa Familia']}!`
      );
      await recarregarDadosCiclo();
      if (proximo) {
        selecionarAlunoParaRevisao(proximo);
      } else {
        setAlunoRevisaoSel(null);
      }
      if (formMov.memorizarVinculoNis) {
        await carregarVinculos();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao registrar movimentação escolar.');
    } finally {
      setBusyMessage('');
    }
  }

  async function handleAprovarLista() {
    const obs = window.prompt(
      'Observação opcional para registrar na planilha de Lista Aprovada:',
      `Conferência concluída — ${abaCicloSelecionada}`
    );
    if (obs === null) return;

    setBusyMessage('Gerando planilha de Lista Aprovada na pasta única de saída...');
    setErrorMessage('');
    try {
      const res = await gasApi.aprovarLista({
        abaCiclo: abaCicloSelecionada,
        observacao: obs
      });
      setSuccessBanner(
        `Lista Aprovada criada na pasta de saída: ${res?.nomeArquivo || 'Planilha gerada'}`
      );
      if (res?.url) {
        window.open(res.url, '_blank');
      }
      await recarregarDadosCiclo();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao aprovar lista.');
    } finally {
      setBusyMessage('');
    }
  }

  function toggleLancado(chave: string) {
    const novo = { ...lancadosMap, [chave]: !lancadosMap[chave] };
    setLancadosMap(novo);
    localStorage.setItem('SBF_LANCADOS_MAP', JSON.stringify(novo));
  }

  function copiarTexto(texto: string, id: string) {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    setCopiedNis(id);
    setTimeout(() => setCopiedNis(''), 1800);
  }

  const resumo = dadosCiclo?.resumo || {};
  const mesesCiclo = dadosCiclo?.mesesCicloAtual || { mes1: 'Mês 1', mes2: 'Mês 2' };
  const ciclosRegistrados = dadosCiclo?.ciclosRegistrados || [];
  const listasAprovadas = dadosCiclo?.listasAprovadas || [];

  const escolaAtiva = dadosCiclo?.escolaAtiva || config?.escolaAtiva || {
    id: 'ESCOLA_PADRAO',
    nome: 'Escola Ativa',
    pastaDiariosId: pastaDiariosInput,
    anosDisponiveis: [anoReferencia]
  };
  const escolasRegistradas: any[] =
    dadosCiclo?.escolasRegistradas || config?.escolasRegistradas || [escolaAtiva];
  const anosDisponiveis: number[] =
    dadosCiclo?.anosDisponiveis || config?.anosDisponiveis || [anoReferencia];
  const infoAnoAtivo = dadosCiclo?.infoAnoAtivo || config?.infoAnoAtivo || null;

  async function handleCriarNovaEscola() {
    if (!novaEscolaNome.trim()) {
      setErrorMessage('Informe o nome da nova escola para criar a pasta e o banco de dados.');
      return;
    }
    await handleAlternarEscola('', novaEscolaNome.trim(), novaEscolaPastaDiarios.trim(), false);
  }

  async function handleRenomearEscolaAtiva() {
    if (!renomearEscolaInput.trim()) return;
    await handleAlternarEscola(
      escolaAtiva.id,
      renomearEscolaInput.trim(),
      pastaDiariosInput.trim(),
      true
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 no-print">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950">
              BF
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">SBF Panorama</h1>
              <p className="text-xs text-slate-400">Conferência Bolsa Família</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          <button
            onClick={() => setActiveScreen('painel')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
              activeScreen === 'painel'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Painel Geral
          </button>

          <button
            onClick={() => setActiveScreen('diarios')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
              activeScreen === 'diarios'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FolderSearch className="w-4 h-4" />
            Diários da Escola
          </button>

          <button
            onClick={() => setActiveScreen('processamento')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
              activeScreen === 'processamento'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileUp className="w-4 h-4" />
            Nova Conferência (PDF)
          </button>

          <button
            onClick={() => {
              setActiveScreen('conferencia');
              carregarVinculos();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
              activeScreen === 'conferencia'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-3">
              <ClipboardCheck className="w-4 h-4" />
              Mesa de Conferência
            </span>
            {(resumo.pendencias || 0) > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500 text-slate-950 font-bold">
                {resumo.pendencias}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveScreen('configuracoes');
              carregarVinculos();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
              activeScreen === 'configuracoes'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configurações
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2 text-xs">
          <a
            href={config?.pastaSaidaDadosUrl || PASTA_SAIDA_UNICA_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium"
          >
            <span className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 shrink-0" />
              Pasta de Dados Gerados
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {dadosCiclo?.bancoDadosUrl && (
            <a
              href={dadosCiclo.bancoDadosUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                Planilha Banco Oficial
              </span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER FIXO */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 no-print">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Seletor de Escola Ativa (Multi-Escola) */}
            <div className="relative">
              <button
                onClick={() => {
                  setMenuEscolasOpen(!menuEscolasOpen);
                  setMenuAnosOpen(false);
                  setMenuCiclosOpen(false);
                  setMenuAprovadasOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-900"
                title="Alterar Escola Ativa ou Cadastrar Nova Escola"
              >
                <School className="w-3.5 h-3.5 text-emerald-700" />
                <span className="max-w-[190px] truncate">
                  {escolaAtiva?.nome || 'Escola Ativa'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
              </button>

              {menuEscolasOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-30">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase flex items-center justify-between">
                    <span>Escolas Registradas</span>
                    <span className="text-emerald-600">{escolasRegistradas.length} escola(s)</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {escolasRegistradas.map((esc) => (
                      <button
                        key={esc.id}
                        onClick={() => handleAlternarEscola(esc.id)}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between ${
                          esc.id === escolaAtiva?.id ? 'bg-emerald-50/80 font-bold text-emerald-900' : ''
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate">{esc.nome}</div>
                          <div className="text-[11px] text-slate-500">
                            Anos: {(esc.anosDisponiveis || [anoReferencia]).join(', ')}
                          </div>
                        </div>
                        {esc.id === escolaAtiva?.id && (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 mt-1 pt-1.5 px-2">
                    <button
                      onClick={() => {
                        setMenuEscolasOpen(false);
                        setActiveScreen('configuracoes');
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Cadastrar ou Gerenciar Escolas
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Seletor de Ano Letivo (Multi-Ano) */}
            <div className="relative">
              <button
                onClick={() => {
                  setMenuAnosOpen(!menuAnosOpen);
                  setMenuEscolasOpen(false);
                  setMenuCiclosOpen(false);
                  setMenuAprovadasOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold text-indigo-900"
                title="Alternar Ano Letivo (Banco separado por ano)"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-700" />
                <span>Ano {anoReferencia}</span>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-700" />
              </button>

              {menuAnosOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-30">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase">
                    Banco Separado por Ano
                  </div>
                  {anosDisponiveis.map((ano) => (
                    <button
                      key={ano}
                      onClick={() => handleAlternarAnoLetivo(ano)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between ${
                        Number(ano) === Number(anoReferencia)
                          ? 'bg-indigo-50 font-bold text-indigo-900'
                          : ''
                      }`}
                    >
                      <span>Ano Letivo {ano}</span>
                      {Number(ano) === Number(anoReferencia) && (
                        <Check className="w-4 h-4 text-indigo-600" />
                      )}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1.5 px-2 space-y-1">
                    <button
                      onClick={() => handleAlternarAnoLetivo(anoReferencia + 1)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Abrir Ano {anoReferencia + 1}
                    </button>
                    <button
                      onClick={() => {
                        setMenuAnosOpen(false);
                        setActiveScreen('configuracoes');
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Zerar Ciclos / Virada de Ano
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">
              Ciclo:
            </span>

            {/* Seletor Rapido de Ciclo Salvo */}
            <div className="relative">
              <button
                onClick={() => {
                  setMenuCiclosOpen(!menuCiclosOpen);
                  setMenuEscolasOpen(false);
                  setMenuAnosOpen(false);
                  setMenuAprovadasOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-800"
              >
                <span>{abaCicloSelecionada || 'Selecionar Ciclo'}</span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {menuCiclosOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-30">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase">
                    Ciclos Salvos em {anoReferencia}
                  </div>
                  {ciclosRegistrados.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500">
                      Nenhum ciclo processado neste ano ainda.
                    </div>
                  ) : (
                    ciclosRegistrados.map((c: any) => (
                      <button
                        key={c.nomeAba}
                        onClick={() => {
                          setAbaCicloSelecionada(c.nomeAba);
                          setMenuCiclosOpen(false);
                          recarregarDadosCiclo(c.nomeAba, true);
                          setActiveScreen('conferencia');
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between ${
                          c.nomeAba === abaCicloSelecionada ? 'bg-emerald-50 font-semibold text-emerald-800' : ''
                        }`}
                      >
                        <div>
                          <div>{c.nomeAba}</div>
                          <div className="text-xs text-slate-500">
                            {c.cicloBolsa?.rotulo || ''} • {c.totalRegistros || 0} alunos
                          </div>
                        </div>
                        {c.nomeAba === abaCicloSelecionada && (
                          <Check className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {infoAnoAtivo?.pastaAnoUrl && (
              <a
                href={infoAnoAtivo.pastaAnoUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-xs font-semibold text-emerald-800"
                title="Abrir pasta exclusiva desta Escola e Ano no Google Drive"
              >
                <FolderOpen className="w-3.5 h-3.5 text-emerald-700" />
                <span>Pasta {anoReferencia}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Menu Listas Aprovadas */}
            <div className="relative">
              <button
                onClick={() => {
                  setMenuAprovadasOpen(!menuAprovadasOpen);
                  setMenuCiclosOpen(false);
                  setMenuEscolasOpen(false);
                  setMenuAnosOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Listas Aprovadas ({listasAprovadas.length})
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {menuAprovadasOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-30 max-h-80 overflow-y-auto">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase">
                    Planilhas Aprovadas na Pasta de {anoReferencia}
                  </div>
                  {listasAprovadas.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500">
                      Nenhuma lista aprovada registrada.
                    </div>
                  ) : (
                    listasAprovadas.map((item: any, i: number) => (
                      <a
                        key={i}
                        href={item.URL || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="block px-3 py-2 hover:bg-slate-50 text-xs border-b border-slate-100 last:border-0"
                      >
                        <div className="font-semibold text-slate-800 flex items-center justify-between">
                          <span>{item['Ciclo Bolsa'] || item['Nome arquivo']}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {item['Data aprovacao']} • {item['Total registros']} alunos
                        </div>
                      </a>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => recarregarDadosCiclo(undefined, false)}
              disabled={!!busyMessage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busyMessage ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </header>

        {/* BARRAS DE FEEDBACK */}
        <div className="px-6 pt-4 space-y-3 no-print">
          {busyMessage && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
              <span className="font-medium">{busyMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="whitespace-pre-line">{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage('')}
                className="text-xs font-semibold text-red-700 hover:underline"
              >
                Fechar
              </button>
            </div>
          )}

          {successBanner && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successBanner}</span>
              </div>
              <button
                onClick={() => setSuccessBanner('')}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                OK
              </button>
            </div>
          )}
        </div>

        {/* CONTEUDO DAS PAGINAS */}
        <main className="p-6 flex-1">
          {/* ================================================================
              TELA 1: PAINEL GERAL
          ================================================================ */}
          {activeScreen === 'painel' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <Sparkles className="w-3.5 h-3.5" />
                    Arquitetura Desacoplada React + Apps Script API
                  </span>
                  <h2 className="text-xl font-bold mt-2">
                    Painel Operacional de Conferência do Bolsa Família
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Cole o link da pasta dos diários, escaneie as turmas e processe a lista PDF do
                    Bolsa Família. Todos os arquivos gerados são salvos exclusivamente na pasta de saída.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5 shrink-0">
                  <button
                    onClick={() => setActiveScreen('diarios')}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-semibold"
                  >
                    1. Conectar Pasta de Diários
                  </button>
                  <button
                    onClick={() => setActiveScreen('processamento')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                  >
                    2. Nova Conferência (PDF)
                  </button>
                </div>
              </div>

              {/* Cards de Metricas */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <span className="text-xs font-medium text-slate-500">Ciclo Ativo</span>
                  <div className="text-2xl font-bold mt-1">
                    {abaCicloSelecionada || 'Nenhum'}
                  </div>
                  <span className="text-xs text-slate-400">
                    {dadosCiclo?.cicloBolsaAtual?.rotulo || 'Selecione ou processe um ciclo'}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <span className="text-xs font-medium text-slate-500">Total de Alunos no Ciclo</span>
                  <div className="text-2xl font-bold mt-1">{resumo.total || 0}</div>
                  <span className="text-xs text-emerald-600 font-medium">
                    {resumo.encontrados || 0} conferidos OK
                  </span>
                </div>

                <div
                  onClick={() => {
                    setActiveTabCiclo('abaixoLimite');
                    setActiveScreen('conferencia');
                  }}
                  className="bg-white p-5 rounded-2xl border border-rose-200 cursor-pointer hover:bg-rose-50/40 transition"
                >
                  <span className="text-xs font-semibold text-rose-600">
                    Abaixo do Limite (Lançar Motivo)
                  </span>
                  <div className="text-2xl font-bold text-rose-700 mt-1">
                    {resumo.abaixoLimite || 0}
                  </div>
                  <span className="text-xs text-rose-500">Clique para abrir fila de lançamento</span>
                </div>

                <div
                  onClick={() => {
                    setActiveTabCiclo('pendencias');
                    setActiveScreen('conferencia');
                  }}
                  className="bg-white p-5 rounded-2xl border border-amber-200 cursor-pointer hover:bg-amber-50/40 transition"
                >
                  <span className="text-xs font-semibold text-amber-700">
                    Pendências para Revisar
                  </span>
                  <div className="text-2xl font-bold text-amber-700 mt-1">
                    {resumo.pendencias || 0}
                  </div>
                  <span className="text-xs text-amber-600">
                    {resumo.naoEncontrados || 0} não encontrados • {resumo.revisar || 0} revisar
                  </span>
                </div>

                <div
                  onClick={() => {
                    setActiveTabCiclo('movimentacoes');
                    setActiveScreen('conferencia');
                  }}
                  className="bg-white p-5 rounded-2xl border border-indigo-200 cursor-pointer hover:bg-indigo-50/40 transition"
                >
                  <span className="text-xs font-semibold text-indigo-700">
                    Movimentação / Transferidos
                  </span>
                  <div className="text-2xl font-bold text-indigo-700 mt-1">
                    {resumo.movimentacoes ||
                      dadosCiclo?.visoes?.movimentacoes?.rows?.length ||
                      0}
                  </div>
                  <span className="text-xs text-indigo-600">
                    Com ou sem diário • Clique para ver
                  </span>
                </div>
              </div>

              {/* Ciclos Salvos + Estado da Pasta de Diarios */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base">
                      Ciclos Registrados em {anoReferencia} ({escolaAtiva?.nome || 'Escola Ativa'})
                    </h3>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800">
                      Banco Separado por Ano
                    </span>
                  </div>
                  {ciclosRegistrados.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nenhum ciclo registrado no banco de {anoReferencia} ainda.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {ciclosRegistrados.map((c: any) => (
                        <div
                          key={c.nomeAba}
                          onClick={() => {
                            setAbaCicloSelecionada(c.nomeAba);
                            recarregarDadosCiclo(c.nomeAba, true);
                            setActiveScreen('conferencia');
                          }}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 cursor-pointer flex items-center justify-between transition"
                        >
                          <div>
                            <div className="font-bold text-sm text-slate-900">{c.nomeAba}</div>
                            <div className="text-xs text-slate-500">
                              {c.cicloBolsa?.rotulo || ''} • Atualizado em {c.atualizadoEm || '-'}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold">
                            {c.totalRegistros || 0} alunos
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base">Estado do Banco, Índice e Pastas</h3>
                    <button
                      onClick={() => handleAtualizarIndiceLotes(false)}
                      disabled={!!busyMessage}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                      title="Pré-aquecer o Índice Alunos Diários antes do bimestre para deixar a conferência mais rápida"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Pré-aquecer Índice de Diários
                    </button>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Escola / Ano Ativo:</span>
                      <span className="font-bold text-xs text-slate-900">
                        {escolaAtiva?.nome || 'Escola Ativa'} • {anoReferencia}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ID da Pasta de Diários Ativa:</span>
                      <span className="font-mono text-xs font-semibold">
                        {painelOp?.pastaDiariosId || pastaDiariosInput || 'Não definida'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Diários Conhecidos no Banco:</span>
                      <span className="font-semibold">
                        {diariosRows.length} arquivo(s) (
                        {
                          diariosRows.filter((r) => classificarEtapaDiarioCliente(r) === 'INFANTIL')
                            .length
                        }{' '}
                        Infantil •{' '}
                        {
                          diariosRows.filter(
                            (r) => classificarEtapaDiarioCliente(r) === 'FUNDAMENTAL'
                          ).length
                        }{' '}
                        Fundamental)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Índice de Alunos Pré-aquecido:</span>
                      <span className="font-semibold text-emerald-700">
                        {painelOp?.totalRegistrosIndiceAlunosDiarios ??
                          painelOp?.totalLinhasIndice ??
                          0}{' '}
                        registro(s) indexado(s)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pasta Exclusiva ({anoReferencia}):</span>
                      <a
                        href={infoAnoAtivo?.pastaAnoUrl || PASTA_SAIDA_UNICA_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        Abrir Pasta no Drive <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TELA 2: DIARIOS DA ESCOLA (Prompt 3)
          ================================================================ */}
          {activeScreen === 'diarios' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Pasta de Diários de Classe (Google Drive)</h2>
                  <p className="text-sm text-slate-600">
                    Cole abaixo o link completo da pasta do Google Drive onde estão os diários da
                    escola (ou o ID da pasta) e clique em <strong>Salvar Link e Escanear Diários</strong>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={pastaDiariosInput}
                    onChange={(e) => setPastaDiariosInput(e.target.value)}
                    placeholder="Ex.: https://drive.google.com/drive/folders/ID_DA_PASTA_DOS_DIARIOS"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleEscanearPastaDiarios}
                    disabled={!!busyMessage}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    <FolderSearch className="w-4 h-4" />
                    Salvar Link e Escanear Diários
                  </button>
                </div>

                {pastaDiariosInput && (
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>ID extraído automaticamente:</span>
                    <code className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-800">
                      {extrairIdPastaDrive(pastaDiariosInput)}
                    </code>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleAtualizarIndiceLotes(false)}
                      disabled={!!busyMessage}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Pré-aquecer / Atualizar Índice em Lotes
                    </button>
                    <button
                      onClick={() => handleAtualizarIndiceLotes(true)}
                      disabled={!!busyMessage}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-amber-700"
                    >
                      Recriar Índice do Zero
                    </button>
                  </div>

                  <a
                    href={infoAnoAtivo?.pastaAnoUrl || PASTA_SAIDA_UNICA_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Pasta de saída: {escolaAtiva?.nome || 'Escola Ativa'} / {anoReferencia}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Agrupamento por Etapa (Educacao Infantil 60% vs Ensino Fundamental 75%) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-purple-900">
                      Educação Infantil / Jardim (Limite Mínimo: 60%)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                      {
                        diariosRows.filter((r) => classificarEtapaDiarioCliente(r) === 'INFANTIL')
                          .length
                      }{' '}
                      diário(s)
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {diariosRows
                      .filter((r) => classificarEtapaDiarioCliente(r) === 'INFANTIL')
                      .map((r, i) => (
                        <div key={i} className="py-2 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-slate-800">{r.Nome}</div>
                            <div className="text-slate-400">{r.Caminho}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded font-semibold ${
                              r.Status === 'PROCESSADO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.Status === 'ERRO'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {r.Status}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-blue-900">
                      Ensino Fundamental 1º ao 5º Ano (Limite Mínimo: 75%)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      {
                        diariosRows.filter(
                          (r) => classificarEtapaDiarioCliente(r) === 'FUNDAMENTAL'
                        ).length
                      }{' '}
                      diário(s)
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {diariosRows
                      .filter((r) => classificarEtapaDiarioCliente(r) === 'FUNDAMENTAL')
                      .map((r, i) => (
                        <div key={i} className="py-2 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-slate-800">{r.Nome}</div>
                            <div className="text-slate-400">{r.Caminho}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded font-semibold ${
                              r.Status === 'PROCESSADO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.Status === 'ERRO'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {r.Status}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TELA 3: NOVA CONFERENCIA PDF (Prompt 4)
          ================================================================ */}
          {activeScreen === 'processamento' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Nova Conferência de Frequência do Bolsa Família</h2>
                    <p className="text-sm text-slate-600">
                      Escolha o ciclo bimestral, confirme a pasta dos diários e selecione o PDF do
                      formulário do Bolsa Família.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAtualizarIndiceLotes(false)}
                    disabled={!!busyMessage}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Pré-aquecer Índice de Diários (
                    {painelOp?.totalRegistrosIndiceAlunosDiarios ??
                      painelOp?.totalLinhasIndice ??
                      0}{' '}
                    reg.)
                  </button>
                </div>

                {/* Passo 1: Ciclo e Pasta */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Período / Ciclo do Bolsa Família
                    </label>
                    <select
                      value={periodoId}
                      onChange={(e) => setPeriodoId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                    >
                      {(
                        config?.periodosBolsaFamilia || [
                          { id: 'FEV_MAR', nome: 'Fevereiro a março' },
                          { id: 'ABR_MAI', nome: 'Abril a maio' },
                          { id: 'JUN_JUL', nome: 'Junho a julho' },
                          { id: 'AGO_SET', nome: 'Agosto a setembro' },
                          { id: 'OUT_NOV', nome: 'Outubro a novembro' }
                        ]
                      ).map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ano de Referência
                    </label>
                    <input
                      type="number"
                      value={anoReferencia}
                      onChange={(e) => setAnoReferencia(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Link ou ID da Pasta dos Diários
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pastaDiariosInput}
                        onChange={(e) => setPastaDiariosInput(e.target.value)}
                        placeholder="Cole o link da pasta do Google Drive"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleEscanearPastaDiarios}
                        className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold shrink-0"
                      >
                        Escanear
                      </button>
                    </div>
                  </div>
                </div>

                {/* Passo 2: Upload do PDF + Fallback Manual */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 flex flex-col justify-center items-center text-center bg-slate-50/60">
                    <FileUp className="w-8 h-8 text-emerald-600 mb-2" />
                    <label className="text-sm font-bold text-slate-800 cursor-pointer hover:text-emerald-700">
                      Selecionar arquivo PDF do Bolsa Família
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleSelecionarPdf}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      {pdfFile
                        ? `Arquivo selecionado: ${pdfFile.name}`
                        : 'O PDF é pré-analisado instantaneamente no navegador'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fallback: Colar nomes ou texto manualmente (opcional)
                    </label>
                    <textarea
                      rows={4}
                      value={textoManual}
                      onChange={(e) => handleTextoManualChange(e.target.value)}
                      placeholder="Cole aqui o texto do formulário ou uma lista de nomes caso não tenha o PDF..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                {/* Pre-visualizacao Instantanea dos Alunos Extraidos */}
                {alunosPreview.length > 0 && (
                  <div className="border border-emerald-200 rounded-2xl overflow-hidden">
                    <div className="bg-emerald-50 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">
                        Pré-visualização Instantânea: {alunosPreview.length} aluno(s) identificado(s)
                      </span>
                      <button
                        type="button"
                        onClick={() => setAlunosPreview([])}
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        Limpar prévia
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2">#</th>
                            <th className="text-left px-3 py-2">Nome no Bolsa Família</th>
                            <th className="text-left px-3 py-2">NIS</th>
                            <th className="text-left px-3 py-2">Dt. Nasc.</th>
                            <th className="text-left px-3 py-2">Responsável Familiar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {alunosPreview.map((a, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                              <td className="px-3 py-1.5 font-semibold">{a.nome}</td>
                              <td className="px-3 py-1.5 font-mono">{a.nis || '-'}</td>
                              <td className="px-3 py-1.5">{a.dataNascimento || '-'}</td>
                              <td className="px-3 py-1.5 text-slate-600">
                                {a.responsavelFamiliar || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleIniciarConferencia}
                    disabled={!!busyMessage}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm disabled:opacity-50"
                  >
                    Iniciar Varredura nos Diários e Conferir Frequência
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TELA 4: MESA DE CONFERENCIA DO CICLO + SPLIT-VIEW (Prompts 5 e 6)
          ================================================================ */}
          {activeScreen === 'conferencia' && (
            <div className="space-y-4">
              {/* Barra de Subtelas do Ciclo e Acoes Globais */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'pendencias', label: 'Pendências', count: resumo.pendencias || 0 },
                      {
                        id: 'movimentacoes',
                        label: 'Movimentação / Transferidos',
                        count:
                          resumo.movimentacoes ||
                          dadosCiclo?.visoes?.movimentacoes?.rows?.length ||
                          0
                      },
                      { id: 'abaixoLimite', label: 'Abaixo do Limite', count: resumo.abaixoLimite || 0 },
                      { id: 'conferidos', label: 'Conferidos (OK)', count: resumo.encontrados || 0 },
                      { id: 'naoEncontrados', label: 'Não Encontrados', count: resumo.naoEncontrados || 0 },
                      { id: 'revisar', label: 'Para Revisar', count: resumo.revisar || 0 },
                      { id: 'vinculos', label: 'Vínculos Salvos (NIS)', count: vinculos.length },
                      { id: 'historico', label: 'Histórico', count: dadosCiclo?.visoes?.historico?.total || 0 }
                    ] as { id: TabCicloId; label: string; count: number }[]
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveTabCiclo(t.id);
                        if (t.id === 'vinculos') carregarVinculos();
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                        activeTabCiclo === t.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{t.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                          activeTabCiclo === t.id ? 'bg-slate-700 text-white' : 'bg-white text-slate-700'
                        }`}
                      >
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveTabCiclo('abaixoLimite');
                      setTimeout(() => window.print(), 150);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Abaixo Limite
                  </button>

                  <button
                    onClick={handleAprovarLista}
                    disabled={!!busyMessage}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Aprovar e Salvar Planilha
                  </button>
                </div>
              </div>

              {/* ============================================================
                  SUBTELA: PENDENCIAS / NAO ENCONTRADOS / REVISAR (SPLIT-VIEW Prompt 6)
              ============================================================ */}
              {(activeTabCiclo === 'pendencias' ||
                activeTabCiclo === 'naoEncontrados' ||
                activeTabCiclo === 'revisar') && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
                  {/* Coluna Esquerda (5 cols): Fila de Alunos Pendentes */}
                  <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 flex flex-col max-h-[72vh]">
                    <div className="p-4 border-b border-slate-100 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-sm">
                          Fila de Resolução ({linhasPendenciasFiltradas.length})
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          ↑ ↓ Teclado • Avanço Automático
                        </span>
                      </div>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={filtroBuscaTabela}
                          onChange={(e) => setFiltroBuscaTabela(e.target.value)}
                          placeholder="Filtrar aluno por nome ou NIS..."
                          className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                      {linhasPendenciasFiltradas.map((item, idx) => {
                        const selecionado =
                          alunoRevisaoSel &&
                          alunoRevisaoSel['Nome no Bolsa Familia'] ===
                            item['Nome no Bolsa Familia'];
                        return (
                          <div
                            key={idx}
                            onClick={() => selecionarAlunoParaRevisao(item)}
                            className={`p-3.5 cursor-pointer transition ${
                              selecionado
                                ? 'bg-emerald-50 border-l-4 border-emerald-600'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-bold text-xs text-slate-900">
                                {item['Nome no Bolsa Familia']}
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                                {item._tipoPendencia}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3">
                              <span>NIS: {item['NIS Bolsa Familia'] || '-'}</span>
                              <span>Nasc.: {item['Dt. Nasc. Bolsa Familia'] || '-'}</span>
                            </div>
                            {item['Observacoes'] && (
                              <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                                {item['Observacoes']}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {linhasPendenciasFiltradas.length === 0 && (
                        <div className="p-8 text-center text-sm text-emerald-700 font-semibold">
                          Nenhuma pendência de aluno neste ciclo!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coluna Direita (7 cols): Mesa de Revisao Assistida Lado a Lado */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-base">
                        Revisão Assistida Lado a Lado (Split-View)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Localize o aluno nos diários por Turma/Série/Chamada. Ao confirmar, o vínculo
                        por NIS fica salvo para os próximos ciclos.
                      </p>
                    </div>

                    {!alunoRevisaoSel ? (
                      <div className="py-12 text-center text-sm text-slate-400">
                        Selecione um aluno pendente na lista à esquerda para iniciar a busca.
                      </div>
                    ) : (
                      <>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="font-bold text-sm text-slate-900">
                              {alunoRevisaoSel['Nome no Bolsa Familia']}
                            </div>
                            <div className="text-slate-600 flex flex-wrap gap-4">
                              <span>
                                <strong>NIS:</strong> {alunoRevisaoSel['NIS Bolsa Familia'] || '-'}
                              </span>
                              <span>
                                <strong>Dt. Nasc.:</strong>{' '}
                                {alunoRevisaoSel['Dt. Nasc. Bolsa Familia'] || '-'}
                              </span>
                              <span>
                                <strong>Responsável:</strong>{' '}
                                {alunoRevisaoSel['Responsavel familiar Bolsa Familia'] || '-'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => abrirModalMovimentacao(alunoRevisaoSel)}
                            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs shrink-0"
                          >
                            Registrar Transferência / Exceção
                          </button>
                        </div>

                        {/* Chips rapidos das turmas escaneadas */}
                        {turmasConhecidas.length > 0 && (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                              Atalho Rápido — Turmas Conhecidas nos Diários Escaneados:
                            </label>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                              {turmasConhecidas.map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setBuscaRevTurma(t)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                                    buscaRevTurma === t
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Nome para busca no Diário
                            </label>
                            <input
                              type="text"
                              value={buscaRevNome}
                              onChange={(e) => setBuscaRevNome(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Ano/Série ou Turma
                            </label>
                            <input
                              type="text"
                              value={buscaRevTurma}
                              onChange={(e) => setBuscaRevTurma(e.target.value)}
                              placeholder="Ex: 5 ANO C ou JD II"
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Nº Chamada (opcional)
                            </label>
                            <input
                              type="text"
                              value={buscaRevChamada}
                              onChange={(e) => setBuscaRevChamada(e.target.value)}
                              placeholder="Ex: 14"
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <input
                            type="text"
                            value={buscaRevObs}
                            onChange={(e) => setBuscaRevObs(e.target.value)}
                            placeholder="Observação opcional da revisão..."
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs"
                          />
                          <button
                            onClick={handleBuscarCandidatosRevisao}
                            disabled={buscandoRevisao}
                            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Search className="w-3.5 h-3.5" />
                            {buscandoRevisao ? 'Buscando nos Diários...' : 'Buscar Frequência no Ciclo'}
                          </button>
                        </div>

                        {/* Tabela de Candidatos Retornados */}
                        {candidatosRevisao.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-slate-600">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Sel.</th>
                                    <th className="px-3 py-2 text-left">Nome no Diário</th>
                                    <th className="px-3 py-2 text-left">Turma / Chamada</th>
                                    <th className="px-3 py-2 text-left">{mesesCiclo.mes1}</th>
                                    <th className="px-3 py-2 text-left">{mesesCiclo.mes2}</th>
                                    <th className="px-3 py-2 text-left">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {candidatosRevisao.map((c, idx) => (
                                    <tr
                                      key={idx}
                                      onClick={() => setCandidatoSelIndex(idx)}
                                      className={`cursor-pointer ${
                                        candidatoSelIndex === idx ? 'bg-emerald-50 font-medium' : 'hover:bg-slate-50'
                                      }`}
                                    >
                                      <td className="px-3 py-2">
                                        <input
                                          type="radio"
                                          checked={candidatoSelIndex === idx}
                                          onChange={() => setCandidatoSelIndex(idx)}
                                        />
                                      </td>
                                      <td className="px-3 py-2">{c.nomeAluno}</td>
                                      <td className="px-3 py-2">
                                        {c.turma} {c.numeroChamada ? `(#${c.numeroChamada})` : ''}
                                      </td>
                                      <td className="px-3 py-2">
                                        {c.percentualMes1Texto || '-'} ({c.presencasMes1 || 0}P / {c.faltasMes1 || 0}F)
                                      </td>
                                      <td className="px-3 py-2">
                                        {c.percentualMes2Texto || '-'} ({c.presencasMes2 || 0}P / {c.faltasMes2 || 0}F)
                                      </td>
                                      <td className="px-3 py-2">{c.statusPercentual || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="flex justify-end">
                              <button
                                onClick={handleConfirmarRevisao}
                                disabled={!!busyMessage}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Confirmar Aluno, Atualizar Ciclo e Memorizar Vínculo (NIS)
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================
                  SUBTELA: MOVIMENTACAO ESCOLAR / ALUNOS TRANSFERIDOS
              ============================================================ */}
              {activeTabCiclo === 'movimentacoes' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-base">
                        Alunos Transferidos / Movimentação Escolar — {abaCicloSelecionada}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Inclui alunos detectados automaticamente nos diários com marcador de
                        transferência/remanejamento e exceções registradas manualmente (com ou sem
                        diário).
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-left">Lançado</th>
                          <th className="px-3 py-2.5 text-left">Aluno no Bolsa Família</th>
                          <th className="px-3 py-2.5 text-left">Turma / Origem</th>
                          <th className="px-3 py-2.5 text-left">Situação / Movimentação</th>
                          <th className="px-3 py-2.5 text-left">{mesesCiclo.mes1}</th>
                          <th className="px-3 py-2.5 text-left">{mesesCiclo.mes2}</th>
                          <th className="px-3 py-2.5 text-left">Observação para Portal MEC</th>
                          <th className="px-3 py-2.5 text-right no-print">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(dadosCiclo?.visoes?.movimentacoes?.rows || []).length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                              Nenhum aluno com movimentação ou transferência registrada neste ciclo.
                              Você pode registrar uma transferência na aba <strong>Pendências</strong> ou{' '}
                              <strong>Abaixo do Limite</strong>.
                            </td>
                          </tr>
                        ) : (
                          (dadosCiclo?.visoes?.movimentacoes?.rows || []).map(
                            (row: any, idx: number) => {
                              const key = `MOV_${row['NIS Bolsa Familia'] || row['Nome no Bolsa Familia']}_${idx}`;
                              const lancado = !!lancadosMap[key];
                              return (
                                <tr
                                  key={key}
                                  className={
                                    lancado
                                      ? 'bg-emerald-50/40 text-slate-500'
                                      : 'hover:bg-slate-50'
                                  }
                                >
                                  <td className="px-3 py-2.5">
                                    <input
                                      type="checkbox"
                                      checked={lancado}
                                      onChange={() => toggleLancado(key)}
                                      className="w-4 h-4 rounded text-emerald-600"
                                    />
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="font-bold text-slate-900">
                                      {row['Nome no Bolsa Familia']}
                                    </div>
                                    {row['NIS Bolsa Familia'] && (
                                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                                        <span className="font-mono">
                                          NIS: {row['NIS Bolsa Familia']}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            copiarTexto(row['NIS Bolsa Familia'], key)
                                          }
                                          className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center gap-1 no-print"
                                        >
                                          {copiedNis === key ? (
                                            <>
                                              <Check className="w-3 h-3 text-emerald-600" /> Copiado
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3 h-3" /> Copiar
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 font-semibold">
                                    {row['Turma'] || '-'}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                                      {row['Situacao do aluno'] ||
                                        row['Status do percentual'] ||
                                        'Movimentação / Transferido'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="font-semibold">
                                      {row['Presenca Mes 1'] || 'Sem registro'}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      {row['Presencas Mes 1'] || 0}P • {row['Faltas Mes 1'] || 0}F
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="font-semibold">
                                      {row['Presenca Mes 2'] || 'Sem registro'}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      {row['Presencas Mes 2'] || 0}P • {row['Faltas Mes 2'] || 0}F
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-600 max-w-xs">
                                    {row['Observacao'] || row['Observacoes'] || '-'}
                                  </td>
                                  <td className="px-3 py-2.5 text-right no-print">
                                    <button
                                      type="button"
                                      onClick={() => abrirModalMovimentacao(row)}
                                      className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs"
                                    >
                                      Editar Exceção
                                    </button>
                                  </td>
                                </tr>
                              );
                            }
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============================================================
                  SUBTELA: ABAIXO DO LIMITE (Prompt 5 + Folha de Impressao A4)
              ============================================================ */}
              {activeTabCiclo === 'abaixoLimite' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base">
                        Alunos Abaixo do Limite de Frequência — {abaCicloSelecionada}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Limite: 60% Educação Infantil / Jardim • 75% Ensino Fundamental. Marque os
                        alunos já lançados no Portal Presença/MEC.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-left">Lançado</th>
                          <th className="px-3 py-2.5 text-left">Turma</th>
                          <th className="px-3 py-2.5 text-left">Aluno no Bolsa Família</th>
                          <th className="px-3 py-2.5 text-left">{mesesCiclo.mes1}</th>
                          <th className="px-3 py-2.5 text-left">{mesesCiclo.mes2}</th>
                          <th className="px-3 py-2.5 text-left">Observação / Situação</th>
                          <th className="px-3 py-2.5 text-right no-print">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(dadosCiclo?.visoes?.abaixoLimite?.rows || []).map(
                          (row: any, idx: number) => {
                            const key = `${row['NIS Bolsa Familia'] || row['Nome no Bolsa Familia']}_${idx}`;
                            const lancado = !!lancadosMap[key];
                            const editando = editandoLinhaKey === key;
                            const isInfantil = /JARDIM|\bJD\b|INFANTIL|PRE/i.test(
                              String(row['Turma'] || '')
                            );
                            const situacao = String(
                              row['Situacao do aluno'] || row['Observacao'] || ''
                            );
                            const isTransferido = /TRANSFERID|REMANEJAD|EVADID/i.test(situacao);

                            return (
                              <tr
                                key={key}
                                className={lancado ? 'bg-emerald-50/40 text-slate-500' : 'hover:bg-slate-50'}
                              >
                                <td className="px-3 py-2.5">
                                  <input
                                    type="checkbox"
                                    checked={lancado}
                                    onChange={() => toggleLancado(key)}
                                    className="w-4 h-4 rounded text-emerald-600"
                                  />
                                </td>
                                <td className="px-3 py-2.5 font-semibold">
                                  <div>{row['Turma'] || '-'}</div>
                                  <span
                                    className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] ${
                                      isInfantil
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    Mín. {isInfantil ? '60%' : '75%'}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="font-bold text-slate-900">
                                    {row['Nome no Bolsa Familia']}
                                  </div>
                                  {row['NIS Bolsa Familia'] && (
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                                      <span className="font-mono">
                                        NIS: {row['NIS Bolsa Familia']}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          copiarTexto(row['NIS Bolsa Familia'], key)
                                        }
                                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center gap-1 no-print"
                                      >
                                        {copiedNis === key ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-600" /> Copiado
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" /> Copiar
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </td>

                                {/* Mes 1 */}
                                <td className="px-3 py-2.5">
                                  {editando ? (
                                    <div className="flex items-center gap-1.5">
                                      <label className="text-[10px]">
                                        P:
                                        <input
                                          type="number"
                                          value={formAjuste.presencasMes1}
                                          onChange={(e) =>
                                            setFormAjuste({
                                              ...formAjuste,
                                              presencasMes1: Number(e.target.value)
                                            })
                                          }
                                          className="w-14 ml-1 px-1.5 py-1 border rounded"
                                        />
                                      </label>
                                      <label className="text-[10px]">
                                        F:
                                        <input
                                          type="number"
                                          value={formAjuste.faltasMes1}
                                          onChange={(e) =>
                                            setFormAjuste({
                                              ...formAjuste,
                                              faltasMes1: Number(e.target.value)
                                            })
                                          }
                                          className="w-14 ml-1 px-1.5 py-1 border rounded"
                                        />
                                      </label>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="font-bold text-rose-700">
                                        {row['Presenca Mes 1'] || '-'}
                                      </span>
                                      <div className="text-[11px] text-slate-500">
                                        {row['Presencas Mes 1'] || 0}P • {row['Faltas Mes 1'] || 0}F
                                      </div>
                                    </div>
                                  )}
                                </td>

                                {/* Mes 2 */}
                                <td className="px-3 py-2.5">
                                  {editando ? (
                                    <div className="flex items-center gap-1.5">
                                      <label className="text-[10px]">
                                        P:
                                        <input
                                          type="number"
                                          value={formAjuste.presencasMes2}
                                          onChange={(e) =>
                                            setFormAjuste({
                                              ...formAjuste,
                                              presencasMes2: Number(e.target.value)
                                            })
                                          }
                                          className="w-14 ml-1 px-1.5 py-1 border rounded"
                                        />
                                      </label>
                                      <label className="text-[10px]">
                                        F:
                                        <input
                                          type="number"
                                          value={formAjuste.faltasMes2}
                                          onChange={(e) =>
                                            setFormAjuste({
                                              ...formAjuste,
                                              faltasMes2: Number(e.target.value)
                                            })
                                          }
                                          className="w-14 ml-1 px-1.5 py-1 border rounded"
                                        />
                                      </label>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="font-bold text-rose-700">
                                        {row['Presenca Mes 2'] || '-'}
                                      </span>
                                      <div className="text-[11px] text-slate-500">
                                        {row['Presencas Mes 2'] || 0}P • {row['Faltas Mes 2'] || 0}F
                                      </div>
                                    </div>
                                  )}
                                </td>

                                <td className="px-3 py-2.5">
                                  {isTransferido && (
                                    <span className="inline-block mb-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                                      ALERTA: {situacao}
                                    </span>
                                  )}
                                  {editando ? (
                                    <input
                                      type="text"
                                      value={formAjuste.observacao}
                                      onChange={(e) =>
                                        setFormAjuste({ ...formAjuste, observacao: e.target.value })
                                      }
                                      placeholder="Motivo / observação"
                                      className="w-full px-2 py-1 border rounded text-xs"
                                    />
                                  ) : (
                                    <div className="text-slate-600">
                                      {row['Observacao'] || row['Observacoes'] || '-'}
                                    </div>
                                  )}
                                </td>

                                <td className="px-3 py-2.5 text-right no-print">
                                  {editando ? (
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        onClick={() => salvarEdicaoAbaixoLimite(row)}
                                        className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold"
                                      >
                                        Salvar
                                      </button>
                                      <button
                                        onClick={() => setEditandoLinhaKey('')}
                                        className="px-2 py-1 rounded bg-slate-200 text-slate-700"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => iniciarEdicaoAbaixoLimite(row, idx)}
                                      className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-1 font-medium"
                                    >
                                      <Edit3 className="w-3 h-3" /> Editar P/F
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============================================================
                  SUBTELA: CONFERIDOS (OK)
              ============================================================ */}
              {activeTabCiclo === 'conferidos' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-bold text-sm">
                      Alunos Conferidos no Ciclo ({dadosCiclo?.visoes?.geral?.rows?.length || 0})
                    </h3>
                    <input
                      type="text"
                      value={filtroBuscaTabela}
                      onChange={(e) => setFiltroBuscaTabela(e.target.value)}
                      placeholder="Buscar aluno ou turma..."
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs w-64"
                    />
                  </div>
                  <div className="overflow-x-auto max-h-[70vh]">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Nome no Bolsa Família</th>
                          <th className="px-3 py-2 text-left">Turma</th>
                          <th className="px-3 py-2 text-left">{mesesCiclo.mes1}</th>
                          <th className="px-3 py-2 text-left">{mesesCiclo.mes2}</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(dadosCiclo?.visoes?.geral?.rows || [])
                          .filter((r: any) =>
                            !filtroBuscaTabela
                              ? true
                              : `${r['Nome no Bolsa Familia']} ${r['Turma']}`
                                  .toLowerCase()
                                  .includes(filtroBuscaTabela.toLowerCase())
                          )
                          .map((r: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-semibold">
                                {r['Nome no Bolsa Familia']}
                              </td>
                              <td className="px-3 py-2">{r['Turma'] || '-'}</td>
                              <td className="px-3 py-2">{r['Presenca Mes 1'] || '-'}</td>
                              <td className="px-3 py-2">{r['Presenca Mes 2'] || '-'}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={`px-2 py-0.5 rounded font-semibold ${
                                    r['Status do percentual'] === 'Abaixo do limite'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {r['Status do percentual'] || '-'}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============================================================
                  SUBTELA: VINCULOS PERMANENTES POR NIS (Vinculos Alunos)
              ============================================================ */}
              {activeTabCiclo === 'vinculos' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-emerald-600" />
                        Memória Permanente de Vínculos por NIS (`Vinculos Alunos`)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Alunos confirmados na revisão manual ficam memorizados aqui para serem
                        reconhecidos automaticamente nos próximos ciclos.
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">NIS</th>
                          <th className="px-3 py-2 text-left">Nome no Bolsa Família</th>
                          <th className="px-3 py-2 text-left">Nome Confirmado no Diário</th>
                          <th className="px-3 py-2 text-left">Turma</th>
                          <th className="px-3 py-2 text-left">Atualizado em</th>
                          <th className="px-3 py-2 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {vinculos.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                              Nenhum vínculo permanente salvo ainda.
                            </td>
                          </tr>
                        ) : (
                          vinculos.map((v, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono">{v.nis || '-'}</td>
                              <td className="px-3 py-2 font-semibold">{v.nomeBolsa}</td>
                              <td className="px-3 py-2 text-emerald-800 font-semibold">
                                {v.nomeDiario}
                              </td>
                              <td className="px-3 py-2">{v.turma}</td>
                              <td className="px-3 py-2 text-slate-500">{v.atualizadoEm}</td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={async () => {
                                    await gasApi.removerVinculoAluno({
                                      nis: v.nis,
                                      nomeBolsa: v.nomeBolsa
                                    });
                                    carregarVinculos();
                                  }}
                                  className="text-rose-600 hover:underline inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remover
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============================================================
                  SUBTELA: HISTORICO DE PROCESSAMENTOS
              ============================================================ */}
              {activeTabCiclo === 'historico' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200">
                    <h3 className="font-bold text-sm">Histórico de Processamentos</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Processamento ID</th>
                          <th className="px-3 py-2 text-left">Data/Hora</th>
                          <th className="px-3 py-2 text-left">Período</th>
                          <th className="px-3 py-2 text-left">Entrada</th>
                          <th className="px-3 py-2 text-left">Encontrados</th>
                          <th className="px-3 py-2 text-left">Não Encontrados</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(dadosCiclo?.visoes?.historico?.rows || []).map((h: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono">{h['Processamento ID']}</td>
                            <td className="px-3 py-2">{h['Fim']}</td>
                            <td className="px-3 py-2">{h['Periodo escolhido']}</td>
                            <td className="px-3 py-2">{h['Quantidade de alunos na entrada']}</td>
                            <td className="px-3 py-2 text-emerald-700 font-semibold">
                              {h['Quantidade de encontrados']}
                            </td>
                            <td className="px-3 py-2 text-rose-700">
                              {h['Quantidade de nao encontrados']}
                            </td>
                            <td className="px-3 py-2">{h['Status']}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TELA 5: CONFIGURACOES (Multi-Escola, Multi-Ano, Virada de Ano e API)
          ================================================================ */}
          {activeScreen === 'configuracoes' && (
            <div className="max-w-4xl space-y-6">
              {/* 1. GESTAO DE ESCOLAS (ALTERAR / CRIAR NOVA ESCOLA / PASTAS SEPARADAS) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      <School className="w-3.5 h-3.5" />
                      Multi-Escola com Pastas Isoladas no Google Drive
                    </span>
                    <h2 className="text-lg font-bold mt-1">
                      Gestão de Escolas (Alterar ou Cadastrar Nova Escola)
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Ao cadastrar ou alternar de escola, o sistema cria automaticamente uma pasta com o
                      nome da escola dentro da pasta raiz oficial (
                      <code>{config?.pastaSaidaDadosId || 'Pasta Raiz Oficial'}</code>) e mantém o banco
                      de dados e os relatórios de cada escola separados.
                    </p>
                  </div>
                </div>

                {/* Lista de Escolas Registradas */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Escolas Cadastradas (Clique para Alternar):
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {escolasRegistradas.map((esc) => {
                      const ativa = esc.id === escolaAtiva?.id;
                      return (
                        <div
                          key={esc.id}
                          onClick={() => !ativa && handleAlternarEscola(esc.id)}
                          className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                            ativa
                              ? 'border-emerald-600 bg-emerald-50/70'
                              : 'border-slate-200 hover:border-emerald-400 cursor-pointer bg-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <School className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span className="truncate">{esc.nome}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 truncate">
                              Anos: {(esc.anosDisponiveis || [anoReferencia]).join(', ')} • Diários:{' '}
                              {esc.pastaDiariosId ? `${esc.pastaDiariosId.slice(0, 10)}...` : 'Não def.'}
                            </div>
                          </div>
                          {ativa ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shrink-0">
                              Ativa
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 shrink-0">
                              Ativar
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cadastrar Nova Escola ou Renomear Escola Atual */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      Cadastrar e Abrir Nova Escola
                    </h3>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nome da Nova Escola
                      </label>
                      <input
                        type="text"
                        value={novaEscolaNome}
                        onChange={(e) => setNovaEscolaNome(e.target.value)}
                        placeholder="Ex.: EM PROF MARIA APARECIDA"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Link ou ID da Pasta de Diários da Nova Escola (Opcional)
                      </label>
                      <input
                        type="text"
                        value={novaEscolaPastaDiarios}
                        onChange={(e) => setNovaEscolaPastaDiarios(e.target.value)}
                        placeholder="Cole o link do Google Drive dos diários desta escola"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCriarNovaEscola}
                      disabled={!!busyMessage}
                      className="w-full px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                    >
                      Criar Pasta da Nova Escola e Iniciar Banco
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-800">
                        Renomear Escola Ativa ({escolaAtiva?.nome || 'Escola Ativa'})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Renomeia também a pasta da escola no Google Drive mantendo todos os bancos e
                        relatórios intactos lá dentro.
                      </p>
                      <input
                        type="text"
                        value={renomearEscolaInput}
                        onChange={(e) => setRenomearEscolaInput(e.target.value)}
                        placeholder={escolaAtiva?.nome || 'Novo nome da escola atual'}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRenomearEscolaAtiva}
                      disabled={!!busyMessage || !renomearEscolaInput.trim()}
                      className="w-full px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
                    >
                      Salvar Novo Nome da Escola Atual
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. GESTAO DE ANO LETIVO E VIRADA DE ANO (BANCO POR ANO + ZERAR CICLOS) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                    <Calendar className="w-3.5 h-3.5" />
                    Banco de Dados Reformulado por Ano Letivo
                  </span>
                  <h2 className="text-lg font-bold mt-1">
                    Separação por Ano Letivo e Virada de Ano (Zerar Ciclos)
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Cada ano possui sua própria pasta (<code>📁 {escolaAtiva?.nome || 'Escola'} / 📁 {anoReferencia}</code>)
                    e seu próprio banco de dados enxuto e rápido, com migração opcional da memória de
                    vínculos NIS entre anos.
                  </p>
                </div>

                {/* Anos Disponiveis + Abrir Novo Ano */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800">
                      Anos Letivos da Escola ({escolaAtiva?.nome || 'Escola Ativa'})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {anosDisponiveis.map((ano) => (
                        <button
                          key={ano}
                          type="button"
                          onClick={() => handleAlternarAnoLetivo(ano)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                            Number(ano) === Number(anoReferencia)
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white hover:bg-indigo-50 text-slate-800 border-slate-300'
                          }`}
                        >
                          Ano {ano} {Number(ano) === Number(anoReferencia) ? '✓' : ''}
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Criar / Abrir Novo Ano Letivo (com banco limpo e pasta própria):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="2020"
                          max="2100"
                          value={novoAnoInput}
                          onChange={(e) => setNovoAnoInput(Number(e.target.value))}
                          className="w-28 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => handleAlternarAnoLetivo(novoAnoInput)}
                          disabled={!!busyMessage}
                          className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
                        >
                          Abrir / Criar Banco do Ano {novoAnoInput}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Zerar Informacoes / Reiniciar Ciclos do Ano */}
                  <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <RotateCcw className="w-4 h-4 text-rose-600" />
                        Zerar Informações do Ano ({anoReferencia}) e Começar Novos Ciclos
                      </h3>
                      <p className="text-[11px] text-rose-800">
                        Remove todos os ciclos bimestrais processados no ano ativo para começar do zero.
                      </p>

                      <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={arquivarBackupZerar}
                          onChange={(e) => setArquivarBackupZerar(e.target.checked)}
                        />
                        <span>
                          Salvar cópia de segurança em <code>Historico_Arquivado</code> antes de zerar
                        </span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={manterVinculosZerar}
                          onChange={(e) => setManterVinculosZerar(e.target.checked)}
                        />
                        <span>
                          Manter memória de Vínculos de Alunos (NIS) para reaproveitar
                        </span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleZerarAnoLetivo}
                      disabled={!!busyMessage}
                      className="w-full px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
                    >
                      Zerar Ciclos de {anoReferencia} e Reiniciar Ano
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. PARAMETROS DE SIMILARIDADE E REVISAO */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-bold">Parâmetros de Similaridade e Revisão</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Limite de Similaridade (0.50 a 0.99)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="0.99"
                      value={limiteSimilaridade}
                      onChange={(e) => setLimiteSimilaridade(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Máximo de Candidatos na Revisão
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={maxCandidatos}
                      onChange={(e) => setMaxCandidatos(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setBusyMessage('Salvando configurações...');
                    try {
                      await callGasConfigSave();
                      setSuccessBanner('Configurações salvas com sucesso!');
                    } catch (e: any) {
                      setErrorMessage(e?.message || 'Erro ao salvar configuração.');
                    } finally {
                      setBusyMessage('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                >
                  Salvar Parâmetros
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-bold">Conexão da API Google Apps Script</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL `/exec` do Web App Google Apps Script
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gasUrlInput}
                      onChange={(e) => setGasUrlInput(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                    <button
                      onClick={() => {
                        setGasDirectUrl(gasUrlInput);
                        setSuccessBanner('URL da API atualizada!');
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                    >
                      Salvar URL
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
                  <button
                    onClick={async () => {
                      setBusyMessage('Organizando abas do banco...');
                      try {
                        await gasApi.organizarAbas();
                        setSuccessBanner(
                          'Abas técnicas ocultadas! Apenas Configuração, Diários e Ciclos estão visíveis.'
                        );
                      } finally {
                        setBusyMessage('');
                      }
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold"
                  >
                    Organizar Abas da Planilha
                  </button>

                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          'Deseja limpar os dados operacionais antigos do banco? (Configuração e Listas Aprovadas serão mantidas)'
                        )
                      ) {
                        return;
                      }
                      setBusyMessage('Limpando banco operacional...');
                      try {
                        await gasApi.limparBanco(`LIMPAR_${Date.now()}`);
                        setSuccessBanner('Banco operacional limpo com sucesso!');
                        await recarregarDadosCiclo('');
                      } finally {
                        setBusyMessage('');
                      }
                    }}
                    className="px-4 py-2 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-semibold"
                  >
                    Limpar Dados Operacionais do Banco
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ====================================================================
          MODAL DE REGISTRO DE TRANSFERENCIA / MOVIMENTACAO ESCOLAR / EXCECAO
      ==================================================================== */}
      {modalMovAluno && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Tratamento de Exceção Escolar (Com ou Sem Diário)
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {modalMovAluno['Nome no Bolsa Familia']}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  NIS: <span className="font-mono">{modalMovAluno['NIS Bolsa Familia'] || 'Não informado'}</span> •
                  Dt. Nasc.: {modalMovAluno['Dt. Nasc. Bolsa Familia'] || '-'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMovAluno(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Fechar ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tipo de Movimentação / Exceção
                </label>
                <select
                  value={formMov.tipoMovimentacao}
                  onChange={(e) =>
                    setFormMov({
                      ...formMov,
                      tipoMovimentacao: e.target.value as TipoMovimentacaoAluno
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
                >
                  <option value="TRANSFERIDO_ESCOLA">
                    Transferido para outra Escola (Sem frequência neste ciclo / Não consta no diário)
                  </option>
                  <option value="TRANSFERIDO_PARCIAL">
                    Transferido com Frequência Parcial no Ciclo (Cursou apenas parte do bimestre)
                  </option>
                  <option value="REMANEJADO_INTERNO">
                    Remanejado de Turma na Própria Escola
                  </option>
                  <option value="NAO_PERTENCE_UE">
                    Não pertence a esta Escola (Vínculo de outra UE no Portal MEC)
                  </option>
                  <option value="ABANDONO_EVASAO">
                    Abandono / Evasão Escolar
                  </option>
                  <option value="ATESTADO_JUSTIFICADO">
                    Afastamento Médico / Frequência Justificada
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Data da Movimentação (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 15/04/2026"
                    value={formMov.dataMovimentacao}
                    onChange={(e) =>
                      setFormMov({ ...formMov, dataMovimentacao: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Turma de Origem (se houver)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 3º ANO B"
                    value={formMov.turma}
                    onChange={(e) => setFormMov({ ...formMov, turma: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Escola Destino / Origem (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: E.M. Tiradentes"
                    value={formMov.escolaDestino}
                    onChange={(e) =>
                      setFormMov({ ...formMov, escolaDestino: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {(formMov.tipoMovimentacao === 'TRANSFERIDO_PARCIAL' ||
                formMov.tipoMovimentacao === 'REMANEJADO_INTERNO' ||
                formMov.tipoMovimentacao === 'ATESTADO_JUSTIFICADO') && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800">
                    Frequência Apurada no Período Cursado (Deixe 0 se não houve aula no mês)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Presenças ({mesesCiclo.mes1})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formMov.presencasMes1}
                        onChange={(e) =>
                          setFormMov({ ...formMov, presencasMes1: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Faltas ({mesesCiclo.mes1})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formMov.faltasMes1}
                        onChange={(e) =>
                          setFormMov({ ...formMov, faltasMes1: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Presenças ({mesesCiclo.mes2})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formMov.presencasMes2}
                        onChange={(e) =>
                          setFormMov({ ...formMov, presencasMes2: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Faltas ({mesesCiclo.mes2})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formMov.faltasMes2}
                        onChange={(e) =>
                          setFormMov({ ...formMov, faltasMes2: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observação / Justificativa para o Portal Presença MEC
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aluno transferido antes do início do bimestre conforme histórico escolar."
                  value={formMov.observacao}
                  onChange={(e) => setFormMov({ ...formMov, observacao: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {(formMov.tipoMovimentacao === 'TRANSFERIDO_ESCOLA' ||
                formMov.tipoMovimentacao === 'NAO_PERTENCE_UE' ||
                formMov.tipoMovimentacao === 'ABANDONO_EVASAO') && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formMov.memorizarVinculoNis}
                    onChange={(e) =>
                      setFormMov({ ...formMov, memorizarVinculoNis: e.target.checked })
                    }
                    className="mt-0.5 rounded text-amber-600"
                  />
                  <div>
                    <div className="font-bold text-amber-950">
                      Memorizar exceção por NIS para os próximos ciclos (`Vinculos Alunos`)
                    </div>
                    <div className="text-[11px] text-amber-800">
                      Se este aluno continuar aparecendo no PDF do MEC nos próximos bimestres mesmo
                      sem estar nos diários da escola, o sistema já o classificará automaticamente
                      como <strong>Movimentação / Transferido</strong>.
                    </div>
                  </div>
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalMovAluno(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarMovimentacao}
                disabled={!!busyMessage}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50"
              >
                Salvar Movimentação no Ciclo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  async function callGasConfigSave() {
    return gasApi.salvarConfiguracaoMvp2({
      limiteRevisao: limiteSimilaridade,
      maxCandidatos
    });
  }
}
