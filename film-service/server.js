const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager, FileState } = require('@google/generative-ai/server');

const app = express();
const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';

// Allow requests from Delray Rocks frontend
app.use(cors({ origin: ['https://dr.f1rstposition.com', 'http://localhost:3000', 'http://localhost:3002'] }));
app.use(express.json({ limit: '1mb' }));

// ═══════════════════════════════════════════════════════════════
// Health check
// ═══════════════════════════════════════════════════════════════
app.get('/', (req, res) => res.json({ status: 'ok', service: 'delray-film-service' }));

// ═══════════════════════════════════════════════════════════════
// POST /init-upload — Upload video to Google (streaming response)
// ═══════════════════════════════════════════════════════════════
app.post('/init-upload', async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });

  const { videoUrl, clipStart, clipEnd } = req.body;
  if (!videoUrl) return res.status(400).json({ error: 'videoUrl required' });

  // Always use streaming response for Cloud Run (no timeout concerns, but keeps client informed)
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Transfer-Encoding', 'chunked');

  const send = (obj) => res.write(JSON.stringify(obj) + '\n');

  try {
    send({ _progress: 'Downloading video from storage...' });
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error('Cannot access video from storage');

    const contentLength = videoRes.headers.get('content-length');
    if (!contentLength) throw new Error('Video source did not provide content-length');
    const fileSize = parseInt(contentLength, 10);
    send({ _progress: `Video size: ${(fileSize / 1024 / 1024).toFixed(0)}MB` });

    // Initiate Google resumable upload
    send({ _progress: 'Initiating upload to Google...' });
    const initRes = await fetch(`${GEMINI_UPLOAD_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(fileSize),
        'X-Goog-Upload-Header-Content-Type': 'video/mp4',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { displayName: 'game-film' } }),
    });
    if (!initRes.ok) throw new Error(`Google init failed: ${initRes.status}`);
    const uploadUri = initRes.headers.get('x-goog-upload-url');
    if (!uploadUri) throw new Error('No upload URI from Google');

    // Stream chunks from Supabase to Google (8MB at a time)
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
      if (!chunkRes.ok) throw new Error(`Chunk failed at offset ${offset}`);

      offset += chunk.length;
      buffer = isLast ? Buffer.alloc(0) : buffer.subarray(CHUNK_SIZE);
      if (isLast) finalResult = await chunkRes.json();

      const pct = Math.round((offset / fileSize) * 100);
      send({ _progress: `Uploading to Google... ${pct}%` });
    }

    if (!finalResult?.file) throw new Error('No file returned from Google');

    // Poll until Google processes the video
    send({ _progress: 'Google is processing video...' });
    const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
    let file = finalResult.file;
    while (file.state === 'PROCESSING' || file.state === FileState.PROCESSING) {
      await new Promise(r => setTimeout(r, 5000));
      file = await fileManager.getFile(file.name);
      send({ _progress: 'Still processing...' });
    }
    if (file.state === 'FAILED' || file.state === FileState.FAILED) {
      throw new Error('Google video processing failed');
    }

    send({
      fileUri: file.uri,
      mimeType: file.mimeType || 'video/mp4',
      fileName: file.name,
      trimmed: false,
      _done: true,
    });
    res.end();

  } catch (err) {
    console.error('Upload error:', err);
    send({ error: err.message });
    res.end();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /analyze — Run Gemini analysis (streaming response)
// ═══════════════════════════════════════════════════════════════

function buildRosterContext(roster) {
  if (!roster || roster.length === 0) return '';
  const lines = roster.map(p => `  #${p.jersey} — ${p.name} (${p.position})`).join('\n');
  return `\n\n=== OUR TEAM ROSTER ===
IMPORTANT: When you identify a player from OUR team, always label them by POSITION, Jersey #, and Name.
Example: "RB #10 (Marcus Johnson)" or "LG #54 (David Smith)"
For OPPONENT players where you don't have a roster, label by jersey # and their observed position.
Example: "Opponent DL #5" or "Opponent Safety #1"

For offensive linemen, identify by specific position (LT, LG, C, RG, RT, TE) based on their alignment.
For defensive players, identify by scheme position (DE, DT, NT, OLB, MLB, ILB, CB, FS, SS).

Our Roster:
${lines}
=== END ROSTER ===\n`;
}

const GROUND_TRUTH_RULES = `

=== GROUND TRUTH RULES — FOLLOW THESE EXACTLY ===
1. ONLY describe what you ACTUALLY SEE in the video. Do NOT fabricate, infer, or guess details.
2. If a play is a DEAD BALL (penalty flag, offsides, false start, referee whistle, coach intervention), SAY SO.
3. If players line up and then the play is blown dead before a snap or after a penalty, report it as: "DEAD BALL — [reason]".
4. If you see teams moving forward or backward without running a play, that is likely a PENALTY ENFORCEMENT.
5. If you CANNOT clearly see a jersey number, say "unidentified" — do NOT make up a number.
6. If you CANNOT determine what happened, say "unclear from film angle".
7. Count the actual number of LIVE plays in the clip. A live play = snap to whistle with actual football action.
8. Be HONEST about what the film quality and angle allows you to see.

=== PLAYER IDENTIFICATION RULES ===
1. POSITION FIRST: Always identify by field position.
2. PHYSICAL DESCRIPTORS (minimum 2-3): Shoe/cleat color, hair, build/size, equipment, skin tone.
3. JERSEY NUMBER (with confidence): Only state if you can clearly read it.
4. COMBINE ALL THREE for best identification.
=== END GROUND TRUTH RULES ===
`;

app.post('/analyze', async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });

  const { fileUri, mimeType, filmType, opponent, analysisType, roster, clipStart, clipEnd, speedMode } = req.body;
  const GEMINI_MODEL = speedMode === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  const rosterContext = buildRosterContext(roster);
  const isClip = clipStart != null && clipEnd != null;

  const prompts = {
    clip_breakdown: `You are an elite youth football (8U) film analyst reviewing a single play or short clip.
${rosterContext}
${GROUND_TRUTH_RULES}

This clip is ${isClip ? `${Math.round(clipEnd - clipStart)} seconds long` : 'a short segment'}. Analyze ONLY what you actually see:

1. **What Happened**: Describe the actual event. Live play? Penalty? Dead ball?
2. **Penalty Analysis** (if any flag or dead ball): Type, who committed it, what they did wrong, coaching correction.
3. **Pre-Snap Read**: Offensive and defensive formations with positions labeled.
4. **Play Execution** (if live play): Play type, blocker performance, ball carrier, key defenders.
5. **Coaching Points**: 2-3 specific, actionable corrections.
6. **Grade**: A-F for offense and defense.

Opponent: ${opponent || 'Unknown'}`,

    full_breakdown: `You are an elite youth football (8U) coaching analyst.
${rosterContext}
${GROUND_TRUTH_RULES}

Analyze this game film and provide:
1. **Formation Recognition**: Identify offensive and defensive formations.
2. **Play-by-Play Breakdown**: For EVERY live play, describe what happened.
3. **Key Player Performances**: Standout players by position, jersey #, and name.
4. **Tactical Trends**: Visible tendencies.
5. **Coaching Recommendations**: Specific drill suggestions.
6. **Play Success/Failure Analysis**: Grade each play and explain.

Opponent: ${opponent || 'Unknown'}
Film Type: ${filmType || 'game'}
Provide timestamps for every play.`,

    player_tracking: `You are a sports biomechanics analyst for youth football (8U).
${rosterContext}
${GROUND_TRUTH_RULES}

Assess ONLY what you can actually see:
**OFFENSIVE LINE**: Stance, first step, pad level, blocking.
**SKILL POSITIONS**: Speed, agility, ball skills, vision.
**DEFENSIVE PLAYERS**: Gap discipline, pursuit angles, tackling form.
Grade each identified player A-F. Include timestamps.
Opponent: ${opponent || 'Unknown'}`,

    highlights: `You are a highlight reel editor for youth football.
${rosterContext}
${GROUND_TRUTH_RULES}

Find the most exciting plays (LIVE only, not penalties). Rank by impact, timestamp each, describe what makes each special.
Opponent: ${opponent || 'Unknown'}`,

    quick_summary: `You are a head coach's assistant for an 8U youth football team.
${rosterContext}
${GROUND_TRUTH_RULES}

Provide a concise tactical summary:
1. Score/Result  2. Play Count  3. Top 3 Takeaways  4. Players of the Game
5. Position Group Grades (A-F)  6. Areas for Improvement  7. Penalties/Issues
Keep it concise and actionable.
Opponent: ${opponent || 'Unknown'}`,
  };

  const effectiveType = isClip ? 'clip_breakdown' : analysisType;
  const systemPrompt = prompts[effectiveType] || prompts.full_breakdown;

  // Stream the response
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Transfer-Encoding', 'chunked');

  const send = (obj) => res.write(JSON.stringify(obj) + '\n');

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const contentParts = [{ text: systemPrompt }];
    if (fileUri) {
      contentParts.push({ fileData: { mimeType: mimeType || 'video/mp4', fileUri } });
    }

    send({ _meta: true, model: GEMINI_MODEL, analysisType: effectiveType, timestamp: new Date().toISOString() });

    const streamResult = await model.generateContentStream(contentParts);
    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) send({ _chunk: text });
    }

    send({ _done: true });
    res.end();

  } catch (err) {
    console.error('Analysis error:', err);
    send({ _error: err.message });
    res.end();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /file-status — Poll Google file processing status
// ═══════════════════════════════════════════════════════════════
app.post('/file-status', async (req, res) => {
  try {
    const { fileName } = req.body;
    const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
    const file = await fileManager.getFile(fileName);
    res.json({ state: file.state, uri: file.uri, mimeType: file.mimeType, name: file.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Film service running on port ${PORT}`));
