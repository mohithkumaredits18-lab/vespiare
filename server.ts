import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  artist: string;
  durationSeconds: number;
  thumbnailUrl: string;
}

function parseDurationToSeconds(label: string): number {
  const parts = label.trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 210;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 210;
}

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtu.be')) {
      const seg = url.pathname.split('/').filter(Boolean)[0];
      return seg && seg.length === 11 ? seg : null;
    }
    const v = url.searchParams.get('v');
    if (v && v.length === 11) return v;
    const parts = url.pathname.split('/').filter(Boolean);
    const embedIdx = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'live');
    if (embedIdx !== -1 && parts[embedIdx + 1]?.length === 11) {
      return parts[embedIdx + 1];
    }
  } catch {
    // ignore invalid URL
  }
  return null;
}

function walkVideoRenderers(node: unknown, out: YouTubeSearchResult[]) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walkVideoRenderers(item, out);
    return;
  }

  const obj = node as Record<string, unknown>;
  if (obj.videoRenderer && typeof obj.videoRenderer === 'object') {
    const vr = obj.videoRenderer as Record<string, unknown>;
    const videoId = typeof vr.videoId === 'string' ? vr.videoId : null;

    const titleObj = vr.title as { runs?: Array<{ text?: string }>; simpleText?: string } | undefined;
    const title = titleObj?.runs?.map((r) => r.text ?? '').join('') || titleObj?.simpleText || '';

    const ownerObj = vr.ownerText as { runs?: Array<{ text?: string }> } | undefined;
    const shortByline = vr.shortBylineText as { runs?: Array<{ text?: string }> } | undefined;
    const artist =
      ownerObj?.runs?.[0]?.text || shortByline?.runs?.[0]?.text || 'YouTube Audio';

    const lengthObj = vr.lengthText as { simpleText?: string } | undefined;
    const durationSeconds = lengthObj?.simpleText
      ? parseDurationToSeconds(lengthObj.simpleText)
      : 210;

    // Skip livestreams or ultra-long mixes (> 15 mins)
    if (videoId && title && lengthObj?.simpleText && durationSeconds <= 900) {
      out.push({
        videoId,
        title,
        artist: artist.replace(/\s*-\s*Topic$/i, ''),
        durationSeconds,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }
  }

  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') {
      walkVideoRenderers(val, out);
    }
  }
}

async function searchYouTube(query: string): Promise<YouTubeSearchResult[]> {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
  const resp = await fetch(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!resp.ok) {
    throw new Error(`YouTube search HTTP ${resp.status}`);
  }

  const html = await resp.text();
  const match =
    html.match(/var ytInitialData = (\{.*?\});<\/script>/s) ||
    html.match(/window\["ytInitialData"\] = (\{.*?\});<\/script>/s);

  if (!match?.[1]) {
    return [];
  }

  const data = JSON.parse(match[1]);
  const results: YouTubeSearchResult[] = [];
  walkVideoRenderers(data, results);

  // Deduplicate by videoId
  const seen = new Set<string>();
  return results
    .filter((r) => {
      if (seen.has(r.videoId)) return false;
      seen.add(r.videoId);
      return true;
    })
    .slice(0, 12);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Search YouTube for playable songs
  app.get('/api/yt/search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
      res.status(400).json({ error: 'Missing query parameter q' });
      return;
    }

    try {
      const results = await searchYouTube(q);
      res.json({ results });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to query YouTube',
        results: [],
      });
    }
  });

  // Resolve YouTube URL / ID metadata via oEmbed
  app.get('/api/yt/resolve', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const videoId = extractYouTubeId(rawUrl);
    if (!videoId) {
      res.status(400).json({ error: 'Invalid YouTube URL or video ID' });
      return;
    }

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&format=json`;
      const resp = await fetch(oembedUrl);
      if (!resp.ok) {
        res.json({
          videoId,
          title: `YouTube Track (${videoId})`,
          artist: 'YouTube',
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          embeddable: false,
        });
        return;
      }

      const data = (await resp.json()) as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };

      res.json({
        videoId,
        title: data.title || `YouTube Track (${videoId})`,
        artist: (data.author_name || 'YouTube').replace(/\s*-\s*Topic$/i, ''),
        thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        embeddable: true,
      });
    } catch {
      res.json({
        videoId,
        title: `YouTube Track (${videoId})`,
        artist: 'YouTube',
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        embeddable: true,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vespera server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
