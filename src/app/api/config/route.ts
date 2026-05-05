import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import type { AssignmentConfig, AssignmentsStore } from '@/types/config';

export const dynamic = 'force-dynamic';

const ASSIGNMENTS_KEY = 'assignments';

function getRedis() {
  const url = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)?.trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)?.trim();
  if (!url || !token) {
    throw new Error(
      'Redis credentials not found. In Vercel: Settings → Environment Variables → verify ' +
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN exist and are enabled for Production.'
    );
  }
  return new Redis({ url, token });
}

export async function GET() {
  try {
    const redis = getRedis();
    const assignments = await redis.get<AssignmentsStore>(ASSIGNMENTS_KEY);
    return NextResponse.json({ assignments: assignments ?? {} }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[config GET] error:', message);
    return NextResponse.json({ assignments: {}, error: message }, { status: 500 });
  }
}

// Body: { id, name, prompt, rubric, exemplars, assignmentPdfFilename? }
export async function POST(req: NextRequest) {
  try {
    const redis = getRedis();
    const body = await req.json();
    const id = String(body.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Assignment id is required.' }, { status: 400 });
    }
    const assignments = (await redis.get<AssignmentsStore>(ASSIGNMENTS_KEY)) ?? {};
    const config: AssignmentConfig = {
      name: String(body.name || '').trim() || id,
      prompt: String(body.prompt || '').trim(),
      rubric: String(body.rubric || '').trim(),
      exemplars: (Array.isArray(body.exemplars) ? body.exemplars : [])
        .map((e: unknown) => String(e || '').trim())
        .filter(Boolean),
      assignmentPdfFilename: String(body.assignmentPdfFilename || '').trim() || undefined,
      lastUpdated: new Date().toISOString(),
    };
    assignments[id] = config;
    await redis.set(ASSIGNMENTS_KEY, assignments);
    return NextResponse.json({ success: true, id, config });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[config POST] error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Query: ?id={assignmentId}
export async function DELETE(req: NextRequest) {
  try {
    const redis = getRedis();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Assignment id is required.' }, { status: 400 });
    }
    const assignments = (await redis.get<AssignmentsStore>(ASSIGNMENTS_KEY)) ?? {};
    if (!assignments[id]) {
      return NextResponse.json({ success: false, error: 'Assignment not found.' }, { status: 404 });
    }
    delete assignments[id];
    await redis.set(ASSIGNMENTS_KEY, assignments);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[config DELETE] error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
