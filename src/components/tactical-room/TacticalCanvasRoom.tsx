'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterProfile, RESPONDER_ROSTER } from '@/lib/characters';
import { TacticalPosition } from '@/types/opsward';
import campusLayout from '@/lib/campus-layout.json';
import campusColliders from '@/lib/campus-colliders.json';
import { EXTRA_MAP_COLLIDERS, MAP_BACKGROUNDS, WorldMapId } from '@/lib/world-maps';
import { Clock3, Coffee, Gamepad2, Headphones, Layers, Leaf, MapPin, Radio, Sparkles, Users, Volume2, VolumeX } from 'lucide-react';
import { ColliderEditorModal } from './ColliderEditorModal';

interface TacticalCanvasRoomProps {
  selectedAvatar: CharacterProfile;
  onAvatarSelect: (char: CharacterProfile) => void;
  onProximityChange: (activeResponders: { char: CharacterProfile; distance: number; volume: number }[]) => void;
  isPodiumBroadcasting: boolean;
  onTogglePodium: (active: boolean) => void;
}

type Direction = 'down' | 'left' | 'right' | 'up';
type Rect = { x1: number; y1: number; x2: number; y2: number };
type Room = Rect & { name: string };
type Interactable = { id: string; x: number; y: number; radius: number; label: string; message: string; targetMap?: WorldMapId };
type Occluder = { id: string; x: number; y: number; width: number; height: number; baseline: number; through: boolean };
type NpcSpot = { id: string; x: number; y: number };

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;
const WORLD_WIDTH = campusLayout.world.width;
const WORLD_HEIGHT = campusLayout.world.height;
const SPAWN = campusLayout.spawn;

// The avatar collides with an ellipse under its feet rather than a circle around
// its middle, which is what a top-down room actually reads like.
const FOOT_RADIUS_X = 6;
const FOOT_RADIUS_Y = 4;
const FOOT_OFFSET_Y = 3;
const FOOT_PROBES: [number, number][] = [
  [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71],
];

const NPC_RADIUS_X = 13;
const NPC_RADIUS_Y = 9;

const SPRITE_SIZE = 64;
const OUTDOOR_SPRITE_DRAW_SIZE = 44;
const INTERIOR_SPRITE_DRAW_SIZE = 64;
const SPRITE_ANCHOR_RATIO = 36 / 44;
const getSpriteMetrics = (map: WorldMapId) => {
  const drawSize = map === 'outdoor' ? OUTDOOR_SPRITE_DRAW_SIZE : INTERIOR_SPRITE_DRAW_SIZE;
  return { drawSize, anchorY: Math.round(drawSize * SPRITE_ANCHOR_RATIO) };
};
const WALK_SPEED = 148;
const NAV_GRID = 8;
const CAMPUS_FRAME_COUNT = 10;
const CAMPUS_FRAME_DURATION = 150;
const OUTDOOR_FRAME_COUNT = 10;
const OUTDOOR_FRAME_DURATION = 150;

const COMMAND_TABLE = { x: 753, y: 522, radius: 190 };

const INDOOR_NPCS: NpcSpot[] = [
  { id: 'james', x: 350, y: 300 },
  { id: 'enjidiren', x: 1110, y: 300 },
  { id: 'miria', x: 350, y: 530 },
  { id: 'george', x: 1130, y: 600 },
  { id: 'teresa', x: 750, y: 440 },
  { id: 'kai', x: 780, y: 540 },
];

const OUTDOOR_NPCS: NpcSpot[] = [
  { id: 'james', x: 730, y: 420 },
  { id: 'enjidiren', x: 1180, y: 360 },
  { id: 'miria', x: 860, y: 880 },
  { id: 'george', x: 1190, y: 690 },
  { id: 'teresa', x: 390, y: 880 },
  { id: 'kai', x: 1190, y: 910 },
];

const MAP_NPCS: Record<WorldMapId, NpcSpot[]> = {
  indoor: INDOOR_NPCS,
  outdoor: OUTDOOR_NPCS,
  greenhouse: [{ id: 'miria', x: 750, y: 300 }],
  relay: [{ id: 'enjidiren', x: 920, y: 440 }],
  workshop: [{ id: 'teresa', x: 980, y: 430 }],
  lodge: [{ id: 'george', x: 730, y: 520 }],
  cottage: [{ id: 'kai', x: 1300, y: 360 }],
};

const ROOMS: Room[] = [
  { name: 'Server Vault', x1: 0, y1: 0, x2: 440, y2: 340 },
  { name: 'Security Watch', x1: 0, y1: 341, x2: 440, y2: 660 },
  { name: 'Archive Library', x1: 0, y1: 661, x2: 480, y2: 1024 },
  { name: 'Data Garden', x1: 1060, y1: 0, x2: 1536, y2: 340 },
  { name: 'Briefing Room', x1: 1060, y1: 341, x2: 1536, y2: 660 },
  { name: 'Pantry Lounge', x1: 1000, y1: 661, x2: 1536, y2: 1024 },
  { name: 'Central Operations Hall', x1: 441, y1: 0, x2: 1059, y2: 1024 },
];

const OUTDOOR_ROOMS: Room[] = [
  { name: 'Oakheart Campus Courtyard', x1: 520, y1: 360, x2: 980, y2: 660 },
  { name: 'SFU Relay Trail', x1: 980, y1: 140, x2: 1500, y2: 440 },
  { name: 'Raft Consensus Forest', x1: 980, y1: 450, x2: 1500, y2: 740 },
  { name: 'DLQ Replay Orchard', x1: 980, y1: 750, x2: 1500, y2: 1020 },
  { name: 'Saga Workshop Clearing', x1: 100, y1: 660, x2: 560, y2: 1020 },
  { name: 'Greenhouse Grove', x1: 560, y1: 680, x2: 980, y2: 1020 },
];

