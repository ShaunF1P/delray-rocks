const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const { writeFileSync, unlinkSync, statSync } = require('fs');
const path = require('path');
const os = require('os');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager, FileState } = require('@google/generative-ai/server');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';

app.use(cors({ origin: ['https://dr.f1rstposition.com', 'http://localhost:3000', 'http://localhost:3002'] }));
app.use(express.json({ limit: '1mb' }));

const WebSocket = require('ws');

// Supabase admin client (service role — can write to any row)
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Supabase not configured');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket },
  });
}

// ═══════════════════════════════════════════════════════════════
// Health check
// ═══════════════════════════════════════════════════════════════
app.get('/', (req, res) => res.json({ status: 'ok', service: 'delray-film-service' }));

// ═══════════════════════════════════════════════════════════════
// POST /analyze-background — Fire-and-forget analysis
// Returns 202 immediately. Runs upload + analysis in background.
// Writes results directly to Supabase when done.
// ═══════════════════════════════════════════════════════════════
app.post('/analyze-background', async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });

  const { filmId, videoUrl, clipStart, clipEnd, filmType, opponent, analysisType,
          roster, speedMode } = req.body;

  if (!filmId || !videoUrl) {
    return res.status(400).json({ error: 'filmId and videoUrl are required' });
  }

  // Immediately mark as processing in Supabase
  try {
    const supabase = getSupabase();
    await supabase.from('game_films').update({ ai_status: 'processing' }).eq('id', filmId);
  } catch (err) {
    console.error('Failed to set processing status:', err);
  }

  // Return immediately — processing continues in background
  res.status(202).json({ status: 'accepted', filmId });

  // ── Background pipeline ──────────────────────────────────────
  runPipeline({ filmId, videoUrl, clipStart, clipEnd, filmType, opponent, analysisType, roster, speedMode })
    .catch(err => console.error(`Pipeline failed for film ${filmId}:`, err));
});

