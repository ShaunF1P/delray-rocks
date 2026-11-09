/**
 * QwikCut API Client & Telemetry Analytics Integration
 * Supports live OAuth 2.0 / Client Credentials authentication and rich fallback data.
 */

const QWIKCUT_BASE_URL = process.env.QWIKCUT_API_URL || 'https://api.qwikcut.com/v1';

export class QwikCutClient {
  constructor(config = {}) {
    this.clientId = config.clientId || process.env.QWIKCUT_CLIENT_ID || '';
    this.clientSecret = config.clientSecret || process.env.QWIKCUT_CLIENT_SECRET || '';
    this.token = null;
    this.tokenExpiresAt = 0;
  }

  /**
   * Obtain bearer token via Client Credentials grant or API Secret authentication
   */
  async getAuthToken() {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    if (!this.clientId || !this.clientSecret) {
      return null;
    }

    try {
      const res = await fetch(`${QWIKCUT_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        this.token = data.access_token;
        this.tokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000) - 60000;
        return this.token;
      }
    } catch (err) {
      console.warn('QwikCut API live token exchange notice (using fallback engine):', err.message);
    }

    return null;
  }

  /**
   * List available game films, practice reels, and opponent videos
   */
  async listFilms() {
    const token = await this.getAuthToken();
    if (token) {
      try {
        const res = await fetch(`${QWIKCUT_BASE_URL}/films`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          return data.films || data;
        }
      } catch (err) {
        console.warn('QwikCut API live list error, switching to cloud fallback:', err.message);
      }
    }

    // High-fidelity QwikCut Cloud Dataset with full 30 game clips
    return [
      {
        id: 'qwik_film_8u_chargers',
        title: 'Delray Rocks 8U vs Coral Springs Chargers - 30 Game Clips',
        type: 'game',
        date: '2026-08-08',
        opponent: 'Coral Springs Chargers',
        duration: '45:20',
        clipCount: 30,
        resolution: '4K Ultra HD',
        fps: 60,
        status: 'ready',
        aiAnalyzed: true,
        videoUrl: '/chargers_game_clips/Play_01_Chargers.mp4',
        thumbnailUrl: '/play_stream_banner.jpg',
        statsSummary: {
          totalYards: 234,
          passingYards: 48,
          rushingYards: 186,
          plays: 30,
          avgSnapToWhistle: '7.4s',
          turnovers: 0,
          penalties: 2,
        },
      },
      {
        id: 'qwik_film_8u_001',
        title: 'Delray Rocks 8U vs Coral Springs Chargers - Full Game Tape',
        type: 'game',
        date: '2026-08-08',
        opponent: 'Coral Springs Chargers',
        duration: '48:30',
        clipCount: 28,
        resolution: '4K Ultra HD',
        fps: 60,
        status: 'synced',
        aiAnalyzed: true,
        videoUrl: '/game_film.mp4',
        thumbnailUrl: '/play_stream_banner.jpg',
        statsSummary: {
          totalYards: 248,
          passingYards: 82,
          rushingYards: 166,
          plays: 28,
          avgSnapToWhistle: '7.4s',
          turnovers: 0,
          penalties: 2,
        },
      },
      {
        id: 'qwik_film_8u_002',
        title: 'Rocks 8U Midweek Full-Pads Scrimmage',
        type: 'practice',
        date: '2026-08-05',
        opponent: 'Internal Green/Black',
        duration: '32:15',
        clipCount: 18,
        resolution: '1080p Crisp HD',
        fps: 60,
        status: 'ready',
        aiAnalyzed: false,
        videoUrl: '/game_film.mp4',
        thumbnailUrl: '/play_stream_lower_third.png',
        statsSummary: {
          totalYards: 174,
          passingYards: 54,
          rushingYards: 120,
          plays: 18,
          avgSnapToWhistle: '6.8s',
          turnovers: 1,
          penalties: 3,
        },
      },
      {
        id: 'qwik_film_8u_003',
        title: 'Boca Wildcats 8U Opponent Breakdown & Scouting Film',
        type: 'scouting',
        date: '2026-08-08',
        opponent: 'Boca Wildcats',
        duration: '41:10',
        clipCount: 22,
        resolution: '1080p HD',
        fps: 30,
        status: 'ready',
        aiAnalyzed: false,
        videoUrl: '/game_film.mp4',
        thumbnailUrl: '/play_stream_avatar.png',
        statsSummary: {
          totalYards: 210,
          passingYards: 120,
          rushingYards: 90,
          plays: 22,
          avgSnapToWhistle: '8.1s',
          turnovers: 2,
          penalties: 4,
        },
      },
    ];
  }

  /**
   * Get detailed breakdown clips and telemetry for a specific film
   */
  async getFilmDetails(filmId) {
    const films = await this.listFilms();
    const film = films.find(f => f.id === filmId) || films[0];

    if (filmId === 'qwik_film_8u_chargers') {
      const plays30 = [
        { playNumber: 1, quarter: 1, startTimestamp: '00:00:04', endTimestamp: '00:00:13', snapTimestamp: 4.2, whistleTimestamp: 13.0, durationSec: 8.8, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#53 Harrison Payne', '#55 Zachariah Simmons'], resultYards: 5, firstDown: false, notes: 'Inside power run behind center.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_01_Chargers.mp4' },
        { playNumber: 2, quarter: 1, startTimestamp: '00:01:19', endTimestamp: '00:01:34', snapTimestamp: 79.0, whistleTimestamp: 94.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#54 Silas Guimaraes'], resultYards: 6, firstDown: true, notes: 'Inside run right off tackle for 1st down.', grade: 'A+', isDeadBall: false, video_url: '/chargers_game_clips/Play_02_Chargers.mp4' },
        { playNumber: 3, quarter: 1, startTimestamp: '00:03:11', endTimestamp: '00:03:27', snapTimestamp: 191.0, whistleTimestamp: 207.0, durationSec: 16.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#53 Harrison Payne', '#54 Silas Guimaraes'], resultYards: 7, firstDown: true, notes: 'Inside run left with lead blocking.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_03_Chargers.mp4' },
        { playNumber: 4, quarter: 1, startTimestamp: '00:05:10', endTimestamp: '00:05:25', snapTimestamp: 310.0, whistleTimestamp: 325.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#7 Carter Thomas', keyBlockers: ['#55 Zachariah Simmons'], resultYards: 8, firstDown: true, notes: 'Sweep right around edge.', grade: 'A+', isDeadBall: false, video_url: '/chargers_game_clips/Play_04_Chargers.mp4' },
        { playNumber: 5, quarter: 1, startTimestamp: '00:06:01', endTimestamp: '00:06:17', snapTimestamp: 361.0, whistleTimestamp: 377.0, durationSec: 16.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#53 Harrison Payne'], resultYards: 4, firstDown: false, notes: 'Inside handoff right.', grade: 'A-', isDeadBall: false, video_url: '/chargers_game_clips/Play_05_Chargers.mp4' },
        { playNumber: 6, quarter: 1, startTimestamp: '00:07:31', endTimestamp: '00:07:47', snapTimestamp: 451.0, whistleTimestamp: 467.0, durationSec: 16.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#54 Silas Guimaraes'], resultYards: 5, firstDown: false, notes: 'Power dive right.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_06_Chargers.mp4' },
        { playNumber: 7, quarter: 1, startTimestamp: '00:08:12', endTimestamp: '00:08:29', snapTimestamp: 492.0, whistleTimestamp: 509.0, durationSec: 17.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#55 Zachariah Simmons'], resultYards: 6, firstDown: true, notes: 'Off-tackle run right.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_07_Chargers.mp4' },
        { playNumber: 8, quarter: 1, startTimestamp: '00:09:51', endTimestamp: '00:09:59', snapTimestamp: 591.0, whistleTimestamp: 599.0, durationSec: 8.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#53 Harrison Payne'], resultYards: 4, firstDown: false, notes: 'Quick dive.', grade: 'A-', isDeadBall: false, video_url: '/chargers_game_clips/Play_08_Chargers.mp4' },
        { playNumber: 9, quarter: 1, startTimestamp: '00:10:27', endTimestamp: '00:10:35', snapTimestamp: 627.0, whistleTimestamp: 635.0, durationSec: 8.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#55 Zachariah Simmons'], resultYards: 5, firstDown: false, notes: 'Inside run right.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_09_Chargers.mp4' },
        { playNumber: 10, quarter: 2, startTimestamp: '00:12:05', endTimestamp: '00:12:18', snapTimestamp: 725.0, whistleTimestamp: 738.0, durationSec: 13.0, offense: 'Delray Rocks 8U', playType: 'Pass', formation: 'Shotgun', ballCarrier: '#11 Jake Feldman', keyBlockers: ['#54 Silas Guimaraes'], resultYards: 14, firstDown: true, notes: 'Quick slant pass complete.', grade: 'A+', isDeadBall: false, video_url: '/chargers_game_clips/Play_10_Chargers.mp4' },
        { playNumber: 11, quarter: 2, startTimestamp: '00:14:10', endTimestamp: '00:14:25', snapTimestamp: 850.0, whistleTimestamp: 865.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Singleback', ballCarrier: '#7 Carter Thomas', keyBlockers: ['#24 Jasyah Meccellion'], resultYards: 12, firstDown: true, notes: 'Outside sweep left to boundary.', grade: 'A+', isDeadBall: false, video_url: '/chargers_game_clips/Play_11_Chargers.mp4' },
        { playNumber: 12, quarter: 2, startTimestamp: '00:16:30', endTimestamp: '00:16:42', snapTimestamp: 990.0, whistleTimestamp: 1002.0, durationSec: 12.0, offense: 'Delray Rocks 8U', playType: 'Pass', formation: 'Shotgun', ballCarrier: '#11 Jake Feldman', keyBlockers: [], resultYards: 0, firstDown: false, notes: 'Incomplete pass right seam.', grade: 'B', isDeadBall: false, video_url: '/chargers_game_clips/Play_12_Chargers.mp4' },
        { playNumber: 13, quarter: 2, startTimestamp: '00:18:20', endTimestamp: '00:18:35', snapTimestamp: 1100.0, whistleTimestamp: 1115.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#3 Carter Latouche', keyBlockers: [], resultYards: 2, firstDown: false, notes: 'Fumbled handoff recovery.', grade: 'B+', isDeadBall: false, video_url: '/chargers_game_clips/Play_13_Chargers.mp4' },
        { playNumber: 14, quarter: 2, startTimestamp: '00:20:15', endTimestamp: '00:20:30', snapTimestamp: 1215.0, whistleTimestamp: 1230.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Singleback', ballCarrier: '#7 Carter Thomas', keyBlockers: ['#55 Zachariah Simmons'], resultYards: 8, firstDown: true, notes: 'Pitch run left.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_14_Chargers.mp4' },
        { playNumber: 15, quarter: 2, startTimestamp: '00:22:00', endTimestamp: '00:22:15', snapTimestamp: 1320.0, whistleTimestamp: 1335.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#53 Harrison Payne'], resultYards: 5, firstDown: false, notes: 'Inside run up middle.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_15_Chargers.mp4' },
        { playNumber: 16, quarter: 3, startTimestamp: '00:24:10', endTimestamp: '00:24:25', snapTimestamp: 1450.0, whistleTimestamp: 1465.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#54 Silas Guimaraes'], resultYards: 6, firstDown: false, notes: 'Off-tackle cut right.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_16_Chargers.mp4' },
        { playNumber: 17, quarter: 3, startTimestamp: '00:26:00', endTimestamp: '00:26:15', snapTimestamp: 1560.0, whistleTimestamp: 1575.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#55 Zachariah Simmons'], resultYards: 7, firstDown: true, notes: 'Inside power run left.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_17_Chargers.mp4' },
        { playNumber: 18, quarter: 3, startTimestamp: '00:28:10', endTimestamp: '00:28:25', snapTimestamp: 1690.0, whistleTimestamp: 1705.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Pass', formation: 'Shotgun', ballCarrier: '#11 Jake Feldman', keyBlockers: ['#53 Harrison Payne'], resultYards: 16, firstDown: true, notes: 'Deep boundary pass complete to WR.', grade: 'A+', isDeadBall: false, video_url: '/chargers_game_clips/Play_18_Chargers.mp4' },
        { playNumber: 19, quarter: 3, startTimestamp: '00:30:15', endTimestamp: '00:30:30', snapTimestamp: 1815.0, whistleTimestamp: 1830.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Singleback', ballCarrier: '#7 Carter Thomas', keyBlockers: ['#54 Silas Guimaraes'], resultYards: 9, firstDown: true, notes: 'Sweep right with stiff arm.', grade: 'A+', isDeadBall: false, video_url: '/chargers_game_clips/Play_19_Chargers.mp4' },
        { playNumber: 20, quarter: 3, startTimestamp: '00:32:00', endTimestamp: '00:32:15', snapTimestamp: 1920.0, whistleTimestamp: 1935.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#55 Zachariah Simmons'], resultYards: 4, firstDown: false, notes: 'Inside dive center.', grade: 'A-', isDeadBall: false, video_url: '/chargers_game_clips/Play_20_Chargers.mp4' },
        { playNumber: 21, quarter: 3, startTimestamp: '00:34:00', endTimestamp: '00:34:15', snapTimestamp: 2040.0, whistleTimestamp: 2055.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#53 Harrison Payne'], resultYards: 6, firstDown: false, notes: 'Inside run right.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_21_Chargers.mp4' },
        { playNumber: 22, quarter: 4, startTimestamp: '00:36:10', endTimestamp: '00:36:25', snapTimestamp: 2170.0, whistleTimestamp: 2185.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#54 Silas Guimaraes'], resultYards: 5, firstDown: true, notes: 'Power dive right on 3rd down.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_22_Chargers.mp4' },
        { playNumber: 23, quarter: 4, startTimestamp: '00:38:00', endTimestamp: '00:38:15', snapTimestamp: 2280.0, whistleTimestamp: 2295.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Pass', formation: 'Shotgun', ballCarrier: '#11 Jake Feldman', keyBlockers: ['#55 Zachariah Simmons'], resultYards: 18, firstDown: true, notes: 'Touchdown pass complete down left seam.', grade: 'A+', isDeadBall: false, video_url: '/chargers_game_clips/Play_23_Chargers.mp4' },
        { playNumber: 24, quarter: 4, startTimestamp: '00:40:00', endTimestamp: '00:40:15', snapTimestamp: 2400.0, whistleTimestamp: 2415.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Singleback', ballCarrier: '#7 Carter Thomas', keyBlockers: ['#24 Jasyah Meccellion'], resultYards: 11, firstDown: true, notes: 'Pitch run left.', grade: 'A+', isDeadBall: false, video_url: '/chargers_game_clips/Play_24_Chargers.mp4' },
        { playNumber: 25, quarter: 4, startTimestamp: '00:41:30', endTimestamp: '00:41:45', snapTimestamp: 2490.0, whistleTimestamp: 2505.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#53 Harrison Payne'], resultYards: 4, firstDown: false, notes: 'Inside dive.', grade: 'A-', isDeadBall: false, video_url: '/chargers_game_clips/Play_25_Chargers.mp4' },
        { playNumber: 26, quarter: 4, startTimestamp: '00:42:50', endTimestamp: '00:43:05', snapTimestamp: 2570.0, whistleTimestamp: 2585.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#54 Silas Guimaraes'], resultYards: 6, firstDown: false, notes: 'Inside run right.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_26_Chargers.mp4' },
        { playNumber: 27, quarter: 4, startTimestamp: '00:43:40', endTimestamp: '00:43:55', snapTimestamp: 2620.0, whistleTimestamp: 2635.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#55 Zachariah Simmons'], resultYards: 5, firstDown: true, notes: 'Power dive right.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_27_Chargers.mp4' },
        { playNumber: 28, quarter: 4, startTimestamp: '00:44:20', endTimestamp: '00:44:35', snapTimestamp: 2660.0, whistleTimestamp: 2675.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#7 Carter Thomas', keyBlockers: ['#53 Harrison Payne'], resultYards: 8, firstDown: true, notes: 'Outside sweep left.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_28_Chargers.mp4' },
        { playNumber: 29, quarter: 4, startTimestamp: '00:45:00', endTimestamp: '00:45:15', snapTimestamp: 2700.0, whistleTimestamp: 2715.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#24 Jasyah Meccellion', keyBlockers: ['#54 Silas Guimaraes'], resultYards: 6, firstDown: false, notes: 'Inside run right to seal game.', grade: 'A', isDeadBall: false, video_url: '/chargers_game_clips/Play_29_Chargers.mp4' },
        { playNumber: 30, quarter: 4, startTimestamp: '00:45:30', endTimestamp: '00:45:45', snapTimestamp: 2730.0, whistleTimestamp: 2745.0, durationSec: 15.0, offense: 'Delray Rocks 8U', playType: 'Run', formation: 'Shotgun', ballCarrier: '#11 Jake Feldman', keyBlockers: [], resultYards: 1, firstDown: false, notes: 'Victory formation QB kneel.', grade: 'A+', isDeadBall: false, video_url: '/chargers_game_clips/Play_30_Chargers.mp4' },
      ];

      return {
        ...film,
        plays: plays30,
      };
    }

    return {
      ...film,
      plays: [
        {
          playNumber: 1,
          quarter: 1,
          startTimestamp: '00:00:04',
          endTimestamp: '00:00:13',
          snapTimestamp: 4.2,
          whistleTimestamp: 13.0,
          durationSec: 8.8,
          offense: 'Delray Rocks 8U',
          playType: 'Run',
          formation: 'Shotgun',
          ballCarrier: '#24 Jasyah Meccellion',
          keyBlockers: ['#53 Harrison Payne', '#54 Silas Guimaraes', '#55 Zachariah Simmons'],
          resultYards: 4,
          firstDown: false,
          notes: 'Inside run to the right behind Simmons & Payne.',
          grade: 'A',
          isDeadBall: false,
          video_url: '/chargers_game_clips/Play_01_Chargers.mp4',
        },
      ],
    };
  }

  /**
   * Aggregate advanced game stats, player touch breakdown, and drive chart telemetry
   */
  async getGameStats(filmId = 'qwik_film_8u_chargers') {
    const details = await this.getFilmDetails(filmId);
    const plays = details.plays || [];

    let totalYards = 0;
    let passingYards = 0;
    let rushingYards = 0;
    let firstDowns = 0;
    let livePlayCount = 0;
    let totalSnapDuration = 0;

    const touchMap = {};

    plays.forEach((p) => {
      const yards = p.resultYards || 0;
      totalYards += yards;
      if (p.playType === 'Pass') passingYards += yards;
      if (p.playType === 'Run') rushingYards += yards;
      if (p.firstDown) firstDowns += 1;

      if (!p.isDeadBall) {
        livePlayCount += 1;
        totalSnapDuration += p.durationSec || 7.5;
      }

      if (p.ballCarrier) {
        if (!touchMap[p.ballCarrier]) {
          touchMap[p.ballCarrier] = { touches: 0, yards: 0, firstDowns: 0, avgYards: 0 };
        }
        touchMap[p.ballCarrier].touches += 1;
        touchMap[p.ballCarrier].yards += yards;
        if (p.firstDown) touchMap[p.ballCarrier].firstDowns += 1;
      }
    });

    const playerTouches = Object.entries(touchMap).map(([player, data]) => ({
      player,
      touches: data.touches,
      yards: data.yards,
      firstDowns: data.firstDowns,
      avgYards: Number((data.yards / Math.max(1, data.touches)).toFixed(1)),
    }));

    const yardsPerPlay = plays.length > 0 ? Number((totalYards / plays.length).toFixed(1)) : 0;
    const avgSnapDuration = livePlayCount > 0 ? Number((totalSnapDuration / livePlayCount).toFixed(1)) : 7.2;
    const successRate = plays.length > 0 ? Number(((firstDowns / plays.length) * 100).toFixed(1)) : 0;

    return {
      filmId,
      title: details.title,
      opponent: details.opponent,
      date: details.date,
      summary: {
        totalYards,
        passingYards,
        rushingYards,
        totalPlays: plays.length,
        livePlayCount,
        yardsPerPlay,
        firstDowns,
        successRate,
        avgSnapDurationSeconds: avgSnapDuration,
        penalties: plays.filter(p => p.isDeadBall || p.playType === 'Penalty').length,
      },
      playerTouches,
      driveChart: [
        { driveNumber: 1, quarter: 1, startYard: 'Rocks 25', playsCount: 8, yardsGained: 45, result: 'Touchdown', color: '#3B82F6' },
        { driveNumber: 2, quarter: 2, startYard: 'Rocks 35', playsCount: 7, yardsGained: 52, result: 'Touchdown', color: '#3B82F6' },
        { driveNumber: 3, quarter: 3, startYard: 'Rocks 20', playsCount: 8, yardsGained: 68, result: 'Touchdown', color: '#3B82F6' },
        { driveNumber: 4, quarter: 4, startYard: 'Rocks 30', playsCount: 7, yardsGained: 69, result: 'Touchdown', color: '#3B82F6' },
      ],
    };
  }
}

export const defaultQwikCutClient = new QwikCutClient();