const INDOOR_EXIT = { x: 752, y: 930, radius: 82 };
const OUTDOOR_HALL_DOOR = { x: 740, y: 395, radius: 84 };
const INTERIOR_EXIT = { x: 768, y: 880, radius: 88 };

const INTERACTABLES: Interactable[] = [
  { id: 'vault', x: 250, y: 250, radius: 80, label: 'Inspect primary ledger vault', message: 'Vault integrity 100%. Node hash verified across 3 mirrors.' },
  { id: 'security', x: 205, y: 520, radius: 76, label: 'Review security feed', message: 'Security Watch: no anomalous access in the last 15 minutes.' },
  { id: 'garden', x: 1255, y: 240, radius: 88, label: 'Tend data garden', message: 'Data Garden: humidity calibrated. The ferns look unusually cheerful.' },
  { id: 'meeting', x: 1288, y: 540, radius: 86, label: 'Open briefing notes', message: 'Briefing Room: payment-gateway response plan is ready for review.' },
  { id: 'archive', x: 267, y: 855, radius: 80, label: 'Search runbook archive', message: 'Archive Library: found three rollback runbooks and fresh coffee stains.' },
  { id: 'coffee', x: 1166, y: 800, radius: 78, label: 'Brew coffee', message: 'Pantry: +1 focus. The incident is still serious, but now it smells better.' },
];

const OUTDOOR_INTERACTABLES: Interactable[] = [
  { id: 'enter-hall', x: OUTDOOR_HALL_DOOR.x, y: OUTDOOR_HALL_DOOR.y, radius: OUTDOOR_HALL_DOOR.radius, label: 'Enter Incident Command Hall', message: 'Entering the indoor operations floor.', targetMap: 'indoor' },
  { id: 'greenhouse', x: 810, y: 920, radius: 82, label: 'Enter Oakheart Greenhouse', message: 'Opening environmental telemetry greenhouse.', targetMap: 'greenhouse' },
  { id: 'relay', x: 1225, y: 325, radius: 82, label: 'Enter SFU Network Relay', message: 'Opening spatial-media relay lab.', targetMap: 'relay' },
  { id: 'workshop', x: 340, y: 915, radius: 82, label: 'Enter Saga Workshop', message: 'Opening playbook orchestration workshop.', targetMap: 'workshop' },
  { id: 'lodge', x: 1250, y: 640, radius: 82, label: 'Enter Raft Audit Lodge', message: 'Opening consensus and audit lodge.', targetMap: 'lodge' },
  { id: 'cottage', x: 1240, y: 945, radius: 82, label: 'Enter DLQ Replay Cottage', message: 'Opening telemetry and replay cottage.', targetMap: 'cottage' },
];

const INTERIOR_INTERACTABLES: Record<Exclude<WorldMapId, 'indoor' | 'outdoor'>, Interactable[]> = {
  greenhouse: [
    { id: 'exit-greenhouse', ...INTERIOR_EXIT, label: 'Exit greenhouse', message: 'Returning outside.', targetMap: 'outdoor' },
    { id: 'climate', x: 770, y: 260, radius: 82, label: 'Inspect climate telemetry', message: 'Humidity, irrigation pressure, and growth telemetry are nominal.' },
  ],
  relay: [
    { id: 'exit-relay', ...INTERIOR_EXIT, label: 'Exit relay lab', message: 'Returning outside.', targetMap: 'outdoor' },
    { id: 'sfu-zone', x: 975, y: 465, radius: 105, label: 'Test spatial audio mesh', message: 'SFU attenuation test running across four directional speakers.' },
  ],
  workshop: [
    { id: 'exit-workshop', ...INTERIOR_EXIT, label: 'Exit workshop', message: 'Returning outside.', targetMap: 'outdoor' },
    { id: 'workflow', x: 1020, y: 470, radius: 110, label: 'Inspect Saga pipeline', message: 'Drain traffic → restart cluster → health check; compensation path armed.' },
  ],
  lodge: [
    { id: 'exit-lodge', ...INTERIOR_EXIT, label: 'Exit audit lodge', message: 'Returning outside.', targetMap: 'outdoor' },
    { id: 'quorum', x: 770, y: 555, radius: 120, label: 'Inspect Raft quorum', message: 'Three nodes online · leader elected · audit log committed.' },
  ],
  cottage: [
    { id: 'exit-cottage', ...INTERIOR_EXIT, label: 'Exit replay cottage', message: 'Returning outside.', targetMap: 'outdoor' },
    { id: 'dlq', x: 1360, y: 310, radius: 94, label: 'Inspect dead-letter queue', message: 'Four malformed alerts isolated; manual replay is ready.' },
  ],
};

const MAP_TITLES: Record<WorldMapId, string> = {
  indoor: 'Oakheart Operations Hall', outdoor: 'Oakheart Outdoor Campus',
  greenhouse: 'Oakheart Greenhouse', relay: 'SFU Network Relay', workshop: 'Saga Playbook Workshop',
  lodge: 'Raft Consensus Lodge', cottage: 'Telemetry & DLQ Cottage',
};

const directionRow: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const inside = (x: number, y: number, rect: Rect) => x >= rect.x1 && x <= rect.x2 && y >= rect.y1 && y <= rect.y2;
const getRoomName = ({ x, y }: TacticalPosition) => ROOMS.find((room) => inside(x, y, room))?.name ?? 'Oakheart Corridor';
const getOutdoorRoomName = ({ x, y }: TacticalPosition) => OUTDOOR_ROOMS.find((room) => inside(x, y, room))?.name ?? 'Oakheart Trail';

interface ColliderBox {
  id?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  shape?: string;
  through?: boolean;
}

interface MapCollidersData {
  floors: ColliderBox[];
  obstacles: ColliderBox[];
}

