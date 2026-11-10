export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Metodo nao permitido. Use POST.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const gasUrl =
      process.env.GAS_WEBAPP_URL ||
      process.env.VITE_GAS_WEBAPP_URL ||
      body.gasUrl ||
      '';
    const apiKey = process.env.GAS_API_SECRET || '';

    if (!gasUrl) {
      res.status(500).json({
        ok: false,
        error:
          'Variavel de ambiente GAS_WEBAPP_URL nao configurada na Vercel. Defina GAS_WEBAPP_URL com a URL /exec do Google Apps Script.'
      });
      return;
    }

    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: body.action,
        payload: body.payload || {},
        apiKey: body.apiKey || apiKey
      }),
      redirect: 'follow'
    });

    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        'Resposta inesperada do Google Apps Script. Verifique se o Web App esta publicado com acesso "Qualquer pessoa".'
      );
    }

    res.status(200).json(json);
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error?.message || 'Falha ao comunicar com a API do Google Apps Script.'
    });
  }
}
