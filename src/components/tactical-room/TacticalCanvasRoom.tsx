'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterProfile, RESPONDER_ROSTER } from '@/lib/characters';
import { TacticalPosition } from '@/types/opsward';
import campusLayout from '@/lib/campus-layout.json';
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
const OCCLUDERS = campusLayout.occluders as Occluder[];
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
// Exterior landmarks are drawn at a broader world scale, so characters stay
// compact there. Interior rooms use the original 64px presentation so desks,
// seats, and characters keep their earlier proportions.
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
  { id: 'theresa', x: 640, y: 830 },
  { id: 'nuying', x: 880, y: 830 },
];

const OUTDOOR_NPC_SPOTS: NpcSpot[] = [
  { id: 'alex', x: 570, y: 365 },
  { id: 'rose', x: 990, y: 320 },
  { id: 'andri', x: 580, y: 620 },
  { id: 'melinda', x: 1040, y: 630 },
  { id: 'yuki', x: 790, y: 630 },
];

const GREENHOUSE_NPCS: NpcSpot[] = [
  { id: 'fanisa', x: 755, y: 330 }, { id: 'lemma', x: 1110, y: 565 }, { id: 'helina', x: 470, y: 685 },
];
const RELAY_NPCS: NpcSpot[] = [
  { id: 'rinda', x: 755, y: 300 }, { id: 'tony', x: 1000, y: 690 }, { id: 'santi', x: 710, y: 820 },
];
const WORKSHOP_NPCS: NpcSpot[] = [
  { id: 'christ', x: 500, y: 310 }, { id: 'budi', x: 1015, y: 610 }, { id: 'dzuky', x: 760, y: 880 },
];
const LODGE_NPCS: NpcSpot[] = [
  { id: 'eric', x: 760, y: 525 }, { id: 'yanto', x: 500, y: 560 }, { id: 'jesfer_normal', x: 1010, y: 560 },
];
const COTTAGE_NPCS: NpcSpot[] = [
  { id: 'jesfer_clown', x: 745, y: 380 }, { id: 'olimar', x: 480, y: 700 }, { id: 'wilson_model', x: 925, y: 760 },
];

const MAP_NPCS: Record<WorldMapId, NpcSpot[]> = {
  indoor: INDOOR_NPCS,
  outdoor: OUTDOOR_NPC_SPOTS,
  greenhouse: GREENHOUSE_NPCS,
  relay: RELAY_NPCS,
  workshop: WORKSHOP_NPCS,
  lodge: LODGE_NPCS,
  cottage: COTTAGE_NPCS,
};

const OUTDOOR_SPAWN = { x: 335, y: 330 };
const INDOOR_EXIT = { x: 752, y: 958, radius: 55 };
const OUTDOOR_HALL_DOOR = { x: 335, y: 305, radius: 76 };
const INTERIOR_EXIT = { x: 768, y: 930, radius: 78 };

const MAP_SPAWNS: Record<WorldMapId, TacticalPosition> = {
  indoor: { x: SPAWN.x, y: SPAWN.y },
  outdoor: OUTDOOR_SPAWN,
  greenhouse: { x: 768, y: 880 }, relay: { x: 768, y: 880 },
  workshop: { x: 768, y: 880 }, lodge: { x: 768, y: 900 }, cottage: { x: 768, y: 885 },
};

const OUTDOOR_RETURN_SPAWNS: Partial<Record<WorldMapId, TacticalPosition>> = {
  indoor: { x: 335, y: 330 }, lodge: { x: 1250, y: 640 }, relay: { x: 1225, y: 325 },
  cottage: { x: 1240, y: 945 }, workshop: { x: 340, y: 915 }, greenhouse: { x: 810, y: 920 },
};

const OUTDOOR_ROOMS: Room[] = [
  { name: 'Incident Command Courtyard', x1: 150, y1: 40, x2: 650, y2: 425 },
  { name: 'Network Relay Trail', x1: 1040, y1: 45, x2: 1450, y2: 350 },
  { name: 'Raft Lodge Woodland', x1: 1070, y1: 350, x2: 1430, y2: 660 },
  { name: 'Saga Workshop Yard', x1: 190, y1: 620, x2: 560, y2: 970 },
  { name: 'Oakheart Greenhouse Garden', x1: 620, y1: 610, x2: 990, y2: 980 },
  { name: 'DLQ Cottage Trail', x1: 1060, y1: 680, x2: 1440, y2: 980 },
  { name: 'Oakheart Loop Trail', x1: 250, y1: 280, x2: 1190, y2: 760 },
];

const ROOMS: Room[] = [
  { name: 'Server Vault', x1: 20, y1: 20, x2: 430, y2: 360 },
  { name: 'Security Watch', x1: 20, y1: 362, x2: 430, y2: 648 },
  { name: 'Archive Library', x1: 20, y1: 650, x2: 500, y2: 995 },
  { name: 'Data Garden', x1: 1056, y1: 20, x2: 1520, y2: 358 },
  { name: 'Briefing Room', x1: 1056, y1: 360, x2: 1520, y2: 652 },
  { name: 'Pantry Lounge', x1: 1004, y1: 654, x2: 1520, y2: 995 },
  { name: 'North Command', x1: 440, y1: 20, x2: 1056, y2: 210 },
  { name: 'Arrival Hall', x1: 490, y1: 700, x2: 1012, y2: 1005 },
  { name: 'Central Operations', x1: 440, y1: 186, x2: 1065, y2: 700 },
];

