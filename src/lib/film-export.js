/**
 * film-export.js
 * 
 * Professional Film Cutting Export Utility for Delray Rocks.
 * Generates industry-standard video editing and sports breakdown formats:
 * 1. CMX 3600 EDL (.edl) - Compatible with DaVinci Resolve, Adobe Premiere Pro, Final Cut Pro
 * 2. FCPXML (.xml) - Final Cut Pro / DaVinci Resolve Sequence Interchange format
 * 3. Hudl CSV Breakdown (.csv) - Hudl-standard import format with play-by-play attribution
 * 
 * Zero AI Emojis enforced.
 */

/**
 * Converts seconds to timecode format (HH:MM:SS:FF)
 * @param {number} totalSeconds 
 * @param {number} fps Default 30 fps
 * @returns {string} HH:MM:SS:FF
 */
export function secondsToTimecode(totalSeconds, fps = 30) {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = Math.floor((totalSeconds - Math.floor(totalSeconds)) * fps);

  const pad = (num, len = 2) => String(num).padStart(len, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

/**
 * Generates a standard CMX 3600 Edit Decision List (EDL)
 * @param {Object} options
 * @param {string} options.title Title of the game or reel
 * @param {string} options.reelName Reel name (max 8 chars, e.g. "REEL_001")
 * @param {Array} options.plays Array of play objects with start, end, title
 * @param {number} options.fps Frame rate (default 30)
 * @returns {string} CMX 3600 formatted EDL string
 */
export function generateCMX3600EDL({
  title = 'GAME_FILM',
  reelName = 'AX',
  plays = [],
  fps = 30,
}) {
  const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase().slice(0, 32);
  const lines = [
    `TITLE: ${cleanTitle}`,
    `FCM: NON-DROP FRAME`,
    '',
  ];

  let recordTimelineSec = 0;

  plays.forEach((play, index) => {
    const editNum = String(index + 1).padStart(3, '0');
    const startSec = Math.max(0, Number(play.start || play.start_seconds || 0));
    const endSec = Math.max(startSec + 0.1, Number(play.end || play.end_seconds || startSec + 5));
    const duration = endSec - startSec;

    const sourceIn = secondsToTimecode(startSec, fps);
    const sourceOut = secondsToTimecode(endSec, fps);
    const recordIn = secondsToTimecode(recordTimelineSec, fps);
    const recordOut = secondsToTimecode(recordTimelineSec + duration, fps);

    // Format: 001  AX       V     C        00:01:12:00 00:01:22:15 00:00:00:00 00:00:10:15
    const line = `${editNum}  ${reelName.padEnd(8, ' ')} V     C        ${sourceIn} ${sourceOut} ${recordIn} ${recordOut}`;
    lines.push(line);
    
    // Comments for NLE markers
    const playTitle = (play.title || `Play ${index + 1}`).replace(/[\r\n]/g, ' ');
    lines.push(`* FROM CLIP NAME: ${playTitle}`);
    if (play.description) {
      lines.push(`* COMMENT: ${play.description.replace(/[\r\n]/g, ' ').slice(0, 80)}`);
    }
    lines.push('');

    recordTimelineSec += duration;
  });

  return lines.join('\r\n');
}

/**
 * Generates an FCPXML (Final Cut Pro / DaVinci Resolve) sequence interchange file
 * @param {Object} options
 * @param {string} options.title Project or film title
 * @param {Array} options.plays Array of play objects
 * @param {string} options.videoUrl Optional source video URL or file path
 * @param {number} options.fps Frame rate (default 30)
 * @returns {string} XML string
 */
export function generateFCPXML({
  title = 'Delray Rocks Film Cut',
  plays = [],
  videoUrl = 'film_master.mp4',
  fps = 30,
}) {
  const cleanTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const timebase = fps;
  let totalFrames = 0;

  const clipElements = plays.map((play, index) => {
    const startSec = Math.max(0, Number(play.start || play.start_seconds || 0));
    const endSec = Math.max(startSec + 0.1, Number(play.end || play.end_seconds || startSec + 5));
    const durationSec = endSec - startSec;
    
    const inFrame = Math.round(startSec * timebase);
    const outFrame = Math.round(endSec * timebase);
    const durFrames = Math.round(durationSec * timebase);
    const startFrameOnTimeline = totalFrames;
    totalFrames += durFrames;

    const playTitle = (play.title || `Play ${index + 1}`)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `        <clipitem id="clipitem-${index + 1}">
          <name>${playTitle}</name>
          <duration>${durFrames}</duration>
          <rate>
            <timebase>${timebase}</timebase>
            <ntsc>FALSE</ntsc>
          </rate>
          <start>${startFrameOnTimeline}</start>
          <end>${totalFrames}</end>
          <in>${inFrame}</in>
          <out>${outFrame}</out>
          <file id="file-1">
            <name>${cleanTitle}</name>
            <pathurl>${videoUrl}</pathurl>
            <rate>
              <timebase>${timebase}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
          </file>
        </clipitem>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <project>
    <name>${cleanTitle}</name>
    <children>
      <sequence id="sequence-1">
        <name>${cleanTitle} - AutoCut Plays</name>
        <duration>${totalFrames}</duration>
        <rate>
          <timebase>${timebase}</timebase>
          <ntsc>FALSE</ntsc>
        </rate>
        <media>
          <video>
            <format>
              <samplecharacteristics>
                <width>1920</width>
                <height>1080</height>
                <rate>
                  <timebase>${timebase}</timebase>
                  <ntsc>FALSE</ntsc>
                </rate>
              </samplecharacteristics>
            </format>
            <track>
${clipElements}
            </track>
          </video>
        </media>
      </sequence>
    </children>
  </project>
</xmeml>`;
}

/**
 * Generates a Hudl-compliant CSV Breakdown Manifest
 * Matches Hudl's standard column headers for football film breakdown import.
 * @param {Object} options
 * @param {string} options.filmTitle
 * @param {Array} options.plays
 * @param {string} options.opponent
 * @returns {string} CSV string
 */
export function generateHudlCSV({
  filmTitle = 'Delray Rocks Game',
  opponent = 'Opponent',
  plays = [],
}) {
  const headers = [
    'Play #',
    'ODK',
    'Quarter',
    'Down',
    'Distance',
    'Yard Line',
    'Hash',
    'Play Type',
    'Result',
    'Gain/Loss',
    'Ball Carrier',
    'Key Defender',
    'Formation Offense',
    'Formation Defense',
    'Grade',
    'Play Title',
    'Start Time',
    'End Time',
    'Duration (s)',
    'Video Clip Name',
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = plays.map((play, index) => {
    const playNum = play.index || (index + 1);
    const startSec = Math.max(0, Number(play.start || play.start_seconds || 0));
    const endSec = Math.max(startSec + 0.1, Number(play.end || play.end_seconds || startSec + 5));
    const duration = Math.round(endSec - startSec);

    // Heuristically detect ODK (Offense / Defense / Kick)
    let odk = play.odk || 'O';
    const text = `${play.title || ''} ${play.description || ''}`.toLowerCase();
    if (text.includes('kickoff') || text.includes('punt') || text.includes('field goal') || text.includes('pat')) {
      odk = 'K';
    } else if (text.includes('defense') || text.includes('interception') || text.includes('tackle')) {
      odk = play.odk || 'D';
    }

    // Heuristically extract play type
    let playType = play.playType || 'Run';
    if (text.includes('pass') || text.includes('screen') || text.includes('throw') || text.includes('slant')) {
      playType = 'Pass';
    } else if (text.includes('penalty') || text.includes('offsides') || text.includes('dead ball') || text.includes('false start')) {
      playType = 'Penalty';
    }

    // Formatted clip filename
    const cleanGameName = filmTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
    const clipFilename = `${cleanGameName}_P${String(playNum).padStart(2, '0')}.mp4`;

    return [
      escapeCSV(playNum),
      escapeCSV(odk),
      escapeCSV(play.quarter || 1),
      escapeCSV(play.down || 1),
      escapeCSV(play.distance || 10),
      escapeCSV(play.yardLine || 'OWN 35'),
      escapeCSV(play.hash || 'Middle'),
      escapeCSV(playType),
      escapeCSV(play.result || 'Complete'),
      escapeCSV(play.gain !== undefined ? play.gain : ''),
      escapeCSV(play.ballCarrier || play.player || ''),
      escapeCSV(play.tackler || play.defender || ''),
      escapeCSV(play.offenseFormation || 'Spread'),
      escapeCSV(play.defenseFormation || '4-3'),
      escapeCSV(play.grade || ''),
      escapeCSV(play.title || `Play ${playNum}`),
      escapeCSV(secondsToTimecode(startSec)),
      escapeCSV(secondsToTimecode(endSec)),
      escapeCSV(duration),
      escapeCSV(clipFilename),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}
