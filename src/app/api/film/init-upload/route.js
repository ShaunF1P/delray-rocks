import { NextResponse } from 'next/server';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { unlink, mkdir, stat } from 'fs/promises';
import { execFile } from 'child_process';
import path from 'path';
import os from 'os';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';

/* ── FFmpeg binary resolution ─────────────────────────────────────
   Works on Vercel (linux) and local dev (win32).                 */
function getFFmpegPath() {
  if (process.platform === 'win32') {
    return path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe');
  }
  return path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'linux-x64', 'ffmpeg');
}

/* ── Trim a clip using FFmpeg reading DIRECTLY from URL ───────────
   FFmpeg fetches only the bytes it needs from the Supabase URL.   */
function trimFromUrl(videoUrl, outputPath, startSeconds, endSeconds) {
  return new Promise((resolve, reject) => {
    const duration = endSeconds - startSeconds;
    const ffmpegPath = getFFmpegPath();
    execFile(ffmpegPath, [
      '-y',
      '-ss', String(startSeconds),
      '-i', videoUrl,
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

/* ── Upload local file to Gemini via SDK ──────────────────────── */
async function uploadFileToGemini(filePath, mimeType, displayName) {
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
  const uploadResult = await fileManager.uploadFile(filePath, { mimeType, displayName });
  return pollUntilReady(uploadResult.file);
}

/* ── Stream full video from URL to Gemini (resumable upload) ─────
   Supabase → our server (pipe) → Google. No disk, no /tmp.
   Uses Google's resumable upload protocol:
   1. Start session → get upload URI
   2. Stream bytes directly from source URL to that URI            */
async function streamUploadToGemini(videoUrl, mimeType, displayName) {
  // Step 1: Fetch video from Supabase (streaming — not buffered)
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error('Cannot access video from storage');

  const contentLength = videoRes.headers.get('content-length');
  if (!contentLength) throw new Error('Video source did not provide content-length');

  const fileSize = parseInt(contentLength, 10);
  console.log(`Streaming ${(fileSize / 1024 / 1024).toFixed(1)}MB directly to Google...`);

  // Step 2: Initiate resumable upload session with Google
  const initRes = await fetch(`${GEMINI_UPLOAD_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(fileSize),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { displayName } }),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Failed to initiate upload: ${initRes.status} ${errText}`);
  }

  const uploadUri = initRes.headers.get('x-goog-upload-url');
  if (!uploadUri) throw new Error('No upload URI returned from Google');

  // Step 3: Read the full video body and upload in one shot
  // We buffer in memory since Vercel functions have ~1-4GB RAM (more than /tmp)
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

  const uploadRes = await fetch(uploadUri, {
    method: 'POST',
    headers: {
      'Content-Length': String(fileSize),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Upload failed: ${uploadRes.status} ${errText}`);
  }

  const result = await uploadRes.json();
  const file = result.file;

  return pollUntilReady(file);
}

/* ── Poll Google until the file is processed ──────────────────── */
async function pollUntilReady(file) {
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  while (file.state === FileState.PROCESSING || file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 5000));
    file = await fileManager.getFile(file.name);
  }

  if (file.state === FileState.FAILED || file.state === 'FAILED') {
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

// Max serverless timeout (Vercel Hobby = 60s, Pro = 300s)
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

    if (isClip) {
      /* ── CLIP MODE ──────────────────────────────────────────────
         FFmpeg reads from URL, writes only the small clip to /tmp */
      const clipDuration = clipEnd - clipStart;
      if (clipDuration > 120) {
        return NextResponse.json(
          { error: 'Clip too long — max 2 minutes. Use shorter segments for best analysis quality.' },
          { status: 400 }
        );
      }

      const tempDir = path.join(os.tmpdir(), 'delray-films');
      await mkdir(tempDir, { recursive: true });
      await cleanTempDir(tempDir);

      clipPath = path.join(tempDir, `clip-${Date.now()}.mp4`);

      console.log(`Trimming clip from URL: ${clipStart}s to ${clipEnd}s (${clipDuration}s)`);
      await trimFromUrl(videoUrl, clipPath, clipStart, clipEnd);

      const clipStat = await stat(clipPath);
      console.log(`Clip created: ${(clipStat.size / 1024 / 1024).toFixed(1)}MB`);

      const file = await uploadFileToGemini(clipPath, 'video/mp4', `clip-${clipStart}s-to-${clipEnd}s`);
      await unlink(clipPath).catch(() => {});

      return NextResponse.json({
        fileUri: file.uri,
        mimeType: file.mimeType || 'video/mp4',
        fileName: file.name,
        trimmed: true,
      });

    } else {
      /* ── FULL VIDEO MODE ────────────────────────────────────────
         Stream from Supabase → Google. No disk. No /tmp.          */
      console.log('Full video mode: streaming directly to Google...');
      const file = await streamUploadToGemini(videoUrl, 'video/mp4', 'game-film-full');

      return NextResponse.json({
        fileUri: file.uri,
        mimeType: file.mimeType || 'video/mp4',
        fileName: file.name,
        trimmed: false,
      });
    }

  } catch (err) {
    if (clipPath) await unlink(clipPath).catch(() => {});
    console.error('Upload proxy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
