import { NextResponse } from 'next/server';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { unlink, mkdir, stat } from 'fs/promises';
import { execFile } from 'child_process';
import path from 'path';
import os from 'os';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/* ── FFmpeg binary resolution ─────────────────────────────────────
   Works on Vercel (linux) and local dev (win32).                 */
function getFFmpegPath() {
  if (process.platform === 'win32') {
    return path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe');
  }
  // Linux (Vercel serverless)
  return path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'linux-x64', 'ffmpeg');
}

/* ── Trim a clip using FFmpeg reading DIRECTLY from URL ───────────
   FFmpeg fetches only the bytes it needs from the Supabase URL.
   The full video is NEVER downloaded to disk.                     */
function trimFromUrl(videoUrl, outputPath, startSeconds, endSeconds) {
  return new Promise((resolve, reject) => {
    const duration = endSeconds - startSeconds;
    const ffmpegPath = getFFmpegPath();
    execFile(ffmpegPath, [
      '-y',
      '-ss', String(startSeconds),
      '-i', videoUrl,            // Read directly from URL — no local download
      '-t', String(duration),
      '-c', 'copy',
      '-avoid_negative_ts', 'make_zero',
      '-movflags', '+faststart',
      outputPath,
    ], { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`FFmpeg error: ${error.message}\n${stderr}`));
      else resolve();
    });
  });
}

/* ── Upload a small file to Gemini via the SDK ────────────────── */
async function uploadToGemini(filePath, mimeType, displayName) {
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType,
    displayName,
  });

  // Poll until Google finishes processing
  let file = uploadResult.file;
  while (file.state === FileState.PROCESSING) {
    await new Promise(r => setTimeout(r, 5000));
    file = await fileManager.getFile(file.name);
  }

  if (file.state === FileState.FAILED) {
    throw new Error('Google video processing failed');
  }

  return file;
}

/* ── Clean temp directory ─────────────────────────────────────── */
async function cleanTempDir(tempDir) {
  try {
    const { readdir } = await import('fs/promises');
    const files = await readdir(tempDir);
    for (const f of files) {
      await unlink(path.join(tempDir, f)).catch(() => {});
    }
  } catch {}
}

// Increase serverless timeout for video processing
export const maxDuration = 60;

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  let clipPath = null;

  try {
    const { videoUrl, clipStart, clipEnd } = await request.json();
    if (!videoUrl) return NextResponse.json({ error: 'videoUrl required' }, { status: 400 });

    const isClip = clipStart != null && clipEnd != null;

    if (!isClip) {
      return NextResponse.json(
        { error: 'Please create a clip (set start/end times) before analyzing. Full-video analysis is not supported in cloud mode.' },
        { status: 400 }
      );
    }

    const clipDuration = clipEnd - clipStart;
    if (clipDuration > 120) {
      return NextResponse.json(
        { error: 'Clip too long — max 2 minutes. Use shorter segments for best analysis quality.' },
        { status: 400 }
      );
    }

    // 1. Prepare temp directory (only holds the small trimmed clip)
    const tempDir = path.join(os.tmpdir(), 'delray-films');
    await mkdir(tempDir, { recursive: true });
    await cleanTempDir(tempDir);

    clipPath = path.join(tempDir, `clip-${Date.now()}.mp4`);

    // 2. FFmpeg reads directly from the Supabase URL — only downloads the clip bytes
    console.log(`Trimming clip from URL: ${clipStart}s to ${clipEnd}s (${clipDuration}s)`);
    await trimFromUrl(videoUrl, clipPath, clipStart, clipEnd);

    // Verify clip was created and check size
    const clipStat = await stat(clipPath);
    console.log(`Clip created: ${(clipStat.size / 1024 / 1024).toFixed(1)}MB`);

    // 3. Upload the small clip to Gemini
    console.log('Uploading trimmed clip to Google...');
    const file = await uploadToGemini(
      clipPath,
      'video/mp4',
      `clip-${clipStart}s-to-${clipEnd}s`
    );

    // 4. Clean up
    await unlink(clipPath).catch(() => {});

    return NextResponse.json({
      fileUri: file.uri,
      mimeType: file.mimeType || 'video/mp4',
      fileName: file.name,
      trimmed: true,
    });
  } catch (err) {
    if (clipPath) await unlink(clipPath).catch(() => {});
    console.error('Upload proxy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
