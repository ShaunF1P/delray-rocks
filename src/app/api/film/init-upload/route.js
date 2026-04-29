import { NextResponse } from 'next/server';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import path from 'path';
import os from 'os';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  let tempFilePath = null;

  try {
    const { videoUrl } = await request.json();
    if (!videoUrl) return NextResponse.json({ error: 'videoUrl required' }, { status: 400 });

    // 1. Download video from Supabase to temp file (stream to disk, not memory)
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error('Cannot access video from storage');

    const mimeType = videoRes.headers.get('content-type') || 'video/mp4';
    const tempDir = path.join(os.tmpdir(), 'delray-films');
    await mkdir(tempDir, { recursive: true });
    tempFilePath = path.join(tempDir, `film-${Date.now()}.mp4`);

    // Stream to disk (avoids loading 822MB into memory)
    const nodeStream = Readable.fromWeb(videoRes.body);
    const fileStream = createWriteStream(tempFilePath);
    await pipeline(nodeStream, fileStream);

    // 2. Upload to Google using official SDK
    const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType,
      displayName: 'game-film-analysis',
    });

    // 3. Poll until Google finishes processing
    let file = uploadResult.file;
    while (file.state === FileState.PROCESSING) {
      await new Promise(r => setTimeout(r, 5000));
      const statusResult = await fileManager.getFile(file.name);
      file = statusResult;
    }

    if (file.state === FileState.FAILED) {
      throw new Error('Google video processing failed');
    }

    // 4. Clean up temp file
    await unlink(tempFilePath).catch(() => {});

    return NextResponse.json({
      fileUri: file.uri,
      mimeType: file.mimeType || mimeType,
      fileName: file.name,
    });
  } catch (err) {
    // Clean up on error
    if (tempFilePath) await unlink(tempFilePath).catch(() => {});
    console.error('Upload proxy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
