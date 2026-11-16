import { FormEvent, useState } from 'react';
import { Link2, Loader2, Play, Search, X } from 'lucide-react';
import { formatTime } from '../data/catalog';
import { YouTubeSearchResult } from '../types/music';

interface CreatePlaylistModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

export function CreatePlaylistModal({ open, onClose, onCreate }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, description.trim() || 'Custom playlist created in Vespera');
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-playlist-title"
        className="w-full max-w-md bg-[#16191E] border border-white/10 rounded-xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="create-playlist-title" className="text-lg font-bold text-white">
            New Playlist
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-neutral-400 hover:text-white rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="playlist-name" className="block text-xs font-medium text-neutral-300 mb-1.5">
              Playlist Name
            </label>
            <input
              id="playlist-name"
              type="text"
              autoFocus
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Anirudh Workout Mix"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/10 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#1ED760]"
            />
          </div>

          <div>
            <label htmlFor="playlist-desc" className="block text-xs font-medium text-neutral-300 mb-1.5">
              Description (optional)
            </label>
            <textarea
              id="playlist-desc"
              rows={2}
              maxLength={140}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a short note about this collection"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/10 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#1ED760] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#1ED760] hover:bg-[#3BE477] text-black disabled:opacity-40 transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddYouTubeModalProps {
  open: boolean;
  onClose: () => void;
  onAddYouTubeTrack: (result: YouTubeSearchResult) => void;
}

export function AddYouTubeModal({ open, onClose, onAddYouTubeTrack }: AddYouTubeModalProps) {
  const [tab, setTab] = useState<'search' | 'link'>('search');
  const [query, setQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);

  if (!open) return null;

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/yt/search?q=${encodeURIComponent(`${q} audio`)}`);
      const data = (await resp.json()) as { results?: YouTubeSearchResult[]; error?: string };
      if (!resp.ok || !data.results) {
        setError(data.error || 'Could not search YouTube right now.');
        setResults([]);
      } else {
        setResults(data.results);
        if (data.results.length === 0) {
          setError('No playable tracks found. Try another song name.');
        }
      }
    } catch {
      setError('Network error while searching YouTube.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveUrl = async (e: FormEvent) => {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/yt/resolve?url=${encodeURIComponent(raw)}`);
      const data = (await resp.json()) as YouTubeSearchResult & { error?: string };
      if (!resp.ok || !data.videoId) {
        setError(data.error || 'Please enter a valid YouTube link or 11-character video ID.');
      } else {
        onAddYouTubeTrack({
          videoId: data.videoId,
          title: data.title,
          artist: data.artist,
          durationSeconds: 215,
          thumbnailUrl: data.thumbnailUrl,
        });
        setUrlInput('');
        onClose();
      }
    } catch {
      setError('Could not resolve that YouTube link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-youtube-title"
        className="w-full max-w-lg bg-[#16191E] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="add-youtube-title" className="text-lg font-bold text-white">
              Add Song from YouTube
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Plays audio smoothly in the background with zero video clutter.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-neutral-400 hover:text-white rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#0E1013] rounded-lg border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setTab('search');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-colors ${
              tab === 'search' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Search size={14} />
            <span>Search YouTube</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('link');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-colors ${
              tab === 'link' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Link2 size={14} />
            <span>Paste YouTube Link</span>
          </button>
        </div>

        {tab === 'search' ? (
          <div className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Anirudh Leo Badass, A.R. Rahman Uyire..."
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/10 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#1ED760]"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-4 py-2.5 rounded-lg bg-[#1ED760] hover:bg-[#3BE477] text-black text-sm font-semibold disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
              </button>
            </form>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            {results.length > 0 && (
              <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.06] border border-white/[0.07] rounded-lg bg-[#0E1013]">
                {results.map((item) => (
                  <button
                    key={item.videoId}
                    type="button"
                    onClick={() => {
                      onAddYouTubeTrack(item);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-white/[0.06] text-left transition-colors group"
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-12 h-9 object-cover rounded shrink-0 bg-[#181B20]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white truncate">{item.title}</div>
                      <div className="text-xs text-neutral-400 truncate">
                        {item.artist} ·{' '}
                        <span className="font-mono tabular-nums">
                          {formatTime(item.durationSeconds)}
                        </span>
                      </div>
                    </div>
                    <span className="p-2 rounded-full bg-[#1ED760] text-black opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Play size={13} className="fill-black" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleResolveUrl} className="space-y-3">
            <div>
              <label htmlFor="yt-url-input" className="block text-xs font-medium text-neutral-300 mb-1.5">
                YouTube URL or Video ID
              </label>
              <input
                id="yt-url-input"
                type="text"
                autoFocus
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/10 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#1ED760]"
              />
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !urlInput.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#1ED760] hover:bg-[#3BE477] text-black text-sm font-semibold disabled:opacity-40"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                <span>Add & Play</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;

  const shortcuts = [
    { key: 'Space', label: 'Play or pause current track' },
    { key: 'N', label: 'Skip to next track' },
    { key: 'P', label: 'Return to previous track' },
    { key: 'ArrowRight', label: 'Seek forward 5 seconds' },
    { key: 'ArrowLeft', label: 'Seek backward 5 seconds' },
    { key: 'M', label: 'Mute or unmute audio' },
    { key: 'Q', label: 'Toggle queue drawer' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="w-full max-w-sm bg-[#16191E] border border-white/10 rounded-xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="shortcuts-title" className="text-lg font-bold text-white">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts"
            className="p-1.5 text-neutral-400 hover:text-white rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {shortcuts.map((s) => (
            <div key={s.key} className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-sm text-neutral-300">{s.label}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono text-neutral-200 bg-[#0E1013] border border-white/15 rounded">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
