# OpsWArd Specification & Architecture Prompt

## Project Title
**OpsWArd: Distributed Mission-Critical Incident Response & Spatial Coordination Platform**

---

## Executive Summary & Objective
Build an enterprise-grade, highly resilient incident management platform called **OpsWArd**. The system acts as a virtual "Emergency Operations Center (EOC)" that unifies real-time spatial communications, distributed workflow orchestration, fault-tolerant event processing, and consensus-replicated decision auditing into an interactive **2D Pixel Tactical Control Room**.

---

## Architecture Pillars & Functional Requirements

### 1. Spatial Virtual War-Room (WebRTC & SFU Architecture)
* **Spatial Proximity Audio/Video:** Multiple responder teams (e.g., Database Team, Infrastructure Team, Leadership) navigate a 2D pixel command room using keyboard/mouse controls.
* **Dynamic Media Mesh:** The Selective Forwarding Unit (SFU) calculates Euclidean distances between avatars on the grid. Voice volume attenuates with distance, and video feeds automatically suspend when avatars walk out of range, reducing client bandwidth.
* **Emergency Broadcast Zone:** Designated "Podium" tiles that allow authorized incident commanders to broadcast high-priority audio/video to the entire room simultaneously.

### 2. Incident Playbook Orchestration (Workflow / Saga Pattern)
* **Stateful Long-Running Workflows:** Standard Operating Procedures (SOPs) executed as orchestrated tasks (e.g., Step 1: Drain Traffic -> Step  Restart Cluster -> Step 3: Run Health Check).
* **Compensating Transactions (Rollback):** If an automated step fails, the engine executes reverse compensation tasks automatically to restore the system to a safe state.
* **Visual Task Pipelines:** Tasks in progress, completed steps, and failure rollbacks render visually on the 2D dashboard as animated pipeline nodes.

### 3. High-Throughput Telemetry Pipeline (Event-Driven Broker & DLQ)
* **High-Throughput Alert Ingestion:** Ingests high-frequency incident alerts and error telemetry across topic partitions.
* **Resilient Retry & DLQ:** Failed alert handlers trigger exponential backoff retries. Malformed or unprocessable telemetry events route to an isolated Dead Letter Queue (DLQ).
* **Interactive DLQ Replay:** The operator can view raw payloads in the DLQ from the 2D interface and trigger manual replay once external dependencies recover.

### 4. Consensus-Backed Audit & State Replication (Raft Engine)
* **Single Source of Truth:** Cluster state, severity level changes (P1/P0 declarations), and major action approvals replicate across a 3-node Raft consensus cluster.
* **Split-Brain Immunity:** Even if network partitions sever connectivity between regions, only the majority cluster partition commits state mutations and playbook triggers.

---

## Tech Stack Requirements

* **Spatial Media Server:** LiveKit or mediasoup (WebRTC SFU).
* **Workflow Engine:** Temporal.io or BullMQ (Redis-backed state machine) with TypeScript/NestJS.
* **Event Broker & Ingestion:** Apache Kafka or Elixir Broadway (with Dead Letter Queue mechanisms).
* **Consensus Core:** Raft Engine implemented in **Elixir (OTP / GenServer)** or **Rust (Tonic gRPC)**.
* **Frontend Application:** **Next.js (App Router, TypeScript)** + **Tailwind CSS**.
* **2D Canvas Engine:** **Phaser.js** (rendering pixel command rooms, avatar movement, and visual pipelines).
* **Transport Protocols:** WebSockets (UI event sync) + gRPC (inter-node Raft communication) + WebRTC (audio/video tracks).

---

## User Flow & Key Scenario

1. **Incident Trigger:** An automated alert triggers a Severity-0 event, streaming through the event pipeline into the Raft-backed ledger.
2. **War-Room Assembly:** Responders log in; their 2D avatars spawn in the OpsWArd tactical room. Database engineers gather around the "Database Pod" to converse via localized WebRTC audio without interrupting the Network team.
3. **Playbook Execution:** The Incident Commander initiates the "Failover Database" workflow on the dashboard. The Temporal engine triggers sequential steps while the 2D canvas displays real-time progress.
4. **Chaos / Fault Simulation:** A simulated network partition isolates one node. The remaining nodes elect a new Raft leader, maintain consensus on all ongoing playbook states, and route failed telemetry to the DLQ with zero data loss.