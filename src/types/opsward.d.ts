export type DepartmentType = 'Command' | 'Database' | 'Security' | 'Infrastructure' | 'Operations' | 'Network' | 'Telemetry' | 'Chaos' | 'Tactical';

export interface TacticalPosition {
  x: number;
  y: number;
}

export interface TacticalZone {
  id: string;
  name: string;
  department: DepartmentType;
  color: string;
  bounds: { x1: number; y1: number; x2: number; y2: number };
  description: string;
  icon: string;
  isPodium?: boolean;
}

export interface RaftNodeState {
  id: string;
  name: string;
  role: 'Leader' | 'Follower' | 'Candidate';
  term: number;
  voteCount: number;
  lastLogIndex: number;
  commitIndex: number;
  status: 'healthy' | 'partitioned' | 'crashed';
  ipAddress: string;
  latencyMs: number;
  logs: { term: number; command: string; committed: boolean }[];
}

export interface PlaybookStep {
  id: string;
  name: string;
  service: string;
  status: 'idle' | 'running' | 'success' | 'failed' | 'rolling_back' | 'rolled_back';
  durationMs: number;
  description: string;
  actionType: 'automated' | 'approval_required' | 'health_check';
  compensationAction: string;
  assignedEngineer: string;
}

export interface PlaybookWorkflow {
  id: string;
  title: string;
  severity: 'SEV-0' | 'SEV-1' | 'SEV-2';
  category: string;
  description: string;
  steps: PlaybookStep[];
  status: 'idle' | 'running' | 'completed' | 'aborted' | 'compensated';
}

export interface TelemetryAlert {
  id: string;
  timestamp: string;
  severity: 'SEV-0' | 'SEV-1' | 'SEV-2';
  service: string;
  message: string;
  status: 'active' | 'retrying' | 'dlq' | 'replayed' | 'resolved';
  retryCount: number;
  maxRetries: number;
  payload: Record<string, any>;
  dlqReason?: string;
}

export interface SpatialAudioState {
  isBroadcastingPodium: boolean;
  activeRadioChannel: string;
  proximityThreshold: number; // in grid pixels
  localAvatarId: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
}
