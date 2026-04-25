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

    // Preservar el status HTTP real de OpenAI
    // Esto permite al frontend distinguir entre errores técnicos y respuestas normales
    return res.status(response.status).json(data);
  } catch (error) {
    // Error del proxy (red, timeout, etc.)
    console.error('Proxy OpenAI error:', error);
    return res.status(500).json({
      error: 'Error de conexión con el proxy OpenAI',
      message: error.message,
      type: 'proxy_error'
    });
  }
});

app.listen(3001, () =>
  console.log('Proxy OpenAI listo en http://localhost:3001')
);
