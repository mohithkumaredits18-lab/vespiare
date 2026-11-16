interface ApiRequest {
  url?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const rawParam = req.query?.url;
  let rawUrl = Array.isArray(rawParam) ? rawParam[0] ?? '' : rawParam ?? '';
  if (!rawUrl && req.url) {
    try {
      rawUrl = new URL(req.url, 'http://localhost').searchParams.get('url') ?? '';
    } catch {
      rawUrl = '';
    }
  }

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
      res.status(200).json({
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

    res.status(200).json({
      videoId,
      title: data.title || `YouTube Track (${videoId})`,
      artist: (data.author_name || 'YouTube').replace(/\s*-\s*Topic$/i, ''),
      thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      embeddable: true,
    });
  } catch {
    res.status(200).json({
      videoId,
      title: `YouTube Track (${videoId})`,
      artist: 'YouTube',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      embeddable: true,
    });
  }
}