const pointInsideCollider = (x: number, y: number, collider: ColliderBox) => {
  if (collider.shape !== 'ellipse') return inside(x, y, collider);
  const centerX = (collider.x1 + collider.x2) / 2;
  const centerY = (collider.y1 + collider.y2) / 2;
  const radiusX = Math.max(1, (collider.x2 - collider.x1) / 2);
  const radiusY = Math.max(1, (collider.y2 - collider.y1) / 2);
  const nx = (x - centerX) / radiusX;
  const ny = (y - centerY) / radiusY;
  return nx * nx + ny * ny <= 1;
};

// Global in-memory map colliders cache for instant sync across maps
const liveCollidersCache: Record<WorldMapId, MapCollidersData> = {
  indoor: (campusColliders as any) || { floors: [], obstacles: [] },
  outdoor: (EXTRA_MAP_COLLIDERS.outdoor as any) || { floors: [], obstacles: [] },
  greenhouse: (EXTRA_MAP_COLLIDERS.greenhouse as any) || { floors: [], obstacles: [] },
  relay: (EXTRA_MAP_COLLIDERS.relay as any) || { floors: [], obstacles: [] },
  workshop: (EXTRA_MAP_COLLIDERS.workshop as any) || { floors: [], obstacles: [] },
  lodge: (EXTRA_MAP_COLLIDERS.lodge as any) || { floors: [], obstacles: [] },
  cottage: (EXTRA_MAP_COLLIDERS.cottage as any) || { floors: [], obstacles: [] },
};

const isBlocked = (map: WorldMapId, x: number, y: number) => {
  const data = liveCollidersCache[map] || { floors: [], obstacles: [] };
  const footY = y + FOOT_OFFSET_Y;

  for (const [dx, dy] of FOOT_PROBES) {
    const probeX = x + dx * FOOT_RADIUS_X;
    const probeY = footY + dy * FOOT_RADIUS_Y;

    // 1. Must be on Walkable Floor (HIJAU) or Walk-Behind Corridor (UNGU)
    const onFloor = data.floors.some((f) => pointInsideCollider(probeX, probeY, f));
    const onThroughPassage = data.obstacles.some((ob) => ob.through && pointInsideCollider(probeX, probeY, ob));
    if (!onFloor && !onThroughPassage) return true;

    // 2. Cannot intersect Solid Obstacle (MERAH)
    const hitsSolidObstacle = data.obstacles.some((ob) => !ob.through && pointInsideCollider(probeX, probeY, ob));
    if (hitsSolidObstacle) return true;
  }
  return false;
};

const gridKey = (x: number, y: number) => `${x},${y}`;
const gridPoint = (x: number, y: number): TacticalPosition => ({ x: x * NAV_GRID, y: y * NAV_GRID });

const nearestOpenGridPoint = (map: WorldMapId, point: TacticalPosition) => {
  const centerX = Math.round(point.x / NAV_GRID);
  const centerY = Math.round(point.y / NAV_GRID);
  for (let radius = 0; radius <= 14; radius += 1) {
    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        if (Math.max(Math.abs(x - centerX), Math.abs(y - centerY)) !== radius && radius !== 0) continue;
        const world = gridPoint(x, y);
        if (!isBlocked(map, world.x, world.y)) return { x, y };
      }
    }
  }
  return null;
};

const findPath = (map: WorldMapId, startWorld: TacticalPosition, targetWorld: TacticalPosition): TacticalPosition[] => {
  const startGrid = nearestOpenGridPoint(map, startWorld);
  const targetGrid = nearestOpenGridPoint(map, targetWorld);
  if (!startGrid || !targetGrid) return [];
  if (startGrid.x === targetGrid.x && startGrid.y === targetGrid.y) return [targetWorld];

  type Node = { x: number; y: number; g: number; f: number; parent?: Node };
  const open: Node[] = [{ ...startGrid, g: 0, f: Math.hypot(targetGrid.x - startGrid.x, targetGrid.y - startGrid.y) }];
  const closed = new Set<string>();
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  let iterations = 0;

  while (open.length && iterations < 900) {
    iterations += 1;
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    if (!current) break;
    if (current.x === targetGrid.x && current.y === targetGrid.y) {
      const path: TacticalPosition[] = [];
      let trace: Node | undefined = current;
      while (trace) {
        path.unshift(gridPoint(trace.x, trace.y));
        trace = trace.parent;
      }
      path[0] = startWorld;
      path[path.length - 1] = targetWorld;
      return path.slice(1);
    }
    closed.add(gridKey(current.x, current.y));
    for (const [dx, dy] of directions) {
      const next = { x: current.x + dx, y: current.y + dy };
      const key = gridKey(next.x, next.y);
      if (closed.has(key)) continue;
      const world = gridPoint(next.x, next.y);
      if (isBlocked(map, world.x, world.y)) continue;
      const tentativeScore = current.g + (dx !== 0 && dy !== 0 ? 1.414 : 1);
      const existing = open.find((node) => node.x === next.x && node.y === next.y);
      if (existing && tentativeScore >= existing.g) continue;
      const heuristic = Math.hypot(targetGrid.x - next.x, targetGrid.y - next.y);
      if (existing) {
        existing.g = tentativeScore;
        existing.f = tentativeScore + heuristic;
        existing.parent = current;
        continue;
      }
      open.push({ ...next, g: tentativeScore, f: tentativeScore + heuristic, parent: current });
    }
  }
  return [targetWorld];
};

const OUTDOOR_SPAWN = { x: 335, y: 330 };
const MAP_SPAWNS: Record<WorldMapId, TacticalPosition> = {
  indoor: { x: SPAWN.x, y: SPAWN.y },
  outdoor: OUTDOOR_SPAWN,
  greenhouse: { x: 768, y: 880 },
  relay: { x: 768, y: 880 },
  workshop: { x: 768, y: 880 },
  lodge: { x: 768, y: 900 },
  cottage: { x: 768, y: 885 },
};

