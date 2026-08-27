'use client';

// Sound Manager for OpsWArd Cozy Cyber Tactical HQ
// Handles Background Music (BGM), Ambient Nature SFX, and Dynamic Footsteps SFX

export interface AudioSettings {
  bgmVolume: number;
  natureVolume: number;
  sfxVolume: number;
  bgmMuted: boolean;
  natureMuted: boolean;
  sfxMuted: boolean;
  masterMuted: boolean;
  isBgmPlaying: boolean;
}

const STORAGE_KEY = 'opsward_audio_settings_v1';

class SoundManager {
  private bgm: HTMLAudioElement | null = null;
  private nature: HTMLAudioElement | null = null;
  private running: HTMLAudioElement | null = null;
  private isInitialized = false;

  public settings: AudioSettings = {
    bgmVolume: 0.35,
    natureVolume: 0.22,
    sfxVolume: 0.25,
    bgmMuted: false,
    natureMuted: false,
    sfxMuted: false,
    masterMuted: false,
    isBgmPlaying: false,
  };

  private listeners: Set<(settings: AudioSettings) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSettings();
      // Auto-initialize on first user interaction to unlock Web Audio autoplay
      const unlockAudio = () => {
        this.init();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('pointerdown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
      window.addEventListener('pointerdown', unlockAudio, { once: true });
    }
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore localStorage errors
    }
  }

  public subscribe(listener: (settings: AudioSettings) => void) {
    this.listeners.add(listener);
    listener({ ...this.settings });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.saveSettings();
    this.listeners.forEach((l) => l({ ...this.settings }));
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Background Music: Pixel Waltz (Looping)
    this.bgm = new Audio('/sound/Pixel%20Waltz.wav');
    this.bgm.loop = true;
    this.bgm.preload = 'auto';

    // 2. Nature Ambient SFX (Looping)
    this.nature = new Audio('/sound/nature.mp3');
    this.nature.loop = true;
    this.nature.preload = 'auto';

    // 3. Footsteps / Running SFX (Looping on move)
    this.running = new Audio('/sound/running.mp3');
    this.running.loop = true;
    this.running.preload = 'auto';

    this.applyVolumes();

    // Start playing BGM and Nature ambient
    this.playBgm();
    this.playNature();
  }

  public playBgm() {
    if (!this.bgm) return;
    this.applyVolumes();
    this.bgm.play().then(() => {
      this.settings.isBgmPlaying = true;
      this.notify();
    }).catch(() => {
      // Autoplay might be blocked until user gesture
    });
  }

  public pauseBgm() {
    if (!this.bgm) return;
    this.bgm.pause();
    this.settings.isBgmPlaying = false;
    this.notify();
  }

  public toggleBgm() {
    if (this.settings.isBgmPlaying) {
      this.pauseBgm();
    } else {
      this.playBgm();
    }
  }

  public playNature() {
    if (!this.nature) return;
    this.applyVolumes();
    this.nature.play().catch(() => {
      // Blocked until user interaction
    });
  }

  public startFootsteps(isRunning: boolean) {
    if (!this.running || this.settings.masterMuted || this.settings.sfxMuted) return;
    this.running.playbackRate = isRunning ? 1.35 : 1.0;
    this.applyVolumes();
    if (this.running.paused) {
      this.running.play().catch(() => {});
    }
  }

  public stopFootsteps() {
    if (!this.running) return;
    if (!this.running.paused) {
      this.running.pause();
      this.running.currentTime = 0;
    }
  }

  private applyVolumes() {
    if (this.bgm) {
      const effective = this.settings.masterMuted || this.settings.bgmMuted ? 0 : this.settings.bgmVolume;
      this.bgm.volume = Math.max(0, Math.min(1, effective));
    }
    if (this.nature) {
      const effective = this.settings.masterMuted || this.settings.natureMuted ? 0 : this.settings.natureVolume;
      this.nature.volume = Math.max(0, Math.min(1, effective));
    }
    if (this.running) {
      const effective = this.settings.masterMuted || this.settings.sfxMuted ? 0 : this.settings.sfxVolume;
      this.running.volume = Math.max(0, Math.min(1, effective));
    }
  }

  public setBgmVolume(val: number) {
    this.settings.bgmVolume = Math.max(0, Math.min(1, val));
    if (val > 0 && this.settings.bgmMuted) this.settings.bgmMuted = false;
    this.applyVolumes();
    this.notify();
  }

  public setNatureVolume(val: number) {
    this.settings.natureVolume = Math.max(0, Math.min(1, val));
    if (val > 0 && this.settings.natureMuted) this.settings.natureMuted = false;
    this.applyVolumes();
    this.notify();
  }

  public setSfxVolume(val: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, val));
    if (val > 0 && this.settings.sfxMuted) this.settings.sfxMuted = false;
    this.applyVolumes();
    this.notify();
  }

  public toggleBgmMute() {
    this.settings.bgmMuted = !this.settings.bgmMuted;
    this.applyVolumes();
    this.notify();
  }

  public toggleNatureMute() {
    this.settings.natureMuted = !this.settings.natureMuted;
    this.applyVolumes();
    this.notify();
  }

  public toggleSfxMute() {
    this.settings.sfxMuted = !this.settings.sfxMuted;
    this.applyVolumes();
    this.notify();
  }

  public toggleMasterMute() {
    this.settings.masterMuted = !this.settings.masterMuted;
    this.applyVolumes();
    this.notify();
  }
}

export const soundManager = new SoundManager();
