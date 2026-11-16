import { useEffect, useState } from 'react';
import { Heart, Loader2, Pause, Play, Radio, Search, Shuffle, Trash2 } from 'lucide-react';
import { ARTISTS, formatTime, GENRES, HERO_BANNER_URL } from '../data/catalog';
import { Album, ArtistProfile, Playlist, Track, YouTubeSearchResult } from '../types/music';
import { CoverArt } from './CoverArt';
import { TrackTable } from './TrackTable';

interface HomeViewProps {
  albums: Album[];
  playlists: Playlist[];
  allTracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  likedIds: Set<string>;
  onPlayTrack: (track: Track, list: Track[]) => void;
  onPlayCollection: (tracks: Track[], shuffle?: boolean) => void;
  onOpenAlbum: (albumId: string) => void;
  onOpenArtist: (artistName: string) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onToggleLike: (trackId: string) => void;
  onAddToQueue: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
}

export function HomeView({
  albums,
  playlists,
  allTracks,
  currentTrackId,
  isPlaying,
  likedIds,
  onPlayTrack,
  onPlayCollection,
  onOpenAlbum,
  onOpenArtist,
  onOpenPlaylist,
  onToggleLike,
  onAddToQueue,
  onAddToPlaylist,
}: HomeViewProps) {
  const quickItems = [
    ...playlists.slice(0, 3).map((pl) => ({
      kind: 'playlist' as const,
      id: pl.id,
      title: pl.name,
      coverUrl: pl.coverUrl,
      tracks: pl.trackIds
        .map((id) => allTracks.find((t) => t.id === id))
        .filter((t): t is Track => Boolean(t)),
    })),
    ...albums.slice(0, 3).map((alb) => ({
      kind: 'album' as const,
      id: alb.id,
      title: alb.title,
      coverUrl: alb.coverUrl,
      tracks: allTracks.filter((t) => t.albumId === alb.id),
    })),
  ];

  const popularAlbums = albums.filter((a) => a.isPopular);
  const moreAlbums = albums.filter((a) => !a.isPopular);
  const featuredTracks = [
    allTracks.find((t) => t.id === 'trk-ani-1'),
    allTracks.find((t) => t.id === 'trk-ani-3'),
    allTracks.find((t) => t.id === 'trk-arr-1'),
    allTracks.find((t) => t.id === 'trk-sid-1'),
    allTracks.find((t) => t.id === 'trk-ari-1'),
    allTracks.find((t) => t.id === 'trk-wkd-1'),
    allTracks.find((t) => t.id === 'trk-dp-1'),
    allTracks.find((t) => t.id === 'trk-nh-1'),
  ].filter((t): t is Track => Boolean(t));

  const renderAlbumGrid = (list: Album[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
      {list.map((album) => {
        const albumTracks = allTracks.filter((t) => t.albumId === album.id);
        const isAlbumPlaying =
          isPlaying && albumTracks.some((t) => t.id === currentTrackId);

        return (
          <div
            key={album.id}
            className="group bg-[#14171C] hover:bg-[#1B1F26] border border-white/[0.06] rounded-lg p-3.5 transition-colors flex flex-col"
          >
            <div className="relative mb-3">
              <button
                type="button"
                onClick={() => onOpenAlbum(album.id)}
                className="block w-full text-left rounded-md overflow-hidden"
              >
                <CoverArt
                  src={album.coverUrl}
                  alt={album.title}
                  className="w-full aspect-square rounded-md"
                  iconSize={28}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (albumTracks.length > 0) {
                    onPlayTrack(albumTracks[0], albumTracks);
                  }
                }}
                aria-label={`Play ${album.title}`}
                className={`absolute right-2 bottom-2 w-10 h-10 rounded-full bg-[#1ED760] hover:bg-[#3BE477] text-black flex items-center justify-center shadow-xl transition-all ${
                  isAlbumPlaying
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 focus:opacity-100'
                }`}
              >
                {isAlbumPlaying ? (
                  <Pause size={16} className="fill-black" />
                ) : (
                  <Play size={16} className="fill-black ml-0.5" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenAlbum(album.id)}
              className="text-sm font-semibold text-white truncate text-left hover:underline"
            >
              {album.title}
            </button>
            <div className="text-xs text-neutral-400 truncate mt-0.5 flex items-center">
              <button
                type="button"
                onClick={() => onOpenArtist(album.artist)}
                className="truncate hover:text-white hover:underline text-left"
              >
                {album.artist}
              </button>
              <span className="mx-1 text-neutral-600 shrink-0" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums shrink-0">{album.year}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-10 pb-10">
      {/* Editorial Hero Banner */}
      <section className="relative rounded-xl overflow-hidden border border-white/[0.08] min-h-[260px] md:min-h-[300px] flex items-end">
        <img
          src={HERO_BANNER_URL}
          alt="Mastering studio session with grand piano and reel-to-reel tape machine"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E] via-black/65 to-black/25"
          aria-hidden="true"
        />

        <div className="relative z-10 p-6 md:p-8 max-w-2xl space-y-3">
          <div className="text-xs font-medium text-neutral-300">
            Featured Session · {ARTISTS.length} Popular Artists · {albums.length} Albums · Zero Ads
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white text-balance">
            Pure Sound, Uninterrupted
          </h1>
          <p className="text-sm text-neutral-300 max-w-xl leading-relaxed">
            Stream Anirudh Ravichander, A.R. Rahman, Sid Sriram, Arijit Singh, The Weeknd, and Daft Punk—linked to YouTube audio that plays seamlessly in the background with zero ads.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onPlayCollection(allTracks, false)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1ED760] hover:bg-[#3BE477] text-black text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <Play size={16} className="fill-black" />
              <span>Play Session</span>
            </button>
            <button
              type="button"
              onClick={() => onPlayCollection(allTracks, true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              <Shuffle size={15} />
              <span>Shuffle All</span>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Access Grid */}
      <section aria-labelledby="quick-access-heading" className="space-y-4">
        <h2 id="quick-access-heading" className="text-lg font-bold text-white">
          Jump Back In
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {quickItems.map((item) => {
            const isActiveCollection =
              isPlaying && item.tracks.some((t) => t.id === currentTrackId);

            return (
              <div
                key={`${item.kind}-${item.id}`}
                className="group flex items-center justify-between bg-[#15181D] hover:bg-[#1C2027] border border-white/[0.06] rounded-lg overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() =>
                    item.kind === 'album' ? onOpenAlbum(item.id) : onOpenPlaylist(item.id)
                  }
                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left pr-2"
                >
                  <CoverArt
                    src={item.coverUrl}
                    alt={item.title}
                    className="w-16 h-16 shrink-0"
                    iconSize={20}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{item.title}</div>
                    <div className="text-xs text-neutral-400 font-mono tabular-nums">
                      {item.tracks.length} tracks
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (item.tracks.length > 0) {
                      onPlayTrack(item.tracks[0], item.tracks);
                    }
                  }}
                  aria-label={`Play ${item.title}`}
                  className={`mr-3 w-10 h-10 rounded-full bg-[#1ED760] hover:bg-[#3BE477] text-black flex items-center justify-center shadow-lg transition-all shrink-0 ${
                    isActiveCollection
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 focus:opacity-100'
                  }`}
                >
                  {isActiveCollection ? (
                    <Pause size={16} className="fill-black" />
                  ) : (
                    <Play size={16} className="fill-black ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Popular Artists Circular Shelf */}
      <section aria-labelledby="popular-artists-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="popular-artists-heading" className="text-lg font-bold text-white">
            Popular Artists
          </h2>
          <span className="text-xs text-neutral-500 font-mono tabular-nums">
            {ARTISTS.length} artists
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {ARTISTS.map((artist) => {
            const artistTracks = allTracks.filter(
              (t) => t.artist.toLowerCase() === artist.name.toLowerCase()
            );
            const isArtistPlaying =
              isPlaying && artistTracks.some((t) => t.id === currentTrackId);

            return (
              <div
                key={artist.name}
                className="group bg-[#14171C] hover:bg-[#1B1F26] border border-white/[0.06] rounded-lg p-3.5 transition-colors flex flex-col"
              >
                <div className="relative mb-3">
                  <button
                    type="button"
                    onClick={() => onOpenArtist(artist.name)}
                    className="block w-full rounded-full overflow-hidden"
                  >
                    <CoverArt
                      src={artist.imageUrl}
                      alt={artist.name}
                      className="w-full aspect-square rounded-full"
                      iconSize={28}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (artistTracks.length > 0) {
                        onPlayTrack(artistTracks[0], artistTracks);
                      }
                    }}
                    aria-label={`Play ${artist.name}`}
                    className={`absolute right-1 bottom-1 w-10 h-10 rounded-full bg-[#1ED760] hover:bg-[#3BE477] text-black flex items-center justify-center shadow-xl transition-all ${
                      isArtistPlaying
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 focus:opacity-100'
                    }`}
                  >
                    {isArtistPlaying ? (
                      <Pause size={16} className="fill-black" />
                    ) : (
                      <Play size={16} className="fill-black ml-0.5" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenArtist(artist.name)}
                  className="text-sm font-semibold text-white truncate text-left hover:underline"
                >
                  {artist.name}
                </button>
                <div className="text-xs text-neutral-400 truncate mt-0.5">
                  Artist · {artist.genre}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Popular Albums Grid */}
      <section aria-labelledby="popular-albums-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="popular-albums-heading" className="text-lg font-bold text-white">
            Popular Albums
          </h2>
          <span className="text-xs text-neutral-500 font-mono tabular-nums">
            {popularAlbums.length} releases
          </span>
        </div>
        {renderAlbumGrid(popularAlbums)}
      </section>

      {/* More Studio Releases Grid */}
      {moreAlbums.length > 0 && (
        <section aria-labelledby="more-albums-heading" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 id="more-albums-heading" className="text-lg font-bold text-white">
              More Studio Releases
            </h2>
            <span className="text-xs text-neutral-500 font-mono tabular-nums">
              {moreAlbums.length} releases
            </span>
          </div>
          {renderAlbumGrid(moreAlbums)}
        </section>
      )}

      {/* Popular Tracks */}
      <section aria-labelledby="tracks-heading" className="space-y-3">
        <h2 id="tracks-heading" className="text-lg font-bold text-white">
          Popular Tracks
        </h2>
        <TrackTable
          tracks={featuredTracks}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          likedIds={likedIds}
          playlists={playlists}
          onPlayTrack={onPlayTrack}
          onToggleLike={onToggleLike}
          onAddToQueue={onAddToQueue}
          onAddToPlaylist={onAddToPlaylist}
          onOpenAlbum={onOpenAlbum}
          onOpenArtist={onOpenArtist}
        />
      </section>
    </div>
  );
}

interface SearchViewProps {
  query: string;
  selectedGenre: string;
  albums: Album[];
  allTracks: Track[];
  playlists: Playlist[];
  currentTrackId: string | null;
  isPlaying: boolean;
  likedIds: Set<string>;
  onGenreChange: (genre: string) => void;
  onClearSearch: () => void;
  onPlayTrack: (track: Track, list: Track[]) => void;
  onPlayYouTubeResult: (result: YouTubeSearchResult) => void;
  onOpenAlbum: (albumId: string) => void;
  onOpenArtist: (artistName: string) => void;
  onToggleLike: (trackId: string) => void;
  onAddToQueue: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
}

export function SearchView({
  query,
  selectedGenre,
  albums,
  allTracks,
  playlists,
  currentTrackId,
  isPlaying,
  likedIds,
  onGenreChange,
  onClearSearch,
  onPlayTrack,
  onPlayYouTubeResult,
  onOpenAlbum,
  onOpenArtist,
  onToggleLike,
  onAddToQueue,
  onAddToPlaylist,
}: SearchViewProps) {
  const q = query.trim().toLowerCase();

  const [ytResults, setYtResults] = useState<YouTubeSearchResult[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');

  useEffect(() => {
    if (!query.trim()) {
      setYtResults([]);
      setYtError(null);
      setLastSearchedQuery('');
    }
  }, [query]);

  const handleSearchYouTube = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setYtLoading(true);
    setYtError(null);
    setLastSearchedQuery(trimmed);
    try {
      const resp = await fetch(`/api/yt/search?q=${encodeURIComponent(`${trimmed} audio`)}`);
      const data = (await resp.json()) as { results?: YouTubeSearchResult[]; error?: string };
      if (!resp.ok || !data.results) {
        setYtError(data.error || 'Could not search YouTube right now.');
        setYtResults([]);
      } else {
        setYtResults(data.results);
        if (data.results.length === 0) {
          setYtError('No playable YouTube audio found for this query.');
        }
      }
    } catch {
      setYtError('Network error while searching YouTube.');
    } finally {
      setYtLoading(false);
    }
  };

  const filteredArtists = ARTISTS.filter((artist) => {
    const matchesGenre = selectedGenre === 'All' || artist.genre === selectedGenre;
    if (!matchesGenre) return false;
    if (!q) return true;
    return (
      artist.name.toLowerCase().includes(q) ||
      artist.genre.toLowerCase().includes(q)
    );
  });

  const filteredTracks = allTracks.filter((track) => {
    const matchesGenre = selectedGenre === 'All' || track.genre === selectedGenre;
    if (!matchesGenre) return false;
    if (!q) return true;
    return (
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      track.albumTitle.toLowerCase().includes(q) ||
      track.genre.toLowerCase().includes(q)
    );
  });

  const filteredAlbums = albums.filter((alb) => {
    const matchesGenre = selectedGenre === 'All' || alb.genre === selectedGenre;
    if (!matchesGenre) return false;
    if (!q) return true;
    return (
      alb.title.toLowerCase().includes(q) ||
      alb.artist.toLowerCase().includes(q) ||
      alb.genre.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">Browse & Search</h1>
          {query.trim().length > 1 && (
            <button
              type="button"
              onClick={handleSearchYouTube}
              disabled={ytLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1ED760] hover:bg-[#3BE477] text-black text-xs font-semibold disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {ytLoading ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
              <span>Search YouTube for "{query.trim()}"</span>
            </button>
          )}
        </div>

        {/* Genre Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {GENRES.map((genre) => {
            const active = selectedGenre === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => onGenreChange(genre)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-black'
                    : 'bg-[#16191E] text-neutral-300 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live YouTube Background Search Results */}
      {(ytLoading || ytError || ytResults.length > 0) && (
        <section className="space-y-3 p-4 rounded-xl bg-[#12151A] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Search size={15} className="text-[#1ED760]" />
              <span>
                YouTube Background Audio{lastSearchedQuery ? ` · "${lastSearchedQuery}"` : ''}
              </span>
            </h2>
            {ytResults.length > 0 && (
              <span className="text-xs text-neutral-400">Click any track to stream & save</span>
            )}
          </div>

          {ytError && <p className="text-xs text-rose-400">{ytError}</p>}

          {ytResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {ytResults.map((item) => (
                <button
                  key={item.videoId}
                  type="button"
                  onClick={() => onPlayYouTubeResult(item)}
                  className="group flex items-center gap-3 p-2.5 rounded-lg bg-[#171B21] hover:bg-[#1F242C] border border-white/[0.06] text-left transition-colors"
                >
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded object-cover shrink-0 bg-[#0E1013]"
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
                  <span className="w-8 h-8 rounded-full bg-[#1ED760] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Play size={14} className="fill-black ml-0.5" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {filteredArtists.length === 0 && filteredTracks.length === 0 && filteredAlbums.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-white/[0.07] rounded-xl bg-[#121418]">
          <p className="text-base font-semibold text-white">No catalog matches for "{query.trim()}"</p>
          <p className="text-sm text-neutral-400">
            Search YouTube above to stream any song in the background, or clear your filters.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {query.trim() && (
              <button
                type="button"
                onClick={handleSearchYouTube}
                className="px-4 py-2 rounded-lg bg-[#1ED760] text-black text-xs font-semibold hover:bg-[#3BE477] transition-colors"
              >
                Find on YouTube
              </button>
            )}
            <button
              type="button"
              onClick={onClearSearch}
              className="px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      ) : (
        <>
          {filteredArtists.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredArtists.map((artist) => (
                  <button
                    key={artist.name}
                    type="button"
                    onClick={() => onOpenArtist(artist.name)}
                    className="group bg-[#14171C] hover:bg-[#1B1F26] border border-white/[0.06] rounded-lg p-3 text-left transition-colors"
                  >
                    <CoverArt
                      src={artist.imageUrl}
                      alt={artist.name}
                      className="w-full aspect-square rounded-full mb-2.5"
                      iconSize={26}
                    />
                    <div className="text-sm font-semibold text-white truncate">{artist.name}</div>
                    <div className="text-xs text-neutral-400 truncate">
                      Artist · {artist.genre}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {filteredAlbums.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredAlbums.map((album) => (
                  <button
                    key={album.id}
                    type="button"
                    onClick={() => onOpenAlbum(album.id)}
                    className="group bg-[#14171C] hover:bg-[#1B1F26] border border-white/[0.06] rounded-lg p-3 text-left transition-colors"
                  >
                    <CoverArt
                      src={album.coverUrl}
                      alt={album.title}
                      className="w-full aspect-square rounded-md mb-2.5"
                      iconSize={26}
                    />
                    <div className="text-sm font-semibold text-white truncate">{album.title}</div>
                    <div className="text-xs text-neutral-400 truncate">
                      {album.artist} · {album.genre}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {filteredTracks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">
                Songs ({filteredTracks.length})
              </h2>
              <TrackTable
                tracks={filteredTracks}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                likedIds={likedIds}
                playlists={playlists}
                onPlayTrack={onPlayTrack}
                onToggleLike={onToggleLike}
                onAddToQueue={onAddToQueue}
                onAddToPlaylist={onAddToPlaylist}
                onOpenAlbum={onOpenAlbum}
                onOpenArtist={onOpenArtist}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}

interface ArtistViewProps {
  artistName: string;
  artists: ArtistProfile[];
  albums: Album[];
  allTracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  likedIds: Set<string>;
  playlists: Playlist[];
  onPlayCollection: (tracks: Track[], shuffle?: boolean) => void;
  onPlayTrack: (track: Track, list: Track[]) => void;
  onToggleLike: (trackId: string) => void;
  onAddToQueue: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onOpenAlbum: (albumId: string) => void;
  onOpenArtist: (artistName: string) => void;
  onBrowseHome: () => void;
}

export function ArtistView({
  artistName,
  artists,
  albums,
  allTracks,
  currentTrackId,
  isPlaying,
  likedIds,
  playlists,
  onPlayCollection,
  onPlayTrack,
  onToggleLike,
  onAddToQueue,
  onAddToPlaylist,
  onOpenAlbum,
  onOpenArtist,
  onBrowseHome,
}: ArtistViewProps) {
  const profile = artists.find(
    (a) => a.name.toLowerCase() === artistName.toLowerCase()
  );
  const artistTracks = allTracks.filter(
    (t) => t.artist.toLowerCase() === artistName.toLowerCase()
  );
  const artistAlbums = albums.filter(
    (a) => a.artist.toLowerCase() === artistName.toLowerCase()
  );
  const coverUrl = profile?.imageUrl || artistAlbums[0]?.coverUrl || artistTracks[0]?.coverUrl;
  const totalDuration = artistTracks.reduce((sum, t) => sum + t.duration, 0);
  const isArtistPlaying =
    isPlaying && artistTracks.some((t) => t.id === currentTrackId);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end gap-6 pb-6 border-b border-white/[0.07]">
        <CoverArt
          src={coverUrl}
          alt={artistName}
          className="w-40 h-40 md:w-48 md:h-48 rounded-full border border-white/10 shrink-0"
          iconSize={48}
        />

        <div className="space-y-2.5 min-w-0 flex-1">
          <div className="text-xs font-medium text-neutral-400">
            Artist{profile ? ` · ${profile.genre}` : ''}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white text-balance">
            {profile?.name || artistName}
          </h1>
          <p className="text-sm text-neutral-300 max-w-2xl">
            {profile?.bio || `Tracks and releases featuring ${artistName}, ready for ad-free background streaming.`}
          </p>
          <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-1.5 pt-1">
            <span className="font-mono tabular-nums">{artistTracks.length} tracks</span>
            {artistAlbums.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{artistAlbums.length} releases</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{formatTime(totalDuration)} total</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              type="button"
              disabled={artistTracks.length === 0}
              onClick={() => {
                if (isArtistPlaying && currentTrackId) {
                  const active = artistTracks.find((t) => t.id === currentTrackId);
                  if (active) onPlayTrack(active, artistTracks);
                } else {
                  onPlayCollection(artistTracks, false);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1ED760] hover:bg-[#3BE477] text-black text-sm font-semibold disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {isArtistPlaying ? (
                <>
                  <Pause size={16} className="fill-black" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={16} className="fill-black" />
                  <span>Play All</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={artistTracks.length === 0}
              onClick={() => onPlayCollection(artistTracks, true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-white text-sm font-medium disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <Shuffle size={15} />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </header>

      {artistTracks.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-white/[0.07] rounded-xl bg-[#121418]">
          <p className="text-base font-semibold text-white">No tracks available for {artistName}</p>
          <button
            type="button"
            onClick={onBrowseHome}
            className="mt-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors"
          >
            Browse Catalog
          </button>
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">Popular Tracks</h2>
          <TrackTable
            tracks={artistTracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedIds={likedIds}
            playlists={playlists}
            onPlayTrack={onPlayTrack}
            onToggleLike={onToggleLike}
            onAddToQueue={onAddToQueue}
            onAddToPlaylist={onAddToPlaylist}
            onOpenAlbum={onOpenAlbum}
            onOpenArtist={onOpenArtist}
          />
        </section>
      )}

      {artistAlbums.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">Discography</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
            {artistAlbums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => onOpenAlbum(album.id)}
                className="group bg-[#14171C] hover:bg-[#1B1F26] border border-white/[0.06] rounded-lg p-3.5 text-left transition-colors"
              >
                <CoverArt
                  src={album.coverUrl}
                  alt={album.title}
                  className="w-full aspect-square rounded-md mb-3"
                  iconSize={28}
                />
                <div className="text-sm font-semibold text-white truncate">{album.title}</div>
                <div className="text-xs text-neutral-400 truncate font-mono tabular-nums mt-0.5">
                  {album.year} · {album.genre}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface DetailViewProps {
  kind: 'album' | 'playlist' | 'liked';
  title: string;
  subtitle: string;
  description: string;
  coverUrl?: string;
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  likedIds: Set<string>;
  playlists: Playlist[];
  playlistId?: string;
  canDeletePlaylist?: boolean;
  onPlayCollection: (tracks: Track[], shuffle?: boolean) => void;
  onPlayTrack: (track: Track, list: Track[]) => void;
  onToggleLike: (trackId: string) => void;
  onAddToQueue: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveFromPlaylist?: (playlistId: string, trackId: string) => void;
  onDeletePlaylist?: (playlistId: string) => void;
  onOpenAlbum: (albumId: string) => void;
  onOpenArtist: (artistName: string) => void;
  onBrowseHome: () => void;
}

export function DetailView({
  kind,
  title,
  subtitle,
  description,
  coverUrl,
  tracks,
  currentTrackId,
  isPlaying,
  likedIds,
  playlists,
  playlistId,
  canDeletePlaylist,
  onPlayCollection,
  onPlayTrack,
  onToggleLike,
  onAddToQueue,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onDeletePlaylist,
  onOpenAlbum,
  onOpenArtist,
  onBrowseHome,
}: DetailViewProps) {
  const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0);
  const isCollectionPlaying = isPlaying && tracks.some((t) => t.id === currentTrackId);

  return (
    <div className="space-y-8 pb-10">
      {/* Collection Header */}
      <header className="flex flex-col sm:flex-row sm:items-end gap-6 pb-6 border-b border-white/[0.07]">
        {kind === 'liked' ? (
          <div className="w-40 h-40 md:w-48 md:h-48 rounded-xl bg-gradient-to-br from-[#1ED760]/30 via-[#193022] to-[#111317] border border-white/10 flex items-center justify-center shrink-0">
            <Heart size={56} className="text-[#1ED760] fill-[#1ED760]" />
          </div>
        ) : (
          <CoverArt
            src={coverUrl}
            alt={title}
            className="w-40 h-40 md:w-48 md:h-48 rounded-xl border border-white/10"
            iconSize={48}
          />
        )}

        <div className="space-y-2.5 min-w-0 flex-1">
          <div className="text-xs font-medium text-neutral-400 capitalize">{kind}</div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white text-balance">
            {title}
          </h1>
          <p className="text-sm text-neutral-300 max-w-2xl">{description}</p>
          <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-1.5 pt-1">
            <span className="font-medium text-neutral-200">{subtitle}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{tracks.length} tracks</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{formatTime(totalDuration)} total</span>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              type="button"
              disabled={tracks.length === 0}
              onClick={() => {
                if (isCollectionPlaying && currentTrackId) {
                  const active = tracks.find((t) => t.id === currentTrackId);
                  if (active) onPlayTrack(active, tracks);
                } else {
                  onPlayCollection(tracks, false);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1ED760] hover:bg-[#3BE477] text-black text-sm font-semibold disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {isCollectionPlaying ? (
                <>
                  <Pause size={16} className="fill-black" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={16} className="fill-black" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={tracks.length === 0}
              onClick={() => onPlayCollection(tracks, true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-white text-sm font-medium disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <Shuffle size={15} />
              <span>Shuffle</span>
            </button>

            {canDeletePlaylist && playlistId && onDeletePlaylist && (
              <button
                type="button"
                onClick={() => onDeletePlaylist(playlistId)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-white/[0.05] text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Trash2 size={15} />
                <span>Delete Playlist</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tracklist or Empty State */}
      {tracks.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-white/[0.07] rounded-xl bg-[#121418]">
          <p className="text-base font-semibold text-white">
            {kind === 'liked' ? 'No liked songs yet' : 'This playlist is empty'}
          </p>
          <p className="text-sm text-neutral-400 max-w-md mx-auto">
            {kind === 'liked'
              ? 'Click the heart icon next to any track to save it here for instant playback.'
              : 'Use the + button on any track across the catalog to add songs to this playlist.'}
          </p>
          <button
            type="button"
            onClick={onBrowseHome}
            className="mt-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors"
          >
            Browse Catalog
          </button>
        </div>
      ) : (
        <TrackTable
          tracks={tracks}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          likedIds={likedIds}
          playlists={playlists}
          showAlbumColumn={kind !== 'album'}
          removablePlaylistId={kind === 'playlist' ? playlistId : undefined}
          onPlayTrack={onPlayTrack}
          onToggleLike={onToggleLike}
          onAddToQueue={onAddToQueue}
          onAddToPlaylist={onAddToPlaylist}
          onRemoveFromPlaylist={onRemoveFromPlaylist}
          onOpenAlbum={onOpenAlbum}
          onOpenArtist={onOpenArtist}
        />
      )}
    </div>
  );
}
