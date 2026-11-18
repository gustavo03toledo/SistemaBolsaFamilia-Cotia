import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  FileCheck2,
  GraduationCap,
  Printer,
  RotateCcw,
  School,
  Search,
  Settings2,
  Sparkles,
  Square,
  UserCheck,
  Users
} from 'lucide-react';
import { obterNomeTurmaDaPlanilha } from '../services/sedExtractor';
import { TurmaListaPilotoDrive } from '../types/sbf';

export type TipoDeclaracaoEscolar = 'matricula' | 'transferencia' | 'conclusao';

export interface CandidatoAlunoDeclaracaoGeral {
  id: string;
  nome: string;
  ra: string;
  dataNascimento: string;
  rm: string;
  turma: string;
  serieAno: string;
  turno: 'MANHA' | 'TARDE';
  horarioInicio: string;
  horarioFim: string;
  situacao: string;
  origem: 'LISTA_PILOTO' | 'DIARIO' | 'BOLSA';
}

interface ConfigCabecalhoEscola {
  nomeCurto: string;
  nomeExtenso: string;
  endereco: string;
  telefone: string;
  email: string;
  cidade: string;
  cargoAssinatura: string;
  exibirObsValidade: boolean;
  exibirCaixaCheckModelo: boolean;
}

const STORAGE_KEY_CONFIG_ESCOLA_DEC = 'SBF_CONFIG_CABECALHO_ESCOLA_DECLARACOES_V1';

const CONFIG_ESCOLA_PADRAO: ConfigCabecalhoEscola = {
  nomeCurto: 'EM JARDIM PANORAMA',
  nomeExtenso: 'ESCOLA MUNICIPAL JARDIM PANORAMA',
  endereco: 'Estrada Velha da Olaria, 2451 – Jardim Panorama – Cotia / SP',
  telefone: '(11) 4243-9770',
  email: 'emjardimpanorama@cotia.sp.gov.br',
  cidade: 'Cotia',
  cargoAssinatura: 'Direção / Secretaria Escolar',
  exibirObsValidade: true,
  exibirCaixaCheckModelo: true
};

const MESES_EXTENSO = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
];

function extrairSerieAnoDeTurma(turmaStr: string): {
  serieAno: string;
  turmaCompleta: string;
  ciclo: string;
  modalidade: string;
  turno: 'MANHA' | 'TARDE';
  horarioInicio: string;
  horarioFim: string;
} {
  const t = String(turmaStr || '').toUpperCase();
  const ehTarde = /\b(TARDE|VESPERTINO|13:00)\b/.test(t);
  const turno: 'MANHA' | 'TARDE' = ehTarde ? 'TARDE' : 'MANHA';
  const horarioInicio = ehTarde ? '13:00' : '07:00';
  const horarioFim = ehTarde ? '17:40' : '11:40';

  const mFund = t.match(/\b([1-9])\s*(?:º|°|O)?\s*ANO\s*([A-H])?\b/);
  if (mFund) {
    const num = mFund[1];
    const letra = mFund[2] || '';
    const serieAno = `${num}º ANO`;
    const turmaCompleta = letra ? `${num}º ANO ${letra}` : serieAno;
    const ciclo = Number(num) <= 5 ? 'I' : 'II';
    return {
      serieAno,
      turmaCompleta,
      ciclo,
      modalidade: 'ENSINO FUNDAMENTAL',
      turno,
      horarioInicio,
      horarioFim
    };
  }

  if (/\b(PRE|PRÉ|ETAPA|INFANTIL|MATERNAL|BERCARIO|JARDIM)\b/.test(t)) {
    const limpo = turmaStr
      .replace(/\s*-\s*(MANHA|MANHÃ|TARDE).*$/i, '')
      .replace(/\s*-\s*LISTA\s*PILOTO.*$/i, '')
      .trim();
    return {
      serieAno: limpo || 'PRÉ-ESCOLA',
      turmaCompleta: limpo || 'PRÉ-ESCOLA',
      ciclo: 'I',
      modalidade: 'EDUCAÇÃO INFANTIL',
      turno,
      horarioInicio,
      horarioFim
    };
  }

  const limpoGeral = turmaStr
    .replace(/\s*-\s*(MANHA|MANHÃ|TARDE).*$/i, '')
    .replace(/\s*-\s*LISTA\s*PILOTO.*$/i, '')
    .trim();

  return {
    serieAno: limpoGeral || '1º ANO',
    turmaCompleta: limpoGeral || '1º ANO A',
    ciclo: 'I',
    modalidade: 'ENSINO FUNDAMENTAL',
    turno,
    horarioInicio,
    horarioFim
  };
}

interface DeclaracoesEscolaresViewProps {
  tipoDeclaracao: TipoDeclaracaoEscolar;
  anoReferencia: number;
  turmasPiloto: TurmaListaPilotoDrive[];
  alunosSugeridosDiarios: Array<{
    nome: string;
    turma: string;
    ra?: string;
    dataNascimento?: string;
  }>;
  alunoInicial?: {
    nome: string;
    ra?: string;
    dataNascimento?: string;
    turma?: string;
  } | null;
  onClearAlunoInicial?: () => void;
}