async function runPipeline({ filmId, videoUrl, clipStart, clipEnd, filmType, opponent,
                             analysisType, roster, speedMode }) {
  const supabase = getSupabase();
  const isClip = clipStart != null && clipEnd != null;

  try {
    // ── STEP 1: Upload video to Google ─────────────────────────
    let geminiFile;

    if (isClip) {
      // CLIP: FFmpeg physically trims the video — Gemini only sees this segment
      console.log(`[${filmId}] Trimming clip: ${clipStart}s → ${clipEnd}s`);
      geminiFile = await trimAndUploadClip(videoUrl, clipStart, clipEnd);
    } else {
      // FULL VIDEO: Stream directly to Google
      console.log(`[${filmId}] Streaming full video to Google...`);
      geminiFile = await streamFullVideo(videoUrl);
    }

    console.log(`[${filmId}] Google file ready: ${geminiFile.uri}`);

    // ── STEP 2: Run Gemini analysis ────────────────────────────
    const GEMINI_MODEL = speedMode === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const effectiveType = isClip ? 'clip_breakdown' : (analysisType || 'full_breakdown');
    const prompt = buildPrompt(effectiveType, { roster, opponent, filmType, isClip, clipStart, clipEnd });

    console.log(`[${filmId}] Running ${GEMINI_MODEL} analysis (${effectiveType})...`);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const contentParts = [
      { text: prompt },
      { fileData: { mimeType: geminiFile.mimeType || 'video/mp4', fileUri: geminiFile.uri } },
    ];

    const streamResult = await model.generateContentStream(contentParts);
    let analysisText = '';
    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) analysisText += text;
    }

    if (!analysisText) throw new Error('Empty analysis returned from Gemini');

    // ── STEP 3: Save results to Supabase ───────────────────────
    await supabase.from('game_films').update({
      ai_analysis: analysisText,
      ai_analysis_type: effectiveType,
      ai_analyzed_at: new Date().toISOString(),
      ai_status: 'complete',
    }).eq('id', filmId);

    console.log(`[${filmId}] ✅ Analysis complete and saved (${GEMINI_MODEL})`);

  } catch (err) {
    console.error(`[${filmId}] ❌ Pipeline error:`, err);
    await supabase.from('game_films').update({
      ai_status: 'failed',
      ai_analysis: `Analysis failed: ${err.message}`,
    }).eq('id', filmId).catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════════════
// Clip trimming with FFmpeg
// Downloads → trims → uploads ONLY the clip to Google
// ═══════════════════════════════════════════════════════════════
async function trimAndUploadClip(videoUrl, clipStart, clipEnd) {
  const duration = clipEnd - clipStart;
  const tmpInput = path.join(os.tmpdir(), `input-${Date.now()}.mp4`);
  const tmpClip = path.join(os.tmpdir(), `clip-${Date.now()}.mp4`);

  try {
    // Download full video to temp (Cloud Run has up to 2GB in-memory tmpfs)
    console.log('Downloading video for trimming...');
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error('Cannot download video');
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(tmpInput, buffer);
    console.log(`Downloaded ${(buffer.length / 1024 / 1024).toFixed(0)}MB`);

    // FFmpeg trim — creates a standalone clip with NO reference to the rest
    console.log(`FFmpeg trimming ${clipStart}s to ${clipEnd}s (${duration}s)...`);
    execSync(
      `ffmpeg -y -ss ${clipStart} -i "${tmpInput}" -t ${duration} -c copy -avoid_negative_ts make_zero "${tmpClip}"`,
      { timeout: 120000, stdio: 'pipe' }
    );

    const clipSize = statSync(tmpClip).size;
    console.log(`Clip created: ${(clipSize / 1024 / 1024).toFixed(1)}MB`);

    // Upload ONLY the trimmed clip to Google
    const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
    const uploadResult = await fileManager.uploadFile(tmpClip, {
      mimeType: 'video/mp4',
      displayName: `clip-${clipStart}s-${clipEnd}s`,
    });

    // Poll until processed
    let file = uploadResult.file;
    while (file.state === 'PROCESSING' || file.state === FileState.PROCESSING) {
      await new Promise(r => setTimeout(r, 3000));
      file = await fileManager.getFile(file.name);
    }
    if (file.state === 'FAILED' || file.state === FileState.FAILED) {
      throw new Error('Google failed to process clip');
    }

    return file;
  } finally {
    try { unlinkSync(tmpInput); } catch {}
    try { unlinkSync(tmpClip); } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════
// Full video streaming upload (no disk, chunked 8MB)
// ═══════════════════════════════════════════════════════════════
async function streamFullVideo(videoUrl) {
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error('Cannot access video');

  const fileSize = parseInt(videoRes.headers.get('content-length') || '0', 10);
  if (!fileSize) throw new Error('No content-length');

  // Initiate resumable upload
  const initRes = await fetch(`${GEMINI_UPLOAD_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(fileSize),
      'X-Goog-Upload-Header-Content-Type': 'video/mp4',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { displayName: 'game-film-full' } }),
  });
  if (!initRes.ok) throw new Error(`Google init failed: ${initRes.status}`);
  const uploadUri = initRes.headers.get('x-goog-upload-url');

  // Stream in 8MB chunks
  const CHUNK_SIZE = 8 * 1024 * 1024;
  const reader = videoRes.body.getReader();
  let buffer = Buffer.alloc(0);
  let offset = 0;
  let done = false;
  let finalResult = null;

  while (!done) {
    while (buffer.length < CHUNK_SIZE && !done) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) { done = true; break; }
      buffer = Buffer.concat([buffer, Buffer.from(value)]);
    }
    if (buffer.length === 0) break;

    const isLast = done || (offset + buffer.length >= fileSize);
    const chunk = isLast ? buffer : buffer.subarray(0, CHUNK_SIZE);

    const chunkRes = await fetch(uploadUri, {
      method: 'POST',
      headers: {
        'Content-Length': String(chunk.length),
        'X-Goog-Upload-Offset': String(offset),
        'X-Goog-Upload-Command': isLast ? 'upload, finalize' : 'upload',
      },
      body: chunk,
    });
    if (!chunkRes.ok) throw new Error(`Chunk failed at ${offset}`);

    offset += chunk.length;
    buffer = isLast ? Buffer.alloc(0) : buffer.subarray(CHUNK_SIZE);
    if (isLast) finalResult = await chunkRes.json();

    console.log(`Upload progress: ${Math.round((offset / fileSize) * 100)}%`);
  }

  if (!finalResult?.file) throw new Error('No file from Google');

  // Poll until processed
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
  let file = finalResult.file;
  while (file.state === 'PROCESSING' || file.state === FileState.PROCESSING) {
    await new Promise(r => setTimeout(r, 5000));
    file = await fileManager.getFile(file.name);
  }
  if (file.state === 'FAILED' || file.state === FileState.FAILED) {
    throw new Error('Google video processing failed');
  }
  return file;
}

// ═══════════════════════════════════════════════════════════════
// Prompt builder
// ═══════════════════════════════════════════════════════════════
function buildRosterContext(roster) {
  if (!roster || roster.length === 0) return '';
  const lines = roster.map(p => `  #${p.jersey} — ${p.name} (${p.position})`).join('\n');
  return `\n\n=== OUR TEAM ROSTER ===
IMPORTANT: Label OUR players by POSITION, Jersey #, and Name. Example: "RB #10 (Marcus Johnson)"
For OPPONENT players, label by jersey # and observed position. Example: "Opponent DL #5"
Our Roster:
${lines}
=== END ROSTER ===\n`;
}

const GROUND_TRUTH_RULES = `
=== GROUND TRUTH RULES ===
1. ONLY describe what you ACTUALLY SEE. Do NOT fabricate.
2. Dead balls, penalties — say so. Do NOT analyze as live plays.
3. If you can't see a jersey number, say "unidentified".
4. Count actual LIVE plays (snap to whistle). Penalties are NOT live plays.
5. Be HONEST about film quality limitations.
=== PLAYER ID RULES ===
1. POSITION FIRST  2. 2-3 PHYSICAL DESCRIPTORS (cleats, hair, build)  3. JERSEY # (only if clearly visible)
=== END RULES ===`;

function buildPrompt(type, { roster, opponent, filmType, isClip, clipStart, clipEnd }) {
  const ctx = buildRosterContext(roster);

  const prompts = {
    clip_breakdown: `You are an elite youth football (8U) film analyst reviewing a single play or short clip.
${ctx}${GROUND_TRUTH_RULES}

This clip is ${isClip ? `${Math.round(clipEnd - clipStart)} seconds long` : 'a short segment'}. Analyze ONLY what you see:
1. **What Happened**: Live play? Penalty? Dead ball?
2. **Penalty Analysis** (if any): Type, who committed it, coaching correction.
3. **Pre-Snap Read**: Formations with positions labeled.
4. **Play Execution** (if live): Play type, blocking, ball carrier, key defenders.
5. **Coaching Points**: 2-3 specific corrections.
6. **Grade**: A-F for offense and defense.
Opponent: ${opponent || 'Unknown'}`,

    full_breakdown: `You are an elite youth football (8U) coaching analyst.
${ctx}${GROUND_TRUTH_RULES}

Analyze this game film:
1. **Formation Recognition**: Offensive and defensive formations.
2. **Play-by-Play Breakdown**: Every live play with timestamps.
3. **Key Player Performances**: Standouts by position, jersey, name.
4. **Tactical Trends**: Visible tendencies.
5. **Coaching Recommendations**: Specific drills.
6. **Play Grades**: A-F for each play.
Opponent: ${opponent || 'Unknown'}  Film Type: ${filmType || 'game'}`,

    player_tracking: `You are a sports biomechanics analyst for youth football (8U).
${ctx}${GROUND_TRUTH_RULES}
OL: Stance, first step, blocking. Skills: Speed, vision. Defense: Gap discipline, tackling.
Grade each player A-F. Include timestamps. Opponent: ${opponent || 'Unknown'}`,

    highlights: `You are a highlight reel editor for youth football.
${ctx}${GROUND_TRUTH_RULES}
Find exciting LIVE plays. Rank by impact, timestamp each. Opponent: ${opponent || 'Unknown'}`,

    quick_summary: `You are a head coach's assistant (8U).
${ctx}${GROUND_TRUTH_RULES}
1. Score  2. Play count  3. Top 3 takeaways  4. Players of the game
5. Position grades (A-F)  6. Areas to improve  7. Penalties
Be concise. Opponent: ${opponent || 'Unknown'}`,
  };

  return prompts[type] || prompts.full_breakdown;
}

// ═══════════════════════════════════════════════════════════════
// GET /status/:filmId — Check analysis status (for polling)
// ═══════════════════════════════════════════════════════════════
app.get('/status/:filmId', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('game_films')
      .select('ai_status, ai_analysis, ai_analysis_type, ai_analyzed_at')
      .eq('id', req.params.filmId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Film service running on port ${PORT}`));
