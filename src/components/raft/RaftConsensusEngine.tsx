'use client';

import React, { useState, useEffect } from 'react';
import { RaftNodeState } from '@/types/opsward';
import { 
  Server, 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  RefreshCw, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  Split, 
  RotateCcw,
  Activity,
  Layers,
  Lock,
  HelpCircle,
  Play,
  Database,
  Flame,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Info,
  X,
  Sliders,
  Cpu,
  Globe,
  RadioTower,
  KeyRound
} from 'lucide-react';

interface CommandHelper {
  category: 'Incident' | 'Database' | 'Network' | 'Playbook' | 'Security';
  command: string;
  label: string;
  badge: string;
  description: string;
  impact: string;
}

interface ClusterStateMachine {
  severity: 'SEV-0' | 'SEV-1' | 'NORMAL';
  dbStatus: 'READ_WRITE' | 'LOCKED_READ_ONLY' | 'REPLICA_PROMOTED';
  trafficRouting: 'BALANCED' | 'US_EAST_DRAINED' | 'REROUTED_DR';
  cacheStatus: 'HEALTHY' | 'FLUSHED_CLEAN';
  securityMode: 'STANDARD' | 'CIRT_QUARANTINE';
  lastDispatchedPlaybook: string | null;
}

const COMMAND_HELPERS: CommandHelper[] = [
  {
    category: 'Incident',
    command: 'DECLARE SEVERITY=SEV-0',
    label: '🚨 SEV-0 Outage',
    badge: '🚨 CRITICAL',
    description: 'Memicu status darurat tertinggi (P0/SEV-0) dan mengunci audit trail cluster.',
    impact: 'State Machine cluster beralih ke SEV-0; notifikasi darurat dipancarkan ke seluruh responder.',
  },
  {
    category: 'Incident',
    command: 'DECLARE SEVERITY=SEV-1',
    label: '⚠️ SEV-1 Degraded',
    badge: '⚠️ HIGH',
    description: 'Menyatakan penurunan performa sistem (P1/SEV-1) dengan kuorum replikasi.',
    impact: 'State Machine memperbarui level insiden tanpa mematikan jalur transaksi.',
  },
  {
    category: 'Database',
    command: 'LOCK DATABASE_WRITES',
    label: '🔒 Lock DB Writes',
    badge: '🔒 STORAGE',
    description: 'Mengaktifkan proteksi Read-Only darurat pada database untuk mencegah korupsi data.',
    impact: 'State Machine mengunci database; transaksi mutasi INSERT/UPDATE ditolak.',
  },
  {
    category: 'Database',
    command: 'PROMOTE DB_REPLICA_02',
    label: '🔄 Promote DB Replica',
    badge: '🔄 FAILOVER',
    description: 'Mengangkat Replica 02 menjadi Primary Database baru setelah leader DB lama down.',
    impact: 'State Machine mengarahkan connection pool master ke Replica-02.',
  },
  {
    category: 'Network',
    command: 'DRAIN TRAFFIC_ZONE_US_EAST',
    label: '⚡ Drain US-East',
    badge: '⚡ NETWORK',
    description: 'Mengalihkan 100% traffic masuk dari data center US-East ke US-West & EU.',
    impact: 'Routing US-East diset ke 0%; beban dialihkan 50% ke US-West dan 50% ke EU-Central.',
  },
  {
    category: 'Network',
    command: 'FLUSH REDIS_SESSION_CLUSTER',
    label: '🧹 Flush Redis Cache',
    badge: '🧹 CACHE',
    description: 'Mengosongkan cache Redis terdistribusi untuk membuang poisoned session token.',
    impact: 'Cache cluster dieksekusi serempak pada log index yang sama di seluruh node.',
  },
  {
    category: 'Playbook',
    command: 'DISPATCH PLAYBOOK_AUTO_FAILOVER',
    label: '🚀 Dispatch Failover',
    badge: '🚀 SAGA',
    description: 'Memicu Saga Playbook Orchestrator untuk menjalankan runbook failover otomatis.',
    impact: 'Saga engine menerima token otorisasi dari Raft ledger dan memulai workflow langkah.',
  },
  {
    category: 'Security',
    command: 'ENABLE CIRT_ISOLATION_MODE',
    label: '🛡️ CIRT Quarantine',
    badge: '🛡️ SECURITY',
    description: 'Mengisolasi subnet yang terinfeksi dan memblokir port manajemen eksternal.',
    impact: 'Firewall cluster mengunci akses manajemen ke subnet publik.',
  },
];