export const DeclaracoesEscolaresView: React.FC<DeclaracoesEscolaresViewProps> = ({
  tipoDeclaracao,
  anoReferencia,
  turmasPiloto,
  alunosSugeridosDiarios,
  alunoInicial,
  onClearAlunoInicial
}) => {
  // Configuração institucional da escola (persistida localmente)
  const [configEscola, setConfigEscola] = useState<ConfigCabecalhoEscola>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY_CONFIG_ESCOLA_DEC);
      if (salvo) {
        return { ...CONFIG_ESCOLA_PADRAO, ...JSON.parse(salvo) };
      }
    } catch {}
    return CONFIG_ESCOLA_PADRAO;
  });
  const [mostrarConfigEscola, setMostrarConfigEscola] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG_ESCOLA_DEC, JSON.stringify(configEscola));
    } catch {}
  }, [configEscola]);

  // Data de emissão no rodapé
  const hoje = useMemo(() => new Date(), []);
  const [diaEmissao, setDiaEmissao] = useState<string>(() =>
    String(hoje.getDate()).padStart(2, '0')
  );
  const [mesEmissao, setMesEmissao] = useState<string>(
    () => MESES_EXTENSO[hoje.getMonth()] || 'novembro'
  );
  const [anoEmissao, setAnoEmissao] = useState<string>(() =>
    String(anoReferencia || hoje.getFullYear())
  );

  // =========================================================================
  // ESTADO DOS CAMPOS: DECLARAÇÃO INDIVIDUAL (MATRÍCULA / TRANSFERÊNCIA / CONCLUSÃO INDIVIDUAL)
  // =========================================================================
  const [buscaAluno, setBuscaAluno] = useState<string>('');
  const [mostrarSugestoes, setMostrarSugestoes] = useState<boolean>(false);

  const [nomeAluno, setNomeAluno] = useState<string>('');
  const [raAluno, setRaAluno] = useState<string>('');
  const [dataNascimentoAluno, setDataNascimentoAluno] = useState<string>('');

  // Campos de Matrícula
  const [anoTurmaMatricula, setAnoTurmaMatricula] = useState<string>('1º ANO A');
  const [cicloEnsinoMatricula, setCicloEnsinoMatricula] = useState<string>(
    'Ciclo I do Ensino Fundamental'
  );
  const [horarioInicio, setHorarioInicio] = useState<string>('07:00');
  const [horarioFim, setHorarioFim] = useState<string>('11:40');
  const [observacaoExtra, setObservacaoExtra] = useState<string>('');

  // Campos de Solicitação de Transferência
  const [serieAnoTransferencia, setSerieAnoTransferencia] = useState<string>('1º ANO');
  const [cicloTransferencia, setCicloTransferencia] = useState<string>('I');
  const [modalidadeTransferencia, setModalidadeTransferencia] = useState<string>(
    'Ensino Fundamental de 9 anos'
  );
  const [prazoEntregaDias, setPrazoEntregaDias] = useState<string>('40 dias');
  const [destacarPrazoAmarelo, setDestacarPrazoAmarelo] = useState<boolean>(true);

  // Campos de Conclusão (Individual e em Lote)
  const [modoConclusao, setModoConclusao] = useState<'INDIVIDUAL' | 'LOTE_TURMA'>('INDIVIDUAL');
  const [serieAnoConclusao, setSerieAnoConclusao] = useState<string>('5º ANO');
  const [cicloConclusao, setCicloConclusao] = useState<string>('I');
  const [modalidadeConclusao, setModalidadeConclusao] =
    useState<string>('ENSINO FUNDAMENTAL');
  const [anoLetivoConclusao, setAnoLetivoConclusao] = useState<string>(() =>
    String(anoReferencia || new Date().getFullYear())
  );

  // Estado para Emissão em Lote por Turma (Declaração de Conclusão)
  const [turmaLoteId, setTurmaLoteId] = useState<string>('');
  const [apenasAtivosNoLote, setApenasAtivosNoLote] = useState<boolean>(true);
  const [alunosLoteEditaveis, setAlunosLoteEditaveis] = useState<
    Array<{
      id: string;
      selecionado: boolean;
      nr: number;
      nome: string;
      ra: string;
      dataNascimento: string;
      situacao: string;
    }>
  >([]);

  // Unificar base de alunos para busca rápida (priorizando Listas Piloto que já têm RA e Nascimento!)
  const baseAlunosUnificada = useMemo<CandidatoAlunoDeclaracaoGeral[]>(() => {
    const mapa = new Map<string, CandidatoAlunoDeclaracaoGeral>();

    for (const t of turmasPiloto) {
      const nomeTurma = obterNomeTurmaDaPlanilha(t.planilhaNome || t.turmaExibicao);
      const infoT = extrairSerieAnoDeTurma(`${nomeTurma} ${t.horarios || ''}`);

      for (const a of t.alunos) {
        const chave = `${a.nomeNormalizado}::${nomeTurma}`;
        mapa.set(chave, {
          id: `${t.idUnico}-${a.nr}`,
          nome: a.nome,
          ra: a.ra || '',
          dataNascimento: a.dataNascimento || '',
          rm: a.rm || '',
          turma: nomeTurma,
          serieAno: infoT.serieAno,
          turno: infoT.turno,
          horarioInicio: infoT.horarioInicio,
          horarioFim: infoT.horarioFim,
          situacao: a.situacaoNormalizada || 'ATIVO',
          origem: 'LISTA_PILOTO'
        });
      }
    }

    for (const d of alunosSugeridosDiarios || []) {
      const nomeNorm = String(d.nome || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
      if (!nomeNorm) continue;
      const jaTem = Array.from(mapa.values()).some(
        (item) =>
          item.nome
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .trim() === nomeNorm
      );
      if (!jaTem) {
        const infoT = extrairSerieAnoDeTurma(d.turma || '');
        mapa.set(`${nomeNorm}::${d.turma}`, {
          id: `diario-${nomeNorm}-${d.turma}`,
          nome: d.nome,
          ra: d.ra || '',
          dataNascimento: d.dataNascimento || '',
          rm: '',
          turma: d.turma || '',
          serieAno: infoT.serieAno,
          turno: infoT.turno,
          horarioInicio: infoT.horarioInicio,
          horarioFim: infoT.horarioFim,
          situacao: 'ATIVO',
          origem: 'DIARIO'
        });
      }
    }

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [turmasPiloto, alunosSugeridosDiarios]);

  const sugestoesFiltradas = useMemo(() => {
    const q = buscaAluno.trim().toUpperCase();
    if (!q) return baseAlunosUnificada.slice(0, 12);
    return baseAlunosUnificada
      .filter(
        (c) =>
          c.nome.toUpperCase().includes(q) ||
          c.ra.toUpperCase().includes(q) ||
          c.rm.toUpperCase().includes(q) ||
          c.turma.toUpperCase().includes(q)
      )
      .slice(0, 15);
  }, [baseAlunosUnificada, buscaAluno]);

  function selecionarCandidatoAluno(cand: CandidatoAlunoDeclaracaoGeral) {
    setNomeAluno(cand.nome);
    setRaAluno(cand.ra);
    setDataNascimentoAluno(cand.dataNascimento);
    setBuscaAluno(cand.nome);
    setMostrarSugestoes(false);

    const info = extrairSerieAnoDeTurma(cand.turma);
    setAnoTurmaMatricula(info.turmaCompleta);
    setCicloEnsinoMatricula(
      info.modalidade === 'EDUCAÇÃO INFANTIL'
        ? 'Educação Infantil'
        : `Ciclo ${info.ciclo} do Ensino Fundamental`
    );
    setHorarioInicio(info.horarioInicio);
    setHorarioFim(info.horarioFim);

    setSerieAnoTransferencia(info.serieAno);
    setCicloTransferencia(info.ciclo);
    setModalidadeTransferencia(
      info.modalidade === 'EDUCAÇÃO INFANTIL'
        ? 'Educação Infantil'
        : 'Ensino Fundamental de 9 anos'
    );

    setSerieAnoConclusao(info.serieAno);
    setCicloConclusao(info.ciclo);
    setModalidadeConclusao(info.modalidade);
  }

  // Preencher aluno inicial vindo de outra tela (ex: Ficha do Aluno na Lista Piloto)
  useEffect(() => {
    if (!alunoInicial?.nome) return;
    const match = baseAlunosUnificada.find(
      (c) => c.nome.toUpperCase() === alunoInicial.nome.toUpperCase()
    );
    if (match) {
      selecionarCandidatoAluno(match);
    } else {
      setNomeAluno(alunoInicial.nome);
      setBuscaAluno(alunoInicial.nome);
      if (alunoInicial.ra) setRaAluno(alunoInicial.ra);
      if (alunoInicial.dataNascimento) setDataNascimentoAluno(alunoInicial.dataNascimento);
      if (alunoInicial.turma) {
        const info = extrairSerieAnoDeTurma(alunoInicial.turma);
        setAnoTurmaMatricula(info.turmaCompleta);
        setHorarioInicio(info.horarioInicio);
        setHorarioFim(info.horarioFim);
        setSerieAnoTransferencia(info.serieAno);
        setSerieAnoConclusao(info.serieAno);
      }
    }
    if (onClearAlunoInicial) onClearAlunoInicial();
  }, [alunoInicial]);

  // Inicializar turma padrão para o modo Lote de Conclusão (priorizando 5º Ano se existir)
  useEffect(() => {
    if (turmasPiloto.length > 0 && !turmaLoteId) {
      const quintoAno =
        turmasPiloto.find((t) => /5.*ANO/i.test(t.planilhaNome || t.turmaExibicao)) ||
        turmasPiloto[0];
      if (quintoAno) {
        carregarTurmaParaLoteConclusao(quintoAno.idUnico, apenasAtivosNoLote);
      }
    }
  }, [turmasPiloto]);

  function carregarTurmaParaLoteConclusao(idTurma: string, somenteAtivos: boolean) {
    setTurmaLoteId(idTurma);
    const turmaObj = turmasPiloto.find((t) => t.idUnico === idTurma);
    if (!turmaObj) {
      setAlunosLoteEditaveis([]);
      return;
    }

    const nomeTurma = obterNomeTurmaDaPlanilha(turmaObj.planilhaNome || turmaObj.turmaExibicao);
    const info = extrairSerieAnoDeTurma(nomeTurma);
    setSerieAnoConclusao(info.serieAno);
    setCicloConclusao(info.ciclo);
    setModalidadeConclusao(info.modalidade);

    const lista = turmaObj.alunos
      .filter((a) => !somenteAtivos || a.situacaoNormalizada === 'ATIVO')
      .map((a) => ({
        id: `${turmaObj.idUnico}-${a.nr}`,
        selecionado: a.situacaoNormalizada === 'ATIVO',
        nr: a.nr,
        nome: a.nome,
        ra: a.ra || '',
        dataNascimento: a.dataNascimento || '',
        situacao: a.situacaoNormalizada || 'ATIVO'
      }));

    setAlunosLoteEditaveis(lista);
  }

  function atualizarAlunoNoLote(
    id: string,
    campo: 'selecionado' | 'nome' | 'ra' | 'dataNascimento',
    valor: any
  ) {
    setAlunosLoteEditaveis((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  }

  function alternarTodosNoLote(marcar: boolean) {
    setAlunosLoteEditaveis((prev) => prev.map((item) => ({ ...item, selecionado: marcar })));
  }

  const alunosSelecionadosNoLote = useMemo(
    () => alunosLoteEditaveis.filter((a) => a.selecionado),
    [alunosLoteEditaveis]
  );

  // =========================================================================
  // RENDERIZADOR DE UMA PÁGINA A4 TIMBRADA OFICIAL DA DECLARAÇÃO
  // =========================================================================
  function renderFolhaDeclaracaoA4(
    dadosAluno: {
      nome: string;
      ra: string;
      dataNascimento: string;
    },
    isQuebraPagina = false,
    keyIndex = 0
  ) {
    return (
      <div
        key={keyIndex}
        className={`declaracao-a4-sheet bg-white shadow-xl mx-auto relative overflow-hidden text-black print:shadow-none ${
          isQuebraPagina ? 'print:break-after-page mb-8 print:mb-0' : ''
        }`}
        style={{
          width: '210mm',
          minHeight: '297mm',
          paddingTop: '42mm',
          paddingBottom: '32mm',
          paddingLeft: '22mm',
          paddingRight: '22mm',
          fontFamily: '"Comic Sans MS", "Trebuchet MS", Arial, sans-serif'
        }}
      >
        {/* Papel Timbrado Oficial de Fundo (Cotia Educação) */}
        <img
          src="/timbrado-cotia.png"
          alt="Papel Timbrado Secretaria Municipal de Educação de Cotia"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
        />

        <div className="relative z-10 flex flex-col justify-between h-full min-h-[218mm]">
          <div>
            {/* Identificação da Unidade Escolar no Topo */}
            <div className="text-center space-y-0.5 mb-8 text-[12.5px] leading-snug">
              <div className="font-bold uppercase tracking-wide text-[13.5px]">
                {configEscola.nomeCurto}
              </div>
              <div>{configEscola.endereco}</div>
              <div>Tel.: {configEscola.telefone}</div>
              <div>
                E-mail:{' '}
                <span className="underline text-blue-800 print:text-black">
                  {configEscola.email}
                </span>
              </div>
            </div>

            {/* Título Central */}
            <h1 className="text-center font-bold text-[22px] tracking-wider uppercase mb-10 underline decoration-1 underline-offset-4">
              DECLARAÇÃO
            </h1>

            {/* Parágrafo de Identificação do Aluno */}
            <div className="text-[15px] leading-relaxed space-y-4 mb-10">
              <p className="indent-10 text-justify">
                A Direção da <strong className="uppercase">{configEscola.nomeExtenso}</strong>{' '}
                declara para os devidos fins que,
              </p>

              <div className="border-b border-black pb-1 font-bold text-[16px] uppercase tracking-wide text-center min-h-[28px]">
                {dadosAluno.nome || '____________________________________________________'}
              </div>

              <div className="flex items-baseline justify-between gap-4 pt-1 text-[14.5px]">
                <div className="flex-1 flex items-baseline gap-2">
                  <span>R.A./R.G:</span>
                  <span className="flex-1 border-b border-black font-bold px-2 text-center">
                    {dadosAluno.ra || '_______________________'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span>Nascido(a) aos:</span>
                  <span className="border-b border-black font-bold px-3 min-w-[130px] text-center">
                    {dadosAluno.dataNascimento || '____/____/________'}
                  </span>
                  <span>.</span>
                </div>
              </div>
            </div>

            {/* Corpo Específico de Cada Tipo de Declaração */}
            <div className="mt-10 mb-8">
              {tipoDeclaracao === 'matricula' && (
                <div className="flex items-start gap-4 text-[15.5px] leading-loose">
                  {configEscola.exibirCaixaCheckModelo && (
                    <div className="w-9 h-9 border-2 border-black flex items-center justify-center font-bold text-lg shrink-0 mt-1">
                      X
                    </div>
                  )}
                  <p className="text-justify flex-1">
                    É aluno(a) regularmente matriculado(a) e está frequentando até a presente data o{' '}
                    <strong className="underline px-1.5 uppercase">
                      {anoTurmaMatricula || '_______ ANO'}
                    </strong>{' '}
                    do <strong>{cicloEnsinoMatricula || 'Ciclo I do Ensino Fundamental'}</strong>{' '}
                    nesta Unidade Escolar no horário das{' '}
                    <strong className="underline px-1.5">{horarioInicio || '07:00'}</strong> às{' '}
                    <strong className="underline px-1.5">{horarioFim || '11:40'}</strong> horas.
                  </p>
                </div>
              )}

              {tipoDeclaracao === 'transferencia' && (
                <div className="flex items-start gap-4 text-[15.5px] leading-loose">
                  {configEscola.exibirCaixaCheckModelo && (
                    <div className="w-9 h-9 border-2 border-black flex items-center justify-center font-bold text-lg shrink-0 mt-1">
                      X
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <p className="text-justify">
                      Solicitou, nesta data, sua transferência para outra Unidade Escolar, com
                      direito de matricular-se no{' '}
                      <strong className="underline px-2 uppercase">
                        {serieAnoTransferencia || '_____ ANO'}
                      </strong>{' '}
                      do Ciclo{' '}
                      <strong className="underline px-2">{cicloTransferencia || 'I'}</strong> do{' '}
                      <strong className="underline px-2">
                        {modalidadeTransferencia || 'Ensino Fundamental de 9 anos'}
                      </strong>
                      .
                    </p>
                    <p>
                      <span
                        className={
                          destacarPrazoAmarelo ? 'bg-yellow-300 px-1.5 py-0.5 font-semibold' : 'font-semibold'
                        }
                      >
                        Seu histórico/documentação será entregue em {prazoEntregaDias || '40 dias'}.
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {tipoDeclaracao === 'conclusao' && (
                <div className="flex items-start gap-4 text-[15.5px] leading-loose">
                  {configEscola.exibirCaixaCheckModelo && (
                    <div className="w-9 h-9 border-2 border-black flex items-center justify-center font-bold text-lg shrink-0 mt-1">
                      X
                    </div>
                  )}
                  <p className="text-justify flex-1">
                    Concluiu o(a){' '}
                    <strong className="underline px-2 uppercase">
                      {serieAnoConclusao || '5º ANO'}
                    </strong>{' '}
                    do Ciclo{' '}
                    <strong className="underline px-2">{cicloConclusao || 'I'}</strong> do(a){' '}
                    <strong className="underline px-2 uppercase">
                      {modalidadeConclusao || 'ENSINO FUNDAMENTAL'}
                    </strong>
                    , no ano letivo de{' '}
                    <strong className="underline px-2">{anoLetivoConclusao || '2026'}</strong>,
                    nesta Unidade Escolar.
                  </p>
                </div>
              )}

              {observacaoExtra.trim() && (
                <div className="mt-6 text-[14px] leading-relaxed border-t border-slate-300 pt-3">
                  <strong>Observação:</strong> {observacaoExtra}
                </div>
              )}
            </div>
          </div>

          {/* Rodapé com OBS, Data e Assinatura */}
          <div className="space-y-12 pt-8 text-[14.5px]">
            {configEscola.exibirObsValidade && (
              <p className="text-[13.5px]">
                <strong className="underline">OBS.:</strong> Esta declaração só é válida sem
                rasuras.
              </p>
            )}

            <div className="text-right pr-4 text-[15px]">
              {configEscola.cidade},{' '}
              <span className="inline-block border-b border-black min-w-[36px] text-center font-semibold">
                {diaEmissao}
              </span>{' '}
              de{' '}
              <span className="inline-block border-b border-black min-w-[130px] text-center font-semibold">
                {mesEmissao}
              </span>{' '}
              de <span className="font-semibold">{anoEmissao}</span>.
            </div>

            <div className="pt-8 flex flex-col items-end pr-4">
              <div className="w-80 border-t border-black pt-1.5 text-center text-[13px] font-semibold">
                {configEscola.cargoAssinatura}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* PAINEL DE CONTROLE E CONFIGURAÇÃO (OCULTO NA IMPRESSÃO) */}
      <div className="no-print space-y-5">
        {/* Cabeçalho do Tipo de Declaração */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              {tipoDeclaracao === 'matricula' && 'Modelo 1 • Declaração de Matrícula e Frequência'}
              {tipoDeclaracao === 'transferencia' &&
                'Modelo 2 • Declaração de Solicitação de Transferência'}
              {tipoDeclaracao === 'conclusao' &&
                'Modelo 3 • Declaração de Conclusão (Individual ou Lote por Turma)'}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {tipoDeclaracao === 'matricula' &&
                'Emissão de Declaração de Matrícula (Com Ano/Turma e Horário)'}
              {tipoDeclaracao === 'transferencia' &&
                'Emissão de Declaração de Solicitação de Transferência'}
              {tipoDeclaracao === 'conclusao' &&
                'Emissão de Declaração de Conclusão do Ensino Fundamental'}
            </h2>
            <p className="text-xs text-slate-600">
              {tipoDeclaracao === 'matricula' &&
                'Preenche automaticamente Nome, RA, Nascimento, Ano/Turma e Horário (Manhã 07:00 às 11:40 | Tarde 13:00 às 17:40), sem o trecho de faltas.'}
              {tipoDeclaracao === 'transferencia' &&
                'Declaração oficial de solicitação de transferência com direito à matrícula e prazo de entrega do histórico escolar.'}
              {tipoDeclaracao === 'conclusao' &&
                'Permite emitir para um aluno específico ou gerar em lote para todos os alunos ativos de uma turma de uma só vez.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMostrarConfigEscola(!mostrarConfigEscola)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-slate-600" />
              Configurar Cabeçalho da Escola
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {tipoDeclaracao === 'conclusao' && modoConclusao === 'LOTE_TURMA'
                ? `Imprimir Lote Selecionado (${alunosSelecionadosNoLote.length})`
                : 'Imprimir / Salvar PDF (A4)'}
            </button>
          </div>
        </div>

        {/* Painel Expansível: Configurar Dados da Escola no Cabeçalho */}
        {mostrarConfigEscola && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <School className="w-4 h-4 text-amber-600" />
                Dados Configuráveis da Unidade Escolar no Papel Timbrado
              </h3>
              <button
                type="button"
                onClick={() => setConfigEscola(CONFIG_ESCOLA_PADRAO)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Padrão EM Jardim Panorama
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome Curto (Topo do Timbrado)
                </label>
                <input
                  type="text"
                  value={configEscola.nomeCurto}
                  onChange={(e) =>
                    setConfigEscola({ ...configEscola, nomeCurto: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Nome por Extenso (Corpo da Declaração)
                </label>
                <input
                  type="text"
                  value={configEscola.nomeExtenso}
                  onChange={(e) =>
                    setConfigEscola({ ...configEscola, nomeExtenso: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={configEscola.endereco}
                  onChange={(e) =>
                    setConfigEscola({ ...configEscola, endereco: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={configEscola.telefone}
                  onChange={(e) =>
                    setConfigEscola({ ...configEscola, telefone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail da Escola</label>
                <input
                  type="text"
                  value={configEscola.email}
                  onChange={(e) => setConfigEscola({ ...configEscola, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cidade (Data)</label>
                <input
                  type="text"
                  value={configEscola.cidade}
                  onChange={(e) => setConfigEscola({ ...configEscola, cidade: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Rótulo da Linha de Assinatura
                </label>
                <input
                  type="text"
                  value={configEscola.cargoAssinatura}
                  onChange={(e) =>
                    setConfigEscola({ ...configEscola, cargoAssinatura: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configEscola.exibirCaixaCheckModelo}
                  onChange={(e) =>
                    setConfigEscola({
                      ...configEscola,
                      exibirCaixaCheckModelo: e.target.checked
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-amber-600"
                />
                <span className="font-semibold text-slate-700">
                  Exibir quadro marcado <code>[ X ]</code> igual ao modelo impresso
                </span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configEscola.exibirObsValidade}
                  onChange={(e) =>
                    setConfigEscola({
                      ...configEscola,
                      exibirObsValidade: e.target.checked
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-amber-600"
                />
                <span className="font-semibold text-slate-700">
                  Exibir observação de validade sem rasuras no rodapé
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Se for Declaração de Conclusão: Seletor de Modo (Aluno Específico vs Lote da Turma) */}
        {tipoDeclaracao === 'conclusao' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-bold text-slate-900">
                Modo de Emissão da Declaração de Conclusão:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModoConclusao('INDIVIDUAL')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  modoConclusao === 'INDIVIDUAL'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Aluno Específico (Individual)
              </button>

              <button
                type="button"
                onClick={() => setModoConclusao('LOTE_TURMA')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  modoConclusao === 'LOTE_TURMA'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                Emitir em Lote por Turma (Todos os Alunos Ativos)
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            FORMULÁRIO DE EDIÇÃO (MODO INDIVIDUAL OU LOTE)
        =================================================================== */}
        {tipoDeclaracao === 'conclusao' && modoConclusao === 'LOTE_TURMA' ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Selecionar Turma (das Listas Piloto):
                </label>
                <select
                  value={turmaLoteId}
                  onChange={(e) =>
                    carregarTurmaParaLoteConclusao(e.target.value, apenasAtivosNoLote)
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900"
                >
                  {turmasPiloto.length === 0 && (
                    <option value="">
                      Nenhuma Lista Piloto carregada (conecte na aba Lista Piloto)
                    </option>
                  )}
                  {turmasPiloto.map((t) => (
                    <option key={t.idUnico} value={t.idUnico}>
                      {obterNomeTurmaDaPlanilha(t.planilhaNome)} ({t.totalAtivos} ativos)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Série/Ano Concluído</label>
                <input
                  type="text"
                  value={serieAnoConclusao}
                  onChange={(e) => setSerieAnoConclusao(e.target.value)}
                  placeholder="Ex: 5º ANO"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ciclo / Ensino</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={cicloConclusao}
                    onChange={(e) => setCicloConclusao(e.target.value)}
                    placeholder="I"
                    className="w-14 px-2 py-2.5 rounded-xl border border-slate-300 text-center font-bold"
                  />
                  <input
                    type="text"
                    value={modalidadeConclusao}
                    onChange={(e) => setModalidadeConclusao(e.target.value)}
                    placeholder="ENSINO FUNDAMENTAL"
                    className="flex-1 px-2.5 py-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ano Letivo</label>
                <input
                  type="text"
                  value={anoLetivoConclusao}
                  onChange={(e) => setAnoLetivoConclusao(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-center"
                />
              </div>
            </div>

            {/* Seleção dos Alunos da Turma para o Lote */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-800">
                    Alunos da Turma Selecionados para Impressão:{' '}
                    <strong className="text-indigo-600">
                      {alunosSelecionadosNoLote.length} de {alunosLoteEditaveis.length}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => alternarTodosNoLote(true)}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarTodosNoLote(false)}
                    className="text-xs font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    Desmarcar Todos
                  </button>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={apenasAtivosNoLote}
                    onChange={(e) => {
                      setApenasAtivosNoLote(e.target.checked);
                      carregarTurmaParaLoteConclusao(turmaLoteId, e.target.checked);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                  />
                  Listar apenas alunos ATIVOS da turma
                </label>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-12 text-center">Emitir</th>
                      <th className="py-2 px-2 w-12 text-center">N°</th>
                      <th className="py-2 px-3">Nome do Aluno (Editável)</th>
                      <th className="py-2 px-3 w-44">R.A. (Editável)</th>
                      <th className="py-2 px-3 w-40">Data Nasc. (Editável)</th>
                      <th className="py-2 px-2 w-24 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {alunosLoteEditaveis.map((al) => (
                      <tr
                        key={al.id}
                        className={al.selecionado ? 'bg-indigo-50/30' : 'opacity-60 bg-slate-50'}
                      >
                        <td className="py-1.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={al.selecionado}
                            onChange={(e) =>
                              atualizarAlunoNoLote(al.id, 'selecionado', e.target.checked)
                            }
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold">{al.nr}</td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={al.nome}
                            onChange={(e) =>
                              atualizarAlunoNoLote(al.id, 'nome', e.target.value)
                            }
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent focus:bg-white font-semibold"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={al.ra}
                            onChange={(e) => atualizarAlunoNoLote(al.id, 'ra', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent focus:bg-white font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={al.dataNascimento}
                            onChange={(e) =>
                              atualizarAlunoNoLote(al.id, 'dataNascimento', e.target.value)
                            }
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent focus:bg-white"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold text-[11px]">
                          {al.situacao}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* MODO INDIVIDUAL (MATRÍCULA, TRANSFERÊNCIA OU CONCLUSÃO DE 1 ALUNO) */
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
            {/* Barra de Busca Automática de Aluno */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Buscar Aluno Cadastrado (Preenche Nome, RA, Nascimento, Turma e Horário):
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={buscaAluno}
                  onFocus={() => setMostrarSugestoes(true)}
                  onChange={(e) => {
                    setBuscaAluno(e.target.value);
                    setMostrarSugestoes(true);
                  }}
                  placeholder="Digite o nome, RA, RM ou turma do aluno para preencher automaticamente..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-amber-600 outline-none"
                />
              </div>

              {mostrarSugestoes && sugestoesFiltradas.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-30 divide-y divide-slate-100">
                  {sugestoesFiltradas.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => selecionarCandidatoAluno(cand)}
                      className="w-full text-left px-4 py-2.5 hover:bg-amber-50 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{cand.nome}</div>
                        <div className="text-[11px] text-slate-500">
                          RA: {cand.ra || 'Não inf.'} • Nasc: {cand.dataNascimento || 'Não inf.'}
                          {cand.rm ? ` • RM: ${cand.rm}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-bold">
                          {cand.turma}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {cand.horarioInicio} às {cand.horarioFim}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dados Pessoais Editáveis do Aluno */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Nome do Aluno(a)</label>
                <input
                  type="text"
                  value={nomeAluno}
                  onChange={(e) => setNomeAluno(e.target.value)}
                  placeholder="Nome completo do aluno"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">R.A. / R.G.</label>
                <input
                  type="text"
                  value={raAluno}
                  onChange={(e) => setRaAluno(e.target.value)}
                  placeholder="Ex: 124986400-8"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="text"
                  value={dataNascimentoAluno}
                  onChange={(e) => setDataNascimentoAluno(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
            </div>

            {/* Campos Específicos por Tipo de Declaração */}
            {tipoDeclaracao === 'matricula' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ano e Turma do Aluno
                  </label>
                  <input
                    type="text"
                    value={anoTurmaMatricula}
                    onChange={(e) => setAnoTurmaMatricula(e.target.value)}
                    placeholder="Ex: 1º ANO A"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ciclo / Ensino</label>
                  <input
                    type="text"
                    value={cicloEnsinoMatricula}
                    onChange={(e) => setCicloEnsinoMatricula(e.target.value)}
                    placeholder="Ciclo I do Ensino Fundamental"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Horário de Aula (Manhã: 07:00 às 11:40 | Tarde: 13:00 às 17:40)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={horarioInicio}
                      onChange={(e) => setHorarioInicio(e.target.value)}
                      className="w-20 px-2.5 py-2 rounded-xl border border-slate-300 text-center font-bold"
                    />
                    <span>às</span>
                    <input
                      type="text"
                      value={horarioFim}
                      onChange={(e) => setHorarioFim(e.target.value)}
                      className="w-20 px-2.5 py-2 rounded-xl border border-slate-300 text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setHorarioInicio('07:00');
                        setHorarioFim('11:40');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg font-bold cursor-pointer ${
                        horarioInicio === '07:00'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Manhã (07:00-11:40)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHorarioInicio('13:00');
                        setHorarioFim('17:40');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg font-bold cursor-pointer ${
                        horarioInicio === '13:00'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Tarde (13:00-17:40)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tipoDeclaracao === 'transferencia' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Direito de Matricular-se no (Série/Ano)
                  </label>
                  <input
                    type="text"
                    value={serieAnoTransferencia}
                    onChange={(e) => setSerieAnoTransferencia(e.target.value)}
                    placeholder="Ex: 1º ANO"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ciclo</label>
                  <input
                    type="text"
                    value={cicloTransferencia}
                    onChange={(e) => setCicloTransferencia(e.target.value)}
                    placeholder="I"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Modalidade</label>
                  <input
                    type="text"
                    value={modalidadeTransferencia}
                    onChange={(e) => setModalidadeTransferencia(e.target.value)}
                    placeholder="Ensino Fundamental de 9 anos"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Prazo Entrega Histórico
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={prazoEntregaDias}
                      onChange={(e) => setPrazoEntregaDias(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-bold"
                    />
                    <label
                      className="inline-flex items-center gap-1 text-[11px] font-semibold bg-yellow-100 px-2 py-1.5 rounded-lg border border-yellow-300 cursor-pointer"
                      title="Destacar frase do prazo em amarelo"
                    >
                      <input
                        type="checkbox"
                        checked={destacarPrazoAmarelo}
                        onChange={(e) => setDestacarPrazoAmarelo(e.target.checked)}
                      />
                      Grifar
                    </label>
                  </div>
                </div>
              </div>
            )}

            {tipoDeclaracao === 'conclusao' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Concluiu o(a) (Série/Ano)
                  </label>
                  <input
                    type="text"
                    value={serieAnoConclusao}
                    onChange={(e) => setSerieAnoConclusao(e.target.value)}
                    placeholder="Ex: 5º ANO"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Do Ciclo</label>
                  <input
                    type="text"
                    value={cicloConclusao}
                    onChange={(e) => setCicloConclusao(e.target.value)}
                    placeholder="I"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Modalidade</label>
                  <input
                    type="text"
                    value={modalidadeConclusao}
                    onChange={(e) => setModalidadeConclusao(e.target.value)}
                    placeholder="ENSINO FUNDAMENTAL"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">No Ano Letivo de</label>
                  <input
                    type="text"
                    value={anoLetivoConclusao}
                    onChange={(e) => setAnoLetivoConclusao(e.target.value)}
                    placeholder="2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>
            )}

            {/* Data de Emissão e Observação Opcional */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Observação Complementar (Opcional)
                </label>
                <input
                  type="text"
                  value={observacaoExtra}
                  onChange={(e) => setObservacaoExtra(e.target.value)}
                  placeholder="Deixe em branco caso não queira acrescentar observação extra..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Data de Emissão no Documento ({configEscola.cidade})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={diaEmissao}
                    onChange={(e) => setDiaEmissao(e.target.value)}
                    className="w-16 px-2.5 py-2 rounded-xl border border-slate-300 text-center font-bold"
                  />
                  <span>de</span>
                  <input
                    type="text"
                    value={mesEmissao}
                    onChange={(e) => setMesEmissao(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-center font-bold"
                  />
                  <span>de</span>
                  <input
                    type="text"
                    value={anoEmissao}
                    onChange={(e) => setAnoEmissao(e.target.value)}
                    className="w-20 px-2.5 py-2 rounded-xl border border-slate-300 text-center font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          PRÉ-VISUALIZAÇÃO E ÁREA DE IMPRESSÃO A4 (COM PAPEL TIMBRADO OFICIAL)
      ===================================================================== */}
      <div className="print:m-0 print:p-0">
        {tipoDeclaracao === 'conclusao' && modoConclusao === 'LOTE_TURMA' ? (
          alunosSelecionadosNoLote.length === 0 ? (
            <div className="no-print bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              Selecione ao menos um aluno ativo na tabela acima para gerar as declarações de
              conclusão em lote.
            </div>
          ) : (
            <div>
              {alunosSelecionadosNoLote.map((al, idx) =>
                renderFolhaDeclaracaoA4(
                  {
                    nome: al.nome,
                    ra: al.ra,
                    dataNascimento: al.dataNascimento
                  },
                  idx < alunosSelecionadosNoLote.length - 1,
                  idx
                )
              )}
            </div>
          )
        ) : (
          renderFolhaDeclaracaoA4({
            nome: nomeAluno,
            ra: raAluno,
            dataNascimento: dataNascimentoAluno
          })
        )}
      </div>
    </div>
  );
};
