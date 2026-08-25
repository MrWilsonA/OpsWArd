'use client';

import React, { useState, useEffect } from 'react';
import { TelemetryAlert } from '@/types/opsward';
import { 
  Activity, 
  AlertCircle, 
  RotateCcw, 
  CheckCircle2, 
  Trash2, 
  Eye, 
  Filter, 
  Inbox, 
  Zap, 
  Flame,
  Radio
} from 'lucide-react';

const INITIAL_ALERTS: TelemetryAlert[] = [
  {
    id: 'alt-9041',
    timestamp: '14:28:12.402',
    severity: 'SEV-0',
    service: 'payment-gateway-us-east',
    message: 'Kafka partition write timeout > 5000ms. Connection dropped to upstream shard.',
    status: 'dlq',
    retryCount: 3,
    maxRetries: 3,
    dlqReason: 'MaxExponentialRetriesExceededException (Backoff 100ms -> 400ms -> 1600ms failed)',
    payload: {
      transactionId: 'tx_99341_f9',
      amountUsd: 14850.00,
      currency: 'USD',
      clusterOrigin: 'iad-node-04',
      errorStack: 'TimeoutError: Kafka socket closed during commit phase',
    },
  },
  {
    id: 'alt-9042',
    timestamp: '14:29:04.118',
    severity: 'SEV-1',
    service: 'auth-vault-token-rotation',
    message: 'HSM cryptographic handshake rejected on standby node due to clock skew drift.',
    status: 'dlq',
    retryCount: 3,
    maxRetries: 3,
    dlqReason: 'ClockDriftThresholdExceeded (Delta: +342ms > 50ms tolerance)',
    payload: {
      vaultNode: 'vault-sec-02',
      skewDeltaMs: 342,
      certificateId: 'cert_eoc_2026_prod',
    },
  },
  {
    id: 'alt-9043',
    timestamp: '14:31:22.840',
    severity: 'SEV-2',
    service: 'opentelemetry-collector',
    message: 'Buffer capacity reaching 92% across region-us-west.',
    status: 'active',
    retryCount: 1,
    maxRetries: 3,
    payload: {
      bufferUsagePercent: 92.4,
      droppedSpansCount: 0,
    },
  },
];

