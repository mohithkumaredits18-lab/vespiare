import { SynthPreset, Track } from '../types/music';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

type ProgressCallback = (currentTime: number, duration?: number) => void;
type EndedCallback = () => void;
type SourceChangeCallback = (mode: 'youtube' | 'studio' | 'local', youtubeId?: string) => void;

interface YTPlayerInstance {
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  cueVideoById: (videoId: string, startSeconds?: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getIframe: () => HTMLIFrameElement;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export class AudioPlayerEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Local HTMLAudioElement playback support
  private htmlAudio: HTMLAudioElement | null = null;
  private htmlMediaSource: MediaElementAudioSourceNode | null = null;

  // Background YouTube IFrame Player support
  private ytPlayer: YTPlayerInstance | null = null;
  private ytReady = false;
  private ytApiLoading: Promise<boolean> | null = null;
  private ytHostEl: HTMLDivElement | null = null;
  private ytCandidateQueue: string[] = [];
  private resolvedYtCache = new Map<string, string>();
  private activeMode: 'youtube' | 'studio' | 'local' = 'youtube';

  private currentTrack: Track | null = null;
  private isPlaying = false;
  private volume = 0.78;
  private muted = false;

  // Timing & scheduler state
  private elapsedSeconds = 0;
  private lastTickTime = 0;
  private nextStepTime = 0;
  private currentStep = 0;
  private schedulerId: number | null = null;
  private progressRafId: number | null = null;
  private ytPollId: number | null = null;
  private activePlaybackSeq = 0;

  private onProgress: ProgressCallback | null = null;
  private onEnded: EndedCallback | null = null;
  private onSourceChange: SourceChangeCallback | null = null;

  public setCallbacks(
    onProgress: ProgressCallback,
    onEnded: EndedCallback,
    onSourceChange?: SourceChangeCallback
  ) {
    this.onProgress = onProgress;
    this.onEnded = onEnded;
    this.onSourceChange = onSourceChange ?? null;
  }

  public getActiveMode(): 'youtube' | 'studio' | 'local' {
    return this.activeMode;
  }

  private ensureYouTubeHost(): HTMLDivElement {
    if (!this.ytHostEl) {
      const existing = document.getElementById('vespera-yt-bg-host') as HTMLDivElement | null;
      if (existing) {
        this.ytHostEl = existing;
      } else {
        const host = document.createElement('div');
        host.id = 'vespera-yt-bg-host';
        // Hidden background audio container (never display:none so browser audio stays active)
        host.style.position = 'fixed';
        host.style.bottom = '0px';
        host.style.right = '0px';
        host.style.width = '2px';
        host.style.height = '2px';
        host.style.opacity = '0.001';
        host.style.pointerEvents = 'none';
        host.style.zIndex = '-1';
        host.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('div');
        inner.id = 'vespera-yt-iframe-slot';
        host.appendChild(inner);
        document.body.appendChild(host);
        this.ytHostEl = host;
      }
    }
    return this.ytHostEl;
  }

  private loadYouTubeIframeAPI(): Promise<boolean> {
    if (this.ytReady && this.ytPlayer) return Promise.resolve(true);
    if (this.ytApiLoading) return this.ytApiLoading;

    this.ensureYouTubeHost();

    this.ytApiLoading = new Promise<boolean>((resolve) => {
      const timeout = window.setTimeout(() => {
        resolve(false);
      }, 6500);

      const createPlayer = () => {
        if (!window.YT?.Player) {
          window.clearTimeout(timeout);
          resolve(false);
          return;
        }
        try {
          this.ytPlayer = new window.YT.Player('vespera-yt-iframe-slot', {
            height: '200',
            width: '200',
            playerVars: {
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              iv_load_policy: 3,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                window.clearTimeout(timeout);
                this.ytReady = true;
                if (this.ytPlayer) {
                  this.ytPlayer.setVolume(Math.round(this.volume * 100));
                  if (this.muted) this.ytPlayer.mute();
                  else this.ytPlayer.unMute();
                }
                resolve(true);
              },
              onStateChange: (event) => {
                // 0 = ENDED
                if (event.data === 0 && this.activeMode === 'youtube' && this.isPlaying) {
                  this.isPlaying = false;
                  this.stopYtPoll();
                  this.onEnded?.();
                }
              },
              onError: () => {
                if (this.activeMode === 'youtube' && this.currentTrack) {
                  void this.handleYouTubeEmbedFallback();
                }
              },
            },
          });
        } catch {
          window.clearTimeout(timeout);
          resolve(false);
        }
      };

      if (window.YT?.Player) {
        createPlayer();
        return;
      }

      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevReady?.();
        createPlayer();
      };

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        tag.onerror = () => {
          window.clearTimeout(timeout);
          resolve(false);
        };
        document.head.appendChild(tag);
      }
    });

    return this.ytApiLoading;
  }

  private async handleYouTubeEmbedFallback() {
    const seq = this.activePlaybackSeq;
    const track = this.currentTrack;
    if (!track) return;

    // Try next candidate YouTube ID if available
    if (this.ytCandidateQueue.length > 0 && this.ytPlayer && this.ytReady) {
      const nextId = this.ytCandidateQueue.shift()!;
      this.resolvedYtCache.set(track.id, nextId);
      this.ytPlayer.loadVideoById(nextId, this.elapsedSeconds);
      this.onSourceChange?.('youtube', nextId);
      return;
    }

    // Search YouTube for an alternate embeddable lyric/audio upload
    try {
      const query = track.youtubeQuery || `${track.title} ${track.artist} audio lyrics`;
      const resp = await fetch(`/api/yt/search?q=${encodeURIComponent(query)}`);
      if (resp.ok && seq === this.activePlaybackSeq) {
        const data = (await resp.json()) as { results?: Array<{ videoId: string }> };
        const candidates = (data.results ?? [])
          .map((r) => r.videoId)
          .filter((id) => id !== track.youtubeId && id !== this.resolvedYtCache.get(track.id));
        if (candidates.length > 0 && this.ytPlayer && this.ytReady) {
          const [first, ...rest] = candidates.slice(0, 3);
          this.ytCandidateQueue = rest;
          this.resolvedYtCache.set(track.id, first);
          this.ytPlayer.loadVideoById(first, this.elapsedSeconds);
          this.onSourceChange?.('youtube', first);
          return;
        }
      }
    } catch {
      // ignore network error and fall back to studio audio
    }

    if (seq !== this.activePlaybackSeq) return;

    // Graceful fallback to built-in Web Audio Studio Engine so playback never dies silently
    if (track.synthPreset) {
      this.activeMode = 'studio';
      this.onSourceChange?.('studio');
      this.startSynthTrack(track, this.elapsedSeconds);
    }
  }

  private startYtPoll() {
    this.stopYtPoll();
    this.ytPollId = window.setInterval(() => {
      if (!this.isPlaying || this.activeMode !== 'youtube' || !this.ytPlayer || !this.ytReady) {
        return;
      }
      try {
        const t = this.ytPlayer.getCurrentTime();
        const d = this.ytPlayer.getDuration();
        if (Number.isFinite(t)) {
          this.elapsedSeconds = t;
          this.onProgress?.(t, Number.isFinite(d) && d > 0 ? d : undefined);
        }
      } catch {
        // ignore transient iframe read error
      }
    }, 250);
  }

  private stopYtPoll() {
    if (this.ytPollId !== null) {
      window.clearInterval(this.ytPollId);
      this.ytPollId = null;
    }
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -16;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.005;
      this.compressor.release.value = 0.2;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.82;

      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.34;
      this.delayFilter = this.ctx.createBiquadFilter();
      this.delayFilter.type = 'lowpass';
      this.delayFilter.frequency.value = 1350;
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.28;

      this.delayNode.connect(this.delayFilter);
      this.delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayFilter.connect(this.compressor);

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      const bufferSize = this.ctx.sampleRate * 0.5;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    return this.ctx;
  }

  public getFrequencyData(target: Uint8Array<ArrayBuffer>): boolean {
    if (!this.isPlaying) {
      target.fill(0);
      return false;
    }

    if (this.activeMode === 'youtube') {
      // Synthesize smooth tempo-reactive spectrum bars for cross-origin YouTube background audio
      const now = performance.now() / 1000;
      const bpm = this.currentTrack?.bpm || 115;
      const beatPhase = (now * (bpm / 60)) * Math.PI * 2;
      const pulse = 0.55 + 0.45 * Math.pow(Math.abs(Math.sin(beatPhase * 0.5)), 2);

      for (let i = 0; i < target.length; i++) {
        const slope = Math.max(0.15, 1 - i / (target.length * 0.9));
        const wave = 0.5 + 0.5 * Math.sin(now * 5.2 + i * 0.45);
        target[i] = Math.round(255 * Math.min(0.95, slope * (0.45 * pulse + 0.45 * wave)));
      }
      return true;
    }

    if (!this.analyser) {
      target.fill(0);
      return false;
    }
    this.analyser.getByteFrequencyData(target);
    return true;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.02
      );
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.muted ? 0 : this.volume;
    }
    if (this.ytPlayer && this.ytReady) {
      try {
        this.ytPlayer.setVolume(Math.round(this.volume * 100));
      } catch {
        // ignore
      }
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.02
      );
    }
    if (this.htmlAudio) {
      this.htmlAudio.muted = muted;
    }
    if (this.ytPlayer && this.ytReady) {
      try {
        if (muted) this.ytPlayer.mute();
        else this.ytPlayer.unMute();
      } catch {
        // ignore
      }
    }
  }

  public loadAndPlay(track: Track, startAtSeconds = 0) {
    this.stopInternal();
    this.activePlaybackSeq += 1;
    const seq = this.activePlaybackSeq;

    this.currentTrack = track;
    this.elapsedSeconds = Math.max(0, Math.min(startAtSeconds, track.duration));
    this.ytCandidateQueue = [];

    if (track.isLocal && track.localUrl) {
      this.activeMode = 'local';
      this.onSourceChange?.('local');
      this.startLocalTrack(track.localUrl, this.elapsedSeconds);
      return;
    }

    // Play linked YouTube track in background if youtubeId or youtubeQuery exists
    if (track.youtubeId || track.youtubeQuery) {
      void this.startYouTubeTrack(track, this.elapsedSeconds, seq);
      return;
    }

    this.activeMode = 'studio';
    this.onSourceChange?.('studio');
    this.startSynthTrack(track, this.elapsedSeconds);
  }

  private async startYouTubeTrack(track: Track, startAt: number, seq: number) {
    this.activeMode = 'youtube';
    this.isPlaying = true;

    let videoId = track.youtubeId || this.resolvedYtCache.get(track.id);

    // Resolve via backend YouTube Search if not hardcoded yet
    if (!videoId && track.youtubeQuery) {
      try {
        const resp = await fetch(`/api/yt/search?q=${encodeURIComponent(track.youtubeQuery)}`);
        if (resp.ok) {
          const data = (await resp.json()) as { results?: Array<{ videoId: string }> };
          const ids = (data.results ?? []).map((r) => r.videoId);
          if (ids.length > 0) {
            videoId = ids[0];
            this.ytCandidateQueue = ids.slice(1, 4);
            this.resolvedYtCache.set(track.id, videoId);
          }
        }
      } catch {
        // fallback below
      }
    }

    if (seq !== this.activePlaybackSeq) return;

    if (!videoId) {
      if (track.synthPreset) {
        this.activeMode = 'studio';
        this.onSourceChange?.('studio');
        this.startSynthTrack(track, startAt);
      }
      return;
    }

    const ready = await this.loadYouTubeIframeAPI();
    if (seq !== this.activePlaybackSeq) return;

    if (!ready || !this.ytPlayer) {
      if (track.synthPreset) {
        this.activeMode = 'studio';
        this.onSourceChange?.('studio');
        this.startSynthTrack(track, startAt);
      }
      return;
    }

    try {
      this.activeMode = 'youtube';
      this.onSourceChange?.('youtube', videoId);
      this.ytPlayer.setVolume(Math.round(this.volume * 100));
      if (this.muted) this.ytPlayer.mute();
      else this.ytPlayer.unMute();
      this.ytPlayer.loadVideoById(videoId, startAt);
      this.ytPlayer.playVideo();
      this.isPlaying = true;
      this.startYtPoll();
    } catch {
      if (track.synthPreset) {
        this.activeMode = 'studio';
        this.onSourceChange?.('studio');
        this.startSynthTrack(track, startAt);
      }
    }
  }

  public play() {
    if (!this.currentTrack || this.isPlaying) return;

    if (this.activeMode === 'youtube' && this.ytPlayer && this.ytReady) {
      this.ytPlayer.playVideo();
      this.isPlaying = true;
      this.startYtPoll();
      return;
    }

    if (this.currentTrack.isLocal && this.htmlAudio) {
      const ctx = this.ensureContext();
      if (ctx.state === 'suspended') void ctx.resume();
      void this.htmlAudio.play();
      this.isPlaying = true;
      this.startProgressLoop();
      return;
    }

    this.startSynthTrack(this.currentTrack, this.elapsedSeconds);
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.activeMode === 'youtube' && this.ytPlayer && this.ytReady) {
      try {
        this.ytPlayer.pauseVideo();
      } catch {
        // ignore
      }
      this.stopYtPoll();
    }

    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    if (this.progressRafId !== null) {
      cancelAnimationFrame(this.progressRafId);
      this.progressRafId = null;
    }
  }

  public seek(seconds: number) {
    if (!this.currentTrack) return;
    const clamped = Math.max(0, Math.min(seconds, this.currentTrack.duration));
    this.elapsedSeconds = clamped;

    if (this.activeMode === 'youtube' && this.ytPlayer && this.ytReady) {
      try {
        this.ytPlayer.seekTo(clamped, true);
      } catch {
        // ignore
      }
      this.onProgress?.(clamped);
      return;
    }

    if (this.currentTrack.isLocal && this.htmlAudio) {
      this.htmlAudio.currentTime = clamped;
      this.onProgress?.(clamped);
      return;
    }

    if (this.isPlaying) {
      this.startSynthTrack(this.currentTrack, clamped);
    } else {
      this.onProgress?.(clamped);
    }
  }

  public destroy() {
    this.stopInternal();
    if (this.ytPlayer) {
      try {
        this.ytPlayer.destroy();
      } catch {
        // ignore
      }
      this.ytPlayer = null;
      this.ytReady = false;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }

  private stopInternal() {
    this.isPlaying = false;
    this.stopYtPoll();

    if (this.ytPlayer && this.ytReady) {
      try {
        this.ytPlayer.pauseVideo();
      } catch {
        // ignore
      }
    }

    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    if (this.progressRafId !== null) {
      cancelAnimationFrame(this.progressRafId);
      this.progressRafId = null;
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
      this.htmlAudio.onended = null;
      this.htmlAudio.ontimeupdate = null;
    }
  }

  private startLocalTrack(url: string, startAt: number) {
    const ctx = this.ensureContext();
    if (!this.htmlAudio) {
      this.htmlAudio = new Audio();
      this.htmlAudio.crossOrigin = 'anonymous';
    }
    if (!this.htmlMediaSource && this.compressor) {
      this.htmlMediaSource = ctx.createMediaElementSource(this.htmlAudio);
      this.htmlMediaSource.connect(this.compressor);
    }

    this.htmlAudio.src = url;
    this.htmlAudio.currentTime = startAt;
    this.htmlAudio.volume = this.muted ? 0 : this.volume;
    this.htmlAudio.muted = this.muted;
    this.htmlAudio.onended = () => {
      this.isPlaying = false;
      this.onEnded?.();
    };

    void this.htmlAudio.play().catch(() => {
      this.isPlaying = false;
    });
    this.isPlaying = true;
    this.startProgressLoop();
  }

  private startSynthTrack(track: Track, startAt: number) {
    const ctx = this.ensureContext();
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }

    const preset = track.synthPreset;
    if (!preset) return;

    if (this.delayNode) {
      const eighthNote = 60 / preset.bpm / 2;
      this.delayNode.delayTime.setTargetAtTime(Math.min(0.65, eighthNote * 1.5), ctx.currentTime, 0.05);
    }

    const stepDuration = 60 / preset.bpm / 4;
    const totalStepsElapsed = Math.floor(startAt / stepDuration);
    this.currentStep = totalStepsElapsed % 64;
    this.nextStepTime = ctx.currentTime + 0.04;
    this.lastTickTime = performance.now();
    this.isPlaying = true;

    this.schedulerId = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.currentTrack?.synthPreset) return;
      const lookahead = 0.14;
      while (this.nextStepTime < this.ctx.currentTime + lookahead) {
        this.scheduleStep(this.currentTrack.synthPreset, this.currentStep, this.nextStepTime, stepDuration);
        this.nextStepTime += stepDuration;
        this.currentStep = (this.currentStep + 1) % 64;
      }
    }, 30);

    this.startProgressLoop();
  }

  private startProgressLoop() {
    if (this.progressRafId !== null) {
      cancelAnimationFrame(this.progressRafId);
    }
    this.lastTickTime = performance.now();

    const tick = (now: number) => {
      if (!this.isPlaying || !this.currentTrack || this.activeMode === 'youtube') return;

      if (this.currentTrack.isLocal && this.htmlAudio) {
        this.elapsedSeconds = this.htmlAudio.currentTime;
        this.onProgress?.(this.elapsedSeconds);
      } else {
        const dt = (now - this.lastTickTime) / 1000;
        this.lastTickTime = now;
        this.elapsedSeconds += dt;

        if (this.elapsedSeconds >= this.currentTrack.duration) {
          this.elapsedSeconds = this.currentTrack.duration;
          this.onProgress?.(this.elapsedSeconds);
          this.pause();
          this.onEnded?.();
          return;
        }
        this.onProgress?.(this.elapsedSeconds);
      }

      this.progressRafId = requestAnimationFrame(tick);
    };

    this.progressRafId = requestAnimationFrame(tick);
  }

  private scheduleStep(preset: SynthPreset, stepIndex: number, time: number, stepDur: number) {
    if (!this.ctx || !this.compressor || !this.delayNode) return;

    const bar = Math.floor(stepIndex / 16);
    const stepInBar = stepIndex % 16;

    if (stepInBar === 0) {
      const chord = preset.chords[bar % preset.chords.length];
      this.triggerChord(chord, time, stepDur * 15.2, preset);
    }

    const melodyNote = preset.melody[stepInBar];
    if (melodyNote !== null && melodyNote !== undefined) {
      const noteOffset = bar === 3 && stepInBar >= 8 ? 2 : 0;
      this.triggerLead(melodyNote + noteOffset, time, stepDur * 2.2, preset);
    }

    const bassNote = preset.bass[stepInBar];
    if (bassNote !== null && bassNote !== undefined) {
      const chordRoot = preset.chords[bar % preset.chords.length][0] - 12;
      const note = stepInBar === 0 ? chordRoot : bassNote;
      this.triggerBass(note, time, stepDur * 2.4, preset);
    }

    if (preset.drums.kick.includes(stepInBar)) {
      this.triggerKick(time, preset.style);
    }
    if (preset.drums.snare.includes(stepInBar)) {
      this.triggerSnare(time, preset.style);
    }
    if (preset.drums.hat.includes(stepInBar)) {
      this.triggerHat(time, stepInBar % 4 === 2);
    }
  }

  private triggerChord(midiNotes: number[], time: number, duration: number, preset: SynthPreset) {
    if (!this.ctx || !this.compressor || !this.delayNode) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(preset.filterCutoff * 0.85, time);
    filter.Q.value = 0.7;

    const env = this.ctx.createGain();
    const peak = preset.style === 'ambient' ? 0.085 : 0.065;
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(peak, time + Math.min(0.35, duration * 0.2));
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    filter.connect(env);
    env.connect(this.compressor);
    env.connect(this.delayNode);

    midiNotes.forEach((midi, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = preset.style === 'acoustic' ? 'triangle' : idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(midiToFreq(midi), time);
      osc.detune.setValueAtTime((idx - 1.5) * 3.5, time);
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + duration + 0.05);
    });
  }

  private triggerLead(midi: number, time: number, duration: number, preset: SynthPreset) {
    if (!this.ctx || !this.compressor || !this.delayNode) return;
    const osc = this.ctx.createOscillator();
    osc.type = preset.leadWave;
    osc.frequency.setValueAtTime(midiToFreq(midi), time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(preset.filterCutoff * 1.4, time);
    filter.frequency.exponentialRampToValueAtTime(preset.filterCutoff * 0.55, time + duration);

    const env = this.ctx.createGain();
    const peak = preset.leadWave === 'sawtooth' ? 0.075 : 0.11;
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(peak, time + 0.025);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.compressor);
    env.connect(this.delayNode);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private triggerBass(midi: number, time: number, duration: number, preset: SynthPreset) {
    if (!this.ctx || !this.compressor) return;
    const osc = this.ctx.createOscillator();
    osc.type = preset.style === 'synthwave' || preset.style === 'deephouse' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(midiToFreq(midi), time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, time);
    filter.frequency.exponentialRampToValueAtTime(160, time + duration);

    const env = this.ctx.createGain();
    const peak = osc.type === 'sine' ? 0.22 : 0.14;
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(peak, time + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.compressor);

    osc.start(time);
    osc.stop(time + duration + 0.04);
  }

  private triggerKick(time: number, style: SynthPreset['style']) {
    if (!this.ctx || !this.compressor) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = style === 'deephouse' || style === 'minimal' ? 125 : 95;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.13);

    const peak = style === 'ambient' ? 0.18 : 0.34;
    env.gain.setValueAtTime(peak, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

    osc.connect(env);
    env.connect(this.compressor);

    osc.start(time);
    osc.stop(time + 0.24);
  }

  private triggerSnare(time: number, style: SynthPreset['style']) {
    if (!this.ctx || !this.compressor || !this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(style === 'lofi' ? 1400 : 2100, time);
    filter.Q.value = 1.2;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.09, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

    noise.connect(filter);
    filter.connect(env);
    env.connect(this.compressor);

    noise.start(time);
    noise.stop(time + 0.16);
  }

  private triggerHat(time: number, accented: boolean) {
    if (!this.ctx || !this.compressor || !this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7200, time);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(accented ? 0.045 : 0.024, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

    noise.connect(filter);
    filter.connect(env);
    env.connect(this.compressor);

    noise.start(time);
    noise.stop(time + 0.06);
  }
}
