import { NextResponse } from 'next/server';

export async function GET() {
  const vars = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'BLOB_READ_WRITE_TOKEN',
    'ANTHROPIC_API_KEY',
  ];

  const report = Object.fromEntries(
    vars.map((name) => [name, process.env[name] ? 'SET' : 'MISSING'])
  );

  return NextResponse.json(report);
}
