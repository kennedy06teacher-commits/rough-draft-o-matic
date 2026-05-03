import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import type { AssignmentConfig } from '@/types/config';

const redis = Redis.fromEnv();
const CONFIG_KEY = 'assignment_config';

export async function GET() {
  const config = await redis.get<AssignmentConfig>(CONFIG_KEY);
  return NextResponse.json({ config: config ?? null });
}

export async function POST(req: NextRequest) {
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
}

export async function DELETE() {
  await redis.del(CONFIG_KEY);
  return NextResponse.json({ success: true });
}
