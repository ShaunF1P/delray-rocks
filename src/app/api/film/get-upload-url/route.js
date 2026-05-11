import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';

/* ── Returns a Google resumable upload URI to the CLIENT ──────────
   The browser uploads the video DIRECTLY to Google.
   No Vercel timeout. No disk. No RAM limit.                       */

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  try {
    const { fileSize, mimeType, displayName } = await request.json();
    if (!fileSize) return NextResponse.json({ error: 'fileSize required' }, { status: 400 });

    const initRes = await fetch(`${GEMINI_UPLOAD_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(fileSize),
        'X-Goog-Upload-Header-Content-Type': mimeType || 'video/mp4',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { displayName: displayName || 'game-film' } }),
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`Google upload init failed: ${initRes.status} ${errText}`);
    }

    const uploadUri = initRes.headers.get('x-goog-upload-url');
    if (!uploadUri) throw new Error('No upload URI returned from Google');

    return NextResponse.json({ uploadUri });
  } catch (err) {
    console.error('Get upload URL error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
