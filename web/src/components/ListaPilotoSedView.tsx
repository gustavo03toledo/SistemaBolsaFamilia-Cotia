import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Settings,
  Sparkles,
  Upload,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { gasApi } from '../services/gasApi';
import {
  compararRelatorioSedComListasPiloto,
  extrairCodigoCanonicoTurma,
  extrairDiaMesCurto,
  extrairListaPilotoDeArquivoPdfLocal,
  extrairRelatorioSedDeArquivoPdf,
  obterNomeTurmaDaPlanilha,
  obterRotuloSituacao
} from '../services/sedExtractor';
import {
  ComparacaoTurmaPiloto,
  MudancaDetectadaPiloto,
  TurmaListaPilotoDrive,
  TurmaRelatorioSed
} from '../types/sbf';

const STORAGE_KEY_PASTA_PILOTO = 'SBF_PASTA_LISTA_PILOTO_INPUT';

export type SubTabListaPilotoId = 'conferencia' | 'turmas' | 'config';

export interface ListaPilotoHeaderState {
  pastaNome: string;
  pastaUrl: string;
  totalTurmasPiloto: number;
  totalAlunosPiloto: number;
  arquivoSedNome: string;
  totalTurmasSed: number;
  salasOkCount: number;
  salasComMudancaCount: number;
  carregandoPiloto: boolean;
  onSincronizarDrive: () => void;
}

interface ListaPilotoSedViewProps {
  activeSubTab?: SubTabListaPilotoId;
  onChangeSubTab?: (tab: SubTabListaPilotoId) => void;
  onHeaderStateChange?: (state: ListaPilotoHeaderState) => void;
}

