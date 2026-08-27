# OpsWArd: Distributed Mission-Critical Incident Response & Spatial Coordination Platform

<p align="center">
  <img src="public/characters/Eric.png" width="96" alt="Eric - Incident Commander" />
  <img src="public/characters/NuYing.png" width="96" alt="NuYing - SRE Operations Lead" />
  <img src="public/characters/James.png" width="96" alt="James - Database Architect" />
  <img src="public/characters/Miria.png" width="96" alt="Miria - Cryptographic Security" />
  <img src="public/characters/George.png" width="96" alt="George - Systems Architect" />
  <img src="public/characters/Yanto.png" width="96" alt="Yanto - Chaos Lead" />
</p>

<p align="center">
  <strong>Enterprise-Grade 2D Pixel Tactical Control Room · Spatial WebRTC Mesh · Distributed Raft Consensus · Temporal Saga Playbooks · Telemetry DLQ Replay</strong>
</p>

---

## 📖 Executive Summary

**OpsWArd** is a next-generation distributed incident management and spatial coordination platform designed as a virtual **Emergency Operations Center (EOC)**. It unifies real-time spatial proximity communications, distributed workflow orchestration, fault-tolerant event ingestion, and consensus-replicated decision auditing into an interactive **2D Pixel Tactical Command Room**.

---

## 🏛️ Core Architecture Pillars

```
+-----------------------------------------------------------------------------------+
|                              OPSWARD TACTICAL EOC                                 |
+-------------------------+-------------------------+-------------------------------+
|  1. Spatial War-Room    |  2. Raft Consensus Core |  3. Temporal Saga Playbooks   |
|  - 2D Pixel Canvas      |  - 3-Node Clustered     |  - Long-Running SOP Workflows |
|  - Euclidean Audio Mesh |  - Split-Brain Immunity |  - Automatic Rollback/Sagas   |
|  - Podium Broadcast     |  - Byzantine Audit Log  |  - Commander Approval Gates   |
+-------------------------+-------------------------+-------------------------------+
|  4. High-Throughput Telemetry Pipeline & Dead Letter Queue (DLQ) Stream & Replay  |
+-----------------------------------------------------------------------------------+
```

