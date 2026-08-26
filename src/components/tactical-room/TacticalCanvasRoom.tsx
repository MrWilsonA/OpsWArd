'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterProfile, RESPONDER_ROSTER } from '@/lib/characters';
import { TacticalPosition } from '@/types/opsward';
import campusLayout from '@/lib/campus-layout.json';
import { Clock3, Coffee, Gamepad2, Headphones, Leaf, MapPin, Radio, Sparkles, Users, Volume2, VolumeX } from 'lucide-react';

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
type Interactable = { id: string; x: number; y: number; radius: number; label: string; message: string };
type Occluder = { id: string; x: number; y: number; width: number; height: number; baseline: number; through: boolean };

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;
const WORLD_WIDTH = campusLayout.world.width;
const WORLD_HEIGHT = campusLayout.world.height;
const OCCLUDERS = campusLayout.occluders as Occluder[];
const SPAWN = campusLayout.spawn;

// The avatar collides with an ellipse under its feet rather than a circle around
// its middle, which is what a top-down room actually reads like.
const FOOT_RADIUS_X = 9;
const FOOT_RADIUS_Y = 6;
const FOOT_OFFSET_Y = 4;
const FOOT_PROBES: [number, number][] = [
  [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71],
];

const NPC_RADIUS_X = 13;
const NPC_RADIUS_Y = 9;

const SPRITE_SIZE = 64;
const SPRITE_ANCHOR_Y = 52;
const WALK_SPEED = 148;
const NAV_GRID = 8;
const CAMPUS_FRAME_COUNT = 10;
const CAMPUS_FRAME_DURATION = 150;

const COMMAND_TABLE = { x: 753, y: 522, radius: 190 };

