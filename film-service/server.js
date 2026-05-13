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

    // ── STEP 2: TWO-PASS ANALYSIS ──────────────────────────────
    // Model chain: try 3.1 Pro → fallback to 2.5 Pro if preview model fails on video
    const MODEL_CHAIN = speedMode === 'pro'
      ? ['gemini-3.1-pro-preview', 'gemini-2.5-pro']
      : ['gemini-3-flash-preview', 'gemini-2.5-flash'];
    const effectiveType = isClip ? 'clip_breakdown' : (analysisType || 'full_breakdown');

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const videoRef = { fileData: { mimeType: geminiFile.mimeType || 'video/mp4', fileUri: geminiFile.uri } };

    // ── PASS 1: Raw observations (no interpretation) ────────────
    let GEMINI_MODEL = MODEL_CHAIN[0];
    let model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    console.log(`[${filmId}] Pass 1: Raw observation scan (${GEMINI_MODEL})...`);

    const observationPrompt = `You are a FORENSIC VIDEO OBSERVER for youth football film. Your ONLY job is to describe what you LITERALLY see. Do NOT interpret plays. Do NOT say "pass" or "run" or "touchdown." Just describe physical movements and object positions.

=== BALL TRACKING (MOST IMPORTANT) ===
Track the football like a crime scene investigator tracks evidence. For EVERY second:
1. WHERE is the ball? (In whose hands? On the ground? In the air?)
2. HOW did it get there? Describe the PHYSICAL TRANSFER:
   - HANDOFF = One player extends ball, another player takes it with BOTH hands while standing NEXT to the first player. The ball never leaves contact with a player's hands during transfer.
   - FORWARD PASS = The QB's arm goes FORWARD in a throwing motion, the ball LEAVES his hand, travels through the AIR with NO player touching it, then a DIFFERENT player catches it DOWNFIELD.
   - PITCH/LATERAL = Ball is tossed BACKWARD or sideways, short distance.
3. After the ball transfer, WHO is carrying it and WHERE do they go?

=== AIRBORNE OBJECT DETECTION ===
If you see ANYTHING flying through the air:
- Is it OVAL/BROWN and was it THROWN BY A PLAYER? → Likely a football
- Does it have WINGS, move INDEPENDENTLY of any player, or fly in an unusual trajectory? → BIRD or debris, NOT a football
- Is it SMALL and DARK against the sky? → Could be bird — note uncertainty
- LABEL IT: "Airborne object: [description] — likely football / likely bird / uncertain"

=== PLAYER TRACKING ===
For each visible player, per second:
- Physical description (jersey color, helmet, guardian cap color if any, cleats, build)
- What they are DOING (running, blocking, standing, tackling)
- Direction of movement
- Who they are interacting with (blocking whom, tackling whom)

=== FORMAT ===
Start with: BALL TRACKING SUMMARY — trace the ball from snap to whistle in one paragraph.
Then: FRAME-BY-FRAME:
TIMESTAMP 0:00 — [observations]
TIMESTAMP 0:01 — [observations]
...continue

End with: POST-PLAY — What do refs signal? Where do teams set up next?`;

    let pass1Result;
    let rawObservations = '';
    try {
      pass1Result = await model.generateContentStream([
        { text: observationPrompt },
        videoRef,
      ]);
      for await (const chunk of pass1Result.stream) {
        const text = chunk.text();
        if (text) rawObservations += text;
      }
    } catch (pass1Err) {
      // If 3.1 Pro fails, fall back to 2.5 Pro
      if (MODEL_CHAIN.length > 1 && GEMINI_MODEL === MODEL_CHAIN[0]) {
        GEMINI_MODEL = MODEL_CHAIN[1];
        console.log(`[${filmId}] ⚠️ ${MODEL_CHAIN[0]} failed (${pass1Err.message}), falling back to ${GEMINI_MODEL}`);
        model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        pass1Result = await model.generateContentStream([
          { text: observationPrompt },
          videoRef,
        ]);
        for await (const chunk of pass1Result.stream) {
          const text = chunk.text();
          if (text) rawObservations += text;
        }
      } else {
        throw pass1Err;
      }
    }

    console.log(`[${filmId}] Pass 1 complete (${rawObservations.length} chars). Starting Pass 2...`);

    // ── PASS 2: Analysis using observations as ground truth ─────
    const analysisPrompt = buildPrompt(effectiveType, { roster, opponent, filmType, isClip, clipStart, clipEnd });

    const pass2Prompt = `${analysisPrompt}

=== GROUND TRUTH OBSERVATIONS (from frame-by-frame review) ===
A forensic observer watched this same video frame-by-frame and tracked the ball. Use their observations as GROUND TRUTH to determine the play type:

${rawObservations}

=== RUN vs PASS DECISION (use observations above) ===
Read the BALL TRACKING SUMMARY above. Then apply this logic:
- If the ball was HANDED from one player to an adjacent player → THIS IS A RUN PLAY. Period.
- If the ball LEFT a player's hand, flew through the air with no contact, and was caught by a different player downfield → THIS IS A PASS PLAY.
- If the observer noted a "likely bird" or "uncertain" airborne object → Do NOT assume it was a thrown football.
- If you're not sure → Say "Play type unclear from this angle" — do NOT guess.

Now watch the video AGAIN yourself. Your analysis MUST be consistent with the ball tracking observations above. If the observations say handoff, your analysis says run. No exceptions.`;

    const pass2Result = await model.generateContentStream([
      { text: pass2Prompt },
      videoRef,
    ]);
    let analysisText = '';
    for await (const chunk of pass2Result.stream) {
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
    }).eq('id', filmId);
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
=== ABSOLUTE RULES — VIOLATION = IMMEDIATE FAILURE ===
- NEVER fabricate events. If you didn't SEE it, it didn't happen.
- NEVER invent turnovers. No fumble/INT unless you see the ball physically change hands AND the refs confirm it.
- NEVER guess jersey numbers. If unreadable, describe the player physically.
- If the camera misses something, say "NOT VISIBLE" — do NOT fill the gap with imagination.
- These are 8U players (ages 7-8). Sloppy handoffs, missed blocks, and confusion are NORMAL — not noteworthy errors unless extreme.
=== PLAYER ID FORMAT ===
Position + Physical descriptors (helmet color/guardian cap, cleats, build, skin tone, hair) + Jersey # ONLY if clearly readable.
Example: "RB with red guardian cap, black cleats, stocky build — #11 (if readable)"
=== END RULES ===`;

const THREE_PHASE_METHOD = `
=== YOUR ANALYSIS METHOD (FOLLOW THIS EXACT ORDER INTERNALLY) ===

