export type MusicalStyle =
  | 'lofi'
  | 'ambient'
  | 'acoustic'
  | 'synthwave'
  | 'minimal'
  | 'deephouse';

export interface SynthPreset {
  bpm: number;
  style: MusicalStyle;
  /** 4-bar chord progression (arrays of MIDI note numbers) */
  chords: number[][];
  /** 16-step melody pattern per bar (MIDI note or null for rest) */
  melody: (number | null)[];
  /** 16-step bass pattern per bar (MIDI note or null for rest) */
  bass: (number | null)[];
  /** Drum triggers over 16 steps */
  drums: {
    kick: number[];
    snare: number[];
    hat: number[];
  };
  /** Oscillator timbre for lead melody */
  leadWave: OscillatorType;
  /** Filter brightness in Hz */
  filterCutoff: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumId: string;
  albumTitle: string;
  coverUrl: string;
  duration: number; // in seconds
  genre: string;
  year: number;
  bpm: number;
  youtubeId?: string;
  youtubeQuery?: string;
  isLocal?: boolean;
  localUrl?: string;
  synthPreset?: SynthPreset;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  artist: string;
  durationSeconds: number;
  thumbnailUrl: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: string;
  description: string;
  coverUrl: string;
  accentColor: string;
  trackIds: string[];
  isPopular?: boolean;
}

export interface ArtistProfile {
  name: string;
  genre: string;
  bio: string;
  imageUrl: string;
  isFeatured?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl?: string;
  trackIds: string[];
  createdAt: number;
  isSystem?: boolean;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type NavView =
  | { type: 'home' }
  | { type: 'search' }
  | { type: 'liked' }
  | { type: 'album'; id: string }
  | { type: 'playlist'; id: string }
  | { type: 'artist'; name: string };
