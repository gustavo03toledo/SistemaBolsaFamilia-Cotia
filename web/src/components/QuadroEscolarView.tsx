import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FolderOpen,
  Grid,
  Loader2,
  Printer,
  RefreshCw,
  Save
} from 'lucide-react';
import { gasApi } from '../services/gasApi';
import { normalizarNomeAluno, obterNomeTurmaDaPlanilha, removerAcentos } from '../services/sedExtractor';
import { ItemCapacidadeQuadroEscolar, TurmaListaPilotoDrive } from '../types/sbf';

const MESES_MAIUSCULO = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO'
];

interface InfoTurmaQE {
  idUnico: string;
  planilhaNome: string;
  nomeColuna: string;
  turno: 'MANHA' | 'TARDE';
  turnoAutoDetectado: boolean;
  etapaNome: string;
  etapaOrdem: number;
  letraOrdem: string;
  ehAee: boolean;
  totalAtivos: number;
  totalAlunos: number;
  capacidade: number;
  capacidadePadrao: number;
  turmaOriginal: TurmaListaPilotoDrive;
}

interface ResumoEtapaQE {
  etapaNome: string;
  etapaOrdem: number;
  capDaSala: number;
  capacidadesDistintas: number[];
  quantSalas: number;
  totalAlunos: number;
  capacidadeTotal: number;
  vagas: number;
  periodo: 'MANHÃ' | 'TARDE' | 'MANHÃ/TARDE';
}

interface QuadroEscolarViewProps {
  turmasPiloto: TurmaListaPilotoDrive[];
  escolaNome?: string;
  anoReferencia?: number;
  carregandoPiloto?: boolean;
  onSincronizarDrive?: () => void;
  onSelecionarTurmaParaConsultar?: (turmaIdUnico: string) => void;
}

