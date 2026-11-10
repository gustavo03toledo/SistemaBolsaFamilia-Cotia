import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet
} from 'lucide-react';
import { gasApi } from '../services/gasApi';

interface RevisaoSplitViewProps {
  pendencias: any[];
  diarios: any[];
  anoReferencia: number;
  periodoId: string;
  abaCiclo: string;
  onConfirmado: (itemOriginal: any, resultado: any) => Promise<void>;
  onAbrirAjusteFrequencia?: (item: any) => void;
}

export const RevisaoSplitView: React.FC<RevisaoSplitViewProps> = ({
  pendencias,
  diarios,
  anoReferencia,
  periodoId,
  abaCiclo,
  onConfirmado,
  onAbrirAjusteFrequencia
}) => {
  const [filtroFila, setFiltroFila] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Campos de busca na coluna direita
  const [nomeDiario, setNomeDiario] = useState('');
  const [anoSerie, setAnoSerie] = useState('');
  const [turma, setTurma] = useState('');
  const [numeroChamada, setNumeroChamada] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState('');
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [erroBusca, setErroBusca] = useState('');
  const [avisoBusca, setAvisoBusca] = useState('');

  const filaFiltrada = useMemo(() => {
    const termo = filtroFila.trim().toLowerCase();
    if (!termo) return pendencias;
    return pendencias.filter((item) => {
      const texto = `${item.aluno || ''} ${item.nomeOriginal || ''} ${item.nis || ''} ${item.turma || ''} ${item.motivoRevisao || item.status || ''}`.toLowerCase();
      return texto.includes(termo);
    });
  }, [pendencias, filtroFila]);

  const itemSelecionado = filaFiltrada[selectedIndex] || filaFiltrada[0] || null;

  // Extrai chips de Séries e Turmas conhecidas dos diários escaneados
  const opcoesSeriesETurmas = useMemo(() => {
    const seriesPadrao = ['JARDIM I', 'JARDIM II', '1º ANO', '2º ANO', '3º ANO', '4º ANO', '5º ANO'];
    const letrasPadrao = ['A', 'B', 'C', 'D', 'E', 'U'];
    const turmasCompletas = new Set<string>();

    (diarios || []).forEach((d) => {
      const t = String(d.turma || '').trim();
      if (t && !/AEE|EDUCACAO FISICA|EDUCAÇÃO FÍSICA/i.test(t)) {
        turmasCompletas.add(t);
      }
    });

    return {
      seriesPadrao,
      letrasPadrao,
      turmasCompletas: Array.from(turmasCompletas).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    };
  }, [diarios]);

  // Sincroniza formulário quando muda o aluno selecionado na fila
  useEffect(() => {
    if (!itemSelecionado) {
      setNomeDiario('');
      setAnoSerie('');
      setTurma('');
      setNumeroChamada('');
      setCandidatos([]);
      setErroBusca('');
      setAvisoBusca('');
      return;
    }

    setNomeDiario(itemSelecionado.nomeSugerido || itemSelecionado.aluno || itemSelecionado.nomeOriginal || '');
    setAnoSerie('');
    setTurma(itemSelecionado.turma && itemSelecionado.turma !== '-' ? itemSelecionado.turma : '');
    setNumeroChamada('');
    setCandidatos(Array.isArray(itemSelecionado.candidatos) ? itemSelecionado.candidatos : []);
    setErroBusca('');
    setAvisoBusca('');
  }, [itemSelecionado?.chaveUnica, itemSelecionado?.aluno, itemSelecionado?.nis]);

  // Navegação por teclado ↑ e ↓ na fila
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(filaFiltrada.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filaFiltrada.length]);

  async function handleBuscarCandidatos() {
    if (!itemSelecionado) return;
    setBuscando(true);
    setErroBusca('');
    setAvisoBusca('');
    try {
      const resp = await gasApi.buscarRevisaoAssistida({
        anoReferencia,
        periodoId,
        abaCiclo,
        nomeOriginal: itemSelecionado.nomeOriginal || itemSelecionado.aluno,
        nomeCorrigido: nomeDiario,
        anoSerie,
        turma,
        numeroChamada,
        nis: itemSelecionado.nis || ''
      });
      const lista = resp?.candidatos || [];
      setCandidatos(lista);
      if (lista.length === 0) {
        setAvisoBusca('Nenhum aluno localizado com esses filtros. Tente ajustar a Série/Turma ou informar apenas o primeiro nome.');
      }
    } catch (err: any) {
      setErroBusca(err?.message || 'Falha ao buscar candidatos nos diários.');
    } finally {
      setBuscando(false);
    }
  }

  async function handleConfirmarCandidato(cand: any) {
    if (!itemSelecionado) return;
    const chaveCand = `${cand.arquivoId}_${cand.abaNome}_${cand.nomeDiario}`;
    setConfirmandoId(chaveCand);
    setErroBusca('');
    try {
      const resp = await gasApi.confirmarCorrecao({
        anoReferencia,
        periodoId,
        abaCiclo,
        chaveUnica: itemSelecionado.chaveUnica || '',
        nomeOriginal: itemSelecionado.nomeOriginal || itemSelecionado.aluno,
        nis: itemSelecionado.nis || '',
        dataNascimento: itemSelecionado.dataNascimento || '',
        responsavelFamiliar: itemSelecionado.responsavelFamiliar || '',
        candidatoSelecionado: cand
      });
      await onConfirmado(itemSelecionado, resp);
      // Avança automaticamente mantendo o mesmo índice (que apontará para o próximo item da fila)
      setSelectedIndex((prev) => Math.max(0, Math.min(prev, Math.max(0, filaFiltrada.length - 2))));
    } catch (err: any) {
      setErroBusca(err?.message || 'Erro ao confirmar o vínculo do aluno.');
    } finally {
      setConfirmandoId('');
    }
  }

  if (pendencias.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
        <h3 className="text-base font-bold text-emerald-950">Nenhuma pendência nesta fila!</h3>
        <p className="text-xs text-emerald-800 mt-1">
          Todos os alunos desta categoria já foram conferidos e vinculados aos diários de classe.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* COLUNA ESQUERDA (40% -> 5 cols): FILA DE ALUNOS PENDENTES */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col max-h-[720px]">
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Fila de Pendências ({filaFiltrada.length})
            </span>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" /> Use as setas para navegar
            </span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filtroFila}
              onChange={(e) => {
                setFiltroFila(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Filtrar fila por nome, NIS ou motivo..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
          {filaFiltrada.map((item, idx) => {
            const ativo = itemSelecionado && (item.chaveUnica ? item.chaveUnica === itemSelecionado.chaveUnica : idx === selectedIndex);
            const isNaoEncontrado = /NAO ENCONTRADO|NÃO ENCONTRADO/i.test(String(item.status || item.motivoRevisao || ''));
            return (
              <button
                key={item.chaveUnica || `${item.aluno}_${idx}`}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                  ativo
                    ? 'bg-emerald-50/90 border-l-4 border-l-emerald-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-900 text-xs leading-snug">
                    {item.aluno || item.nomeOriginal}
                  </span>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isNaoEncontrado
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.motivoRevisao || item.status || 'Para Revisar'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  {item.nis && (
                    <span>
                      NIS: <strong className="font-mono text-slate-700">{item.nis}</strong>
                    </span>
                  )}
                  {item.dataNascimento && <span>Nasc.: {item.dataNascimento}</span>}
                  {item.turma && item.turma !== '-' && (
                    <span className="text-slate-700 font-medium">Turma: {item.turma}</span>
                  )}
                </div>

                {item.nomeSugerido && item.nomeSugerido !== item.aluno && (
                  <div className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/70 rounded-lg px-2 py-1">
                    Sugestão no diário: <strong>{item.nomeSugerido}</strong> ({item.similaridade || ''})
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* COLUNA DIREITA (60% -> 7 cols): INSPETOR E LOCALIZADOR NO DIÁRIO */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        {itemSelecionado ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Revisão Assistida Lado a Lado (Split-View)
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {itemSelecionado.aluno || itemSelecionado.nomeOriginal}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>
                    NIS: <strong className="font-mono text-slate-800">{itemSelecionado.nis || 'Não informado'}</strong>
                  </span>
                  {itemSelecionado.dataNascimento && (
                    <span>Dt. Nasc.: {itemSelecionado.dataNascimento}</span>
                  )}
                  {itemSelecionado.responsavelFamiliar && (
                    <span>Resp.: {itemSelecionado.responsavelFamiliar}</span>
                  )}
                </div>
              </div>

              {onAbrirAjusteFrequencia && (
                <button
                  type="button"
                  onClick={() => onAbrirAjusteFrequencia(itemSelecionado)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  Lançar P/F Manual Direto
                </button>
              )}
            </div>

            {/* Filtros inteligentes sem digitação desnecessária */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome no Diário (ou parte do nome)
                  </label>
                  <input
                    type="text"
                    value={nomeDiario}
                    onChange={(e) => setNomeDiario(e.target.value)}
                    placeholder="Ex.: MARIA CLARA..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ano/Série ou Turma (JD = JARDIM)
                  </label>
                  <input
                    type="text"
                    value={turma}
                    onChange={(e) => setTurma(e.target.value)}
                    placeholder="Ex.: JARDIM II B ou 3º ANO A"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nº Chamada
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={numeroChamada}
                    onChange={(e) => setNumeroChamada(e.target.value)}
                    placeholder="Ex.: 14"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium"
                  />
                </div>
              </div>

              {/* Chips rápidos de Séries e Turmas conhecidas */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-500">
                  Atalhos rápidos de Série / Turma (clique para filtrar sem digitar):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAnoSerie('');
                      setTurma('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                      !turma && !anoSerie
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Todas as Turmas
                  </button>
                  {opcoesSeriesETurmas.seriesPadrao.map((serie) => (
                    <button
                      key={serie}
                      type="button"
                      onClick={() => setTurma(serie)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                        turma === serie
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {serie}
                    </button>
                  ))}
                </div>
                {opcoesSeriesETurmas.turmasCompletas.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 max-h-20 overflow-y-auto">
                    {opcoesSeriesETurmas.turmasCompletas.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTurma(t)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                          turma === t
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Ao confirmar, o vínculo <strong>NIS ↔ Aluno</strong> é memorizado para os próximos ciclos.
                </span>
                <button
                  type="button"
                  onClick={handleBuscarCandidatos}
                  disabled={buscando}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  {buscando ? 'Buscando nos Diários...' : 'Buscar Frequência no Ciclo'}
                </button>
              </div>
            </div>

            {erroBusca && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                {erroBusca}
              </div>
            )}

            {avisoBusca && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {avisoBusca}
              </div>
            )}

            {/* Lista de candidatos encontrados com resumo dos 2 meses do ciclo */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-700">
                Candidatos Encontrados nos Diários ({candidatos.length})
              </div>

              {candidatos.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  Clique em <strong>"Buscar Frequência no Ciclo"</strong> para localizar o aluno nos diários de classe.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {candidatos.map((cand, idx) => {
                    const chaveCand = `${cand.arquivoId}_${cand.abaNome}_${cand.nomeDiario}`;
                    const ResumoMeses = Array.isArray(cand.mesesCiclo) ? cand.mesesCiclo : [];
                    const dadosIncompletos =
                      cand.dadosIncompletos ||
                      /INCOMPLETO|SEM AULA/i.test(String(cand.statusSugerido || cand.diagnostico || ''));

                    return (
                      <div
                        key={`${chaveCand}_${idx}`}
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {cand.nomeDiario || cand.nome}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold">
                              {cand.turma || '-'}
                            </span>
                            {cand.numeroChamada && (
                              <span className="text-[11px] text-slate-500">
                                Nº {cand.numeroChamada}
                              </span>
                            )}
                            {cand.scoreSimilaridade !== undefined && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                Similaridade {Math.round(Number(cand.scoreSimilaridade) * 100)}%
                              </span>
                            )}
                            {dadosIncompletos && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                                <AlertTriangle className="w-3 h-3" /> Dados incompletos em 1 dos meses
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                              {cand.arquivoNome || 'Diário'} ({cand.abaNome || 'Aba'})
                            </span>
                            {cand.situacaoMatricula && cand.situacaoMatricula !== 'ATIVO' && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                {cand.situacaoMatricula}
                              </span>
                            )}
                          </div>

                          {ResumoMeses.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {ResumoMeses.map((m: any, mIdx: number) => (
                                <div
                                  key={mIdx}
                                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                                >
                                  <strong className="text-slate-700">{m.nomeMes || `Mês ${mIdx + 1}`}:</strong>{' '}
                                  <span className="font-bold text-slate-900">
                                    {m.frequencia || m.percentualFormatado || '-'}
                                  </span>{' '}
                                  <span className="text-slate-500">
                                    (P: {m.presencas ?? '-'} | F: {m.faltas ?? '-'})
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-700 pt-0.5">
                              Frequência apurada:{' '}
                              <strong className="text-emerald-700">
                                {cand.frequencia || cand.resumoFrequencia || 'Consolidada ao confirmar'}
                              </strong>{' '}
                              {cand.presencas !== undefined && (
                                <span className="text-slate-500">
                                  (P: {cand.presencas} | F: {cand.faltas})
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={confirmandoId === chaveCand}
                          onClick={() => handleConfirmarCandidato(cand)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {confirmandoId === chaveCand
                            ? 'Confirmando...'
                            : 'Confirmar Aluno e Atualizar Ciclo'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
