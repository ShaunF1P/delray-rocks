/**
 * reanalyze_segments.js
 * 
 * Phase 2: Re-analyze all parent segment videos from Supabase using
 * Gemini two-pass pipeline. Downloads segment videos, chunks them,
 * uploads to Google AI Files API, and runs forensic + structured analysis.
 * 
 * Outputs a fresh sideline_log.json with proper timestamps.
 * 
 * Usage: node scripts/reanalyze_segments.js
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const https = require('https');
const http = require('http');

// Load env
const dotenvPath = path.join(__dirname, '..', '.env.local');
fs.readFileSync(dotenvPath, 'utf8').split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-3.8-flash';
const OUTPUT_JSON = path.join(__dirname, '..', 'scratch', 'sideline_log_v2.json');
const OUTPUT_MD = path.join(__dirname, '..', 'scratch', 'game_summary_v2.md');
const TEMP_DIR = path.join(__dirname, '..', 'scratch', 'temp_segments');

// Lazy imports
let GoogleGenerativeAI, GoogleAIFileManager, FileState;
try {
  const genAIModule = require('@google/generative-ai');
  const serverModule = require('@google/generative-ai/server');
  GoogleGenerativeAI = genAIModule.GoogleGenerativeAI;
  GoogleAIFileManager = serverModule.GoogleAIFileManager;
  FileState = serverModule.FileState;
} catch (err) {
  console.error('Error: Required packages (@google/generative-ai) are missing.');
  process.exit(1);
}

const { createClient } = require(path.join(__dirname, '..', 'node_modules', '@supabase/supabase-js'));
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Ground truth rules ──
const GROUND_TRUTH_RULES = `
=== GROUND TRUTH RULES — FOLLOW THESE EXACTLY ===
1. ONLY describe what you ACTUALLY SEE in the video. Do NOT fabricate, infer, or guess details.
2. If a play is a DEAD BALL (penalty flag, offsides, false start, referee whistle, coach intervention), SAY SO. Do NOT analyze a dead ball as a live play.
3. If players line up and then the play is blown dead before a snap or after a penalty, report it as: "DEAD BALL — [reason]".
4. If you see teams moving forward or backward without running a play, that is likely a PENALTY ENFORCEMENT. Report it as such.
5. If you CANNOT clearly see a jersey number, say "unidentified" — do NOT make up a number.
6. If you CANNOT determine what happened, say "unclear from film angle" — do NOT fabricate a narrative.
7. Count the actual number of LIVE plays in the clip. A live play = snap to whistle with actual football action. Pre-snap penalties and dead balls are NOT live plays.
8. Be HONEST about what the film quality and angle allows you to see.
9. GAME SPECIFIC RULES:
   - There are NO field goal attempts or field goal blocks in this game.

=== PLAY TITLE RULES ===
CRITICAL: Every play title MUST be UNIQUE and SPECIFIC. Do NOT repeat the same title template.
- BAD: "Jake Feldman handoff to Jasper Brown right" (repeated 20 times)
- GOOD: "Play 3: Off-tackle right, #5 Brown cuts back for 8 yards"
- GOOD: "Play 7: Toss sweep left, #1 Darrisaw bounces outside for first down"
- GOOD: "Play 12: QB keeper up the middle, #4 Jacobs powers through for 4 yards"
Include: play direction, yardage gained/lost, key result (first down, touchdown, tackle for loss, fumble, etc.)

=== PLAY DESCRIPTION RULES ===
CRITICAL: Every description MUST be distinct. Include AT MINIMUM:
1. The specific formation or alignment pre-snap
2. What the offensive line does (who blocks whom)
3. The ball carrier's specific running path and moves (juke, stiff arm, spin, speed)
4. Where on the field they are (yard line, hash, sideline)
5. How the play ends (tackled by whom, out of bounds, scores, etc.)
6. Any notable details unique to THIS specific play

=== PLAYER IDENTIFICATION RULES ===
Jersey numbers are HARD to read on youth football film. Use this identification hierarchy:
1. POSITION FIRST: Always identify by field position.
2. PHYSICAL DESCRIPTORS (minimum 2-3): Shoe/cleat color, hair, build/size, equipment.
3. JERSEY NUMBER (with confidence): Only state a number if you can clearly read it.
4. ROSTER MAPPING TIPS:
   - Running backs: Ori Darrisaw #1 (black cleats), Jasper Brown #5 (white cleats), Travis Philpart #0 (black cleats), Carter Thomas #7
   - Kasen Jacobs #4 is NOT a running back but occasionally takes direct snaps.
   - Carter Latouche #3 is NOT a running back.
   - If you see #22, it's a visual distortion -- actually #1, #5, or #0.
`;

// ── Helpers ──
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    console.log(`  Downloading: ${url.substring(0, 80)}...`);
    const file = fs.createWriteStream(destPath);
    proto.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      const totalBytes = parseInt(response.headers['content-length'] || '0');
      let downloaded = 0;
      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalBytes > 0) {
          const pct = ((downloaded / totalBytes) * 100).toFixed(1);
          process.stdout.write(`\r  Progress: ${pct}% (${(downloaded/1024/1024).toFixed(1)} MB)`);
        }
      });
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        process.stdout.write('\n');
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

function getVideoDuration(filePath) {
  return new Promise((resolve) => {
    exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, (err, stdout) => {
      if (!err && stdout.trim()) {
        resolve(parseFloat(stdout.trim()));
      } else {
        exec(`ffmpeg -i "${filePath}" 2>&1`, (err2, stdout2, stderr) => {
          const match = (stderr || stdout2 || '').match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
          if (match) {
            resolve(parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 100);
          } else {
            resolve(0);
          }
        });
      }
    });
  });
}

async function retryWithBackoff(fn, retries = 5, delay = 15000) {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    const isRateLimit = err.message?.includes('429') || err.status === 429;
    const isTransient = err.message?.includes('503') || err.message?.includes('500');
    if (isRateLimit || isTransient) {
      const waitTime = isRateLimit ? 60000 : delay;
      console.warn(`  [API Error] Rate limit or transient error. Retrying in ${waitTime/1000}s... (${retries} left)`);
      await new Promise(r => setTimeout(r, waitTime));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

async function getRoster() {
  const { data, error } = await supabase
    .from('players')
    .select('jersey_number, first_name, last_name, position')
    .eq('program_type', 'football');
  if (error) { console.warn('Roster load error:', error.message); return []; }
  return (data || []).map(p => ({
    jersey: p.jersey_number,
    name: `${p.first_name} ${p.last_name}`,
    position: p.position
  }));
}

function buildRosterContext(roster) {
  if (!roster || roster.length === 0) return '';
  const lines = roster.map(p => `  #${p.jersey} — ${p.name} (${p.position})`).join('\n');
  return `\n\n=== OUR TEAM ROSTER ===\nOur Roster:\n${lines}\n`;
}

// ── Two-Pass Analysis ──
async function runTwoPassChunk(fileUri, mimeType, rosterContext, segmentLabel) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const videoRef = { fileData: { mimeType: mimeType || 'video/mp4', fileUri } };

  // Pass 1: Forensic observations
  console.log(`  [${segmentLabel}] Pass 1: Forensic observation scan...`);
  const observationPrompt = `You are a FORENSIC VIDEO OBSERVER for youth football film. Your ONLY job is to describe what you LITERALLY see. Do NOT interpret plays. Do NOT say "pass" or "run" or "touchdown." Just describe physical movements and object positions.

=== BALL TRACKING (MOST IMPORTANT) ===
Track the football like a crime scene investigator tracks evidence. For EVERY second:
1. WHERE is the ball? (In whose hands? On the ground? In the air?)
2. HOW did it get there? Describe the PHYSICAL TRANSFER (HANDOFF, FORWARD PASS, PITCH/LATERAL).
3. After the ball transfer, WHO is carrying it and WHERE do they go?

=== AIRBORNE OBJECT DETECTION ===
If you see ANYTHING flying through the air:
- Is it OVAL/BROWN and was it THROWN BY A PLAYER? -> Likely a football
- Does it have WINGS, move INDEPENDENTLY of any player? -> BIRD or debris, NOT a football
- LABEL IT: "Airborne object: [description] — likely football / likely bird / uncertain"

=== PLAYER TRACKING ===
For each visible player, per second:
- Physical description (jersey color, helmet, guardian cap color if any, cleats, build)
- What they are DOING (running, blocking, standing, tackling)
- Direction of movement

=== FORMAT ===
Start with: BALL TRACKING SUMMARY — trace the ball from snap to whistle in one paragraph.
Then: FRAME-BY-FRAME:
TIMESTAMP 0:00 — [observations]
TIMESTAMP 0:01 — [observations]
...continue

End with: POST-PLAY — What do refs signal? Where do teams set up next?`;

  const pass1Result = await retryWithBackoff(async () => {
    return await model.generateContent([{ text: observationPrompt }, videoRef]);
  });
  const rawObservations = pass1Result.response.text();
  console.log(`  [${segmentLabel}] Pass 1 done (${rawObservations.length} chars)`);

  // Pass 2: Structured Analysis
  console.log(`  [${segmentLabel}] Pass 2: Structured analysis...`);
  const systemPrompt = `You are the head film analyst for a competitive 8U youth football program.
${rosterContext}
${GROUND_TRUTH_RULES}

Analyze this video segment. Identify ALL plays — every snap-to-whistle action.
Opponent: Baby Zip
Film Type: game

=== GROUND TRUTH OBSERVATIONS (from frame-by-frame review) ===
Use these observations as GROUND TRUTH to determine the play type:
${rawObservations}

=== RUN vs PASS DECISION ===
- If the ball was HANDED from one player to an adjacent player -> RUN PLAY.
- If the ball LEFT a player's hand, flew through the air with no contact, and was caught downfield -> PASS PLAY.
- If observer noted "likely bird" or "uncertain" object -> Do NOT assume thrown football.

Your analysis MUST be consistent with the ball tracking observations above.`;

  const requestSchema = {
    type: 'OBJECT',
    properties: {
      plays: {
        type: 'ARRAY',
        description: 'List of all plays (live plays, dead balls, penalties) in this segment.',
        items: {
          type: 'OBJECT',
          properties: {
            start_seconds: { type: 'NUMBER', description: 'Start time of play in seconds from beginning of this clip.' },
            end_seconds: { type: 'NUMBER', description: 'End time of play in seconds from beginning of this clip.' },
            play_type: { type: 'STRING', enum: ['run', 'pass', 'penalty', 'turnover'], description: 'The play category.' },
            title: { type: 'STRING', description: 'UNIQUE short title -- include direction, yardage, key result. Never repeat the same title.' },
            description: { type: 'STRING', description: 'DETAILED unique play-by-play: formation, OL blocking, ball carrier path, field position, tackle details.' },
            players_involved: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Players involved with jersey number and name.' }
          },
          required: ['start_seconds', 'end_seconds', 'play_type', 'title', 'description', 'players_involved']
        }
      },
      formations: {
        type: 'ARRAY', items: { type: 'STRING' },
        description: 'Formations observed in this segment.'
      },
      standout_performances: {
        type: 'ARRAY', items: { type: 'STRING' },
        description: 'Standout players and actions.'
      },
      coaching_points: {
        type: 'ARRAY', items: { type: 'STRING' },
        description: 'Actionable coaching corrections.'
      }
    },
    required: ['plays', 'formations', 'standout_performances', 'coaching_points']
  };

  const pass2Result = await retryWithBackoff(async () => {
    return await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: systemPrompt }, videoRef]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: requestSchema,
        temperature: 0.1
      }
    });
  });

  const responseText = pass2Result.response.text();
  console.log(`  [${segmentLabel}] Pass 2 done`);

  // Parse result
  try {
    return JSON.parse(responseText);
  } catch (err) {
    console.warn(`  [${segmentLabel}] JSON parse failed, trying cleanup...`);
    const clean = responseText.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(clean);
  }
}

// ── Main ──
async function main() {
  console.log('==================================================');
  console.log('  PHASE 2: RE-ANALYZE SEGMENTS (TWO-PASS)');
  console.log('==================================================\n');

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set!');
    process.exit(1);
  }

  // Create temp directory
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // Fetch segments from Supabase
  const { data: segments, error } = await supabase
    .from('game_films')
    .select('id, title, video_url, duration_seconds')
    .eq('opponent', 'Baby Zip')
    .like('title', 'RTG vs.%')
    .order('title');

  if (error || !segments) {
    console.error('Failed to fetch segments:', error);
    process.exit(1);
  }

  console.log(`Found ${segments.length} parent segments to analyze:`);
  segments.forEach((s, i) => {
    console.log(`  [${i+1}] ${s.title} (${(s.duration_seconds/60).toFixed(1)} min)`);
  });

  // Load roster
  const roster = await getRoster();
  console.log(`Loaded ${roster.length} players from roster.\n`);
  const rosterContext = buildRosterContext(roster);

  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Resume logic: load existing plays from previous run
  let aggregatedPlays = [];
  if (fs.existsSync(OUTPUT_JSON)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
      aggregatedPlays = existing.plays || [];
      console.log(`[RESUME] Loaded ${aggregatedPlays.length} plays from previous run.`);
    } catch (e) {
      console.warn('[RESUME] Could not load previous run, starting fresh.');
    }
  }
  const processedSegmentIds = new Set(aggregatedPlays.map(p => p.segment_id));
  let globalPlayIndex = aggregatedPlays.length;

  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx];
    const segLabel = seg.title.replace('RTG vs. Baby Zip - ', '');
    console.log(`\n--------------------------------------------------`);
    console.log(`Processing ${segLabel} (${(seg.duration_seconds/60).toFixed(1)} min)`);
    console.log(`--------------------------------------------------`);

    // Skip very short segments (< 20 seconds)
    if (seg.duration_seconds < 20) {
      console.log(`  Skipping -- too short (${seg.duration_seconds}s)`);
      continue;
    }

    // Skip already-processed segments (resume mode)
    if (processedSegmentIds.has(seg.id)) {
      const count = aggregatedPlays.filter(p => p.segment_id === seg.id).length;
      console.log(`  [RESUME] Already processed (${count} plays found). Skipping.`);
      continue;
    }

    // Download segment video
    const segFilename = `seg_${segIdx + 1}.mp4`;
    const segFilePath = path.join(TEMP_DIR, segFilename);

    if (fs.existsSync(segFilePath) && fs.statSync(segFilePath).size > 1000) {
      console.log(`  Using cached download: ${segFilePath}`);
    } else {
      await downloadFile(seg.video_url, segFilePath);
    }

    // Get actual duration
    const duration = await getVideoDuration(segFilePath);
    console.log(`  Actual duration: ${duration.toFixed(1)}s`);

    // Determine chunks (6-minute max for API token limits)
    const maxChunkDuration = 360;
    const chunks = [];
    if (duration > 900) {
      const numChunks = Math.ceil(duration / maxChunkDuration);
      console.log(`  Splitting into ${numChunks} chunks (6 min each)`);
      for (let j = 0; j < numChunks; j++) {
        const chunkStart = j * maxChunkDuration;
        const chunkDur = Math.min(maxChunkDuration, duration - chunkStart);
        chunks.push({ index: j, start: chunkStart, duration: chunkDur });
      }
    } else {
      chunks.push({ index: 0, start: 0, duration: duration });
    }

    for (const chunk of chunks) {
      let chunkPath = segFilePath;
      let tempChunkPath = null;

      // Split chunk if needed
      if (chunks.length > 1) {
        console.log(`\n  --- Chunk ${chunk.index + 1}/${chunks.length} (${chunk.start}s - ${(chunk.start + chunk.duration).toFixed(0)}s) ---`);
        tempChunkPath = path.join(TEMP_DIR, `chunk_${segIdx + 1}_${chunk.index}.mp4`);
        const splitCmd = `ffmpeg -y -ss ${chunk.start} -i "${segFilePath}" -t ${chunk.duration} -c copy "${tempChunkPath}"`;
        try {
          execSync(splitCmd, { stdio: 'pipe' });
          chunkPath = tempChunkPath;
        } catch (err) {
          console.error(`  FFmpeg split failed: ${err.message}`);
          continue;
        }
      }

      // Check file size -- compress if > 1.9 GB
      const stats = fs.statSync(chunkPath);
      if (stats.size > 1.9 * 1024 * 1024 * 1024) {
        console.log(`  Compressing to 720p (file too large: ${(stats.size/1024/1024/1024).toFixed(2)} GB)`);
        const compressedPath = path.join(TEMP_DIR, `compressed_${segIdx + 1}_${chunk.index}.mp4`);
        execSync(`ffmpeg -y -i "${chunkPath}" -vf "scale=-2:720" -c:v libx264 -preset veryfast -crf 28 -c:a aac "${compressedPath}"`, { stdio: 'pipe' });
        chunkPath = compressedPath;
      }

      let file = null;
      try {
        // Upload to Google AI Files API
        console.log(`  Uploading to Google AI Files API...`);
        const uploadResult = await fileManager.uploadFile(chunkPath, {
          mimeType: 'video/mp4',
          displayName: `${segLabel}-chunk-${chunk.index + 1}`
        });
        file = uploadResult.file;
        console.log(`  Google File URI: ${file.uri}`);
        console.log(`  Waiting for Google processing...`);

        while (file.state === 'PROCESSING' || file.state === FileState.PROCESSING) {
          process.stdout.write('.');
          await new Promise(r => setTimeout(r, 5000));
          file = await fileManager.getFile(file.name);
        }
        process.stdout.write('\n');

        if (file.state === 'FAILED' || file.state === FileState.FAILED) {
          console.error(`  Google processing FAILED for ${segLabel} chunk ${chunk.index + 1}. Skipping.`);
          continue;
        }

        // Run two-pass analysis
        const chunkLabel = chunks.length > 1 ? `${segLabel} chunk ${chunk.index + 1}` : segLabel;
        const result = await runTwoPassChunk(file.uri, file.mimeType, rosterContext, chunkLabel);

        const playCount = result.plays?.length || 0;
        console.log(`  Found ${playCount} plays in this chunk.`);

        // Aggregate with absolute timestamps
        if (result.plays && Array.isArray(result.plays)) {
          result.plays.forEach(play => {
            globalPlayIndex++;
            aggregatedPlays.push({
              index: globalPlayIndex,
              segment_id: seg.id,
              segment_title: seg.title,
              start: chunk.start + play.start_seconds,
              end: chunk.start + play.end_seconds,
              start_seconds: chunk.start + play.start_seconds,
              end_seconds: chunk.start + play.end_seconds,
              play_type: play.play_type,
              title: play.title,
              description: play.description,
              players_involved: play.players_involved || [],
              source: 'two-pass-v2'
            });
          });
        }

        // Save progress incrementally
        const outputDir = path.dirname(OUTPUT_JSON);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ plays: aggregatedPlays }, null, 2), 'utf8');
        console.log(`  [Saved] ${aggregatedPlays.length} total plays so far.`);

      } catch (err) {
        console.error(`  Analysis error: ${err.message}`);
      } finally {
        // Cleanup Google file
        if (file && file.name) {
          await fileManager.deleteFile(file.name).catch(() => {});
        }
        // Cleanup temp chunk
        if (tempChunkPath && fs.existsSync(tempChunkPath)) {
          try { fs.unlinkSync(tempChunkPath); } catch {}
        }
      }

      // Rate limit pause between chunks
      if (chunks.length > 1) {
        console.log(`  [Rate Limit] Pausing 15s between chunks...`);
        await new Promise(r => setTimeout(r, 15000));
      }
    }
  }

  // Final save
  console.log('\n==================================================');
  console.log(`  ANALYSIS COMPLETE: ${aggregatedPlays.length} plays detected`);
  console.log('==================================================');

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ plays: aggregatedPlays }, null, 2), 'utf8');
  console.log(`Play log saved to: ${OUTPUT_JSON}`);

  // Print summary
  console.log('\nPlay summary:');
  aggregatedPlays.forEach(p => {
    const formatTime = (s) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
    console.log(`  ${p.index}. [${formatTime(p.start)}-${formatTime(p.end)}] ${p.play_type.toUpperCase()} | ${p.title}`);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