**PHASE 1 — OBSERVE (raw observations, zero interpretation)**
Watch the entire clip/play and note ONLY what you literally see:
- PRE-SNAP: Who is lined up where? Formation shape? Player physical descriptions.
- SNAP TO WHISTLE: Where does the ball go? Who touches it? Which direction? Who blocks whom? Who tackles?
- POST-PLAY (CRITICAL): What happens AFTER the whistle?
  → Which direction do the REFS point? (this tells you who has possession / first down direction)
  → Do players celebrate or show frustration? Which team?
  → Where does the offense huddle next? Same spot (short/no gain) or downfield (big gain)?
  → Is there a kickoff setup after? (indicates score)
  → Are there flags on the ground? (penalty)

**PHASE 2 — ANALYZE (interpret Phase 1 observations ONLY)**
Based ONLY on your Phase 1 observations, determine:
- Play type (run/pass/dead ball/penalty)
- Play result (gain/loss/score — ONLY if Phase 1 evidence supports it)
- Key players and their roles

**PHASE 3 — VERIFY (cross-check against post-play evidence)**
Before finalizing, CHECK each conclusion against the AFTER-PLAY context:
- You said "fumble" → Did refs signal change of possession? Did the other team take over on the next play? If NOT → RETRACT IT.
- You said "big gain" → Does the next play start significantly downfield? If NOT → REDUCE your estimate.
- You said "touchdown" → Is there celebration + kickoff setup? If NOT → RETRACT IT.
- You said a specific player did something → Can you physically see that player doing it? Or are you assuming based on position? If assuming → SAY SO.
- ANY Phase 2 conclusion that CONTRADICTS post-play evidence → CORRECT IT. Post-play evidence always wins over your interpretation.

