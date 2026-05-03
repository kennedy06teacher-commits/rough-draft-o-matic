import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
    }

    const publicDir = path.join(process.cwd(), 'public');
    if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

    // Sanitize filename: keep only safe characters
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const dest = path.join(publicDir, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(dest, buffer);

    return NextResponse.json({ filename: safeName });
  } catch (err) {
    console.error('[upload-pdf error]', err);
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
