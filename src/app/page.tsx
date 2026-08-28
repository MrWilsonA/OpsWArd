'use client';

import React, { useState } from 'react';
import { RESPONDER_ROSTER, CharacterProfile } from '@/lib/characters';
import { TacticalCanvasRoom } from '@/components/tactical-room/TacticalCanvasRoom';
import { SpatialCommsHub } from '@/components/communication/SpatialCommsHub';
import { RaftConsensusEngine } from '@/components/raft/RaftConsensusEngine';
import { PlaybookSagaOrchestrator } from '@/components/playbook/PlaybookSagaOrchestrator';
import { TelemetryDlqPipeline } from '@/components/telemetry/TelemetryDlqPipeline';
import { 
  ShieldAlert, 
  Radio, 
  Layers, 
  FileCode, 
  Activity, 
  Users, 
  Crown, 
  Compass, 
  Zap,
  Globe,
  Flame,
  CheckCircle2
} from 'lucide-react';

export default function OpsWardDashboard() {
  const [selectedAvatar, setSelectedAvatar] = useState<CharacterProfile>(
    RESPONDER_ROSTER.find((c) => c.id === 'helina') || RESPONDER_ROSTER[0]
  );
  const [nearbyResponders, setNearbyResponders] = useState<{ char: CharacterProfile; distance: number; volume: number }[]>([]);
  const [isPodiumBroadcasting, setIsPodiumBroadcasting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'war-room' | 'consensus' | 'playbooks' | 'telemetry'>('war-room');

  return (
    <main className="cozy-app-shell min-h-screen text-[#f9ecd1] flex flex-col">
      {/* Top Cyber Tactical HUD */}
      <header className="cozy-topbar sticky top-0 z-30 px-4 py-3 lg:px-8">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3.5">
            <div className="cozy-logo-mark">
              <div className="w-full h-full flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-[#f6d177]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-wider text-white">
                  OPS<span className="text-[#f3c86f]">WARD</span>
                </h1>
                <span className="cozy-version-badge">
                  LODGE BUILD
                </span>
              </div>
              <p className="text-[11px] text-[#d5b88e] hidden sm:block">
                Cozy spatial incident response · Oakheart Hall
              </p>
            </div>
          </div>

          {/* Active Navigation Tabs */}
          <div className="cozy-nav flex items-center space-x-1.5 p-1 text-xs">
            <button
              onClick={() => setActiveTab('war-room')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-all ${
                activeTab === 'war-room'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>WAR-ROOM & COMMS</span>
            </button>

            <button
              onClick={() => setActiveTab('consensus')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-all ${
                activeTab === 'consensus'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>RAFT CONSENSUS</span>
            </button>

            <button
              onClick={() => setActiveTab('playbooks')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-all ${
                activeTab === 'playbooks'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>SAGA PLAYBOOKS</span>
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-all ${
                activeTab === 'telemetry'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>TELEMETRY & DLQ</span>
            </button>
          </div>

          {/* Commander Avatar Badge */}
          <div className="cozy-commander flex items-center space-x-3 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-slate-100 flex items-center space-x-1">
                <span>{selectedAvatar.name}</span>
                {selectedAvatar.id === 'eric' && <Crown className="w-3 h-3 text-pink-400" />}
              </span>
              <span className="text-[10px] text-[#b8dc93]">{selectedAvatar.role}</span>
            </div>
            <img
              src={selectedAvatar.avatar}
              alt={selectedAvatar.name}
              className="w-10 h-10 rounded-lg object-cover border border-cyan-400/80 bg-slate-950 pixelated shadow-md shadow-cyan-500/20"
            />
          </div>
        </div>
      </header>

      {/* Main Tactical Grid Body */}
      <div className="flex-1 max-w-[1500px] w-full mx-auto p-4 lg:p-7 space-y-6">
        {/* Dynamic Views Based on Active Tab */}
        {activeTab === 'war-room' && (
          <div className="space-y-6">
            {/* Top War-Room View: 2D Spatial Canvas */}
            <div className="grid grid-cols-1 gap-6">
              <TacticalCanvasRoom
                selectedAvatar={selectedAvatar}
                onAvatarSelect={setSelectedAvatar}
                onProximityChange={setNearbyResponders}
                isPodiumBroadcasting={isPodiumBroadcasting}
                onTogglePodium={setIsPodiumBroadcasting}
              />
            </div>

            {/* Spatial Communications & 26 Responder Roster */}
            <div className="grid grid-cols-1 gap-6">
              <SpatialCommsHub
                selectedAvatar={selectedAvatar}
                onAvatarSelect={setSelectedAvatar}
                nearbyResponders={nearbyResponders}
                isPodiumBroadcasting={isPodiumBroadcasting}
              />
            </div>
          </div>
        )}

        {activeTab === 'consensus' && (
          <div className="grid grid-cols-1 gap-6">
            <RaftConsensusEngine />
          </div>
        )}

        {activeTab === 'playbooks' && (
          <div className="grid grid-cols-1 gap-6">
            <PlaybookSagaOrchestrator />
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div className="grid grid-cols-1 gap-6">
            <TelemetryDlqPipeline />
          </div>
        )}
      </div>

      {/* Tactical Status Footer */}
      <footer className="cozy-footer px-4 py-2.5 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ALL SYSTEMS OPERATIONAL</span>
          </span>
          <span>•</span>
          <span>CLUSTER QUORUM: 3/3 NODES COMMITTED</span>
          <span>•</span>
          <span>26 ENHANCED RESPONDERS ACTIVE</span>
        </div>
        <div className="text-slate-400">
          OpsWArd EOC Tactical Room • Chronicles of Cerebrum Infrastructure
        </div>
      </footer>
    </main>
  );
}