export const ListaPilotoSedView: React.FC<ListaPilotoSedViewProps> = ({
  activeSubTab = 'conferencia',
  onChangeSubTab,
  onHeaderStateChange
}) => {
  const [internalSubTab, setInternalSubTab] = useState<SubTabListaPilotoId>(activeSubTab);
  const currentSubTab = onChangeSubTab ? activeSubTab : internalSubTab;

  function setSubTab(tab: SubTabListaPilotoId) {
    setInternalSubTab(tab);
    if (onChangeSubTab) onChangeSubTab(tab);
  }

  // Estado da pasta de Listas Piloto (Google Drive)
  const [pastaInput, setPastaInput] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_PASTA_PILOTO) || ''
  );
  const [pastaNome, setPastaNome] = useState<string>('');
  const [pastaUrl, setPastaUrl] = useState<string>('');
  const [turmasPiloto, setTurmasPiloto] = useState<TurmaListaPilotoDrive[]>([]);
  const [carregandoPiloto, setCarregandoPiloto] = useState<boolean>(false);
  const [erroPiloto, setErroPiloto] = useState<string>('');
  const [avisosPiloto, setAvisosPiloto] = useState<string[]>([]);

  // Estado do PDF da SED (Alunos por Classe)
  const [arquivoSedNome, setArquivoSedNome] = useState<string>('');
  const [turmasSed, setTurmasSed] = useState<TurmaRelatorioSed[]>([]);
  const [dataRelatorioSed, setDataRelatorioSed] = useState<string>('');
  const [escolaSed, setEscolaSed] = useState<string>('');
  const [carregandoSed, setCarregandoSed] = useState<boolean>(false);
  const [erroSed, setErroSed] = useState<string>('');

  // Data de chegada padrão para alunos novos (DD/MM)
  const [dataChegadaPadrao, setDataChegadaPadrao] = useState<string>(() => {
    const hoje = new Date();
    return `${('0' + hoje.getDate()).slice(-2)}/${('0' + (hoje.getMonth() + 1)).slice(-2)}`;
  });

  // Estado das comparações e edições manuais antes de aplicar
  const [comparacoes, setComparacoes] = useState<ComparacaoTurmaPiloto[]>([]);
  const [filtroStatusSala, setFiltroStatusSala] = useState<
    'COM_ALTERACOES' | 'OK_SEM_ALTERACAO' | 'TODAS'
  >('TODAS');
  const [buscaTurmaOuAluno, setBuscaTurmaOuAluno] = useState<string>('');
  const [turmaExpandidaCompleta, setTurmaExpandidaCompleta] = useState<string | null>(null);

  // Estado para a sub-aba "Turmas & Listas Piloto"
  const [turmaSelecionadaConsulta, setTurmaSelecionadaConsulta] = useState<string>('');
  const [buscaAlunoGlobalPiloto, setBuscaAlunoGlobalPiloto] = useState<string>('');

  // Estado de gravação nas planilhas do Google Sheets
  const [salvandoTurmaId, setSalvandoTurmaId] = useState<string | null>(null);
  const [salvandoTodas, setSalvandoTodas] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [copiadoTexto, setCopiadoTexto] = useState<string>('');

  // Normalizar turmas piloto garantindo sempre o nome da turma pelo nome da planilha
  function normalizarTurmasPeloNomeDaPlanilha(
    lista: TurmaListaPilotoDrive[]
  ): TurmaListaPilotoDrive[] {
    return (lista || []).map((t) => {
      const nomeDaPlanilha = obterNomeTurmaDaPlanilha(t.planilhaNome || t.turmaExibicao);
      const codigoDaPlanilha = extrairCodigoCanonicoTurma(t.planilhaNome || nomeDaPlanilha);
      return {
        ...t,
        turmaExibicao: nomeDaPlanilha || t.planilhaNome || t.turmaExibicao,
        turmaCodigo:
          codigoDaPlanilha && /^(FUND_|PRE_|AEE_)/.test(codigoDaPlanilha)
            ? codigoDaPlanilha
            : t.turmaCodigo
      };
    });
  }

  // Carregar listas piloto salvas no servidor ao abrir a aba
  useEffect(() => {
    carregarListasPilotoDoDrive(false);
  }, []);

  // Recalcular comparações sempre que turmasSed ou turmasPiloto mudarem
  useEffect(() => {
    if (turmasSed.length === 0 && turmasPiloto.length === 0) {
      setComparacoes([]);
      return;
    }
    if (turmasSed.length > 0) {
      const resultado = compararRelatorioSedComListasPiloto(
        turmasSed,
        turmasPiloto,
        dataChegadaPadrao
      );
      setComparacoes(resultado);
      const temComAlteracao = resultado.some((c) => c.statusSala === 'COM_ALTERACOES');
      setFiltroStatusSala(temComAlteracao ? 'COM_ALTERACOES' : 'TODAS');
    }
  }, [turmasSed, turmasPiloto]);

  // Estatísticas consolidadas
  const resumo = useMemo(() => {
    const salasOk = comparacoes.filter((c) => c.statusSala === 'OK_SEM_ALTERACAO');
    const salasComAlteracao = comparacoes.filter((c) => c.statusSala === 'COM_ALTERACOES');
    const salasSemPlanilha = comparacoes.filter((c) => c.statusSala === 'SEM_PLANILHA_DRIVE');
    const totalNovos = comparacoes.reduce((acc, c) => acc + c.novosAlunosCount, 0);
    const totalMovimentacoes = comparacoes.reduce((acc, c) => acc + c.novasMovimentacoesCount, 0);
    const totalSelecionadasParaGravar = comparacoes.reduce(
      (acc, c) =>
        acc + (c.turmaPiloto?.planilhaId ? c.mudancas.filter((m) => m.selecionada).length : 0),
      0
    );

    return {
      salasOk,
      salasComAlteracao,
      salasSemPlanilha,
      totalNovos,
      totalMovimentacoes,
      totalSelecionadasParaGravar
    };
  }, [comparacoes]);

  // Informar o cabeçalho principal do App sobre o estado atual do módulo Lista Piloto
  useEffect(() => {
    if (!onHeaderStateChange) return;
    onHeaderStateChange({
      pastaNome,
      pastaUrl,
      totalTurmasPiloto: turmasPiloto.length,
      totalAlunosPiloto: turmasPiloto.reduce((acc, t) => acc + t.totalAlunos, 0),
      arquivoSedNome,
      totalTurmasSed: turmasSed.length,
      salasOkCount: resumo.salasOk.length,
      salasComMudancaCount: resumo.salasComAlteracao.length,
      carregandoPiloto,
      onSincronizarDrive: () => carregarListasPilotoDoDrive(false)
    });
  }, [
    pastaNome,
    pastaUrl,
    turmasPiloto,
    arquivoSedNome,
    turmasSed,
    resumo.salasOk.length,
    resumo.salasComAlteracao.length,
    carregandoPiloto
  ]);

  async function carregarListasPilotoDoDrive(forcarInputUsuario: boolean) {
    setCarregandoPiloto(true);
    setErroPiloto('');
    setMensagemSucesso('');
    try {
      const linkEnviar = forcarInputUsuario ? pastaInput.trim() : pastaInput.trim() || undefined;
      if (forcarInputUsuario && linkEnviar) {
        localStorage.setItem(STORAGE_KEY_PASTA_PILOTO, linkEnviar);
      }
      const resp = await gasApi.escanearListasPiloto(linkEnviar);
      if (resp && resp.configurado) {
        const normalizadas = normalizarTurmasPeloNomeDaPlanilha(resp.turmas || []);
        normalizadas.sort((a, b) =>
          a.turmaExibicao.localeCompare(b.turmaExibicao, 'pt-BR', { numeric: true })
        );
        setTurmasPiloto(normalizadas);
        if (normalizadas.length > 0 && !turmaSelecionadaConsulta) {
          setTurmaSelecionadaConsulta(normalizadas[0].idUnico);
        }
        setPastaNome(resp.pastaNome || 'Pasta de Listas Piloto');
        setPastaUrl(resp.pastaUrl || '');
        if (!pastaInput && resp.pastaListaPilotoId) {
          setPastaInput(resp.pastaUrl || resp.pastaListaPilotoId);
          localStorage.setItem(
            STORAGE_KEY_PASTA_PILOTO,
            resp.pastaUrl || resp.pastaListaPilotoId
          );
        }
        setAvisosPiloto([...(resp.avisos || []), ...(resp.erros || [])]);
      } else {
        setAvisosPiloto(resp?.avisos || []);
      }
    } catch (err: any) {
      setErroPiloto(err?.message || 'Erro ao carregar Listas Piloto do Google Drive.');
    } finally {
      setCarregandoPiloto(false);
    }
  }

  async function handleUploadPdfSed(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCarregandoSed(true);
    setErroSed('');
    setMensagemSucesso('');
    try {
      const extraido = await extrairRelatorioSedDeArquivoPdf(file);
      if (!extraido.turmas.length) {
        throw new Error(
          'Nenhuma turma do formato "Alunos por Classe (SED)" foi identificada neste PDF.'
        );
      }
      setArquivoSedNome(file.name);
      setTurmasSed(extraido.turmas);
      setDataRelatorioSed(extraido.dataGeracaoRelatorio);
      setEscolaSed(extraido.escolaNome);
      if (extraido.dataGeracaoRelatorio) {
        const diaMes = extrairDiaMesCurto(extraido.dataGeracaoRelatorio);
        if (diaMes) setDataChegadaPadrao(diaMes);
      }
      if (currentSubTab !== 'conferencia') {
        setSubTab('conferencia');
      }
    } catch (err: any) {
      setErroSed(err?.message || 'Falha ao ler o PDF do relatório SED.');
    } finally {
      setCarregandoSed(false);
      e.target.value = '';
    }
  }

  async function handleUploadPdfListaPilotoTeste(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setCarregandoPiloto(true);
    setErroPiloto('');
    try {
      const novas: TurmaListaPilotoDrive[] = [];
      for (const f of files) {
        const t = await extrairListaPilotoDeArquivoPdfLocal(f);
        novas.push(t);
      }
      const normalizadas = normalizarTurmasPeloNomeDaPlanilha(novas);
      setTurmasPiloto((prev) => {
        const codigosNovos = new Set(normalizadas.map((n) => n.turmaCodigo));
        const filtradas = prev.filter((p) => !codigosNovos.has(p.turmaCodigo));
        const unidas = [...filtradas, ...normalizadas];
        unidas.sort((a, b) =>
          a.turmaExibicao.localeCompare(b.turmaExibicao, 'pt-BR', { numeric: true })
        );
        return unidas;
      });
      if (!pastaNome) {
        setPastaNome('Listas Piloto Importadas via PDF (Modo Conferência Local)');
      }
    } catch (err: any) {
      setErroPiloto(err?.message || 'Falha ao ler o PDF da Lista Piloto.');
    } finally {
      setCarregandoPiloto(false);
      e.target.value = '';
    }
  }

  function atualizarCampoMudanca(
    idComparacao: string,
    idMudanca: string,
    campo: keyof MudancaDetectadaPiloto,
    valor: any
  ) {
    setComparacoes((prev) =>
      prev.map((comp) => {
        if (comp.idComparacao !== idComparacao) return comp;
        const novasMudancas = comp.mudancas.map((m) => {
          if (m.id !== idMudanca) return m;
          const atualizado = { ...m, [campo]: valor };

          if (
            campo === 'dataMovGravar' &&
            m.tipo === 'NOVO_ALUNO' &&
            (!atualizado.situacaoGravar || atualizado.situacaoGravar === 'ATIVO')
          ) {
            const obsAntiga = String(m.observacoesGravar || '');
            if (!obsAntiga || /^MS:\s*\d{0,2}\/?\d{0,2}/i.test(obsAntiga)) {
              const resto = obsAntiga.replace(/^MS:\s*[^|]*(\|\s*)?/i, '').trim();
              atualizado.observacoesGravar = valor
                ? resto
                  ? `MS: ${valor} | ${resto}`
                  : `MS: ${valor}`
                : resto;
            }
          }
          return atualizado;
        });
        return { ...comp, mudancas: novasMudancas };
      })
    );
  }

  function aplicarDataChegadaATodosNovos(novaData: string) {
    setDataChegadaPadrao(novaData);
    setComparacoes((prev) =>
      prev.map((comp) => ({
        ...comp,
        mudancas: comp.mudancas.map((m) => {
          if (m.tipo !== 'NOVO_ALUNO' || (m.situacaoGravar && m.situacaoGravar !== 'ATIVO')) {
            return m;
          }
          const obsResto = String(m.observacoesGravar || '')
            .replace(/^MS:\s*[^|]*(\|\s*)?/i, '')
            .trim();
          return {
            ...m,
            dataMovGravar: novaData,
            observacoesGravar: novaData
              ? obsResto
                ? `MS: ${novaData} | ${obsResto}`
                : `MS: ${novaData}`
              : obsResto
          };
        })
      }))
    );
  }

  async function salvarAtualizacoesDaSalaNoSheets(comp: ComparacaoTurmaPiloto) {
    if (!comp.turmaPiloto || !comp.turmaPiloto.planilhaId) {
      alert(
        'Esta Lista Piloto foi carregada apenas via PDF local. Para atualizar automaticamente, conecte a pasta do Google Drive com as planilhas Google Sheets.'
      );
      return;
    }

    const selecionadas = comp.mudancas.filter((m) => m.selecionada);
    if (!selecionadas.length) {
      alert('Selecione ao menos uma alteração para aplicar na planilha.');
      return;
    }

    setSalvandoTurmaId(comp.idComparacao);
    setMensagemSucesso('');
    try {
      const resp = await gasApi.aplicarAtualizacoesListaPiloto({
        atualizacoesPorTurma: [
          {
            planilhaId: comp.turmaPiloto.planilhaId,
            nomeAba: comp.turmaPiloto.nomeAba,
            turmaExibicao: comp.nomeExibicao,
            mudancas: selecionadas.map((m) => ({
              linhaPlanilha: m.linhaPlanilha,
              nr: m.nr,
              nome: m.nome,
              rm: m.rmGravar,
              situacao: m.situacaoGravar,
              dataMovimentacao: m.dataMovGravar,
              dataNascimento: m.dataNascimentoGravar,
              ra: m.raGravar,
              direitoImagem: m.direitoImagemGravar,
              observacoes: m.observacoesGravar
            }))
          }
        ]
      });

      if (resp?.erros?.length) {
        throw new Error(resp.erros.join('\n'));
      }

      setMensagemSucesso(
        `Planilha "${comp.turmaPiloto.planilhaNome}" atualizada com sucesso no Google Sheets (${selecionadas.length} registro(s) aplicado(s))!`
      );
      await carregarListasPilotoDoDrive(false);
    } catch (err: any) {
      alert('Erro ao atualizar planilha: ' + (err?.message || String(err)));
    } finally {
      setSalvandoTurmaId(null);
    }
  }

  async function salvarTodasAsSalasPendentesNoSheets() {
    const lotes = comparacoes
      .filter(
        (c) =>
          c.turmaPiloto?.planilhaId &&
          c.turmaPiloto.editavelNoSheets &&
          c.mudancas.some((m) => m.selecionada)
      )
      .map((c) => ({
        planilhaId: c.turmaPiloto!.planilhaId,
        nomeAba: c.turmaPiloto!.nomeAba,
        turmaExibicao: c.nomeExibicao,
        mudancas: c.mudancas
          .filter((m) => m.selecionada)
          .map((m) => ({
            linhaPlanilha: m.linhaPlanilha,
            nr: m.nr,
            nome: m.nome,
            rm: m.rmGravar,
            situacao: m.situacaoGravar,
            dataMovimentacao: m.dataMovGravar,
            dataNascimento: m.dataNascimentoGravar,
            ra: m.raGravar,
            direitoImagem: m.direitoImagemGravar,
            observacoes: m.observacoesGravar
          }))
      }));

    if (!lotes.length) {
      alert('Nenhuma alteração pendente selecionada em planilhas do Google Sheets.');
      return;
    }

    setSalvandoTodas(true);
    setMensagemSucesso('');
    try {
      const resp = await gasApi.aplicarAtualizacoesListaPiloto({
        atualizacoesPorTurma: lotes
      });
      if (resp?.erros?.length) {
        alert('Algumas turmas apresentaram aviso:\n' + resp.erros.join('\n'));
      }
      setMensagemSucesso(
        `Atualização em lote concluída! ${lotes.length} Lista(s) Piloto atualizada(s) no Google Drive.`
      );
      await carregarListasPilotoDoDrive(false);
    } catch (err: any) {
      alert('Erro na atualização em lote: ' + (err?.message || String(err)));
    } finally {
      setSalvandoTodas(false);
    }
  }

  function copiarTexto(texto: string, rotulo: string) {
    navigator.clipboard.writeText(texto);
    setCopiadoTexto(rotulo);
    setTimeout(() => setCopiadoTexto(''), 2000);
  }

  const comparacoesFiltradas = useMemo(() => {
    return comparacoes.filter((c) => {
      if (filtroStatusSala === 'COM_ALTERACOES' && c.statusSala !== 'COM_ALTERACOES') {
        return false;
      }
      if (filtroStatusSala === 'OK_SEM_ALTERACAO' && c.statusSala !== 'OK_SEM_ALTERACAO') {
        return false;
      }
      if (buscaTurmaOuAluno.trim()) {
        const termo = buscaTurmaOuAluno.trim().toUpperCase();
        const matchTurma =
          c.nomeExibicao.toUpperCase().includes(termo) ||
          (c.turmaPiloto?.planilhaNome || '').toUpperCase().includes(termo) ||
          (c.turmaSed?.turmaSed || '').toUpperCase().includes(termo);
        const matchMudanca = c.mudancas.some(
          (m) =>
            m.nome.toUpperCase().includes(termo) ||
            m.raFormatadoSed.toUpperCase().includes(termo) ||
            m.situacaoSed.toUpperCase().includes(termo)
        );
        const matchAlunoGeral =
          c.turmaPiloto?.alunos.some((a) => a.nome.toUpperCase().includes(termo)) ||
          c.turmaSed?.alunos.some((a) => a.nome.toUpperCase().includes(termo));
        return Boolean(matchTurma || matchMudanca || matchAlunoGeral);
      }
      return true;
    });
  }, [comparacoes, filtroStatusSala, buscaTurmaOuAluno]);

  // Busca global de alunos nas planilhas de Lista Piloto (Sub-aba Turmas)
  const resultadosBuscaGlobalPiloto = useMemo(() => {
    const q = buscaAlunoGlobalPiloto.trim().toUpperCase();
    if (!q || q.length < 2) return [];
    const encontrados: Array<{ turma: TurmaListaPilotoDrive; aluno: any }> = [];
    for (const t of turmasPiloto) {
      for (const a of t.alunos) {
        if (
          a.nome.toUpperCase().includes(q) ||
          a.ra.toUpperCase().includes(q) ||
          a.rm.toUpperCase().includes(q)
        ) {
          encontrados.push({ turma: t, aluno: a });
        }
      }
    }
    return encontrados.slice(0, 50);
  }, [turmasPiloto, buscaAlunoGlobalPiloto]);

  const turmaAtivaDetalhe = useMemo(() => {
    return (
      turmasPiloto.find((t) => t.idUnico === turmaSelecionadaConsulta) || turmasPiloto[0] || null
    );
  }, [turmasPiloto, turmaSelecionadaConsulta]);

  return (
    <div className="space-y-6 pb-12">
      {/* Barra de Sub-Abas do Módulo Lista Piloto */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSubTab('conferencia')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentSubTab === 'conferencia'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Conferência SED × Listas Piloto
            {resumo.salasComAlteracao.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold">
                {resumo.salasComAlteracao.length} c/ mudança
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('turmas')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentSubTab === 'turmas'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Turmas & Planilhas no Drive ({turmasPiloto.length})
          </button>

          <button
            onClick={() => setSubTab('config')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentSubTab === 'config'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            Pasta do Drive & Configurações
          </button>
        </div>

        {resumo.totalSelecionadasParaGravar > 0 && (
          <button
            onClick={salvarTodasAsSalasPendentesNoSheets}
            disabled={salvandoTodas}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            {salvandoTodas ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Aplicar Todas as Mudanças no Drive ({resumo.totalSelecionadasParaGravar})
          </button>
        )}
      </div>

      {/* Mensagem de sucesso após gravação */}
      {mensagemSucesso && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between text-emerald-900 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{mensagemSucesso}</span>
          </div>
          <button
            onClick={() => setMensagemSucesso('')}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ====================================================================
          SUB-ABA 1: CONFERÊNCIA SED × LISTAS PILOTO
      ==================================================================== */}
      {currentSubTab === 'conferencia' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Pasta das Listas Piloto no Google Drive */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      1
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Pasta das Listas Piloto (Google Drive)
                      </h2>
                      <p className="text-xs text-slate-500">
                        O nome de cada turma é lido diretamente do nome da planilha no Drive
                      </p>
                    </div>
                  </div>
                  {pastaUrl && (
                    <a
                      href={pastaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-lg"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Abrir Pasta
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pastaInput}
                    onChange={(e) => setPastaInput(e.target.value)}
                    placeholder="Cole aqui o link ou ID da pasta das Listas Piloto no Google Drive..."
                    className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  <button
                    onClick={() => carregarListasPilotoDoDrive(true)}
                    disabled={carregandoPiloto}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {carregandoPiloto ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {turmasPiloto.length > 0 ? 'Sincronizar' : 'Conectar Pasta'}
                  </button>
                </div>

                {erroPiloto && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{erroPiloto}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                {turmasPiloto.length > 0 ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      <strong>{turmasPiloto.length}</strong> planilha(s) carregada(s) (
                      {turmasPiloto.reduce((acc, t) => acc + t.totalAlunos, 0)} registros)
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">
                    Cole o link da pasta do Drive e clique em Conectar Pasta.
                  </span>
                )}

                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg cursor-pointer transition">
                  <FileText className="w-3.5 h-3.5" />
                  Testar com PDF Local
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleUploadPdfListaPilotoTeste}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Card 2: Upload do Relatório PDF da SED (Alunos por Classe) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold">
                      2
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Relatório da SED — Alunos por Classe (.PDF)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Envie o PDF único gerado pelo sistema SED com todas as turmas
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">Data Chegada (MS):</span>
                    <input
                      type="text"
                      value={dataChegadaPadrao}
                      onChange={(e) => aplicarDataChegadaATodosNovos(e.target.value)}
                      placeholder="DD/MM"
                      className="w-20 px-2.5 py-1 text-xs font-bold text-center rounded-lg border border-slate-300 focus:border-indigo-600 outline-none"
                      title="Data padrão sugerida para alunos novos que chegarem ativos (formato DD/MM)"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between gap-4 p-4 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      {carregandoSed ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {arquivoSedNome
                          ? `Arquivo carregado: ${arquivoSedNome}`
                          : 'Clique para selecionar o PDF "Alunos_por_Classe.pdf" da SED'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {turmasSed.length > 0
                          ? `${turmasSed.length} turmas extraídas • Emitido em ${dataRelatorioSed || 'data não informada'}`
                          : 'Leitura instantânea de todas as turmas e movimentações (BXTR, TRAN, NCOM, REMA, CEDE, ABAN)'}
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-xs font-bold shrink-0">
                    Escolher PDF
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleUploadPdfSed}
                    className="hidden"
                  />
                </label>

                {erroSed && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{erroSed}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                {turmasSed.length > 0 ? (
                  <div className="flex items-center gap-2 font-medium text-indigo-900">
                    <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                    <span>
                      {escolaSed ? `${escolaSed} • ` : ''}
                      <strong>{turmasSed.length}</strong> turmas e{' '}
                      <strong>{turmasSed.reduce((acc, t) => acc + t.alunos.length, 0)}</strong>{' '}
                      matrículas lidas do SED
                    </span>
                  </div>
                ) : (
                  <span>Aguardando upload do relatório PDF da SED para comparar com as Listas Piloto.</span>
                )}
              </div>
            </div>
          </div>

          {/* Painel de Resultados da Comparação */}
          {comparacoes.length > 0 && (
            <>
              {/* 4 Cards Executivos de Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => setFiltroStatusSala('OK_SEM_ALTERACAO')}
                  className={`rounded-2xl p-4 border transition cursor-pointer ${
                    filtroStatusSala === 'OK_SEM_ALTERACAO'
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Salas 100% OK
                    </span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-3xl font-extrabold text-emerald-700">
                    {resumo.salasOk.length}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Salas sem nenhuma alteração ou pendência
                  </p>
                </div>

                <div
                  onClick={() => setFiltroStatusSala('COM_ALTERACOES')}
                  className={`rounded-2xl p-4 border transition cursor-pointer ${
                    filtroStatusSala === 'COM_ALTERACOES'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                      Salas com Mudanças
                    </span>
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="mt-2 text-3xl font-extrabold text-amber-700">
                    {resumo.salasComAlteracao.length}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Salas que possuem aluno novo ou movimentação
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      Alunos Novos (Chegadas)
                    </span>
                    <UserPlus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="mt-2 text-3xl font-extrabold text-blue-700">
                    {resumo.totalNovos}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Matrículas novas para incluir na Lista Piloto
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                      Novas Movimentações
                    </span>
                    <UserMinus className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="mt-2 text-3xl font-extrabold text-rose-700">
                    {resumo.totalMovimentacoes}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    BXTR, TRAN, NCOM, REMA, CEDE ou ABAN detectados
                  </p>
                </div>
              </div>

              {/* Faixa Verde de Confirmação Visual das Salas 100% OK */}
              {resumo.salasOk.length > 0 && (
                <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <h3 className="text-sm font-bold text-emerald-950">
                        Salas Conferidas e 100% OK — Nenhuma alteração encontrada (
                        {resumo.salasOk.length} sala{resumo.salasOk.length > 1 ? 's' : ''})
                      </h3>
                    </div>
                    <span className="text-xs text-emerald-700 font-medium">
                      Clique em uma sala para inspecionar seus alunos
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resumo.salasOk.map((sala) => (
                      <button
                        key={sala.idComparacao}
                        onClick={() => {
                          setFiltroStatusSala('TODAS');
                          setTurmaExpandidaCompleta(sala.idComparacao);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 text-xs font-bold shadow-xs hover:bg-emerald-100 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{sala.nomeExibicao}</span>
                        <span className="text-[11px] font-normal text-emerald-700">
                          ({sala.turmaPiloto?.totalAtivos || sala.turmaSed?.resumoTopo.ativos || 0}{' '}
                          ativos)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Barra de Filtros e Busca */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setFiltroStatusSala('COM_ALTERACOES')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filtroStatusSala === 'COM_ALTERACOES'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Com Alterações Pendentes ({resumo.salasComAlteracao.length})
                  </button>
                  <button
                    onClick={() => setFiltroStatusSala('OK_SEM_ALTERACAO')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filtroStatusSala === 'OK_SEM_ALTERACAO'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Salas 100% OK ({resumo.salasOk.length})
                  </button>
                  <button
                    onClick={() => setFiltroStatusSala('TODAS')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filtroStatusSala === 'TODAS'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Todas as Turmas ({comparacoes.length})
                  </button>
                </div>

                <div className="relative min-w-[260px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaTurmaOuAluno}
                    onChange={(e) => setBuscaTurmaOuAluno(e.target.value)}
                    placeholder="Buscar nome da planilha/turma, aluno, RA ou sigla..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              {/* Lista de Salas e Mudanças para Conferência */}
              <div className="space-y-5">
                {comparacoesFiltradas.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <div className="text-base font-bold text-slate-800">
                      {filtroStatusSala === 'COM_ALTERACOES'
                        ? 'Nenhuma sala possui alterações pendentes! Todas as listas piloto comparadas estão 100% em dia.'
                        : 'Nenhuma turma encontrada para o filtro selecionado.'}
                    </div>
                    {filtroStatusSala === 'COM_ALTERACOES' && (
                      <button
                        onClick={() => setFiltroStatusSala('TODAS')}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 cursor-pointer"
                      >
                        Ver todas as salas conferidas
                      </button>
                    )}
                  </div>
                ) : (
                  comparacoesFiltradas.map((comp) => {
                    const selecionadasCount = comp.mudancas.filter((m) => m.selecionada).length;

                    return (
                      <div
                        key={comp.idComparacao}
                        className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                          comp.statusSala === 'COM_ALTERACOES'
                            ? 'border-amber-300'
                            : comp.statusSala === 'OK_SEM_ALTERACAO'
                            ? 'border-emerald-200'
                            : 'border-slate-200'
                        }`}
                      >
                        {/* Cabeçalho da Turma (Nome vindo direto do Nome da Planilha da Lista Piloto) */}
                        <div
                          className={`px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b ${
                            comp.statusSala === 'COM_ALTERACOES'
                              ? 'bg-amber-50/70 border-amber-200'
                              : comp.statusSala === 'OK_SEM_ALTERACAO'
                              ? 'bg-emerald-50/50 border-emerald-100'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-lg font-extrabold text-slate-900">
                                  {comp.turmaPiloto
                                    ? obterNomeTurmaDaPlanilha(comp.turmaPiloto.planilhaNome)
                                    : comp.nomeExibicao}
                                </span>

                                {comp.statusSala === 'OK_SEM_ALTERACAO' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    SALA OK — Sem Alterações
                                  </span>
                                )}

                                {comp.statusSala === 'COM_ALTERACOES' && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    {comp.novosAlunosCount > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                                        <UserPlus className="w-3.5 h-3.5" />+
                                        {comp.novosAlunosCount} Aluno(s) Novo(s)
                                      </span>
                                    )}
                                    {comp.novasMovimentacoesCount > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-200 text-amber-950 text-xs font-bold">
                                        <UserMinus className="w-3.5 h-3.5" />
                                        {comp.novasMovimentacoesCount} Nova(s) Movimentação(ões)
                                      </span>
                                    )}
                                  </div>
                                )}

                                {comp.statusSala === 'SEM_PLANILHA_DRIVE' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">
                                    Sem planilha correspondente na pasta do Drive
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                                {comp.turmaPiloto?.planilhaNome && (
                                  <span>
                                    Planilha: <strong>{comp.turmaPiloto.planilhaNome}</strong>
                                  </span>
                                )}
                                {comp.turmaPiloto?.professora && (
                                  <span>
                                    • Profª: <strong>{comp.turmaPiloto.professora}</strong>
                                  </span>
                                )}
                                {comp.turmaSed && (
                                  <span>
                                    • SED ({comp.turmaSed.turmaSed}):{' '}
                                    {comp.turmaSed.resumoTopo.ativos} ativos /{' '}
                                    {comp.turmaSed.alunos.length} cadastrados
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() =>
                                setTurmaExpandidaCompleta(
                                  turmaExpandidaCompleta === comp.idComparacao
                                    ? null
                                    : comp.idComparacao
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {turmaExpandidaCompleta === comp.idComparacao
                                ? 'Ocultar Lista Completa'
                                : 'Ver Todos os Alunos'}
                            </button>

                            {comp.turmaPiloto?.planilhaUrl && (
                              <a
                                href={comp.turmaPiloto.planilhaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                Abrir Planilha
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}

                            {comp.turmaPiloto?.planilhaId && selecionadasCount > 0 && (
                              <button
                                onClick={() => salvarAtualizacoesDaSalaNoSheets(comp)}
                                disabled={salvandoTurmaId === comp.idComparacao}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                              >
                                {salvandoTurmaId === comp.idComparacao ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                                Aplicar na Lista Piloto ({selecionadasCount})
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Tabela de Mudanças Detectadas na Turma */}
                        {comp.mudancas.length > 0 && (
                          <div className="p-4 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 bg-slate-50/80">
                                  <th className="py-2.5 px-2 text-center w-10">Aplicar</th>
                                  <th className="py-2.5 px-3">Mudança Detectada</th>
                                  <th className="py-2.5 px-2 text-center w-14">N°</th>
                                  <th className="py-2.5 px-3">Nome do Aluno / Nasc. / RA</th>
                                  <th className="py-2.5 px-2 w-24">RM (Escola)</th>
                                  <th className="py-2.5 px-2 w-28">SIT. (Gravar)</th>
                                  <th className="py-2.5 px-2 w-28">DATA MOV.</th>
                                  <th className="py-2.5 px-2 w-28">IM (Imagem)</th>
                                  <th className="py-2.5 px-3 min-w-[200px]">OBSERVAÇÕES</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 text-xs">
                                {comp.mudancas.map((m) => {
                                  const ehNovo = m.tipo === 'NOVO_ALUNO';
                                  const ehMov =
                                    m.tipo === 'NOVA_MOVIMENTACAO' ||
                                    m.tipo === 'ALTERACAO_SITUACAO';

                                  return (
                                    <tr
                                      key={m.id}
                                      className={
                                        ehNovo
                                          ? 'bg-blue-50/40 hover:bg-blue-50/70'
                                          : ehMov
                                          ? 'bg-amber-50/50 hover:bg-amber-50/80'
                                          : 'hover:bg-slate-50'
                                      }
                                    >
                                      <td className="py-3 px-2 text-center">
                                        <input
                                          type="checkbox"
                                          checked={m.selecionada}
                                          onChange={(e) =>
                                            atualizarCampoMudanca(
                                              comp.idComparacao,
                                              m.id,
                                              'selecionada',
                                              e.target.checked
                                            )
                                          }
                                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                      </td>

                                      <td className="py-3 px-3">
                                        <div className="space-y-1">
                                          {ehNovo ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold text-[11px]">
                                              <UserPlus className="w-3 h-3" />
                                              ALUNO NOVO (CHEGADA)
                                            </span>
                                          ) : ehMov ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 font-bold text-[11px]">
                                              <UserMinus className="w-3 h-3" />
                                              {obterRotuloSituacao(m.situacaoSed)}
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold text-[11px]">
                                              COMPLEMENTO DE RA
                                            </span>
                                          )}

                                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                            <span>
                                              Piloto:{' '}
                                              <strong>
                                                {ehNovo ? 'Não constava' : m.situacaoAtual || 'ATIVO'}
                                              </strong>
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-slate-400" />
                                            <span>
                                              SED:{' '}
                                              <strong className="text-slate-900">
                                                {m.situacaoSed}
                                                {m.dataMovSedCurta
                                                  ? ` (${m.dataMovSedCurta})`
                                                  : ''}
                                              </strong>
                                            </span>
                                          </div>
                                        </div>
                                      </td>

                                      <td className="py-3 px-2 text-center font-extrabold text-sm text-slate-900">
                                        {m.nr}
                                      </td>

                                      <td className="py-3 px-3">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                          <span>{m.nome}</span>
                                          <button
                                            onClick={() => copiarTexto(m.nome, `nome-${m.id}`)}
                                            className="text-slate-400 hover:text-indigo-600 p-0.5"
                                            title="Copiar nome do aluno"
                                          >
                                            <Copy className="w-3.5 h-3.5" />
                                          </button>
                                          {copiadoTexto === `nome-${m.id}` && (
                                            <span className="text-[10px] text-emerald-600 font-bold">
                                              Copiado!
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 mt-0.5">
                                          <span>
                                            Nasc: <strong>{m.dataNascimentoSed}</strong>
                                          </span>
                                          <span className="inline-flex items-center gap-1">
                                            RA: <strong>{m.raFormatadoSed}</strong>
                                            <button
                                              onClick={() =>
                                                copiarTexto(m.raFormatadoSed, `ra-${m.id}`)
                                              }
                                              className="text-slate-400 hover:text-indigo-600"
                                              title="Copiar RA"
                                            >
                                              <Copy className="w-3 h-3" />
                                            </button>
                                            {copiadoTexto === `ra-${m.id}` && (
                                              <span className="text-[10px] text-emerald-600 font-bold">
                                                Copiado!
                                              </span>
                                            )}
                                          </span>
                                          {m.deficienciaSed && (
                                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[10px]">
                                              {m.deficienciaSed}
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      <td className="py-3 px-2">
                                        <input
                                          type="text"
                                          value={m.rmGravar}
                                          onChange={(e) =>
                                            atualizarCampoMudanca(
                                              comp.idComparacao,
                                              m.id,
                                              'rmGravar',
                                              e.target.value
                                            )
                                          }
                                          placeholder="Ex: 6535"
                                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:border-indigo-600 outline-none"
                                        />
                                      </td>

                                      <td className="py-3 px-2">
                                        <input
                                          type="text"
                                          value={m.situacaoGravar}
                                          onChange={(e) =>
                                            atualizarCampoMudanca(
                                              comp.idComparacao,
                                              m.id,
                                              'situacaoGravar',
                                              e.target.value.toUpperCase()
                                            )
                                          }
                                          placeholder="(Vazio = Ativo)"
                                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-center text-slate-900 focus:border-indigo-600 outline-none"
                                        />
                                      </td>

                                      <td className="py-3 px-2">
                                        <input
                                          type="text"
                                          value={m.dataMovGravar}
                                          onChange={(e) =>
                                            atualizarCampoMudanca(
                                              comp.idComparacao,
                                              m.id,
                                              'dataMovGravar',
                                              e.target.value
                                            )
                                          }
                                          placeholder="DD/MM"
                                          className="w-full px-2 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs font-bold text-center text-indigo-950 focus:border-indigo-600 outline-none"
                                        />
                                      </td>

                                      <td className="py-3 px-2">
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text"
                                            value={m.direitoImagemGravar}
                                            onChange={(e) =>
                                              atualizarCampoMudanca(
                                                comp.idComparacao,
                                                m.id,
                                                'direitoImagemGravar',
                                                e.target.value.toUpperCase()
                                              )
                                            }
                                            placeholder="P+UE"
                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-center focus:border-indigo-600 outline-none"
                                          />
                                          {m.direitoImagemGravar !== 'P+UE' && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                atualizarCampoMudanca(
                                                  comp.idComparacao,
                                                  m.id,
                                                  'direitoImagemGravar',
                                                  'P+UE'
                                                )
                                              }
                                              className="px-1.5 py-1 rounded bg-slate-100 hover:bg-indigo-100 text-[10px] font-bold text-indigo-700 shrink-0 cursor-pointer"
                                            >
                                              P+UE
                                            </button>
                                          )}
                                        </div>
                                      </td>

                                      <td className="py-3 px-3">
                                        <input
                                          type="text"
                                          value={m.observacoesGravar}
                                          onChange={(e) =>
                                            atualizarCampoMudanca(
                                              comp.idComparacao,
                                              m.id,
                                              'observacoesGravar',
                                              e.target.value
                                            )
                                          }
                                          placeholder="Ex: MS: 06/11 ou TR: 13/07"
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:border-indigo-600 outline-none"
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Expansão Opcional: Lista Completa da Turma */}
                        {turmaExpandidaCompleta === comp.idComparacao && (
                          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-indigo-600" />
                                Visão Completa da Turma —{' '}
                                {comp.turmaPiloto
                                  ? obterNomeTurmaDaPlanilha(comp.turmaPiloto.planilhaNome)
                                  : comp.nomeExibicao}
                              </h4>
                              <button
                                onClick={() => setTurmaExpandidaCompleta(null)}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                              >
                                Fechar visão completa
                              </button>
                            </div>

                            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 max-h-96">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                                  <tr>
                                    <th className="py-2 px-3 w-16">RM</th>
                                    <th className="py-2 px-2 w-12 text-center">N°</th>
                                    <th className="py-2 px-3">Nome do Aluno</th>
                                    <th className="py-2 px-2 text-center">Sit. Piloto</th>
                                    <th className="py-2 px-2 text-center">Data Mov. Piloto</th>
                                    <th className="py-2 px-2 text-center">Sit. SED</th>
                                    <th className="py-2 px-2 text-center">Data Mov. SED</th>
                                    <th className="py-2 px-3">RA</th>
                                    <th className="py-2 px-3">Observações (Piloto)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(comp.turmaSed?.alunos || []).map((alSed) => {
                                    const alPil = comp.turmaPiloto?.alunos.find(
                                      (p) =>
                                        p.nr === alSed.nr &&
                                        (p.raLimpo === alSed.raLimpo ||
                                          p.nomeNormalizado === alSed.nomeNormalizado)
                                    );
                                    const mudou =
                                      !alPil ||
                                      alPil.situacaoNormalizada !== alSed.situacaoNormalizada;

                                    return (
                                      <tr
                                        key={alSed.nr}
                                        className={
                                          mudou
                                            ? 'bg-amber-50 font-semibold'
                                            : alSed.situacaoNormalizada !== 'ATIVO'
                                            ? 'bg-slate-50/80 text-slate-600'
                                            : ''
                                        }
                                      >
                                        <td className="py-1.5 px-3">{alPil?.rm || '—'}</td>
                                        <td className="py-1.5 px-2 text-center font-bold">
                                          {alSed.nr}
                                        </td>
                                        <td className="py-1.5 px-3">{alSed.nome}</td>
                                        <td className="py-1.5 px-2 text-center">
                                          {alPil ? alPil.situacao || 'ATIVO' : 'NÃO CONSTAVA'}
                                        </td>
                                        <td className="py-1.5 px-2 text-center">
                                          {alPil?.dataMovimentacao || '—'}
                                        </td>
                                        <td className="py-1.5 px-2 text-center font-bold">
                                          {alSed.situacaoNormalizada}
                                        </td>
                                        <td className="py-1.5 px-2 text-center">
                                          {alSed.dataMovimentacaoCurta || '—'}
                                        </td>
                                        <td className="py-1.5 px-3 font-mono text-[11px]">
                                          {alSed.raFormatado}
                                        </td>
                                        <td className="py-1.5 px-3 text-slate-600">
                                          {alPil?.observacoes || alSed.deficiencia || ''}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ====================================================================
          SUB-ABA 2: TURMAS & PLANILHAS DE LISTA PILOTO NO DRIVE
      ==================================================================== */}
      {currentSubTab === 'turmas' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Turmas Carregadas das Planilhas de Lista Piloto ({turmasPiloto.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Os nomes das turmas abaixo são obtidos diretamente do nome de cada planilha na
                  pasta do Google Drive
                </p>
              </div>
              <div className="relative min-w-[280px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={buscaAlunoGlobalPiloto}
                  onChange={(e) => setBuscaAlunoGlobalPiloto(e.target.value)}
                  placeholder="Pesquisar aluno por Nome, RA ou RM em todas as salas..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
                />
              </div>
            </div>

            {resultadosBuscaGlobalPiloto.length > 0 && (
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div className="text-xs font-bold text-indigo-950">
                  Resultados encontrados nas Listas Piloto ({resultadosBuscaGlobalPiloto.length}):
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {resultadosBuscaGlobalPiloto.map(({ turma, aluno }, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setTurmaSelecionadaConsulta(turma.idUnico);
                        setBuscaAlunoGlobalPiloto('');
                      }}
                      className="p-2.5 rounded-lg bg-white border border-indigo-200 hover:border-indigo-500 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{aluno.nome}</div>
                        <div className="text-[11px] text-slate-500">
                          RM: {aluno.rm || '—'} • Nº {aluno.nr} • RA: {aluno.ra || '—'} • Sit:{' '}
                          {aluno.situacao || 'ATIVO'}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[11px]">
                        {obterNomeTurmaDaPlanilha(turma.planilhaNome)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {turmasPiloto.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Nenhuma planilha de Lista Piloto carregada ainda. Conecte a pasta do Google Drive na
                aba de Conferência ou Configurações.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {turmasPiloto.map((t) => {
                  const nomeTurmaPlanilha = obterNomeTurmaDaPlanilha(t.planilhaNome);
                  const selecionada = turmaAtivaDetalhe?.idUnico === t.idUnico;
                  return (
                    <button
                      key={t.idUnico}
                      onClick={() => setTurmaSelecionadaConsulta(t.idUnico)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        selecionada
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 hover:bg-indigo-50/60 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="font-extrabold text-xs truncate" title={t.planilhaNome}>
                        {nomeTurmaPlanilha}
                      </div>
                      <div
                        className={`text-[11px] mt-1 ${
                          selecionada ? 'text-indigo-100' : 'text-slate-500'
                        }`}
                      >
                        {t.totalAtivos} ativos • {t.totalAlunos} total
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {turmaAtivaDetalhe && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {obterNomeTurmaDaPlanilha(turmaAtivaDetalhe.planilhaNome)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Arquivo no Drive: <strong>{turmaAtivaDetalhe.planilhaNome}</strong>
                    {turmaAtivaDetalhe.professora
                      ? ` • Profª: ${turmaAtivaDetalhe.professora}`
                      : ''}{' '}
                    • {turmaAtivaDetalhe.totalAtivos} ativos de {turmaAtivaDetalhe.totalAlunos}{' '}
                    registros
                  </p>
                </div>
                {turmaAtivaDetalhe.planilhaUrl && (
                  <a
                    href={turmaAtivaDetalhe.planilhaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Abrir Planilha no Google Sheets
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-16">RM</th>
                      <th className="py-2.5 px-2 w-12 text-center">N°</th>
                      <th className="py-2.5 px-3">Nome do Aluno</th>
                      <th className="py-2.5 px-2 text-center">SIT.</th>
                      <th className="py-2.5 px-2 text-center">DATA MOV.</th>
                      <th className="py-2.5 px-2 text-center">NASC.</th>
                      <th className="py-2.5 px-3">RA</th>
                      <th className="py-2.5 px-2 text-center">IM</th>
                      <th className="py-2.5 px-3">OBSERVAÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {turmaAtivaDetalhe.alunos.map((al) => (
                      <tr
                        key={`${al.linhaPlanilha}-${al.nr}`}
                        className={
                          al.situacaoNormalizada !== 'ATIVO' ? 'bg-amber-50/70 text-slate-700' : ''
                        }
                      >
                        <td className="py-2 px-3 font-medium">{al.rm || '—'}</td>
                        <td className="py-2 px-2 text-center font-bold">{al.nr}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{al.nome}</td>
                        <td className="py-2 px-2 text-center font-bold text-amber-900">
                          {al.situacao || ''}
                        </td>
                        <td className="py-2 px-2 text-center">{al.dataMovimentacao || ''}</td>
                        <td className="py-2 px-2 text-center">{al.dataNascimento || ''}</td>
                        <td className="py-2 px-3 font-mono">{al.ra || ''}</td>
                        <td className="py-2 px-2 text-center">{al.direitoImagem || ''}</td>
                        <td className="py-2 px-3 text-slate-600">{al.observacoes || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          SUB-ABA 3: PASTA DO DRIVE & CONFIGURAÇÕES DA LISTA PILOTO
      ==================================================================== */}
      {currentSubTab === 'config' && (
        <div className="max-w-3xl bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
              <Sparkles className="w-3.5 h-3.5" />
              Configuração Exclusiva do Módulo Lista Piloto
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Pasta das Listas Piloto no Google Drive
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Informe o link ou ID da pasta do Google Drive onde estão salvas as planilhas Google
              Sheets das Listas Piloto (uma planilha por turma).
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Link ou ID da Pasta das Listas Piloto:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pastaInput}
                onChange={(e) => setPastaInput(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
              />
              <button
                onClick={() => carregarListasPilotoDoDrive(true)}
                disabled={carregandoPiloto}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {carregandoPiloto ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar e Carregar Pasta
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Data Padrão de Chegada (Matrícula Suplementar - MS):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={dataChegadaPadrao}
                onChange={(e) => aplicarDataChegadaATodosNovos(e.target.value)}
                placeholder="DD/MM"
                className="w-28 px-3 py-2 text-xs font-bold text-center rounded-xl border border-slate-300"
              />
              <span className="text-xs text-slate-500">
                Preenchida automaticamente na coluna <code>DATA MOV.</code> e{' '}
                <code>OBSERVAÇÕES (MS: DD/MM)</code> quando um aluno novo ativo é detectado.
              </span>
            </div>
          </div>
        </div>
      )}

      {avisosPiloto.length > 0 && (
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
          {avisosPiloto.map((av, idx) => (
            <div key={idx}>• {av}</div>
          ))}
        </div>
      )}
    </div>
  );
};
