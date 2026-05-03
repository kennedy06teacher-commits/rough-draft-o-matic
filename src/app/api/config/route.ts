import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import type { AssignmentConfig } from '@/types/config';

export const dynamic = 'force-dynamic';

const CONFIG_KEY = 'assignment_config';

function getRedis() {
  // Vercel's Upstash integration may use either naming convention
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
