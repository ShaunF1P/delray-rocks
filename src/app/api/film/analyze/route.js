import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-pro';

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

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  try {
    const { fileUri, mimeType, filmType, opponent, analysisType, roster } = await request.json();
    const rosterContext = buildRosterContext(roster);

    const prompts = {
      full_breakdown: `You are an elite youth football (8U) coaching analyst — on par with what Hudl Pro, Sportscode, or Catapult provides.
${rosterContext}
Analyze this game film and provide:

1. **Formation Recognition**: Identify every offensive and defensive formation used. Name them precisely (e.g., "Shotgun Trips Right", "I-Formation Strong", "4-3 Under"). For OUR formations, label each player position on the line (LT, LG, C, RG, RT, TE, WR) and backfield (QB, FB, HB, WB).
2. **Play-by-Play Breakdown**: For EVERY visible play (not just the first one), describe:
   - Pre-snap alignment and motion
   - Play call type (run/pass/screen/special)
   - Blocking assignments by position (e.g., "LG #54 pulls to lead through the B-gap")
   - Ball carrier/receiver performance
   - Defensive response and gaps exploited or defended
3. **Key Player Performances**: Identify players by POSITION, jersey number, and name from the roster. Note speed, technique, decision-making.
4. **Tactical Trends**: What offensive/defensive tendencies are visible? Down-and-distance patterns? Formation tendencies?
5. **Coaching Recommendations**: Specific drill suggestions to fix weaknesses and amplify strengths. Reference specific players by name.
6. **Play Success/Failure Analysis**: For each play, state if it succeeded or failed and WHY (missed block by which OL position, wrong read, great coverage by which DB, etc.).

Opponent: ${opponent || 'Unknown'}
Film Type: ${filmType || 'game'}
CRITICAL: Analyze the ENTIRE film, not just the first play. Provide timestamps for every significant play.
Format your response in clear sections with headers.`,

      player_tracking: `You are a sports biomechanics and performance analyst for youth football (8U).
${rosterContext}
Watch this film and for EVERY visible player on OUR team, provide a detailed assessment:

**OFFENSIVE LINE (label each: LT, LG, C, RG, RT)**:
- Stance and first step (explosion vs. slow fire-out)
- Pad level (playing low vs. standing upright)
- Drive blocking power and sustain
- Pull technique (if applicable)
- Pass protection sets (if applicable)

**SKILL POSITIONS (QB, RB, WR, TE)**:
- Movement Analysis: acceleration, top speed, agility, change of direction
- Ball skills: carrying, catching, throwing mechanics
- Vision and decision-making

**DEFENSIVE PLAYERS (label: DE, DT, LB, CB, S)**:
- Gap discipline and assignment execution
- Pursuit angles and closing speed
- Tackling form (Heads Up Football technique)
- Read and react speed

**FOR ALL PLAYERS:**
1. **Effort Metrics**: Rate hustle on a 1-5 scale per play. Call out loafing AND hustle plays.
2. **Technique Assessment**: Grade each player A-F on fundamentals
3. **Fatigue Indicators**: Note any visible decline over the course of the film

Reference every player by Position, Jersey #, and Name (e.g., "RB #10 (Marcus Johnson)").
Include specific timestamps for notable plays.`,

      highlights: `You are a highlight reel editor for youth football.
${rosterContext}
Watch this film and:

1. **Identify Top Plays**: Find the most exciting, impressive, or noteworthy plays
2. **Rank by Impact**: Order from most impressive to least
3. **Timestamp Each**: Provide approximate timestamps for each highlight moment
4. **Describe the Action**: What makes each play special (big hit, long run, great catch, etc.)
5. **Player Callouts**: Reference by Position, Jersey #, and Name. Which player(s) deserve individual highlight reels from this film?

Focus on plays that would look great on social media or a parent highlight reel.`,

      quick_summary: `You are a head coach's assistant for an 8U youth football team.
${rosterContext}
Watch this football film and provide a concise tactical summary:

1. **Score/Result**: If identifiable
2. **Top 3 Takeaways**: Most important observations
3. **Players of the Game**: Reference by Position, Jersey #, and Name
4. **Position Group Grades**: Grade each position group (OL, RB, QB, DL, LB, DB) on a letter scale A-F
5. **Areas for Improvement**: 3 key things to work on in practice, referencing specific players
6. **Next Game Prep**: What to emphasize based on what you see

Keep it concise and actionable — this goes straight to the coaching staff.`,
    };

    const systemPrompt = prompts[analysisType] || prompts.full_breakdown;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const contentParts = [{ text: systemPrompt }];

    if (fileUri) {
      contentParts.push({
        fileData: {
          mimeType: mimeType || 'video/mp4',
          fileUri: fileUri,
        },
      });
    } else {
      contentParts.push({
        text: 'No video was provided. Please provide analysis guidance for the coaching staff based on general 8U football best practices.',
      });
    }

    const result = await model.generateContent(contentParts);
    const analysisText = result.response.text();

    return NextResponse.json({
      analysis: analysisText,
      model: GEMINI_MODEL,
      analysisType,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Film analysis error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
