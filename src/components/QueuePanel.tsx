import { X } from 'lucide-react';
import { AudioPlayerEngine } from '../audio/engine';
import { formatTime } from '../data/catalog';
import { Track } from '../types/music';
import { CoverArt } from './CoverArt';
import { SpectrumCanvas } from './SpectrumCanvas';

interface QueuePanelProps {
  currentTrack: Track | null;
  upNext: Track[];
  isPlaying: boolean;
  playbackSource: 'youtube' | 'studio' | 'local';
  engine: AudioPlayerEngine;
  onPlayFromQueue: (index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onClose: () => void;
  onOpenAlbum: (albumId: string) => void;
  onOpenArtist: (artistName: string) => void;
}

export function QueuePanel({
  currentTrack,
  upNext,
  isPlaying,
  playbackSource,
  engine,
  onPlayFromQueue,
  onRemoveFromQueue,
  onClearQueue,
  onClose,
  onOpenAlbum,
  onOpenArtist,
}: QueuePanelProps) {
  const sourceLabel =
    playbackSource === 'youtube'
      ? 'YouTube Audio · Background'
      : playbackSource === 'local'
      ? 'Local Audio File'
      : 'Studio Audio';

  return (
    <aside className="w-[300px] shrink-0 h-full bg-[#111317] border-l border-white/[0.07] flex flex-col select-none">
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.06] shrink-0">
        <h2 className="text-sm font-semibold text-white">Now Playing & Queue</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close queue panel"
          className="p-1.5 text-neutral-400 hover:text-white rounded-md transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Now Playing Card */}
        {currentTrack && (
          <div className="space-y-3">
            <CoverArt
              src={currentTrack.coverUrl}
              alt={currentTrack.albumTitle}
              className="w-full aspect-square rounded-lg"
              iconSize={40}
            />

            <div>
              <button
                type="button"
                onClick={() => !currentTrack.isLocal && onOpenAlbum(currentTrack.albumId)}
                className="text-base font-bold text-white hover:underline text-left block truncate max-w-full"
              >
                {currentTrack.title}
              </button>
              <div className="text-sm text-neutral-400 truncate flex items-center gap-1.5">
                {!currentTrack.isLocal ? (
                  <button
                    type="button"
                    onClick={() => onOpenArtist(currentTrack.artist)}
                    className="hover:text-white hover:underline truncate"
                  >
                    {currentTrack.artist}
                  </button>
                ) : (
                  <span className="truncate">{currentTrack.artist}</span>
                )}
                <span className="text-neutral-600 shrink-0" aria-hidden="true">·</span>
                <span className="truncate">{currentTrack.albumTitle}</span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">{sourceLabel}</div>
            </div>

            <div className="pt-2 border-t border-white/[0.06]">
              <SpectrumCanvas engine={engine} isPlaying={isPlaying} />
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold text-neutral-400">Next in Queue</h3>
            {upNext.length > 0 && (
              <button
                type="button"
                onClick={onClearQueue}
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {upNext.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4">
              Your upcoming queue is empty. Add tracks using the + button on any song.
            </p>
          ) : (
            <div className="space-y-1">
              {upNext.map((track, idx) => (
                <div
                  key={`${track.id}-q-${idx}`}
                  className="group flex items-center gap-2.5 p-1.5 rounded-md hover:bg-white/[0.05] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onPlayFromQueue(idx)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                  >
                    <CoverArt
                      src={track.coverUrl}
                      alt={track.albumTitle}
                      className="w-9 h-9 rounded"
                      iconSize={14}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-neutral-200 truncate group-hover:text-white">
                        {track.title}
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate">{track.artist}</div>
                    </div>
                  </button>

                  <span className="text-[11px] font-mono tabular-nums text-neutral-500 group-hover:hidden">
                    {formatTime(track.duration)}
                  </span>

                  <button
                    type="button"
                    onClick={() => onRemoveFromQueue(idx)}
                    aria-label={`Remove ${track.title} from queue`}
                    className="hidden group-hover:flex p-1 text-neutral-400 hover:text-white rounded"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
