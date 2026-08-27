import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

export const dynamic = 'force-dynamic';

const execPromise = util.promisify(exec);
const MAP_IDS = new Set(['indoor', 'outdoor', 'greenhouse', 'relay', 'workshop', 'lodge', 'cottage']);

const getCollidersPath = (mapId: string) => mapId === 'indoor'
  ? path.join(process.cwd(), 'src', 'lib', 'campus-colliders.json')
  : path.join(process.cwd(), 'src', 'lib', 'map-colliders', `${mapId}.json`);

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
    const collidersPath = getCollidersPath(mapId);
    if (fs.existsSync(collidersPath)) {
      const raw = fs.readFileSync(collidersPath, 'utf-8');
      const data = JSON.parse(raw);
      return NextResponse.json(data);
    }
    return NextResponse.json({ floors: [], obstacles: [] });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { floors, obstacles, mapId = 'indoor' } = body;

    if (!MAP_IDS.has(mapId)) return NextResponse.json({ error: 'Unknown map' }, { status: 400 });

    if (!Array.isArray(floors) || !Array.isArray(obstacles)) {
      return NextResponse.json({ error: 'Invalid payload: floors and obstacles must be arrays' }, { status: 400 });
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
    if (mapId === 'indoor') {
      const result = await execPromise('python tools/build_campus_layout.py', { cwd: process.cwd() });
      stdout = result.stdout;
    }

    return NextResponse.json({
      success: true,
      message: 'Colliders saved and campus collision rebuilt successfully!',
      output: stdout,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
