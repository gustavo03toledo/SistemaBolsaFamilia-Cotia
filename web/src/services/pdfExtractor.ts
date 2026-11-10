import { AlunoExtraidoPdf } from '../types/sbf';

const TERMOS_BLOQUEADOS = [
  'BOLSA FAMILIA',
  'PROGRAMA',
  'FREQUENCIA',
  'ESCOLA',
  'MUNICIPIO',
  'SECRETARIA',
  'RELATORIO',
  'FORMULARIO',
  'PAGINA',
  'NOME DO ALUNO',
  'DATA DE NASCIMENTO',
  'RESPONSAVEL',
  'ENDERECO',
  'CODIGO',
  'INEP'
];

function normalizarNomeSimples(valor: string): string {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function linhaPareceNomeAluno(nome: string): boolean {
  const norm = normalizarNomeSimples(nome);
  if (!norm || norm.length < 5 || /\d/.test(norm)) return false;
  if (norm.split(' ').length < 2) return false;
  return !TERMOS_BLOQUEADOS.some((t) => norm.includes(t));
}

function limparCampo(valor: string): string {
  return String(valor || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:\-]+/, '')
    .replace(/[\s;|]+$/, '')
    .trim()
    .toUpperCase();
}

function extrairAteProximoRotulo(texto: string): string {
  const idx = String(texto || '').search(
    /\b(?:DT\.?\s*NASC\.?|DATA\s+DE\s+NASCIMENTO|NIS|RESPONS[AÁ]VEL\s+FAMILIAR|MOTIVO|SITUA[CÇ][AÃ]O|ESCOLA|S[ÉE]RIE|TURMA)\s*:/i
  );
  return idx === -1 ? texto : texto.substring(0, idx);
}

function extrairCampo(bloco: string, regex: RegExp): string {
  const match = regex.exec(bloco);
  if (!match) return '';
  const resto = bloco.substring(match.index + match[0].length);
  const valor = extrairAteProximoRotulo(resto).split('\n')[0] || '';
  return limparCampo(valor);
}

export function extrairAlunosDeTextoBolsa(textoBruto: string): AlunoExtraidoPdf[] {
  const texto = String(textoBruto || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ');

  const posicoes: { inicioRotulo: number; inicioValor: number }[] = [];
  const regexNome = /\bNOME\s*:/gi;
  let match: RegExpExecArray | null;

  while ((match = regexNome.exec(texto)) !== null) {
    posicoes.push({
      inicioRotulo: match.index,
      inicioValor: regexNome.lastIndex
    });
  }

  const alunos: AlunoExtraidoPdf[] = [];
  const vistos = new Set<string>();

  if (posicoes.length > 0) {
    posicoes.forEach((pos, idx) => {
      const fim = idx + 1 < posicoes.length ? posicoes[idx + 1].inicioRotulo : texto.length;
      const bloco = texto.substring(pos.inicioValor, fim);
      const nomeBruto = extrairAteProximoRotulo(bloco).split('\n')[0] || '';
      const nome = limparCampo(
        nomeBruto
          .replace(/\b(DATA\s+DE\s+NASCIMENTO|DT\.?\s*NASC\.?|NASCIMENTO|RESPONSAVEL|NIS|CPF)\b.*$/i, '')
          .replace(/\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b.*$/i, '')
      );

      if (!linhaPareceNomeAluno(nome)) return;

      const dataNascimento = extrairCampo(bloco, /(?:DT\.?\s*NASC\.?|DATA\s+DE\s+NASCIMENTO)\s*:/i);
      const nis = extrairCampo(bloco, /\bNIS\s*:/i).replace(/[^\d]/g, '');
      const responsavelFamiliar = extrairCampo(bloco, /RESPONS[AÁ]VEL\s+FAMILIAR\s*:/i);

      const chave = `${normalizarNomeSimples(nome)}|${nis}`;
      if (!vistos.has(chave)) {
        vistos.add(chave);
        alunos.push({ nome, dataNascimento, nis, responsavelFamiliar });
      }
    });
  }

  if (alunos.length === 0) {
    // Fallback linha por linha (para texto colado manualmente)
    texto.split(/\n|;/).forEach((linha) => {
      const limpo = limparCampo(linha.replace(/^\s*\d+[\.\-)\s]+/, ''));
      if (linhaPareceNomeAluno(limpo)) {
        const chave = normalizarNomeSimples(limpo);
        if (!vistos.has(chave)) {
          vistos.add(chave);
          alunos.push({ nome: limpo, dataNascimento: '', nis: '', responsavelFamiliar: '' });
        }
      }
    });
  }

  return alunos;
}

export async function extrairAlunosDeArquivoPdfNoCliente(
  file: File
): Promise<{ alunos: AlunoExtraidoPdf[]; base64: string; textoExtraido: string }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      resolve(res.replace(/^data:.*;base64,/, ''));
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo PDF.'));
    reader.readAsDataURL(file);
  });

  try {
    const pdfjsLib: any = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const paginasTexto: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const linhas = (textContent.items || []).map((item: any) => item.str || '').join(' ');
      paginasTexto.push(linhas);
    }

    const textoCompleto = paginasTexto.join('\n');
    const alunos = extrairAlunosDeTextoBolsa(textoCompleto);
    return { alunos, base64, textoExtraido: textoCompleto };
  } catch {
    // Se o worker do pdf.js falhar offline, o backend ainda extrai pelo base64 via Drive OCR/Docs
    return { alunos: [], base64, textoExtraido: '' };
  }
}

export function extrairIdPastaDrive(valor: string): string {
  const texto = String(valor || '').trim();
  const mFolder = texto.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (mFolder) return mFolder[1];
  const mId = texto.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (mId) return mId[1];
  return texto;
}
