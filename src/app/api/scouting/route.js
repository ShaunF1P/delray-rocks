import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  try {
    const { opponent, notes } = await req.json();
    if (!opponent) return NextResponse.json({ error: 'Opponent name required' }, { status: 400 });

    // Pull previous scouting on this opponent
    let priorIntel = '';
    try {
      const { data: priorReports } = await supabase
        .from('scouting_reports')
        .select('report, created_at')
        .ilike('opponent', `%${opponent}%`)
        .order('created_at', { ascending: false })
        .limit(3);
      if (priorReports && priorReports.length > 0) {
        priorIntel = `\n\nPRIOR SCOUTING INTEL (from ${priorReports.length} previous game${priorReports.length > 1 ? 's' : ''}):\n`;
        priorReports.forEach((r, i) => {
          const rpt = r.report;
          priorIntel += `\nGame ${i + 1} (${new Date(r.created_at).toLocaleDateString()}):\n`;
          if (rpt.overview) priorIntel += `- Overview: ${rpt.overview}\n`;
          if (rpt.expectedDefense) priorIntel += `- Their Defense: ${rpt.expectedDefense.join('; ')}\n`;
          if (rpt.warnings) priorIntel += `- Warnings: ${rpt.warnings.join('; ')}\n`;
        });
        priorIntel += `\nUse this prior intel to build on what we already know. Note any changes or consistency in their tendencies.`;
      }
    } catch(e) { /* no prior data is fine */ }

    const prompt = `You are an elite youth football scout and game-planning coordinator for an 8U tackle football team called the Delray Rocks. We run a "Beast" formation offense (Power I / Tight formation) with primarily run plays.

UPCOMING OPPONENT: ${opponent}

SCOUTING NOTES FROM COACHES:
${notes || 'No specific notes provided. Generate a general youth football scouting report with common 8U tendencies.'}${priorIntel}

Based on this information, generate a comprehensive pregame scouting report and game plan.

Respond in this exact JSON format:
{
  "overview": "2-3 sentence overview of the opponent and what to expect",
  "expectedDefense": [
    "Their primary defensive alignment and what to expect",
    "How they typically handle run-heavy teams",
    "Blitz tendencies and when they send pressure",
    "Secondary coverage tendencies"
  ],
  "expectedOffense": [
    "Their primary offensive formation and style",
    "Their go-to plays and tendencies",
    "Key players to watch on their offense",
    "What they do in the red zone"
  ],
  "gamePlan": [
    "Specific play or strategy recommendation #1 with reasoning",
    "Specific play or strategy recommendation #2",
    "Specific play or strategy recommendation #3",
    "Halftime adjustment plan if we're behind",
    "Clock management strategy if we're ahead"
  ],
  "keyMatchups": [
    "Matchup 1 to exploit or worry about",
    "Matchup 2"
  ],
  "warnings": [
    "Thing to watch out for #1",
    "Thing to watch out for #2"
  ]
}

Be specific to 8U youth football. Reference actual play concepts (sweeps, dives, counters, etc.). Keep language practical for sideline use.`;

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
    console.error('Scouting error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