const INTERACTABLES: Interactable[] = [
  { id: 'server', x: 230, y: 250, radius: 78, label: 'Inspect server telemetry', message: 'Server Vault: replication healthy · one warm standby node.' },
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

// Walkability comes straight from the generated mask (tools/build_campus_layout.py),
// so the collision shape is exactly the floor that is drawn.
let collisionMask: Uint8Array | null = null;

const isWalkable = (x: number, y: number) => {
  if (!collisionMask) return false;
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= WORLD_WIDTH || py >= WORLD_HEIGHT) return false;
  return collisionMask[py * WORLD_WIDTH + px] === 1;
};

const pointInsideCollider = (x: number, y: number, collider: { x1: number; y1: number; x2: number; y2: number; shape?: string }) => {
  if (collider.shape !== 'ellipse') return inside(x, y, collider);
  const centerX = (collider.x1 + collider.x2) / 2;
  const centerY = (collider.y1 + collider.y2) / 2;
  const radiusX = Math.max(1, (collider.x2 - collider.x1) / 2);
  const radiusY = Math.max(1, (collider.y2 - collider.y1) / 2);
  const nx = (x - centerX) / radiusX;
  const ny = (y - centerY) / radiusY;
  return nx * nx + ny * ny <= 1;
};

const isExtraMapBlocked = (map: Exclude<WorldMapId, 'indoor'>, x: number, y: number) => {
  const data = EXTRA_MAP_COLLIDERS[map];
  if (!data) return true;
  const footY = y + FOOT_OFFSET_Y;
  for (const [dx, dy] of FOOT_PROBES) {
    const probeX = x + dx * FOOT_RADIUS_X;
    const probeY = footY + dy * FOOT_RADIUS_Y;
    if (!data.floors.some((floor) => pointInsideCollider(probeX, probeY, floor))) return true;
    if (data.obstacles.some((obstacle) => pointInsideCollider(probeX, probeY, obstacle))) return true;
  }
  return false;
};

