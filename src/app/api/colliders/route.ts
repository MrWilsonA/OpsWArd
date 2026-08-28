import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import campusColliders from '@/lib/campus-colliders.json';
import { EXTRA_MAP_COLLIDERS, WorldMapId } from '@/lib/world-maps';

export const dynamic = 'force-dynamic';

const execPromise = util.promisify(exec);
const MAP_IDS = new Set(['indoor', 'outdoor', 'greenhouse', 'relay', 'workshop', 'lodge', 'cottage']);

const getCollidersPath = (mapId: string) => mapId === 'indoor'
  ? path.join(process.cwd(), 'src', 'lib', 'campus-colliders.json')
  : path.join(process.cwd(), 'src', 'lib', 'map-colliders', `${mapId}.json`);

type ColliderMap = {
  floors: unknown[];
  obstacles: unknown[];
};

const bundledColliders = (mapId: WorldMapId): ColliderMap => (
  mapId === 'indoor'
    ? campusColliders
    : EXTRA_MAP_COLLIDERS[mapId] ?? { floors: [], obstacles: [] }
) as ColliderMap;

const isUsableColliderMap = (value: unknown): value is ColliderMap => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ColliderMap>;
  return Array.isArray(candidate.floors)
    && candidate.floors.length > 0
    && Array.isArray(candidate.obstacles);
};

export async function GET(req: NextRequest) {
  try {
    let mapId = 'indoor';
    try {
      const url = new URL(req.url);
      mapId = url.searchParams.get('map') || 'indoor';
    } catch {
      mapId = req.nextUrl?.searchParams?.get('map') || 'indoor';
    }

    if (!MAP_IDS.has(mapId)) return NextResponse.json({ error: 'Unknown map' }, { status: 400 });
    const worldMapId = mapId as WorldMapId;
    const collidersPath = getCollidersPath(worldMapId);
    if (fs.existsSync(collidersPath)) {
      const raw = fs.readFileSync(collidersPath, 'utf-8');
      const data = JSON.parse(raw);
      if (isUsableColliderMap(data)) return NextResponse.json(data);
    }

    // The production image may not expose editable source files. The JSON
    // imports are bundled by Next.js, so movement and the editor still receive
    // the authored collider map instead of a successful-but-empty response.
    const fallback = bundledColliders(worldMapId);
    if (!isUsableColliderMap(fallback)) {
      return NextResponse.json({ error: `No usable colliders for ${worldMapId}` }, { status: 500 });
    }
    return NextResponse.json(fallback, {
      headers: { 'X-OpsWard-Collider-Source': 'bundled-fallback' },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { floors, obstacles, mapId = 'indoor' } = body;

    if (!MAP_IDS.has(mapId)) return NextResponse.json({ error: 'Unknown map' }, { status: 400 });

    if (!Array.isArray(floors) || floors.length === 0 || !Array.isArray(obstacles)) {
      return NextResponse.json({ error: 'Invalid payload: at least one floor and an obstacles array are required' }, { status: 400 });
    }

    const data = {
      floors: floors.map((f: any) => ({
        x1: Math.round(Number(f.x1)),
        y1: Math.round(Number(f.y1)),
        x2: Math.round(Number(f.x2)),
        y2: Math.round(Number(f.y2)),
      })),
      obstacles: obstacles.map((ob: any) => ({
        id: String(ob.id || 'obstacle'),
        x1: Math.round(Number(ob.x1)),
        y1: Math.round(Number(ob.y1)),
        x2: Math.round(Number(ob.x2)),
        y2: Math.round(Number(ob.y2)),
        shape: ob.shape === 'ellipse' ? 'ellipse' : 'rect',
        through: Boolean(ob.through),
        base: ob.base !== undefined ? Number(ob.base) : undefined,
        occlude: ob.occlude !== false,
      })),
    };

    const collidersPath = getCollidersPath(mapId);
    fs.mkdirSync(path.dirname(collidersPath), { recursive: true });
    fs.writeFileSync(collidersPath, JSON.stringify(data, null, 2), 'utf-8');

    // Only the legacy indoor hall uses a baked pixel mask. Other maps consume
    // their authored collider JSON directly after reload.
    let stdout = `${mapId} collider JSON saved.`;
    const indoorBuildScript = path.join(process.cwd(), 'tools', 'build_campus_layout.py');
    if (mapId === 'indoor' && fs.existsSync(indoorBuildScript)) {
      const result = await execPromise(`python "${indoorBuildScript}"`, { cwd: process.cwd() });
      stdout = result.stdout;
    }

    return NextResponse.json({
      success: true,
      message: mapId === 'indoor' && fs.existsSync(indoorBuildScript)
        ? 'Colliders saved and campus collision rebuilt successfully!'
        : 'Colliders saved and applied successfully!',
      output: stdout,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
