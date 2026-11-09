import { test, expect } from '@playwright/test';

test.describe('Delray Rocks Film Cutting & NLE Export Suite', () => {

  test('Tier 1: /api/film/export generates valid Hudl CSV manifest', async ({ request }) => {
    const response = await request.post('/api/film/export', {
      data: {
        format: 'hudl_csv',
        filmTitle: 'Delray_Rocks_vs_Chargers',
        opponent: 'Coral Springs Chargers',
        plays: [
          {
            index: 1,
            start: 12.0,
            end: 25.5,
            title: 'Play 1: Dive Left, #5 Brown cuts back for 6 yards',
            playType: 'Run',
            gain: 6,
            quarter: 1,
            down: 1,
            distance: 10,
            ballCarrier: 'Jasper Brown',
          },
          {
            index: 2,
            start: 42.0,
            end: 54.0,
            title: 'Play 2: Toss sweep right, #1 Darrisaw gains 12 yards',
            playType: 'Run',
            gain: 12,
            quarter: 1,
            down: 2,
            distance: 4,
            ballCarrier: 'Ori Darrisaw',
          }
        ]
      }
    });

    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['content-type']).toContain('text/csv');
    expect(headers['content-disposition']).toContain('Delray_Rocks_vs_Chargers_Hudl_Breakdown.csv');

    const csvBody = await response.text();
    expect(csvBody).toContain('Play #,ODK,Quarter,Down,Distance,Yard Line,Hash,Play Type,Result');
    expect(csvBody).toContain('"Jasper Brown"');
    expect(csvBody).toContain('"Ori Darrisaw"');
    expect(csvBody).toContain('"Delray_Rocks_vs_Chargers_P01.mp4"');
  });

  test('Tier 2: /api/film/export generates valid CMX 3600 EDL', async ({ request }) => {
    const response = await request.post('/api/film/export', {
      data: {
        format: 'edl',
        filmTitle: 'RTG_vs_BabyZip_Championship',
        plays: [
          {
            index: 1,
            start: 10.0,
            end: 22.0,
            title: 'Inside Zone #0 Philpart',
            description: 'Off-tackle push for 4 yards',
          },
          {
            index: 2,
            start: 60.5,
            end: 75.0,
            title: 'Pass Play QB roll right',
            description: 'Incomplete pass to sideline',
          }
        ]
      }
    });

    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['content-disposition']).toContain('CMX3600.edl');

    const edlBody = await response.text();
    expect(edlBody).toContain('TITLE: RTG_VS_BABYZIP_CHAMPIONSHIP');
    expect(edlBody).toContain('FCM: NON-DROP FRAME');
    expect(edlBody).toContain('001  AX       V     C');
    expect(edlBody).toContain('FROM CLIP NAME: Inside Zone #0 Philpart');
  });

  test('Tier 3: /api/film/export generates valid Final Cut Pro XML sequence', async ({ request }) => {
    const response = await request.post('/api/film/export', {
      data: {
        format: 'fcpxml',
        filmTitle: 'Delray_Rocks_Highlight_Reel',
        videoUrl: 'https://storage.supabase.co/films/game1.mp4',
        fps: 30,
        plays: [
          {
            index: 1,
            start: 5.0,
            end: 18.0,
            title: 'Touchdown Run Jacobs #4',
          }
        ]
      }
    });

    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['content-type']).toContain('application/xml');
    expect(headers['content-disposition']).toContain('FinalCut.xml');

    const xmlBody = await response.text();
    expect(xmlBody).toContain('<xmeml version="4">');
    expect(xmlBody).toContain('<clipitem id="clipitem-1">');
    expect(xmlBody).toContain('<name>Touchdown Run Jacobs #4</name>');
  });

  test('Tier 4: /api/film/export validates payload error handling', async ({ request }) => {
    const emptyResponse = await request.post('/api/film/export', {
      data: { format: 'hudl_csv', plays: [] }
    });
    expect(emptyResponse.status()).toBe(400);
    const data = await emptyResponse.json();
    expect(data.error).toBe('No plays provided for export');
  });

});