const INITIAL_NODES: RaftNodeState[] = [
  {
    id: 'node-1',
    name: 'Raft Node Alpha (EOC-US-East)',
    role: 'Leader',
    term: 14,
    voteCount: 3,
    lastLogIndex: 108,
    commitIndex: 108,
    status: 'healthy',
    ipAddress: '10.240.0.11:7001',
    latencyMs: 1.2,
    logs: [
      { term: 14, command: 'SET SEVERITY=SEV-0', committed: true },
      { term: 14, command: 'LOCK DATABASE_WRITES', committed: true },
      { term: 14, command: 'DISPATCH PLAYBOOK_DB_FAILOVER', committed: true },
    ],
  },
  {
    id: 'node-2',
    name: 'Raft Node Beta (EOC-US-West)',
    role: 'Follower',
    term: 14,
    voteCount: 0,
    lastLogIndex: 108,
    commitIndex: 108,
    status: 'healthy',
    ipAddress: '10.240.0.12:7001',
    latencyMs: 14.8,
    logs: [
      { term: 14, command: 'SET SEVERITY=SEV-0', committed: true },
      { term: 14, command: 'LOCK DATABASE_WRITES', committed: true },
      { term: 14, command: 'DISPATCH PLAYBOOK_DB_FAILOVER', committed: true },
    ],
  },
  {
    id: 'node-3',
    name: 'Raft Node Gamma (EOC-EU-Central)',
    role: 'Follower',
    term: 14,
    voteCount: 0,
    lastLogIndex: 108,
    commitIndex: 108,
    status: 'healthy',
    ipAddress: '10.240.0.13:7001',
    latencyMs: 38.4,
    logs: [
      { term: 14, command: 'SET SEVERITY=SEV-0', committed: true },
      { term: 14, command: 'LOCK DATABASE_WRITES', committed: true },
      { term: 14, command: 'DISPATCH PLAYBOOK_DB_FAILOVER', committed: true },
    ],
  },
];

