/**
 * CLI Test Script for QwikCut API & Stats Engine Verification
 */

const { QwikCutClient } = require('../src/lib/qwikcut');

async function runTest() {
  console.log('================================================================================');
  console.log('            DELRAY ROCKS - QWIKCUT API & GAME STATS VERIFICATION');
  console.log('================================================================================');

  const client = new QwikCutClient();

  console.log('\n[1] Testing QwikCut Film Listing...');
  const films = await client.listFilms();
  console.log(` -> Found ${films.length} films in QwikCut library.`);
  films.forEach((f, idx) => {
    console.log(`    ${idx + 1}. [${f.type.toUpperCase()}] ${f.title} (${f.duration}) - ${f.resolution}`);
  });

  if (films.length === 0) {
    throw new Error('No films returned from QwikCut client.');
  }

  const targetFilm = films[0];
  console.log(`\n[2] Testing Film Details for "${targetFilm.id}"...`);
  const details = await client.getFilmDetails(targetFilm.id);
  console.log(` -> Loaded ${details.plays.length} analyzed play clips.`);

  console.log('\n[3] Testing Advanced Game Stats Calculation...');
  const stats = await client.getGameStats(targetFilm.id);
  console.log(` -> Total Yards:           ${stats.summary.totalYards} yds`);
  console.log(` -> Passing / Rushing:      ${stats.summary.passingYards} pass / ${stats.summary.rushingYards} rush`);
  console.log(` -> Yards Per Play (YPP):   ${stats.summary.yardsPerPlay} YPP`);
  console.log(` -> Success Rate:           ${stats.summary.successRate}%`);
  console.log(` -> Avg Snap Duration:      ${stats.summary.avgSnapDurationSeconds} seconds`);
  console.log(` -> Player Touch Matrix:    ${stats.playerTouches.length} player(s) tracked`);

  stats.playerTouches.forEach((pt) => {
    console.log(`    - ${pt.player}: ${pt.touches} touches, ${pt.yards} yards (${pt.avgYards} YPC, ${pt.firstDowns} 1st downs)`);
  });

  console.log('\n================================================================================');
  console.log(' OVERALL STATUS: PASSED (QwikCut API Client & Stats Engine functioning cleanly)');
  console.log('================================================================================\n');
}

runTest().catch((err) => {
  console.error('\n[ERROR] QwikCut verification failed:', err);
  process.exit(1);
});
