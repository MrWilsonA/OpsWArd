'use client';

import React, { ReactNode, useState } from 'react';
import {
  Activity,
  BookOpenText,
  Box,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Compass,
  Database,
  Gamepad2,
  GitBranch,
  HelpCircle,
  House,
  Layers3,
  Map,
  MessageSquareText,
  Network,
  Radio,
  RefreshCcw,
  RotateCcw,
  Route,
  Server,
  ShieldCheck,
  Siren,
  TerminalSquare,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';

type GuideSectionId =
  | 'start'
  | 'world'
  | 'lifecycle'
  | 'comms'
  | 'consensus'
  | 'sagas'
  | 'telemetry'
  | 'architecture'
  | 'operations';

type GuideItem = {
  id: GuideSectionId;
  label: string;
  eyebrow: string;
  icon: React.ComponentType<{ className?: string }>;
};

const GUIDE_ITEMS: GuideItem[] = [
  { id: 'start', label: 'Start Here', eyebrow: '00 / ORIENTATION', icon: BookOpenText },
  { id: 'world', label: 'World & Controls', eyebrow: '01 / THE CAMPUS', icon: Map },
  { id: 'lifecycle', label: 'Incident Lifecycle', eyebrow: '02 / BIG PICTURE', icon: Siren },
  { id: 'comms', label: 'War Room & Comms', eyebrow: '03 / COORDINATION', icon: Radio },
  { id: 'consensus', label: 'Raft Consensus', eyebrow: '04 / TRUTH', icon: Layers3 },
  { id: 'sagas', label: 'Saga Playbooks', eyebrow: '05 / EXECUTION', icon: Workflow },
  { id: 'telemetry', label: 'Telemetry & DLQ', eyebrow: '06 / SIGNALS', icon: Activity },
  { id: 'architecture', label: 'System Architecture', eyebrow: '07 / UNDER THE MAP', icon: Network },
  { id: 'operations', label: 'Operator Guide', eyebrow: '08 / FIELD MANUAL', icon: TerminalSquare },
];

const Flow = ({ steps }: { steps: Array<{ title: string; caption: string; tone?: string }> }) => (
  <div className="pixel-flow" aria-label={steps.map((step) => step.title).join(' then ')}>
    {steps.map((step, index) => (
      <React.Fragment key={step.title}>
        <div className={`pixel-flow__node ${step.tone ? `is-${step.tone}` : ''}`}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{step.title}</strong>
          <small>{step.caption}</small>
        </div>
        {index < steps.length - 1 && <div className="pixel-flow__arrow" aria-hidden="true">▶</div>}
      </React.Fragment>
    ))}
  </div>
);

const Note = ({ title, children, tone = 'green' }: { title: string; children: ReactNode; tone?: 'green' | 'amber' | 'red' | 'blue' }) => (
  <div className={`guide-note guide-note--${tone}`}>
    <strong>{title}</strong>
    <div>{children}</div>
  </div>
);

const ConceptCard = ({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: ReactNode }) => (
  <div className="guide-concept-card">
    <div className="guide-concept-card__icon"><Icon className="h-4 w-4" /></div>
    <div>
      <h4>{title}</h4>
      <div>{children}</div>
    </div>
  </div>
);

const Key = ({ children }: { children: ReactNode }) => <kbd className="guide-key">{children}</kbd>;

const StartSection = () => (
  <>
    <header className="guide-article__header">
      <span className="guide-kicker">00 / ORIENTATION</span>
      <h2>Welcome to OpsWArd</h2>
      <p>Learn the platform as a place, a control surface, and a distributed system.</p>
    </header>

    <section className="guide-block guide-block--hero">
      <div>
        <span className="guide-label">THE SIMPLE DEFINITION</span>
        <h3>A playable Emergency Operations Center</h3>
        <p>
          OpsWArd is an incident-response platform presented as a pixel-art campus. Walking through the world is not decoration:
          rooms represent operational domains, nearby responders represent communication scope, and the dashboard tabs expose the
          distributed systems that keep an incident coordinated and auditable.
        </p>
      </div>
      <div className="pixel-mini-map" aria-label="Pixel map showing the four OpsWArd system pillars">
        <div className="pixel-mini-map__room is-command">WAR<br />ROOM</div>
        <div className="pixel-mini-map__room is-raft">RAFT<br />LODGE</div>
        <div className="pixel-mini-map__room is-saga">SAGA<br />SHOP</div>
        <div className="pixel-mini-map__room is-dlq">DLQ<br />COTTAGE</div>
        <div className="pixel-mini-map__path" />
        <div className="pixel-mini-map__avatar">◆</div>
      </div>
    </section>

    <div className="guide-card-grid">
      <ConceptCard icon={Compass} title="A navigable interface">
        <p>Move an avatar, enter facilities, approach specialists, and use spatial location as an intuitive index into system responsibilities.</p>
      </ConceptCard>
      <ConceptCard icon={Workflow} title="A response simulator">
        <p>Practice declarations, quorum decisions, runbook execution, failure compensation, and dead-letter replay without hiding the process.</p>
      </ConceptCard>
      <ConceptCard icon={ShieldCheck} title="An auditable control plane">
        <p>Important state changes are designed to pass through consensus, durable storage, and an audit trail instead of living only in one browser.</p>
      </ConceptCard>
    </div>

    <section className="guide-block">
      <span className="guide-label">YOUR FIRST THREE MINUTES</span>
      <h3>Quick start route</h3>
      <Flow steps={[
        { title: 'Explore', caption: 'Open War Room and walk with WASD', tone: 'green' },
        { title: 'Coordinate', caption: 'Approach an NPC and inspect comms', tone: 'blue' },
        { title: 'Decide', caption: 'Open Raft and commit a mutation', tone: 'amber' },
        { title: 'Execute', caption: 'Run a Saga and observe each step', tone: 'green' },
        { title: 'Recover', caption: 'Inspect and replay a DLQ event', tone: 'red' },
      ]} />
    </section>

    <Note title="GAME LAYER VS PLATFORM LAYER" tone="amber">
      <p>
        The current interface includes interactive demonstrations and live backend foundations. A visual simulation explains the operational
        model; the Elixir services, Kafka, PostgreSQL, Raft, Phoenix channels, and LiveKit integration form the production-oriented platform layer.
      </p>
    </Note>
  </>
);

const WorldSection = () => (
  <>
    <header className="guide-article__header">
      <span className="guide-kicker">01 / THE CAMPUS</span>
      <h2>World, characters, and controls</h2>
      <p>The campus is a spatial table of contents for OpsWArd.</p>
    </header>

    <section className="guide-block">
      <span className="guide-label">PLAYER CONTROLS</span>
      <h3>How to move and interact</h3>
      <div className="guide-control-grid">
        <div><span className="guide-key-group"><Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key></span><strong>Walk</strong><small>Move in four directions. Arrow keys work too.</small></div>
        <div><span className="guide-key-group"><Key>SHIFT</Key></span><strong>Run</strong><small>Hold while moving for faster traversal.</small></div>
        <div><span className="guide-key-group"><Key>CLICK</Key></span><strong>Pathfind</strong><small>Click a valid floor tile and the avatar routes around obstacles.</small></div>
        <div><span className="guide-key-group"><Key>E</Key></span><strong>Interact</strong><small>Enter a facility, exit an interior, or inspect a nearby station.</small></div>
      </div>
      <Note title="DOORS ARE MANUAL" tone="green">
        Stand near a doorway until the interaction prompt appears, then press <Key>E</Key>. Walking near a building never changes maps automatically.
      </Note>
    </section>

    <section className="guide-block">
      <span className="guide-label">MAP READING</span>
      <h3>What each place represents</h3>
      <div className="guide-facility-list">
        <div><span>01</span><House /><strong>Operations Hall</strong><p>Central coordination, responder pods, command table, archive, security, and briefing spaces.</p></div>
        <div><span>02</span><Radio /><strong>SFU Network Relay</strong><p>Spatial media routing, proximity attenuation, track subscription, and realtime connectivity.</p></div>
        <div><span>03</span><Workflow /><strong>Saga Workshop</strong><p>Runbook orchestration, approval gates, forward actions, and compensating rollback actions.</p></div>
        <div><span>04</span><Layers3 /><strong>Raft Consensus Lodge</strong><p>Leader election, replicated commands, majority quorum, and authoritative incident state.</p></div>
        <div><span>05</span><Activity /><strong>Telemetry & DLQ Cottage</strong><p>Alert ingestion, retry policy, payload inspection, dead-letter isolation, and safe replay.</p></div>
        <div><span>06</span><Database /><strong>Oakheart Greenhouse</strong><p>Environmental telemetry metaphor: signals grow, change, and need continuous observation.</p></div>
      </div>
    </section>

    <section className="guide-block">
      <span className="guide-label">RESPONDER MODEL</span>
      <h3>Playable character and NPC consistency</h3>
      <p>
        The selected responder is your playable avatar. That same responder is removed from the local NPC roster, so one identity cannot appear
        twice on the same map. Switching characters transfers player control and returns the previous avatar to the distributed responder pool.
      </p>
      <div className="pixel-equation">
        <span>26 RESPONDERS</span><b>−</b><span>1 PLAYABLE</span><b>=</b><span>25 NPC IDENTITIES</span>
      </div>
      <p>
        NPCs are distributed across the Operations Hall, outdoor campus, greenhouse, relay lab, workshop, lodge, and cottage. Their placement
        communicates ownership: database specialists near data systems, network responders near relay infrastructure, and audit specialists near consensus records.
      </p>
    </section>
  </>
);

const LifecycleSection = () => (
  <>
    <header className="guide-article__header">
      <span className="guide-kicker">02 / BIG PICTURE</span>
      <h2>The incident lifecycle</h2>
      <p>One event travels through several systems, but it remains one traceable story.</p>
    </header>

    <section className="guide-block">
      <span className="guide-label">END-TO-END FLOW</span>
      <h3>From signal to verified recovery</h3>
      <Flow steps={[
        { title: 'Detect', caption: 'Kafka receives alert telemetry', tone: 'red' },
        { title: 'Declare', caption: 'Incident receives ID and severity', tone: 'amber' },
        { title: 'Commit', caption: 'Raft records authoritative state', tone: 'blue' },
        { title: 'Assemble', caption: 'Responders coordinate spatially', tone: 'green' },
        { title: 'Execute', caption: 'Saga runs the approved playbook', tone: 'amber' },
        { title: 'Observe', caption: 'Metrics and events verify health', tone: 'blue' },
        { title: 'Resolve', caption: 'Consensus closes the incident', tone: 'green' },
      ]} />
    </section>

    <section className="guide-block">
      <span className="guide-label">WHO DOES WHAT</span>
      <div className="guide-timeline">
        <div><span>01</span><strong>Telemetry pipeline</strong><p>Normalizes the incoming event, associates correlation metadata, and isolates data that cannot be processed safely.</p></div>
        <div><span>02</span><strong>Incident service</strong><p>Creates the durable incident record in PostgreSQL and records the actor, severity, timestamps, and metadata.</p></div>
        <div><span>03</span><strong>Consensus layer</strong><p>Commits state-changing commands through the majority cluster so all healthy nodes agree on the same decision.</p></div>
        <div><span>04</span><strong>War Room</strong><p>Makes ownership visible. Responders cluster by domain, use local audio, and receive commander broadcasts when required.</p></div>
        <div><span>05</span><strong>Playbook engine</strong><p>Executes ordered recovery actions. A failed action starts compensations in reverse order for previously completed steps.</p></div>
        <div><span>06</span><strong>Audit and observability</strong><p>Preserve evidence: command results, logs, metrics, trace correlation, replay attempts, and the final resolution.</p></div>
      </div>
    </section>

    <Note title="THE CORRELATION ID IS THE THREAD" tone="blue">
      Use one incident or correlation identifier across HTTP requests, Kafka messages, playbook runs, audit entries, and logs. It is how an operator reconstructs the entire event without guessing.
    </Note>
  </>
);

const CommsSection = () => (
  <>
    <header className="guide-article__header">
      <span className="guide-kicker">03 / COORDINATION</span>
      <h2>Spatial War Room & communications</h2>
      <p>Position is used as a lightweight communication control.</p>
    </header>

    <section className="guide-block">
      <span className="guide-label">SPATIAL AUDIO MODEL</span>
      <h3>Why avatars have distance</h3>
      <div className="pixel-proximity" aria-label="Spatial audio proximity diagram">
        <div className="pixel-proximity__ring is-far"><span>OUT OF RANGE · TRACK SUSPENDED</span></div>
        <div className="pixel-proximity__ring is-near"><span>NEARBY · ATTENUATED AUDIO</span></div>
        <div className="pixel-proximity__speaker">YOU</div>
        <div className="pixel-proximity__npc npc-a">DB</div>
        <div className="pixel-proximity__npc npc-b">NET</div>
      </div>
      <p>
        Each client publishes position through the realtime room channel. Euclidean distance determines whether another responder is nearby and
        how loud their audio should be. An SFU such as LiveKit forwards tracks efficiently; it does not mix every participant into one permanent call.
      </p>
    </section>

    <div className="guide-card-grid">
      <ConceptCard icon={Users} title="Proximity groups"><p>Walk toward a team pod to join its conversation context. Move away to reduce volume and unnecessary media traffic.</p></ConceptCard>
      <ConceptCard icon={Radio} title="Command broadcast"><p>The central command-table zone represents a priority broadcast that reaches the room beyond ordinary distance attenuation.</p></ConceptCard>
      <ConceptCard icon={MessageSquareText} title="Presence state"><p>Phoenix Presence tracks who is connected; channel position events keep the shared map synchronized.</p></ConceptCard>
    </div>

    <section className="guide-block">
      <span className="guide-label">HOW TO USE THE TAB</span>
      <ol className="guide-steps">
        <li><span>1</span><div><strong>Select your responder.</strong><p>Use a profile card in the roster. The active badge moves to the selected identity.</p></div></li>
        <li><span>2</span><div><strong>Move into the relevant operational area.</strong><p>Use the HUD room name and nearby-crew counter as location feedback.</p></div></li>
        <li><span>3</span><div><strong>Choose a radio channel.</strong><p>Channels organize operational topics; proximity determines the local spatial mix.</p></div></li>
        <li><span>4</span><div><strong>Use the command table for escalation.</strong><p>Enter the central table radius when an all-hands announcement must override local grouping.</p></div></li>
      </ol>
    </section>

    <Note title="MEDIA SAFETY" tone="amber">Mute controls and track subscription are separate concepts. Muting stops local publication; distance-based suspension reduces received media and bandwidth.</Note>
  </>
);

const ConsensusSection = () => (
  <>
    <header className="guide-article__header">
      <span className="guide-kicker">04 / TRUTH</span>
      <h2>Raft consensus</h2>
      <p>Three nodes agree before critical operational state becomes authoritative.</p>
    </header>

    <section className="guide-block">
      <span className="guide-label">CORE CONCEPT</span>
      <h3>Consensus is agreement, not data backup</h3>
      <p>
        Raft orders commands so healthy members apply the same mutations in the same sequence. A leader accepts a command, appends it to its log,
        replicates it to followers, and marks it committed only after a majority acknowledges it. With three nodes, the quorum is two.
      </p>
      <div className="raft-pixel-diagram" aria-label="Three node Raft quorum diagram">
        <div className="raft-node is-leader"><span>NODE A</span><strong>LEADER</strong><small>TERM 14 · LOG 109</small></div>
        <div className="raft-link"><i /><b>APPEND</b><i /></div>
        <div className="raft-node"><span>NODE B</span><strong>FOLLOWER</strong><small>ACK · LOG 109</small></div>
        <div className="raft-node"><span>NODE C</span><strong>FOLLOWER</strong><small>ACK · LOG 109</small></div>
        <div className="raft-quorum">2 / 3 ACKNOWLEDGED → COMMITTED</div>
      </div>
    </section>

    <div className="guide-glossary">
      <div><strong>Leader</strong><p>The node currently coordinating log replication and client commands.</p></div>
      <div><strong>Follower</strong><p>A node that accepts leader replication and starts an election if heartbeats stop.</p></div>
      <div><strong>Term</strong><p>A logical election era. Higher terms supersede stale leaders and old messages.</p></div>
      <div><strong>Commit index</strong><p>The highest log position known to be safely replicated to a majority.</p></div>
      <div><strong>Quorum</strong><p>The minimum majority required to make progress: two nodes in this three-node cluster.</p></div>
      <div><strong>Split brain</strong><p>Conflicting leaders. Majority voting prevents an isolated minority from committing new state.</p></div>
    </div>

    <section className="guide-block">
      <span className="guide-label">TAB WALKTHROUGH</span>
      <ol className="guide-steps">
        <li><span>1</span><div><strong>Inspect roles, term, and commit index.</strong><p>All healthy nodes should converge on the leader&apos;s committed log.</p></div></li>
        <li><span>2</span><div><strong>Submit a guided mutation.</strong><p>Choose a helper command such as severity change or playbook dispatch and observe replication.</p></div></li>
        <li><span>3</span><div><strong>Simulate a partition or leader crash.</strong><p>The majority elects a leader and continues. A one-node minority cannot commit.</p></div></li>
        <li><span>4</span><div><strong>Read the log, not only the badges.</strong><p>The committed sequence is the durable explanation of what the cluster accepted.</p></div></li>
      </ol>
    </section>

    <Note title="EXPECTED FAILURE BEHAVIOR" tone="red">If only one of three nodes is reachable, rejecting a mutation is correct. Availability without a majority would risk conflicting incident decisions.</Note>
  </>
);

const SagasSection = () => (
  <>
    <header className="guide-article__header">
      <span className="guide-kicker">05 / EXECUTION</span>
      <h2>Saga playbook orchestration</h2>
      <p>Long-running recovery work is split into explicit, recoverable steps.</p>
    </header>

    <section className="guide-block">
      <span className="guide-label">FORWARD PATH</span>
      <Flow steps={[
        { title: 'Drain traffic', caption: 'Stop new requests', tone: 'amber' },
        { title: 'Promote replica', caption: 'Move primary ownership', tone: 'blue' },
        { title: 'Restart cluster', caption: 'Restore service processes', tone: 'green' },
        { title: 'Health check', caption: 'Verify recovery criteria', tone: 'green' },
      ]} />
      <span className="guide-label guide-label--spaced">COMPENSATION PATH AFTER FAILURE</span>
      <Flow steps={[
        { title: 'Failure detected', caption: 'A forward action fails', tone: 'red' },
        { title: 'Undo promotion', caption: 'Restore previous ownership', tone: 'amber' },
        { title: 'Restore traffic', caption: 'Reverse the initial drain', tone: 'blue' },
        { title: 'Safe state', caption: 'Record compensated result', tone: 'green' },
      ]} />
    </section>

    <section className="guide-block">
      <span className="guide-label">WHY A SAGA</span>
      <p>
        A database failover or cluster repair cannot be one atomic database transaction: it touches networks, infrastructure, services, and time.
        A Saga records progress step by step and defines a compensating action for every completed action that must be reversible.
      </p>
      <div className="guide-rule-grid">
        <div><strong>Forward action</strong><p>The operation intended to move the system toward recovery.</p></div>
        <div><strong>Compensation</strong><p>A semantic undo that restores safety; it is not necessarily a byte-for-byte rollback.</p></div>
        <div><strong>Approval gate</strong><p>A human authorization boundary before a high-risk mutation proceeds.</p></div>
        <div><strong>Idempotency</strong><p>Repeating a step must not multiply side effects when jobs retry.</p></div>
      </div>
    </section>

    <section className="guide-block">
      <span className="guide-label">HOW TO USE THE TAB</span>
      <ol className="guide-steps">
        <li><span>1</span><div><strong>Select a playbook.</strong><p>Read its purpose and every step before starting it.</p></div></li>
        <li><span>2</span><div><strong>Optionally arm the failure simulation.</strong><p>This makes step two fail so the compensation sequence is visible.</p></div></li>
        <li><span>3</span><div><strong>Trigger the workflow.</strong><p>Status moves through pending, running, approval, completed, failed, and compensated states.</p></div></li>
        <li><span>4</span><div><strong>Approve gated mutations.</strong><p>The demonstration models an L4 Incident Commander signature boundary.</p></div></li>
        <li><span>5</span><div><strong>Confirm the terminal state.</strong><p>Completed means the objective succeeded; compensated means recovery actions restored a safe baseline.</p></div></li>
      </ol>
    </section>

    <Note title="DO NOT CONFUSE COMPENSATED WITH SUCCESS" tone="amber">A compensated workflow is safely contained, but the original recovery objective may still be unresolved and require another plan.</Note>
  </>
);

const TelemetrySection = () => (
  <>
    <header className="guide-article__header">
      <span className="guide-kicker">06 / SIGNALS</span>
      <h2>Telemetry, retries, and the DLQ</h2>
      <p>Bad data is isolated without silently blocking the healthy event stream.</p>
    </header>

    <section className="guide-block">
      <span className="guide-label">EVENT PIPELINE</span>
      <Flow steps={[
        { title: 'Producer', caption: 'Service emits telemetry', tone: 'blue' },
        { title: 'Kafka topic', caption: 'Partitioned durable stream', tone: 'amber' },
        { title: 'Broadway', caption: 'Concurrent Elixir processing', tone: 'green' },
        { title: 'Retry', caption: 'Transient failures back off', tone: 'amber' },
        { title: 'DLQ', caption: 'Poison event is isolated', tone: 'red' },
        { title: 'Replay', caption: 'Operator retries after repair', tone: 'green' },
      ]} />
    </section>

    <div className="guide-card-grid">
      <ConceptCard icon={GitBranch} title="Partitions"><p>Kafka divides a topic for throughput. Ordering is guaranteed inside one partition, not globally across every partition.</p></ConceptCard>
      <ConceptCard icon={RefreshCcw} title="Exponential retry"><p>Transient failures wait progressively longer, preventing a broken dependency from being hammered continuously.</p></ConceptCard>
      <ConceptCard icon={Box} title="Dead Letter Queue"><p>A DLQ preserves events that exceeded retry policy or failed validation, including the reason and replay metadata.</p></ConceptCard>
    </div>

    <section className="guide-block">
      <span className="guide-label">SAFE REPLAY PROCEDURE</span>
      <ol className="guide-steps">
        <li><span>1</span><div><strong>Filter and select the failed event.</strong><p>Use severity and status filters to reduce noise.</p></div></li>
        <li><span>2</span><div><strong>Inspect the raw payload and error.</strong><p>Confirm schema, correlation ID, source, attempt count, and isolation reason.</p></div></li>
        <li><span>3</span><div><strong>Repair the cause first.</strong><p>Restore the dependency, deploy a compatible parser, or correct routing configuration.</p></div></li>
        <li><span>4</span><div><strong>Check idempotency.</strong><p>Make sure replay cannot duplicate a ticket, page, payment, or infrastructure mutation.</p></div></li>
        <li><span>5</span><div><strong>Replay and observe.</strong><p>Track the new attempt through Kafka, processing, storage, and audit logs.</p></div></li>
      </ol>
    </section>

    <Note title="A DLQ IS NOT A TRASH BIN" tone="red">Every isolated event needs ownership, retention policy, diagnosis, and a deliberate replay or discard decision.</Note>
  </>
);

const ArchitectureSection = () => (
  <>
    <header className="guide-article__header">
      <span className="guide-kicker">07 / UNDER THE MAP</span>
      <h2>System architecture</h2>
      <p>The pixel campus sits on a distributed application stack.</p>
    </header>

    <section className="guide-block">
      <span className="guide-label">LAYER MAP</span>
      <div className="architecture-stack">
        <div className="architecture-layer is-client"><span>PLAYER LAYER</span><strong>Next.js · React · Canvas · Pixel UI</strong><small>Movement, visualization, controls, roster, dashboards</small></div>
        <div className="architecture-bus">HTTP / WEBSOCKET / WEBRTC</div>
        <div className="architecture-layer is-app"><span>APPLICATION LAYER</span><strong>Elixir · Phoenix · OTP · Oban · Broadway</strong><small>API, presence, orchestration, concurrent event processing</small></div>
        <div className="architecture-bus">KAFKA EVENTS / RAFT COMMANDS / SQL / METRICS</div>
        <div className="architecture-layer is-data"><span>PLATFORM LAYER</span><strong>Kafka · PostgreSQL · Raft · Redis · LiveKit</strong><small>Durability, consensus, media routing, queues, shared state</small></div>
        <div className="architecture-bus">SCRAPE / DASHBOARD / ALERT</div>
        <div className="architecture-layer is-observe"><span>OBSERVABILITY</span><strong>Prometheus · Grafana · Structured Logs</strong><small>Health, latency, throughput, errors, saturation, audit evidence</small></div>
      </div>
    </section>

    <div className="guide-glossary guide-glossary--architecture">
      <div><strong>Next.js frontend</strong><p>Renders the control surface and canvas, loads authored collider maps, and calls the platform APIs.</p></div>
      <div><strong>Phoenix API</strong><p>Exposes health, incidents, playbooks, telemetry, metrics, LiveKit token, and realtime room endpoints.</p></div>
      <div><strong>OTP supervision</strong><p>Restarts failed Elixir processes and isolates failures instead of treating the whole service as one fragile process.</p></div>
      <div><strong>Apache Kafka</strong><p>Carries telemetry and audit events through partitioned topics with consumer-group processing.</p></div>
      <div><strong>PostgreSQL</strong><p>Stores durable incidents, audit entries, playbook runs and steps, telemetry events, and DLQ records.</p></div>
      <div><strong>Raft cluster</strong><p>Replicates authoritative incident commands across three backend nodes.</p></div>
      <div><strong>LiveKit SFU</strong><p>Routes realtime media tracks without forcing every browser to upload independently to every other participant.</p></div>
      <div><strong>Redis</strong><p>Supports LiveKit coordination and other low-latency shared runtime needs.</p></div>
      <div><strong>Prometheus & Grafana</strong><p>Collect and visualize operational measurements for the platform itself.</p></div>
    </div>

    <section className="guide-block">
      <span className="guide-label">REQUEST EXAMPLE</span>
      <h3>Declaring an incident</h3>
      <Flow steps={[
        { title: 'POST /incidents', caption: 'Phoenix validates request', tone: 'blue' },
        { title: 'Ecto transaction', caption: 'Create durable record', tone: 'green' },
        { title: 'Raft command', caption: 'Replicate declaration', tone: 'amber' },
        { title: 'Audit entry', caption: 'Record actor and payload', tone: 'blue' },
        { title: '201 response', caption: 'Return committed incident', tone: 'green' },
      ]} />
      <Note title="TRANSACTION BOUNDARY" tone="amber">The incident service coordinates persistence, consensus, and audit intent. Operators should treat a successful API response as the contract—not an optimistic animation in the browser.</Note>
    </section>
  </>
);

const OperationsSection = () => (
  <>
    <header className="guide-article__header">
      <span className="guide-kicker">08 / FIELD MANUAL</span>
      <h2>Operator guide</h2>
      <p>A practical route for demonstrations, training, and incident exercises.</p>
    </header>

    <section className="guide-block guide-block--scenario">
      <span className="guide-label">SCENARIO / PAYMENT GATEWAY P0</span>
      <h3>Suggested complete walkthrough</h3>
      <ol className="guide-steps guide-steps--large">
        <li><span>1</span><div><strong>Establish the signal.</strong><p>Open Telemetry & DLQ, start the stream, identify the highest-severity payment event, and note its correlation ID.</p></div></li>
        <li><span>2</span><div><strong>Confirm authoritative state.</strong><p>Open Raft Consensus. Verify a leader and 2/3 quorum, then commit the severity declaration.</p></div></li>
        <li><span>3</span><div><strong>Assemble the responders.</strong><p>Return to War Room, select the appropriate role, move near the relevant team, and use the command table if everyone needs the update.</p></div></li>
        <li><span>4</span><div><strong>Choose the recovery plan.</strong><p>Open Saga Playbooks, review every forward and compensation step, then trigger the matching workflow.</p></div></li>
        <li><span>5</span><div><strong>Handle an approval.</strong><p>At the L4 gate, verify scope and expected impact before approving the state-changing action.</p></div></li>
        <li><span>6</span><div><strong>Observe recovery.</strong><p>Watch each step and validate service health through telemetry rather than assuming completion means recovery.</p></div></li>
        <li><span>7</span><div><strong>Process remaining DLQ items.</strong><p>Inspect payloads, confirm the root cause is fixed, replay safely, and verify consumer success.</p></div></li>
        <li><span>8</span><div><strong>Resolve and review.</strong><p>Commit incident resolution, preserve the audit trail, and capture follow-up actions for the post-incident review.</p></div></li>
      </ol>
    </section>

    <section className="guide-block">
      <span className="guide-label">STATUS READING</span>
      <div className="guide-status-table">
        <div className="is-header"><span>Signal</span><span>Meaning</span><span>Operator response</span></div>
        <div><span><i className="status-pixel is-green" /> Healthy / committed</span><span>The requested state is confirmed.</span><span>Continue while monitoring downstream evidence.</span></div>
        <div><span><i className="status-pixel is-amber" /> Pending / retrying</span><span>Work is active or waiting.</span><span>Check timeout, dependency health, and attempt count.</span></div>
        <div><span><i className="status-pixel is-red" /> Failed / isolated</span><span>The normal path stopped.</span><span>Contain impact, diagnose, then compensate or replay.</span></div>
        <div><span><i className="status-pixel is-blue" /> Leader / active</span><span>The node or route currently owns coordination.</span><span>Verify peers agree before issuing critical mutations.</span></div>
      </div>
    </section>

    <section className="guide-block">
      <span className="guide-label">TROUBLESHOOTING</span>
      <div className="guide-troubleshooting">
        <details><summary><HelpCircle /> The player cannot move</summary><p>Open the collider editor and confirm the active map has at least one green floor region. Verify the collider API returns non-empty floors and obstacles. Use the map selector to return to a known spawn if needed.</p></details>
        <details><summary><HelpCircle /> A doorway does not open</summary><p>Stand close enough for the <Key>E</Key> interaction prompt, then press <Key>E</Key>. The transition is intentionally manual. If no prompt appears, inspect the doorway coordinates and adjacent solid collider.</p></details>
        <details><summary><HelpCircle /> A Raft mutation is rejected</summary><p>Confirm there is a leader and at least two reachable nodes. Rejection during minority isolation is safe behavior, not a UI failure.</p></details>
        <details><summary><HelpCircle /> A playbook is compensated</summary><p>Read the failed step and every compensation result. Fix the cause before starting a new run; compensated means safe containment, not completion.</p></details>
        <details><summary><HelpCircle /> A replay returns to the DLQ</summary><p>The underlying dependency or payload incompatibility still exists. Compare the newest error, confirm idempotency, and avoid blind repeated replay.</p></details>
      </div>
    </section>

    <Note title="OPERATOR PRINCIPLE" tone="green">Every click should answer three questions: What state am I changing? Which system confirms it? What evidence proves it worked?</Note>
  </>
);

const SECTION_CONTENT: Record<GuideSectionId, React.ComponentType> = {
  start: StartSection,
  world: WorldSection,
  lifecycle: LifecycleSection,
  comms: CommsSection,
  consensus: ConsensusSection,
  sagas: SagasSection,
  telemetry: TelemetrySection,
  architecture: ArchitectureSection,
  operations: OperationsSection,
};

export const OpsWardGuidebook: React.FC = () => {
  const [activeSection, setActiveSection] = useState<GuideSectionId>('start');
  const ActiveContent = SECTION_CONTENT[activeSection];
  const activeIndex = GUIDE_ITEMS.findIndex((item) => item.id === activeSection);
  const previous = GUIDE_ITEMS[activeIndex - 1];
  const next = GUIDE_ITEMS[activeIndex + 1];

  const selectSection = (id: GuideSectionId) => {
    setActiveSection(id);
    window.requestAnimationFrame(() => document.getElementById('guide-article-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <section className="guidebook-shell">
      <div className="guidebook-banner">
        <div className="guidebook-banner__crest"><BookOpenText className="h-6 w-6" /></div>
        <div>
          <span>OPSWARD FIELD LIBRARY · REVISION 01</span>
          <h1>Operator&apos;s Guidebook</h1>
          <p>Concepts, controls, system flows, and incident-response practice.</p>
        </div>
        <div className="guidebook-banner__stamp">READ<br />LEARN<br />RESPOND</div>
      </div>

      <div className="guidebook-layout">
        <aside className="guide-sidenav" aria-label="Guidebook sections">
          <div className="guide-sidenav__title"><Route className="h-4 w-4" /><span>CHAPTER INDEX</span></div>
          {GUIDE_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeSection;
            return (
              <button key={item.id} className={active ? 'is-active' : ''} onClick={() => selectSection(item.id)} aria-current={active ? 'page' : undefined}>
                <Icon className="h-4 w-4" />
                <span><small>{item.eyebrow}</small><strong>{item.label}</strong></span>
                <ChevronRight className="ml-auto h-3.5 w-3.5" />
              </button>
            );
          })}
          <div className="guide-sidenav__tip">
            <CircleDot className="h-4 w-4" />
            <p><strong>TIP</strong> Read chapters in order once, then use this index as an incident reference.</p>
          </div>
        </aside>

        <article id="guide-article-top" className="guide-article">
          <ActiveContent />
          <nav className="guide-pagination" aria-label="Guidebook chapter pagination">
            <button disabled={!previous} onClick={() => previous && selectSection(previous.id)}>
              <span>◀ PREVIOUS</span><strong>{previous?.label ?? 'Beginning'}</strong>
            </button>
            <div><span>{String(activeIndex + 1).padStart(2, '0')}</span><b>/</b><span>{String(GUIDE_ITEMS.length).padStart(2, '0')}</span></div>
            <button disabled={!next} onClick={() => next && selectSection(next.id)}>
              <span>NEXT ▶</span><strong>{next?.label ?? 'Complete'}</strong>
            </button>
          </nav>
        </article>
      </div>
    </section>
  );
};
