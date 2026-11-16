import { useEffect, useRef, useState } from 'react';
import { Heart, ListPlus, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { formatTime } from '../data/catalog';
import { Playlist, Track } from '../types/music';
import { CoverArt } from './CoverArt';

interface TrackTableProps {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  likedIds: Set<string>;
  playlists: Playlist[];
  showAlbumColumn?: boolean;
  removablePlaylistId?: string;
  onPlayTrack: (track: Track, list: Track[]) => void;
  onToggleLike: (trackId: string) => void;
  onAddToQueue: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveFromPlaylist?: (playlistId: string, trackId: string) => void;
  onOpenAlbum?: (albumId: string) => void;
  onOpenArtist?: (artistName: string) => void;
}

export function TrackTable({
  tracks,
  currentTrackId,
  isPlaying,
  likedIds,
  playlists,
  showAlbumColumn = true,
  removablePlaylistId,
  onPlayTrack,
  onToggleLike,
  onAddToQueue,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onOpenAlbum,
  onOpenArtist,
}: TrackTableProps) {
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenuTrackId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuTrackId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuTrackId]);

  if (tracks.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Header Row */}
      <div
        className={`grid items-center gap-3 px-4 py-2.5 text-xs font-medium text-neutral-400 border-b border-white/[0.07] ${
          showAlbumColumn
            ? 'grid-cols-[32px_minmax(0,2fr)_minmax(0,1.2fr)_110px_84px]'
            : 'grid-cols-[32px_minmax(0,2fr)_110px_84px]'
        }`}
      >
        <div className="text-center font-mono">#</div>
        <div>Title</div>
        {showAlbumColumn && <div className="hidden md:block">Album</div>}
        <div className="hidden sm:block text-right">Tempo</div>
        <div className="text-right">Duration</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.04]">
        {tracks.map((track, idx) => {
          const isCurrent = track.id === currentTrackId;
          const isLiked = likedIds.has(track.id);
          const isMenuOpen = openMenuTrackId === track.id;

          return (
            <div
              key={`${track.id}-${idx}`}
              onDoubleClick={() => onPlayTrack(track, tracks)}
              className={`group grid items-center gap-3 px-4 py-2 rounded-md transition-colors duration-150 ${
                showAlbumColumn
                  ? 'grid-cols-[32px_minmax(0,2fr)_minmax(0,1.2fr)_110px_84px]'
                  : 'grid-cols-[32px_minmax(0,2fr)_110px_84px]'
              } ${
                isCurrent
                  ? 'bg-white/[0.07]'
                  : 'hover:bg-white/[0.05]'
              }`}
            >
              {/* Index / Play Toggle */}
              <div className="flex items-center justify-center w-8 h-8">
                <button
                  type="button"
                  onClick={() => onPlayTrack(track, tracks)}
                  aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                  className="w-8 h-8 flex items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ED760]"
                >
                  {isCurrent && isPlaying ? (
                    <>
                      <span className="flex items-end gap-[2px] h-3.5 group-hover:hidden" aria-hidden="true">
                        <span className="w-[3px] h-full bg-[#1ED760] rounded-xs animate-eq-1" />
                        <span className="w-[3px] h-full bg-[#1ED760] rounded-xs animate-eq-2" />
                        <span className="w-[3px] h-full bg-[#1ED760] rounded-xs animate-eq-3" />
                      </span>
                      <Pause size={15} className="hidden group-hover:block text-white fill-white" />
                    </>
                  ) : (
                    <>
                      <span
                        className={`text-sm font-mono tabular-nums group-hover:hidden ${
                          isCurrent ? 'text-[#1ED760]' : 'text-neutral-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <Play size={15} className="hidden group-hover:block text-white fill-white" />
                    </>
                  )}
                </button>
              </div>

              {/* Cover + Title + Artist */}
              <div className="flex items-center gap-3 min-w-0">
                <CoverArt
                  src={track.coverUrl}
                  alt={`${track.albumTitle} cover`}
                  className="w-10 h-10 rounded"
                  iconSize={16}
                />
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onPlayTrack(track, tracks)}
                    className={`block text-left text-sm font-medium truncate max-w-full hover:underline focus-visible:outline-none ${
                      isCurrent ? 'text-[#1ED760]' : 'text-neutral-100'
                    }`}
                  >
                    {track.title}
                  </button>
                  <div className="text-xs text-neutral-400 truncate flex items-center gap-1.5">
                    {onOpenArtist && !track.isLocal ? (
                      <button
                        type="button"
                        onClick={() => onOpenArtist(track.artist)}
                        className="hover:text-white hover:underline truncate"
                      >
                        {track.artist}
                      </button>
                    ) : (
                      <span className="truncate">{track.artist}</span>
                    )}
                    <span className="text-neutral-600" aria-hidden="true">·</span>
                    <span className="truncate">{track.genre}</span>
                  </div>
                </div>
              </div>

              {/* Album Column */}
              {showAlbumColumn && (
                <div className="hidden md:block min-w-0">
                  {onOpenAlbum && !track.isLocal ? (
                    <button
                      type="button"
                      onClick={() => onOpenAlbum(track.albumId)}
                      className="text-sm text-neutral-400 hover:text-neutral-100 hover:underline truncate max-w-full text-left"
                    >
                      {track.albumTitle}
                    </button>
                  ) : (
                    <span className="text-sm text-neutral-400 truncate block">{track.albumTitle}</span>
                  )}
                </div>
              )}

              {/* Tempo */}
              <div className="hidden sm:block text-right text-xs font-mono tabular-nums text-neutral-500">
                {track.bpm > 0 ? `${track.bpm} BPM` : 'Audio'}
              </div>

              {/* Actions + Duration */}
              <div className="flex items-center justify-end gap-1.5 relative">
                <button
                  type="button"
                  onClick={() => onToggleLike(track.id)}
                  aria-label={isLiked ? `Remove ${track.title} from Liked Songs` : `Save ${track.title} to Liked Songs`}
                  className={`p-1.5 rounded transition-colors ${
                    isLiked
                      ? 'text-[#1ED760] opacity-100'
                      : 'text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white focus:opacity-100'
                  }`}
                >
                  <Heart size={15} className={isLiked ? 'fill-[#1ED760]' : ''} />
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenuTrackId(isMenuOpen ? null : track.id)}
                    aria-label={`More actions for ${track.title}`}
                    className="p-1.5 rounded text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white focus:opacity-100 transition-colors"
                  >
                    <Plus size={15} />
                  </button>

                  {isMenuOpen && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-8 z-40 w-52 bg-[#1A1D22] border border-white/10 rounded-lg shadow-2xl py-1.5 text-sm"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onAddToQueue(track);
                          setOpenMenuTrackId(null);
                        }}
                        className="w-full px-3 py-2 text-left text-neutral-200 hover:bg-white/[0.08] flex items-center gap-2.5"
                      >
                        <ListPlus size={15} className="text-neutral-400" />
                        <span>Add to queue</span>
                      </button>

                      {removablePlaylistId && onRemoveFromPlaylist && (
                        <button
                          type="button"
                          onClick={() => {
                            onRemoveFromPlaylist(removablePlaylistId, track.id);
                            setOpenMenuTrackId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-rose-400 hover:bg-white/[0.08] flex items-center gap-2.5"
                        >
                          <Trash2 size={15} />
                          <span>Remove from playlist</span>
                        </button>
                      )}

                      <div className="my-1 border-t border-white/[0.07]" />
                      <div className="px-3 py-1 text-xs font-medium text-neutral-500">Add to playlist</div>
                      <div className="max-h-40 overflow-y-auto">
                        {playlists.map((pl) => (
                          <button
                            key={pl.id}
                            type="button"
                            onClick={() => {
                              onAddToPlaylist(pl.id, track.id);
                              setOpenMenuTrackId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-neutral-300 hover:bg-white/[0.08] truncate"
                          >
                            {pl.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <span className="w-11 text-right text-xs font-mono tabular-nums text-neutral-400">
                  {formatTime(track.duration)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