export const RaftConsensusEngine: React.FC = () => {
  const [nodes, setNodes] = useState<RaftNodeState[]>(INITIAL_NODES);
  const [isPartitioned, setIsPartitioned] = useState<boolean>(false);
  const [heartbeatTick, setHeartbeatTick] = useState<number>(0);
  const [mutationInput, setMutationInput] = useState<string>('');
  const [isHelperOpen, setIsHelperOpen] = useState<boolean>(false);
  
  // Replicated Cluster State Machine
  const [stateMachine, setStateMachine] = useState<ClusterStateMachine>({
    severity: 'SEV-0',
    dbStatus: 'READ_WRITE',
    trafficRouting: 'BALANCED',
    cacheStatus: 'HEALTHY',
    securityMode: 'STANDARD',
    lastDispatchedPlaybook: null,
  });

  const [auditLog, setAuditLog] = useState<string[]>([
    '[STATE_MACHINE] Cluster initialized. Severity: SEV-0, DB: Read-Write, Traffic: Balanced.',
    '[RAFT] Node Alpha elected Leader for Term 14 (Quorum 3/3).',
    '[HEARTBEAT] Leader broadcasting AppendEntries RPCs every 50ms.',
    '[COMMIT] Index #108 committed across majority nodes.',
  ]);

  // Simulate Raft Heartbeat & Term Progression
  useEffect(() => {
    const interval = setInterval(() => {
      setHeartbeatTick((t) => (t + 1) % 100);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Split-Brain Network Partition Simulation
  const handleTogglePartition = () => {
    if (!isPartitioned) {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === 'node-1') {
            return { ...n, status: 'partitioned', role: 'Candidate', voteCount: 1 };
          }
          if (n.id === 'node-2') {
            return { ...n, role: 'Leader', term: n.term + 1, voteCount: 2 };
          }
          return { ...n, term: n.term + 1 };
        })
      );
      setIsPartitioned(true);
      setAuditLog((prev) => [
        `[CHAOS] Network Partition severed Node Alpha. Majority partition (Beta + Gamma) elected Node Beta as Leader for Term 15!`,
        ...prev,
      ]);
    } else {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          status: 'healthy',
          role: n.id === 'node-2' ? 'Leader' : 'Follower',
          term: 15,
          voteCount: 0,
        }))
      );
      setIsPartitioned(false);
      setAuditLog((prev) => [
        `[HEAL] Network partition resolved. Node Alpha reconciled logs from Leader Beta and stepped down to Follower.`,
        ...prev,
      ]);
    }
  };

  // Crash Leader Simulation
  const handleCrashLeader = () => {
    const leader = nodes.find((n) => n.role === 'Leader');
    if (!leader) return;

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === leader.id) {
          return { ...n, status: 'crashed', role: 'Follower' };
        }
        return n.status === 'healthy' ? { ...n, role: 'Leader', term: n.term + 1, voteCount: 2 } : n;
      })
    );
    setAuditLog((prev) => [
      `[ALERT] Leader ${leader.name} crashed! Heartbeat timeout triggered instant failover election in <12ms.`,
      ...prev,
    ]);
  };

  // Propose and Commit Mutation to State Machine
  const executeMutation = (rawCommand: string) => {
    if (!rawCommand.trim()) return;
    const command = rawCommand.trim().toUpperCase();
    const targetIndex = nodes[0].commitIndex + 1;

    // Apply log mutation to Raft cluster nodes
    setNodes((prev) =>
      prev.map((n) => {
        if (n.status === 'crashed' || (isPartitioned && n.id === 'node-1')) {
          return n;
        }
        const newLog = { term: n.term, command, committed: true };
        return {
          ...n,
          lastLogIndex: targetIndex,
          commitIndex: targetIndex,
          logs: [newLog, ...n.logs.slice(0, 4)],
        };
      })
    );

    // Apply real side-effect mutation to Cluster State Machine
    let stateMessage = '';
    setStateMachine((prev) => {
      const next = { ...prev };
      if (command.includes('SEV-0')) {
        next.severity = 'SEV-0';
        stateMessage = 'Active Incident Severity changed to SEV-0 (CRITICAL OUTAGE).';
      } else if (command.includes('SEV-1')) {
        next.severity = 'SEV-1';
        stateMessage = 'Active Incident Severity changed to SEV-1 (DEGRADED).';
      } else if (command.includes('LOCK DATABASE') || command.includes('LOCK_DATABASE')) {
        next.dbStatus = 'LOCKED_READ_ONLY';
        stateMessage = 'Database writes locked globally (Mode: Read-Only).';
      } else if (command.includes('PROMOTE DB') || command.includes('PROMOTE_DB')) {
        next.dbStatus = 'REPLICA_PROMOTED';
        stateMessage = 'Replica-02 promoted to Master Database.';
      } else if (command.includes('DRAIN TRAFFIC') || command.includes('DRAIN_TRAFFIC')) {
        next.trafficRouting = 'US_EAST_DRAINED';
        stateMessage = 'Traffic drained from US-East. Routing 50% to US-West and 50% to EU-Central.';
      } else if (command.includes('FLUSH REDIS') || command.includes('FLUSH_REDIS')) {
        next.cacheStatus = 'FLUSHED_CLEAN';
        stateMessage = 'Redis distributed cache purged and re-warmed.';
      } else if (command.includes('PLAYBOOK') || command.includes('FAILOVER')) {
        next.lastDispatchedPlaybook = 'Database Failover & Recovery Playbook';
        stateMessage = 'Saga Playbook trigger dispatched via consensus token.';
      } else if (command.includes('CIRT') || command.includes('ISOLATION')) {
        next.securityMode = 'CIRT_QUARANTINE';
        stateMessage = 'CIRT Network Quarantine activated on vulnerable subnets.';
      } else {
        stateMessage = `Custom state machine action applied: "${command}".`;
      }
      return next;
    });

    const leaderNode = nodes.find((n) => n.role === 'Leader') || nodes[0];

    setAuditLog((prev) => [
      `[STATE_MACHINE] ${stateMessage}`,
      `[COMMIT] Index #${targetIndex} "${command}" committed across Quorum nodes (2/3 majority ACK).`,
      `[APPEND_ENTRIES] ${leaderNode.name} replicated entry to followers at Term ${leaderNode.term}.`,
      `[PROPOSAL] Leader received mutation request: "${command}".`,
      ...prev,
    ]);
    setMutationInput('');
  };

  const handleProposeMutation = () => {
    executeMutation(mutationInput);
  };

  return (
    <div className="flex flex-col h-full tactical-glass rounded-xl border border-tactical-border/80 overflow-hidden shadow-2xl">
      {/* Top Main Header */}
      <div className="px-4 py-3 bg-[#0d121f]/90 border-b border-tactical-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold font-mono text-slate-100 tracking-wide">
            CONSENSUS REPLICATION CORE (RAFT 3-NODE CLUSTER)
          </h3>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsHelperOpen(!isHelperOpen)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60 text-xs font-mono font-bold transition-all shadow-sm"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>COMMAND HELPER</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-xs font-mono text-cyan-300">QUORUM: 2/3 ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Live Replicated Cluster State Machine Banner */}
      <div className="px-4 py-2 bg-[#121a2d]/90 border-b border-tactical-border/80 flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-slate-200">LIVE STATE MACHINE:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. Incident Severity Badge */}
          <div className={`px-2 py-0.5 rounded flex items-center gap-1 border font-bold ${
            stateMachine.severity === 'SEV-0'
              ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse'
              : stateMachine.severity === 'SEV-1'
              ? 'bg-amber-950/80 border-amber-600 text-amber-300'
              : 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
          }`}>
            <AlertTriangle className="w-3 h-3" />
            <span>{stateMachine.severity === 'SEV-0' ? 'SEV-0 OUTAGE' : stateMachine.severity === 'SEV-1' ? 'SEV-1 DEGRADED' : 'NORMAL'}</span>
          </div>

          {/* 2. Database Write Lock Badge */}
          <div className={`px-2 py-0.5 rounded flex items-center gap-1 border font-bold ${
            stateMachine.dbStatus === 'LOCKED_READ_ONLY'
              ? 'bg-rose-950/80 border-rose-500 text-rose-200'
              : stateMachine.dbStatus === 'REPLICA_PROMOTED'
              ? 'bg-blue-950/80 border-cyan-500 text-cyan-200'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}>
            <Database className="w-3 h-3 text-cyan-400" />
            <span>
              {stateMachine.dbStatus === 'LOCKED_READ_ONLY'
                ? 'DB: READ-ONLY (LOCKED)'
                : stateMachine.dbStatus === 'REPLICA_PROMOTED'
                ? 'DB: REPLICA-02 PRIMARY'
                : 'DB: READ-WRITE'}
            </span>
          </div>

          {/* 3. Traffic Routing Badge */}
          <div className={`px-2 py-0.5 rounded flex items-center gap-1 border font-bold ${
            stateMachine.trafficRouting === 'US_EAST_DRAINED'
              ? 'bg-amber-950/80 border-amber-500 text-amber-300'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}>
            <Globe className="w-3 h-3 text-cyan-400" />
            <span>{stateMachine.trafficRouting === 'US_EAST_DRAINED' ? 'TRAFFIC: US-EAST DRAINED (0%)' : 'TRAFFIC: BALANCED (33%)'}</span>
          </div>

          {/* 4. Security Mode Badge */}
          {stateMachine.securityMode === 'CIRT_QUARANTINE' && (
            <div className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500 text-purple-300 font-bold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              <span>CIRT QUARANTINE ACTIVE</span>
            </div>
          )}

          {/* 5. Playbook Dispatched Trigger */}
          {stateMachine.lastDispatchedPlaybook && (
            <div className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400 text-cyan-200 font-bold flex items-center gap-1">
              <Play className="w-3 h-3 text-cyan-400" />
              <span>PLAYBOOK DISPATCHED</span>
            </div>
          )}
        </div>
      </div>

      {/* Cluster Node Visualizer */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-tactical-border/60 bg-[#090d16]/70">
        {nodes.map((node) => {
          const isLeader = node.role === 'Leader';
          const isPart = node.status === 'partitioned';
          const isCrashed = node.status === 'crashed';
          const isUsEastDrained = stateMachine.trafficRouting === 'US_EAST_DRAINED' && node.id === 'node-1';

          return (
            <div
              key={node.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isCrashed
                  ? 'bg-rose-950/40 border-rose-600/60 opacity-60'
                  : isPart
                  ? 'bg-amber-950/40 border-amber-500/60'
                  : isLeader
                  ? 'bg-blue-950/70 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/40'
                  : 'bg-[#0f1526]/80 border-tactical-border/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-200 truncate">{node.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      isLeader
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : isCrashed
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : isPart
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {node.role}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 my-2">
                  <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block">Term:</span>
                    <span className="text-slate-200 font-bold text-xs">{node.term}</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block">Commit Index:</span>
                    <span className="text-cyan-400 font-bold text-xs">#{node.commitIndex}</span>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-500 mb-2 flex items-center justify-between">
                  <span>IP: {node.ipAddress}</span>
                  <span className={isUsEastDrained ? 'text-amber-400 font-bold' : ''}>
                    {isUsEastDrained ? 'TRAFFIC: 0% (DRAINED)' : stateMachine.trafficRouting === 'US_EAST_DRAINED' ? 'TRAFFIC: 50%' : `${node.latencyMs}ms`}
                  </span>
                </div>
              </div>

              {/* Node Recent Logs */}
              <div className="space-y-1 mt-1 pt-2 border-t border-slate-800/80">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Recent Replicated Logs:</span>
                {node.logs.slice(0, 2).map((lg, idx) => (
                  <div key={idx} className="flex items-center space-x-1 text-[9px] font-mono text-slate-300 truncate">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{lg.command}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Controls & Chaos Injection */}
      <div className="p-4 bg-[#0c101c]/90 border-b border-tactical-border flex flex-col gap-3">
        {/* Main Input Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Ketik perintah (atau klik preset di bawah)..."
              value={mutationInput}
              onChange={(e) => setMutationInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleProposeMutation()}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
            <button
              onClick={handleProposeMutation}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-blue-500/20 whitespace-nowrap"
            >
              COMMIT LOG
            </button>
          </div>

          <div className="md:col-span-6 flex items-center justify-end space-x-2">
            <button
              onClick={handleTogglePartition}
              className={`px-3 py-2 rounded-lg border font-mono text-xs font-bold flex items-center space-x-1.5 transition-all ${
                isPartitioned
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>{isPartitioned ? 'HEAL NETWORK' : 'SIMULATE SPLIT-BRAIN'}</span>
            </button>

            <button
              onClick={handleCrashLeader}
              className="px-3 py-2 rounded-lg bg-rose-950/60 border border-rose-600/60 text-rose-300 hover:bg-rose-900/60 font-mono text-xs font-bold flex items-center space-x-1.5 transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>CRASH LEADER</span>
            </button>
          </div>
        </div>

        {/* Quick Command Preset Chips (1-Click Insertion / Helper) */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/60">
          <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Quick Action Presets:
          </span>
          {COMMAND_HELPERS.slice(0, 5).map((helper, idx) => (
            <button
              key={idx}
              onClick={() => executeMutation(helper.command)}
              className="px-2 py-1 rounded bg-slate-900/80 border border-slate-700/80 hover:border-cyan-500/70 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-200 text-[10px] font-mono transition-all flex items-center gap-1"
              title={`Klik untuk mengeksekusi "${helper.command}": ${helper.description}`}
            >
              <span>{helper.label}</span>
            </button>
          ))}
          <button
            onClick={() => setIsHelperOpen(true)}
            className="px-2 py-1 rounded bg-blue-950/40 border border-blue-800/50 hover:bg-blue-900/50 text-blue-300 text-[10px] font-mono font-bold transition-all"
          >
            + All 8 Commands...
          </button>
        </div>
      </div>

      {/* Expandable Command Reference & Helper Modal */}
      {isHelperOpen && (
        <div className="p-4 bg-[#0a0f1d] border-b border-cyan-900/50 max-h-[300px] overflow-y-auto font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <strong className="text-cyan-200 text-xs uppercase tracking-wider">
                Raft Consensus Command Reference & State Machine Impact Guide
              </strong>
            </div>
            <button
              onClick={() => setIsHelperOpen(false)}
              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {COMMAND_HELPERS.map((item, index) => (
              <div
                key={index}
                className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <code className="text-cyan-300 font-bold text-[11px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 truncate">
                      {item.command}
                    </code>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-snug mt-1">
                    {item.description}
                  </p>
                  <p className="text-[9px] text-slate-500 leading-snug mt-1">
                    <span className="text-amber-400 font-semibold">Efek State Machine:</span> {item.impact}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => {
                      setMutationInput(item.command);
                      setIsHelperOpen(false);
                    }}
                    className="flex-1 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-bold transition-all"
                  >
                    Salin ke Input
                  </button>
                  <button
                    onClick={() => {
                      executeMutation(item.command);
                      setIsHelperOpen(false);
                    }}
                    className="flex-1 py-1 rounded bg-blue-600/30 border border-blue-500/50 text-blue-300 hover:bg-blue-600 hover:text-white text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <Play className="w-2.5 h-2.5" />
                    <span>Eksekusi Konsensus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log Terminal */}
      <div className="p-3 bg-[#07090e] flex-1 max-h-[160px] overflow-y-auto font-mono text-[11px] space-y-1 text-slate-300">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center space-x-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Consensus Audit Trail (Byzantine-Resilient Ledger):</span>
        </div>
        {auditLog.map((log, i) => (
          <div key={i} className="leading-relaxed flex items-start space-x-1.5 text-slate-400">
            <span className="text-cyan-500 select-none">❯</span>
            <span>{log}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
