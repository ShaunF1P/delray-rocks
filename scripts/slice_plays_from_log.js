/**
 * slice_plays_from_log.js
 * 
 * Phase 3: Read the sideline_log_v2.json produced by Phase 2,
 * slice variable-length clips from parent segment videos,
 * upload to Supabase Storage, and create game_films records.
 * 
 * Usage: node scripts/slice_plays_from_log.js [--log path/to/sideline_log_v2.json]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

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

const { createClient } = require(path.join(__dirname, '..', 'node_modules', '@supabase/supabase-js'));
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse args
const args = process.argv.slice(2);
let logPath = path.join(__dirname, '..', 'scratch', 'sideline_log_v2.json');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--log') logPath = args[++i];
}

const TEMP_DIR = path.join(__dirname, '..', 'scratch', 'temp_clips');
const SEGMENT_CACHE_DIR = path.join(__dirname, '..', 'scratch', 'temp_segments');

async function main() {
  console.log('==================================================');
  console.log('  PHASE 3: SLICE & UPLOAD PLAY CLIPS');
  console.log('==================================================\n');

  // 1. Read sideline log
  if (!fs.existsSync(logPath)) {
    console.error(`Sideline log not found: ${logPath}`);
    console.error('Run Phase 2 (reanalyze_segments.js) first.');
    process.exit(1);
  }

  const sidelineLog = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const plays = sidelineLog.plays;
  console.log(`Loaded ${plays.length} plays from sideline log.\n`);

  if (plays.length === 0) {
    console.log('No plays to process. Exiting.');
    return;
  }

  // 2. Fetch parent segments from DB
  const { data: segments, error } = await supabase
    .from('game_films')
    .select('id, title, video_url, duration_seconds, opponent, film_date')
    .eq('opponent', 'Baby Zip')
    .like('title', 'RTG vs.%')
    .order('title');

  if (error || !segments) {
    console.error('Failed to fetch segments:', error);
    process.exit(1);
  }

  // Build segment lookup by ID
  const segMap = {};
  segments.forEach(s => { segMap[s.id] = s; });
  console.log(`Found ${segments.length} parent segments.\n`);

  // Create temp directories
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  // 3. Check for already-cached segment downloads from Phase 2
  const segmentFiles = {};
  for (const seg of segments) {
    const idx = segments.indexOf(seg) + 1;
    const cachePath = path.join(SEGMENT_CACHE_DIR, `seg_${idx}.mp4`);
    if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 1000) {
      segmentFiles[seg.id] = cachePath;
      console.log(`  Segment ${idx} (${seg.title.replace('RTG vs. Baby Zip - ', '')}): Using cached file`);
    } else {
      // We'll use remote URL directly with ffmpeg (it supports HTTP inputs)
      segmentFiles[seg.id] = seg.video_url;
      console.log(`  Segment ${idx} (${seg.title.replace('RTG vs. Baby Zip - ', '')}): Will use remote URL`);
    }
  }

  // 4. Process each play
  console.log(`\n--- Slicing ${plays.length} play clips ---\n`);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < plays.length; i++) {
    const play = plays[i];
    const parentSeg = segMap[play.segment_id];

    if (!parentSeg) {
      console.error(`  Play ${play.index}: No parent segment found for ID ${play.segment_id}`);
      failCount++;
      continue;
    }

    const startTime = play.start_seconds;
    const endTime = play.end_seconds;
    const duration = Math.round(endTime - startTime);

    if (duration <= 0 || duration > 120) {
      console.warn(`  Play ${play.index}: Skipping -- invalid duration (${duration}s)`);
      failCount++;
      continue;
    }

    // Clip filename
    const clipFilename = `clip_v2_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp4`;
    const tempClipPath = path.join(TEMP_DIR, clipFilename);
    const inputSource = segmentFiles[play.segment_id];

    console.log(`  Play ${play.index}: [${formatTime(startTime)}-${formatTime(endTime)}] (${duration}s) | ${play.title.substring(0, 60)}...`);

    // Slice with ffmpeg
    try {
      const ffmpegCmd = `ffmpeg -y -ss ${startTime} -i "${inputSource}" -t ${duration} -c copy -movflags +faststart "${tempClipPath}"`;
      execSync(ffmpegCmd, { stdio: 'pipe', timeout: 120000 });
    } catch (err) {
      console.error(`    FFmpeg slice failed: ${err.message?.substring(0, 100)}`);
      failCount++;
      continue;
    }

    // Verify file
    if (!fs.existsSync(tempClipPath) || fs.statSync(tempClipPath).size === 0) {
      console.error(`    Clip file empty or missing`);
      failCount++;
      continue;
    }

    // Upload to Supabase Storage
    const storagePath = `play_clips/${clipFilename}`;
    try {
      const fileBuffer = fs.readFileSync(tempClipPath);
      const { error: uploadErr } = await supabase.storage
        .from('game-films')
        .upload(storagePath, fileBuffer, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadErr) {
        console.error(`    Storage upload failed: ${uploadErr.message}`);
        failCount++;
        continue;
      }
    } catch (err) {
      console.error(`    Upload error: ${err.message}`);
      failCount++;
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('game-films')
      .getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Create game_films record
    const playTitle = `Play ${play.index}: ${play.title.replace(/^Play \d+:\s*/i, '')}`;
    const { error: insertErr } = await supabase
      .from('game_films')
      .insert({
        title: playTitle,
        description: play.description,
        film_type: 'drill',
        opponent: parentSeg.opponent,
        film_date: parentSeg.film_date,
        video_url: publicUrl,
        parent_film_id: play.segment_id,
        clip_start_seconds: startTime,
        clip_end_seconds: endTime,
        duration_seconds: duration,
        ai_status: 'completed'
      });

    if (insertErr) {
      console.error(`    DB insert failed: ${insertErr.message}`);
      failCount++;
      continue;
    }

    successCount++;

    // Cleanup temp clip
    try { fs.unlinkSync(tempClipPath); } catch {}

    // Brief pause to avoid overwhelming Supabase
    if (i % 10 === 9) {
      console.log(`    [Progress: ${successCount} created, ${failCount} failed out of ${i + 1} processed]`);
    }
  }

  // 5. Final report
  console.log('\n==================================================');
  console.log('  PHASE 3 COMPLETE');
  console.log('==================================================');
  console.log(`  Total plays processed: ${plays.length}`);
  console.log(`  Successfully created:  ${successCount}`);
  console.log(`  Failed:                ${failCount}`);

  // Verify in DB
  const { count } = await supabase
    .from('game_films')
    .select('id', { count: 'exact', head: true })
    .eq('opponent', 'Baby Zip')
    .like('title', 'Play %');

  console.log(`  DB verification:       ${count || 0} play clips in database`);

  // Quick stats
  const { data: newPlays } = await supabase
    .from('game_films')
    .select('title, duration_seconds, description')
    .eq('opponent', 'Baby Zip')
    .like('title', 'Play %')
    .order('title');

  if (newPlays && newPlays.length > 0) {
    const durations = newPlays.map(p => p.duration_seconds).filter(d => d > 0);
    const uniqueDescs = new Set(newPlays.map(p => p.description?.substring(0, 50)));
    console.log(`  Duration range:        ${Math.min(...durations)}s - ${Math.max(...durations)}s`);
    console.log(`  Avg duration:          ${(durations.reduce((a,b)=>a+b,0)/durations.length).toFixed(1)}s`);
    console.log(`  Unique descriptions:   ${uniqueDescs.size} out of ${newPlays.length}`);
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
