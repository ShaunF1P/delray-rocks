import { NextResponse } from 'next/server';

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(req) {
  try {
    const { callHistory, gameInfo } = await req.json();
    if (!callHistory || callHistory.length === 0) {
      return NextResponse.json({ error: 'No play data to analyze' }, { status: 400 });
    }

    const plays = callHistory.map((c, i) => ({
      num: callHistory.length - i,
      quarter: c.quarter, down: c.down, distance: c.distance, yard: c.yard_line,
      ourPlay: c.play?.name || 'Unknown', ourType: c.play?.play_type || '',
      ourDir: c.play?.direction || '', theirDefense: c.oppDefense || 'not tagged',
      result: c.result || 'ungraded',
    }));

    const totalPlays = plays.length;
    const successes = plays.filter(p => p.result === 'success').length;
    const fails = plays.filter(p => p.result === 'fail').length;
    const runs = plays.filter(p => p.ourType === 'run').length;
    const passes = plays.filter(p => ['pass', 'trick'].includes(p.ourType)).length;

    const prompt = `You are the head coach's analytics coordinator for an 8U youth tackle football team (Delray Rocks). Generate a professional post-game report.

GAME INFO:
${gameInfo?.opponent ? `Opponent: ${gameInfo.opponent}` : 'Opponent: Not specified'}
${gameInfo?.score ? `Final Score: ${gameInfo.score}` : ''}
${gameInfo?.date ? `Date: ${gameInfo.date}` : `Date: ${new Date().toLocaleDateString()}`}

GAME STATS:
- Total plays called: ${totalPlays}
- Successful plays: ${successes} (${totalPlays > 0 ? Math.round(successes/totalPlays*100) : 0}%)
- Failed plays: ${fails}
- Run plays: ${runs} (${totalPlays > 0 ? Math.round(runs/totalPlays*100) : 0}%)
- Pass plays: ${passes} (${totalPlays > 0 ? Math.round(passes/totalPlays*100) : 0}%)

PLAY-BY-PLAY:
${plays.map(p => `#${p.num} Q${p.quarter} ${p.down === 1 ? '1st' : p.down === 2 ? '2nd' : p.down === 3 ? '3rd' : '4th'}&${p.distance} | ${p.ourPlay} (${p.ourType}) | vs ${p.theirDefense} | ${p.result}`).join('\n')}

Generate a comprehensive post-game report in this JSON format:
{
  "headline": "One-line game summary (e.g., 'Rocks Dominate with Ground Game in 24-6 Victory')",
  "summary": "3-4 sentence executive summary of the game",
  "offenseGrade": "A+ to F grade for offensive performance",
  "defenseGrade": "A+ to F grade based on opponent defense data observed",
  "topPlays": ["Play name that worked best and why", "Another top play"],
  "troublePlays": ["Play that struggled and why", "Another issue"],
  "runGameAnalysis": "2-3 sentences on run game effectiveness",
  "passGameAnalysis": "2-3 sentences on pass game effectiveness",
  "opponentTendencies": "What did the opponent defense do most? Summary for future scouting",
  "adjustments": ["Specific adjustment for next game practice", "Another adjustment"],
  "playerDevelopment": ["Skill area the team should drill this week", "Another area"],
  "nextGamePlan": "2-3 sentences on what to focus on for next week's game plan"
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
        }),
      }
    );

    const data = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return NextResponse.json({ error: 'No report generated' }, { status: 500 });

    return NextResponse.json({ report: JSON.parse(rawText) });
  } catch (err) {
    console.error('Post-game report error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
