import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Menu,
  Search as SearchIcon,
  X,
} from 'lucide-react';
import { AudioPlayerEngine } from './audio/engine';
import { AddYouTubeModal, CreatePlaylistModal, ShortcutsModal } from './components/Modals';
import { PlayerBar } from './components/PlayerBar';
import { QueuePanel } from './components/QueuePanel';
import { Sidebar } from './components/Sidebar';
import { ArtistView, DetailView, HomeView, SearchView } from './components/Views';
import { ALBUMS, ARTISTS, DEFAULT_PLAYLISTS, TRACKS } from './data/catalog';
import { NavView, Playlist, RepeatMode, Track, YouTubeSearchResult } from './types/music';

const STORAGE_KEYS = {
  liked: 'vespera_liked_tracks_v1',
  playlists: 'vespera_playlists_v1',
  volume: 'vespera_volume_v1',
  ytTracks: 'vespera_yt_tracks_v1',
};

function loadInitialLiked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.liked);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {
    // ignore storage errors
  }
  return new Set(['trk-ani-1', 'trk-arr-1', 'trk-wkd-1', 'trk-dp-1']);
}

function loadInitialPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.playlists);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_PLAYLISTS;
}

function loadInitialYouTubeTracks(): Track[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ytTracks);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function loadInitialVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.volume);
    if (raw !== null) {
      const val = Number(raw);
      if (Number.isFinite(val) && val >= 0 && val <= 1) return val;
    }
  } catch {
    // ignore
  }
  return 0.78;
}

