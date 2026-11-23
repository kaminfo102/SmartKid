import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST?.trim() || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

function getNetworkIPv4Addresses(): string[] {
  const nets = os.networkInterfaces();
  const addresses: string[] = [];
  for (const entries of Object.values(nets)) {
    if (!entries) continue;
    for (const net of entries) {
      const isIPv4 = net.family === 'IPv4' || (net.family as unknown) === 4;
      if (isIPv4 && !net.internal && net.address) {
        addresses.push(net.address);
      }
    }
  }
  return Array.from(new Set(addresses));
}

// Simple bounded in-memory cache so repeated Persian lesson & cheer phrases play instantly
const TTS_CACHE_MAX = 120;
const ttsCache = new Map<string, string>();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

type VoiceTone = 'teach' | 'cheer' | 'encourage';

const TONE_STYLES: Record<VoiceTone, string> = {
  teach:
    'Warm, gentle, cheerful Iranian female kindergarten teacher speaking clear, friendly Persian (fa-IR) warmly and slowly for children ages 4 to 15.',
  cheer:
    'Joyful, bright, encouraging Iranian female teacher speaking natural enthusiastic Persian (fa-IR) to celebrate a young child success.',
  encourage:
    'Kind, soft, reassuring Iranian female teacher speaking calm, gentle Persian (fa-IR) to kindly encourage a young child to try again.',
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  // Explicit binary download route for the custom WordPress plugin archive
  app.get('/downloads/koodak-nabegheh-soroban.zip', (_req: Request, res: Response) => {
    const candidates = [
      path.resolve(__dirname, 'public', 'downloads', 'koodak-nabegheh-soroban.zip'),
      path.resolve(__dirname, 'dist', 'downloads', 'koodak-nabegheh-soroban.zip'),
    ];
    const targetFile = candidates.find((p) => fs.existsSync(p));
    if (!targetFile) {
      res.status(404).send('Plugin archive not found');
      return;
    }
    const stat = fs.statSync(targetFile);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="koodak-nabegheh-soroban.zip"');
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    fs.createReadStream(targetFile).pipe(res);
  });

  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Persian Female Child-Friendly TTS endpoint powered by Gemini
  app.post('/api/tts', async (req: Request, res: Response) => {
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!rawText) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    if (rawText.length > 400) {
      res.status(400).json({ error: 'Text exceeds maximum length of 400 characters' });
      return;
    }

    const rawTone = req.body?.tone;
    const tone: VoiceTone =
      rawTone === 'cheer' || rawTone === 'encourage' ? rawTone : 'teach';

    const cacheKey = `${tone}:${rawText}`;
    const cachedBase64 = ttsCache.get(cacheKey);
    if (cachedBase64) {
      res.json({ audioBase64: cachedBase64, mimeType: 'audio/wav', cached: true });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'TTS service not configured' });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: rawText,
                speechMetadata: {
                  style: TONE_STYLES[tone],
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              // Kore: warm, expressive female voice suited for children's Persian guidance
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({ error: 'No audio returned from TTS model' });
        return;
      }

      if (ttsCache.size >= TTS_CACHE_MAX) {
        const oldestKey = ttsCache.keys().next().value;
        if (oldestKey !== undefined) {
          ttsCache.delete(oldestKey);
        }
      }
      ttsCache.set(cacheKey, base64Audio);

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
    } catch (err) {
      console.error('TTS generation error:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Failed to synthesize Persian guide voice' });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    if (HOST === '0.0.0.0' || HOST === '::') {
      console.log(`  ➜  Local:   http://localhost:${PORT}`);
      const networkIps = getNetworkIPv4Addresses();
      for (const ip of networkIps) {
        console.log(`  ➜  Network: http://${ip}:${PORT}`);
      }
    } else {
      const displayHost = HOST === '127.0.0.1' ? 'localhost' : HOST;
      console.log(`  ➜  Local:   http://${displayHost}:${PORT}`);
    }
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Stop the existing process or set a custom PORT.`
      );
      process.exit(1);
    }
    throw err;
  });
}

void startServer();
