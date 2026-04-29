import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Proxy: streams video from Supabase → Google File API (no buffering in memory)
export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  try {
    const { videoUrl } = await request.json();
    if (!videoUrl) return NextResponse.json({ error: 'videoUrl required' }, { status: 400 });

    // 1. HEAD request to get file size without downloading
    const headRes = await fetch(videoUrl, { method: 'HEAD' });
    if (!headRes.ok) throw new Error('Cannot access video URL');
    const fileSize = headRes.headers.get('content-length');
    const mimeType = headRes.headers.get('content-type') || 'video/mp4';

    // 2. Start resumable upload session with Google
    const startRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': fileSize,
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { display_name: 'game-film-analysis' } }),
      }
    );

    if (!startRes.ok) {
      const err = await startRes.text();
      throw new Error(`Google File API init failed: ${err}`);
    }

    const uploadUrl = startRes.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) throw new Error('No upload URL from Google');

    // 3. Stream video from Supabase directly to Google (no buffering)
    const videoStream = await fetch(videoUrl);
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': fileSize,
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: videoStream.body,
      duplex: 'half',
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Google upload failed: ${err}`);
    }

    const fileInfo = await uploadRes.json();
    const fileName = fileInfo.file?.name;

    // 4. Poll until Google finishes processing the video
    let fileState = fileInfo.file?.state || 'PROCESSING';
    let fileUri = fileInfo.file?.uri;
    let attempts = 0;

    while (fileState === 'PROCESSING' && attempts < 120) {
      await new Promise(r => setTimeout(r, 5000));
      const statusRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${GEMINI_API_KEY}`
      );
      const status = await statusRes.json();
      fileState = status.state;
      fileUri = status.uri;
      attempts++;
    }

    if (fileState !== 'ACTIVE') {
      throw new Error(`Video processing failed. State: ${fileState}`);
    }

    return NextResponse.json({ fileUri, mimeType, fileName });
  } catch (err) {
    console.error('Upload proxy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
