import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-pro';

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  try {
    const { videoUrl, filmType, opponent, analysisType } = await request.json();

    const prompts = {
      full_breakdown: `You are an elite youth football (8U) coaching analyst — on par with what Hudl Pro, Sportscode, or Catapult provides. Analyze this game film and provide:

1. **Formation Recognition**: Identify every offensive and defensive formation used. Name them precisely (e.g., "Shotgun Trips Right", "I-Formation Strong", "4-3 Under").
2. **Play-by-Play Breakdown**: For each significant play, describe:
   - Pre-snap alignment and motion
   - Play call type (run/pass/screen/special)
   - Blocking assignments and execution
   - Ball carrier/receiver performance
   - Defensive response and gaps
3. **Key Player Performances**: Identify standout players by jersey number. Note speed, technique, decision-making.
4. **Tactical Trends**: What offensive/defensive tendencies are visible? Down-and-distance patterns?
5. **Coaching Recommendations**: Specific drill suggestions to fix weaknesses and amplify strengths.
6. **Play Success/Failure Analysis**: For each play, state if it succeeded or failed and WHY (missed block, wrong read, great coverage, etc.).

Opponent: ${opponent || 'Unknown'}
Film Type: ${filmType || 'game'}
Format your response in clear sections with headers.`,

      player_tracking: `You are a sports biomechanics and performance analyst. Watch this youth football (8U) film and for each visible player:

1. **Movement Analysis**: Track player movements, acceleration, deceleration patterns
2. **Positioning**: Evaluate gap discipline, route running, coverage positioning
3. **Effort Metrics**: Identify hustle plays, loafing, effort on every snap
4. **Technique Assessment**: Rate blocking technique, tackling form, catching mechanics
5. **Fatigue Indicators**: Note any visible decline in performance over time

Identify players by jersey number when visible. Provide specific timestamps for notable plays.`,

      highlights: `You are a highlight reel editor for youth football. Watch this film and:

1. **Identify Top Plays**: Find the most exciting, impressive, or noteworthy plays
2. **Rank by Impact**: Order from most impressive to least
3. **Timestamp Each**: Provide approximate timestamps for each highlight moment
4. **Describe the Action**: What makes each play special (big hit, long run, great catch, etc.)
5. **Player Callouts**: Which player(s) deserve individual highlight reels from this film?

Focus on plays that would look great on social media or a recruiting reel.`,

      quick_summary: `You are a head coach's assistant. Watch this football film and provide a concise tactical summary:

1. **Score/Result**: If identifiable
2. **Top 3 Takeaways**: Most important observations
3. **Players of the Game**: Top performers (by jersey number)
4. **Areas for Improvement**: 3 key things to work on in practice
5. **Next Game Prep**: What to emphasize based on what you see

Keep it concise and actionable — this goes straight to the coaching staff.`,
    };

    const systemPrompt = prompts[analysisType] || prompts.full_breakdown;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              ...(videoUrl ? [{
                file_data: {
                  mime_type: 'video/mp4',
                  file_uri: videoUrl,
                },
              }] : [{ text: 'No video was provided. Please provide analysis guidance for the coaching staff based on general 8U football best practices.' }]),
            ],
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated';

    return NextResponse.json({
      analysis: analysisText,
      model: GEMINI_MODEL,
      analysisType,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
