/**
 * ai-game-processor.js
 * 
 * Local command-line utility to scan, upload, analyze raw game film files
 * using Google AI Studio (Gemini) and export structured JSON play logs and
 * markdown game summaries.
 * 
 * Strict constraints applied: No AI emojis/icons in output or generated content.
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const params = {
  input: null,
  outputJson: null,
  outputMd: null,
  dryRun: false,
  gcsBucket: null,
  gcpKey: null,
  model: 'gemini-3.8-pro',
  opponent: 'Baby Zip',
  filmType: 'game',
  twoPass: false,
  mock: false
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' || args[i] === '-i') {
    params.input = args[++i];
  } else if (args[i] === '--output-json' || args[i] === '-j') {
    params.outputJson = args[++i];
  } else if (args[i] === '--output-md' || args[i] === '-m') {
    params.outputMd = args[++i];
  } else if (args[i] === '--dry-run' || args[i] === '-d') {
    params.dryRun = true;
  } else if (args[i] === '--gcs-bucket' || args[i] === '-b') {
    params.gcsBucket = args[++i];
  } else if (args[i] === '--gcp-key' || args[i] === '-k') {
    params.gcpKey = args[++i];
  } else if (args[i] === '--model') {
    params.model = args[++i];
  } else if (args[i] === '--opponent') {
    params.opponent = args[++i];
  } else if (args[i] === '--film-type') {
    params.filmType = args[++i];
  } else if (args[i] === '--two-pass') {
    params.twoPass = true;
  } else if (args[i] === '--mock') {
    params.mock = true;
  }
}

// Load .env.local variables
const dotenvPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(dotenvPath)) {
  const envContent = fs.readFileSync(dotenvPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
    if (match) {
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  });
}

// Default values
const INPUT_DIR = params.input || 'G:\\My Drive\\7.18.26\\20260718';
const OUTPUT_JSON = params.outputJson || path.join(__dirname, '..', 'scratch', 'sideline_log.json');
const OUTPUT_MD = params.outputMd || path.join(__dirname, '..', 'scratch', 'game_summary.md');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Lazy imports for SDK packages
let GoogleGenerativeAI, GoogleAIFileManager, FileState;
try {
  const genAIModule = require('@google/generative-ai');
  const serverModule = require('@google/generative-ai/server');
  GoogleGenerativeAI = genAIModule.GoogleGenerativeAI;
  GoogleAIFileManager = serverModule.GoogleAIFileManager;
  FileState = serverModule.FileState;
} catch (err) {
  console.error('Error: Required packages (@google/generative-ai) are missing.');
  console.error('Please run: npm install');
  process.exit(1);
}

let Storage;
if (params.gcsBucket || process.env.GCS_BUCKET_NAME) {
  try {
    Storage = require('@google-cloud/storage').Storage;
  } catch (err) {
    console.warn('Warning: @google-cloud/storage is not installed, GCS upload will not be supported.');
  }
}

const GROUND_TRUTH_RULES = `
=== GROUND TRUTH RULES — FOLLOW THESE EXACTLY ===
1. ONLY describe what you ACTUALLY SEE in the video. Do NOT fabricate, infer, or guess details.
2. If a play is a DEAD BALL (penalty flag, offsides, false start, referee whistle, coach intervention), SAY SO. Do NOT analyze a dead ball as a live play.
3. If players line up and then the play is blown dead before a snap or after a penalty, report it as: "DEAD BALL — [reason]" (e.g., "DEAD BALL — Offsides on defense, 5-yard penalty assessed").
4. If you see teams moving forward or backward without running a play, that is likely a PENALTY ENFORCEMENT. Report it as such.
5. If you CANNOT clearly see a jersey number, say "unidentified" — do NOT make up a number.
6. If you CANNOT determine what happened, say "unclear from film angle" — do NOT fabricate a narrative.
7. Count the actual number of LIVE plays in the clip. A live play = snap to whistle with actual football action. Pre-snap penalties and dead balls are NOT live plays.
8. Be HONEST about what the film quality and angle allows you to see. A single sideline camera cannot show all 22 players.
9. GAME SPECIFIC RULES:
   - There are NO field goal attempts or field goal blocks in this game. If you see a play where a kick is attempted or blocked (such as at 37:58-38:04), it is actually a regular play (e.g. a punt, high snap, or extra-point run/pass attempt). Do NOT identify any play as a field goal block.

=== PLAYER IDENTIFICATION RULES ===
Jersey numbers are HARD to read on youth football film. Use this identification hierarchy:
1. POSITION FIRST: Always identify by field position (e.g., "the Left DE", "the DT aligned over the center"). This is your primary identifier.
2. PHYSICAL DESCRIPTORS (minimum 2-3): You MUST include at least 2-3 distinguishing features for every key player you reference:
   - Shoe/cleat color
   - Hair
   - Build/size
   - Equipment (visor, gloves, arm sleeve, towel, wristband)
   - Skin tone
3. JERSEY NUMBER (with confidence): Only state a jersey number if you can clearly read it. If uncertain, say "appears to be #53 (uncertain)". NEVER state a number with false confidence.
4. COMBINE ALL THREE: Best format: "Left DE #53 (long hair, white cleats, tall)"
5. ROSTER MAPPING TIPS FOR THIS GAME:
   - Most running plays are run by:
     * Ori Darrisaw #1 (green helmet, black cleats)
     * Jasper Brown #5 (green helmet, white cleats)
     * Travis Philpart #0 (green helmet, black cleats)
     * Carter Thomas #7 (green helmet, black/white cleats)
   - Kasen Jacobs #4 is NOT a running back, but he occasionally enters the backfield or takes snaps and breaks big runs.
   - Carter Latouche #3 is NOT a running back; if you see a play where a "Carter" ran the ball, it is actually Carter Thomas #7.
   - Note: Jersey numbers are extremely blurry and folded on film. If you think you see a player wearing #22, it is a visual distortion and is actually #1 (Ori Darrisaw) or #5 (Jasper Brown) or #0 (Travis Philpart). Do NOT identify anyone as #22 or Jaylen Davis.
`;

async function getRoster() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.log('Supabase credentials missing, skipping database roster load.');
    return [];
  }
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('players')
      .select('jersey_number, first_name, last_name, position')
      .eq('program_type', 'football');
    if (error) {
      console.warn(`Database roster load returned error: ${error.message}`);
      return [];
    }
    return (data || []).map(p => ({
      jersey: p.jersey_number,
      name: `${p.first_name} ${p.last_name}`,
      position: p.position
    }));
  } catch (err) {
    console.warn(`Failed to load roster from database: ${err.message}`);
    return [];
  }
}

function buildRosterContext(roster) {
  if (!roster || roster.length === 0) return '';
  const lines = roster.map(p => `  #${p.jersey} — ${p.name} (${p.position})`).join('\n');
  return `\n\n=== OUR TEAM ROSTER ===
IMPORTANT: When you identify a player from OUR team, always label them by POSITION, Jersey #, and Name.
Example: "RB #10 (Marcus Johnson)" or "LG #54 (David Smith)"
For OPPONENT players where you don't have a roster, label by jersey # and their observed position.
Example: "Opponent DL #5" or "Opponent Safety #1"

Our Roster:
${lines}
=== END ROSTER ===\n`;
}

function checkFFmpeg() {
  return new Promise((resolve) => {
    exec('ffmpeg -version', (err, stdout) => {
      if (err) return resolve({ error: 'FFmpeg is not installed or not in system PATH' });
      const version = stdout.split('\n')[0];
      exec('ffprobe -version', (err2, stdout2) => {
        if (err2) return resolve({ error: 'FFprobe is not installed or not in system PATH' });
        const version2 = stdout2.split('\n')[0];
        resolve({ ffmpeg: version, ffprobe: version2 });
      });
    });
  });
}

function getVideoDuration(filePath) {
  return new Promise((resolve) => {
    // Attempt using ffprobe first
    exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, (err, stdout) => {
      if (!err && stdout) {
        const dur = parseFloat(stdout.trim());
        if (!isNaN(dur)) return resolve(dur);
      }
      // Fallback: ffmpeg
      exec(`ffmpeg -i "${filePath}"`, (err2, stdout2, stderr) => {
        const match = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (match) {
          const hrs = parseInt(match[1], 10);
          const mins = parseInt(match[2], 10);
          const secs = parseInt(match[3], 10);
          const ms = parseInt(match[4], 10);
          const dur = hrs * 3600 + mins * 60 + secs + ms / 100;
          resolve(dur);
        } else {
          resolve(0);
        }
      });
    });
  });
}

async function retryWithBackoff(fn, retries = 5, delay = 15000) {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    const isRateLimit = err.message?.includes('429') || err.status === 429 || err.message?.toLowerCase().includes('rate limit');
    const isTransient = err.message?.includes('503') || err.status === 503 || err.message?.includes('500') || err.status === 500 || err.message?.toLowerCase().includes('service unavailable') || err.message?.toLowerCase().includes('internal error');
    if (isRateLimit || isTransient) {
      // If rate limit, wait 45 seconds for the TPM bucket to reset.
      const waitTime = isRateLimit ? 45000 : delay;
      console.warn(`[API Error] Gemini API returned error: ${err.message}. Retrying in ${waitTime / 1000}s... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

async function uploadToGCS(filePath, bucketName, gcpKeyPath = null) {
  if (!Storage) {
    throw new Error('@google-cloud/storage is not installed or failed to load. Run: npm install');
  }
  const options = {};
  if (gcpKeyPath) {
    options.keyFilename = gcpKeyPath;
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    options.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const storage = new Storage(options);
  const bucket = storage.bucket(bucketName);
  const destName = `game-films/${Date.now()}-${path.basename(filePath)}`;
  console.log(`Uploading ${path.basename(filePath)} to GCS bucket ${bucketName}...`);
  await bucket.upload(filePath, {
    destination: destName,
    resumable: true,
    gzip: true,
  });
  console.log(`Uploaded successfully to gs://${bucketName}/${destName}`);
  return { bucketName, fileName: destName };
}

async function deleteFromGCS(bucketName, fileName, gcpKeyPath = null) {
  if (!Storage) return;
  const options = {};
  if (gcpKeyPath) {
    options.keyFilename = gcpKeyPath;
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    options.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const storage = new Storage(options);
  console.log(`Cleaning up GCS object: gs://${bucketName}/${fileName}`);
  await storage.bucket(bucketName).file(fileName).delete().catch(err => {
    console.warn(`Failed to delete GCS object: ${err.message}`);
  });
}

async function processSegment(fileUri, mimeType, rosterContext, opponent, filmType, segmentIndex, modelName) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: modelName });
  
  const systemPrompt = `You are the head film analyst for a competitive 8U youth football program.
${rosterContext}
${GROUND_TRUTH_RULES}

Analyze this video segment. Identify all plays, formations, standout players, and coaching points.
Opponent: ${opponent}
Film Type: ${filmType}`;

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
            title: { type: 'STRING', description: 'Short summary of the play.' },
            description: { type: 'STRING', description: 'Detailed play-by-play description, actions, and descriptors.' },
            players_involved: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Players involved.' }
          },
          required: ['start_seconds', 'end_seconds', 'play_type', 'title', 'description', 'players_involved']
        }
      },
      formations: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'Formations observed in this segment.'
      },
      standout_performances: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'Standout players and actions in this segment.'
      },
      coaching_points: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'Actionable coaching points and corrections.'
      }
    },
    required: ['plays', 'formations', 'standout_performances', 'coaching_points']
  };

  const generationConfig = {
    responseMimeType: 'application/json',
    responseSchema: requestSchema,
    temperature: 0.1
  };

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: systemPrompt },
          {
            fileData: {
              mimeType: mimeType || 'video/mp4',
              fileUri: fileUri
            }
          }
        ]
      }
    ],
    generationConfig
  });

  const responseText = result.response.text();
  return JSON.parse(responseText);
}

async function runTwoPassSegment(fileUri, mimeType, rosterContext, opponent, filmType, segmentIndex, modelName) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: modelName });
  const videoRef = { fileData: { mimeType: mimeType || 'video/mp4', fileUri } };

  // Pass 1: Forensic observations
  console.log(`[Segment ${segmentIndex}] Pass 1: Raw observation scan...`);
  const observationPrompt = `You are a FORENSIC VIDEO OBSERVER for youth football film. Your ONLY job is to describe what you LITERALLY see. Do NOT interpret plays. Do NOT say "pass" or "run" or "touchdown." Just describe physical movements and object positions.

=== BALL TRACKING (MOST IMPORTANT) ===
Track the football like a crime scene investigator tracks evidence. For EVERY second:
1. WHERE is the ball? (In whose hands? On the ground? In the air?)
2. HOW did it get there? Describe the PHYSICAL TRANSFER (HANDOFF, FORWARD PASS, PITCH/LATERAL).
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

  const pass1Result = await model.generateContent([
    { text: observationPrompt },
    videoRef
  ]);
  const rawObservations = pass1Result.response.text();
  console.log(`[Segment ${segmentIndex}] Pass 1 observations obtained (${rawObservations.length} characters).`);

  // Pass 2: Structured Analysis
  console.log(`[Segment ${segmentIndex}] Pass 2: Structured analysis using observations...`);
  const systemPrompt = `You are the head film analyst for a competitive 8U youth football program.
${rosterContext}
${GROUND_TRUTH_RULES}

Analyze this video segment. Identify all plays, formations, standout players, and coaching points.
Opponent: ${opponent}
Film Type: ${filmType}

=== GROUND TRUTH OBSERVATIONS (from frame-by-frame review) ===
Use these observations as GROUND TRUTH to determine the play type:
${rawObservations}

=== RUN vs PASS DECISION ===
- If the ball was HANDED from one player to an adjacent player → RUN PLAY.
- If the ball LEFT a player's hand, flew through the air with no contact, and was caught downfield → PASS PLAY.
- If observer noted "likely bird" or "uncertain" object → Do NOT assume thrown football.

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
            title: { type: 'STRING', description: 'Short summary of the play.' },
            description: { type: 'STRING', description: 'Detailed play-by-play description.' },
            players_involved: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Players involved.' }
          },
          required: ['start_seconds', 'end_seconds', 'play_type', 'title', 'description', 'players_involved']
        }
      },
      formations: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'Formations observed in this segment.'
      },
      standout_performances: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'Standout players and actions in this segment.'
      },
      coaching_points: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'Actionable coaching points and corrections.'
      }
    },
    required: ['plays', 'formations', 'standout_performances', 'coaching_points']
  };

  const generationConfig = {
    responseMimeType: 'application/json',
    responseSchema: requestSchema,
    temperature: 0.1
  };

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: systemPrompt },
          videoRef
        ]
      }
    ],
    generationConfig
  });

  const responseText = result.response.text();

  // Pass 3: Quality Control & Roster Audit
  console.log(`[Segment ${segmentIndex}] Pass 3: Auditing play log and player mapping...`);
  const auditPrompt = `You are a senior quality control auditor for youth football film analysis.
Your job is to audit the draft play log JSON against the raw observations and the active team roster.

=== ACTIVE ROSTER ===
${rosterContext}

=== RAW VIDEO OBSERVATIONS ===
${rawObservations}

=== DRAFT PLAY LOG JSON ===
${responseText}

=== AUDITING INSTRUCTIONS ===
1. Verify that every player in "players_involved" exists on the active roster. If a player was mapped to a jersey number or name not on the active roster, trace them in the raw observations to identify the correct active player, or label them as "unidentified [position]".
2. Double-check that there are absolutely no field goal blocks. Re-categorize them as punts, extra points, or regular plays.
3. Keep start and end times consistent with the observations.
4. Correct any spelling or layout errors.

Output the corrected, audited play log in the exact same JSON format.`;

  const auditResult = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: auditPrompt }
        ]
      }
    ],
    generationConfig
  });

  const auditedText = auditResult.response.text();
  try {
    return JSON.parse(auditedText);
  } catch (err) {
    console.warn(`[Warning] Pass 3 audited JSON parsing failed: ${err.message}. Retrying with markdown clean.`);
    const cleanAudited = auditedText.replace(/```json\n?|```/g, '').trim();
    try {
      return JSON.parse(cleanAudited);
    } catch (innerErr) {
      console.error(`[Error] Cleaned Pass 3 JSON also failed to parse. Falling back to Pass 2 draft JSON.`);
      const cleanDraft = responseText.replace(/```json\n?|```/g, '').trim();
      try {
        return JSON.parse(cleanDraft);
      } catch (draftErr) {
        console.error(`[Critical Error] Pass 2 draft JSON is also unparseable: ${draftErr.message}`);
        throw draftErr;
      }
    }
  }
}

async function main() {
  console.log('==================================================');
  console.log('          DELRAY ROCKS AI GAME FILM PROCESSOR     ');
  console.log('==================================================');

  // Verify API Key
  if (!GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY environment variable is not set.');
    console.error('Please configure it in c:\\projects\\delray-rocks\\.env.local');
    process.exit(1);
  }

  // Scan input directory
  console.log(`Scanning input directory: ${INPUT_DIR}`);
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Error: Input path does not exist: ${INPUT_DIR}`);
    process.exit(1);
  }

  const stat = fs.statSync(INPUT_DIR);
  let filesToProcess = [];
  if (stat.isDirectory()) {
    filesToProcess = fs.readdirSync(INPUT_DIR)
      .filter(f => f.toLowerCase().endsWith('.mp4'))
      .map(f => ({ name: f, path: path.join(INPUT_DIR, f), stat: fs.statSync(path.join(INPUT_DIR, f)) }))
      .sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs)
      .map(f => f.path);
  } else if (stat.isFile() && INPUT_DIR.toLowerCase().endsWith('.mp4')) {
    filesToProcess = [INPUT_DIR];
  }

  if (filesToProcess.length === 0) {
    console.error('Error: No MP4 video files found in the specified path.');
    process.exit(1);
  }

  console.log(`Found ${filesToProcess.length} video segment(s) to process:`);
  filesToProcess.forEach((f, idx) => {
    console.log(`  [${idx + 1}] ${path.basename(f)}`);
  });

  // Verify FFmpeg/FFprobe
  console.log('Verifying system dependencies (FFmpeg / FFprobe)...');
  const dependencyCheck = await checkFFmpeg();
  if (dependencyCheck.error) {
    console.warn(`Warning: FFmpeg check returned: ${dependencyCheck.error}`);
    console.warn('Duration scanning might fall back or fail if FFmpeg is unavailable.');
  } else {
    console.log(`FFmpeg:  ${dependencyCheck.ffmpeg}`);
    console.log(`FFprobe: ${dependencyCheck.ffprobe}`);
  }

  // Fetch Roster
  console.log('Loading team roster...');
  const roster = await getRoster();
  console.log(`Loaded ${roster.length} players from active football roster.`);

  if (params.dryRun) {
    console.log('\n--- DRY RUN VERIFICATION COMPLETE ---');
    console.log('All paths verified successfully.');
    console.log(`Model selected:    ${params.model}`);
    console.log(`Opponent:          ${params.opponent}`);
    console.log(`Film Type:         ${params.filmType}`);
    console.log(`Output JSON path:  ${OUTPUT_JSON}`);
    console.log(`Output MD path:    ${OUTPUT_MD}`);
    console.log(`GCS configuration: ${params.gcsBucket ? `Bucket: ${params.gcsBucket}` : 'None (using Files API fallback)'}`);
    console.log('Dry run complete. No API calls or file uploads were made.');
    console.log('==================================================');
    return;
  }

  // Load FileManager
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  let cumulativeOffset = 0;
  const aggregatedPlays = [];
  const aggregatedFormations = new Set();
  const aggregatedStandouts = new Set();
  const aggregatedCoachingPoints = new Set();

  const saveProgress = () => {
    const structuredLog = { plays: aggregatedPlays };
    const jsonOutputDir = path.dirname(OUTPUT_JSON);
    if (!fs.existsSync(jsonOutputDir)) {
      fs.mkdirSync(jsonOutputDir, { recursive: true });
    }
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(structuredLog, null, 2), 'utf8');

    let mdContent = `# Delray Rocks Game Film Analysis Summary\n\n`;
    mdContent += `**Opponent**: ${params.opponent}\n`;
    mdContent += `**Film Type**: ${params.filmType}\n`;
    mdContent += `**Total Segment Files**: ${filesToProcess.length}\n`;
    mdContent += `**Total Analyzed Duration**: ${(cumulativeOffset / 60).toFixed(1)} minutes\n`;
    mdContent += `**Total Plays Detected**: ${aggregatedPlays.length}\n\n`;

    mdContent += `## Formations\n`;
    if (aggregatedFormations.size > 0) {
      Array.from(aggregatedFormations).forEach(f => {
        mdContent += `- ${f}\n`;
      });
    } else {
      mdContent += `No formation trends recognized in this game film.\n`;
    }
    mdContent += `\n`;

    mdContent += `## Standout Players\n`;
    if (aggregatedStandouts.size > 0) {
      Array.from(aggregatedStandouts).forEach(s => {
        mdContent += `- ${s}\n`;
      });
    } else {
      mdContent += `No standout player performances explicitly highlighted.\n`;
    }
    mdContent += `\n`;

    mdContent += `## Coaching Points\n`;
    if (aggregatedCoachingPoints.size > 0) {
      Array.from(aggregatedCoachingPoints).forEach(c => {
        mdContent += `- ${c}\n`;
      });
    } else {
      mdContent += `No specific coaching points extracted.\n`;
    }
    mdContent += `\n`;

    mdContent += `## Play Log Breakdown\n\n`;
    mdContent += `| # | Time | Type | Title | Description |\n`;
    mdContent += `|---|------|------|-------|-------------|\n`;
    aggregatedPlays.forEach(play => {
      const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };
      mdContent += `| ${play.index} | ${formatTime(play.start)} - ${formatTime(play.end)} | ${play.play_type.toUpperCase()} | ${play.title} | ${play.description} |\n`;
    });

    const mdOutputDir = path.dirname(OUTPUT_MD);
    if (!fs.existsSync(mdOutputDir)) {
      fs.mkdirSync(mdOutputDir, { recursive: true });
    }
    fs.writeFileSync(OUTPUT_MD, mdContent, 'utf8');
    console.log(`[Incremental Save] Saved ${aggregatedPlays.length} plays to play log and summary.`);
  };

  for (let i = 0; i < filesToProcess.length; i++) {
    const filePath = filesToProcess[i];
    const fileName = path.basename(filePath);
    console.log(`\n--------------------------------------------------`);
    console.log(`Processing Segment [${i + 1}/${filesToProcess.length}]: ${fileName}`);
    console.log(`--------------------------------------------------`);

    // Get segment duration
    console.log('Determining video duration...');
    const duration = await getVideoDuration(filePath);
    console.log(`Segment duration: ${duration.toFixed(2)} seconds`);

    if (params.mock) {
      console.log(`[MOCK MODE] Simulating processing for ${fileName}...`);
      await new Promise(r => setTimeout(r, 500));
      
      const segmentResult = {
        plays: [
          {
            start_seconds: 12,
            end_seconds: 24,
            play_type: 'run',
            title: `Segment ${i + 1} - Play 1: Off-tackle run`,
            description: `RB #10 (Marcus Johnson) took a clean handoff from QB #12 and ran off the left tackle. Solid blocks by LT #72 and LG #54 secured the edge, resulting in a gain of 7 yards before being tackled by opponent OLB #44.`,
            players_involved: ['RB #10', 'LT #72', 'LG #54', 'QB #12']
          },
          {
            start_seconds: 38,
            end_seconds: 52,
            play_type: 'pass',
            title: `Segment ${i + 1} - Play 2: Corner route pass`,
            description: `QB #12 dropped back, evaded outside rush from opponent DE #99, and delivered a high pass to WR #88 on a corner route. WR #88 caught it in traffic for a first down. Excellent protection by C #62.`,
            players_involved: ['QB #12', 'WR #88', 'C #62']
          }
        ],
        formations: [
          'Spread offense with 2 receivers left and 1 right',
          '5-2 defensive scheme with overloaded linebackers'
        ],
        standout_performances: [
          `RB #10 (Marcus Johnson) exhibiting great lateral quickness and ball security`,
          `WR #88 securing the football under heavy coverage`
        ],
        coaching_points: [
          'Offensive tackle stance alignment needs to be wider to counter speed rushers',
          'Practice secondary contain drills for outside linebackers'
        ]
      };

      console.log(`[MOCK MODE] Segment analyzed successfully. Found ${segmentResult.plays.length} play(s).`);

      if (segmentResult.plays && Array.isArray(segmentResult.plays)) {
        segmentResult.plays.forEach(play => {
          const absoluteStart = cumulativeOffset + play.start_seconds;
          const absoluteEnd = cumulativeOffset + play.end_seconds;
          const playIndex = aggregatedPlays.length + 1;

          aggregatedPlays.push({
            index: playIndex,
            start: absoluteStart,
            end: absoluteEnd,
            start_seconds: absoluteStart,
            end_seconds: absoluteEnd,
            title: play.title,
            notes: play.description,
            play_type: play.play_type,
            source: 'sideline',
            description: play.description,
            players_involved: play.players_involved || []
          });
        });
      }

      if (segmentResult.formations && Array.isArray(segmentResult.formations)) {
        segmentResult.formations.forEach(f => aggregatedFormations.add(f));
      }

      if (segmentResult.standout_performances && Array.isArray(segmentResult.standout_performances)) {
        segmentResult.standout_performances.forEach(s => aggregatedStandouts.add(s));
      }

      if (segmentResult.coaching_points && Array.isArray(segmentResult.coaching_points)) {
        segmentResult.coaching_points.forEach(c => aggregatedCoachingPoints.add(c));
      }
    } else {
      // Determine chunks for this segment file
      const maxChunkDuration = 360; // 6 minutes (360 seconds)
      const chunks = [];
      if (duration > 900) { // If > 15 minutes, split into 6-minute chunks
        const numChunks = Math.ceil(duration / maxChunkDuration);
        console.log(`\n[Chunking] Segment duration (${duration.toFixed(2)}s) exceeds 15 minutes.`);
        console.log(`[Chunking] Splitting into ${numChunks} chunks of 6 minutes to prevent API token limit errors...`);
        for (let j = 0; j < numChunks; j++) {
          const chunkStart = j * maxChunkDuration;
          const chunkDur = Math.min(maxChunkDuration, duration - chunkStart);
          chunks.push({ index: j, start: chunkStart, duration: chunkDur });
        }
      } else {
        chunks.push({ index: 0, start: 0, duration: duration });
      }

      for (const chunk of chunks) {
        let tempChunkPath = null;
        let tempCompressedPath = null;
        let uploadPath = filePath;
        let gcsObject = null;
        let file = null;

        if (chunks.length > 1) {
          console.log(`\n--- Processing Chunk [${chunk.index + 1}/${chunks.length}] (Offset: ${chunk.start}s, Duration: ${chunk.duration.toFixed(2)}s) ---`);
          const tempDir = path.join(__dirname, '..', 'scratch', 'temp_compress');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          tempChunkPath = path.join(tempDir, `chunk-${chunk.index}-${fileName}`);
          console.log(`[Chunking] Splitting chunk lossless with FFmpeg copy...`);
          const splitCmd = `ffmpeg -y -ss ${chunk.start} -i "${filePath}" -t ${chunk.duration} -c copy "${tempChunkPath}"`;
          await new Promise((resolve, reject) => {
            exec(splitCmd, (err) => {
              if (err) {
                console.error(`[Chunking] FFmpeg split failed: ${err.message}`);
                reject(err);
              } else {
                resolve();
              }
            });
          });
          uploadPath = tempChunkPath;
        }

        const stats = fs.statSync(uploadPath);
        const MAX_SIZE_BYTES = 1.9 * 1024 * 1024 * 1024; // 1.9 GB limit
        if (stats.size > MAX_SIZE_BYTES) {
          console.log(`[Auto-Downscale] Video file size (${(stats.size / (1024 * 1024 * 1024)).toFixed(2)} GB) exceeds 2 GB.`);
          const tempDir = path.join(__dirname, '..', 'scratch', 'temp_compress');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          tempCompressedPath = path.join(tempDir, `compressed-chunk-${chunk.index}-${fileName}`);
          console.log(`[Auto-Downscale] Compressing chunk to 1080p: ${tempCompressedPath}...`);
          
          const ffmpegCmd = `ffmpeg -y -i "${uploadPath}" -vf "scale=1920:1080" -c:v libx264 -preset fast -crf 24 -c:a aac "${tempCompressedPath}"`;
          await new Promise((resolve, reject) => {
            exec(ffmpegCmd, (err) => {
              if (err) {
                console.error(`[Auto-Downscale] FFmpeg compression failed: ${err.message}`);
                reject(err);
              } else {
                console.log(`[Auto-Downscale] Compressed successfully. New size: ${(fs.statSync(tempCompressedPath).size / (1024 * 1024)).toFixed(2)} MB`);
                resolve();
              }
            });
          });
          uploadPath = tempCompressedPath;
        }

        // GCS Upload if configured
        if (params.gcsBucket) {
          try {
            gcsObject = await uploadToGCS(uploadPath, params.gcsBucket, params.gcpKey);
          } catch (err) {
            console.error(`GCS upload failed: ${err.message}`);
            console.log('Continuing using direct Gemini Files API upload...');
          }
        }

        try {
          // Upload to Gemini Files API
          console.log('Uploading file to Google AI Studio Files API...');
          const uploadResult = await fileManager.uploadFile(uploadPath, {
            mimeType: 'video/mp4',
            displayName: `segment-${i + 1}-chunk-${chunk.index + 1}-${fileName}`
          });

          file = uploadResult.file;
          console.log(`Google File URI: ${file.uri}`);
          console.log('Waiting for Google processing to complete...');
          
          while (file.state === 'PROCESSING' || file.state === FileState.PROCESSING) {
            process.stdout.write('.');
            await new Promise(r => setTimeout(r, 5000));
            file = await fileManager.getFile(file.name);
          }
          process.stdout.write('\n');

          if (file.state === 'FAILED' || file.state === FileState.FAILED) {
            console.error(`Error: Google processing failed for chunk ${chunk.index + 1} of ${fileName}. Skipping.`);
            continue;
          }

          console.log('Google processing complete. Analyzing segment contents...');

          const rosterContext = buildRosterContext(roster);

          const segmentResult = await retryWithBackoff(async () => {
            if (params.twoPass) {
              return await runTwoPassSegment(file.uri, file.mimeType, rosterContext, params.opponent, params.filmType, i + 1, params.model);
            } else {
              return await processSegment(file.uri, file.mimeType, rosterContext, params.opponent, params.filmType, i + 1, params.model);
            }
          });

          console.log(`Chunk analyzed successfully. Found ${segmentResult.plays?.length || 0} play(s).`);

          // Add to aggregated arrays
          if (segmentResult.plays && Array.isArray(segmentResult.plays)) {
            segmentResult.plays.forEach(play => {
              const absoluteStart = cumulativeOffset + chunk.start + play.start_seconds;
              const absoluteEnd = cumulativeOffset + chunk.start + play.end_seconds;
              const playIndex = aggregatedPlays.length + 1;

              aggregatedPlays.push({
                index: playIndex,
                start: absoluteStart,
                end: absoluteEnd,
                start_seconds: absoluteStart,
                end_seconds: absoluteEnd,
                title: play.title,
                notes: play.description,
                play_type: play.play_type,
                source: 'sideline',
                description: play.description,
                players_involved: play.players_involved || []
              });
            });
          }

          if (segmentResult.formations && Array.isArray(segmentResult.formations)) {
            segmentResult.formations.forEach(f => aggregatedFormations.add(f));
          }

          if (segmentResult.standout_performances && Array.isArray(segmentResult.standout_performances)) {
            segmentResult.standout_performances.forEach(s => aggregatedStandouts.add(s));
          }

          if (segmentResult.coaching_points && Array.isArray(segmentResult.coaching_points)) {
            segmentResult.coaching_points.forEach(c => aggregatedCoachingPoints.add(c));
          }

          // Save progress incrementally so files can be reviewed in real-time
          saveProgress();

        } catch (analysisErr) {
          console.error(`Error during chunk analysis: ${analysisErr.message}`);
        } finally {
          // Cleanup Files API object
          console.log('Cleaning up temporary Google File API object...');
          if (file && file.name) {
            await fileManager.deleteFile(file.name).catch(err => {
              console.warn(`Failed to delete Google File object: ${err.message}`);
            });
          }

          // Cleanup GCS if uploaded
          if (gcsObject) {
            await deleteFromGCS(params.gcsBucket, gcsObject.fileName, params.gcpKey);
          }

          // Cleanup local temp compressed file if created
          if (tempCompressedPath && fs.existsSync(tempCompressedPath)) {
            console.log(`[Auto-Downscale] Cleaning up temporary compressed file: ${tempCompressedPath}`);
            try {
              fs.unlinkSync(tempCompressedPath);
            } catch (unlinkErr) {
              console.warn(`Failed to clean up temporary compressed file: ${unlinkErr.message}`);
            }
          }

          // Cleanup local temp chunk file if created
          if (tempChunkPath && fs.existsSync(tempChunkPath)) {
            console.log(`[Chunking] Cleaning up temporary chunk file: ${tempChunkPath}`);
            try {
              fs.unlinkSync(tempChunkPath);
            } catch (unlinkErr) {
              console.warn(`Failed to clean up temporary chunk file: ${unlinkErr.message}`);
            }
          }
        }

        // Pause to prevent rate limiting
        if (chunks.length > 1) {
          console.log('[Rate Limit Prevention] Pausing 15s between chunks to let token bucket reset...');
          await new Promise(r => setTimeout(r, 15000));
        }
      }
    }

    cumulativeOffset += duration;
  }

  console.log('\n==================================================');
  console.log('          EXPORTING ANALYSIS RESULTS              ');
  console.log('==================================================');

  // 1. Structured JSON Export
  const structuredLog = {
    plays: aggregatedPlays
  };

  const jsonOutputDir = path.dirname(OUTPUT_JSON);
  if (!fs.existsSync(jsonOutputDir)) {
    fs.mkdirSync(jsonOutputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(structuredLog, null, 2), 'utf8');
  console.log(`Structured JSON Play Log saved to: ${OUTPUT_JSON}`);

  // 2. Markdown Export
  let mdContent = `# Delray Rocks Game Film Analysis Summary\n\n`;
  mdContent += `**Opponent**: ${params.opponent}\n`;
  mdContent += `**Film Type**: ${params.filmType}\n`;
  mdContent += `**Total Segment Files**: ${filesToProcess.length}\n`;
  mdContent += `**Total Analyzed Duration**: ${(cumulativeOffset / 60).toFixed(1)} minutes\n`;
  mdContent += `**Total Plays Detected**: ${aggregatedPlays.length}\n\n`;

  mdContent += `## Formations\n`;
  if (aggregatedFormations.size > 0) {
    Array.from(aggregatedFormations).forEach(f => {
      mdContent += `- ${f}\n`;
    });
  } else {
    mdContent += `No formation trends recognized in this game film.\n`;
  }
  mdContent += `\n`;

  mdContent += `## Standout Players\n`;
  if (aggregatedStandouts.size > 0) {
    Array.from(aggregatedStandouts).forEach(s => {
      mdContent += `- ${s}\n`;
    });
  } else {
    mdContent += `No standout player performances explicitly highlighted.\n`;
  }
  mdContent += `\n`;

  mdContent += `## Coaching Points\n`;
  if (aggregatedCoachingPoints.size > 0) {
    Array.from(aggregatedCoachingPoints).forEach(c => {
      mdContent += `- ${c}\n`;
    });
  } else {
    mdContent += `No specific coaching points extracted.\n`;
  }
  mdContent += `\n`;

  mdContent += `## Play Log Breakdown\n\n`;
  mdContent += `| # | Time | Type | Title | Description |\n`;
  mdContent += `|---|------|------|-------|-------------|\n`;
  aggregatedPlays.forEach(play => {
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    mdContent += `| ${play.index} | ${formatTime(play.start)} - ${formatTime(play.end)} | ${play.play_type.toUpperCase()} | ${play.title} | ${play.description} |\n`;
  });

  const mdOutputDir = path.dirname(OUTPUT_MD);
  if (!fs.existsSync(mdOutputDir)) {
    fs.mkdirSync(mdOutputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_MD, mdContent, 'utf8');
  console.log(`Markdown Game Summary Report saved to: ${OUTPUT_MD}`);
  console.log('==================================================');
  console.log('Process completed successfully!');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
