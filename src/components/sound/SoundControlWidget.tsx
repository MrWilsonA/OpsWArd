'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  Music,
  Trees,
  Footprints,
  Play,
  Pause,
  Sliders,
  X,
  Sparkles,
} from 'lucide-react';
import { soundManager, AudioSettings } from '@/lib/sound-manager';

interface SoundControlWidgetProps {
  variant?: 'icon' | 'pill';
}

export const SoundControlWidget: React.FC<SoundControlWidgetProps> = ({ variant = 'icon' }) => {
  const [settings, setSettings] = useState<AudioSettings>(soundManager.settings);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return soundManager.subscribe((newSettings) => {
      setSettings(newSettings);
    });
  }, []);

  // Close popup when clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const isMuted = settings.masterMuted;

  return (
    <div className="relative" ref={panelRef}>
      {/* Sound Trigger Button */}
      {variant === 'icon' ? (
        <button
          onClick={() => {
            soundManager.init();
            setIsOpen((prev) => !prev);
          }}
          className={`game-icon-button transition-transform active:scale-95 ${
            isMuted ? 'is-danger' : isOpen || settings.isBgmPlaying ? 'is-active' : ''
          }`}
          title="Audio & Sound Controls"
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : settings.isBgmPlaying ? (
            <Volume2 className="h-4 w-4 animate-pulse" />
          ) : (
            <Volume1 className="h-4 w-4" />
          )}
        </button>
      ) : (
        <button
          onClick={() => {
            soundManager.init();
            setIsOpen((prev) => !prev);
          }}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-sans shadow-sm ${
            isOpen
              ? 'bg-amber-500/20 border-amber-500/80 text-amber-200'
              : isMuted
              ? 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              : 'bg-[#1e1512]/90 border-amber-900/50 text-[#f3c86f] hover:border-amber-600/70 hover:bg-[#251b17]'
          }`}
          title="Audio & Sound Controls"
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
          ) : settings.isBgmPlaying ? (
            <div className="flex items-center space-x-1">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="flex space-x-0.5 items-end h-2.5">
                <span className="w-0.5 h-full bg-amber-400 animate-pulse" />
                <span className="w-0.5 h-2/3 bg-amber-400 animate-pulse delay-75" />
                <span className="w-0.5 h-4/5 bg-amber-400 animate-pulse delay-150" />
              </span>
            </div>
          ) : (
            <Volume1 className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="font-bold tracking-wider text-[11px] uppercase">
            {isMuted ? 'Muted' : 'Sound'}
          </span>
        </button>
      )}

      {/* Floating Sound Settings Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-[#140e0c]/98 border border-amber-900/60 shadow-2xl backdrop-blur-xl p-4 z-50 flex flex-col gap-3 text-neutral-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-900/30 pb-2.5">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                Audio & Acoustics
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => soundManager.toggleMasterMute()}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  settings.masterMuted
                    ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
                }`}
              >
                {settings.masterMuted ? 'Unmute All' : 'Mute All'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 1. BGM Channel: Pixel Waltz */}
          <div className="p-2.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Music className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-100">BGM · Pixel Waltz</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => soundManager.toggleBgm()}
                  className="p-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                  title={settings.isBgmPlaying ? 'Pause Music' : 'Play Music'}
                >
                  {settings.isBgmPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => soundManager.toggleBgmMute()}
                  className={`p-1 rounded transition-colors ${
                    settings.bgmMuted ? 'text-rose-400 bg-rose-950/40' : 'text-neutral-400 hover:text-white'
                  }`}
                  title={settings.bgmMuted ? 'Unmute BGM' : 'Mute BGM'}
                >
                  {settings.bgmMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={settings.bgmMuted ? 0 : settings.bgmVolume}
                onChange={(e) => soundManager.setBgmVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-[10px] font-mono text-neutral-400 min-w-[28px] text-right">
                {Math.round((settings.bgmMuted ? 0 : settings.bgmVolume) * 100)}%
              </span>
            </div>
          </div>

          {/* 2. SFX Channel: Nature Ambient */}
          <div className="p-2.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trees className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-neutral-200">SFX · Nature Wind</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  Outdoor Only
                </span>
              </div>
              <button
                onClick={() => soundManager.toggleNatureMute()}
                className={`p-1 rounded transition-colors ${
                  settings.natureMuted ? 'text-rose-400 bg-rose-950/40' : 'text-neutral-400 hover:text-white'
                }`}
                title={settings.natureMuted ? 'Unmute Nature SFX' : 'Mute Nature SFX'}
              >
                {settings.natureMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={settings.natureMuted ? 0 : settings.natureVolume}
                onChange={(e) => soundManager.setNatureVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-[10px] font-mono text-neutral-400 min-w-[28px] text-right">
                {Math.round((settings.natureMuted ? 0 : settings.natureVolume) * 100)}%
              </span>
            </div>
          </div>

          {/* 3. SFX Channel: Footsteps / Running */}
          <div className="p-2.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Footprints className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-bold text-neutral-200">SFX · Footsteps / Movement</span>
              </div>
              <button
                onClick={() => soundManager.toggleSfxMute()}
                className={`p-1 rounded transition-colors ${
                  settings.sfxMuted ? 'text-rose-400 bg-rose-950/40' : 'text-neutral-400 hover:text-white'
                }`}
                title={settings.sfxMuted ? 'Unmute Footsteps SFX' : 'Mute Footsteps SFX'}
              >
                {settings.sfxMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={settings.sfxMuted ? 0 : settings.sfxVolume}
                onChange={(e) => soundManager.setSfxVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-[10px] font-mono text-neutral-400 min-w-[28px] text-right">
                {Math.round((settings.sfxMuted ? 0 : settings.sfxVolume) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
