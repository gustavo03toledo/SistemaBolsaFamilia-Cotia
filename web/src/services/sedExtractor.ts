import {
  AlunoListaPilotoDrive,
  AlunoRelatorioSed,
  ComparacaoTurmaPiloto,
  MudancaDetectadaPiloto,
  TurmaListaPilotoDrive,
  TurmaRelatorioSed
} from '../types/sbf';

export function removerAcentos(texto: string): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizarNomeAluno(nome: string): string {
  return removerAcentos(nome)
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizarSituacaoEscolar(sit: string): string {
  const limpo = removerAcentos(sit).toUpperCase().replace(/[^A-Z]/g, '');
  if (!limpo || limpo === 'ATIVO' || limpo === 'MATRICULADO' || limpo === 'FREQUENTE') {
    return 'ATIVO';
  }
  if (limpo === 'TR' || limpo === 'TRAN' || limpo === 'TRANSF' || limpo === 'TRANSFERIDO') {
    return 'TRAN';
  }
  if (limpo === 'BXTR' || limpo === 'BAIXATRANSF' || limpo === 'BAIXATRANSFERENCIA') {
    return 'BXTR';
  }
  if (limpo === 'NCOM' || limpo === 'NCON' || limpo === 'NAOCOMPARECIMENTO') {
    return 'NCOM';
  }
  if (limpo === 'REMA' || limpo === 'REM' || limpo === 'REMANEJADO' || limpo === 'REMANEJAMENTO') {
    return 'REMA';
  }
  if (limpo === 'CEDE' || limpo === 'CESSAO' || limpo === 'DESISTENCIA') {
    return 'CEDE';
  }
  if (limpo === 'ABAN' || limpo === 'ABANDONO') {
    return 'ABAN';
  }
  return limpo;
}

export function obterRotuloSituacao(sigla: string): string {
  const s = normalizarSituacaoEscolar(sigla);
  switch (s) {
    case 'ATIVO':
      return 'ATIVO (Matriculado)';
    case 'BXTR':
      return 'BXTR (Baixa por Transferência)';
    case 'TRAN':
      return 'TRAN (Transferido)';
    case 'NCOM':
      return 'NCOM (Não Comparecimento)';
    case 'REMA':
      return 'REMA (Remanejado)';
    case 'CEDE':
      return 'CEDE (Cessão por Desistência)';
    case 'ABAN':
      return 'ABAN (Abandono)';
    default:
      return s;
  }
}

export function extrairDiaMesCurto(dataStr: string): string {
  const limpo = String(dataStr || '').trim();
  if (!limpo) return '';
  const m = limpo.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return limpo;
  const dia = ('0' + m[1]).slice(-2);
  const mes = ('0' + m[2]).slice(-2);
  return `${dia}/${mes}`;
}

export function extrairRaBaseLimpo(raStr: string): string {
  const limpo = String(raStr || '').toUpperCase().trim();
  if (!limpo) return '';
  const partes = limpo.split('-');
  return partes[0].replace(/\D+/g, '').replace(/^0+/, '');
}

export function extrairCodigoCanonicoTurma(texto: string): string {
  const t = removerAcentos(texto).toUpperCase();

  // 1. AEE (Atendimento Educacional Especializado)
  const mAee = t.match(/\bAEE\s*([A-Z])\b/);
  if (mAee) {
    return `AEE_${mAee[1]}`;
  }

  // 2. Educação Infantil / Pré-Escola / Etapa / Maternal / Berçário
  if (/\b(PRE|ETAPA|INFANTIL|FASE|MATERNAL|BERCARIO|JARDIM)\b/.test(t)) {
    let etapaNum = '';
    const mEtapa =
      t.match(/\b([123I]{1,3})\s*(?:A|ª|º|°)?\s*(?:ETAPA|PRE|FASE|INFANTIL)\b/) ||
      t.match(/\b(?:ETAPA|PRE|FASE|INFANTIL)\s*([123I]{1,3})\b/);
    if (mEtapa) {
      const rawE = mEtapa[1];
      etapaNum = rawE === 'I' ? '1' : rawE === 'II' ? '2' : rawE === 'III' ? '3' : rawE;
    }
    const mLetraPre = t.match(/\b(?:ETAPA|PRE(?:-ESCOLA)?|INFANTIL|FASE)\s*(?:[123I]+\s*)?([A-H])\b/);
    let letraPre = mLetraPre ? mLetraPre[1] : '';
    if (!letraPre) {
      const mLetraSolta = t.match(/\b([A-H])\s+(?:MANHA|TARDE|INTEGRAL|ANUAL)\b/);
      if (mLetraSolta) letraPre = mLetraSolta[1];
    }
    return `PRE_${etapaNum}${letraPre}`;
  }

  // 3. Ensino Fundamental (1º ao 9º Ano)
  const mFund = t.match(/\b([1-9])\s*(?:º|°|O)?\s*(?:ANO\s*)?([A-H])\b/);
  if (mFund) {
    return `FUND_${mFund[1]}${mFund[2]}`;
  }

  return t.replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

export function formatarNomeCurtoTurma(turmaSed: string, turmaCodigo: string): string {
  if (turmaCodigo.startsWith('FUND_')) {
    const rest = turmaCodigo.replace('FUND_', '');
    return `${rest[0]}° ANO ${rest.slice(1)}`;
  }
  if (turmaCodigo.startsWith('AEE_')) {
    const rest = turmaCodigo.replace('AEE_', '');
    return `AEE ${rest}`;
  }
  if (turmaCodigo.startsWith('PRE_')) {
    const rest = turmaCodigo.replace('PRE_', '');
    if (rest.length === 2) {
      return `${rest[0]}ª ETAPA PRÉ ${rest[1]}`;
    }
    return `PRÉ-ESCOLA ${rest}`;
  }
  return String(turmaSed || turmaCodigo)
    .replace(/\s+(MANHA|MANHÃ|TARDE|INTEGRAL)?\s*ANUAL$/i, '')
    .trim();
}

async function carregarPdfJs() {
  const pdfjsLib: any = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  return pdfjsLib;
}

/**
 * Extrai todas as turmas e alunos do PDF "Alunos por Classe" gerado pela SED
 */
export async function extrairRelatorioSedDeArquivoPdf(file: File): Promise<{
  turmas: TurmaRelatorioSed[];
  dataGeracaoRelatorio: string;
  escolaNome: string;
  anoLetivo: string;
  totalAlunosSed: number;
}> {
  const pdfjsLib = await carregarPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const mapaTurmas = new Map<string, TurmaRelatorioSed>();
  let dataGeracaoGlobal = '';
  let escolaGlobal = '';
  let anoLetivoGlobal = '';

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();

    const rows: Record<number, { x: number; str: string }[]> = {};
    for (const item of tc.items || []) {
      const str = String(item.str || '').trim();
      if (!str) continue;
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);
      if (!rows[y]) rows[y] = [];
      rows[y].push({ x, str });
    }

    const ys = Object.keys(rows)
      .map(Number)
      .sort((a, b) => b - a);

    // Concatenar texto do cabeçalho da página (y >= 735)
    const headerLines: string[] = [];
    for (const y of ys) {
      if (y < 735) break;
      const lineStr = rows[y]
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(' ');
      headerLines.push(lineStr);
    }
    const headerText = headerLines.join('\n');

    const mAno = headerText.match(/Ano\s+Letivo:\s*(\d{4})/i);
    const anoLetivo = mAno ? mAno[1] : anoLetivoGlobal || String(new Date().getFullYear());
    if (mAno && !anoLetivoGlobal) anoLetivoGlobal = mAno[1];

    const mData = headerText.match(/Data:\s*(\d{2}\/\d{2}\/\d{4}(?:,\s*\d{2}:\d{2}:\d{2})?)/i);
    const dataGeracao = mData ? mData[1].replace(/\s+/g, ' ') : dataGeracaoGlobal;
    if (dataGeracao && !dataGeracaoGlobal) dataGeracaoGlobal = dataGeracao;

    const mEscola = headerText.match(/Escola:\s*(.+?)(?:\s+NR\.\s*Classe:|\n|$)/i);
    const escola = mEscola ? mEscola[1].trim() : escolaGlobal;
    if (escola && !escolaGlobal) escolaGlobal = escola;

    const mNrClasse = headerText.match(/NR\.\s*Classe:\s*(\d+)/i);
    const nrClasse = mNrClasse ? mNrClasse[1].trim() : `PAG_${p}`;

    const mTipoEnsino = headerText.match(/Tipo\s+Ensino:\s*(.+?)(?:\s+Habilita|\s+Sala:|\n|$)/i);
    const tipoEnsino = mTipoEnsino ? mTipoEnsino[1].trim() : '';

    const mSala = headerText.match(/Sala:\s*([0-9A-Za-z]+)/i);
    const sala = mSala ? mSala[1].trim() : '';

    const mTurma = headerText.match(/Turma:\s*(.+?)(?:\n|Ativos:|$)/i);
    const turmaSed = mTurma ? mTurma[1].replace(/\s+/g, ' ').trim() : `Turma Página ${p}`;
    const turmaCodigo = extrairCodigoCanonicoTurma(turmaSed);

    const mAtivos = headerText.match(/Ativos:\s*(\d+)/i);
    const mTransf = headerText.match(/Transferidos:\s*(\d+)/i);
    const mAband = headerText.match(/Abandonos:\s*(\d+)/i);
    const mNcom = headerText.match(/NCOM\.:\s*(\d+)/i);
    const mOutros = headerText.match(/Outros:\s*(\d+)/i);
    const mCad = headerText.match(/Cadastrados:\s*(\d+)/i);

    const alunosPagina: AlunoRelatorioSed[] = [];
    let current: AlunoRelatorioSed | null = null;

    for (const y of ys) {
      if (y > 732) continue;
      const items = rows[y].sort((a, b) => a.x - b.x);
      const serieItem = items.find((i) => i.x < 35 && /^\d+$/.test(i.str));
      const nrItem = items.find((i) => i.x >= 35 && i.x < 58 && /^\d+$/.test(i.str));

      if (serieItem && nrItem) {
        if (current) alunosPagina.push(current);

        const nomeParts = items.filter((i) => i.x >= 58 && i.x < 205).map((i) => i.str);
        const raRaw = items
          .filter((i) => i.x >= 205 && i.x < 275)
          .map((i) => i.str)
          .join('')
          .trim();
        const digRa = items
          .filter((i) => i.x >= 275 && i.x < 300)
          .map((i) => i.str)
          .join('')
          .trim()
          .toUpperCase();
        const ufRa = items
          .filter((i) => i.x >= 300 && i.x < 330)
          .map((i) => i.str)
          .join('')
          .trim();
        const dataNascimento = items
          .filter((i) => i.x >= 330 && i.x < 395)
          .map((i) => i.str)
          .join('')
          .trim();
        const situacao = items
          .filter((i) => i.x >= 395 && i.x < 445)
          .map((i) => i.str)
          .join('')
          .trim()
          .toUpperCase();
        const dataMovimentacao = items
          .filter((i) => i.x >= 445 && i.x < 515)
          .map((i) => i.str)
          .join('')
          .trim();
        const defParts = items.filter((i) => i.x >= 515).map((i) => i.str);

        const raLimpo = raRaw.replace(/\D+/g, '').replace(/^0+/, '');
        const raFormatado = raLimpo ? (digRa ? `${raLimpo}-${digRa}` : raLimpo) : '';
        const nomeCompleto = nomeParts.join(' ').replace(/\s+/g, ' ').trim();
        const situacaoNormalizada = normalizarSituacaoEscolar(situacao);

        current = {
          serie: serieItem.str,
          nr: Number(nrItem.str),
          nome: nomeCompleto,
          nomeNormalizado: normalizarNomeAluno(nomeCompleto),
          ra: raRaw,
          raLimpo,
          digRa,
          raFormatado,
          ufRa,
          dataNascimento,
          situacao,
          situacaoNormalizada,
          dataMovimentacao,
          dataMovimentacaoCurta:
            situacaoNormalizada === 'ATIVO' ? '' : extrairDiaMesCurto(dataMovimentacao),
          deficiencia: defParts.join(' ').trim()
        };
      } else if (current) {
        // Linhas quebradas de continuação do Nome do Aluno ou Deficiência
        const nomeExtra = items.filter((i) => i.x >= 58 && i.x < 205).map((i) => i.str);
        const defExtra = items.filter((i) => i.x >= 515).map((i) => i.str);
        if (nomeExtra.length) {
          current.nome = `${current.nome} ${nomeExtra.join(' ')}`.replace(/\s+/g, ' ').trim();
          current.nomeNormalizado = normalizarNomeAluno(current.nome);
        }
        if (defExtra.length) {
          current.deficiencia = `${current.deficiencia} ${defExtra.join(' ')}`
            .replace(/\s+/g, ' ')
            .trim();
        }
      }
    }
    if (current) alunosPagina.push(current);

    const chaveTurma = nrClasse || turmaCodigo;
    const existente = mapaTurmas.get(chaveTurma);
    if (existente) {
      existente.alunos.push(...alunosPagina);
    } else {
      mapaTurmas.set(chaveTurma, {
        nrClasse,
        turmaSed,
        turmaCodigo,
        tipoEnsino,
        sala,
        anoLetivo,
        dataGeracao,
        escola,
        resumoTopo: {
          ativos: mAtivos ? Number(mAtivos[1]) : 0,
          transferidos: mTransf ? Number(mTransf[1]) : 0,
          abandonos: mAband ? Number(mAband[1]) : 0,
          ncom: mNcom ? Number(mNcom[1]) : 0,
          outros: mOutros ? Number(mOutros[1]) : 0,
          cadastrados: mCad ? Number(mCad[1]) : alunosPagina.length
        },
        alunos: alunosPagina
      });
    }
  }

  const turmas = Array.from(mapaTurmas.values());
  const totalAlunosSed = turmas.reduce((acc, t) => acc + t.alunos.length, 0);

  return {
    turmas,
    dataGeracaoRelatorio: dataGeracaoGlobal,
    escolaNome: escolaGlobal,
    anoLetivo: anoLetivoGlobal,
    totalAlunosSed
  };
}

