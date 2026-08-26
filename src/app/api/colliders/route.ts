import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const COLLIDERS_PATH = path.join(process.cwd(), 'src', 'lib', 'campus-colliders.json');

export async function GET() {
  try {
    if (fs.existsSync(COLLIDERS_PATH)) {
      const data = JSON.parse(fs.readFileSync(COLLIDERS_PATH, 'utf-8'));
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
    const { floors, obstacles } = body;

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

    fs.writeFileSync(COLLIDERS_PATH, JSON.stringify(data, null, 2), 'utf-8');

    // Run build_campus_layout.py to re-bake collision mask and layout json
    const { stdout, stderr } = await execPromise('python tools/build_campus_layout.py', { cwd: process.cwd() });

    return NextResponse.json({
      success: true,
      message: 'Colliders saved and campus collision rebuilt successfully!',
      output: stdout,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
