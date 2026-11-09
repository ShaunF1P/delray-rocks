/**
 * regenerate_plays.js
 * 
 * Phase 1: Delete all existing play clips from the Baby Zip game.
 * Removes both database records and Supabase Storage files.
 * Parent segment videos are NOT touched.
 */

const fs = require('fs');
const path = require('path');

// Load env
const dotenvPath = path.join(__dirname, '..', '.env.local');
fs.readFileSync(dotenvPath, 'utf8').split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
});

const { createClient } = require(path.join(__dirname, '..', 'node_modules', '@supabase/supabase-js'));
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('=== PHASE 1: CLEANING UP OLD PLAY CLIPS ===\n');

  // 1. Find all play clips
  const { data: plays, error: fetchErr } = await supabase
    .from('game_films')
    .select('id, title, video_url, parent_film_id')
    .eq('opponent', 'Baby Zip')
    .like('title', 'Play %');

  if (fetchErr) {
    console.error('Failed to fetch play clips:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${plays.length} play clips to delete.\n`);

  if (plays.length === 0) {
    console.log('Nothing to clean up. Exiting.');
    return;
  }

  // 2. Delete files from Supabase Storage
  console.log('--- Deleting files from Supabase Storage ---');
  let storageDeleted = 0;
  let storageFailed = 0;

  for (const play of plays) {
    if (!play.video_url) continue;
    
    // Extract storage path from URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/game-films/play_clips/clip_xxx.mp4
    const urlParts = play.video_url.split('/game-films/');
    if (urlParts.length < 2) {
      console.log(`  Skipping ${play.title} -- URL doesn't match expected pattern`);
      continue;
    }
    
    const storagePath = urlParts[1];
    const { error: delErr } = await supabase.storage
      .from('game-films')
      .remove([storagePath]);
    
    if (delErr) {
      console.log(`  Failed to delete storage file for ${play.title}: ${delErr.message}`);
      storageFailed++;
    } else {
      storageDeleted++;
    }
  }

  console.log(`Storage cleanup: ${storageDeleted} deleted, ${storageFailed} failed\n`);

  // 3. Delete database records
  console.log('--- Deleting database records ---');
  const ids = plays.map(p => p.id);
  
  // Delete in batches of 50
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const { error: delErr } = await supabase
      .from('game_films')
      .delete()
      .in('id', batch);
    
    if (delErr) {
      console.error(`  Batch delete failed (${i}-${i + batch.length}):`, delErr);
    } else {
      console.log(`  Deleted batch ${Math.floor(i/50) + 1}: ${batch.length} records`);
    }
  }

  // 4. Verify
  const { count } = await supabase
    .from('game_films')
    .select('id', { count: 'exact', head: true })
    .eq('opponent', 'Baby Zip')
    .like('title', 'Play %');

  console.log(`\nVerification: ${count || 0} play clips remaining (should be 0)`);
  
  if (count === 0) {
    console.log('\nPhase 1 complete. All old play clips have been deleted.');
  } else {
    console.error('\nWARNING: Some play clips were not deleted!');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
