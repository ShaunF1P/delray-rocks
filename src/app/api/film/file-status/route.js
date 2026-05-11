import { NextResponse } from 'next/server';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/* ── Poll a Google file until it's done processing ─────────────── */

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  try {
    const { fileName } = await request.json();
    if (!fileName) return NextResponse.json({ error: 'fileName required' }, { status: 400 });

    const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
    const file = await fileManager.getFile(fileName);

    return NextResponse.json({
      state: file.state,
      uri: file.uri,
      mimeType: file.mimeType,
      name: file.name,
    });
  } catch (err) {
    console.error('File status error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
