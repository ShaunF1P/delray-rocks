import { NextResponse } from 'next/server';

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(req) {
  try {
    const { callHistory } = await req.json();
    if (!callHistory || callHistory.length < 3) {
      return NextResponse.json({ error: 'Need at least 3 plays to analyze trends' }, { status: 400 });
    }

    const plays = callHistory.map((c, i) => ({
      num: callHistory.length - i,
      quarter: c.quarter,
      down: c.down,
      distance: c.distance,
      yard: c.yard_line,
      ourPlay: c.play?.name || 'Unknown',
      ourType: c.play?.play_type || '',
      ourDir: c.play?.direction || '',
      theirDefense: c.oppDefense || 'not tagged',
      result: c.result || 'ungraded',
    }));

    const prompt = `You are an elite youth football offensive coordinator analyzing a live game. This is 8U tackle football.

Here is the play-by-play data from this game so far (most recent first):

${plays.map(p => `Play #${p.num}: Q${p.quarter} | ${p.down === 1 ? '1st' : p.down === 2 ? '2nd' : p.down === 3 ? '3rd' : '4th'}&${p.distance} on ${p.yard} | WE RAN: ${p.ourPlay} (${p.ourType} ${p.ourDir}) | THEY SHOWED: ${p.theirDefense} | RESULT: ${p.result}`).join('\n')}

ANALYSIS INSTRUCTIONS:
1. Look at what defensive looks the opponent is showing most frequently
2. Identify patterns (do they blitz on 3rd down? stack the box? play zone?)
3. Based on their tendencies, recommend what plays WE should call next
4. Flag if they're adjusting to what we're doing
5. Note any mismatches or weaknesses we can exploit

Respond in this exact JSON format:
{
  "defTendencies": [
    { "look": "Their most common defensive look name", "frequency": "X of Y plays", "situations": "When they use it" }
  ],
  "patterns": [
    "Pattern 1 you noticed",
    "Pattern 2 you noticed"
  ],
  "recommendations": [
    { "play": "Specific play name to call", "why": "Short reason", "when": "Situation to use it" }
  ],
  "alerts": [
    "Urgent adjustment or warning"
  ],
  "summary": "2-3 sentence executive summary of the opponent's defensive strategy and our best counter-strategy"
}

Be specific and actionable. Reference our actual play names from the data. Keep it concise — this is read on the sideline during a game.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.5 },
        }),
      }
    );

    const data = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return NextResponse.json({ error: 'No analysis returned' }, { status: 500 });

    const analysis = JSON.parse(rawText);
    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('Trend analysis error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
