'use client';

import React, { useState, useEffect } from 'react';
import { PlaybookWorkflow, PlaybookStep } from '@/types/opsward';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertOctagon, 
  ShieldAlert, 
  FileCode, 
  ArrowRight, 
  UserCheck, 
  Zap,
  Activity,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';

const SAMPLE_PLAYBOOKS: PlaybookWorkflow[] = [
  {
    id: 'pb-db-failover',
    title: 'PostgreSQL Primary Cluster Failover & Traffic Drain',
    severity: 'SEV-0',
    category: 'Database Resiliency',
    description: 'Saga workflow executing automated replica promotion, connection pool draining, and DNS failover with rollback safety.',
    status: 'idle',
    steps: [
      {
        id: 's1',
        name: 'Drain Ingress Traffic',
        service: 'Envoy Ingress Proxy',
        status: 'idle',
        durationMs: 800,
        description: 'Set upstream weight to 0% on Primary US-East node to gracefully drain in-flight queries.',
        actionType: 'automated',
        compensationAction: 'Restore Ingress traffic weight to 100% on Primary.',
        assignedEngineer: 'NuYing',
      },
      {
        id: 's2',
        name: 'Promote Read Replica to Primary',
        service: 'Patroni / PostgreSQL',
        status: 'idle',
        durationMs: 1200,
        description: 'Verify zero WAL lag on US-West replica and execute pg_promote() to assume writable leader role.',
        actionType: 'approval_required',
        compensationAction: 'Demote replica back to read-only standby and re-attach WAL sync.',
        assignedEngineer: 'James',
      },
      {
        id: 's3',
        name: 'Update Route53 Anycast DNS',
        service: 'CoreDNS & AWS Route53',
        status: 'idle',
        durationMs: 700,
        description: 'Switch database write endpoint CNAME to point to newly promoted US-West primary.',
        actionType: 'automated',
        compensationAction: 'Revert DNS CNAME back to previous US-East cluster.',
        assignedEngineer: 'Rinda',
      },
      {
        id: 's4',
        name: 'Execute Health Check & Replication Verification',
        service: 'Synthetic Probe Engine',
        status: 'idle',
        durationMs: 900,
        description: 'Execute synthetic write probes and confirm WAL replication stream is synchronized across secondary nodes.',
        actionType: 'health_check',
        compensationAction: 'Trigger emergency fallback circuit breaker if write latency exceeds 15ms.',
        assignedEngineer: 'Rose',
      },
    ],
  },
  {
    id: 'pb-kubelet-heal',
    title: 'Kubernetes CrashLoopBackOff Pod Auto-Healing',
    severity: 'SEV-1',
    category: 'SRE & Operations',
    description: 'Automated cordon, node drain, stateful volume unmount, and deployment rollout on alternative hypervisors.',
    status: 'idle',
    steps: [
      {
        id: 'k1',
        name: 'Cordon Faulty Node',
        service: 'Kube-Controller',
        status: 'idle',
        durationMs: 600,
        description: 'Mark physical hypervisor node as unschedulable to prevent new workload allocations.',
        actionType: 'automated',
        compensationAction: 'Uncordon node and clear taint.',
        assignedEngineer: 'Christ',
      },
      {
        id: 'k2',
        name: 'Drain Workloads & Evict Pods',
        service: 'Kubelet Engine',
        status: 'idle',
        durationMs: 1100,
        description: 'Evict stateful microservices with 30s graceful termination threshold.',
        actionType: 'automated',
        compensationAction: 'Cancel eviction and re-spawn on local node.',
        assignedEngineer: 'NuYing',
      },
      {
        id: 'k3',
        name: 'Reattach NVMe Volume & Rollout',
        service: 'CSI Storage Plugin',
        status: 'idle',
        durationMs: 800,
        description: 'Mount persistent volumes onto healthy backup compute hypervisor node.',
        actionType: 'health_check',
        compensationAction: 'Detach volume from target node.',
        assignedEngineer: 'Tony',
      },
    ],
  },
];