/**
 * Permite também carregar um PDF exportado de uma Lista Piloto localmente (para testes rápidos sem Drive)
 */
export async function extrairListaPilotoDeArquivoPdfLocal(
  file: File
): Promise<TurmaListaPilotoDrive> {
  const pdfjsLib = await carregarPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();

  const rows: Record<number, { x: number; str: string }[]> = {};
  for (const item of tc.items || []) {
    const str = String(item.str || '').trim();
    if (!str) continue;
    const y = Math.round(item.transform[5]);
    const x = Math.round(item.transform[4]);
    if (!rows[y]) rows[y] = [];
    rows[y].push({ x, str });
  }

  const ys = Object.keys(rows)
    .map(Number)
    .sort((a, b) => b - a);

  let tituloTopo = '';
  let classe = '';
  let sala = '';
  let horarios = '';
  let anoLetivo = '2026';
  let professora = '';

  const alunos: AlunoListaPilotoDrive[] = [];
  let pendingNomeOverflow = '';

  for (const y of ys) {
    const items = rows[y].sort((a, b) => a.x - b.x);
    const fullLine = items.map((i) => i.str).join(' ');

    if (y > 720) {
      if (!tituloTopo && y > 755) tituloTopo = fullLine;
      const mCl = fullLine.match(/CLASSE:\s*(.+?)(?:\s+HORARIOS:|$)/i);
      if (mCl) classe = mCl[1].trim();
      const mSl = fullLine.match(/SALA\s+(\d+)/i);
      if (mSl) sala = mSl[1].trim();
      const mHr = fullLine.match(/HORARIOS:\s*(.+?)(?:\s+ANO LETIVO:|$)/i);
      if (mHr) horarios = mHr[1].trim();
      const mPr = fullLine.match(/PROFESSORA?:\s*(.+)$/i);
      if (mPr) professora = mPr[1].trim();
      continue;
    }

    const nrItem = items.find((i) => i.x >= 45 && i.x <= 62 && /^\d+$/.test(i.str));
    const rmItem = items.find((i) => i.x < 45 && /^\d+$/.test(i.str));
    const nomeItems = items.filter((i) => i.x >= 63 && i.x < 230).map((i) => i.str);
    const sitItems = items.filter((i) => i.x >= 230 && i.x < 278).map((i) => i.str);
    const movItems = items.filter((i) => i.x >= 278 && i.x < 312).map((i) => i.str);
    const nascItems = items.filter((i) => i.x >= 312 && i.x < 365).map((i) => i.str);
    const raItems = items.filter((i) => i.x >= 365 && i.x < 445).map((i) => i.str);
    const imItems = items.filter((i) => i.x >= 445 && i.x < 480).map((i) => i.str);
    const obsItems = items.filter((i) => i.x >= 480).map((i) => i.str);

    if (!nrItem && nomeItems.length > 0 && !nascItems.length) {
      pendingNomeOverflow = nomeItems.join(' ');
      continue;
    }

    if (!nrItem && imItems.length > 0 && alunos.length > 0 && !alunos[alunos.length - 1].direitoImagem) {
      alunos[alunos.length - 1].direitoImagem = imItems.join(' ');
      continue;
    }

    if (nrItem) {
      const nomeFinal = (nomeItems.join(' ') || pendingNomeOverflow).trim();
      pendingNomeOverflow = '';
      if (!nomeFinal) continue;

      const sitVal = sitItems.join(' ').trim();
      const movVal = movItems.join(' ').trim();
      const raVal = raItems.join(' ').trim();
      const nr = Number(nrItem.str);

      alunos.push({
        linhaPlanilha: nr + 4,
        rm: rmItem ? rmItem.str : '',
        nr,
        nome: nomeFinal,
        nomeNormalizado: normalizarNomeAluno(nomeFinal),
        situacao: sitVal,
        situacaoNormalizada: normalizarSituacaoEscolar(sitVal),
        dataMovimentacao: movVal,
        dataMovimentacaoCurta: extrairDiaMesCurto(movVal),
        dataNascimento: nascItems.join(' ').trim(),
        ra: raVal,
        raLimpo: extrairRaBaseLimpo(raVal),
        direitoImagem: imItems.join(' ').trim(),
        observacoes: obsItems.join(' ').trim()
      });
    }
  }

  const turmaExibicao = classe || tituloTopo || file.name.replace(/\.pdf$/i, '');
  const turmaCodigo = extrairCodigoCanonicoTurma(`${classe} ${tituloTopo} ${file.name}`);

  return {
    idUnico: `local-pdf::${file.name}`,
    planilhaId: '',
    planilhaNome: file.name,
    planilhaUrl: '',
    mimeType: 'application/pdf',
    editavelNoSheets: false,
    nomeAba: 'PDF Local',
    turmaCodigo,
    turmaExibicao,
    sala,
    professora,
    horarios,
    anoLetivo,
    linhaCabecalho: 4,
    ultimaLinhaComAluno: alunos.length + 4,
    proximaLinhaDisponivel: alunos.length + 5,
    totalAlunos: alunos.length,
    totalAtivos: alunos.filter((a) => a.situacaoNormalizada === 'ATIVO').length,
    totalMovimentados: alunos.filter((a) => a.situacaoNormalizada !== 'ATIVO').length,
    alunos
  };
}