const isBlocked = (map: WorldMapId, x: number, y: number) => {
  if (map !== 'indoor') return isExtraMapBlocked(map, x, y);
  const footY = y + FOOT_OFFSET_Y;
  for (const [dx, dy] of FOOT_PROBES) {
    if (!isWalkable(x + dx * FOOT_RADIUS_X, footY + dy * FOOT_RADIUS_Y)) return true;
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

const simplifyPath = (points: TacticalPosition[]) => {
  if (points.length < 3) return points;
  const result = [points[0]];
  let previousDirection = {
    x: Math.sign(points[1].x - points[0].x),
    y: Math.sign(points[1].y - points[0].y),
  };
  for (let index = 1; index < points.length - 1; index += 1) {
    const direction = {
      x: Math.sign(points[index + 1].x - points[index].x),
      y: Math.sign(points[index + 1].y - points[index].y),
    };
    if (direction.x !== previousDirection.x || direction.y !== previousDirection.y) result.push(points[index]);
    previousDirection = direction;
  }
  result.push(points[points.length - 1]);
  return result;
};

const findPath = (map: WorldMapId, start: TacticalPosition, goal: TacticalPosition) => {
  if (isBlocked(map, goal.x, goal.y)) return [];
  const startGrid = nearestOpenGridPoint(map, start);
  const goalGrid = nearestOpenGridPoint(map, goal);
  if (!startGrid || !goalGrid) return [];

  const startKey = gridKey(startGrid.x, startGrid.y);
  const goalKey = gridKey(goalGrid.x, goalGrid.y);
  const open = [{ ...startGrid, g: 0, f: Math.hypot(goalGrid.x - startGrid.x, goalGrid.y - startGrid.y) }];
  const scores = new Map<string, number>([[startKey, 0]]);
  const parents = new Map<string, string>();
  const closed = new Set<string>();
  const directions = [
    { x: 1, y: 0, cost: 1 }, { x: -1, y: 0, cost: 1 },
    { x: 0, y: 1, cost: 1 }, { x: 0, y: -1, cost: 1 },
    { x: 1, y: 1, cost: Math.SQRT2 }, { x: -1, y: 1, cost: Math.SQRT2 },
    { x: 1, y: -1, cost: Math.SQRT2 }, { x: -1, y: -1, cost: Math.SQRT2 },
  ];

  for (let iteration = 0; open.length && iteration < 30000; iteration += 1) {
    open.sort((a, b) => b.f - a.f);
    const current = open.pop();
    if (!current) break;
    const currentKey = gridKey(current.x, current.y);
    if (closed.has(currentKey)) continue;
    if (currentKey === goalKey) {
      const route: TacticalPosition[] = [gridPoint(current.x, current.y)];
      let cursor = currentKey;
      while (parents.has(cursor)) {
        cursor = parents.get(cursor)!;
        const [x, y] = cursor.split(',').map(Number);
        route.push(gridPoint(x, y));
      }
      route.reverse();
      route.shift();
      route.push(goal);
      return simplifyPath(route);
    }
    closed.add(currentKey);

    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const world = gridPoint(next.x, next.y);
      if (isBlocked(map, world.x, world.y)) continue;
      if (direction.x !== 0 && direction.y !== 0) {
        const horizontal = gridPoint(current.x + direction.x, current.y);
        const vertical = gridPoint(current.x, current.y + direction.y);
        if (isBlocked(map, horizontal.x, horizontal.y) || isBlocked(map, vertical.x, vertical.y)) continue;
      }
      const nextKey = gridKey(next.x, next.y);
      const tentativeScore = current.g + direction.cost;
      if (tentativeScore >= (scores.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
      scores.set(nextKey, tentativeScore);
      parents.set(nextKey, currentKey);
      const heuristic = Math.hypot(goalGrid.x - next.x, goalGrid.y - next.y);
      open.push({ ...next, g: tentativeScore, f: tentativeScore + heuristic });
    }
  }
  return [];
};

const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => resolve(image);
  image.src = source;
});

const readCollisionMask = (image: HTMLImageElement) => {
  if (!image.complete || !image.naturalWidth) return false;
  const buffer = document.createElement('canvas');
  buffer.width = WORLD_WIDTH;
  buffer.height = WORLD_HEIGHT;
  const context = buffer.getContext('2d', { willReadFrequently: true });
  if (!context) return false;
  context.drawImage(image, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  const { data } = context.getImageData(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  const mask = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT);
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = data[index * 4] > 127 ? 1 : 0;
  }
  collisionMask = mask;
  return true;
};

// Without the mask every wall would be open, so keep retrying rather than
// letting the room come up in a state where the avatar walks through anything.
const loadCollisionMask = async () => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const suffix = attempt === 0 ? '' : `?retry=${attempt}`;
    if (readCollisionMask(await loadImage(`/game-assets/campus-collision.png${suffix}`))) return true;
  }
  console.error('[OpsWArd] campus-collision.png could not be read - movement stays locked.');
  return false;
};

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
    pending.push(loadImage('/game-assets/campus-occluder.png').then((image) => {
      assetsRef.current.occluderMask = image;
    }));
    pending.push(loadCollisionMask());
    RESPONDER_ROSTER.forEach((character) => {
      pending.push(
        loadImage(`/game-assets/characters-aligned/${character.id}-walk-4x4.png`)
          .then((image) => { assetsRef.current.sprites[character.id] = image; }),
      );
    });
    Promise.all(pending).then(() => { if (!cancelled && collisionMask) setAssetsReady(true); });
    return () => { cancelled = true; };
  }, []);

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
      }

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

      const position = positionRef.current;
      const playerSheet = assetsRef.current.sprites[selectedAvatar.id];
      const playerFrame = movingRef.current ? Math.floor(stepPhaseRef.current / 22) % 4 : 0;
      const playerRow = directionRow[directionRef.current];
      const view = { x1: cameraX, y1: cameraY, x2: cameraX + VIEW_WIDTH, y2: cameraY + VIEW_HEIGHT };

      const depthQueue: { baseline: number; draw: () => void }[] = [];
      currentNpcs.forEach((npc, index) => {
        depthQueue.push({ baseline: npc.y, draw: () => drawNpc(npc, now, index) });
      });

      const occluderLayer = occluderLayerRef.current;
      let hiddenByFurniture = false;
      if (currentMap === 'indoor' && occluderLayer && occluderFrameRef.current >= 0) {
        const { drawSize, anchorY } = getSpriteMetrics(currentMap);
        const playerBox = {
          x1: position.x - drawSize / 4,
          y1: position.y - anchorY + 6,
          x2: position.x + drawSize / 4,
          y2: position.y + 10,
        };
        OCCLUDERS.forEach((object) => {
          if (object.x > view.x2 || object.x + object.width < view.x1) return;
          if (object.y > view.y2 || object.y + object.height < view.y1) return;
          if (
            object.through
            && object.baseline > position.y
            && object.x < playerBox.x2 && object.x + object.width > playerBox.x1
            && object.y < playerBox.y2 && object.y + object.height > playerBox.y1
          ) {
            hiddenByFurniture = true;
          }
          depthQueue.push({
            baseline: object.baseline,
            draw: () => context.drawImage(
              occluderLayer,
              object.x, object.y, object.width, object.height,
              object.x, object.y, object.width, object.height,
            ),
          });
        });
      }

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

      // Tucked behind a shelf the avatar would vanish entirely, so leave a
      // readable silhouette on top of whatever is covering them.
      if (hiddenByFurniture && playerSheet?.complete && playerSheet.naturalWidth) {
        drawGradedSprite(playerSheet, playerFrame, playerRow, position.x, position.y, 0.24);
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
      context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
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
