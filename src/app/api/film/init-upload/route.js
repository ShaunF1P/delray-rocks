import { NextResponse } from 'next/server';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { createWriteStream } from 'fs';
import { unlink, mkdir } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { execFile } from 'child_process';
import path from 'path';
import os from 'os';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Resolve the FFmpeg binary path from the npm package
const FFMPEG_PATH = path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe');

// Trim a video file using FFmpeg (stream-copy = instant, no re-encoding)
function trimVideo(inputPath, outputPath, startSeconds, endSeconds) {
  return new Promise((resolve, reject) => {
    const duration = endSeconds - startSeconds;
    execFile(FFMPEG_PATH, [
      '-y',
      '-ss', String(startSeconds),
      '-i', inputPath,
      '-t', String(duration),
      '-c', 'copy',
      '-avoid_negative_ts', 'make_zero',
      outputPath,
    ], (error, stdout, stderr) => {
      if (error) reject(new Error(`FFmpeg error: ${error.message}\n${stderr}`));
      else resolve();
    });
  });
}

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  let tempFilePath = null;
  let trimmedFilePath = null;

  try {
    const { videoUrl, clipStart, clipEnd } = await request.json();
    if (!videoUrl) return NextResponse.json({ error: 'videoUrl required' }, { status: 400 });

    const isClip = clipStart != null && clipEnd != null;

    // 1. Download video from Supabase to temp file (stream to disk)
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error('Cannot access video from storage');

    const mimeType = videoRes.headers.get('content-type') || 'video/mp4';
    const tempDir = path.join(os.tmpdir(), 'delray-films');
    await mkdir(tempDir, { recursive: true });
    tempFilePath = path.join(tempDir, `film-${Date.now()}.mp4`);

    const nodeStream = Readable.fromWeb(videoRes.body);
    const fileStream = createWriteStream(tempFilePath);
    await pipeline(nodeStream, fileStream);

    // 2. If this is a clip, trim with FFmpeg (instant stream-copy, no re-encoding)
    let uploadFilePath = tempFilePath;
    if (isClip) {
      trimmedFilePath = path.join(tempDir, `clip-${Date.now()}.mp4`);
      console.log(`Trimming clip: ${clipStart}s to ${clipEnd}s (${clipEnd - clipStart}s)`);
      await trimVideo(tempFilePath, trimmedFilePath, clipStart, clipEnd);
      uploadFilePath = trimmedFilePath;
      console.log('Clip trimmed successfully');
    }

    // 3. Upload to Google using official SDK
    console.log(`Uploading ${isClip ? 'trimmed clip' : 'full video'} to Google...`);
    const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
    const uploadResult = await fileManager.uploadFile(uploadFilePath, {
      mimeType,
      displayName: isClip ? `clip-${clipStart}s-to-${clipEnd}s` : 'game-film-full',
    });

    // 4. Poll until Google finishes processing
    let file = uploadResult.file;
    while (file.state === FileState.PROCESSING) {
      await new Promise(r => setTimeout(r, 5000));
      const statusResult = await fileManager.getFile(file.name);
      file = statusResult;
    }

    if (file.state === FileState.FAILED) {
      throw new Error('Google video processing failed');
    }

    // 5. Clean up temp files
    await unlink(tempFilePath).catch(() => {});
    if (trimmedFilePath) await unlink(trimmedFilePath).catch(() => {});

    return NextResponse.json({
      fileUri: file.uri,
      mimeType: file.mimeType || mimeType,
      fileName: file.name,
      trimmed: isClip,
    });
  } catch (err) {
    if (tempFilePath) await unlink(tempFilePath).catch(() => {});
    if (trimmedFilePath) await unlink(trimmedFilePath).catch(() => {});
    console.error('Upload proxy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