/**
 * Compara todas as turmas do Relatório SED com as Listas Piloto carregadas do Google Drive
 */
export function compararRelatorioSedComListasPiloto(
  turmasSed: TurmaRelatorioSed[],
  turmasPiloto: TurmaListaPilotoDrive[],
  dataChegadaPadrao?: string
): ComparacaoTurmaPiloto[] {
  const pilotosUsados = new Set<string>();
  const resultados: ComparacaoTurmaPiloto[] = [];

  // Data padrão de chegada sugerida para alunos novos (DD/MM)
  const hoje = new Date();
  const diaMesHoje = `${('0' + hoje.getDate()).slice(-2)}/${('0' + (hoje.getMonth() + 1)).slice(-2)}`;
  const diaMesRelatorio =
    dataChegadaPadrao ||
    (turmasSed[0]?.dataGeracao ? extrairDiaMesCurto(turmasSed[0].dataGeracao) : '') ||
    diaMesHoje;

  for (const tSed of turmasSed) {
    // 1. Tentar match exato por código canônico (ex: FUND_1A === FUND_1A)
    let matchPiloto = turmasPiloto.find(
      (p) => !pilotosUsados.has(p.idUnico) && p.turmaCodigo === tSed.turmaCodigo
    );

    // 2. Fallback para Educação Infantil quando o nome da planilha tem "PRE A" sem o número da etapa
    if (!matchPiloto && tSed.turmaCodigo.startsWith('PRE_')) {
      const letra = tSed.turmaCodigo.slice(-1);
      matchPiloto = turmasPiloto.find(
        (p) =>
          !pilotosUsados.has(p.idUnico) &&
          p.turmaCodigo.startsWith('PRE_') &&
          p.turmaCodigo.endsWith(letra)
      );
    }

    // 3. Fallback inteligente por sobreposição de RAs/Nomes dos alunos (>35% em comum)
    if (!matchPiloto && tSed.alunos.length > 0) {
      const rasSed = new Set(tSed.alunos.map((a) => a.raLimpo).filter(Boolean));
      const nomesSed = new Set(tSed.alunos.map((a) => a.nomeNormalizado).filter(Boolean));

      let melhorScore = 0;
      let melhorCandidato: TurmaListaPilotoDrive | undefined;

      for (const cand of turmasPiloto) {
        if (pilotosUsados.has(cand.idUnico) || cand.alunos.length === 0) continue;
        let matches = 0;
        for (const alP of cand.alunos) {
          if ((alP.raLimpo && rasSed.has(alP.raLimpo)) || nomesSed.has(alP.nomeNormalizado)) {
            matches++;
          }
        }
        const score = matches / Math.max(1, Math.min(tSed.alunos.length, cand.alunos.length));
        if (score > 0.35 && score > melhorScore) {
          melhorScore = score;
          melhorCandidato = cand;
        }
      }
      matchPiloto = melhorCandidato;
    }

    if (!matchPiloto) {
      resultados.push({
        idComparacao: `sed-only::${tSed.nrClasse || tSed.turmaCodigo}`,
        turmaCodigo: tSed.turmaCodigo,
        nomeExibicao: formatarNomeCurtoTurma(tSed.turmaSed, tSed.turmaCodigo),
        turmaSed: tSed,
        turmaPiloto: null,
        statusSala: 'SEM_PLANILHA_DRIVE',
        novosAlunosCount: 0,
        novasMovimentacoesCount: 0,
        divergenciasDadosCount: 0,
        mudancas: []
      });
      continue;
    }

    pilotosUsados.add(matchPiloto.idUnico);
    const mudancas = compararAlunosDaTurma(tSed, matchPiloto, diaMesRelatorio);

    const novosAlunosCount = mudancas.filter((m) => m.tipo === 'NOVO_ALUNO').length;
    const novasMovimentacoesCount = mudancas.filter(
      (m) => m.tipo === 'NOVA_MOVIMENTACAO' || m.tipo === 'ALTERACAO_SITUACAO'
    ).length;
    const divergenciasDadosCount = mudancas.filter((m) => m.tipo === 'DIVERGENCIA_DADOS').length;

    const temAlteracaoPrincipal = novosAlunosCount > 0 || novasMovimentacoesCount > 0;

    resultados.push({
      idComparacao: `${tSed.turmaCodigo}::${matchPiloto.idUnico}`,
      turmaCodigo: tSed.turmaCodigo,
      nomeExibicao:
        matchPiloto.turmaExibicao || formatarNomeCurtoTurma(tSed.turmaSed, tSed.turmaCodigo),
      turmaSed: tSed,
      turmaPiloto: matchPiloto,
      statusSala: temAlteracaoPrincipal ? 'COM_ALTERACOES' : 'OK_SEM_ALTERACAO',
      novosAlunosCount,
      novasMovimentacoesCount,
      divergenciasDadosCount,
      mudancas
    });
  }

  // Adicionar listas piloto do Drive que não estavam no PDF da SED
  for (const pRestante of turmasPiloto) {
    if (pilotosUsados.has(pRestante.idUnico)) continue;
    resultados.push({
      idComparacao: `piloto-only::${pRestante.idUnico}`,
      turmaCodigo: pRestante.turmaCodigo,
      nomeExibicao: pRestante.turmaExibicao || pRestante.planilhaNome,
      turmaSed: null,
      turmaPiloto: pRestante,
      statusSala: 'SEM_TURMA_SED',
      novosAlunosCount: 0,
      novasMovimentacoesCount: 0,
      divergenciasDadosCount: 0,
      mudancas: []
    });
  }

  return resultados;
}

