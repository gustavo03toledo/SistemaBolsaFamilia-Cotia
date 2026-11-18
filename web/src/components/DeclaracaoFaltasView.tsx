import React, { useState, useEffect } from 'react';
import {
  Search,
  Printer,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  FileText,
  Highlighter,
  Image as ImageIcon
} from 'lucide-react';
import {
  obterPapelTimbradoUrl,
  processarESalvarPapelTimbradoArquivo,
  restaurarPapelTimbradoPadrao,
  temPapelTimbradoCustomizado
} from '../services/configEscolarStore';
import { gasApi } from '../services/gasApi';

export interface MesDeclaracao {
  mesNumero: number;
  mesNome: string;
  diasLetivos: number;
  comparecimento: number;
  frequenciaTexto: string;
  pctExigida: string;
  aptoReceber: string;
  destacar: boolean;
}

const MESES_PADRAO: { numero: number; nome: string }[] = [
  { numero: 2, nome: 'FEVEREIRO' },
  { numero: 3, nome: 'MARÇO' },
  { numero: 4, nome: 'ABRIL' },
  { numero: 5, nome: 'MAIO' },
  { numero: 6, nome: 'JUNHO' },
  { numero: 7, nome: 'JULHO' },
  { numero: 8, nome: 'AGOSTO' },
  { numero: 9, nome: 'SETEMBRO' },
  { numero: 10, nome: 'OUTUBRO' },
  { numero: 11, nome: 'NOVEMBRO' },
  { numero: 12, nome: 'DEZEMBRO' }
];

const MESES_EXTENSO = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

function criarMesesIniciais(limitePct = 75, modoAptoMesZerado: 'NAO' | 'VAZIO' = 'NAO'): MesDeclaracao[] {
  return MESES_PADRAO.map((m) => ({
    mesNumero: m.numero,
    mesNome: m.nome,
    diasLetivos: 0,
    comparecimento: 0,
    frequenciaTexto: '0,00',
    pctExigida: `${limitePct}%`,
    aptoReceber: modoAptoMesZerado === 'NAO' ? 'NÃO' : '',
    destacar: false
  }));
}

interface Props {
  escolaPadraoNome: string;
  anoReferencia: number;
  turmasConhecidas: string[];
  alunosSugeridos: { nome: string; turma: string; nis?: string }[];
  alunoInicial?: { nome: string; turma: string } | null;
  onClearAlunoInicial?: () => void;
}