### 1. Spatial Virtual War-Room (`/components/tactical-room`)
* **Interactive 2D Canvas**: Top-down pixel control room with 5 designated division pods (*Commander's Podium, Database Pod, Infrastructure Hub, Security Vault, and Network War-Room*).
* **Dynamic Media Mesh**: Calculates Euclidean distances between avatars in real time. Voice volume attenuates with distance, and video feeds automatically suspend when avatars walk out of range to reduce bandwidth.
* **Emergency Podium Broadcast**: Designated podium tile allowing authorized Incident Commanders to override room audio/video and broadcast high-priority announcements to all team pods.
* **Fluid Navigation**: Full keyboard (**WASD / Arrow Keys**) and smooth **Mouse Click-to-Move** controls.

### 2. Consensus-Backed Audit & State Replication (`/components/raft`)
* **3-Node Raft Cluster**: High-availability consensus cluster replicating cluster state, severity level changes (`SEV-0` / `SEV-1`), and playbook approvals.
* **Split-Brain Immunity**: Network partition chaos simulation isolating minority partitions while the majority quorum maintains commit consistency.
* **Sub-12ms Leader Failover**: Instant candidate elections triggered when leader heartbeats timeout.

### 3. Incident Playbook Orchestration (`/components/playbook`)
* **Stateful Long-Running Workflows (Saga Pattern)**: Standard Operating Procedures (SOPs) executed as orchestrated tasks:
  * *Playbook 1: PostgreSQL Primary Cluster Failover & Traffic Drain*
  * *Playbook 2: Kubernetes CrashLoopBackOff Pod Auto-Healing*
* **Compensating Transactions (Rollback)**: If an automated task fails, the engine automatically executes reverse compensation tasks to restore the system to a safe state.
* **L4 Commander Approval Gate**: Interactive cryptographic key authorization modal for high-risk mutations.

### 4. High-Throughput Telemetry & Dead Letter Queue (`/components/telemetry`)
* **High-Frequency Ingestion**: Real-time event stream monitoring service anomalies across topic partitions.
* **Resilient Exponential Retry & DLQ**: Automatic exponential backoff retries. Malformed or unprocessable telemetry events route to an isolated Dead Letter Queue.
* **Interactive DLQ Replay**: Operators can inspect raw JSON payloads, stack traces, and trigger manual 1-click replay pipelines once upstream dependencies recover.

---

## 👥 26 Enhanced Responder Roster

OpsWArd integrates a full roster of **26 specialized responder avatars**, each equipped with dedicated clearance levels, tactical dossiers, and communication profiles:

| Avatar | Name | Codename | Role & Department |
| :---: | :--- | :--- | :--- |
| <img src="public/characters/Eric.png" width="48"/> | **Eric** | `NIGHT_COMMANDER` | Incident Commander (Command) |
| <img src="public/characters/James.png" width="48"/> | **James** | `POSTGRES_TITAN` | Principal Database Architect (Database) |
| <img src="public/characters/Miria.png" width="48"/> | **Miria** | `CRYPTO_VALKYRIE` | Lead Cryptographic Security Auditor (Security) |
| <img src="public/characters/NuYing.png" width="48"/> | **NuYing** | `OPS_CHRONOMANCER` | SRE Operations Lead (Operations) |
| <img src="public/characters/George.png" width="48"/> | **George** | `ARCHITECT_PRIME` | Lead Systems Architect (Infrastructure) |
| <img src="public/characters/Tony.png" width="48"/> | **Tony** | `TERRAFORM_CORE` | Infrastructure & Cloud Lead (Infrastructure) |
| <img src="public/characters/Santi.png" width="48"/> | **Santi** | `TELEMETRY_ORACLE` | DevOps & Telemetry Specialist (Telemetry) |
| <img src="public/characters/Rose.png" width="48"/> | **Rose** | `SRE_VALKYRIE` | Senior Reliability Engineer (Operations) |
| <img src="public/characters/Rinda.png" width="48"/> | **Rinda** | `NET_SPECTRUM` | Network Operations Lead (Network) |
| <img src="public/characters/Yanto.png" width="48"/> | **Yanto** | `CHAOS_ENGINEER` | Chaos & Disaster Recovery Lead (Chaos) |
| <img src="public/characters/Theresa.png" width="48"/> | **Theresa** | `PROTOCOL_GUARDIAN`| Security Protocol Officer (Security) |
| <img src="public/characters/Jesfer%20Normal%20Form.png" width="48"/> | **Jesfer** | `SHADOW_ANALYST` | Threat Intelligence Analyst (Security) |
| <img src="public/characters/Jesfer%20Clown%20Form.png" width="48"/> | **Jesfer (Overdrive)** | `ROGUE_SIMULATOR` | Adversary Simulation Specialist (Chaos) |
| <img src="public/characters/Alex.png" width="48"/> | **Alex** | `EDGE_ROUTER` | Edge Infrastructure Engineer (Network) |
| <img src="public/characters/Andri.png" width="48"/> | **Andri** | `STREAM_PIPELINE` | Kafka Event Broker Engineer (Telemetry) |
| <img src="public/characters/Budi.png" width="48"/> | **Budi** | `STORAGE_SENTINEL` | Distributed Storage Specialist (Infrastructure) |
| <img src="public/characters/Christ.png" width="48"/> | **Christ** | `KUBE_OVERSEER` | Kubernetes Cluster Engineer (Operations) |
| <img src="public/characters/Dzuky.png" width="48"/> | **Dzuky** | `MESH_NAVIGATOR` | Service Mesh Specialist (Network) |
| <img src="public/characters/Enjidiren.png" width="48"/> | **Enjidiren** | `REDIS_ACCELERATOR` | In-Memory Cache Specialist (Database) |
| <img src="public/characters/Fanisa.png" width="48"/> | **Fanisa** | `METRIC_SENTINEL` | Alert Policy Engineer (Telemetry) |
| <img src="public/characters/Helina.png" width="48"/> | **Helina** | `AUDIT_CHRONICLER` | Compliance & Audit Specialist (Security) |
| <img src="public/characters/Lemma.png" width="48"/> | **Lemma** | `QUANT_ANALYST` | Performance Optimization Engineer (Operations) |
| <img src="public/characters/Melinda.png" width="48"/> | **Melinda** | `INGRESS_VALKYRIE` | API Gateway Engineer (Network) |
| <img src="public/characters/Olimar.png" width="48"/> | **Olimar** | `SECRETS_VAULT` | Secrets & Identity Specialist (Security) |
| <img src="public/characters/Wilson%20Model.png" width="48"/> | **Wilson Model** | `CYBER_AVATAR` | AI Incident Copilot & Virtual Agent (Tactical) |
| <img src="public/characters/Yuki.png" width="48"/> | **Yuki** | `FIRMWARE_CORE` | Hardware & BMC Operations Specialist (Infrastructure) |

---

## 🛠️ Technology Stack

* **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript)
* **Styling & Theme**: [Tailwind CSS](https://tailwindcss.com/) with custom Cyber Tactical tokens & glassmorphism
* **Icons & Visuals**: [Lucide React](https://lucide.dev/) & [Canvas Confetti](https://github.com/catdad/canvas-confetti)
* **Canvas Rendering**: High-performance HTML5 Pixel Canvas with crisp pixel art scaling
* **Typography**: JetBrains Mono & Outfit (Google Fonts)
* **Backend**: Elixir 1.18, Phoenix 1.8, Ecto/PostgreSQL, Broadway/Kafka, Oban, `ra`, and gRPC
* **Realtime Media**: Phoenix Channels/Presence plus LiveKit SFU
* **Infrastructure**: Docker Compose for local HA and Helm/Kubernetes for three-node deployment

Backend and infrastructure documentation is available in [`backend/README.md`](backend/README.md). The REST contract is defined in [`backend/openapi.yaml`](backend/openapi.yaml), and the complete local stack starts with `docker compose up --build`.

---

## 🚀 Getting Started

### Prerequisites
* Node.js `>= 18.18.0` (Tested on `v22.16.0`)
* npm `>= 9.0.0`

### Installation

1. **Clone Repository**:
   ```bash
   git clone https://github.com/MrWilsonA/OpsWArd.git
   cd OpsWArd
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

---

## 📜 License & Acknowledgements

Created for the **Festival Inovasi dan Kewirausahaan Siswa Indonesia (FIKSI)** — *Chronicles of Cerebrum / OpsWArd Team*.
Distributed under the ISC License.