export const PlaybookSagaOrchestrator: React.FC = () => {
  const [playbooks, setPlaybooks] = useState<PlaybookWorkflow[]>(SAMPLE_PLAYBOOKS);
  const [selectedPbId, setSelectedPbId] = useState<string>('pb-db-failover');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [simulateFailureOnStep, setSimulateFailureOnStep] = useState<number | null>(null);
  const [approvalModalStep, setApprovalModalStep] = useState<PlaybookStep | null>(null);

  const currentPlaybook = playbooks.find((pb) => pb.id === selectedPbId) || playbooks[0];

  const triggerPlaybook = () => {
    setIsExecuting(true);
    setCurrentStepIndex(0);

    // Reset step statuses
    setPlaybooks((prev) =>
      prev.map((pb) => {
        if (pb.id === selectedPbId) {
          return {
            ...pb,
            status: 'running',
            steps: pb.steps.map((s) => ({ ...s, status: 'idle' })),
          };
        }
        return pb;
      })
    );
  };

  // Execution Step Machine
  useEffect(() => {
    if (!isExecuting || currentStepIndex < 0 || currentStepIndex >= currentPlaybook.steps.length) {
      if (isExecuting && currentStepIndex >= currentPlaybook.steps.length) {
        setIsExecuting(false);
        setPlaybooks((prev) =>
          prev.map((pb) => (pb.id === selectedPbId ? { ...pb, status: 'completed' } : pb))
        );
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      }
      return;
    }

    const step = currentPlaybook.steps[currentStepIndex];

    // Mark current step as running
    setPlaybooks((prev) =>
      prev.map((pb) => {
        if (pb.id === selectedPbId) {
          const newSteps = [...pb.steps];
          newSteps[currentStepIndex] = { ...newSteps[currentStepIndex], status: 'running' };
          return { ...pb, steps: newSteps };
        }
        return pb;
      })
    );

    // Check if this step requires manual commander approval
    if (step.actionType === 'approval_required' && !approvalModalStep) {
      setApprovalModalStep(step);
      return;
    }

    // Check if user requested simulated failure
    const isStepFailing = simulateFailureOnStep === currentStepIndex;

    const timer = setTimeout(() => {
      if (isStepFailing) {
        // Step failed! Trigger Compensating Saga Rollback
        setPlaybooks((prev) =>
          prev.map((pb) => {
            if (pb.id === selectedPbId) {
              const newSteps = [...pb.steps];
              newSteps[currentStepIndex] = { ...newSteps[currentStepIndex], status: 'failed' };
              return { ...pb, status: 'aborted', steps: newSteps };
            }
            return pb;
          })
        );
        setIsExecuting(false);
        executeCompensatingRollback(currentStepIndex);
      } else {
        // Step succeeded
        setPlaybooks((prev) =>
          prev.map((pb) => {
            if (pb.id === selectedPbId) {
              const newSteps = [...pb.steps];
              newSteps[currentStepIndex] = { ...newSteps[currentStepIndex], status: 'success' };
              return { ...pb, steps: newSteps };
            }
            return pb;
          })
        );
        setCurrentStepIndex((idx) => idx + 1);
      }
    }, step.durationMs);

    return () => clearTimeout(timer);
  }, [isExecuting, currentStepIndex, selectedPbId, simulateFailureOnStep, approvalModalStep]);

  // Execute reverse Compensating Transactions (Saga Rollback)
  const executeCompensatingRollback = (failedIndex: number) => {
    let rollbackIdx = failedIndex - 1;

    const rollbackInterval = setInterval(() => {
      if (rollbackIdx < 0) {
        clearInterval(rollbackInterval);
        setPlaybooks((prev) =>
          prev.map((pb) => (pb.id === selectedPbId ? { ...pb, status: 'compensated' } : pb))
        );
        return;
      }

      setPlaybooks((prev) =>
        prev.map((pb) => {
          if (pb.id === selectedPbId) {
            const newSteps = [...pb.steps];
            newSteps[rollbackIdx] = { ...newSteps[rollbackIdx], status: 'rolled_back' };
            return { ...pb, steps: newSteps };
          }
          return pb;
        })
      );
      rollbackIdx--;
    }, 600);
  };

  const handleApproveStep = () => {
    setApprovalModalStep(null);
    setPlaybooks((prev) =>
      prev.map((pb) => {
        if (pb.id === selectedPbId) {
          const newSteps = [...pb.steps];
          newSteps[currentStepIndex] = { ...newSteps[currentStepIndex], status: 'success' };
          return { ...pb, steps: newSteps };
        }
        return pb;
      })
    );
    setCurrentStepIndex((idx) => idx + 1);
  };

  return (
    <div className="flex flex-col h-full tactical-glass rounded-xl border border-tactical-border/80 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d121f]/90 border-b border-tactical-border flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <FileCode className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold font-mono text-slate-100 tracking-wide">
            TEMPORAL SAGA WORKFLOW ORCHESTRATOR
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          {currentPlaybook.status === 'running' && (
            <span className="px-2.5 py-0.5 rounded bg-blue-950 border border-cyan-400 text-cyan-300 text-xs font-mono font-bold animate-pulse">
              EXECUTING SAGA...
            </span>
          )}
          {currentPlaybook.status === 'completed' && (
            <span className="px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-mono font-bold">
              COMPLETED (ALL STEPS COMMITTED)
            </span>
          )}
          {currentPlaybook.status === 'compensated' && (
            <span className="px-2.5 py-0.5 rounded bg-rose-950 border border-rose-500 text-rose-300 text-xs font-mono font-bold">
              ROLLED BACK (COMPENSATED)
            </span>
          )}
        </div>
      </div>

      {/* Playbook Selector Strip */}
      <div className="p-3 bg-[#0a0e1a]/80 border-b border-tactical-border flex items-center space-x-2 overflow-x-auto">
        {playbooks.map((pb) => (
          <button
            key={pb.id}
            onClick={() => {
              if (!isExecuting) {
                setSelectedPbId(pb.id);
                setCurrentStepIndex(-1);
                setSimulateFailureOnStep(null);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center space-x-2 ${
              selectedPbId === pb.id
                ? 'bg-blue-950/80 border border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px]">
              {pb.severity}
            </span>
            <span>{pb.title}</span>
          </button>
        ))}
      </div>

      {/* Workflow Visual Pipeline */}
      <div className="p-5 flex-1 flex flex-col justify-between overflow-y-auto max-h-[420px] space-y-6">
        <div className="space-y-1">
          <div className="text-xs font-mono text-slate-400">{currentPlaybook.description}</div>
        </div>

        {/* Pipeline Step Nodes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
          {currentPlaybook.steps.map((step, idx) => {
            const isIdle = step.status === 'idle';
            const isRunning = step.status === 'running';
            const isSuccess = step.status === 'success';
            const isFailed = step.status === 'failed';
            const isRolledBack = step.status === 'rolled_back';

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border relative transition-all flex flex-col justify-between ${
                  isRunning
                    ? 'bg-blue-950/80 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/50'
                    : isSuccess
                    ? 'bg-emerald-950/40 border-emerald-500/70 text-slate-100'
                    : isFailed
                    ? 'bg-rose-950/80 border-rose-500 shadow-lg shadow-rose-500/20 text-white'
                    : isRolledBack
                    ? 'bg-amber-950/50 border-amber-500/60 text-amber-200'
                    : 'bg-[#0f1526]/80 border-tactical-border/70 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                      STEP 0{idx + 1}
                    </span>
                    {isRunning && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                    {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {isFailed && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                    {isRolledBack && <RotateCcw className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />}
                  </div>

                  <h4 className="text-xs font-bold text-slate-100 mb-1 leading-snug">{step.name}</h4>
                  <div className="text-[10px] font-mono text-cyan-400 mb-2">{step.service}</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed mb-3">{step.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[9px] font-mono flex items-center justify-between text-slate-500">
                  <span>Assigned: {step.assignedEngineer}</span>
                  <span>{step.durationMs}ms</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Workflow Control Buttons */}
        <div className="p-3 rounded-xl bg-[#090d16]/90 border border-tactical-border/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span>Chaos Test:</span>
            <button
              onClick={() => setSimulateFailureOnStep(simulateFailureOnStep === 1 ? null : 1)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                simulateFailureOnStep === 1
                  ? 'bg-rose-950 border border-rose-500 text-rose-300 font-bold'
                  : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {simulateFailureOnStep === 1 ? 'WILL FAIL ON STEP 2 (AUTO ROLLBACK)' : 'Simulate Fail at Step 2'}
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              disabled={isExecuting}
              onClick={triggerPlaybook}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>TRIGGER SAGA WORKFLOW</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manual Commander Approval Modal Gate */}
      {approvalModalStep && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1526] border border-cyan-400 rounded-2xl max-w-md w-full p-6 shadow-2xl relative flex flex-col space-y-4 glow-cyan">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-500 text-cyan-400">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
                  COMMANDER APPROVAL GATE
                </span>
                <h3 className="text-sm font-bold text-white leading-tight mt-0.5">
                  {approvalModalStep.name}
                </h3>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="text-slate-400 leading-relaxed">{approvalModalStep.description}</div>
              <div className="text-[11px] font-mono text-amber-300">
                ⚠️ Requires L4 Incident Commander key signature to commit state mutation.
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => {
                  setApprovalModalStep(null);
                  setIsExecuting(false);
                  executeCompensatingRollback(currentStepIndex);
                }}
                className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold"
              >
                REJECT & ROLLBACK
              </button>
              <button
                onClick={handleApproveStep}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-mono text-xs font-bold shadow-lg shadow-emerald-500/20"
              >
                AUTHORIZE STEP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