Present ONLY your VERIFIED analysis. Do NOT show the 3 phases separately — integrate them into a clean report.
=== END METHOD ===`;

function buildPrompt(type, { roster, opponent, filmType, isClip, clipStart, clipEnd }) {
  const ctx = buildRosterContext(roster);

  const prompts = {
    clip_breakdown: `You are the most trusted youth football (8U) film analyst in South Florida. Coaches rely on you because every word you say is backed by what's on the screen — you have NEVER fabricated a play in your career.
${ctx}${GROUND_TRUTH_RULES}
${THREE_PHASE_METHOD}

This is a ${isClip ? `${Math.round(clipEnd - clipStart)}-second clip` : 'short segment'}.

After completing your 3-phase analysis internally, present your verified findings as:

1. **Film Quality**: Camera angle, stability, what's visible vs. limited. (1-2 sentences)
2. **Play Call**: What happened — play type, direction, key action. State if live play, dead ball, or penalty.
3. **Key Observations**: 
   - Ball carrier: who, which direction, approximate gain/loss (ONLY what post-play evidence confirms)
   - Blocking: who blocked whom (describe players physically — e.g., "player with red guardian cap sealed the edge")
   - Defense: who made the play, gap assignments observed
4. **Coaching Points**: 2-3 SPECIFIC corrections with player descriptions. What drill fixes this?
5. **Grades**: Offense and Defense, A-F with one-line justification each.

If ANYTHING is unclear from the film angle, say so plainly. A coach would rather hear "I can't tell from this angle" than a guess.
Opponent: ${opponent || 'Unknown'}`,

    full_breakdown: `You are the head film analyst for a competitive 8U youth football program. Your reputation is built on ACCURACY — you never pad reports with invented plays.
${ctx}${GROUND_TRUTH_RULES}
${THREE_PHASE_METHOD}

For EACH play, apply the 3-phase method internally before writing your analysis.

Present your verified findings as:

1. **Film Quality Assessment**: Camera angle, quality, limitations. What CAN and CANNOT be reliably analyzed.
2. **Game Summary**: Total verified live plays, score (ONLY if confirmed by evidence), general flow.
3. **Play-by-Play**: For each verified live play:
   - Timestamp
   - Formation (offense and defense)
   - Play type and result (ONLY what post-play evidence confirms)
   - Key player actions (with physical descriptions)
   - Grade (A-F)
4. **Standout Players**: Players who consistently showed up (by description + number if readable).
5. **Tendencies**: Patterns you saw MULTIPLE times (minimum 2 occurrences).
6. **Practice Plan**: 3-5 specific drills tied to OBSERVED issues. 

Do NOT inflate play counts. Do NOT claim results you didn't verify with post-play evidence.
Opponent: ${opponent || 'Unknown'}  Film Type: ${filmType || 'game'}`,

    player_tracking: `You are a player development analyst for 8U youth football. Accuracy is everything.
${ctx}${GROUND_TRUTH_RULES}
${THREE_PHASE_METHOD}

For each IDENTIFIABLE player, evaluate:
- OL: Stance, first step, sustain, finish. Who did they block? Did they hold?
- Skill positions: Speed, vision, ball security, route running.
- Defense: Alignment, first step, gap discipline, tackling form, pursuit angle.

Grade each player A-F with timestamps.
If a player is off-camera or obscured, say so — do NOT invent observations.
Opponent: ${opponent || 'Unknown'}`,

    highlights: `You are a highlight reel curator for youth football. Quality over quantity.
${ctx}${GROUND_TRUTH_RULES}
${THREE_PHASE_METHOD}

Find exciting LIVE plays verified by post-play evidence (celebration, big gain confirmed by next huddle spot).
For each highlight: timestamp, what makes it special, key player(s).
If unsure whether a play was actually a highlight, do NOT include it.
Opponent: ${opponent || 'Unknown'}`,

    quick_summary: `You are a head coach's post-game assistant. Honest and concise.
${ctx}${GROUND_TRUTH_RULES}
${THREE_PHASE_METHOD}