const OUTDOOR_RETURN_SPAWNS: Partial<Record<WorldMapId, TacticalPosition>> = {
  indoor: { x: 335, y: 330 },
  lodge: { x: 1250, y: 640 },
  relay: { x: 1225, y: 325 },
  workshop: { x: 340, y: 915 },
  greenhouse: { x: 810, y: 920 },
};

const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => resolve(image);
  image.src = source;
});

export const TacticalCanvasRoom: React.FC<TacticalCanvasRoomProps> = ({
  selectedAvatar,
  onAvatarSelect,
  onProximityChange,
  isPodiumBroadcasting,
  onTogglePodium,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const assetsRef = useRef<{
    interiors: HTMLImageElement[];
    mapImages: Partial<Record<WorldMapId, HTMLImageElement>>;
    outdoorTiles: HTMLImageElement[];
    overlays: Partial<Record<WorldMapId, HTMLImageElement[]>>;
    sprites: Record<string, HTMLImageElement>;
    occluderMask: HTMLImageElement | null;
  }>({ interiors: [], mapImages: {}, outdoorTiles: [], overlays: {}, sprites: {}, occluderMask: null });
  const occluderLayerRef = useRef<HTMLCanvasElement | null>(null);
  const occluderFrameRef = useRef(-1);
  const spriteBufferRef = useRef<HTMLCanvasElement | null>(null);
  const positionRef = useRef<TacticalPosition>({ x: SPAWN.x, y: SPAWN.y });
  const cameraRef = useRef<TacticalPosition>({ x: SPAWN.x - VIEW_WIDTH / 2, y: SPAWN.y - VIEW_HEIGHT / 2 });
  const targetRef = useRef<TacticalPosition | null>(null);
  const pathRef = useRef<TacticalPosition[]>([]);
  const clickTargetRef = useRef<TacticalPosition | null>(null);
  const directionRef = useRef<Direction>('up');
  const movingRef = useRef(false);
  const stepPhaseRef = useRef(0);
  const keysRef = useRef<Set<string>>(new Set());
  const nearbyInteractableRef = useRef<Interactable | null>(null);
  const interactionBurstRef = useRef<{ x: number; y: number; until: number } | null>(null);
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeMapRef = useRef<WorldMapId>('indoor');
  const [assetsReady, setAssetsReady] = useState(false);
  const [activeMap, setActiveMap] = useState<WorldMapId>('indoor');
  const [playerPos, setPlayerPos] = useState<TacticalPosition>(positionRef.current);
  const [activeRoom, setActiveRoom] = useState('Arrival Hall');
  const [proximityRadius, setProximityRadius] = useState(170);
  const [isMuted, setIsMuted] = useState(false);
  const [showMesh, setShowMesh] = useState(false);
  const [nearbyInteractable, setNearbyInteractable] = useState<Interactable | null>(null);
  const [interactionNote, setInteractionNote] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const changeMap = useCallback((nextMap: WorldMapId) => {
    const previousMap = activeMapRef.current;
    activeMapRef.current = nextMap;
    setActiveMap(nextMap);
    positionRef.current = nextMap === 'outdoor' && previousMap !== 'outdoor'
      ? { ...(OUTDOOR_RETURN_SPAWNS[previousMap] ?? OUTDOOR_SPAWN) }
      : { ...MAP_SPAWNS[nextMap] };
    cameraRef.current = {
      x: clamp(positionRef.current.x - VIEW_WIDTH / 2, 0, WORLD_WIDTH - VIEW_WIDTH),
      y: clamp(positionRef.current.y - VIEW_HEIGHT / 2, 0, WORLD_HEIGHT - VIEW_HEIGHT),
    };
    targetRef.current = null;
    pathRef.current = [];
    clickTargetRef.current = null;
    nearbyInteractableRef.current = null;
    setNearbyInteractable(null);
    setInteractionNote(`${MAP_TITLES[nextMap]} loaded.`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pending: Promise<unknown>[] = [];
    for (let index = 0; index < CAMPUS_FRAME_COUNT; index += 1) {
      pending.push(
        loadImage(`/game-assets/campus-loop-frames/campus-${String(index).padStart(2, '0')}.png`)
          .then((image) => { assetsRef.current.interiors[index] = image; }),
      );
    }
    for (let tileY = 0; tileY < 2; tileY += 1) {
      for (let tileX = 0; tileX < 2; tileX += 1) {
        const tileIndex = tileY * 2 + tileX;
        pending.push(
          loadImage(`/game-assets/outdoor-v4-hires-tiles/outdoor-${tileX}-${tileY}.png`)
            .then((image) => { assetsRef.current.outdoorTiles[tileIndex] = image; }),
        );
      }
    }
    (['greenhouse', 'relay', 'workshop', 'lodge', 'cottage'] as WorldMapId[]).forEach((mapId) => {
      pending.push(
        loadImage(MAP_BACKGROUNDS[mapId]).then((image) => { assetsRef.current.mapImages[mapId] = image; }),
      );
    });
    (['outdoor', 'greenhouse', 'relay', 'workshop', 'lodge', 'cottage'] as WorldMapId[]).forEach((mapId) => {
      assetsRef.current.overlays[mapId] = [];
      for (let index = 0; index < OUTDOOR_FRAME_COUNT; index += 1) {
        pending.push(
          loadImage(`/game-assets/map-animation-overlays-v2/${mapId}/${String(index).padStart(2, '0')}.png`)
            .then((image) => { assetsRef.current.overlays[mapId]![index] = image; }),
        );
      }
    });
    RESPONDER_ROSTER.forEach((character) => {
      pending.push(
        loadImage(`/game-assets/characters-aligned/${character.id}-walk-4x4.png`)
          .then((image) => { assetsRef.current.sprites[character.id] = image; }),
      );
    });
    Promise.all(pending).then(() => { if (!cancelled) setAssetsReady(true); });
    return () => { cancelled = true; };
  }, []);

  const fetchLiveColliders = useCallback(async () => {
    const maps: WorldMapId[] = ['indoor', 'outdoor', 'greenhouse', 'relay', 'workshop', 'lodge', 'cottage'];
    await Promise.all(
      maps.map(async (m) => {
        try {
          const res = await fetch(`/api/colliders?map=${m}`);
          if (res.ok) {
            const data = await res.json();
            liveCollidersCache[m] = {
              floors: data.floors || [],
              obstacles: data.obstacles || [],
            };
          }
        } catch {}
      })
    );
  }, []);

  useEffect(() => {
    fetchLiveColliders();
  }, [fetchLiveColliders]);

  useEffect(() => {
    const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright']);
    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (movementKeys.has(key)) {
        event.preventDefault();
        keysRef.current.add(key);
        targetRef.current = null;
        pathRef.current = [];
        clickTargetRef.current = null;
      }
      if (key === 'e' && nearbyInteractableRef.current) {
        event.preventDefault();
        const item = nearbyInteractableRef.current;
        if (item.targetMap) {
          setInteractionNote(item.message);
          changeMap(item.targetMap);
          return;
        }
        setInteractionNote(item.message);
        interactionBurstRef.current = { x: item.x, y: item.y, until: performance.now() + 1200 };
        if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
        noteTimerRef.current = setTimeout(() => setInteractionNote(''), 4200);
      }
    };
    const keyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    };
  }, [changeMap]);

  useEffect(() => {
    const mapNpcs = MAP_NPCS[activeMap]
      .filter((responder) => responder.id !== selectedAvatar.id);
    const nearby = mapNpcs.map((responder) => {
      const char = RESPONDER_ROSTER.find((candidate) => candidate.id === responder.id);
      if (!char) return null;
      const distance = Math.hypot(playerPos.x - responder.x, playerPos.y - responder.y);
      const volume = isPodiumBroadcasting ? 1 : Math.max(0, 1 - distance / proximityRadius);
      return { char, distance: Math.round(distance), volume: Number(volume.toFixed(2)) };
    }).filter(Boolean) as { char: CharacterProfile; distance: number; volume: number }[];
    onProximityChange(nearby);
  }, [activeMap, isPodiumBroadcasting, onProximityChange, playerPos, proximityRadius, selectedAvatar.id]);

  const ensureBuffers = useCallback(() => {
    if (!occluderLayerRef.current) {
      const layer = document.createElement('canvas');
      layer.width = WORLD_WIDTH;
      layer.height = WORLD_HEIGHT;
      occluderLayerRef.current = layer;
    }
    if (!spriteBufferRef.current) {
      const buffer = document.createElement('canvas');
      buffer.width = SPRITE_SIZE;
      buffer.height = SPRITE_SIZE;
      spriteBufferRef.current = buffer;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !assetsReady) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    ensureBuffers();
    context.imageSmoothingEnabled = false;
    let animationFrame = 0;
    let previousTime = performance.now();
    let hudAccumulator = 0;

    /** Cuts the current campus frame down to furniture pixels only. */
    const refreshOccluderLayer = (frameIndex: number, interior: HTMLImageElement) => {
      const layer = occluderLayerRef.current;
      const mask = assetsRef.current.occluderMask;
      if (!layer || !mask?.complete || !mask.naturalWidth) return;
      if (occluderFrameRef.current === frameIndex) return;
      const layerContext = layer.getContext('2d');
      if (!layerContext) return;
      layerContext.imageSmoothingEnabled = false;
      layerContext.globalCompositeOperation = 'source-over';
      layerContext.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      layerContext.drawImage(interior, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      // Keeping only the stencilled pixels is what stops the foreground pass
      // from repainting floor on top of the characters.
      layerContext.globalCompositeOperation = 'destination-in';
      layerContext.drawImage(mask, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      layerContext.globalCompositeOperation = 'source-over';
      occluderFrameRef.current = frameIndex;
    };

    const drawContactShadow = (x: number, y: number, spread: number, strength: number) => {
      context.save();
      context.translate(x, y + 3);
      context.scale(1, 0.34);
      const gradient = context.createRadialGradient(0, 0, 1, 0, 0, spread);
      gradient.addColorStop(0, `rgba(26, 13, 8, ${strength})`);
      gradient.addColorStop(0.45, `rgba(26, 13, 8, ${strength * 0.58})`);
      gradient.addColorStop(1, 'rgba(26, 13, 8, 0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(0, 0, spread, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    /** Grades a sprite frame into the room: warm lamp light on top, floor
     *  bounce darkening at the feet, so the cut-out edge stops reading flat. */
    const drawGradedSprite = (
      sheet: HTMLImageElement,
      column: number,
      row: number,
      x: number,
      y: number,
      alpha: number,
    ) => {
      const { drawSize, anchorY } = getSpriteMetrics(activeMapRef.current);
      const buffer = spriteBufferRef.current;
      const bufferContext = buffer?.getContext('2d');
      if (!buffer || !bufferContext) return;
      bufferContext.imageSmoothingEnabled = false;
      bufferContext.globalCompositeOperation = 'source-over';
      bufferContext.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      // The roster art is punchier than the campus painting, so pull the
      // saturation and brightness back until the two read as one style.
      bufferContext.filter = 'saturate(0.88) brightness(0.95) contrast(1.1)';
      bufferContext.drawImage(
        sheet,
        column * SPRITE_SIZE, row * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
        0, 0, SPRITE_SIZE, SPRITE_SIZE,
      );

      bufferContext.filter = 'none';
      bufferContext.globalCompositeOperation = 'source-atop';
      const grounding = bufferContext.createLinearGradient(0, SPRITE_SIZE * 0.35, 0, SPRITE_SIZE);
      grounding.addColorStop(0, 'rgba(30, 16, 10, 0)');
      grounding.addColorStop(1, 'rgba(30, 16, 10, 0.36)');
      bufferContext.fillStyle = grounding;
      bufferContext.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      bufferContext.fillStyle = 'rgba(238, 158, 82, 0.2)';
      bufferContext.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      bufferContext.globalCompositeOperation = 'source-over';

      context.save();
      context.globalAlpha = alpha;
      context.drawImage(
        buffer,
        Math.round(x - drawSize / 2), Math.round(y - anchorY),
        drawSize, drawSize,
      );
      context.restore();
    };

    const drawNpc = (npc: NpcSpot, now: number, index: number) => {
      const sheet = assetsRef.current.sprites[npc.id];
      if (!sheet?.complete || !sheet.naturalWidth) return;
      const bob = Math.round(Math.sin(now / 620 + index) * 1);
      drawContactShadow(npc.x, npc.y, 12, 0.4);
      drawGradedSprite(sheet, 0, 0, npc.x, npc.y + bob, 1);
    };

    const render = (now: number) => {
      const currentMap = activeMapRef.current;
      const currentNpcs = MAP_NPCS[currentMap]
        .filter((npc) => npc.id !== selectedAvatar.id);
      const delta = Math.min(0.04, (now - previousTime) / 1000);
      previousTime = now;
      if (isBlocked(currentMap, positionRef.current.x, positionRef.current.y)) {
        const safeGridPoint = nearestOpenGridPoint(currentMap, positionRef.current);
        if (safeGridPoint) positionRef.current = gridPoint(safeGridPoint.x, safeGridPoint.y);
      }
      let dx = 0;
      let dy = 0;
      const keys = keysRef.current;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      const target = targetRef.current;
      if (target && dx === 0 && dy === 0) {
        const distance = Math.hypot(target.x - positionRef.current.x, target.y - positionRef.current.y);
        if (distance > 5) {
          dx = (target.x - positionRef.current.x) / distance;
          dy = (target.y - positionRef.current.y) / distance;
        } else {
          targetRef.current = pathRef.current.shift() ?? null;
          if (!targetRef.current) clickTargetRef.current = null;
        }
      }
      movingRef.current = dx !== 0 || dy !== 0;
      if (movingRef.current) {
        if (Math.abs(dx) > Math.abs(dy)) directionRef.current = dx > 0 ? 'right' : 'left';
        else directionRef.current = dy > 0 ? 'down' : 'up';
        const magnitude = Math.hypot(dx, dy) || 1;
        const stepX = (dx / magnitude) * WALK_SPEED * delta;
        const stepY = (dy / magnitude) * WALK_SPEED * delta;
        const current = positionRef.current;
        let nextX = current.x;
        let nextY = current.y;
        if (!isBlocked(currentMap, current.x + stepX, current.y)) nextX += stepX;
        if (!isBlocked(currentMap, nextX, current.y + stepY)) nextY += stepY;
        positionRef.current = { x: nextX, y: nextY };
        stepPhaseRef.current += Math.hypot(nextX - current.x, nextY - current.y);
      } else {
        stepPhaseRef.current = 0;
      }

      const atCommandTable = currentMap === 'indoor' && Math.hypot(
        positionRef.current.x - COMMAND_TABLE.x,
        positionRef.current.y - COMMAND_TABLE.y,
      ) < COMMAND_TABLE.radius;
      if (atCommandTable !== isPodiumBroadcasting) onTogglePodium(atCommandTable);
      const desiredCamera = {
        x: clamp(positionRef.current.x - VIEW_WIDTH / 2, 0, WORLD_WIDTH - VIEW_WIDTH),
        y: clamp(positionRef.current.y - VIEW_HEIGHT / 2, 0, WORLD_HEIGHT - VIEW_HEIGHT),
      };
      cameraRef.current.x += (desiredCamera.x - cameraRef.current.x) * Math.min(1, delta * 7);
      cameraRef.current.y += (desiredCamera.y - cameraRef.current.y) * Math.min(1, delta * 7);

      hudAccumulator += delta;
      if (hudAccumulator > 0.1) {
        hudAccumulator = 0;
        setPlayerPos({ ...positionRef.current });
        setActiveRoom(currentMap === 'indoor'
          ? getRoomName(positionRef.current)
          : currentMap === 'outdoor' ? getOutdoorRoomName(positionRef.current) : MAP_TITLES[currentMap]);
        const mapInteractables: Interactable[] = currentMap === 'outdoor'
          ? OUTDOOR_INTERACTABLES
          : currentMap === 'indoor' ? [...INTERACTABLES, {
            id: 'exit-campus', x: INDOOR_EXIT.x, y: INDOOR_EXIT.y, radius: INDOOR_EXIT.radius,
            label: 'Exit to outdoor campus', message: 'Leaving the command hall.', targetMap: 'outdoor' as WorldMapId,
          }] : INTERIOR_INTERACTABLES[currentMap];
        const nearest = mapInteractables
          .map((item) => ({ item, distance: Math.hypot(positionRef.current.x - item.x, positionRef.current.y - item.y) }))
          .filter(({ item, distance }) => distance <= item.radius)
          .sort((a, b) => a.distance - b.distance)[0]?.item ?? null;
        if (nearbyInteractableRef.current?.id !== nearest?.id) {
          nearbyInteractableRef.current = nearest;
          setNearbyInteractable(nearest);
        }
      }

      context.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      context.fillStyle = '#15100e';
      context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      context.save();
      const cameraX = Math.round(cameraRef.current.x);
      const cameraY = Math.round(cameraRef.current.y);
      context.translate(-cameraX, -cameraY);
      const campusFrame = Math.floor(now / CAMPUS_FRAME_DURATION) % CAMPUS_FRAME_COUNT;
      const outdoorFrame = Math.floor(now / OUTDOOR_FRAME_DURATION) % OUTDOOR_FRAME_COUNT;
      const background = currentMap === 'indoor'
        ? assetsRef.current.interiors[campusFrame]
        : assetsRef.current.mapImages[currentMap];
      if (currentMap === 'outdoor') {
        assetsRef.current.outdoorTiles.forEach((tile, index) => {
          if (!tile?.complete || !tile.naturalWidth) return;
          const tileX = index % 2;
          const tileY = Math.floor(index / 2);
          context.drawImage(tile, tileX * 768, tileY * 512, 768, 512);
        });
      } else if (background?.complete) {
        context.drawImage(background, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        if (currentMap === 'indoor') refreshOccluderLayer(campusFrame, background);
      }
      if (currentMap !== 'indoor') {
        const overlay = assetsRef.current.overlays[currentMap]?.[outdoorFrame];
        if (overlay?.complete && overlay.naturalWidth) context.drawImage(overlay, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        if (showMesh) {
          context.save();
          context.beginPath();
          context.arc(positionRef.current.x, positionRef.current.y, proximityRadius, 0, Math.PI * 2);
          context.setLineDash([5, 7]);
          context.strokeStyle = 'rgba(255, 235, 172, .72)';
          context.lineWidth = 2;
          context.stroke();
          context.restore();
        }
      }

      const position = positionRef.current;
      const playerSheet = assetsRef.current.sprites[selectedAvatar.id];
      const playerFrame = movingRef.current ? Math.floor(stepPhaseRef.current / 22) % 4 : 0;
      const playerRow = directionRow[directionRef.current];
      const view = { x1: cameraX, y1: cameraY, x2: cameraX + VIEW_WIDTH, y2: cameraY + VIEW_HEIGHT };

      const depthQueue: { baseline: number; draw: () => void }[] = [];
      currentNpcs.forEach((npc, index) => {
        depthQueue.push({ baseline: npc.y, draw: () => drawNpc(npc, now, index) });
      });
      const { drawSize, anchorY } = getSpriteMetrics(currentMap);
      const playerBox = {
        x1: position.x - drawSize / 4,
        y1: position.y - anchorY + 6,
        x2: position.x + drawSize / 4,
        y2: position.y + 10,
      };

      const currentColliders = liveCollidersCache[currentMap] || { floors: [], obstacles: [] };
      const inThroughZone = currentColliders.obstacles.some(
        (ob) => ob.through && pointInsideCollider(position.x, position.y + FOOT_OFFSET_Y, ob)
      );
      let hiddenByFurniture = inThroughZone;

      currentColliders.obstacles.forEach((object) => {
        const x1 = object.x1;
        const y1 = object.y1;
        const width = object.x2 - object.x1;
        const height = object.y2 - object.y1;
        const baseline = object.y2;

        if (x1 > view.x2 || x1 + width < view.x1) return;
        if (y1 > view.y2 || y1 + height < view.y1) return;
        if (object.through) return;

        const isPlayerBehind = baseline > position.y;
        const isIntersecting = (
          x1 < playerBox.x2 && x1 + width > playerBox.x1 &&
          y1 < playerBox.y2 && y1 + height > playerBox.y1
        );

        if (isPlayerBehind && (isIntersecting || inThroughZone)) {
          hiddenByFurniture = true;
        }

        depthQueue.push({
          baseline,
          draw: () => {
            if (background?.complete) {
              context.drawImage(
                background,
                x1, y1, width, height,
                x1, y1, width, height,
              );
            }
          },
        });
      });

      depthQueue.push({
        baseline: position.y,
        draw: () => {
          const settle = movingRef.current ? 1.04 : 1;
          drawContactShadow(position.x, position.y, 11 * settle, 0.46);
          if (playerSheet?.complete && playerSheet.naturalWidth) {
            drawGradedSprite(playerSheet, playerFrame, playerRow, position.x, position.y, 1);
          }
        },
      });

      depthQueue.sort((left, right) => left.baseline - right.baseline);
      depthQueue.forEach((item) => item.draw());

      // Tucked behind a shelf/obstacle the avatar would vanish entirely, so leave a
      // readable translucent silhouette on top of whatever is covering them.
      if (hiddenByFurniture && playerSheet?.complete && playerSheet.naturalWidth) {
        drawGradedSprite(playerSheet, playerFrame, playerRow, position.x, position.y, 0.35);
      }

      const burst = interactionBurstRef.current;
      if (burst && now < burst.until) {
        const progress = 1 - (burst.until - now) / 1200;
        context.strokeStyle = `rgba(151, 230, 170, ${1 - progress})`;
        context.lineWidth = 3;
        context.strokeRect(burst.x - 18 - progress * 28, burst.y - 18 - progress * 28, 36 + progress * 56, 36 + progress * 56);
      }

      const targetMarker = clickTargetRef.current;
      if (targetMarker) {
        const markerSize = 5 + Math.sin(now / 180) * 2;
        context.strokeStyle = '#f7d88b';
        context.lineWidth = 2;
        context.strokeRect(targetMarker.x - markerSize, targetMarker.y - markerSize, markerSize * 2, markerSize * 2);
      }

      context.restore();

      const daylight = (Math.sin(now / 5200) + 1) / 2;
      context.fillStyle = currentMap === 'outdoor'
        ? `rgba(255, 226, 138, ${0.01 + daylight * 0.018})`
        : `rgba(246, 164, 78, ${0.025 + daylight * 0.025})`;
      const vignette = context.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 220, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 510);
      vignette.addColorStop(0, 'rgba(18, 10, 8, 0)');
      vignette.addColorStop(1, 'rgba(18, 10, 8, .2)');
      context.fillStyle = vignette;
      context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrame);
  }, [assetsReady, ensureBuffers, isPodiumBroadcasting, onTogglePodium, proximityRadius, selectedAvatar, showMesh]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const worldTarget = {
      x: cameraRef.current.x + ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
      y: cameraRef.current.y + ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
    };
    const map = activeMapRef.current;
    const mapNpcs = MAP_NPCS[map]
      .filter((npc) => npc.id !== selectedAvatar.id);
    const clickedNpc = mapNpcs.find((npc) => Math.hypot(worldTarget.x - npc.x, worldTarget.y - npc.y) < 26);
    if (clickedNpc) {
      const character = RESPONDER_ROSTER.find((candidate) => candidate.id === clickedNpc.id);
      if (character) onAvatarSelect(character);
      return;
    }
    if (!isBlocked(map, worldTarget.x, worldTarget.y)) {
      const route = findPath(map, positionRef.current, worldTarget);
      pathRef.current = route;
      targetRef.current = pathRef.current.shift() ?? null;
      clickTargetRef.current = targetRef.current ? worldTarget : null;
    }
  };

  const nearbyCount = MAP_NPCS[activeMap]
    .filter((npc) => npc.id !== selectedAvatar.id)
    .filter((npc) => Math.hypot(playerPos.x - npc.x, playerPos.y - npc.y) <= proximityRadius).length;

  return (
    <section className="game-window overflow-hidden">
      <div className="game-window__header">
        <div className="flex min-w-0 items-center gap-3">
          <div className="pixel-crest"><Leaf className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="game-eyebrow">OPSWARD CAMPUS · MORNING SHIFT</p>
            <h2 className="truncate text-lg font-black tracking-tight text-[#4a2418]">{MAP_TITLES[activeMap]}</h2>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <div className="game-status-chip"><Clock3 className="h-3.5 w-3.5" /> Day 12 · 09:40</div>
          <div className="game-status-chip game-status-chip--alert"><Radio className="h-3.5 w-3.5" /> P0 ACTIVE</div>
        </div>
      </div>

      <div className="game-hud-row">
        <div className="game-hud-block min-w-0"><MapPin className="h-4 w-4 text-[#b56a2e]" /><div className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-[.15em] text-[#9b6a45]">Current room</span><strong className="block truncate text-xs text-[#50301f]">{activeRoom}</strong></div></div>
        <div className="game-hud-block hidden sm:flex"><Users className="h-4 w-4 text-[#628858]" /><div><span className="block text-[9px] font-bold uppercase tracking-[.15em] text-[#9b6a45]">Nearby crew</span><strong className="block text-xs text-[#50301f]">{nearbyCount} responders</strong></div></div>
        <div className="ml-auto flex items-center gap-2">
          <button className="game-icon-button" onClick={() => changeMap(activeMap === 'outdoor' ? 'indoor' : 'outdoor')} title={activeMap === 'outdoor' ? 'Fast travel to Operations Hall' : 'Fast travel to outdoor campus'}><MapPin className="h-4 w-4" /></button>
          <button className={`game-icon-button ${isEditorOpen ? 'is-active' : ''}`} onClick={() => setIsEditorOpen(true)} title="Open Visual Drag & Drop Collider Editor"><Layers className="h-4 w-4" /></button>
          <button className={`game-icon-button ${showMesh ? 'is-active' : ''}`} onClick={() => setShowMesh((value) => !value)} title="Toggle proximity mesh"><Headphones className="h-4 w-4" /></button>
          <button className={`game-icon-button ${isMuted ? 'is-danger' : ''}`} onClick={() => setIsMuted((value) => !value)} title="Toggle microphone">{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
        </div>
      </div>

      <div className="game-canvas-wrap">
        {!assetsReady && <div className="absolute inset-0 z-10 grid place-items-center bg-[#2b1814] text-sm font-bold text-[#f5d78f]"><span><Sparkles className="mr-2 inline h-4 w-4 animate-pulse" />Preparing the campus…</span></div>}
        <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} onClick={handleCanvasClick} className="block h-full w-full cursor-crosshair" aria-label="Interactive multi-room pixel-art OpsWArd campus" />
        <div className="game-quest-card"><span className="game-eyebrow">TODAY&apos;S PRIORITY</span><strong>Stabilize payment gateway</strong><span>{activeMap === 'outdoor' ? 'Follow the paths and enter each OpsWArd facility' : activeMap === 'indoor' ? 'Coordinate the incident from Central Operations' : 'Inspect this facility · use E at the south exit'}</span></div>
        {nearbyInteractable && <div className="game-interaction-prompt"><kbd>E</kbd><span>{nearbyInteractable.label}</span></div>}
        {interactionNote && <div className="game-interaction-note">{interactionNote}</div>}
        {isPodiumBroadcasting && <div className="game-broadcast-toast"><Radio className="h-3.5 w-3.5" /> Central table broadcast active</div>}
      </div>

      <div className="game-control-bar">
        <div className="flex items-center gap-2 text-[#633924]"><Gamepad2 className="h-4 w-4" /><span><kbd>WASD</kbd> walk · click floor · <kbd>E</kbd> interact · click crew to switch</span></div>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <label className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#628858]" /><span>Facility</span><select aria-label="Travel to facility" value={activeMap} onChange={(event) => changeMap(event.target.value as WorldMapId)} className="border-2 border-[#7a4a2d] bg-[#f4d995] px-1.5 py-1 text-[9px] font-bold text-[#4a2418] outline-none"><option value="indoor">Operations Hall</option><option value="outdoor">Outdoor Campus</option><option value="greenhouse">Greenhouse</option><option value="relay">SFU Relay</option><option value="workshop">Saga Workshop</option><option value="lodge">Raft Lodge</option><option value="cottage">DLQ Cottage</option></select></label>
          <Coffee className="h-4 w-4 text-[#9e5730]" /><span>Spatial range</span><input type="range" min="100" max="260" value={proximityRadius} onChange={(event) => setProximityRadius(Number(event.target.value))} className="w-20 accent-[#b86a31]" />
        </div>
      </div>

      <ColliderEditorModal
        isOpen={isEditorOpen}
        mapId={activeMap}
        onClose={() => setIsEditorOpen(false)}
        onSaved={() => {
          setTimeout(() => window.location.reload(), 500);
        }}
      />
    </section>
  );
};
