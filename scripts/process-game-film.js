/**
 * process-game-film.js
 * 
 * Reusable local utility script to process large 4K game film videos from your XBotGo Falcon device
 * (located in Google Drive or local storage), compress them to web-friendly 1080p, and merge them
 * into a single continuous master video file for coaches.
 * 
 * Requirements:
 * - Node.js installed
 * - FFmpeg installed and in system PATH
 * 
 * Usage:
 *   node scripts/process-game-film.js [options]
 * 
 * Options:
 *   --input, -i       Input directory (default: "G:\\My Drive\\7.18.26\\20260718")
 *   --output, -o      Output path (default: "G:\\My Drive\\7.18.26\\RTG_vs_Baby_Zip_Master_1080p.mp4")
 *   --preset, -p      FFmpeg preset: ultrafast, superfast, veryfast, faster, fast, medium (default: fast)
 *   --crf, -c         Constant Rate Factor 0-51 (default: 23, lower is higher quality)
 *   --nvenc           Use NVIDIA GPU acceleration (h264_nvenc) for ultra-fast compression
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const params = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' || args[i] === '-i') {
    params.input = args[++i];
  } else if (args[i] === '--output' || args[i] === '-o') {
    params.output = args[++i];
  } else if (args[i] === '--preset' || args[i] === '-p') {
    params.preset = args[++i];
  } else if (args[i] === '--crf' || args[i] === '-c') {
    params.crf = parseInt(args[++i], 10);
  } else if (args[i] === '--nvenc') {
    params.nvenc = true;
  }
}

// Default values optimized for RTG vs Baby Zip game
const INPUT_DIR = params.input || 'G:\\My Drive\\7.18.26\\20260718';
const OUTPUT_FILE = params.output || 'G:\\My Drive\\7.18.26\\RTG_vs_Baby_Zip_Master_1080p.mp4';
const PRESET = params.preset || 'fast';
const CRF = params.crf || 23;
const USE_NVENC = params.nvenc || false;

// The ordered sequence of videos forming the RTG vs Baby Zip game
const DEFAULT_FILES = [
  'RTG VS Baby Zip 3 7.18.26.mp4',
  'VID_20260718_145028_01_01.mp4',
  'RTG VS Baby Zip 2 7.18.26.mp4',
  'RTG VS Baby Zip 7.18.26.mp4',
  'VID_20260718_153209_01_01.mp4',
  'VID_20260718_154802_01_01.mp4'
];

// Temporary directory for intermediate 1080p compressed clips
const TEMP_DIR = path.join(__dirname, '..', 'scratch', 'temp_compress');

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, { stdio: 'inherit', shell: true });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });
    proc.on('error', (err) => reject(err));
  });
}

async function main() {
  console.log('=== DELRAY ROCKS GAME FILM PROCESSOR ===');
  console.log(`Input Directory: ${INPUT_DIR}`);
  console.log(`Output Master:   ${OUTPUT_FILE}`);
  console.log(`Quality preset:  ${PRESET} (CRF: ${CRF})`);
  if (USE_NVENC) console.log('GPU Acceleration: NVIDIA NVENC enabled');

  // Verify input folder exists
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Error: Input directory does not exist: ${INPUT_DIR}`);
    process.exit(1);
  }

  // Create temp dir
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // Determine list of files to process
  let filesToProcess = [];
  if (!params.input && !params.output) {
    // If running with no args, use the default sequence for RTG vs Baby Zip
    filesToProcess = DEFAULT_FILES.map(f => path.join(INPUT_DIR, f));
  } else {
    // Otherwise scan input dir for all mp4 files in alphabetical/chronological order
    filesToProcess = fs.readdirSync(INPUT_DIR)
      .filter(f => f.toLowerCase().endsWith('.mp4'))
      .sort()
      .map(f => path.join(INPUT_DIR, f));
  }

  // Verify files exist and calculate original total size
  let totalOriginalSize = 0;
  const verifiedFiles = [];
  for (const file of filesToProcess) {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      totalOriginalSize += stats.size;
      verifiedFiles.push(file);
    } else {
      console.warn(`Warning: File not found, skipping: ${file}`);
    }
  }

  if (verifiedFiles.length === 0) {
    console.error('Error: No video files found to process.');
    process.exit(1);
  }

  console.log(`Found ${verifiedFiles.length} files to process.`);
  console.log(`Total original size: ${(totalOriginalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);

  // 1. Compress each file to a temporary 1080p clip
  const tempOutputs = [];
  for (let i = 0; i < verifiedFiles.length; i++) {
    const file = verifiedFiles[i];
    const basename = path.basename(file, '.mp4');
    const tempOut = path.join(TEMP_DIR, `${basename}_1080p.mp4`);
    tempOutputs.push(tempOut);

    console.log(`\n--- Compressing File [${i + 1}/${verifiedFiles.length}]: ${path.basename(file)} ---`);

    const ffmpegArgs = [
      '-y',
      '-i', `"${file}"`,
      '-vf', 'scale=1920:1080'
    ];

    if (USE_NVENC) {
      // NVIDIA Hardware encoding
      ffmpegArgs.push(
        '-c:v', 'h264_nvenc',
        '-preset', 'fast',
        '-cq', `${CRF}`
      );
    } else {
      // Standard CPU encoding
      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', PRESET,
        '-crf', `${CRF}`
      );
    }

    ffmpegArgs.push(
      '-c:a', 'aac',
      '-b:a', '128k',
      `"${tempOut}"`
    );

    try {
      await runCommand('ffmpeg', ffmpegArgs);
    } catch (err) {
      console.error(`Error compressing file ${file}:`, err.message);
      cleanupTempFiles(tempOutputs);
      process.exit(1);
    }
  }

  // 2. Concatenate compressed files
  console.log('\n--- Merging Compressed Files ---');
  const concatFile = path.join(TEMP_DIR, 'concat_list.txt');
  const concatContent = tempOutputs.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(concatFile, concatContent);

  const concatArgs = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', `"${concatFile}"`,
    '-c', 'copy',
    `"${OUTPUT_FILE}"`
  ];

  try {
    await runCommand('ffmpeg', concatArgs);
    console.log('\nCompression and merge completed successfully!');

    // Calculate final size details
    const stats = fs.statSync(OUTPUT_FILE);
    const finalSize = stats.size;
    const ratio = ((totalOriginalSize - finalSize) / totalOriginalSize * 100).toFixed(1);

    console.log('\n=== RESULTS SUMMARY ===');
    console.log(`Original size:   ${(totalOriginalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`Compressed size: ${(finalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`Size reduction:  ${ratio}%`);
    console.log(`Master Video File Saved To: ${OUTPUT_FILE}`);
    console.log('=======================');
    console.log('\nNext Steps:');
    console.log('1. Open your Delray Rocks film portal.');
    console.log('2. Click "Upload Film" and drag & drop the new master file:');
    console.log(`   ${path.basename(OUTPUT_FILE)}`);
    console.log('3. Complete the upload in seconds instead of hours!');

  } catch (err) {
    console.error('Error concatenating files:', err.message);
  } finally {
    // 3. Cleanup temp files
    console.log('\nCleaning up temporary files...');
    cleanupTempFiles(tempOutputs.concat([concatFile]));
  }
}

function cleanupTempFiles(paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch (err) {
        console.error(`Failed to delete temp file ${p}:`, err.message);
      }
    }
  }
  try {
    if (fs.existsSync(TEMP_DIR) && fs.readdirSync(TEMP_DIR).length === 0) {
      fs.rmdirSync(TEMP_DIR);
    }
  } catch (err) {
    // Ignore error deleting temp directory
  }
}

main();
