import React from 'react';
import { Activity, BookOpenText, ChevronRight, Layers3, Radio, ShieldAlert, Workflow } from 'lucide-react';

interface PixelSplashProps {
  onEnter: () => void;
  onOpenGuide: () => void;
}

export const PixelSplash: React.FC<PixelSplashProps> = ({ onEnter, onOpenGuide }) => (
  <main className="pixel-splash">
    <div className="pixel-splash__sky" aria-hidden="true">
      <i className="pixel-star star-a" /><i className="pixel-star star-b" /><i className="pixel-star star-c" />
      <i className="pixel-star star-d" /><i className="pixel-star star-e" />
    </div>

    <section className="pixel-splash__panel">
      <div className="pixel-splash__brand">
        <div className="pixel-splash__crest"><ShieldAlert className="h-8 w-8" /></div>
        <div>
          <span>OAKHEART EMERGENCY OPERATIONS CAMPUS</span>
          <h1>OPS<span>WARD</span></h1>
          <p>DISTRIBUTED INCIDENT RESPONSE · LODGE BUILD</p>
        </div>
      </div>

      <div className="pixel-splash__scene" aria-label="Pixel-art representation of the OpsWArd campus">
        <img src="/game-assets/splash-oakheart-front-v2.png" alt="George, Helina, and Enjidiren standing before Oakheart Operations Hall at dusk" />
        <div className="pixel-splash__scene-shade" />
      </div>

      <div className="pixel-splash__intro">
        <span className="pixel-splash__eyebrow">MISSION CONTROL IS READY</span>
        <h2>Coordinate the incident.<br />Preserve a single source of truth.</h2>
        <p>
          Enter a playable pixel Emergency Operations Center powered by spatial communications,
          Raft consensus, Saga recovery workflows, and Kafka telemetry.
        </p>
      </div>

      <div className="pixel-splash__pillars">
        <div><Radio /><span><strong>SPATIAL WAR ROOM</strong><small>Proximity coordination</small></span></div>
        <div><Layers3 /><span><strong>RAFT CONSENSUS</strong><small>Majority-backed truth</small></span></div>
        <div><Workflow /><span><strong>SAGA PLAYBOOKS</strong><small>Recoverable execution</small></span></div>
        <div><Activity /><span><strong>TELEMETRY & DLQ</strong><small>Signals, retry, replay</small></span></div>
      </div>

      <div className="pixel-splash__actions">
        <button className="pixel-splash__primary" onClick={onEnter}>
          <span>ENTER COMMAND CENTER</span><ChevronRight className="h-4 w-4" />
        </button>
        <button className="pixel-splash__secondary" onClick={onOpenGuide}>
          <BookOpenText className="h-4 w-4" /><span>OPEN GUIDEBOOK</span>
        </button>
      </div>

      <div className="pixel-splash__status">
        <span><i /> SYSTEM READY</span><span>3-NODE QUORUM</span><span>26 RESPONDERS</span><span>REV 01</span>
      </div>
    </section>
  </main>
);
