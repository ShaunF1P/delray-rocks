/**
 * retry_failed_plays.js
 * 
 * Fixes and retries the 18 failed plays from Phase 3:
 * - 0-duration plays get a minimum 5-second window
 * - Upload failures get retried with smaller timeout
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

const TEMP_DIR = path.join(__dirname, '..', 'scratch', 'temp_clips');
const SEG_DIR = path.join(__dirname, '..', 'scratch', 'temp_segments');

async function main() {
  console.log('=== RETRY FAILED PLAYS ===\n');

  // Load sideline log
  const logPath = path.join(__dirname, '..', 'scratch', 'sideline_log_v2.json');
  const sidelineLog = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const allPlays = sidelineLog.plays;

  // Get existing plays in DB to know which ones succeeded
  const { data: existing } = await supabase
    .from('game_films')
    .select('title, clip_start_seconds, clip_end_seconds')
    .eq('opponent', 'Baby Zip')
    .like('title', 'Play %');

  const existingTitles = new Set(existing?.map(e => e.title) || []);
  console.log(`${existingTitles.size} plays already in DB.`);

  // Get segments
  const { data: segments } = await supabase
    .from('game_films')
    .select('id, title, video_url, duration_seconds, opponent, film_date')
    .eq('opponent', 'Baby Zip')
    .like('title', 'RTG vs.%')
    .order('title');

  const segMap = {};
  segments.forEach(s => { segMap[s.id] = s; });

  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  let successCount = 0;
  let failCount = 0;

  for (const play of allPlays) {
    // Build the title to check if already exists
    const playTitle = `Play ${play.index}: ${play.title.replace(/^Play \d+:\s*/i, '')}`;
    if (existingTitles.has(playTitle)) {
      continue; // Already succeeded
    }

    const parentSeg = segMap[play.segment_id];
    if (!parentSeg) {
      console.log(`  Play ${play.index}: No parent segment. Skipping.`);
      failCount++;
      continue;
    }

    let startTime = play.start_seconds;
    let endTime = play.end_seconds;
    let duration = Math.round(endTime - startTime);

    // Fix 0-duration plays: give them a 6-second window
    if (duration <= 0) {
      console.log(`  Play ${play.index}: Fixing 0-duration -> 6s window from ${startTime}s`);
      endTime = startTime + 6;
      duration = 6;
      
      // Make sure we don't exceed segment duration
      if (endTime > parentSeg.duration_seconds) {
        startTime = Math.max(0, parentSeg.duration_seconds - 6);
        endTime = parentSeg.duration_seconds;
        duration = Math.round(endTime - startTime);
      }
    }

    if (duration <= 0 || duration > 120) {
      console.log(`  Play ${play.index}: Still invalid duration (${duration}s). Skipping.`);
      failCount++;
      continue;
    }

    // Determine input source (prefer cached local file)
    const segIdx = segments.indexOf(parentSeg) + 1;
    const cachedPath = path.join(SEG_DIR, `seg_${segIdx}.mp4`);
    const inputSource = (fs.existsSync(cachedPath) && fs.statSync(cachedPath).size > 1000)
      ? cachedPath
      : parentSeg.video_url;

    const clipFilename = `clip_v2_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp4`;
    const tempClipPath = path.join(TEMP_DIR, clipFilename);

    console.log(`  Play ${play.index}: [${formatTime(startTime)}-${formatTime(endTime)}] (${duration}s) | ${play.title.substring(0, 60)}`);

    // Slice
    try {
      execSync(`ffmpeg -y -ss ${startTime} -i "${inputSource}" -t ${duration} -c copy -movflags +faststart "${tempClipPath}"`, {
        stdio: 'pipe',
        timeout: 120000
      });
    } catch (err) {
      console.error(`    FFmpeg failed: ${err.message?.substring(0, 80)}`);
      failCount++;
      continue;
    }

    if (!fs.existsSync(tempClipPath) || fs.statSync(tempClipPath).size === 0) {
      console.error(`    Empty clip file`);
      failCount++;
      continue;
    }

    // Upload with retry
    const storagePath = `play_clips/${clipFilename}`;
    let uploaded = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const fileBuffer = fs.readFileSync(tempClipPath);
        const { error: uploadErr } = await supabase.storage
          .from('game-films')
          .upload(storagePath, fileBuffer, {
            contentType: 'video/mp4',
            upsert: true
          });
        if (uploadErr) throw new Error(uploadErr.message);
        uploaded = true;
        break;
      } catch (err) {
        console.log(`    Upload attempt ${attempt}/3 failed: ${err.message?.substring(0, 60)}`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
      }
    }

    if (!uploaded) {
      failCount++;
      try { fs.unlinkSync(tempClipPath); } catch {}
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('game-films')
      .getPublicUrl(storagePath);

    // Insert DB record
    const { error: insertErr } = await supabase
      .from('game_films')
      .insert({
        title: playTitle,
        description: play.description,
        film_type: 'drill',
        opponent: parentSeg.opponent,
        film_date: parentSeg.film_date,
        video_url: urlData.publicUrl,
        parent_film_id: play.segment_id,
        clip_start_seconds: startTime,
        clip_end_seconds: endTime,
        duration_seconds: duration,
        ai_status: 'completed'
      });

    if (insertErr) {
      console.error(`    DB insert failed: ${insertErr.message}`);
      failCount++;
    } else {
      successCount++;
    }

    try { fs.unlinkSync(tempClipPath); } catch {}
  }

  console.log(`\n=== RETRY COMPLETE ===`);
  console.log(`  Newly created: ${successCount}`);
  console.log(`  Still failed:  ${failCount}`);

  // Final verification
  const { count } = await supabase
    .from('game_films')
    .select('id', { count: 'exact', head: true })
    .eq('opponent', 'Baby Zip')
    .like('title', 'Play %');

  console.log(`  Total plays in DB: ${count}`);
}

function formatTime(s) {
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