export default function App() {
  const engineRef = useRef<AudioPlayerEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new AudioPlayerEngine();
  }
  const engine = engineRef.current;

  // Library state
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [youtubeTracks, setYoutubeTracks] = useState<Track[]>(loadInitialYouTubeTracks);
  const allTracks = useMemo(
    () => [...TRACKS, ...youtubeTracks, ...localTracks],
    [youtubeTracks, localTracks]
  );

  const [likedIds, setLikedIds] = useState<Set<string>>(loadInitialLiked);
  const [playlists, setPlaylists] = useState<Playlist[]>(loadInitialPlaylists);

  // Navigation history
  const [history, setHistory] = useState<NavView[]>([{ type: 'home' }]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const activeView = history[historyIdx];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');

  // UI chrome state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : true
  );
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [addYouTubeOpen, setAddYouTubeOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSource, setPlaybackSource] = useState<'youtube' | 'studio' | 'local'>('youtube');
  const [volume, setVolume] = useState<number>(loadInitialVolume);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');

  // Queue & context list
  const [contextTracks, setContextTracks] = useState<Track[]>(TRACKS);
  const [manualQueue, setManualQueue] = useState<Track[]>([]);
  const [playHistory, setPlayHistory] = useState<Track[]>([]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  // Persist user preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.liked, JSON.stringify(Array.from(likedIds)));
    } catch {
      // ignore
    }
  }, [likedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.playlists, JSON.stringify(playlists));
    } catch {
      // ignore
    }
  }, [playlists]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ytTracks, JSON.stringify(youtubeTracks));
    } catch {
      // ignore
    }
  }, [youtubeTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.volume, String(volume));
    } catch {
      // ignore
    }
    engine.setVolume(volume);
  }, [volume, engine]);

  useEffect(() => {
    engine.setMuted(muted);
  }, [muted, engine]);

  useEffect(() => {
    return () => {
      engine.destroy();
    };
  }, [engine]);

  // Navigation helpers
  const navigateTo = useCallback(
    (next: NavView) => {
      setHistory((prev) => {
        const current = prev[historyIdx];
        if (JSON.stringify(current) === JSON.stringify(next)) return prev;
        const sliced = prev.slice(0, historyIdx + 1);
        const updated = [...sliced, next];
        setHistoryIdx(updated.length - 1);
        return updated;
      });
    },
    [historyIdx]
  );

  const canGoBack = historyIdx > 0;
  const canGoForward = historyIdx < history.length - 1;

  const goBack = () => {
    if (canGoBack) setHistoryIdx((i) => i - 1);
  };

  const goForward = () => {
    if (canGoForward) setHistoryIdx((i) => i + 1);
  };

  // Playback handlers
  const startTrack = useCallback(
    (track: Track, list?: Track[], recordHistory = true) => {
      if (currentTrack && recordHistory && currentTrack.id !== track.id) {
        setPlayHistory((prev) => [currentTrack, ...prev].slice(0, 30));
      }
      if (list && list.length > 0) {
        setContextTracks(list);
      }
      setCurrentTrack(track);
      setCurrentTime(0);
      setIsPlaying(true);
      engine.loadAndPlay(track, 0);
    },
    [currentTrack, engine]
  );

  const handlePlayTrack = useCallback(
    (track: Track, list: Track[]) => {
      if (currentTrack?.id === track.id) {
        if (isPlaying) {
          engine.pause();
          setIsPlaying(false);
        } else {
          if (currentTime === 0) {
            engine.loadAndPlay(track, 0);
          } else {
            engine.play();
          }
          setIsPlaying(true);
        }
        return;
      }
      startTrack(track, list);
    },
    [currentTrack, isPlaying, currentTime, engine, startTrack]
  );

  const handleTogglePlay = useCallback(() => {
    if (!currentTrack) return;
    if (isPlaying) {
      engine.pause();
      setIsPlaying(false);
    } else {
      if (currentTime === 0) {
        engine.loadAndPlay(currentTrack, 0);
      } else {
        engine.play();
      }
      setIsPlaying(true);
    }
  }, [currentTrack, isPlaying, currentTime, engine]);

  const handlePlayCollection = useCallback(
    (tracks: Track[], shouldShuffle = false) => {
      if (tracks.length === 0) return;
      if (shouldShuffle) {
        setShuffle(true);
        const randomIdx = Math.floor(Math.random() * tracks.length);
        startTrack(tracks[randomIdx], tracks);
      } else {
        setShuffle(false);
        startTrack(tracks[0], tracks);
      }
    },
    [startTrack]
  );

  const handleNext = useCallback(() => {
    if (!currentTrack) return;

    if (repeatMode === 'one') {
      engine.loadAndPlay(currentTrack, 0);
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }

    if (manualQueue.length > 0) {
      const [nextQueued, ...rest] = manualQueue;
      setManualQueue(rest);
      startTrack(nextQueued);
      return;
    }

    const pool = contextTracks.length > 0 ? contextTracks : allTracks;
    if (pool.length === 0) return;

    if (shuffle && pool.length > 1) {
      const candidates = pool.filter((t) => t.id !== currentTrack.id);
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      startTrack(next, pool);
      return;
    }

    const idx = pool.findIndex((t) => t.id === currentTrack.id);
    if (idx === -1) {
      startTrack(pool[0], pool);
      return;
    }

    if (idx + 1 < pool.length) {
      startTrack(pool[idx + 1], pool);
    } else if (repeatMode === 'all') {
      startTrack(pool[0], pool);
    } else {
      engine.pause();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [currentTrack, repeatMode, manualQueue, contextTracks, allTracks, shuffle, engine, startTrack]);

  const handlePrev = useCallback(() => {
    if (!currentTrack) return;

    if (currentTime > 3) {
      engine.seek(0);
      setCurrentTime(0);
      return;
    }

    if (playHistory.length > 0) {
      const [prevTrack, ...rest] = playHistory;
      setPlayHistory(rest);
      startTrack(prevTrack, contextTracks, false);
      return;
    }

    const pool = contextTracks.length > 0 ? contextTracks : allTracks;
    const idx = pool.findIndex((t) => t.id === currentTrack.id);
    if (idx > 0) {
      startTrack(pool[idx - 1], pool, false);
    } else if (pool.length > 0) {
      startTrack(pool[pool.length - 1], pool, false);
    }
  }, [currentTrack, currentTime, playHistory, contextTracks, allTracks, engine, startTrack]);

  // Wire engine callbacks (including live YouTube duration & background playback source updates)
  useEffect(() => {
    engine.setCallbacks(
      (sec, realDuration) => {
        setCurrentTime(sec);
        if (realDuration && Number.isFinite(realDuration) && realDuration > 10) {
          const rounded = Math.round(realDuration);
          setCurrentTrack((prev) => {
            if (!prev || Math.abs(prev.duration - rounded) <= 2) return prev;
            return { ...prev, duration: rounded };
          });
        }
      },
      () => handleNext(),
      (mode) => setPlaybackSource(mode)
    );
  }, [engine, handleNext]);

  // Background & OS Media Session API integration
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.albumTitle,
        artwork: currentTrack.coverUrl
          ? [{ src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => handleTogglePlay());
      navigator.mediaSession.setActionHandler('pause', () => handleTogglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') {
          engine.seek(details.seekTime);
          setCurrentTime(details.seekTime);
        }
      });
    } catch {
      // ignore unsupported MediaSession environments
    }
  }, [currentTrack, isPlaying, handleTogglePlay, handlePrev, handleNext, engine]);

  // Compute Up Next preview for QueuePanel
  const upNextTracks = useMemo(() => {
    if (!currentTrack) return manualQueue;
    const pool = contextTracks.length > 0 ? contextTracks : allTracks;
    const idx = pool.findIndex((t) => t.id === currentTrack.id);
    const contextUpcoming = idx >= 0 ? pool.slice(idx + 1, idx + 8) : pool.slice(0, 6);
    return [...manualQueue, ...contextUpcoming];
  }, [manualQueue, contextTracks, allTracks, currentTrack]);

  const handlePlayFromQueue = (idx: number) => {
    if (idx < manualQueue.length) {
      const chosen = manualQueue[idx];
      setManualQueue((prev) => prev.filter((_, i) => i !== idx));
      startTrack(chosen);
    } else {
      const target = upNextTracks[idx];
      if (target) startTrack(target, contextTracks);
    }
  };

  const handleRemoveFromQueue = (idx: number) => {
    if (idx < manualQueue.length) {
      setManualQueue((prev) => prev.filter((_, i) => i !== idx));
    } else {
      showToast('Upcoming album tracks play in sequence');
    }
  };

  // Library actions
  const handleToggleLike = useCallback(
    (trackId: string) => {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (next.has(trackId)) {
          next.delete(trackId);
          showToast('Removed from Liked Songs');
        } else {
          next.add(trackId);
          showToast('Saved to Liked Songs');
        }
        return next;
      });
    },
    [showToast]
  );

  const handleAddToQueue = useCallback(
    (track: Track) => {
      setManualQueue((prev) => [...prev, track]);
      showToast(`Added "${track.title}" to queue`);
    },
    [showToast]
  );

  const handleCreatePlaylist = (name: string, description: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description,
      trackIds: [],
      createdAt: Date.now(),
    };
    setPlaylists((prev) => [newPl, ...prev]);
    navigateTo({ type: 'playlist', id: newPl.id });
    showToast(`Created playlist "${name}"`);
  };

  const handleAddToPlaylist = (playlistId: string, trackId: string) => {
    const track = allTracks.find((t) => t.id === trackId);
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.trackIds.includes(trackId)) return pl;
        return {
          ...pl,
          coverUrl: pl.coverUrl || track?.coverUrl,
          trackIds: [...pl.trackIds, trackId],
        };
      })
    );
    const targetPl = playlists.find((p) => p.id === playlistId);
    if (targetPl && track) {
      showToast(`Added "${track.title}" to ${targetPl.name}`);
    }
  };

  const handleRemoveFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) }
          : pl
      )
    );
    showToast('Removed from playlist');
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
    navigateTo({ type: 'home' });
    showToast('Playlist deleted');
  };

  const handleAddYouTubeTrack = useCallback(
    (result: YouTubeSearchResult) => {
      const trackId = `yt-${result.videoId}`;
      const existing = allTracks.find((t) => t.id === trackId || t.youtubeId === result.videoId);

      if (existing) {
        startTrack(existing, [existing, ...youtubeTracks]);
        showToast(`Playing "${existing.title}" in background`);
        return;
      }

      const newTrack: Track = {
        id: trackId,
        title: result.title,
        artist: result.artist,
        albumId: 'yt-library',
        albumTitle: 'YouTube Background',
        coverUrl: result.thumbnailUrl,
        duration: result.durationSeconds > 0 ? result.durationSeconds : 215,
        genre: 'YouTube Audio',
        year: new Date().getFullYear(),
        bpm: 115,
        youtubeId: result.videoId,
        youtubeQuery: `${result.title} ${result.artist}`,
      };

      const nextYtTracks = [newTrack, ...youtubeTracks];
      setYoutubeTracks(nextYtTracks);

      setPlaylists((prev) => {
        const ytPl = prev.find((p) => p.id === 'pl-youtube-library');
        if (ytPl) {
          if (ytPl.trackIds.includes(newTrack.id)) return prev;
          return prev.map((p) =>
            p.id === 'pl-youtube-library'
              ? {
                  ...p,
                  coverUrl: p.coverUrl || newTrack.coverUrl,
                  trackIds: [newTrack.id, ...p.trackIds],
                }
              : p
          );
        }
        return [
          {
            id: 'pl-youtube-library',
            name: 'YouTube Library',
            description: 'Songs linked from YouTube for ad-free background streaming.',
            coverUrl: newTrack.coverUrl,
            trackIds: [newTrack.id],
            createdAt: Date.now(),
          },
          ...prev,
        ];
      });

      startTrack(newTrack, nextYtTracks);
      showToast(`Playing "${newTrack.title}" in background`);
    },
    [allTracks, youtubeTracks, startTrack, showToast]
  );

  const handleImportLocalFiles = async (files: FileList) => {
    const imported: Track[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('audio/')) continue;
      const url = URL.createObjectURL(file);
      const duration = await new Promise<number>((resolve) => {
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration) : 180);
        audio.onerror = () => resolve(180);
        audio.src = url;
      });

      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
      imported.push({
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: cleanTitle,
        artist: 'Local File',
        albumId: 'local-files',
        albumTitle: 'Local Library',
        coverUrl: '',
        duration,
        genre: 'Local Audio',
        year: new Date().getFullYear(),
        bpm: 0,
        isLocal: true,
        localUrl: url,
      });
    }

    if (imported.length === 0) {
      showToast('No supported audio files found');
      return;
    }

    setLocalTracks((prev) => [...prev, ...imported]);

    setPlaylists((prev) => {
      const existing = prev.find((p) => p.id === 'pl-local-files');
      const newIds = imported.map((t) => t.id);
      if (existing) {
        return prev.map((p) =>
          p.id === 'pl-local-files'
            ? { ...p, trackIds: [...p.trackIds, ...newIds] }
            : p
        );
      }
      return [
        {
          id: 'pl-local-files',
          name: 'Local Audio',
          description: 'Audio files imported from your device for ad-free playback.',
          trackIds: newIds,
          createdAt: Date.now(),
        },
        ...prev,
      ];
    });

    navigateTo({ type: 'playlist', id: 'pl-local-files' });
    startTrack(imported[0], imported);
    showToast(`Imported ${imported.length} audio file${imported.length > 1 ? 's' : ''}`);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setMuted((m) => !m);
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setQueueOpen((q) => !q);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextTime = Math.min(currentTrack?.duration ?? 0, currentTime + 5);
        engine.seek(nextTime);
        setCurrentTime(nextTime);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevTime = Math.max(0, currentTime - 5);
        engine.seek(prevTime);
        setCurrentTime(prevTime);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePlay, handleNext, handlePrev, currentTime, currentTrack, engine]);

  const likedTracks = useMemo(
    () => allTracks.filter((t) => likedIds.has(t.id)),
    [allTracks, likedIds]
  );

  // Render active main viewport
  const renderMainView = () => {
    if (activeView.type === 'home') {
      return (
        <HomeView
          albums={ALBUMS}
          playlists={playlists}
          allTracks={allTracks}
          currentTrackId={currentTrack?.id ?? null}
          isPlaying={isPlaying}
          likedIds={likedIds}
          onPlayTrack={handlePlayTrack}
          onPlayCollection={handlePlayCollection}
          onOpenAlbum={(id) => navigateTo({ type: 'album', id })}
          onOpenArtist={(name) => navigateTo({ type: 'artist', name })}
          onOpenPlaylist={(id) => navigateTo({ type: 'playlist', id })}
          onToggleLike={handleToggleLike}
          onAddToQueue={handleAddToQueue}
          onAddToPlaylist={handleAddToPlaylist}
        />
      );
    }

    if (activeView.type === 'search') {
      return (
        <SearchView
          query={searchQuery}
          selectedGenre={selectedGenre}
          albums={ALBUMS}
          allTracks={allTracks}
          playlists={playlists}
          currentTrackId={currentTrack?.id ?? null}
          isPlaying={isPlaying}
          likedIds={likedIds}
          onGenreChange={setSelectedGenre}
          onClearSearch={() => {
            setSearchQuery('');
            setSelectedGenre('All');
          }}
          onPlayTrack={handlePlayTrack}
          onPlayYouTubeResult={handleAddYouTubeTrack}
          onOpenAlbum={(id) => navigateTo({ type: 'album', id })}
          onOpenArtist={(name) => navigateTo({ type: 'artist', name })}
          onToggleLike={handleToggleLike}
          onAddToQueue={handleAddToQueue}
          onAddToPlaylist={handleAddToPlaylist}
        />
      );
    }

    if (activeView.type === 'artist') {
      return (
        <ArtistView
          artistName={activeView.name}
          artists={ARTISTS}
          albums={ALBUMS}
          allTracks={allTracks}
          currentTrackId={currentTrack?.id ?? null}
          isPlaying={isPlaying}
          likedIds={likedIds}
          playlists={playlists}
          onPlayCollection={handlePlayCollection}
          onPlayTrack={handlePlayTrack}
          onToggleLike={handleToggleLike}
          onAddToQueue={handleAddToQueue}
          onAddToPlaylist={handleAddToPlaylist}
          onOpenAlbum={(id) => navigateTo({ type: 'album', id })}
          onOpenArtist={(name) => navigateTo({ type: 'artist', name })}
          onBrowseHome={() => navigateTo({ type: 'home' })}
        />
      );
    }

    if (activeView.type === 'liked') {
      return (
        <DetailView
          kind="liked"
          title="Liked Songs"
          subtitle="Your Favorites"
          description="Every track you have saved across albums and sessions."
          tracks={likedTracks}
          currentTrackId={currentTrack?.id ?? null}
          isPlaying={isPlaying}
          likedIds={likedIds}
          playlists={playlists}
          onPlayCollection={handlePlayCollection}
          onPlayTrack={handlePlayTrack}
          onToggleLike={handleToggleLike}
          onAddToQueue={handleAddToQueue}
          onAddToPlaylist={handleAddToPlaylist}
          onOpenAlbum={(id) => navigateTo({ type: 'album', id })}
          onOpenArtist={(name) => navigateTo({ type: 'artist', name })}
          onBrowseHome={() => navigateTo({ type: 'home' })}
        />
      );
    }

    if (activeView.type === 'album') {
      const album = ALBUMS.find((a) => a.id === activeView.id) ?? ALBUMS[0];
      const albumTracks = allTracks.filter((t) => t.albumId === album.id);
      return (
        <DetailView
          kind="album"
          title={album.title}
          subtitle={`${album.artist} · ${album.year} · ${album.genre}`}
          description={album.description}
          coverUrl={album.coverUrl}
          tracks={albumTracks}
          currentTrackId={currentTrack?.id ?? null}
          isPlaying={isPlaying}
          likedIds={likedIds}
          playlists={playlists}
          onPlayCollection={handlePlayCollection}
          onPlayTrack={handlePlayTrack}
          onToggleLike={handleToggleLike}
          onAddToQueue={handleAddToQueue}
          onAddToPlaylist={handleAddToPlaylist}
          onOpenAlbum={(id) => navigateTo({ type: 'album', id })}
          onOpenArtist={(name) => navigateTo({ type: 'artist', name })}
          onBrowseHome={() => navigateTo({ type: 'home' })}
        />
      );
    }

    if (activeView.type === 'playlist') {
      const playlist = playlists.find((p) => p.id === activeView.id);
      if (!playlist) {
        return (
          <div className="py-20 text-center space-y-3">
            <p className="text-base font-semibold text-white">Playlist not found</p>
            <button
              type="button"
              onClick={() => navigateTo({ type: 'home' })}
              className="px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold"
            >
              Return Home
            </button>
          </div>
        );
      }

      const plTracks = playlist.trackIds
        .map((id) => allTracks.find((t) => t.id === id))
        .filter((t): t is Track => Boolean(t));

      return (
        <DetailView
          kind="playlist"
          title={playlist.name}
          subtitle="Playlist"
          description={playlist.description}
          coverUrl={playlist.coverUrl || plTracks[0]?.coverUrl}
          tracks={plTracks}
          currentTrackId={currentTrack?.id ?? null}
          isPlaying={isPlaying}
          likedIds={likedIds}
          playlists={playlists}
          playlistId={playlist.id}
          canDeletePlaylist={!playlist.isSystem}
          onPlayCollection={handlePlayCollection}
          onPlayTrack={handlePlayTrack}
          onToggleLike={handleToggleLike}
          onAddToQueue={handleAddToQueue}
          onAddToPlaylist={handleAddToPlaylist}
          onRemoveFromPlaylist={handleRemoveFromPlaylist}
          onDeletePlaylist={handleDeletePlaylist}
          onOpenAlbum={(id) => navigateTo({ type: 'album', id })}
          onOpenArtist={(name) => navigateTo({ type: 'artist', name })}
          onBrowseHome={() => navigateTo({ type: 'home' })}
        />
      );
    }

    return null;
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0B0C0E] text-[#F4F5F6]">
      {/* Middle 3-Pane Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Navigation & Library Rail */}
        <Sidebar
          activeView={activeView}
          likedCount={likedIds.size}
          playlists={playlists}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onNavigate={navigateTo}
          onOpenNewPlaylist={() => setCreatePlaylistOpen(true)}
          onOpenAddYouTube={() => setAddYouTubeOpen(true)}
          onImportLocalFiles={handleImportLocalFiles}
        />

        {/* Center Main Viewport */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0B0C0E]">
          {/* Clean Top Workspace Bar */}
          <header className="h-16 px-4 md:px-6 flex items-center justify-between gap-4 border-b border-white/[0.06] shrink-0 bg-[#0B0C0E]/95 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-2 rounded-md text-neutral-300 hover:text-white hover:bg-white/[0.07]"
              >
                <Menu size={18} />
              </button>

              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={!canGoBack}
                  aria-label="Go back"
                  className="w-8 h-8 rounded-full bg-[#15181D] border border-white/[0.07] flex items-center justify-center text-neutral-300 hover:text-white disabled:opacity-35 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={goForward}
                  disabled={!canGoForward}
                  aria-label="Go forward"
                  className="w-8 h-8 rounded-full bg-[#15181D] border border-white/[0.07] flex items-center justify-center text-neutral-300 hover:text-white disabled:opacity-35 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Instant Search Input */}
              <div className="relative flex-1 max-w-md ml-1">
                <SearchIcon
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onFocus={() => {
                    if (activeView.type !== 'search') navigateTo({ type: 'search' });
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (activeView.type !== 'search') navigateTo({ type: 'search' });
                  }}
                  placeholder="Search songs, artists, or albums..."
                  aria-label="Search music catalog"
                  className="w-full pl-9 pr-8 py-2 rounded-full bg-[#15181D] border border-white/[0.08] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/25 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden md:inline text-xs font-medium text-neutral-400 whitespace-nowrap">
                Ad-Free Playback
              </span>
              <button
                type="button"
                onClick={() => setShortcutsOpen(true)}
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts"
                className="p-2 rounded-md text-neutral-400 hover:text-white hover:bg-white/[0.07] transition-colors"
              >
                <HelpCircle size={18} />
              </button>
            </div>
          </header>

          {/* Scrollable Content Body */}
          <main className="flex-1 overflow-y-auto px-4 md:px-7 pt-6">
            <div className="max-w-[1280px] mx-auto">{renderMainView()}</div>
          </main>
        </div>

        {/* Right Queue & Now Playing Drawer */}
        {queueOpen && (
          <div className="fixed right-0 top-0 bottom-[76px] md:bottom-[84px] z-30 xl:static xl:h-full shadow-2xl xl:shadow-none">
            <QueuePanel
              currentTrack={currentTrack}
              upNext={upNextTracks}
              isPlaying={isPlaying}
              playbackSource={playbackSource}
              engine={engine}
              onPlayFromQueue={handlePlayFromQueue}
              onRemoveFromQueue={handleRemoveFromQueue}
              onClearQueue={() => {
                setManualQueue([]);
                showToast('Cleared added queue items');
              }}
              onClose={() => setQueueOpen(false)}
              onOpenAlbum={(id) => navigateTo({ type: 'album', id })}
              onOpenArtist={(name) => navigateTo({ type: 'artist', name })}
            />
          </div>
        )}
      </div>

      {/* Persistent Bottom Player Bar */}
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        volume={volume}
        muted={muted}
        shuffle={shuffle}
        repeatMode={repeatMode}
        isLiked={currentTrack ? likedIds.has(currentTrack.id) : false}
        queueOpen={queueOpen}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={(sec) => {
          engine.seek(sec);
          setCurrentTime(sec);
        }}
        onVolumeChange={(val) => {
          setVolume(val);
          if (val > 0 && muted) setMuted(false);
        }}
        onToggleMute={() => setMuted((m) => !m)}
        onToggleShuffle={() => {
          setShuffle((s) => {
            showToast(!s ? 'Shuffle enabled' : 'Shuffle disabled');
            return !s;
          });
        }}
        onCycleRepeat={() => {
          setRepeatMode((mode) => {
            const next = mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off';
            showToast(
              next === 'all'
                ? 'Repeat all'
                : next === 'one'
                ? 'Repeat current track'
                : 'Repeat off'
            );
            return next;
          });
        }}
        onToggleLike={() => {
          if (currentTrack) handleToggleLike(currentTrack.id);
        }}
        onToggleQueue={() => setQueueOpen((q) => !q)}
        onOpenAlbum={(id) => navigateTo({ type: 'album', id })}
        onOpenArtist={(name) => navigateTo({ type: 'artist', name })}
      />

      {/* Modals */}
      <CreatePlaylistModal
        open={createPlaylistOpen}
        onClose={() => setCreatePlaylistOpen(false)}
        onCreate={handleCreatePlaylist}
      />

      <AddYouTubeModal
        open={addYouTubeOpen}
        onClose={() => setAddYouTubeOpen(false)}
        onAddYouTubeTrack={handleAddYouTubeTrack}
      />

      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Non-intrusive Action Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#1ED760] text-black text-xs font-semibold shadow-xl pointer-events-none"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
