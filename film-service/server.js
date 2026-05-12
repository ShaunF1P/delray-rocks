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
    // ── STEP 1: Get or upload video to Google ───────────────────
    let geminiFile;

    // Check for cached Google file URI (skip upload on re-runs)
    const { data: filmRow } = await supabase
      .from('game_films')
      .select('gemini_file_uri, gemini_file_name')
      .eq('id', filmId)
      .single();

    if (filmRow?.gemini_file_uri && filmRow?.gemini_file_name) {
      // Verify the cached file is still valid on Google's side
      try {
        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
        const cachedFile = await fileManager.getFile(filmRow.gemini_file_name);
        if (cachedFile.state === 'ACTIVE' || cachedFile.state === FileState.ACTIVE) {
          console.log(`[${filmId}] ⚡ Using cached Google file (skipping upload)`);
          geminiFile = cachedFile;
        }
      } catch {
        console.log(`[${filmId}] Cached file expired — re-uploading`);
      }
    }

    // If no valid cache, upload fresh
    if (!geminiFile) {
      if (isClip) {
        console.log(`[${filmId}] Trimming clip: ${clipStart}s → ${clipEnd}s`);
        geminiFile = await trimAndUploadClip(videoUrl, clipStart, clipEnd);
      } else {
        console.log(`[${filmId}] Streaming full video to Google...`);
        geminiFile = await streamFullVideo(videoUrl);
      }

      // Cache the Google file URI for future re-runs
      await supabase.from('game_films').update({
        gemini_file_uri: geminiFile.uri,
        gemini_file_name: geminiFile.name,
      }).eq('id', filmId);
      console.log(`[${filmId}] Cached Google file URI for future runs`);
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
// Clip trimming with FFmpeg (FAST — streams from URL, no full download)
// FFmpeg seeks directly to the clip position via HTTP range requests
// ═══════════════════════════════════════════════════════════════
async function trimAndUploadClip(videoUrl, clipStart, clipEnd) {
  const duration = clipEnd - clipStart;
  const tmpClip = path.join(os.tmpdir(), `clip-${Date.now()}.mp4`);

  try {
    // FFmpeg streams directly from URL — only downloads the clip segment
    // -ss BEFORE -i = fast input seeking (uses HTTP range requests)
    console.log(`FFmpeg trimming ${clipStart}s to ${clipEnd}s (${duration}s) directly from URL...`);
    execSync(
      `ffmpeg -y -ss ${clipStart} -i "${videoUrl}" -t ${duration} -c copy -avoid_negative_ts make_zero "${tmpClip}"`,
      { timeout: 180000, stdio: 'pipe' }
    );

    const clipSize = statSync(tmpClip).size;
    console.log(`Clip created: ${(clipSize / 1024 / 1024).toFixed(1)}MB (only downloaded clip portion)`);

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
=== CRITICAL ACCURACY RULES (MUST FOLLOW) ===
1. NEVER FABRICATE OR GUESS. If you cannot clearly see something, say "UNCLEAR from this angle" or "NOT VISIBLE." 
2. Do NOT invent turnovers (fumbles, interceptions) unless the ball CLEARLY changes possession on screen.
3. Do NOT assume what a player did if they are off-screen or obscured. Say "off-camera" or "blocked from view."
4. If the camera angle is poor, sideline, or distant — STATE THIS UPFRONT and reduce your confidence accordingly.
5. Dead balls, penalty walk-offs, and huddle time are NOT plays. Do NOT analyze them as live action.
6. Count ONLY actual LIVE plays (snap → whistle). Each play MUST have a visible snap.
7. CONFIDENCE TAGS: Mark EVERY factual claim as [HIGH], [MEDIUM], or [LOW] confidence based on video clarity.
   - [HIGH] = clearly visible, no doubt
   - [MEDIUM] = partially visible, reasonable interpretation
   - [LOW] = obscured/distant, educated guess — flag this prominently
8. If jersey numbers are not readable, say "unreadable jersey." Do NOT guess numbers.
9. Err on the side of saying LESS with high accuracy rather than MORE with fabrication.
10. For 8U football: these are 7-8 year old kids. Adjust expectations accordingly — there will be missed assignments, sloppy handoffs, etc. That's normal.
=== PLAYER ID RULES ===
1. POSITION FIRST  2. 2-3 PHYSICAL DESCRIPTORS (cleats, helmet color, hair, build)  3. JERSEY # (ONLY if clearly readable)
4. If a player has a colored guardian cap on their helmet, mention it as an identifier (e.g., "red guardian cap")
=== END RULES ===`;

function buildPrompt(type, { roster, opponent, filmType, isClip, clipStart, clipEnd }) {
  const ctx = buildRosterContext(roster);

  const cameraCheck = `
**FIRST: Assess the camera angle and video quality.**
- Is it sideline, endzone, press box, or handheld?
- Is it stable or shaky? Zoomed in or wide?
- How readable are jersey numbers from this angle?
- State any visibility limitations that affect your analysis.
`;

  const prompts = {
    clip_breakdown: `You are an elite youth football (8U) film analyst. You are known for ACCURACY over completeness — coaches trust you because you NEVER make things up.
${ctx}${GROUND_TRUTH_RULES}

This clip is ${isClip ? `${Math.round(clipEnd - clipStart)} seconds long` : 'a short segment'}.
${cameraCheck}
Then analyze ONLY what you can CLEARLY see:
1. **What Happened**: Was this a live play (snap to whistle), a penalty, or dead ball? [CONFIDENCE]
2. **Penalty Analysis** (if any): Type, who committed it, coaching correction. [CONFIDENCE]
3. **Pre-Snap Read**: Formations with positions labeled. Only label players you can actually identify. [CONFIDENCE]
4. **Play Execution** (if live): Play type, blocking assignments you can see, ball carrier. DO NOT invent turnovers or results you didn't see. [CONFIDENCE]
5. **Coaching Points**: 2-3 specific corrections based on what you OBSERVED, not assumed.
6. **Grade**: A-F for offense and defense, with justification.

REMEMBER: It's better to say "I cannot determine the result of this play from this angle" than to fabricate a fumble or interception.
Opponent: ${opponent || 'Unknown'}`,

    full_breakdown: `You are an elite youth football (8U) coaching analyst. You are known for HONESTY — you never fabricate plays or events.
${ctx}${GROUND_TRUTH_RULES}
${cameraCheck}
Analyze this game film:
1. **Camera Assessment**: Quality, angle, limitations on what you can/cannot see.
2. **Formation Recognition**: Offensive and defensive formations. [CONFIDENCE per play]
3. **Play-by-Play Breakdown**: Every LIVE play with timestamps. Mark each with confidence level. If a play result is unclear, say so.
4. **Key Player Performances**: Only players you can clearly identify. Use physical descriptors if jersey is unreadable.
5. **Tactical Trends**: Visible tendencies (only patterns you saw multiple times).
6. **Coaching Recommendations**: Specific drills tied to OBSERVED issues.
7. **Play Grades**: A-F for each play, with reasoning.

CRITICAL: Do NOT inflate the play count. Do NOT invent turnovers. If the camera misses part of a play, say "play result not visible."
Opponent: ${opponent || 'Unknown'}  Film Type: ${filmType || 'game'}`,

    player_tracking: `You are a sports biomechanics analyst for youth football (8U). Accuracy is paramount.
${ctx}${GROUND_TRUTH_RULES}
${cameraCheck}
OL: Stance, first step, blocking — only what's visible. Skills: Speed, vision. Defense: Gap discipline, tackling.
Grade each IDENTIFIABLE player A-F. Include timestamps. Mark confidence on each observation.
If a player is off-camera or obscured, say so instead of guessing their technique. Opponent: ${opponent || 'Unknown'}`,

    highlights: `You are a highlight reel editor for youth football. Only flag plays you can CLEARLY see.
${ctx}${GROUND_TRUTH_RULES}
${cameraCheck}
Find exciting LIVE plays. Rank by impact, timestamp each. If you're unsure a play was actually exciting vs. routine, err on the side of NOT including it. Opponent: ${opponent || 'Unknown'}`,

    quick_summary: `You are a head coach's assistant (8U). Be honest and concise.
${ctx}${GROUND_TRUTH_RULES}
${cameraCheck}
1. Score (if visible)  2. Verified play count (only snaps you SAW)  3. Top 3 takeaways  4. Players of the game (identifiable only)
5. Position grades (A-F)  6. Areas to improve  7. Penalties
CRITICAL: Do not guess the score or play count. If you didn't see it clearly, say so. Opponent: ${opponent || 'Unknown'}`,
  };

  return prompts[type] || prompts.full_breakdown;
}

// ═══════════════════════════════════════════════════════════════
// GET /status/:filmId — Check analysis status (for polling)
// Auto-recovers stale 'processing' status after 15 minutes (OOM/crash safety net)
// ═══════════════════════════════════════════════════════════════
app.get('/status/:filmId', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('game_films')
      .select('ai_status, ai_analysis, ai_analysis_type, ai_analyzed_at, updated_at')
      .eq('id', req.params.filmId)
      .single();

    if (error) throw error;

    // Auto-recover stale processing: if stuck for >15 min, mark as failed
    if (data.ai_status === 'processing' && data.updated_at) {
      const staleMs = Date.now() - new Date(data.updated_at).getTime();
      if (staleMs > 15 * 60 * 1000) {
        console.log(`[${req.params.filmId}] Stale processing detected (${Math.round(staleMs / 60000)}min) — resetting`);
        await supabase.from('game_films').update({
          ai_status: 'failed',
          ai_analysis: 'Analysis timed out. Please try again.',
        }).eq('id', req.params.filmId);
        data.ai_status = 'failed';
        data.ai_analysis = 'Analysis timed out. Please try again.';
      }
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Film service running on port ${PORT}`));
