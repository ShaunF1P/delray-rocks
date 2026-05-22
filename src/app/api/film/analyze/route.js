import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const maxDuration = 60;

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

// This critical instruction goes into EVERY prompt
const GROUND_TRUTH_RULES = `

=== GROUND TRUTH RULES — FOLLOW THESE EXACTLY ===
1. ONLY describe what you ACTUALLY SEE in the video. Do NOT fabricate, infer, or guess details.
2. If a play is a DEAD BALL (penalty flag, offsides, false start, referee whistle, coach intervention), SAY SO. Do NOT analyze a dead ball as a live play.
3. If players line up and then the play is blown dead before a snap or after a penalty, report it as: "DEAD BALL — [reason]" (e.g., "DEAD BALL — Offsides on defense, 5-yard penalty assessed").
4. If you see teams moving forward or backward without running a play, that is likely a PENALTY ENFORCEMENT (e.g., walking off 5 yards for offsides). Report it as such.
5. If you CANNOT clearly see a jersey number, say "unidentified" — do NOT make up a number.
6. If you CANNOT determine what happened, say "unclear from film angle" — do NOT fabricate a narrative.
7. Count the actual number of LIVE plays in the clip. A live play = snap to whistle with actual football action. Pre-snap penalties and dead balls are NOT live plays.
8. Be HONEST about what the film quality and angle allows you to see. A single sideline camera cannot show all 22 players.

=== PLAYER IDENTIFICATION RULES ===
Jersey numbers are HARD to read on youth football film. Use this identification hierarchy:
1. **POSITION FIRST**: Always identify by field position (e.g., "the Left DE", "the DT aligned over the center"). This is your primary identifier.
2. **PHYSICAL DESCRIPTORS (minimum 2-3)**: You MUST include at least 2-3 distinguishing features for every key player you reference. Use these in order of visibility:
   - **Shoe/cleat color** (most visible from sideline — white cleats, neon green shoes, black cleats, etc.)
   - **Hair** (long hair, braids, mohawk, buzzcut, hair sticking out of helmet)
   - **Build/size** (tallest on the DL, stocky, smallest LB, etc.)
   - **Equipment** (visor, colored gloves, arm sleeve, towel, wristband)
   - **Skin tone** (if helpful for distinguishing between adjacent players)
   Example: "the Left DE (long hair, white cleats, tall build)"
3. **JERSEY NUMBER (with confidence)**: Only state a jersey number if you can clearly read it. If uncertain, say "appears to be #53 (uncertain)" or "possibly #5 or #53". NEVER state a number with false confidence.
4. **COMBINE ALL THREE**: Best format: "Left DE #53 (long hair, white cleats, tall) — committed the offsides"
5. If the number is unreadable, position + 2-3 physical descriptors IS enough: "the Left DE (long hair, white cleats, tall build) committed the infraction"
=== END PLAYER IDENTIFICATION RULES ===
=== END GROUND TRUTH RULES ===
`;

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  try {
    const { fileUri, videoUrl, mimeType, filmType, opponent, analysisType, roster, clipStart, clipEnd, speedMode } = await request.json();
    const GEMINI_MODEL = speedMode === 'pro' ? 'gemini-3.5-pro' : 'gemini-3.5-flash';
    const rosterContext = buildRosterContext(roster);
    const isClip = clipStart != null && clipEnd != null;

    const prompts = {
      // For clips: focused single-play analysis
      clip_breakdown: `You are an elite youth football (8U) film analyst reviewing a single play or short clip.
${rosterContext}
${GROUND_TRUTH_RULES}

This clip is ${isClip ? `${Math.round(clipEnd - clipStart)} seconds long` : 'a short segment'}. Analyze ONLY what you actually see:

1. **What Happened**: In 1-2 sentences, describe the actual event. Was it a live play? A penalty? A dead ball? A practice rep?
2. **Penalty Analysis** (if any flag or dead ball):
   - **Type of penalty**: Name it precisely (offsides, encroachment, false start, neutral zone infraction, illegal motion, delay of game, etc.)
   - **Who committed it**: Identify the SPECIFIC player by jersey number and position who caused the infraction. Look carefully at which defender jumped early, which offensive player moved, etc. If you can identify them from the roster, use their full label (e.g., "DE #53 (Player Name)").
   - **What they did wrong**: Describe the specific action — did they jump across the line? Were they lined up in the neutral zone? Did they flinch before the snap?
   - **Why it likely happened**: Provide coaching rationale. Were they anticipating the snap count? Reacting to offensive motion? Over-aggressive in their stance? Did the offense use a hard count to draw them offside?
   - **Yardage**: How many yards were walked off and in which direction?
   - **Coaching correction**: What specific drill or mental cue should the coach use with THIS player to fix this? (e.g., "Train #53 to watch the ball, not the QB's cadence" or "Practice holding stance through hard counts")
3. **Pre-Snap Read (even on dead balls)**:
   - Offensive formation with player positions labeled (LT, LG, C, RG, RT, TE, WR, QB, RB)
   - Defensive formation with positions labeled
   - Note any interesting alignment, overloads, or mismatches visible before the penalty occurred
4. **Play Execution (if live play)**:
   - What type of play was called (run/pass)?
   - How did each visible blocker perform? (only comment on players you can actually see)
   - Ball carrier/receiver: what did they do?
   - Key defensive players: who made the play?
5. **Coaching Points**: 2-3 specific, actionable coaching corrections. Reference specific players by name and jersey number.
6. **Grade**: Grade the play execution A-F for offense and defense. If dead ball/penalty, grade the pre-snap discipline instead.

Opponent: ${opponent || 'Unknown'}
BE HONEST. If there's only 1 play in this clip, analyze 1 play. If it's a dead ball, say it's a dead ball. Always identify the specific player who committed any infraction.`,

      // For full games: tactical overview
      full_breakdown: `You are an elite youth football (8U) coaching analyst.
${rosterContext}
${GROUND_TRUTH_RULES}

Analyze this game film and provide:

1. **Formation Recognition**: Identify offensive and defensive formations used. Label positions.
2. **Play-by-Play Breakdown**: For EVERY live play (snap to whistle), describe what actually happened. If a play is a penalty/dead ball, label it as such and move to the next play.
3. **Key Player Performances**: Identify standout players by position, jersey #, and name.
4. **Tactical Trends**: What tendencies are visible?
5. **Coaching Recommendations**: Specific drill suggestions referencing specific players.
6. **Play Success/Failure Analysis**: For each LIVE play, grade it and explain why.

Opponent: ${opponent || 'Unknown'}
Film Type: ${filmType || 'game'}
Provide timestamps for every play. Count total live plays vs dead balls/penalties.`,

      player_tracking: `You are a sports biomechanics analyst for youth football (8U).
${rosterContext}
${GROUND_TRUTH_RULES}

Watch this film and assess ONLY what you can actually see:

**OFFENSIVE LINE**: Stance, first step, pad level, drive blocking, pulling technique.
**SKILL POSITIONS**: Speed, agility, ball skills, vision, decision-making.
**DEFENSIVE PLAYERS**: Gap discipline, pursuit angles, tackling form.

For ALL players:
- Only comment on players whose jersey numbers you can clearly see
- If you cannot determine a number, say "unidentified player at [position]"
- Grade each identified player A-F on fundamentals
- Include specific timestamps for notable plays

Opponent: ${opponent || 'Unknown'}`,

      highlights: `You are a highlight reel editor for youth football.
${rosterContext}
${GROUND_TRUTH_RULES}

Watch this film and:
1. Identify the most exciting, impressive plays (LIVE plays only, not penalties)
2. Rank by impact
3. Timestamp each highlight
4. Describe what makes each play special
5. Which players deserve individual highlight reels?

Focus on plays that would look great on social media or a parent highlight reel.
Opponent: ${opponent || 'Unknown'}`,

      quick_summary: `You are a head coach's assistant for an 8U youth football team.
${rosterContext}
${GROUND_TRUTH_RULES}

Provide a concise tactical summary:
1. **Score/Result**: If identifiable
2. **Play Count**: How many LIVE plays vs dead balls/penalties did you observe?
3. **Top 3 Takeaways**: Most important observations
4. **Players of the Game**: By position, jersey #, and name
5. **Position Group Grades**: OL, RB, QB, DL, LB, DB (A-F scale)
6. **Areas for Improvement**: 3 key things referencing specific players
7. **Penalties/Issues**: Any offsides, false starts, alignment issues observed

Keep it concise and actionable — this goes straight to the coaching staff.
Opponent: ${opponent || 'Unknown'}`,
    };

    // Auto-select clip_breakdown for clips, otherwise use selected type
    const effectiveType = isClip ? 'clip_breakdown' : analysisType;
    const systemPrompt = prompts[effectiveType] || prompts.full_breakdown;

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
    } else if (videoUrl) {
      // For Supabase Storage URLs, pass as file data with URL
      // Gemini can handle public URLs directly
      contentParts.push({
        fileData: {
          mimeType: mimeType || 'video/mp4',
          fileUri: videoUrl,
        },
      });
    } else {
      contentParts.push({
        text: 'No video was provided. Please provide analysis guidance for the coaching staff based on general 8U football best practices.',
      });
    }

    // Use streaming to beat Vercel's 60-second timeout.
    // First byte arrives in ~2-3 seconds, keeping connection alive.
    const streamResult = await model.generateContentStream(contentParts);

    // Stream Gemini's response directly to the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata header first (keeps connection alive immediately)
          controller.enqueue(encoder.encode(JSON.stringify({
            _meta: true,
            model: GEMINI_MODEL,
            analysisType: effectiveType,
            timestamp: new Date().toISOString(),
          }) + '\n'));

          // Stream each chunk of analysis text
          for await (const chunk of streamResult.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(JSON.stringify({ _chunk: text }) + '\n'));
            }
          }

          // Signal completion
          controller.enqueue(encoder.encode(JSON.stringify({ _done: true }) + '\n'));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(JSON.stringify({ _error: err.message }) + '\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('Film analysis error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
