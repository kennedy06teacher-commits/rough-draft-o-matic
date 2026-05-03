import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import type { AssignmentConfig } from '@/types/config';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readConfig(): AssignmentConfig | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({ config: readConfig() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  ensureDir();
  const config: AssignmentConfig = {
    prompt: String(body.prompt || '').trim(),
    rubric: String(body.rubric || '').trim(),
    exemplars: (Array.isArray(body.exemplars) ? body.exemplars : [])
      .map((e: unknown) => String(e || '').trim())
      .filter(Boolean),
    assignmentPdfFilename: String(body.assignmentPdfFilename || '').trim() || undefined,
    lastUpdated: new Date().toISOString(),
  };
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  return NextResponse.json({ success: true, config });
}

export async function DELETE() {
  ensureDir();
  const empty: AssignmentConfig = { prompt: '', rubric: '', exemplars: [] };
  writeFileSync(CONFIG_PATH, JSON.stringify(empty, null, 2), 'utf-8');
  return NextResponse.json({ success: true });
}