function escaparHtml(texto: string): string {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extrairNomeColunaDaPlanilha(planilhaNome: string, turmaExibicao: string): string {
  const base = obterNomeTurmaDaPlanilha(planilhaNome || turmaExibicao || '');
  const limpo = base
    .replace(/\s*[-–(]?\s*\b(MANHÃ|MANHA|MATUTINO|TARDE|VESPERTINO)\b\)?\s*/gi, ' ')
    .replace(/\s*[-–]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return limpo || base || turmaExibicao || 'TURMA';
}

function detectarTurnoTurma(t: TurmaListaPilotoDrive): {
  turno: 'MANHA' | 'TARDE';
  autoDetectado: boolean;
} {
  const nomeSemAcento = removerAcentos(`${t.planilhaNome || ''} ${t.turmaExibicao || ''}`).toUpperCase();
  if (/\b(TARDE|VESPERTINO)\b/.test(nomeSemAcento)) {
    return { turno: 'TARDE', autoDetectado: true };
  }
  if (/\b(MANHA|MATUTINO)\b/.test(nomeSemAcento)) {
    return { turno: 'MANHA', autoDetectado: true };
  }

  const horariosNorm = removerAcentos(String(t.horarios || '')).toUpperCase();
  if (/\b(TARDE|VESPERTINO|12:|13:|14:|15:|16:|17:)\b/.test(horariosNorm)) {
    return { turno: 'TARDE', autoDetectado: true };
  }
  if (/\b(MANHA|MATUTINO|07:|08:|09:|10:|11:)\b/.test(horariosNorm)) {
    return { turno: 'MANHA', autoDetectado: true };
  }

  return { turno: 'MANHA', autoDetectado: false };
}

function analisarEtapaEOrdem(nomeColuna: string): {
  etapaNome: string;
  etapaOrdem: number;
  letraOrdem: string;
  ehAee: boolean;
  capacidadePadrao: number;
} {
  const norm = removerAcentos(nomeColuna)
    .toUpperCase()
    .replace(/[º°ª]/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Letra final de turma (A, B, C...) para desempate na ordenação
  const mLetraFim = norm.match(/\b([A-H])$/);
  const letraOrdem = mLetraFim ? mLetraFim[1] : 'Z';

  if (/\bAEE\b/.test(norm)) {
    return {
      etapaNome: 'AEE',
      etapaOrdem: 900,
      letraOrdem,
      ehAee: true,
      capacidadePadrao: 24
    };
  }

  if (/\bBERCARIO\b/.test(norm)) {
    return {
      etapaNome: 'BERÇÁRIO',
      etapaOrdem: 10,
      letraOrdem,
      ehAee: false,
      capacidadePadrao: 16
    };
  }

  if (/\bMATERNAL\b/.test(norm)) {
    const ehII = /\b(II|2)\b/.test(norm);
    return {
      etapaNome: ehII ? 'MATERNAL II' : 'MATERNAL I',
      etapaOrdem: ehII ? 22 : 20,
      letraOrdem,
      ehAee: false,
      capacidadePadrao: 20
    };
  }

  if (/\b(JARDIM|JD|PRE|ETAPA|FASE|INFANTIL)\b/.test(norm)) {
    const prefixo = /\bPRE\b/.test(norm)
      ? 'PRÉ'
      : /\bETAPA\b/.test(norm)
      ? 'ETAPA'
      : 'JARDIM';

    if (/\b(III|3|TERCEIRA)\b/.test(norm)) {
      return {
        etapaNome: `${prefixo} III`,
        etapaOrdem: 50,
        letraOrdem,
        ehAee: false,
        capacidadePadrao: 24
      };
    }
    if (/\b(II|2|SEGUNDA)\b/.test(norm)) {
      return {
        etapaNome: `${prefixo} II`,
        etapaOrdem: 40,
        letraOrdem,
        ehAee: false,
        capacidadePadrao: 24
      };
    }
    if (/\b(I|1|PRIMEIRA)\b/.test(norm)) {
      return {
        etapaNome: `${prefixo} I`,
        etapaOrdem: 30,
        letraOrdem,
        ehAee: false,
        capacidadePadrao: 24
      };
    }
    return {
      etapaNome: 'EDUCAÇÃO INFANTIL',
      etapaOrdem: 55,
      letraOrdem,
      ehAee: false,
      capacidadePadrao: 24
    };
  }

  const mAnoComLetra = norm.match(/\b([1-9])\s*(?:ANO|SERIE)?\s+([A-H])\b/);
  if (mAnoComLetra) {
    const num = Number(mAnoComLetra[1]);
    return {
      etapaNome: `${num}º ANO`,
      etapaOrdem: 100 + num * 10,
      letraOrdem: mAnoComLetra[2],
      ehAee: false,
      capacidadePadrao: num >= 4 ? 35 : 30
    };
  }

  const mAno = norm.match(/\b([1-9])\s*(?:ANO|SERIE)?(?:\s+([A-H]))?\b/);
  if (mAno) {
    const num = Number(mAno[1]);
    return {
      etapaNome: `${num}º ANO`,
      etapaOrdem: 100 + num * 10,
      letraOrdem: mAno[2] || letraOrdem,
      ehAee: false,
      capacidadePadrao: num >= 4 ? 35 : 30
    };
  }

  return {
    etapaNome: nomeColuna.toUpperCase(),
    etapaOrdem: 500,
    letraOrdem,
    ehAee: false,
    capacidadePadrao: 30
  };
}

function ordenarTurmasQE(a: InfoTurmaQE, b: InfoTurmaQE): number {
  if (a.etapaOrdem !== b.etapaOrdem) {
    return a.etapaOrdem - b.etapaOrdem;
  }
  if (a.letraOrdem !== b.letraOrdem) {
    return a.letraOrdem.localeCompare(b.letraOrdem, 'pt-BR');
  }
  return a.nomeColuna.localeCompare(b.nomeColuna, 'pt-BR', { numeric: true });
}

export const QuadroEscolarView: React.FC<QuadroEscolarViewProps> = ({
  turmasPiloto,
  escolaNome = 'EM JARDIM PANORAMA',
  anoReferencia = new Date().getFullYear(),
  carregandoPiloto = false,
  onSincronizarDrive,
  onSelecionarTurmaParaConsultar
}) => {
  const mesAtualPadrao = MESES_MAIUSCULO[new Date().getMonth()] || 'NOVEMBRO';
  const nomeEscolaLimpo =
    escolaNome && escolaNome !== 'Escola Ativa' ? escolaNome.toUpperCase() : 'UNIDADE ESCOLAR';

  const storageKeyLocal = `SBF_QE_CAPACIDADES_${normalizarNomeAluno(nomeEscolaLimpo)}_${anoReferencia}`;

  const [mesReferenciaTitulo, setMesReferenciaTitulo] = useState<string>(mesAtualPadrao);
  const [capacidadesEditadas, setCapacidadesEditadas] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(storageKeyLocal);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [capacidadesPorNomeFallback, setCapacidadesPorNomeFallback] = useState<
    Record<string, number>
  >({});
  const [turnosManualFallback, setTurnosManualFallback] = useState<Record<string, 'MANHA' | 'TARDE'>>(
    {}
  );
  const [carregandoBanco, setCarregandoBanco] = useState<boolean>(false);
  const [salvandoBanco, setSalvandoBanco] = useState<boolean>(false);
  const [alteracoesPendentes, setAlteracoesPendentes] = useState<boolean>(false);
  const [statusBancoMsg, setStatusBancoMsg] = useState<string>('');
  const [erroBancoMsg, setErroBancoMsg] = useState<string>('');
  const [bancoUrl, setBancoUrl] = useState<string>('');

  // Carrega capacidades salvas diretamente no Banco de Dados (aba "Quadro Escolar")
  useEffect(() => {
    let ativo = true;
    try {
      const localSaved = localStorage.getItem(storageKeyLocal);
      setCapacidadesEditadas(localSaved ? JSON.parse(localSaved) : {});
    } catch {
      setCapacidadesEditadas({});
    }
    setTurnosManualFallback({});
    setAlteracoesPendentes(false);

    async function carregarCapacidadesDoBanco() {
      setCarregandoBanco(true);
      setErroBancoMsg('');
      try {
        const resp = await gasApi.obterQuadroEscolar();
        if (!ativo) return;
        if (resp?.bancoDadosUrl) {
          setBancoUrl(resp.bancoDadosUrl);
        }
        const itensDb = resp?.itens || [];
        if (itensDb.length > 0) {
          const novoMapaCaps: Record<string, number> = {};
          const novoMapaNomes: Record<string, number> = {};
          const novoMapaTurnos: Record<string, 'MANHA' | 'TARDE'> = {};
          for (const it of itensDb) {
            if (!it.chaveTurma) continue;
            if (typeof it.capacidade === 'number' && !isNaN(it.capacidade)) {
              novoMapaCaps[it.chaveTurma] = it.capacidade;
              if (it.nomePlanilha) {
                novoMapaNomes[normalizarNomeAluno(it.nomePlanilha)] = it.capacidade;
              }
            }
            if (it.turno === 'MANHA' || it.turno === 'TARDE') {
              novoMapaTurnos[it.chaveTurma] = it.turno;
            }
          }
          setCapacidadesEditadas((prev) => ({ ...prev, ...novoMapaCaps }));
          setCapacidadesPorNomeFallback((prev) => ({ ...prev, ...novoMapaNomes }));
          setTurnosManualFallback((prev) => ({ ...novoMapaTurnos, ...prev }));
          setAlteracoesPendentes(false);
          try {
            localStorage.setItem(storageKeyLocal, JSON.stringify(novoMapaCaps));
          } catch {}
        }
      } catch (err: any) {
        if (!ativo) return;
        // Fallback silencioso se API antiga ainda não tiver a action ou banco ainda não criado
        const msg = String(err?.message || '');
        if (msg && !/Action de API desconhecida/i.test(msg)) {
          setErroBancoMsg(msg);
        }
      } finally {
        if (ativo) setCarregandoBanco(false);
      }
    }

    carregarCapacidadesDoBanco();
    return () => {
      ativo = false;
    };
  }, [storageKeyLocal, escolaNome, anoReferencia]);

  // Analisa todas as turmas carregadas das Listas Piloto
  const turmasAnalisadas: InfoTurmaQE[] = useMemo(() => {
    return (turmasPiloto || []).map((t) => {
      const detTurno = detectarTurnoTurma(t);
      const turnoFinal: 'MANHA' | 'TARDE' = detTurno.autoDetectado
        ? detTurno.turno
        : turnosManualFallback[t.idUnico] || detTurno.turno;

      const nomeColuna = extrairNomeColunaDaPlanilha(t.planilhaNome, t.turmaExibicao);
      const etapaInfo = analisarEtapaEOrdem(nomeColuna);

      // Procura capacidade por idUnico ou fallback pelo nome normalizado da planilha
      const capSalvaDirect = capacidadesEditadas[t.idUnico];
      const capSalvaNome = capacidadesPorNomeFallback[normalizarNomeAluno(t.planilhaNome)];
      const capacidadeFinal =
        typeof capSalvaDirect === 'number' && !isNaN(capSalvaDirect)
          ? capSalvaDirect
          : typeof capSalvaNome === 'number' && !isNaN(capSalvaNome)
          ? capSalvaNome
          : etapaInfo.capacidadePadrao;

      return {
        idUnico: t.idUnico,
        planilhaNome: t.planilhaNome,
        nomeColuna,
        turno: turnoFinal,
        turnoAutoDetectado: detTurno.autoDetectado,
        etapaNome: etapaInfo.etapaNome,
        etapaOrdem: etapaInfo.etapaOrdem,
        letraOrdem: etapaInfo.letraOrdem,
        ehAee: etapaInfo.ehAee,
        totalAtivos: Number(t.totalAtivos || 0),
        totalAlunos: Number(t.totalAlunos || 0),
        capacidade: capacidadeFinal,
        capacidadePadrao: etapaInfo.capacidadePadrao,
        turmaOriginal: t
      };
    });
  }, [turmasPiloto, capacidadesEditadas, capacidadesPorNomeFallback, turnosManualFallback]);

  const turmasManha = useMemo(
    () => turmasAnalisadas.filter((t) => t.turno === 'MANHA').sort(ordenarTurmasQE),
    [turmasAnalisadas]
  );

  const turmasTarde = useMemo(
    () => turmasAnalisadas.filter((t) => t.turno === 'TARDE').sort(ordenarTurmasQE),
    [turmasAnalisadas]
  );

  // Agrupamento dinâmico por ETAPAS (excluindo AEE da tabela Etapas -> igual ao PDF do QE)
  const resumoEtapas: ResumoEtapaQE[] = useMemo(() => {
    const mapa = new Map<string, InfoTurmaQE[]>();
    for (const t of turmasAnalisadas) {
      if (t.ehAee) continue;
      if (!mapa.has(t.etapaNome)) {
        mapa.set(t.etapaNome, []);
      }
      mapa.get(t.etapaNome)!.push(t);
    }

    const lista: ResumoEtapaQE[] = [];
    for (const [etapaNome, salas] of mapa.entries()) {
      const etapaOrdem = Math.min(...salas.map((s) => s.etapaOrdem));
      const quantSalas = salas.length;
      const totalAlunos = salas.reduce((acc, s) => acc + s.totalAtivos, 0);
      const capacidadeTotal = salas.reduce((acc, s) => acc + s.capacidade, 0);
      const vagas = capacidadeTotal - totalAlunos;
      const capacidadesDistintas = Array.from(new Set(salas.map((s) => s.capacidade)));
      const capDaSala =
        capacidadesDistintas.length === 1
          ? capacidadesDistintas[0]
          : Math.round(capacidadeTotal / Math.max(1, quantSalas));

      const temManha = salas.some((s) => s.turno === 'MANHA');
      const temTarde = salas.some((s) => s.turno === 'TARDE');
      const periodo: 'MANHÃ' | 'TARDE' | 'MANHÃ/TARDE' =
        temManha && temTarde ? 'MANHÃ/TARDE' : temTarde ? 'TARDE' : 'MANHÃ';

      lista.push({
        etapaNome,
        etapaOrdem,
        capDaSala,
        capacidadesDistintas,
        quantSalas,
        totalAlunos,
        capacidadeTotal,
        vagas,
        periodo
      });
    }

    return lista.sort((a, b) => a.etapaOrdem - b.etapaOrdem || a.etapaNome.localeCompare(b.etapaNome, 'pt-BR'));
  }, [turmasAnalisadas]);

  // Totais do Resumo Geral de Matrículas (igual ao PDF do QE)
  const totaisResumo = useMemo(() => {
    const totalManha = turmasManha.reduce((acc, t) => acc + t.totalAtivos, 0);
    const totalTarde = turmasTarde.reduce((acc, t) => acc + t.totalAtivos, 0);
    const totalSemAee = turmasAnalisadas
      .filter((t) => !t.ehAee)
      .reduce((acc, t) => acc + t.totalAtivos, 0);
    const totalGeral = totalManha + totalTarde;
    const capacidadeTotalRegulares = resumoEtapas.reduce((acc, e) => acc + e.capacidadeTotal, 0);
    const vagasTotaisRegulares = resumoEtapas.reduce((acc, e) => acc + e.vagas, 0);
    return {
      totalManha,
      totalTarde,
      totalSemAee,
      totalGeral,
      capacidadeTotalRegulares,
      vagasTotaisRegulares
    };
  }, [turmasManha, turmasTarde, turmasAnalisadas, resumoEtapas]);

  const turmasSemTurnoExplicito = useMemo(
    () => turmasAnalisadas.filter((t) => !t.turnoAutoDetectado),
    [turmasAnalisadas]
  );

  function atualizarCapacidadeSala(idUnico: string, novoValorStr: string) {
    const parsed = parseInt(novoValorStr.replace(/\D+/g, ''), 10);
    const val = isNaN(parsed) ? 0 : Math.min(999, Math.max(0, parsed));
    setCapacidadesEditadas((prev) => {
      const next = { ...prev, [idUnico]: val };
      try {
        localStorage.setItem(storageKeyLocal, JSON.stringify(next));
      } catch {}
      return next;
    });
    setAlteracoesPendentes(true);
    setStatusBancoMsg('');
  }

  function alternarTurnoSalaManual(idUnico: string, turnoAtual: 'MANHA' | 'TARDE') {
    const novoTurno: 'MANHA' | 'TARDE' = turnoAtual === 'MANHA' ? 'TARDE' : 'MANHA';
    setTurnosManualFallback((prev) => ({ ...prev, [idUnico]: novoTurno }));
    setAlteracoesPendentes(true);
    setStatusBancoMsg('');
  }

  async function salvarCapacidadesNoBanco() {
    if (!turmasAnalisadas.length) return;
    setSalvandoBanco(true);
    setErroBancoMsg('');
    setStatusBancoMsg('');
    try {
      const itens: ItemCapacidadeQuadroEscolar[] = turmasAnalisadas.map((t) => ({
        chaveTurma: t.idUnico,
        nomePlanilha: t.planilhaNome,
        turmaExibicao: t.nomeColuna,
        etapa: t.etapaNome,
        turno: t.turno,
        capacidade: t.capacidade
      }));

      const resp = await gasApi.salvarQuadroEscolar({ itens });
      if (resp?.bancoDadosUrl) {
        setBancoUrl(resp.bancoDadosUrl);
      }
      setAlteracoesPendentes(false);
      setStatusBancoMsg(
        resp?.mensagem ||
          `Capacidades de ${itens.length} sala(s) salvas com sucesso no Banco de Dados!`
      );
      try {
        const cacheFinal: Record<string, number> = {};
        for (const it of itens) cacheFinal[it.chaveTurma] = it.capacidade;
        localStorage.setItem(storageKeyLocal, JSON.stringify(cacheFinal));
      } catch {}
    } catch (err: any) {
      setErroBancoMsg(err?.message || 'Não foi possível salvar as capacidades no Banco de Dados.');
    } finally {
      setSalvandoBanco(false);
    }
  }

  function imprimirQuadroEscolar() {
    if (!turmasAnalisadas.length) {
      alert('Nenhuma Lista Piloto carregada para imprimir o Quadro Escolar.');
      return;
    }

    const maxCols = Math.max(turmasManha.length, turmasTarde.length, 1);
    const tituloDocumento = `${nomeEscolaLimpo} - ${anoReferencia} ${mesReferenciaTitulo.trim() || mesAtualPadrao}`;

    const montarLinhaTurnoHtml = (rotuloTurno: string, lista: InfoTurmaQE[]) => {
      const celulasHeader = [];
      const celulasAtivos = [];
      const celulasCapacidade = [];

      for (let i = 0; i < maxCols; i++) {
        const sala = lista[i];
        if (sala) {
          celulasHeader.push(`<th>${escaparHtml(sala.nomeColuna)}</th>`);
          celulasAtivos.push(`<td class="val-alunos">${sala.totalAtivos}</td>`);
          celulasCapacidade.push(`<td class="val-cap">${sala.capacidade}</td>`);
        } else {
          celulasHeader.push(`<th class="vazio"></th>`);
          celulasAtivos.push(`<td class="vazio"></td>`);
          celulasCapacidade.push(`<td class="vazio"></td>`);
        }
      }

      return `
        <tr class="row-turno-header">
          <th class="col-rotulo-turno">${escaparHtml(rotuloTurno)}</th>
          ${celulasHeader.join('')}
        </tr>
        <tr class="row-alunos">
          <td class="col-rotulo-esq">TOTAL DE ALUNOS</td>
          ${celulasAtivos.join('')}
        </tr>
        <tr class="row-capacidade">
          <td class="col-rotulo-cap">capacidade</td>
          ${celulasCapacidade.join('')}
        </tr>`;
    };

    const linhasEtapasHtml = resumoEtapas
      .map(
        (et) => `
          <tr>
            <td class="etapa-nome">${escaparHtml(et.etapaNome)}</td>
            <td class="num-muted">${et.capDaSala}</td>
            <td class="num-bold">${et.quantSalas}</td>
            <td class="num-strong">${et.totalAlunos}</td>
            <td class="num-muted">${et.capacidadeTotal}</td>
            <td class="num-vagas ${et.vagas < 0 ? 'neg' : ''}">${et.vagas}</td>
            <td class="periodo">${escaparHtml(et.periodo)}</td>
          </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>QE - ${escaparHtml(tituloDocumento)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
    .banner-topo {
      background: #1b365d;
      color: #ffffff;
      text-align: center;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.4px;
      padding: 8px 12px;
      margin-bottom: 4px;
    }
    table { width: 100%; border-collapse: collapse; }
    .grid-turnos th, .grid-turnos td {
      border: 1px solid #cbd5e1;
      text-align: center;
      padding: 5px 6px;
    }
    .col-rotulo-turno {
      background: #1b365d;
      color: #ffffff;
      font-weight: 800;
      width: 135px;
      font-size: 11px;
    }
    .row-turno-header th:not(.col-rotulo-turno) {
      background: #dbe3ee;
      color: #0f172a;
      font-weight: 800;
      font-size: 12px;
    }
    .col-rotulo-esq {
      text-align: left !important;
      font-weight: 700;
      color: #1e293b;
      background: #ffffff;
      font-size: 10px;
    }
    .col-rotulo-cap {
      text-align: left !important;
      color: #475569;
      background: #f1f5f9;
      font-size: 10px;
    }
    .val-alunos {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      background: #ffffff;
    }
    .val-cap {
      font-size: 11px;
      color: #475569;
      background: #f1f5f9;
    }
    .vazio { background: #f8fafc !important; }
    .painel-inferior {
      display: flex;
      gap: 24px;
      margin-top: 18px;
      align-items: flex-start;
    }
    .bloco-etapas { flex: 1.7; }
    .bloco-resumo { flex: 1; margin-top: 22px; }
    .etapas-tbl th, .etapas-tbl td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: center;
    }
    .etapa-ano-row th.ano-box {
      background: #dbe3ee;
      color: #0f172a;
      font-weight: 800;
      font-size: 12px;
      border: 1px solid #1b365d;
    }
    .etapa-ano-row th.spacer-clean {
      border: none;
      background: transparent;
    }
    .etapas-head th {
      background: #1b365d;
      color: #ffffff;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
    }
    .etapa-nome {
      text-align: left !important;
      font-weight: 800;
      color: #0f172a;
    }
    .num-muted { color: #475569; }
    .num-bold { font-weight: 700; color: #0f172a; }
    .num-strong { font-weight: 800; font-size: 12px; color: #0f172a; }
    .num-vagas { font-weight: 800; color: #047857; }
    .num-vagas.neg { color: #be123c; }
    .periodo { font-size: 10px; color: #475569; }
    .resumo-tbl th, .resumo-tbl td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
    }
    .resumo-head th {
      background: #1b365d;
      color: #ffffff;
      font-weight: 700;
      text-align: center;
      font-size: 11px;
    }
    .resumo-lbl { font-weight: 700; color: #0f172a; text-align: left; }
    .resumo-val { font-weight: 800; font-size: 13px; text-align: right; color: #0f172a; width: 70px; }
    .row-spacer td { border-left: none; border-right: none; height: 14px; background: #ffffff; }
    .resumo-sem-aee td { background: #f1f5f9; color: #334155; font-weight: 700; }
    .resumo-total-final td {
      background: #1b365d;
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
    }
    .rodape {
      margin-top: 14px;
      font-size: 9px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="banner-topo">${escaparHtml(tituloDocumento)}</div>
  <table class="grid-turnos">
    <tbody>
      ${montarLinhaTurnoHtml('MANHÃ', turmasManha)}
      ${montarLinhaTurnoHtml('TARDE', turmasTarde)}
    </tbody>
  </table>

  <div class="painel-inferior">
    <div class="bloco-etapas">
      <table class="etapas-tbl">
        <thead>
          <tr class="etapa-ano-row">
            <th class="spacer-clean" colspan="3"></th>
            <th class="ano-box" colspan="3">${anoReferencia}</th>
            <th class="spacer-clean"></th>
          </tr>
          <tr class="etapas-head">
            <th style="text-align:left;">ETAPAS</th>
            <th>CAP. DA SALA</th>
            <th>QUANT SALAS</th>
            <th>TOTAL DE ALUNOS</th>
            <th>CAPACIDADE</th>
            <th>VAGAS</th>
            <th>PERÍODO</th>
          </tr>
        </thead>
        <tbody>
          ${linhasEtapasHtml}
        </tbody>
      </table>
    </div>

    <div class="bloco-resumo">
      <table class="resumo-tbl">
        <thead>
          <tr class="resumo-head">
            <th colspan="2">RESUMO GERAL DE MATRÍCULAS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="resumo-lbl">TOTAL DE ALUNOS MANHÃ</td>
            <td class="resumo-val">${totaisResumo.totalManha}</td>
          </tr>
          <tr>
            <td class="resumo-lbl">TOTAL DE ALUNOS TARDE</td>
            <td class="resumo-val">${totaisResumo.totalTarde}</td>
          </tr>
          <tr class="row-spacer"><td colspan="2"></td></tr>
          <tr class="resumo-sem-aee">
            <td class="resumo-lbl">TOTAL SEM AEE</td>
            <td class="resumo-val">${totaisResumo.totalSemAee}</td>
          </tr>
          <tr class="resumo-total-final">
            <td class="resumo-lbl" style="color:#fff;">TOTAL</td>
            <td class="resumo-val" style="color:#fff;">${totaisResumo.totalGeral}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="rodape">
    <span>Quadro Escolar (QE) &bull; Calculado automaticamente a partir das Listas Piloto ativas</span>
    <span>Emitido em: ${escaparHtml(new Date().toLocaleString('pt-BR'))}</span>
  </div>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc && iframe.contentWindow) {
      doc.open();
      doc.write(html);
      doc.close();
      const remover = () => {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 500);
      };
      iframe.contentWindow.addEventListener('afterprint', remover, { once: true });
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(remover, 60000);
      }, 150);
    } else {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      const win = window.open('', '_blank', 'width=1100,height=750');
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      } else {
        alert('Não foi possível abrir a janela de impressão neste navegador.');
      }
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* 1. MESMO QUADRO DE TURMAS CARREGADAS DAS PLANILHAS DE LISTA PILOTO */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Grid className="w-4 h-4 text-indigo-600" />
              Turmas Carregadas das Planilhas de Lista Piloto ({turmasPiloto.length})
            </h2>
            <p className="text-xs text-slate-500">
              Os nomes das turmas, os turnos (Manhã/Tarde) e a contagem de alunos ativos do Quadro
              Escolar seguem automaticamente as planilhas na pasta do Google Drive.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onSincronizarDrive && (
              <button
                type="button"
                onClick={onSincronizarDrive}
                disabled={carregandoPiloto}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${carregandoPiloto ? 'animate-spin' : ''}`} />
                Atualizar Ativos do Drive
              </button>
            )}
          </div>
        </div>

        {turmasPiloto.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            Nenhuma planilha de Lista Piloto carregada ainda. Conecte a pasta do Google Drive na
            aba de Conferência ou Configurações.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {turmasPiloto.map((t) => {
              const nomeTurmaPlanilha = obterNomeTurmaDaPlanilha(t.planilhaNome);
              return (
                <button
                  key={t.idUnico}
                  type="button"
                  onClick={() => onSelecionarTurmaParaConsultar?.(t.idUnico)}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/70 hover:border-indigo-300 text-slate-800 text-left transition cursor-pointer group"
                  title={`Abrir ${nomeTurmaPlanilha} em Turmas & Planilhas`}
                >
                  <div className="font-extrabold text-xs truncate flex items-center justify-between gap-1">
                    <span className="truncate">{nomeTurmaPlanilha}</span>
                    {onSelecionarTurmaParaConsultar && (
                      <Eye className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] mt-1 text-slate-600">
                    <strong>{t.totalAtivos}</strong> ativos • {t.totalAlunos} total
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. QE - QUADRO ESCOLAR OFICIAL */}
      {turmasAnalisadas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-xs">
          {/* Controles de referência, salvamento no banco e status */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1b365d]/10 text-[#1b365d]">
                <FolderOpen className="w-3.5 h-3.5" />
                QE — Quadro Escolar Dinâmico
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                Quadro Geral por Turno, Capacidades Editáveis e Resumo por Etapa
              </h3>
              <p className="text-xs text-slate-500">
                Edite o valor da linha <strong>capacidade</strong> de cada turma e clique em salvar
                para gravar no Banco de Dados (Google Sheets).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Mês Título:</span>
                <input
                  type="text"
                  value={mesReferenciaTitulo}
                  onChange={(e) => setMesReferenciaTitulo(e.target.value.toUpperCase())}
                  className="w-28 text-xs font-extrabold text-slate-900 bg-transparent focus:outline-none uppercase"
                  placeholder="NOVEMBRO"
                />
              </div>

              <button
                type="button"
                onClick={salvarCapacidadesNoBanco}
                disabled={salvandoBanco || carregandoBanco}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 ${
                  alteracoesPendentes
                    ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {salvandoBanco ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {alteracoesPendentes
                  ? 'Salvar Capacidades Alteradas no Banco'
                  : 'Salvar Capacidades no Banco'}
              </button>
            </div>
          </div>

          {/* Avisos de salvamento / turno não identificado no nome do arquivo */}
          {statusBancoMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{statusBancoMsg}</span>
              </div>
              {bancoUrl && (
                <a
                  href={bancoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-800 underline font-bold shrink-0"
                >
                  Abrir aba no Banco
                </a>
              )}
            </div>
          )}

          {erroBancoMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erroBancoMsg}</span>
            </div>
          )}

          {turmasSemTurnoExplicito.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Algumas planilhas não tinham "MANHÃ" ou "TARDE" no nome nem no horário:
              </div>
              <div className="flex flex-wrap gap-2">
                {turmasSemTurnoExplicito.map((t) => (
                  <button
                    key={t.idUnico}
                    type="button"
                    onClick={() => alternarTurnoSalaManual(t.idUnico, t.turno)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-amber-950 hover:bg-amber-100 cursor-pointer"
                    title="Clique para alternar entre MANHÃ e TARDE"
                  >
                    <span>{t.nomeColuna}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-200 text-[10px]">
                      {t.turno === 'MANHA' ? 'MANHÃ ⇄' : 'TARDE ⇄'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TABELA VISUAL FIEL AO MODELO DO QE (MANHÃ EM CIMA, TARDE EMBAIXO) */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl">
            <div className="bg-[#1b365d] text-white text-center font-extrabold text-sm sm:text-base py-2.5 px-4 tracking-wide">
              {nomeEscolaLimpo} &nbsp;-&nbsp; {anoReferencia}{' '}
              {mesReferenciaTitulo.trim() || mesAtualPadrao}
            </div>

            <table className="w-full border-collapse text-center text-xs">
              <tbody>
                {/* LINHA DE CIMA: MANHÃ */}
                {(() => {
                  const maxCols = Math.max(turmasManha.length, turmasTarde.length, 1);
                  const indices = Array.from({ length: maxCols }, (_, i) => i);
                  return (
                    <>
                      <tr className="border-t border-slate-300">
                        <th className="bg-[#1b365d] text-white font-extrabold py-2 px-3 w-36 text-xs border-r border-slate-300">
                          MANHÃ
                        </th>
                        {indices.map((idx) => {
                          const sala = turmasManha[idx];
                          return (
                            <th
                              key={`m-h-${idx}`}
                              className={`py-2 px-2.5 font-extrabold text-xs border-r last:border-r-0 border-slate-300 min-w-[74px] ${
                                sala ? 'bg-[#dbe3ee] text-slate-900' : 'bg-slate-50'
                              }`}
                              title={sala?.planilhaNome || ''}
                            >
                              {sala ? sala.nomeColuna : ''}
                            </th>
                          );
                        })}
                      </tr>
                      <tr className="border-t border-slate-300 bg-white">
                        <td className="py-2 px-3 text-left font-bold text-[11px] text-slate-800 border-r border-slate-300">
                          TOTAL DE ALUNOS
                        </td>
                        {indices.map((idx) => {
                          const sala = turmasManha[idx];
                          return (
                            <td
                              key={`m-a-${idx}`}
                              className={`py-2 px-2 font-extrabold text-sm border-r last:border-r-0 border-slate-300 ${
                                sala ? 'text-slate-900' : 'bg-slate-50'
                              }`}
                            >
                              {sala ? sala.totalAtivos : ''}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-t border-slate-300 bg-slate-100/80">
                        <td className="py-1.5 px-3 text-left text-[11px] text-slate-600 border-r border-slate-300">
                          capacidade
                        </td>
                        {indices.map((idx) => {
                          const sala = turmasManha[idx];
                          return (
                            <td
                              key={`m-c-${idx}`}
                              className={`py-1 px-1.5 border-r last:border-r-0 border-slate-300 ${
                                sala ? '' : 'bg-slate-50'
                              }`}
                            >
                              {sala ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={999}
                                  value={sala.capacidade}
                                  onChange={(e) =>
                                    atualizarCapacidadeSala(sala.idUnico, e.target.value)
                                  }
                                  className="w-14 mx-auto block text-center text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:border-indigo-400 focus:border-indigo-600 rounded-md py-0.5 focus:outline-none"
                                  title={`Editar capacidade da sala ${sala.nomeColuna} (Manhã)`}
                                />
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>

                      {/* LINHA DE BAIXO: TARDE */}
                      <tr className="border-t-2 border-slate-300">
                        <th className="bg-[#1b365d] text-white font-extrabold py-2 px-3 w-36 text-xs border-r border-slate-300">
                          TARDE
                        </th>
                        {indices.map((idx) => {
                          const sala = turmasTarde[idx];
                          return (
                            <th
                              key={`t-h-${idx}`}
                              className={`py-2 px-2.5 font-extrabold text-xs border-r last:border-r-0 border-slate-300 min-w-[74px] ${
                                sala ? 'bg-[#dbe3ee] text-slate-900' : 'bg-slate-50'
                              }`}
                              title={sala?.planilhaNome || ''}
                            >
                              {sala ? sala.nomeColuna : ''}
                            </th>
                          );
                        })}
                      </tr>
                      <tr className="border-t border-slate-300 bg-white">
                        <td className="py-2 px-3 text-left font-bold text-[11px] text-slate-800 border-r border-slate-300">
                          TOTAL DE ALUNOS
                        </td>
                        {indices.map((idx) => {
                          const sala = turmasTarde[idx];
                          return (
                            <td
                              key={`t-a-${idx}`}
                              className={`py-2 px-2 font-extrabold text-sm border-r last:border-r-0 border-slate-300 ${
                                sala ? 'text-slate-900' : 'bg-slate-50'
                              }`}
                            >
                              {sala ? sala.totalAtivos : ''}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-t border-slate-300 bg-slate-100/80">
                        <td className="py-1.5 px-3 text-left text-[11px] text-slate-600 border-r border-slate-300">
                          capacidade
                        </td>
                        {indices.map((idx) => {
                          const sala = turmasTarde[idx];
                          return (
                            <td
                              key={`t-c-${idx}`}
                              className={`py-1 px-1.5 border-r last:border-r-0 border-slate-300 ${
                                sala ? '' : 'bg-slate-50'
                              }`}
                            >
                              {sala ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={999}
                                  value={sala.capacidade}
                                  onChange={(e) =>
                                    atualizarCapacidadeSala(sala.idUnico, e.target.value)
                                  }
                                  className="w-14 mx-auto block text-center text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:border-indigo-400 focus:border-indigo-600 rounded-md py-0.5 focus:outline-none"
                                  title={`Editar capacidade da sala ${sala.nomeColuna} (Tarde)`}
                                />
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {/* QUADROS INFERIORES: TABELA POR ETAPAS (ESQUERDA) + RESUMO GERAL DE MATRÍCULAS (DIREITA) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
            {/* Tabela Etapas */}
            <div className="lg:col-span-8 overflow-x-auto">
              <table className="w-full border-collapse text-center text-xs">
                <thead>
                  <tr>
                    <th colSpan={3} />
                    <th
                      colSpan={3}
                      className="bg-[#dbe3ee] text-slate-900 font-extrabold text-xs py-1.5 border border-[#1b365d]"
                    >
                      {anoReferencia}
                    </th>
                    <th />
                  </tr>
                  <tr className="bg-[#1b365d] text-white text-[11px] font-bold uppercase">
                    <th className="py-2.5 px-3 text-left border border-slate-300">ETAPAS</th>
                    <th className="py-2.5 px-2.5 border border-slate-300">CAP. DA SALA</th>
                    <th className="py-2.5 px-2.5 border border-slate-300">QUANT SALAS</th>
                    <th className="py-2.5 px-2.5 border border-slate-300">TOTAL DE ALUNOS</th>
                    <th className="py-2.5 px-2.5 border border-slate-300">CAPACIDADE</th>
                    <th className="py-2.5 px-2.5 border border-slate-300">VAGAS</th>
                    <th className="py-2.5 px-3 border border-slate-300">PERÍODO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {resumoEtapas.map((et) => (
                    <tr key={et.etapaNome} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-left font-extrabold text-slate-900 border border-slate-300">
                        {et.etapaNome}
                      </td>
                      <td
                        className="py-2 px-2.5 text-slate-600 border border-slate-300"
                        title={
                          et.capacidadesDistintas.length > 1
                            ? `Capacidades das salas desta etapa: ${et.capacidadesDistintas.join(', ')}`
                            : ''
                        }
                      >
                        {et.capDaSala}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-slate-800 border border-slate-300">
                        {et.quantSalas}
                      </td>
                      <td className="py-2 px-2.5 font-extrabold text-sm text-slate-900 border border-slate-300">
                        {et.totalAlunos}
                      </td>
                      <td className="py-2 px-2.5 text-slate-600 border border-slate-300">
                        {et.capacidadeTotal}
                      </td>
                      <td
                        className={`py-2 px-2.5 font-extrabold text-sm border border-slate-300 ${
                          et.vagas < 0
                            ? 'text-rose-700'
                            : et.vagas > 0
                            ? 'text-emerald-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {et.vagas}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px] font-semibold border border-slate-300">
                        {et.periodo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quadro Resumo Geral de Matrículas */}
            <div className="lg:col-span-4 lg:pt-7">
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <div className="bg-[#1b365d] text-white font-bold text-xs uppercase text-center py-2.5 px-3">
                  RESUMO GERAL DE MATRÍCULAS
                </div>
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    <tr className="border-t border-slate-200 bg-white">
                      <td className="py-2 px-3.5 font-bold text-slate-900">
                        TOTAL DE ALUNOS MANHÃ
                      </td>
                      <td className="py-2 px-3.5 text-right font-extrabold text-sm text-slate-900">
                        {totaisResumo.totalManha}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-200 bg-white">
                      <td className="py-2 px-3.5 font-bold text-slate-900">
                        TOTAL DE ALUNOS TARDE
                      </td>
                      <td className="py-2 px-3.5 text-right font-extrabold text-sm text-slate-900">
                        {totaisResumo.totalTarde}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-200 bg-white">
                      <td colSpan={2} className="h-4" />
                    </tr>
                    <tr className="border-t border-slate-200 bg-slate-100">
                      <td className="py-2 px-3.5 font-bold text-slate-700">TOTAL SEM AEE</td>
                      <td className="py-2 px-3.5 text-right font-extrabold text-sm text-slate-900">
                        {totaisResumo.totalSemAee}
                      </td>
                    </tr>
                    <tr className="border-t border-[#1b365d] bg-[#1b365d] text-white">
                      <td className="py-2.5 px-3.5 font-extrabold text-xs">TOTAL</td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-base">
                        {totaisResumo.totalGeral}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* BOTÃO DE IMPRESSÃO DO QUADRO ESCOLAR (ABAIXO DAS INFORMAÇÕES) */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Total de vagas disponíveis nas etapas regulares:{' '}
              <strong
                className={
                  totaisResumo.vagasTotaisRegulares < 0 ? 'text-rose-700' : 'text-emerald-700'
                }
              >
                {totaisResumo.vagasTotaisRegulares}
              </strong>{' '}
              (Capacidade total regular: {totaisResumo.capacidadeTotalRegulares})
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {alteracoesPendentes && (
                <button
                  type="button"
                  onClick={salvarCapacidadesNoBanco}
                  disabled={salvandoBanco}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {salvandoBanco ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Antes de Imprimir
                </button>
              )}

              <button
                type="button"
                onClick={imprimirQuadroEscolar}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1b365d] hover:bg-slate-900 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Quadro Escolar (QE)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
