import {
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatTime } from '../data/catalog';
import { RepeatMode, Track } from '../types/music';
import { CoverArt } from './CoverArt';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  isLiked: boolean;
  queueOpen: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleLike: () => void;
  onToggleQueue: () => void;
  onOpenAlbum: (albumId: string) => void;
  onOpenArtist: (artistName: string) => void;
}

export function PlayerBar({
  currentTrack,
  isPlaying,
  currentTime,
  volume,
  muted,
  shuffle,
  repeatMode,
  isLiked,
  queueOpen,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onToggleLike,
  onToggleQueue,
  onOpenAlbum,
  onOpenArtist,
}: PlayerBarProps) {
  const duration = currentTrack?.duration ?? 0;
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const effectiveVolume = muted ? 0 : volume;

  return (
    <footer className="h-[76px] md:h-[84px] bg-[#111317] border-t border-white/[0.08] px-3 md:px-5 flex items-center justify-between gap-4 shrink-0 select-none z-30">
      {/* Left: Track Info */}
      <div className="flex items-center gap-3 min-w-0 w-[30%] md:w-[280px]">
        {currentTrack ? (
          <>
            <button
              type="button"
              onClick={() => !currentTrack.isLocal && onOpenAlbum(currentTrack.albumId)}
              className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ED760]"
              aria-label={`View ${currentTrack.albumTitle}`}
            >
              <CoverArt
                src={currentTrack.coverUrl}
                alt={currentTrack.albumTitle}
                className="w-12 h-12 md:w-14 md:h-14 rounded-md"
                iconSize={20}
              />
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => !currentTrack.isLocal && onOpenAlbum(currentTrack.albumId)}
                className="block text-sm font-semibold text-white truncate max-w-full hover:underline text-left"
              >
                {currentTrack.title}
              </button>
              {!currentTrack.isLocal ? (
                <button
                  type="button"
                  onClick={() => onOpenArtist(currentTrack.artist)}
                  className="block text-xs text-neutral-400 hover:text-white hover:underline truncate max-w-full text-left"
                >
                  {currentTrack.artist}
                </button>
              ) : (
                <div className="text-xs text-neutral-400 truncate">{currentTrack.artist}</div>
              )}
            </div>
            <button
              type="button"
              onClick={onToggleLike}
              aria-label={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
              className={`hidden sm:flex p-2 rounded-full transition-colors shrink-0 ${
                isLiked ? 'text-[#1ED760]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Heart size={16} className={isLiked ? 'fill-[#1ED760]' : ''} />
            </button>
          </>
        ) : (
          <div className="text-xs text-neutral-500">Select a track to start listening</div>
        )}
      </div>

      {/* Center: Playback Controls + Scrubber */}
      <div className="flex-1 max-w-[580px] flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3 md:gap-5">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
            aria-pressed={shuffle}
            className={`hidden sm:flex p-1.5 rounded transition-colors ${
              shuffle ? 'text-[#1ED760]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Shuffle size={16} />
          </button>

          <button
            type="button"
            onClick={onPrev}
            disabled={!currentTrack}
            aria-label="Previous track"
            className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-40 transition-colors"
          >
            <SkipBack size={18} className="fill-current" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#1ED760] hover:bg-[#3BE477] active:scale-95 text-black flex items-center justify-center transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {isPlaying ? (
              <Pause size={18} className="fill-black" />
            ) : (
              <Play size={18} className="fill-black ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!currentTrack}
            aria-label="Next track"
            className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-40 transition-colors"
          >
            <SkipForward size={18} className="fill-current" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            aria-label={`Repeat mode: ${repeatMode}`}
            className={`hidden sm:flex p-1.5 rounded transition-colors ${
              repeatMode !== 'off' ? 'text-[#1ED760]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        {/* Scrubber */}
        <div className="w-full flex items-center gap-2.5">
          <span className="text-[11px] font-mono tabular-nums text-neutral-400 w-9 text-right shrink-0">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 h-4 flex items-center group">
            <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-white group-hover:bg-[#1ED760] transition-colors"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.5}
              value={Math.min(currentTime, duration || 1)}
              disabled={!currentTrack}
              onChange={(e) => onSeek(Number(e.target.value))}
              aria-label="Seek track position"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
            />
          </div>
          <span className="text-[11px] font-mono tabular-nums text-neutral-400 w-9 shrink-0">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Queue & Volume */}
      <div className="hidden md:flex items-center justify-end gap-3 w-[240px]">
        <button
          type="button"
          onClick={onToggleQueue}
          aria-label={queueOpen ? 'Hide queue panel' : 'Show queue panel'}
          aria-pressed={queueOpen}
          className={`p-2 rounded-md transition-colors ${
            queueOpen ? 'text-[#1ED760] bg-white/[0.07]' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ListMusic size={18} />
        </button>

        <div className="flex items-center gap-2 w-32">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
            className="p-1 text-neutral-400 hover:text-white transition-colors"
          >
            {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <div className="relative flex-1 h-4 flex items-center group">
            <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-neutral-200 group-hover:bg-[#1ED760] transition-colors"
                style={{ width: `${effectiveVolume * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={effectiveVolume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              aria-label="Volume"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
