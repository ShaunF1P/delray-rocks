import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Step 1: Client calls this to get a resumable upload URL from Google
export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  try {
    const { fileSize, mimeType } = await request.json();

    const startRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(fileSize),
          'X-Goog-Upload-Header-Content-Type': mimeType || 'video/mp4',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { display_name: 'game-film-analysis' } }),
      }
    );

    if (!startRes.ok) {
      const err = await startRes.text();
      return NextResponse.json({ error: `File API start failed: ${err}` }, { status: 500 });
    }

    const uploadUrl = startRes.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) {
      return NextResponse.json({ error: 'No upload URL returned' }, { status: 500 });
    }

    return NextResponse.json({ uploadUrl, apiKey: GEMINI_API_KEY });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
