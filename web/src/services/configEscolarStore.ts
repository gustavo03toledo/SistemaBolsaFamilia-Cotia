export interface TagObservacaoPiloto {
  id: string;
  sigla: string;
  rotulo: string;
  categoria: 'SAIDA' | 'TRANSPORTE' | 'PERUA' | 'OUTRO';
  corClasse: string;
}

const STORAGE_KEY_TAGS_PILOTO = 'SBF_TAGS_OBSERVACOES_LISTA_PILOTO_V1';
const STORAGE_KEY_TIMBRADO_CUSTOM = 'SBF_PAPEL_TIMBRADO_CUSTOM_DATAURL_V1';
export const TIMBRADO_PADRAO_URL = '/timbrado-cotia.png';

export const TAGS_PADRAO_PILOTO: TagObservacaoPiloto[] = [
  {
    id: 'saida-sozinho',
    sigla: '@',
    rotulo: '@ (Vai embora sozinho)',
    categoria: 'SAIDA',
    corClasse: 'bg-sky-100 text-sky-900 border-sky-300'
  },
  {
    id: 'transporte-teg',
    sigla: 'TEG',
    rotulo: 'TEG (Transporte Escolar Gratuito)',
    categoria: 'TRANSPORTE',
    corClasse: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  },
  {
    id: 'perua-tio-tiago',
    sigla: 'TIO TIAGO',
    rotulo: 'Perua: TIO TIAGO',
    categoria: 'PERUA',
    corClasse: 'bg-amber-100 text-amber-950 border-amber-300'
  },
  {
    id: 'perua-tio-zezinho',
    sigla: 'TIO ZEZINHO',
    rotulo: 'Perua: TIO ZEZINHO',
    categoria: 'PERUA',
    corClasse: 'bg-orange-100 text-orange-950 border-orange-300'
  }
];

export function carregarTagsObservacaoPiloto(): TagObservacaoPiloto[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TAGS_PILOTO);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return TAGS_PADRAO_PILOTO;
}

export function salvarTagsObservacaoPiloto(tags: TagObservacaoPiloto[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TAGS_PILOTO, JSON.stringify(tags));
  } catch {}
}

function escaparRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Verifica se o texto de observações contém a sigla/marcador (ex: "@", "TEG", "TIO TIAGO")
 */
export function observacaoContemTag(observacoes: string, sigla: string): boolean {
  const obs = String(observacoes || '').toUpperCase();
  const s = String(sigla || '').trim().toUpperCase();
  if (!obs || !s) return false;

  if (s === '@') {
    return /(?:^|[\s|,;/()-])@(?:$|[\s|,;/()-])/.test(obs) || obs.includes('@');
  }

  const regex = new RegExp(`(?:^|[\\s|,;/()-])${escaparRegex(s)}(?:$|[\\s|,;/()-])`, 'i');
  return regex.test(obs);
}

/**
 * Ativa ou desativa acumulativamente uma tag dentro do campo de observações,
 * preservando todas as demais informações (outras peruas, TEG, @, REMA, TR, MS, deficiências, etc.)
 */
export function alternarTagNaObservacao(
  observacoesAtuais: string,
  sigla: string,
  ativar: boolean
): string {
  const s = String(sigla || '').trim().toUpperCase();
  if (!s) return observacoesAtuais;

  const jaContem = observacaoContemTag(observacoesAtuais, s);

  if (ativar) {
    if (jaContem) return observacoesAtuais;
    const base = String(observacoesAtuais || '').trim();
    if (!base) return s;
    return `${base} | ${s}`;
  } else {
    if (!jaContem) return observacoesAtuais;
    let texto = String(observacoesAtuais || '');
    if (s === '@') {
      texto = texto.replace(/\s*\|?\s*@\s*\|?\s*/g, ' ');
    } else {
      const regex = new RegExp(`\\s*\\|?\\s*${escaparRegex(s)}\\s*\\|?\\s*`, 'gi');
      texto = texto.replace(regex, ' ');
    }
    return texto
      .replace(/^\s*\|\s*/, '')
      .replace(/\s*\|\s*$/, '')
      .replace(/\s*\|\s*\|\s*/g, ' | ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}

// ============================================================================
// GERENCIAMENTO DO PAPEL TIMBRADO CUSTOMIZÁVEL DAS DECLARAÇÕES
// ============================================================================

export function obterPapelTimbradoUrl(): string {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_TIMBRADO_CUSTOM);
    if (custom && custom.startsWith('data:image/')) {
      return custom;
    }
  } catch {}
  return TIMBRADO_PADRAO_URL;
}

export function temPapelTimbradoCustomizado(): boolean {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_TIMBRADO_CUSTOM);
    return Boolean(custom && custom.startsWith('data:image/'));
  } catch {
    return false;
  }
}

export function restaurarPapelTimbradoPadrao(): string {
  try {
    localStorage.removeItem(STORAGE_KEY_TIMBRADO_CUSTOM);
  } catch {}
  return TIMBRADO_PADRAO_URL;
}

/**
 * Converte o arquivo de imagem (PNG/JPG) enviado pelo usuário em DataURL otimizado para A4
 * e salva no localStorage para uso em todas as declarações.
 */
export async function processarESalvarPapelTimbradoArquivo(file: File): Promise<string> {
  const dataUrlBruto = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler a imagem do papel timbrado.'));
    reader.readAsDataURL(file);
  });

  // Otimizar dimensões em canvas para caber no localStorage com alta nitidez A4 (máx 1600px de altura)
  const dataUrlOtimizado = await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxH = 1650;
      const maxW = 1200;
      let w = img.width;
      let h = img.height;
      if (h > maxH || w > maxW) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrlBruto);
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => resolve(dataUrlBruto);
    img.src = dataUrlBruto;
  });

  try {
    localStorage.setItem(STORAGE_KEY_TIMBRADO_CUSTOM, dataUrlOtimizado);
  } catch {
    // Se exceder quota, tentar qualidade menor
    localStorage.setItem(STORAGE_KEY_TIMBRADO_CUSTOM, dataUrlOtimizado);
  }

  return dataUrlOtimizado;
}