export default function DeclaracaoFaltasView({
  escolaPadraoNome,
  anoReferencia,
  turmasConhecidas,
  alunosSugeridos,
  alunoInicial,
  onClearAlunoInicial
}: Props) {
  // Filtros de busca nos diarios
  const [buscaNome, setBuscaNome] = useState('');
  const [buscaTurma, setBuscaTurma] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState('');
  const [msgSucesso, setMsgSucesso] = useState('');
  const [candidatos, setCandidatos] = useState<any[]>([]);

  // Dados editaveis do cabecalho da declaracao
  const [escolaNome, setEscolaNome] = useState(
    escolaPadraoNome && escolaPadraoNome !== 'Escola Ativa' ? escolaPadraoNome : ''
  );
  const [etapaEnsino, setEtapaEnsino] = useState<'INFANTIL' | 'FUNDAMENTAL'>('FUNDAMENTAL');
  const [nomeAluno, setNomeAluno] = useState('');
  const [raAluno, setRaAluno] = useState('');
  const [serieTurma, setSerieTurma] = useState('');
  const [usarSublinhadosTexto, setUsarSublinhadosTexto] = useState(false);
  const [modoAptoMesZerado, setModoAptoMesZerado] = useState<'NAO' | 'VAZIO'>('VAZIO');

  // Dados da tabela de meses (Fevereiro a Dezembro)
  const [mesesOriginaisDiario, setMesesOriginaisDiario] = useState<MesDeclaracao[]>(() =>
    criarMesesIniciais(75, 'VAZIO')
  );
  const [meses, setMeses] = useState<MesDeclaracao[]>(() => criarMesesIniciais(75, 'VAZIO'));

  // Observacoes e Data
  const [obsPrincipal, setObsPrincipal] = useState(
    'O ALUNO NÃO APRESENTOU JUSTIFICATIVA, TENTATIVA DE CONTATO VIA WHATS E TELEFONE, PORÉM A FAMÍLIA DEMONSTRA DESINTERESSE SOBRE O ASSUNTO E O ALUNO CONTINUA FALTANDO'
  );
  const [obsDestaqueCentral, setObsDestaqueCentral] = useState('');
  const [alinhamentoObs, setAlinhamentoObs] = useState<'CENTER' | 'LEFT'>('CENTER');

  const hoje = new Date();
  const [cidadeAssinatura, setCidadeAssinatura] = useState('Cotia');
  const [diaAssinatura, setDiaAssinatura] = useState(String(hoje.getDate()));
  const [mesAssinatura, setMesAssinatura] = useState(
    MESES_EXTENSO[hoje.getMonth()] || 'Novembro'
  );
  const [anoAssinatura, setAnoAssinatura] = useState(String(anoReferencia || hoje.getFullYear()));
  const [usarSublinhadosData, setUsarSublinhadosData] = useState(false);

  // Atualiza nome da escola se mudar no contexto
  useEffect(() => {
    if (escolaPadraoNome && escolaPadraoNome !== 'Escola Ativa') {
      setEscolaNome(escolaPadraoNome);
    }
  }, [escolaPadraoNome]);

  // Se vier um aluno selecionado da aba Abaixo do Limite, dispara a busca automaticamente
  useEffect(() => {
    if (alunoInicial && alunoInicial.nome) {
      setBuscaNome(alunoInicial.nome);
      setBuscaTurma(alunoInicial.turma || '');
      executarBuscaDiario(alunoInicial.nome, alunoInicial.turma || '', '');
      if (onClearAlunoInicial) {
        onClearAlunoInicial();
      }
    }
  }, [alunoInicial]);

  // Salva/recupera RA por nome do aluno no localStorage
  function carregarRaSalvo(nome: string): string {
    if (!nome) return '';
    try {
      const mapa = JSON.parse(localStorage.getItem('SBF_RA_ALUNOS_MAP_V1') || '{}');
      return mapa[nome.trim().toUpperCase()] || '';
    } catch {
      return '';
    }
  }

  function salvarRaNoCache(nome: string, ra: string) {
    if (!nome) return;
    try {
      const mapa = JSON.parse(localStorage.getItem('SBF_RA_ALUNOS_MAP_V1') || '{}');
      mapa[nome.trim().toUpperCase()] = ra;
      localStorage.setItem('SBF_RA_ALUNOS_MAP_V1', JSON.stringify(mapa));
    } catch {
      // ignore
    }
  }

  function handleChangeRa(novoRa: string) {
    setRaAluno(novoRa);
    if (nomeAluno) {
      salvarRaNoCache(nomeAluno, novoRa);
    }
  }

  function recalcularLinhaMes(
    linha: MesDeclaracao,
    diasLetivos: number,
    comparecimento: number,
    limitePct: number,
    modoZerado: 'NAO' | 'VAZIO'
  ): MesDeclaracao {
    const dl = Math.max(0, Number(diasLetivos) || 0);
    const comp = Math.max(0, Math.min(dl > 0 ? dl : comparecimento, Number(comparecimento) || 0));
    if (dl > 0) {
      const pct = (comp / dl) * 100;
      const pctArred = Math.round(pct * 100) / 100;
      const freqTexto = pctArred.toFixed(2).replace('.', ',');
      const apto = pctArred >= limitePct ? 'SIM' : 'NÃO';
      return {
        ...linha,
        diasLetivos: dl,
        comparecimento: comp,
        frequenciaTexto: freqTexto,
        pctExigida: `${limitePct}%`,
        aptoReceber: apto,
        destacar: pctArred < limitePct
      };
    }
    return {
      ...linha,
      diasLetivos: 0,
      comparecimento: 0,
      frequenciaTexto: '0,00',
      pctExigida: `${limitePct}%`,
      aptoReceber: modoZerado === 'NAO' ? 'NÃO' : '',
      destacar: false
    };
  }

  function handleTrocarEtapa(novaEtapa: 'INFANTIL' | 'FUNDAMENTAL') {
    setEtapaEnsino(novaEtapa);
    const novoLimite = novaEtapa === 'INFANTIL' ? 60 : 75;
    const novoModoZerado = novaEtapa === 'INFANTIL' ? 'NAO' : modoAptoMesZerado;
    if (novaEtapa === 'INFANTIL') {
      setModoAptoMesZerado('NAO');
      setUsarSublinhadosTexto(true);
      setUsarSublinhadosData(true);
    } else {
      setModoAptoMesZerado('VAZIO');
      setUsarSublinhadosTexto(false);
      setUsarSublinhadosData(false);
    }
    setMeses((prev) =>
      prev.map((m) =>
        recalcularLinhaMes(m, m.diasLetivos, m.comparecimento, novoLimite, novoModoZerado)
      )
    );
  }

  function handleTrocarModoAptoZerado(novoModo: 'NAO' | 'VAZIO') {
    setModoAptoMesZerado(novoModo);
    const limitePct = etapaEnsino === 'INFANTIL' ? 60 : 75;
    setMeses((prev) =>
      prev.map((m) =>
        m.diasLetivos === 0
          ? { ...m, aptoReceber: novoModo === 'NAO' ? 'NÃO' : '', pctExigida: `${limitePct}%` }
          : m
      )
    );
  }

  async function executarBuscaDiario(nomeAlvo?: string, turmaAlvo?: string, arquivoIdAlvo?: string) {
    const nome = typeof nomeAlvo === 'string' ? nomeAlvo : buscaNome;
    const turma = typeof turmaAlvo === 'string' ? turmaAlvo : buscaTurma;
    if (!nome.trim() && !turma.trim()) {
      setErroBusca('Digite o nome do aluno ou escolha uma turma para buscar nos diários.');
      return;
    }

    setBuscando(true);
    setErroBusca('');
    setMsgSucesso('');
    try {
      const res = await gasApi.buscarDadosDeclaracaoAluno({
        nomeAluno: nome.trim(),
        turma: turma.trim(),
        arquivoId: arquivoIdAlvo || '',
        anoReferencia
      });

      const al = res?.aluno || {};
      const etapaDet: 'INFANTIL' | 'FUNDAMENTAL' =
        al.etapa === 'INFANTIL' ? 'INFANTIL' : 'FUNDAMENTAL';
      const limiteDet = etapaDet === 'INFANTIL' ? 60 : 75;
      const modoZeradoPadrao: 'NAO' | 'VAZIO' = etapaDet === 'INFANTIL' ? 'NAO' : 'VAZIO';

      setEtapaEnsino(etapaDet);
      setModoAptoMesZerado(modoZeradoPadrao);
      setUsarSublinhadosTexto(etapaDet === 'INFANTIL');
      setUsarSublinhadosData(etapaDet === 'INFANTIL');

      if (al.escolaNome && al.escolaNome !== 'Escola Ativa') {
        setEscolaNome(al.escolaNome);
      }
      setNomeAluno(al.nomeAluno || nome.trim());
      setSerieTurma(al.turma || turma.trim());

      const raSalvo = carregarRaSalvo(al.nomeAluno || nome.trim());
      if (raSalvo) {
        setRaAluno(raSalvo);
      }

      const listaMesesApi: MesDeclaracao[] = (res?.meses || []).map((m: any) =>
        recalcularLinhaMes(
          {
            mesNumero: Number(m.mesNumero),
            mesNome: String(m.mesNome),
            diasLetivos: Number(m.diasLetivos || 0),
            comparecimento: Number(m.comparecimento || 0),
            frequenciaTexto: String(m.frequenciaTexto || '0,00'),
            pctExigida: `${limiteDet}%`,
            aptoReceber: String(m.aptoReceber || ''),
            destacar: Boolean(m.destacar)
          },
          Number(m.diasLetivos || 0),
          Number(m.comparecimento || 0),
          limiteDet,
          modoZeradoPadrao
        )
      );

      if (listaMesesApi.length === 11) {
        setMesesOriginaisDiario(listaMesesApi);
        setMeses(listaMesesApi);
      }

      if (Array.isArray(res?.observacoesSugeridas) && res.observacoesSugeridas.length > 0) {
        setObsPrincipal(res.observacoesSugeridas.join('\n'));
        setAlinhamentoObs('LEFT');
      }

      setCandidatos(res?.candidatos || []);
      setMsgSucesso(
        `Frequência calculada diretamente do diário "${al.nomeArquivo || al.turma}" para ${al.nomeAluno}! Confira ou edite qualquer campo abaixo antes de imprimir.`
      );
    } catch (err: any) {
      setErroBusca(
        err?.message ||
          'Não foi possível buscar os dados do aluno nos diários. Você também pode preencher manualmente abaixo.'
      );
    } finally {
      setBuscando(false);
    }
  }

  function filtrarMesesAtivos(numerosMesesPermitidos: number[] | 'TODOS' | 'NENHUM') {
    const limitePct = etapaEnsino === 'INFANTIL' ? 60 : 75;
    setMeses(
      mesesOriginaisDiario.map((mOrig) => {
        const manter =
          numerosMesesPermitidos === 'TODOS'
            ? true
            : numerosMesesPermitidos === 'NENHUM'
            ? false
            : numerosMesesPermitidos.includes(mOrig.mesNumero);

        if (!manter) {
          return recalcularLinhaMes(mOrig, 0, 0, limitePct, modoAptoMesZerado);
        }
        return recalcularLinhaMes(
          mOrig,
          mOrig.diasLetivos,
          mOrig.comparecimento,
          limitePct,
          modoAptoMesZerado
        );
      })
    );
  }

  function atualizarCampoMes(index: number, campo: keyof MesDeclaracao, valor: any) {
    const limitePct = etapaEnsino === 'INFANTIL' ? 60 : 75;
    setMeses((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (campo === 'diasLetivos') {
          return recalcularLinhaMes(
            item,
            Number(valor),
            item.comparecimento,
            limitePct,
            modoAptoMesZerado
          );
        }
        if (campo === 'comparecimento') {
          return recalcularLinhaMes(
            item,
            item.diasLetivos,
            Number(valor),
            limitePct,
            modoAptoMesZerado
          );
        }
        return {
          ...item,
          [campo]: valor
        };
      })
    );
  }

  const [papelTimbradoUrl, setPapelTimbradoUrl] = useState<string>(() =>
    obterPapelTimbradoUrl()
  );
  const [ehTimbradoCustom, setEhTimbradoCustom] = useState<boolean>(() =>
    temPapelTimbradoCustomizado()
  );

  async function handleAlterarPapelTimbrado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const novaUrl = await processarESalvarPapelTimbradoArquivo(file);
      setPapelTimbradoUrl(novaUrl);
      setEhTimbradoCustom(true);
    } catch (err: any) {
      alert(err?.message || 'Erro ao carregar imagem do papel timbrado.');
    } finally {
      e.target.value = '';
    }
  }

  function handleRestaurarTimbradoOriginal() {
    const padrao = restaurarPapelTimbradoPadrao();
    setPapelTimbradoUrl(padrao);
    setEhTimbradoCustom(false);
  }

  function handleImprimirDeclaracao() {
    window.print();
  }

  const tituloEtapaOficial =
    etapaEnsino === 'INFANTIL' ? 'EDUCAÇÃO INFANTIL' : 'ENSINO FUNDAMENTAL';

  return (
    <div className="space-y-6">
      {/* ====================================================================
          PAINEL DE BUSCA E EDICAO (OCULTO NA IMPRESSAO A4)
      ==================================================================== */}
      <div className="no-print space-y-6">
        {/* Card 1: Busca Automatica nos Diarios */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <Sparkles className="w-3.5 h-3.5" />
                Geração Automática com Papel Timbrado Oficial (Secretaria de Educação / CRAS)
              </span>
              <h2 className="text-lg font-bold mt-1">
                Declaração de Frequência do Bolsa Família (Com Faltas)
              </h2>
              <p className="text-xs text-slate-600">
                Digite o nome do aluno e a turma para o sistema calcular automaticamente os dias
                letivos, comparecimentos e percentuais de Fevereiro a Dezembro diretamente do diário.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-bold transition cursor-pointer">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Alterar Papel Timbrado
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAlterarPapelTimbrado}
                  className="hidden"
                />
              </label>

              {ehTimbradoCustom && (
                <button
                  type="button"
                  onClick={handleRestaurarTimbradoOriginal}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  title="Voltar ao papel timbrado original da Educação de Cotia"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Timbrado Padrão
                </button>
              )}

              <button
                type="button"
                onClick={handleImprimirDeclaracao}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Confirmar e Imprimir / Salvar PDF
              </button>
            </div>
          </div>

          {/* Barra de Busca */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do Aluno(a) no Diário ou Bolsa Família
              </label>
              <input
                type="text"
                list="lista-alunos-declaracao"
                value={buscaNome}
                onChange={(e) => {
                  const val = e.target.value;
                  setBuscaNome(val);
                  const achado = alunosSugeridos.find(
                    (a) => a.nome.toUpperCase() === val.trim().toUpperCase()
                  );
                  if (achado && achado.turma && !buscaTurma) {
                    setBuscaTurma(achado.turma);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    executarBuscaDiario();
                  }
                }}
                placeholder="Digite o nome do aluno..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="lista-alunos-declaracao">
                {alunosSugeridos.map((al, i) => (
                  <option key={i} value={al.nome}>
                    {al.turma ? `${al.turma} — ${al.nome}` : al.nome}
                  </option>
                ))}
              </datalist>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Série / Turma (Opcional)
              </label>
              <input
                type="text"
                value={buscaTurma}
                onChange={(e) => setBuscaTurma(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    executarBuscaDiario();
                  }
                }}
                placeholder="Ex: JD II A ou 1º ANO B"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-3 flex items-end">
              <button
                type="button"
                onClick={() => executarBuscaDiario()}
                disabled={buscando}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                {buscando ? 'Calculando nos Diários...' : 'Buscar e Calcular nos Diários'}
              </button>
            </div>
          </div>

          {/* Atalho de Turmas Conhecidas */}
          {turmasConhecidas.length > 0 && (
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                Atalho Rápido — Filtrar por Turma Escaneada:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setBuscaTurma('')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                    !buscaTurma
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  Todas
                </button>
                {turmasConhecidas.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBuscaTurma(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                      buscaTurma === t
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

          {/* Mensagens de retorno */}
          {erroBusca && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {erroBusca}
            </div>
          )}
          {msgSucesso && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{msgSucesso}</span>
            </div>
          )}

          {/* Lista de Candidatos Encontrados (caso haja mais de 1 aluno parecido) */}
          {candidatos.length > 1 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[11px] font-bold text-slate-500 mb-1.5">
                Alunos encontrados nos diários (clique para carregar outro):
              </span>
              <div className="flex flex-wrap gap-2">
                {candidatos.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => executarBuscaDiario(c.nomeAluno, c.turma, c.arquivoId)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      c.nomeAluno === nomeAluno
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {c.nomeAluno} ({c.turma})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Edicao Completa dos Dados antes de Gerar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                1. Dados do Aluno, R.A. e Cabeçalho (Editáveis)
              </h3>
              <p className="text-xs text-slate-500">
                Preencha o <strong>R.A. Nº</strong> do aluno e ajuste qualquer informação se
                necessário. A folha A4 abaixo atualiza em tempo real.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleTrocarEtapa('INFANTIL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  etapaEnsino === 'INFANTIL'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Educação Infantil (60%)
              </button>
              <button
                type="button"
                onClick={() => handleTrocarEtapa('FUNDAMENTAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  etapaEnsino === 'FUNDAMENTAL'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Ensino Fundamental (75%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do(a) Aluno(a) na Declaração
              </label>
              <input
                type="text"
                value={nomeAluno}
                onChange={(e) => setNomeAluno(e.target.value)}
                placeholder="Nome completo do(a) aluno(a)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">
                R.A. Nº do Aluno (Manual) *
              </label>
              <input
                type="text"
                value={raAluno}
                onChange={(e) => handleChangeRa(e.target.value)}
                placeholder="Ex: 126.511.136-4"
                className="w-full px-3.5 py-2 rounded-xl border-2 border-amber-400 bg-amber-50/40 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Série / Ano / Turma
              </label>
              <input
                type="text"
                value={serieTurma}
                onChange={(e) => setSerieTurma(e.target.value)}
                placeholder="Ex: JD.II A ou 1º ANO B"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Unidade Escolar (Direção do(a))
              </label>
              <input
                type="text"
                value={escolaNome}
                onChange={(e) => setEscolaNome(e.target.value)}
                placeholder="Nome da Unidade Escolar"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Coluna "APTO Á RECEBER" nos meses com 0 dias
              </label>
              <select
                value={modoAptoMesZerado}
                onChange={(e) => handleTrocarModoAptoZerado(e.target.value as 'NAO' | 'VAZIO')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              >
                <option value="NAO">Mostrar "NÃO" em todos os meses (Modelo Infantil)</option>
                <option value="VAZIO">
                  Mostrar apenas nos meses com aula (Modelo Fundamental)
                </option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 pt-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usarSublinhadosTexto}
                  onChange={(e) => setUsarSublinhadosTexto(e.target.checked)}
                />
                <span>Usar sublinhados no parágrafo (_Escola_, _Aluno_, __Turma__)</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usarSublinhadosData}
                  onChange={(e) => setUsarSublinhadosData(e.target.checked)}
                />
                <span>Usar sublinhados na data (Cotia, __29__ de _Setembro_ de 2026)</span>
              </label>
            </div>
          </div>

          {/* Editor da Tabela de Meses */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  2. Tabela de Frequência Mensal (Fevereiro a Dezembro)
                </h3>
                <p className="text-xs text-slate-500">
                  Ao alterar <strong>Dias Letivos</strong> ou <strong>Comparecimento</strong>, a{' '}
                  <strong>Frequência (%)</strong> e <strong>Apto á Receber</strong> são recalculados
                  automaticamente.
                </p>
              </div>

              {/* Atalhos para filtrar bimestre/meses ativos */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 mr-1">
                  Manter preenchido:
                </span>
                <button
                  type="button"
                  onClick={() => filtrarMesesAtivos('TODOS')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-800 cursor-pointer"
                >
                  Todos do Diário
                </button>
                <button
                  type="button"
                  onClick={() => filtrarMesesAtivos([2, 3])}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-800 cursor-pointer"
                >
                  Fev/Mar
                </button>
                <button
                  type="button"
                  onClick={() => filtrarMesesAtivos([4, 5])}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-800 cursor-pointer"
                >
                  Abr/Mai
                </button>
                <button
                  type="button"
                  onClick={() => filtrarMesesAtivos([6, 7])}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-800 cursor-pointer"
                >
                  Jun/Jul
                </button>
                <button
                  type="button"
                  onClick={() => filtrarMesesAtivos([8, 9])}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-800 cursor-pointer"
                >
                  Ago/Set
                </button>
                <button
                  type="button"
                  onClick={() => filtrarMesesAtivos([8, 9, 10])}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-[11px] font-semibold text-amber-900 cursor-pointer"
                >
                  Ago/Set/Out
                </button>
                <button
                  type="button"
                  onClick={() => filtrarMesesAtivos([10, 11])}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-800 cursor-pointer"
                >
                  Out/Nov
                </button>
                <button
                  type="button"
                  onClick={() => filtrarMesesAtivos('NENHUM')}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-[11px] font-semibold text-rose-700 cursor-pointer"
                >
                  Zerar Todos
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left">MÊS</th>
                    <th className="px-3 py-2 text-center">DIAS LETIVOS</th>
                    <th className="px-3 py-2 text-center">COMPARECIMENTO (DIAS)</th>
                    <th className="px-3 py-2 text-center">FREQUENCIA (%)</th>
                    <th className="px-3 py-2 text-center">PCT. EXIGIDA</th>
                    <th className="px-3 py-2 text-center">APTO Á RECEBER</th>
                    <th className="px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1">
                        <Highlighter className="w-3.5 h-3.5 text-amber-600" />
                        Destacar Amarelo
                      </span>
                    </th>
                    <th className="px-3 py-2 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {meses.map((m, idx) => (
                    <tr
                      key={m.mesNumero}
                      className={m.destacar ? 'bg-yellow-100/80' : 'hover:bg-slate-50'}
                    >
                      <td className="px-3 py-1.5 font-bold text-slate-900">{m.mesNome}</td>
                      <td className="px-2 py-1 text-center">
                        <input
                          type="number"
                          min="0"
                          max="31"
                          value={m.diasLetivos}
                          onChange={(e) =>
                            atualizarCampoMes(idx, 'diasLetivos', Number(e.target.value))
                          }
                          className="w-20 px-2 py-1 text-center rounded border border-slate-300 bg-white font-semibold"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <input
                          type="number"
                          min="0"
                          max="31"
                          value={m.comparecimento}
                          onChange={(e) =>
                            atualizarCampoMes(idx, 'comparecimento', Number(e.target.value))
                          }
                          className="w-20 px-2 py-1 text-center rounded border border-slate-300 bg-white font-semibold"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <input
                          type="text"
                          value={m.frequenciaTexto}
                          onChange={(e) =>
                            atualizarCampoMes(idx, 'frequenciaTexto', e.target.value)
                          }
                          className="w-20 px-2 py-1 text-center rounded border border-slate-300 bg-white font-mono"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <input
                          type="text"
                          value={m.pctExigida}
                          onChange={(e) => atualizarCampoMes(idx, 'pctExigida', e.target.value)}
                          className="w-16 px-2 py-1 text-center rounded border border-slate-300 bg-white"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <select
                          value={m.aptoReceber}
                          onChange={(e) => atualizarCampoMes(idx, 'aptoReceber', e.target.value)}
                          className="px-2 py-1 rounded border border-slate-300 bg-white font-bold"
                        >
                          <option value="NÃO">NÃO</option>
                          <option value="SIM">SIM</option>
                          <option value="">(Em branco)</option>
                        </select>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={m.destacar}
                          onChange={(e) => atualizarCampoMes(idx, 'destacar', e.target.checked)}
                          className="w-4 h-4 accent-amber-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => atualizarCampoMes(idx, 'diasLetivos', 0)}
                          className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold cursor-pointer"
                          title="Zerar este mês"
                        >
                          <RotateCcw className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Editor de OBS e Data */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-800">
                  3. Observações da Declaração (OBS:)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setObsPrincipal(
                        'O ALUNO NÃO APRESENTOU JUSTIFICATIVA, TENTATIVA DE CONTATO VIA WHATS E TELEFONE, PORÉM A FAMÍLIA DEMONSTRA DESINTERESSE SOBRE O ASSUNTO E O ALUNO CONTINUA FALTANDO'
                      );
                      setObsDestaqueCentral('');
                      setAlinhamentoObs('CENTER');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Modelo 1: Sem Justificativa / Desinteresse
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setObsPrincipal(
                        'Atestados medico apresentado no dia __/__/2026 de __ dias - Justificando os dias : __/__ e __/__.\ndeclaração de horas apresentado no dia __/__/2026 das __:__ às __:__'
                      );
                      setObsDestaqueCentral(
                        'Atestados medicos justificam apenas __ dias em ________.'
                      );
                      setAlinhamentoObs('LEFT');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Modelo 2: Atestados Médicos / Declaração de Horas
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAlinhamentoObs(alinhamentoObs === 'CENTER' ? 'LEFT' : 'CENTER')
                    }
                    className="px-2.5 py-1 rounded-lg border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Alinhamento: {alinhamentoObs === 'CENTER' ? 'Centralizado' : 'À Esquerda'}
                  </button>
                </div>
              </div>
              <textarea
                rows={3}
                value={obsPrincipal}
                onChange={(e) => setObsPrincipal(e.target.value)}
                placeholder="Digite a observação que sairá no campo OBS: da declaração..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Linha de resumo centralizada abaixo da OBS (Opcional — usado quando há atestados):
                </label>
                <input
                  type="text"
                  value={obsDestaqueCentral}
                  onChange={(e) => setObsDestaqueCentral(e.target.value)}
                  placeholder="Ex: Atestados medicos justificam apenas 7 dias em agosto e 4 dias em outubro."
                  className="w-full px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-800">4. Local e Data da Assinatura</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">Cidade</label>
                  <input
                    type="text"
                    value={cidadeAssinatura}
                    onChange={(e) => setCidadeAssinatura(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">Dia</label>
                  <input
                    type="text"
                    value={diaAssinatura}
                    onChange={(e) => setDiaAssinatura(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">Mês</label>
                  <input
                    type="text"
                    value={mesAssinatura}
                    onChange={(e) => setMesAssinatura(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">Ano</label>
                  <input
                    type="text"
                    value={anoAssinatura}
                    onChange={(e) => setAnoAssinatura(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleImprimirDeclaracao}
                className="w-full mt-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir / Salvar Declaração (PDF)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          FOLHA A4 OFICIAL COM PAPEL TIMBRADO DA EDUCACAO DE COTIA
          (Identica ao PDF anexo: modelo DECLARACAO BOLSA FAMILIA CRAS 2026)
      ==================================================================== */}
      <div className="flex justify-center">
        <div
          className="declaracao-a4-sheet bg-white shadow-2xl border border-slate-300 relative text-black"
          style={{
            width: '210mm',
            minHeight: '297mm',
            maxHeight: '297mm',
            backgroundImage: `url('${papelTimbradoUrl}')`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top center',
            fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
            paddingTop: '43mm',
            paddingBottom: '26mm',
            paddingLeft: '18mm',
            paddingRight: '18mm',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          {/* TOPO + CORPO + TABELA */}
          <div>
            {/* Titulo Oficial */}
            <div className="text-center font-bold italic uppercase leading-snug tracking-wide mb-7">
              <div style={{ fontSize: '15pt' }}>
                DECLARAÇÃO DE FREQUÊNCIA DO BOLSA FAMÍLIA.
              </div>
              <div style={{ fontSize: '15pt', marginTop: '2px' }}>{tituloEtapaOficial}</div>
            </div>

            {/* Paragrafo Oficial */}
            <div
              className="text-center leading-relaxed mb-7"
              style={{
                fontSize: '12pt',
                paddingLeft: '4mm',
                paddingRight: '4mm'
              }}
            >
              {usarSublinhadosTexto ? (
                <>
                  A Direção do(A) _{escolaNome || '________________________'} , vem por meio deste
                  informar a frequência do(a) aluno(a) _{nomeAluno || '________________________'}_,
                  R.A. Nº {raAluno || '______________'} matriculado na série __
                  {serieTurma || '_______'}__ nesta U.E.
                </>
              ) : (
                <>
                  A Direção do(A) {escolaNome || '________________________'}, vem por meio deste informar
                  a frequência do(a) aluno(a) {nomeAluno || '________________________'}, R.A. Nº{' '}
                  {raAluno || '______________'} matriculado na série/ano {serieTurma || '_______'}{' '}
                  nesta U.E.
                </>
              )}
            </div>

            {/* Tabela Oficial de 11 Meses (Fevereiro a Dezembro) */}
            <table
              className="w-full border-collapse"
              style={{
                border: '1.5px solid #000000',
                fontSize: '10.5pt',
                lineHeight: '1.25'
              }}
            >
              <thead>
                <tr className="font-bold">
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '2px 5px',
                      textAlign: 'left',
                      width: '21%'
                    }}
                  >
                    MÊS
                  </th>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '2px 5px',
                      textAlign: 'left',
                      width: '15%'
                    }}
                  >
                    DIAS LETIVOS
                  </th>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '2px 4px',
                      textAlign: 'left',
                      width: '18%',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    COMPARECIMENTO
                  </th>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '2px 5px',
                      textAlign: 'left',
                      width: '21%'
                    }}
                  >
                    FREQUENCIA
                  </th>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '2px 5px',
                      textAlign: 'left',
                      width: '13%'
                    }}
                  >
                    PCT. EXIGIDA
                  </th>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '2px 5px',
                      textAlign: 'left',
                      width: '15%'
                    }}
                  >
                    APTO Á RECEBER
                  </th>
                </tr>
              </thead>
              <tbody>
                {meses.map((m) => (
                  <tr
                    key={m.mesNumero}
                    style={{
                      backgroundColor: m.destacar ? '#ffff00' : 'transparent'
                    }}
                  >
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '1.5px 5px',
                        textAlign: 'left'
                      }}
                    >
                      {m.mesNome}
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '1.5px 5px',
                        textAlign: 'right'
                      }}
                    >
                      {m.diasLetivos}
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '1.5px 5px',
                        textAlign: 'right'
                      }}
                    >
                      {m.comparecimento}
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '1.5px 5px',
                        textAlign: 'right'
                      }}
                    >
                      {m.frequenciaTexto}
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '1.5px 5px',
                        textAlign: 'right'
                      }}
                    >
                      {m.pctExigida}
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '1.5px 5px',
                        textAlign: 'left',
                        fontWeight: 'bold'
                      }}
                    >
                      {m.aptoReceber}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bloco OBS: */}
            <div className="mt-4">
              {alinhamentoObs === 'CENTER' ? (
                <div
                  className="text-center whitespace-pre-line leading-snug"
                  style={{ fontSize: '10.5pt' }}
                >
                  {obsPrincipal ? `OBS: ${obsPrincipal}` : ''}
                </div>
              ) : (
                <div className="space-y-1.5" style={{ fontSize: '9pt' }}>
                  <div className="font-normal">OBS:</div>
                  <div className="whitespace-pre-line leading-relaxed">{obsPrincipal}</div>
                </div>
              )}

              {obsDestaqueCentral && (
                <div
                  className="text-center mt-4 font-normal"
                  style={{ fontSize: '11.5pt' }}
                >
                  {obsDestaqueCentral}
                </div>
              )}
            </div>
          </div>

          {/* BLOCO DE ASSINATURA E DATA (ALINHADO A DIREITA ACIMA DO RODAPE DO TIMBRADO) */}
          <div className="pr-2 mb-4">
            <div className="flex flex-col items-end text-right">
              <div className="font-bold mb-6" style={{ fontSize: '11pt', marginRight: '22mm' }}>
                Atenciosamente,
              </div>
              <div
                className="font-bold mb-7"
                style={{
                  fontSize: '11pt',
                  letterSpacing: '0.5px'
                }}
              >
                ___________________________________
              </div>
              <div style={{ fontSize: '11.5pt' }}>
                {usarSublinhadosData ? (
                  <>
                    <strong>{cidadeAssinatura},</strong> __{diaAssinatura}____de _{mesAssinatura}
                    ___de {anoAssinatura}.
                  </>
                ) : (
                  <>
                    <strong>{cidadeAssinatura},</strong> {diaAssinatura} de{' '}
                    {mesAssinatura.toLowerCase()} de {anoAssinatura}.
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