1. Score (ONLY if visible/confirmable from TDs + celebrations)
2. Verified play count (only snaps you SAW)
3. Top 3 takeaways
4. Players of the game (identifiable only)
5. Position group grades (A-F)
6. Top 3 areas to improve with specific drills
7. Penalties observed (flags visible on field)

If you didn't see the score, say "Score not visible from film."
Opponent: ${opponent || 'Unknown'}`,
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

// ═══════════════════════════════════════════════════════════════
// POST /correct — Coach correction: re-analyze with ground truth
// ═══════════════════════════════════════════════════════════════
app.post('/correct', async (req, res) => {
  const { filmId, correction, videoUrl, clipStart, clipEnd, filmType, opponent, roster, speedMode } = req.body;
  if (!filmId || !correction) return res.status(400).json({ error: 'filmId and correction required' });

  const supabase = getSupabase();
  await supabase.from('game_films').update({ ai_status: 'processing' }).eq('id', filmId);
  res.status(202).json({ status: 'accepted', filmId });

  // Run correction pipeline in background
  (async () => {
    try {
      // Get the cached Google file URI
      const { data: filmRow } = await supabase
        .from('game_films')
        .select('gemini_file_uri, gemini_file_name, ai_analysis')
        .eq('id', filmId).single();

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const MODEL_CHAIN = speedMode === 'pro'
        ? ['gemini-3.1-pro-preview', 'gemini-2.5-pro']
        : ['gemini-3-flash-preview', 'gemini-2.5-flash'];
      let modelName = MODEL_CHAIN[0];
      let model = genAI.getGenerativeModel({ model: modelName });

      let videoRefPart = null;
      if (filmRow?.gemini_file_uri) {
        videoRefPart = { fileData: { mimeType: 'video/mp4', fileUri: filmRow.gemini_file_uri } };
      }

      const correctionPrompt = `You are a youth football (8U) film analyst. A HEAD COACH has reviewed your previous analysis and found ERRORS. The coach's correction is GROUND TRUTH — they were at the game and know exactly what happened.

=== YOUR PREVIOUS ANALYSIS ===
${filmRow?.ai_analysis || 'No previous analysis available.'}

=== COACH'S CORRECTION (THIS IS FACT — DO NOT ARGUE) ===
${correction}

=== YOUR TASK ===
Watch the video again with the coach's correction in mind. Rebuild your analysis from scratch, incorporating the coach's correction as absolute fact. For example:
- If the coach says "This was a run play, not a pass" → Your new analysis must describe a run play
- If the coach says "#11 blocked for the RB" → Your new analysis must describe #11 as a blocker
- If the coach says "There was no fumble" → Remove any fumble reference

Produce a CORRECTED analysis that is consistent with what the coach told you. Keep all the good parts of your original analysis, fix what the coach flagged, and add a "Coach's Note" section at the top acknowledging the correction.`;

      const parts = [{ text: correctionPrompt }];
      if (videoRefPart) parts.push(videoRefPart);

      let result, correctedText = '';
      try {
        result = await model.generateContentStream(parts);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) correctedText += text;
        }
      } catch (modelErr) {
        if (MODEL_CHAIN.length > 1 && modelName === MODEL_CHAIN[0]) {
          modelName = MODEL_CHAIN[1];
          console.log(`[${filmId}] ⚠️ ${MODEL_CHAIN[0]} failed, falling back to ${modelName}`);
          model = genAI.getGenerativeModel({ model: modelName });
          result = await model.generateContentStream(parts);
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) correctedText += text;
          }
        } else {
          throw modelErr;
        }
      }

      await supabase.from('game_films').update({
        ai_analysis: correctedText,
        ai_status: 'complete',
        ai_analyzed_at: new Date().toISOString(),
      }).eq('id', filmId);

      console.log(`[${filmId}] ✅ Coach correction applied (${modelName})`);
    } catch (err) {
      console.error(`[${filmId}] ❌ Correction failed:`, err);
      await supabase.from('game_films').update({
        ai_status: 'failed',
        ai_analysis: `Correction failed: ${err.message}`,
      }).eq('id', filmId);
    }
  })();
});

app.listen(PORT, () => console.log(`Film service running on port ${PORT}`));
