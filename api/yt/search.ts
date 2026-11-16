interface ApiRequest {
  url?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
}

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

  const seen = new Set<string>();
  return results
    .filter((r) => {
      if (seen.has(r.videoId)) return false;
      seen.add(r.videoId);
      return true;
    })
    .slice(0, 12);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const rawParam = req.query?.q;
  let q = Array.isArray(rawParam) ? rawParam[0] ?? '' : rawParam ?? '';
  if (!q && req.url) {
    try {
      q = new URL(req.url, 'http://localhost').searchParams.get('q') ?? '';
    } catch {
      q = '';
    }
  }
  q = q.trim();

  if (!q) {
    res.status(400).json({ error: 'Missing query parameter q' });
    return;
  }

  try {
    const results = await searchYouTube(q);
    res.status(200).json({ results });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to query YouTube',
      results: [],
    });
  }
}
