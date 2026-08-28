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

      {/* Floating 16-Bit Pixel Audio Dialogue Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#271712] border-[3px] border-[#7c482c] shadow-[4px_4px_0_#120907] p-3 z-50 flex flex-col gap-2.5 text-[#f9ecd1] font-mono text-[9px] rounded-none">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b-2 border-[#5a301a] pb-2">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 grid place-items-center bg-[#422216] border border-[#8b5329] text-[#f6d177]">
                <Sliders className="w-3 h-3" />
              </div>
              <span className="font-bold text-[#f5d58b] uppercase tracking-wider text-[8px]">
                Audio & Acoustics
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => soundManager.toggleMasterMute()}
                className={`px-2 py-1 text-[7px] font-bold border-2 transition-all shadow-[2px_2px_0_#100806] active:translate-x-0.5 active:translate-y-0.5 ${
                  settings.masterMuted
                    ? 'bg-[#7d2624] border-[#b84e44] text-[#ffd6d2]'
                    : 'bg-[#38543a] border-[#5d8c60] text-[#e2f9e5]'
                }`}
              >
                {settings.masterMuted ? 'Unmute All' : 'Mute All'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-5 h-5 grid place-items-center bg-[#381e15] border border-[#683920] text-[#d5b88e] hover:text-white hover:bg-[#4a271c] shadow-[1px_1px_0_#100806]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 1. BGM Channel: Pixel Waltz */}
          <div className="p-2 bg-[#170c08] border-2 border-[#542f1b] shadow-[inset_0_0_0_1px_#0e0604] flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Music className="w-3.5 h-3.5 text-[#f6d177]" />
                <span className="font-bold text-[#f6e5aa] text-[8px]">BGM · Pixel Waltz</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => soundManager.toggleBgm()}
                  className="px-1.5 py-0.5 bg-[#422416] border border-[#8b5329] text-[#f6d177] hover:bg-[#57301e] transition-colors text-[7px]"
                  title={settings.isBgmPlaying ? 'Pause Music' : 'Play Music'}
                >
                  {settings.isBgmPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                </button>
                <button
                  onClick={() => soundManager.toggleBgmMute()}
                  className={`px-1.5 py-0.5 border text-[7px] transition-colors ${
                    settings.bgmMuted
                      ? 'text-[#ff9d94] bg-[#5c1c1a] border-[#8b2d2a]'
                      : 'text-[#d5b88e] bg-[#2d1810] border-[#57301e] hover:text-white'
                  }`}
                  title={settings.bgmMuted ? 'Unmute BGM' : 'Mute BGM'}
                >
                  {settings.bgmMuted ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
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
                className="w-full h-2 bg-[#0c0503] border border-[#482514] appearance-none cursor-pointer accent-[#e59b3c]"
              />
              <span className="font-mono text-[#f6d177] min-w-[28px] text-right text-[8px]">
                {Math.round((settings.bgmMuted ? 0 : settings.bgmVolume) * 100)}%
              </span>
            </div>
          </div>

          {/* 2. SFX Channel: Nature Ambient */}
          <div className="p-2 bg-[#170c08] border-2 border-[#542f1b] shadow-[inset_0_0_0_1px_#0e0604] flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Trees className="w-3.5 h-3.5 text-[#6dbb84]" />
                <span className="font-bold text-[#e2f5e8] text-[8px]">SFX · Nature Wind</span>
                <span className="px-1 py-0.2 text-[6px] font-bold uppercase bg-[#142d22] text-[#86d9a0] border border-[#2b5944]">
                  Outdoor Only
                </span>
              </div>
              <button
                onClick={() => soundManager.toggleNatureMute()}
                className={`px-1.5 py-0.5 border text-[7px] transition-colors ${
                  settings.natureMuted
                    ? 'text-[#ff9d94] bg-[#5c1c1a] border-[#8b2d2a]'
                    : 'text-[#d5b88e] bg-[#2d1810] border-[#57301e] hover:text-white'
                }`}
                title={settings.natureMuted ? 'Unmute Nature SFX' : 'Mute Nature SFX'}
              >
                {settings.natureMuted ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
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
                className="w-full h-2 bg-[#0c0503] border border-[#482514] appearance-none cursor-pointer accent-[#58a870]"
              />
              <span className="font-mono text-[#86d9a0] min-w-[28px] text-right text-[8px]">
                {Math.round((settings.natureMuted ? 0 : settings.natureVolume) * 100)}%
              </span>
            </div>
          </div>

          {/* 3. SFX Channel: Footsteps / Running */}
          <div className="p-2 bg-[#170c08] border-2 border-[#542f1b] shadow-[inset_0_0_0_1px_#0e0604] flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Footprints className="w-3.5 h-3.5 text-[#59a8d8]" />
                <span className="font-bold text-[#e1f0fa] text-[8px]">SFX · Footsteps</span>
              </div>
              <button
                onClick={() => soundManager.toggleSfxMute()}
                className={`px-1.5 py-0.5 border text-[7px] transition-colors ${
                  settings.sfxMuted
                    ? 'text-[#ff9d94] bg-[#5c1c1a] border-[#8b2d2a]'
                    : 'text-[#d5b88e] bg-[#2d1810] border-[#57301e] hover:text-white'
                }`}
                title={settings.sfxMuted ? 'Unmute Footsteps SFX' : 'Mute Footsteps SFX'}
              >
                {settings.sfxMuted ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
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
                className="w-full h-2 bg-[#0c0503] border border-[#482514] appearance-none cursor-pointer accent-[#489dd3]"
              />
              <span className="font-mono text-[#8ec8ee] min-w-[28px] text-right text-[8px]">
                {Math.round((settings.sfxMuted ? 0 : settings.sfxVolume) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