function compararAlunosDaTurma(
  turmaSed: TurmaRelatorioSed,
  turmaPiloto: TurmaListaPilotoDrive,
  diaMesChegadaPadrao: string
): MudancaDetectadaPiloto[] {
  const mudancas: MudancaDetectadaPiloto[] = [];
  const linhasPilotoUsadas = new Set<number>();

  // Índice rápido por Nº de chamada na Lista Piloto
  const pilotoPorNr = new Map<number, AlunoListaPilotoDrive>();
  for (const alP of turmaPiloto.alunos) {
    if (alP.nr > 0 && !pilotoPorNr.has(alP.nr)) {
      pilotoPorNr.set(alP.nr, alP);
    }
  }

  for (const alSed of turmaSed.alunos) {
    let alPiloto: AlunoListaPilotoDrive | undefined = pilotoPorNr.get(alSed.nr);

    // Verificar se o aluno no mesmo Nº de chamada é realmente o mesmo aluno (por RA ou Nome similar)
    if (alPiloto) {
      const mesmoRa =
        Boolean(alPiloto.raLimpo && alSed.raLimpo) && alPiloto.raLimpo === alSed.raLimpo;
      const mesmoNome =
        alPiloto.nomeNormalizado === alSed.nomeNormalizado ||
        alPiloto.nomeNormalizado.split(' ')[0] === alSed.nomeNormalizado.split(' ')[0];

      if (!mesmoRa && !mesmoNome) {
        alPiloto = undefined;
      }
    }

    // Fallback: buscar por RA + Nº próximo ou Nome exato caso o Nº não estivesse batendo
    if (!alPiloto) {
      alPiloto = turmaPiloto.alunos.find(
        (p) =>
          !linhasPilotoUsadas.has(p.linhaPlanilha) &&
          p.nr === alSed.nr &&
          (p.raLimpo === alSed.raLimpo || p.nomeNormalizado === alSed.nomeNormalizado)
      );
    }

    // Caso 1: ALUNO NOVO (Não consta na Lista Piloto neste Nº de chamada)
    if (!alPiloto) {
      const ehAtivoNoSed = alSed.situacaoNormalizada === 'ATIVO';
      const dataMovSugerida = ehAtivoNoSed ? diaMesChegadaPadrao : alSed.dataMovimentacaoCurta;

      const partesObs: string[] = [];
      if (ehAtivoNoSed && dataMovSugerida) {
        partesObs.push(`MS: ${dataMovSugerida}`);
      } else if (!ehAtivoNoSed && dataMovSugerida) {
        const prefixo = alSed.situacaoNormalizada === 'TRAN' ? 'TR' : alSed.situacaoNormalizada;
        partesObs.push(`${prefixo}: ${dataMovSugerida}`);
      }
      if (alSed.deficiencia) {
        partesObs.push(alSed.deficiencia);
      }

      mudancas.push({
        id: `${turmaPiloto.idUnico}::nr-${alSed.nr}::novo`,
        tipo: 'NOVO_ALUNO',
        selecionada: true,
        nr: alSed.nr,
        nome: alSed.nome,
        rmAtual: '',
        situacaoAtual: '',
        dataMovAtual: '',
        raAtual: '',
        imAtual: '',
        obsAtual: '',
        situacaoSed: alSed.situacaoNormalizada,
        dataMovSedCompleta: alSed.dataMovimentacao,
        dataMovSedCurta: alSed.dataMovimentacaoCurta,
        dataNascimentoSed: alSed.dataNascimento,
        raFormatadoSed: alSed.raFormatado,
        deficienciaSed: alSed.deficiencia,
        rmGravar: '',
        situacaoGravar: ehAtivoNoSed ? '' : alSed.situacaoNormalizada,
        dataMovGravar: dataMovSugerida,
        dataNascimentoGravar: alSed.dataNascimento,
        raGravar: alSed.raFormatado,
        direitoImagemGravar: '',
        observacoesGravar: partesObs.join(' | '),
        descricaoMudanca: ehAtivoNoSed
          ? `Aluno novo matriculado na turma (N° ${alSed.nr}). Informe a data de chegada e o RM.`
          : `Aluno novo no relatório já com movimentação ${alSed.situacaoNormalizada} em ${alSed.dataMovimentacaoCurta}.`
      });
      continue;
    }

    linhasPilotoUsadas.add(alPiloto.linhaPlanilha);

    // Caso 2: NOVA MOVIMENTAÇÃO ou ALTERAÇÃO DE SITUAÇÃO
    if (alPiloto.situacaoNormalizada !== alSed.situacaoNormalizada) {
      const eraAtivo = alPiloto.situacaoNormalizada === 'ATIVO';
      const virouAtivo = alSed.situacaoNormalizada === 'ATIVO';
      const tipoMudanca = eraAtivo ? 'NOVA_MOVIMENTACAO' : 'ALTERACAO_SITUACAO';

      // Montar sugestão de observação preservando observação existente (ex: TIO TIAGO, AUTISTA INFANTIL, MS: ...)
      let obsSugerida = alPiloto.observacoes || '';
      if (alSed.situacaoNormalizada === 'TRAN' && alSed.dataMovimentacaoCurta) {
        const tagTr = `TR: ${alSed.dataMovimentacaoCurta}`;
        if (!obsSugerida.toUpperCase().includes('TR:')) {
          obsSugerida = obsSugerida ? `${obsSugerida} | ${tagTr}` : tagTr;
        }
      }
      if (alSed.deficiencia && !obsSugerida.toUpperCase().includes(alSed.deficiencia.toUpperCase())) {
        obsSugerida = obsSugerida ? `${obsSugerida} | ${alSed.deficiencia}` : alSed.deficiencia;
      }

      mudancas.push({
        id: `${turmaPiloto.idUnico}::nr-${alSed.nr}::mov`,
        tipo: tipoMudanca,
        selecionada: true,
        linhaPlanilha: alPiloto.linhaPlanilha,
        nr: alSed.nr,
        nome: alSed.nome,
        rmAtual: alPiloto.rm,
        situacaoAtual: alPiloto.situacao || 'ATIVO',
        dataMovAtual: alPiloto.dataMovimentacao,
        raAtual: alPiloto.ra,
        imAtual: alPiloto.direitoImagem,
        obsAtual: alPiloto.observacoes,
        situacaoSed: alSed.situacaoNormalizada,
        dataMovSedCompleta: alSed.dataMovimentacao,
        dataMovSedCurta: alSed.dataMovimentacaoCurta,
        dataNascimentoSed: alSed.dataNascimento,
        raFormatadoSed: alSed.raFormatado,
        deficienciaSed: alSed.deficiencia,
        rmGravar: alPiloto.rm,
        situacaoGravar: virouAtivo ? '' : alSed.situacaoNormalizada,
        dataMovGravar: virouAtivo ? alPiloto.dataMovimentacao : alSed.dataMovimentacaoCurta,
        dataNascimentoGravar: alPiloto.dataNascimento || alSed.dataNascimento,
        raGravar: alPiloto.ra || alSed.raFormatado,
        direitoImagemGravar: alPiloto.direitoImagem,
        observacoesGravar: obsSugerida,
        descricaoMudanca: eraAtivo
          ? `Nova movimentação no SED: passou de ATIVO para ${alSed.situacaoNormalizada} em ${alSed.dataMovimentacaoCurta}.`
          : `Situação alterada no SED: de ${alPiloto.situacaoNormalizada} para ${alSed.situacaoNormalizada} (${alSed.dataMovimentacaoCurta || 'Ativo'}).`
      });
      continue;
    }

    // Caso 3: Aluno com mesma situação, mas sem RA preenchido na Lista Piloto
    if (!alPiloto.raLimpo && alSed.raLimpo) {
      mudancas.push({
        id: `${turmaPiloto.idUnico}::nr-${alSed.nr}::ra`,
        tipo: 'DIVERGENCIA_DADOS',
        selecionada: false,
        linhaPlanilha: alPiloto.linhaPlanilha,
        nr: alSed.nr,
        nome: alSed.nome,
        rmAtual: alPiloto.rm,
        situacaoAtual: alPiloto.situacao || 'ATIVO',
        dataMovAtual: alPiloto.dataMovimentacao,
        raAtual: alPiloto.ra,
        imAtual: alPiloto.direitoImagem,
        obsAtual: alPiloto.observacoes,
        situacaoSed: alSed.situacaoNormalizada,
        dataMovSedCompleta: alSed.dataMovimentacao,
        dataMovSedCurta: alSed.dataMovimentacaoCurta,
        dataNascimentoSed: alSed.dataNascimento,
        raFormatadoSed: alSed.raFormatado,
        deficienciaSed: alSed.deficiencia,
        rmGravar: alPiloto.rm,
        situacaoGravar: alPiloto.situacao,
        dataMovGravar: alPiloto.dataMovimentacao,
        dataNascimentoGravar: alPiloto.dataNascimento || alSed.dataNascimento,
        raGravar: alSed.raFormatado,
        direitoImagemGravar: alPiloto.direitoImagem,
        observacoesGravar: alPiloto.observacoes,
        descricaoMudanca: `RA ausente na Lista Piloto (SED informa ${alSed.raFormatado}).`
      });
    }
  }

  return mudancas;
}
