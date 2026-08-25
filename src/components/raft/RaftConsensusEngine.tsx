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
  Lock
} from 'lucide-react';

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
  const [auditLog, setAuditLog] = useState<string[]>([
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
      // Isolate Node-1 (Old Leader) into Minority partition
      // Node-2 and Node-3 form Majority and elect Node-2 as new Leader for Term 15!
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
        `[CHAOS] Network Partition severed Node Alpha. Majority partition (Beta + Gamma) maintained quorum and elected Node Beta as Leader for Term 15!`,
        ...prev,
      ]);
    } else {
      // Heal Network Partition: Rejoin Node-1 and step down to follower
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
        // Next healthy node becomes candidate -> leader
        return n.status === 'healthy' ? { ...n, role: 'Leader', term: n.term + 1, voteCount: 2 } : n;
      })
    );
    setAuditLog((prev) => [
      `[ALERT] Leader ${leader.name} crashed! Heartbeat timeout triggered instant failover election in <12ms.`,
      ...prev,
    ]);
  };

  // Propose Consensus Mutation
  const handleProposeMutation = () => {
    if (!mutationInput.trim()) return;
    const command = mutationInput.trim().toUpperCase();

    setNodes((prev) =>
      prev.map((n) => {
        if (n.status === 'crashed' || (isPartitioned && n.id === 'node-1')) {
          return n;
        }
        const newLog = { term: n.term, command, committed: true };
        return {
          ...n,
          lastLogIndex: n.lastLogIndex + 1,
          commitIndex: n.commitIndex + 1,
          logs: [newLog, ...n.logs.slice(0, 4)],
        };
      })
    );

    setAuditLog((prev) => [
      `[PROPOSAL] Committed "${command}" across quorum nodes at Index #${nodes[0].commitIndex + 1}.`,
      ...prev,
    ]);
    setMutationInput('');
  };

  return (
    <div className="flex flex-col h-full tactical-glass rounded-xl border border-tactical-border/80 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d121f]/90 border-b border-tactical-border flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold font-mono text-slate-100 tracking-wide">
            CONSENSUS REPLICATION CORE (RAFT 3-NODE CLUSTER)
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-xs font-mono text-cyan-300">QUORUM: 2/3 ACTIVE</span>
        </div>
      </div>

      {/* Cluster Node Visualizer */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-tactical-border/60 bg-[#090d16]/70">
        {nodes.map((node) => {
          const isLeader = node.role === 'Leader';
          const isPart = node.status === 'partitioned';
          const isCrashed = node.status === 'crashed';

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
                  <span>{node.latencyMs}ms</span>
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
      <div className="p-4 bg-[#0c101c]/90 border-b border-tactical-border grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-6 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Propose mutation (e.g. DECLARE P0_OUTAGE)..."
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
            <span>{isPartitioned ? 'HEAL PARTITION' : 'SIMULATE SPLIT-BRAIN'}</span>
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

      {/* Audit Log Terminal */}
      <div className="p-3 bg-[#07090e] flex-1 max-h-[140px] overflow-y-auto font-mono text-[11px] space-y-1 text-slate-300">
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
