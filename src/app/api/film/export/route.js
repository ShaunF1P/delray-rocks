import { NextResponse } from 'next/server';
import { generateCMX3600EDL, generateFCPXML, generateHudlCSV } from '@/lib/film-export';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const {
      format = 'hudl_csv', // 'hudl_csv' | 'edl' | 'fcpxml'
      filmTitle = 'Delray_Rocks_Film',
      opponent = 'Opponent',
      videoUrl = 'film_master.mp4',
      fps = 30,
      plays = [],
    } = await request.json();

    if (!Array.isArray(plays) || plays.length === 0) {
      return NextResponse.json({ error: 'No plays provided for export' }, { status: 400 });
    }

    const safeTitle = (filmTitle || 'Delray_Rocks').replace(/[^a-zA-Z0-9_-]/g, '_');

    switch (format.toLowerCase()) {
      case 'edl': {
        const edlContent = generateCMX3600EDL({
          title: safeTitle,
          plays,
          fps: Number(fps) || 30,
        });

        return new NextResponse(edlContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${safeTitle}_CMX3600.edl"`,
          },
        });
      }

      case 'fcpxml':
      case 'xml': {
        const xmlContent = generateFCPXML({
          title: safeTitle,
          plays,
          videoUrl,
          fps: Number(fps) || 30,
        });

        return new NextResponse(xmlContent, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Content-Disposition': `attachment; filename="${safeTitle}_FinalCut.xml"`,
          },
        });
      }

      case 'hudl':
      case 'hudl_csv':
      case 'csv':
      default: {
        const csvContent = generateHudlCSV({
          filmTitle: safeTitle,
          opponent,
          plays,
        });

        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${safeTitle}_Hudl_Breakdown.csv"`,
          },
        });
      }
    }
  } catch (err) {
    console.error('[API Film Export Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
