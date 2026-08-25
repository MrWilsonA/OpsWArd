'use client';

import React, { useState } from 'react';
import { CharacterProfile, RESPONDER_ROSTER } from '@/lib/characters';
import { 
  Radio, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  PhoneCall, 
  ShieldCheck, 
  Users, 
  Signal, 
  Wifi, 
  Zap, 
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Crown
} from 'lucide-react';

interface SpatialCommsHubProps {
  selectedAvatar: CharacterProfile;
  onAvatarSelect: (char: CharacterProfile) => void;
  nearbyResponders: { char: CharacterProfile; distance: number; volume: number }[];
  isPodiumBroadcasting: boolean;
}

const RADIO_CHANNELS = [
  { id: 'global', name: 'EOC ALL-HANDS', freq: '142.85 MHz', color: '#ec4899', isGlobal: true },
  { id: 'database', name: 'DATABASE OPS', freq: '148.10 MHz', color: '#a855f7' },
  { id: 'infra', name: 'INFRA & CLOUD', freq: '152.40 MHz', color: '#3b82f6' },
  { id: 'security', name: 'SECURITY VAULT', freq: '156.90 MHz', color: '#06b6d4' },
  { id: 'sre', name: 'NETWORK & SRE', freq: '161.20 MHz', color: '#10b981' },
  { id: 'chaos', name: 'CHAOS DRILL', freq: '166.50 MHz', color: '#ef4444' },
];

export const SpatialCommsHub: React.FC<SpatialCommsHubProps> = ({
  selectedAvatar,
  onAvatarSelect,
  nearbyResponders,
  isPodiumBroadcasting,
}) => {
  const [activeChannel, setActiveChannel] = useState<string>('global');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [inspectModalChar, setInspectModalChar] = useState<CharacterProfile | null>(null);

  const departments = ['All', 'Command', 'Database', 'Security', 'Infrastructure', 'Operations', 'Network', 'Telemetry', 'Chaos', 'Tactical'];

  const filteredRoster = RESPONDER_ROSTER.filter((char) => {
    const matchesSearch = char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.codename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'All' || char.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="cozy-comms flex flex-col h-full tactical-glass rounded-xl border border-tactical-border/80 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d121f]/90 border-b border-tactical-border flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Radio className="w-4 h-4 text-pink-400 animate-pulse" />
          <h3 className="text-sm font-semibold font-mono text-slate-100 tracking-wide">
            SPATIAL COMMS & 26 RESPONDER PROFILES
          </h3>
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-400">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>SFU MESH: ONLINE</span>
        </div>
      </div>

      {/* Radio Channel Strip */}
      <div className="p-3 bg-[#0a0e1a]/80 border-b border-tactical-border flex flex-col space-y-2">
        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
          Active Radio Frequencies:
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {RADIO_CHANNELS.map((ch) => {
            const isActive = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`p-2 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isActive
                    ? 'bg-blue-950/70 border-cyan-400 text-white shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold truncate" style={{ color: ch.color }}>
                    {ch.name}
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
                </div>
                <div className="text-[9px] font-mono text-slate-500 mt-1">{ch.freq}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Grid: Proximity Radar Comms + 26 Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
        {/* Left: Nearby Spatial Audio Radar */}
        <div className="lg:col-span-5 border-r border-tactical-border/60 p-4 flex flex-col space-y-4 overflow-y-auto max-h-[500px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Signal className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                Nearby Spatial Audio Feeds ({nearbyResponders.length})
              </span>
            </div>
            {isPodiumBroadcasting && (
              <span className="px-2 py-0.5 rounded bg-pink-950/80 border border-pink-500 text-[10px] font-mono text-pink-300">
                OVERRIDE
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {nearbyResponders.length === 0 ? (
              <div className="p-6 rounded-lg border border-dashed border-slate-800 text-center text-xs font-mono text-slate-500">
                No responders within proximity mesh radius. Move closer on the tactical grid to open audio channels.
              </div>
            ) : (
              nearbyResponders.map(({ char, distance, volume }) => {
                return (
                  <div
                    key={char.id}
                    className="p-3 rounded-lg bg-[#0e1424]/90 border border-tactical-border/80 flex items-center justify-between hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={char.avatar}
                          alt={char.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-700 bg-slate-900 pixelated"
                        />
                        {char.voiceActive && (
                          <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
                        )}
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-100">{char.name}</span>
                          <span
                            className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase"
                            style={{ backgroundColor: `${char.colorAccent}20`, color: char.colorAccent }}
                          >
                            {char.department}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{char.role}</span>
                      </div>
                    </div>

                    {/* Proximity Distance & Volume Meter */}
                    <div className="flex flex-col items-end space-y-1">
                      <div className="flex items-center space-x-1 text-[10px] font-mono text-cyan-300">
                        <span>{distance}px</span>
                        <span>•</span>
                        <span>{Math.round(volume * 100)}% VOL</span>
                      </div>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
                          style={{ width: `${volume * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: 26 Responders Roster & Character Selection */}
        <div className="lg:col-span-7 p-4 flex flex-col space-y-3 overflow-y-auto max-h-[500px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                All 26 Responder Profiles
              </span>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search character..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          {/* Department Filter Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-mono whitespace-nowrap transition-all ${
                  selectedDept === dept
                    ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Character Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredRoster.map((char) => {
              const isSelected = selectedAvatar.id === char.id;
              return (
                <div
                  key={char.id}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-950/70 border-cyan-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                      : 'bg-[#0d1322]/80 border-tactical-border/70 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setInspectModalChar(char)}>
                    <img
                      src={char.avatar}
                      alt={char.name}
                      className="w-11 h-11 rounded-lg object-cover border border-slate-700 bg-slate-950 pixelated"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-100">{char.name}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 text-[9px] font-mono font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">{char.role}</span>
                      <span className="text-[9px] font-mono text-slate-500">{char.clearanceLevel}</span>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5 items-end">
                    <button
                      onClick={() => onAvatarSelect(char)}
                      className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 cursor-default'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {isSelected ? 'ACTIVE' : 'SELECT'}
                    </button>
                    <button
                      onClick={() => setInspectModalChar(char)}
                      className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      <span>Bio</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Character Profile Modal */}
      {inspectModalChar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1526] border border-tactical-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative flex flex-col space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src={inspectModalChar.avatar}
                  alt={inspectModalChar.name}
                  className="w-20 h-20 rounded-xl object-cover border-2 border-cyan-400 bg-slate-950 pixelated shadow-lg"
                />
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-white">{inspectModalChar.name}</h3>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold"
                      style={{ backgroundColor: `${inspectModalChar.colorAccent}25`, color: inspectModalChar.colorAccent }}
                    >
                      {inspectModalChar.department}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">{inspectModalChar.codename}</span>
                  <span className="text-xs text-slate-300 mt-1">{inspectModalChar.role}</span>
                </div>
              </div>
              <button
                onClick={() => setInspectModalChar(null)}
                className="text-slate-400 hover:text-white text-sm font-mono px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Clearance & Specialty:</div>
                <div className="font-bold text-slate-200">{inspectModalChar.clearanceLevel}</div>
                <div className="text-slate-400 mt-0.5">{inspectModalChar.specialty}</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Tactical Dossier:</div>
                <p className="leading-relaxed text-slate-300">{inspectModalChar.bio}</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  onAvatarSelect(inspectModalChar);
                  setInspectModalChar(null);
                }}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider shadow-lg shadow-cyan-500/20"
              >
                Deploy as {inspectModalChar.name} Avatar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