const NPCS = [
  { id: 'james', x: 350, y: 300 },
  { id: 'enjidiren', x: 1110, y: 300 },
  { id: 'miria', x: 350, y: 530 },
  { id: 'george', x: 1130, y: 600 },
  { id: 'theresa', x: 640, y: 830 },
  { id: 'nuying', x: 880, y: 830 },
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

const directionRow: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const inside = (x: number, y: number, rect: Rect) => x >= rect.x1 && x <= rect.x2 && y >= rect.y1 && y <= rect.y2;
const getRoomName = ({ x, y }: TacticalPosition) => ROOMS.find((room) => inside(x, y, room))?.name ?? 'Oakheart Corridor';

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

const isBlocked = (x: number, y: number) => {
  const footY = y + FOOT_OFFSET_Y;
  for (const [dx, dy] of FOOT_PROBES) {
    if (!isWalkable(x + dx * FOOT_RADIUS_X, footY + dy * FOOT_RADIUS_Y)) return true;
  }
  // Crew members take up space too - just enough that you bump into them
  // instead of standing inside them.
  for (const npc of NPCS) {
    const offsetX = (x - npc.x) / NPC_RADIUS_X;
    const offsetY = (footY - npc.y - FOOT_OFFSET_Y) / NPC_RADIUS_Y;
    if (offsetX * offsetX + offsetY * offsetY < 1) return true;
  }
  return false;
};

const gridKey = (x: number, y: number) => `${x},${y}`;
const gridPoint = (x: number, y: number): TacticalPosition => ({ x: x * NAV_GRID, y: y * NAV_GRID });

const nearestOpenGridPoint = (point: TacticalPosition) => {
  const centerX = Math.round(point.x / NAV_GRID);
  const centerY = Math.round(point.y / NAV_GRID);
  for (let radius = 0; radius <= 14; radius += 1) {
    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        if (Math.max(Math.abs(x - centerX), Math.abs(y - centerY)) !== radius && radius !== 0) continue;
        const world = gridPoint(x, y);
        if (!isBlocked(world.x, world.y)) return { x, y };
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

const findPath = (start: TacticalPosition, goal: TacticalPosition) => {
  if (isBlocked(goal.x, goal.y)) return [];
  const startGrid = nearestOpenGridPoint(start);
  const goalGrid = nearestOpenGridPoint(goal);
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
      if (isBlocked(world.x, world.y)) continue;
      if (direction.x !== 0 && direction.y !== 0) {
        const horizontal = gridPoint(current.x + direction.x, current.y);
        const vertical = gridPoint(current.x, current.y + direction.y);
        if (isBlocked(horizontal.x, horizontal.y) || isBlocked(vertical.x, vertical.y)) continue;
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
    sprites: Record<string, HTMLImageElement>;
    occluderMask: HTMLImageElement | null;
  }>({ interiors: [], sprites: {}, occluderMask: null });
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
  const [assetsReady, setAssetsReady] = useState(false);
  const [playerPos, setPlayerPos] = useState<TacticalPosition>(positionRef.current);
  const [activeRoom, setActiveRoom] = useState('Arrival Hall');
  const [proximityRadius, setProximityRadius] = useState(170);
  const [isMuted, setIsMuted] = useState(false);
  const [showMesh, setShowMesh] = useState(false);
  const [nearbyInteractable, setNearbyInteractable] = useState<Interactable | null>(null);
  const [interactionNote, setInteractionNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    const pending: Promise<unknown>[] = [];
    for (let index = 0; index < CAMPUS_FRAME_COUNT; index += 1) {
      pending.push(
        loadImage(`/game-assets/campus-loop-frames/campus-${String(index).padStart(2, '0')}.png`)
          .then((image) => { assetsRef.current.interiors[index] = image; }),
      );
    }
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
  }, []);

  useEffect(() => {
    const nearby = NPCS.map((responder) => {
      const char = RESPONDER_ROSTER.find((candidate) => candidate.id === responder.id);
      if (!char) return null;
      const distance = Math.hypot(playerPos.x - responder.x, playerPos.y - responder.y);
      const volume = isPodiumBroadcasting ? 1 : Math.max(0, 1 - distance / proximityRadius);
      return { char, distance: Math.round(distance), volume: Number(volume.toFixed(2)) };
    }).filter(Boolean) as { char: CharacterProfile; distance: number; volume: number }[];
    onProximityChange(nearby);
  }, [isPodiumBroadcasting, onProximityChange, playerPos, proximityRadius]);

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
      context.drawImage(buffer, Math.round(x - SPRITE_SIZE / 2), Math.round(y - SPRITE_ANCHOR_Y));
      context.restore();
    };

    const drawNpc = (npc: typeof NPCS[number], now: number, index: number) => {
      const sheet = assetsRef.current.sprites[npc.id];
      if (!sheet?.complete || !sheet.naturalWidth) return;
      const bob = Math.round(Math.sin(now / 620 + index) * 1);
      drawContactShadow(npc.x, npc.y, 18, 0.44);
      drawGradedSprite(sheet, 0, 0, npc.x, npc.y + bob, 1);
    };

    const render = (now: number) => {
      const delta = Math.min(0.04, (now - previousTime) / 1000);
      previousTime = now;
      if (isBlocked(positionRef.current.x, positionRef.current.y)) {
        const safeGridPoint = nearestOpenGridPoint(positionRef.current);
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
        if (!isBlocked(current.x + stepX, current.y)) nextX += stepX;
        if (!isBlocked(nextX, current.y + stepY)) nextY += stepY;
        positionRef.current = { x: nextX, y: nextY };
        stepPhaseRef.current += Math.hypot(nextX - current.x, nextY - current.y);
      } else {
        stepPhaseRef.current = 0;
      }

      const atCommandTable = Math.hypot(
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
        setActiveRoom(getRoomName(positionRef.current));
        const nearest = INTERACTABLES
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
      const interior = assetsRef.current.interiors[campusFrame];
      if (interior?.complete) {
        context.drawImage(interior, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        refreshOccluderLayer(campusFrame, interior);
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
      NPCS.forEach((npc, index) => {
        depthQueue.push({ baseline: npc.y, draw: () => drawNpc(npc, now, index) });
      });

      const occluderLayer = occluderLayerRef.current;
      let hiddenByFurniture = false;
      if (occluderLayer && occluderFrameRef.current >= 0) {
        const playerBox = {
          x1: position.x - 16,
          y1: position.y - SPRITE_ANCHOR_Y + 6,
          x2: position.x + 16,
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
          drawContactShadow(position.x, position.y, 16 * settle, 0.48);
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
      context.fillStyle = `rgba(246, 164, 78, ${0.025 + daylight * 0.025})`;
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
    const clickedNpc = NPCS.find((npc) => Math.hypot(worldTarget.x - npc.x, worldTarget.y - npc.y) < 34);
    if (clickedNpc) {
      const character = RESPONDER_ROSTER.find((candidate) => candidate.id === clickedNpc.id);
      if (character) onAvatarSelect(character);
      return;
    }
    if (!isBlocked(worldTarget.x, worldTarget.y)) {
      const route = findPath(positionRef.current, worldTarget);
      pathRef.current = route;
      targetRef.current = pathRef.current.shift() ?? null;
      clickTargetRef.current = targetRef.current ? worldTarget : null;
    }
  };

  const nearbyCount = NPCS.filter((npc) => Math.hypot(playerPos.x - npc.x, playerPos.y - npc.y) <= proximityRadius).length;

  return (
    <section className="game-window overflow-hidden">
      <div className="game-window__header">
        <div className="flex min-w-0 items-center gap-3">
          <div className="pixel-crest"><Leaf className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="game-eyebrow">OPSWARD CAMPUS · MORNING SHIFT</p>
            <h2 className="truncate text-lg font-black tracking-tight text-[#4a2418]">Oakheart Operations Campus</h2>
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
          <button className={`game-icon-button ${showMesh ? 'is-active' : ''}`} onClick={() => setShowMesh((value) => !value)} title="Toggle proximity mesh"><Headphones className="h-4 w-4" /></button>
          <button className={`game-icon-button ${isMuted ? 'is-danger' : ''}`} onClick={() => setIsMuted((value) => !value)} title="Toggle microphone">{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
        </div>
      </div>

      <div className="game-canvas-wrap">
        {!assetsReady && <div className="absolute inset-0 z-10 grid place-items-center bg-[#2b1814] text-sm font-bold text-[#f5d78f]"><span><Sparkles className="mr-2 inline h-4 w-4 animate-pulse" />Preparing the campus…</span></div>}
        <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} onClick={handleCanvasClick} className="block h-full w-full cursor-crosshair" aria-label="Interactive multi-room pixel-art OpsWArd campus" />
        <div className="game-quest-card"><span className="game-eyebrow">TODAY&apos;S PRIORITY</span><strong>Stabilize payment gateway</strong><span>Explore the campus and meet the response crew</span></div>
        {nearbyInteractable && <div className="game-interaction-prompt"><kbd>E</kbd><span>{nearbyInteractable.label}</span></div>}
        {interactionNote && <div className="game-interaction-note">{interactionNote}</div>}
        {isPodiumBroadcasting && <div className="game-broadcast-toast"><Radio className="h-3.5 w-3.5" /> Central table broadcast active</div>}
      </div>

      <div className="game-control-bar">
        <div className="flex items-center gap-2 text-[#633924]"><Gamepad2 className="h-4 w-4" /><span><kbd>WASD</kbd> walk · click floor · <kbd>E</kbd> interact · click crew to switch</span></div>
        <div className="hidden items-center gap-2 sm:flex"><Coffee className="h-4 w-4 text-[#9e5730]" /><span>Spatial range</span><input type="range" min="100" max="260" value={proximityRadius} onChange={(event) => setProximityRadius(Number(event.target.value))} className="w-24 accent-[#b86a31]" /></div>
      </div>
    </section>
  );
};
