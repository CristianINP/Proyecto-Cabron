import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: 'http://localhost:3000'
}));

app.use(express.json());

app.post('/openai', async (req, res) => {
  try {
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      }
    );

    const data = await response.json();

    // 🔒 CRÍTICO: Preservar el status HTTP real de OpenAI.
    // Si OpenAI dice 429 (Rate Limit) o 500 (Error), el frontend lo recibirá como no-200.
    // Esto permite al frontend distinguir entre:
    // - 200: Respuesta válida (procesar receta)
    // - 429: Límite alcanzado (esperar y reintentar)
    // - 5xx: Error temporal (mostrar mensaje técnico)
    // - 400: Error de formato (el prompt o JSON están mal)
    return res.status(response.status).json(data);
  } catch (error) {
    // Error del proxy (red caida, timeout, DNS, etc.)
    // Frontend: No intentes reintentar muchas veces, es un error de red real.
    console.error('[Proxy Error] Falla de red o timeout:', error.message);
    return res.status(503).json({
      error: 'Error de conexión',
      message: 'No se pudo conectar con el servicio de IA. Revisa tu conexión.',
      type: 'network_error'
    });
  }
});

app.listen(3001, () =>
  console.log('Proxy OpenAI listo en http://localhost:3001')
);
