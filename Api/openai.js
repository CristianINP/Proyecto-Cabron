// api/openai.js — Vercel Serverless Function
// Reemplaza al servidor Express de Api/index.js en producción.
// Vercel lo sirve en /api/openai y parsea req.body automáticamente.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Preservar el status HTTP real de OpenAI (429, 5xx, 400…)
    // para que el frontend pueda aplicar su lógica de reintento.
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Serverless Proxy Error]', error.message);
    return res.status(503).json({
      error: 'Error de conexión',
      message: 'No se pudo conectar con el servicio de IA. Revisa tu conexión.',
      type: 'network_error',
    });
  }
};
