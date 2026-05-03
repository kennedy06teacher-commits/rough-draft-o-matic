import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import type { AssignmentConfig } from '@/types/config';

const CONFIG_KEY = 'assignment_config';

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      `Missing Upstash env vars. UPSTASH_REDIS_REST_URL=${url ? 'set' : 'MISSING'}, UPSTASH_REDIS_REST_TOKEN=${token ? 'set' : 'MISSING'}`
    );
  }
  return new Redis({ url, token });
}

export async function GET() {
  try {
    const redis = getRedis();
    const config = await redis.get<AssignmentConfig>(CONFIG_KEY);
    return NextResponse.json({ config: config ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[config GET] error:', message);
    return NextResponse.json({ config: null, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const redis = getRedis();
    const body = await req.json();
    const config: AssignmentConfig = {
      prompt: String(body.prompt || '').trim(),
      rubric: String(body.rubric || '').trim(),
      exemplars: (Array.isArray(body.exemplars) ? body.exemplars : [])
        .map((e: unknown) => String(e || '').trim())
        .filter(Boolean),
      assignmentPdfFilename: String(body.assignmentPdfFilename || '').trim() || undefined,
      lastUpdated: new Date().toISOString(),
    };
    await redis.set(CONFIG_KEY, config);
    return NextResponse.json({ success: true, config });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[config POST] error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const redis = getRedis();
    await redis.del(CONFIG_KEY);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[config DELETE] error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
