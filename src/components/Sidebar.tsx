import { useRef } from 'react';
import { Heart, Home, Library, Link2, Plus, Search, Upload, X } from 'lucide-react';
import { NavView, Playlist } from '../types/music';
import { CoverArt } from './CoverArt';

interface SidebarProps {
  activeView: NavView;
  likedCount: number;
  playlists: Playlist[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigate: (view: NavView) => void;
  onOpenNewPlaylist: () => void;
  onOpenAddYouTube: () => void;
  onImportLocalFiles: (files: FileList) => void;
}

export function Sidebar({
  activeView,
  likedCount,
  playlists,
  mobileOpen,
  onCloseMobile,
  onNavigate,
  onOpenNewPlaylist,
  onOpenAddYouTube,
  onImportLocalFiles,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const navContent = (
    <div className="flex flex-col h-full bg-[#111317] border-r border-white/[0.07] select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.05] shrink-0">
        <button
          type="button"
          onClick={() => {
            onNavigate({ type: 'home' });
            onCloseMobile();
          }}
          className="text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ED760] rounded"
        >
          Vespera
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="lg:hidden p-2 text-neutral-400 hover:text-white rounded-md"
        >
          <X size={18} />
        </button>
      </div>

      {/* Primary Nav */}
      <nav className="px-3 py-4 space-y-1 border-b border-white/[0.05]" aria-label="Primary">
        <button
          type="button"
          onClick={() => {
            onNavigate({ type: 'home' });
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeView.type === 'home'
              ? 'bg-white/[0.09] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Home size={18} />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigate({ type: 'search' });
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeView.type === 'search'
              ? 'bg-white/[0.09] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Search size={18} />
          <span>Search</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigate({ type: 'liked' });
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeView.type === 'liked'
              ? 'bg-white/[0.09] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span className="flex items-center gap-3">
            <Heart size={18} className={activeView.type === 'liked' ? 'text-[#1ED760] fill-[#1ED760]' : ''} />
            <span>Liked Songs</span>
          </span>
          <span className="text-xs font-mono tabular-nums text-neutral-500">{likedCount}</span>
        </button>
      </nav>

      {/* Library Section */}
      <div className="flex-1 flex flex-col min-h-0 px-3 pt-4 pb-3">
        <div className="flex items-center justify-between px-3 mb-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
            <Library size={15} />
            <span>Your Library</span>
          </div>
          <button
            type="button"
            onClick={onOpenNewPlaylist}
            aria-label="Create playlist"
            title="Create playlist"
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/[0.07] transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {playlists.map((pl) => {
            const isSelected = activeView.type === 'playlist' && activeView.id === pl.id;
            return (
              <button
                key={pl.id}
                type="button"
                onClick={() => {
                  onNavigate({ type: 'playlist', id: pl.id });
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-left transition-colors ${
                  isSelected ? 'bg-white/[0.09]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <CoverArt
                  src={pl.coverUrl}
                  alt={pl.name}
                  className="w-10 h-10 rounded"
                  iconSize={16}
                />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium truncate ${isSelected ? 'text-[#1ED760]' : 'text-neutral-200'}`}>
                    {pl.name}
                  </div>
                  <div className="text-xs text-neutral-500 truncate font-mono tabular-nums">
                    Playlist · {pl.trackIds.length} tracks
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Add YouTube & Local Audio Actions */}
        <div className="pt-3 mt-2 border-t border-white/[0.06] space-y-2">
          <button
            type="button"
            onClick={() => {
              onOpenAddYouTube();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#1ED760]/15 hover:bg-[#1ED760]/25 border border-[#1ED760]/30 text-xs font-semibold text-[#1ED760] transition-colors whitespace-nowrap"
          >
            <Link2 size={14} />
            <span>Add YouTube Song</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onImportLocalFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.07] text-xs font-medium text-neutral-200 transition-colors whitespace-nowrap"
          >
            <Upload size={14} />
            <span>Import Local Audio</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Rail */}
      <aside className="hidden lg:block w-64 shrink-0 h-full">{navContent}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 h-full relative z-10">{navContent}</div>
          <div
            className="flex-1 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
        </div>
      )}
    </>
  );
}