export const TelemetryDlqPipeline: React.FC = () => {
  const [alerts, setAlerts] = useState<TelemetryAlert[]>(INITIAL_ALERTS);
  const [selectedAlert, setSelectedAlert] = useState<TelemetryAlert | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [isSimulatingStream, setIsSimulatingStream] = useState<boolean>(true);

  // High-throughput telemetry stream simulation
  useEffect(() => {
    if (!isSimulatingStream) return;

    const interval = setInterval(() => {
      const services = ['ingress-envoy', 'postgres-patroni', 'redis-sentinel', 'kube-apiserver', 'crypto-vault'];
      const sevPool: ('SEV-0' | 'SEV-1' | 'SEV-2')[] = ['SEV-2', 'SEV-1', 'SEV-2', 'SEV-0'];
      const chosenSev = sevPool[Math.floor(Math.random() * sevPool.length)];
      const chosenService = services[Math.floor(Math.random() * services.length)];

      const newAlert: TelemetryAlert = {
        id: `alt-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toTimeString().split(' ')[0] + '.' + Math.floor(Math.random() * 999),
        severity: chosenSev,
        service: chosenService,
        message: `${chosenService.toUpperCase()} telemetry anomaly probe triggered.`,
        status: chosenSev === 'SEV-0' ? 'dlq' : 'active',
        retryCount: chosenSev === 'SEV-0' ? 3 : 0,
        maxRetries: 3,
        dlqReason: chosenSev === 'SEV-0' ? 'DeadLetterQueueAutoRouted' : undefined,
        payload: {
          metrics: { cpu: Math.floor(60 + Math.random() * 35), memoryMb: 4096, p99LatencyMs: Math.floor(5 + Math.random() * 120) },
        },
      };

      setAlerts((prev) => [newAlert, ...prev.slice(0, 19)]);
    }, 4500);

    return () => clearInterval(interval);
  }, [isSimulatingStream]);

  // Replay DLQ Payload
  const handleReplayPayload = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alt) => (alt.id === alertId ? { ...alt, status: 'replayed', retryCount: 0 } : alt))
    );
    if (selectedAlert?.id === alertId) {
      setSelectedAlert((prev) => (prev ? { ...prev, status: 'replayed' } : null));
    }
  };

  const filteredAlerts = alerts.filter(
    (alt) => filterSeverity === 'All' || alt.severity === filterSeverity
  );

  const dlqCount = alerts.filter((a) => a.status === 'dlq').length;

  return (
    <div className="flex flex-col h-full tactical-glass rounded-xl border border-tactical-border/80 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d121f]/90 border-b border-tactical-border flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold font-mono text-slate-100 tracking-wide">
            TELEMETRY INGESTION & DEAD LETTER QUEUE (DLQ)
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          {dlqCount > 0 && (
            <span className="px-2.5 py-0.5 rounded bg-rose-950 border border-rose-500 text-rose-300 text-xs font-mono font-bold animate-pulse">
              {dlqCount} DLQ EVENTS ISOLATED
            </span>
          )}
        </div>
      </div>

      {/* Filter & Stream Controls */}
      <div className="p-3 bg-[#0a0e1a]/80 border-b border-tactical-border flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          {['All', 'SEV-0', 'SEV-1', 'SEV-2'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
                filterSeverity === sev
                  ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsSimulatingStream(!isSimulatingStream)}
          className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all ${
            isSimulatingStream
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          {isSimulatingStream ? '● LIVE STREAM ACTIVE' : '○ STREAM PAUSED'}
        </button>
      </div>

      {/* Main Alert List */}
      <div className="p-3 flex-1 overflow-y-auto max-h-[300px] space-y-2">
        {filteredAlerts.map((alert) => {
          const isDlq = alert.status === 'dlq';
          const isReplayed = alert.status === 'replayed';

          return (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border transition-all flex items-center justify-between ${
                isDlq
                  ? 'bg-rose-950/40 border-rose-600/70 hover:border-rose-500'
                  : isReplayed
                  ? 'bg-emerald-950/40 border-emerald-500/60'
                  : 'bg-[#0f1526]/80 border-tactical-border/70 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start space-x-3">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase mt-0.5 ${
                    alert.severity === 'SEV-0'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : alert.severity === 'SEV-1'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  }`}
                >
                  {alert.severity}
                </span>

                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-100">{alert.service}</span>
                    <span className="text-[10px] font-mono text-slate-500">{alert.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">{alert.message}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {isDlq && (
                  <button
                    onClick={() => handleReplayPayload(alert.id)}
                    className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-[10px] font-bold flex items-center space-x-1 shadow-md shadow-blue-500/20"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>REPLAY DLQ</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedAlert(alert)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center space-x-1"
                >
                  <Eye className="w-3 h-3 text-cyan-400" />
                  <span>PAYLOAD</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspect Payload Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1526] border border-tactical-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                  TELEMETRY EVENT INSPECTOR
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedAlert.id} - {selectedAlert.service}</h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-white text-sm font-mono px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            {selectedAlert.dlqReason && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-600/60 text-xs text-rose-300 font-mono">
                <span className="font-bold block mb-0.5">DLQ Isolation Reason:</span>
                <span>{selectedAlert.dlqReason}</span>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Raw Telemetry Payload:</span>
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48">
                {JSON.stringify(selectedAlert.payload, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              {selectedAlert.status === 'dlq' && (
                <button
                  onClick={() => handleReplayPayload(selectedAlert.id)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-blue-500/20"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Trigger 1-Click Replay Pipeline</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
