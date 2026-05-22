import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ---------------------------------------------------------------------------
// Formation helpers
// ---------------------------------------------------------------------------

function buildFormationMap(formations) {
  const map = {};
  for (const f of formations) {
    map[f.name] = f.id;
  }
  return map;
}

function resolveFormation(map, name, fallbackSide, formations) {
  if (map[name]) return map[name];
  // Fallback: first formation on that side
  const fb = formations.find((f) => f.side === fallbackSide);
  return fb?.id || formations[0]?.id || null;
}

// ---------------------------------------------------------------------------
// 32 seed plays
// ---------------------------------------------------------------------------

function buildPlays(fMap, formations) {
  const o = (name) => resolveFormation(fMap, name, 'offense', formations);
  const d = (name) => resolveFormation(fMap, name, 'defense', formations);
  const s = (name) => resolveFormation(fMap, name, 'special_teams', formations);

  return [
    // -----------------------------------------------------------------------
    // RPO PLAYS (8)
    // -----------------------------------------------------------------------
    {
      name: 'RPO Bubble Screen',
      play_type: 'rpo',
      direction: 'right',
      description: 'QB reads the outside linebacker. If the OLB crashes toward the run, QB pulls and throws the bubble screen to the slot WR. If the OLB stays wide, QB hands off inside zone.',
      formation_id: o('Shotgun Spread'),
      read_key: 'Read OLB — hand off if he crashes inside, throw bubble screen if he stays wide',
      assignments: {
        QB: 'Mesh with RB, read OLB. Hand off if OLB crashes, pull and throw bubble right if OLB stays wide.',
        RB: 'Take mesh from QB, run inside zone right. Secure the ball even if QB pulls it.',
        WR1: 'Line up in slot right. On snap, run bubble route — catch and get upfield fast.',
        WR2: 'Outside right. Block the corner — stalk block, stay between him and WR1.',
        TE: 'Block down on the DE. Seal the edge.',
        LT: 'Zone step left. Block inside gap.',
        LG: 'Zone step left. Combo with center to linebacker.',
        C: 'Block nose tackle. Combo to backside LB.',
        RG: 'Zone step right. Reach block the DT.',
        RT: 'Zone step right. Seal the edge.',
      },
      tags: ['rpo', 'bubble', 'quick-game', 'spread'],
      sort_order: 1,
    },
    {
      name: 'RPO Slant',
      play_type: 'rpo',
      direction: 'right',
      description: 'QB reads the middle linebacker post-snap. If the MLB flows to the run, QB pulls and throws a quick slant to the backside WR. If the MLB stays in the passing lane, QB hands off.',
      formation_id: o('Shotgun Spread'),
      read_key: 'Read MLB — hand off if LB stays in coverage, throw slant if LB flows to the run',
      assignments: {
        QB: 'Mesh with RB, eyes on MLB. If MLB flows to run, throw slant to WR1. If MLB sits, hand off.',
        RB: 'Take mesh, run inside zone left. Hit the first open hole.',
        WR1: 'Backside split end. Run a quick slant at 3 yards — snap your head around for the ball.',
        WR2: 'Playside outside. Run a go route to clear out the corner.',
        TE: 'Chip the DE then release to the flat as safety valve.',
        LT: 'Zone step left. Seal the backside DT.',
        LG: 'Zone step left. Combo center to LB.',
        C: 'Block nose. Stay low and drive.',
        RG: 'Zone step right. Reach the playside DT.',
        RT: 'Zone step right. Hinge block — keep the DE from getting to the QB.',
      },
      tags: ['rpo', 'slant', 'quick-game', 'zone'],
      sort_order: 2,
    },
    {
      name: 'RPO Power Read',
      play_type: 'rpo',
      direction: 'right',
      description: 'QB reads the playside defensive end. If the DE crashes down, QB keeps the ball and looks to throw a quick out. If the DE stays wide and contains, QB gives power to the RB.',
      formation_id: o('Pistol'),
      read_key: 'Read DE — give power to RB if DE contains, keep and throw quick out if DE crashes',
      assignments: {
        QB: 'Ride the mesh, read the DE. Give to RB on power if DE stays. Keep and throw out if DE crashes.',
        RB: 'Take the handoff on power right. Follow the pulling guard through the hole.',
        WR1: 'Run a quick out route at 5 yards. Be ready — QB may throw to you.',
        WR2: 'Block the safety. Stalk block and sustain.',
        TE: 'Kick out the outside linebacker. Seal the edge for the RB.',
        LT: 'Block down. Seal the backside gap.',
        LG: 'Pull right. Lead through the hole and block the first defender you see.',
        C: 'Block back on the nose tackle.',
        RG: 'Double team the DT with RT. Drive him off the ball.',
        RT: 'Double team DT. Then climb to linebacker.',
      },
      tags: ['rpo', 'power', 'gap-scheme', 'read'],
      sort_order: 3,
    },
    {
      name: 'RPO Zone Read Bubble',
      play_type: 'rpo',
      direction: 'left',
      description: 'Backside zone read with a bubble screen tag. QB reads the backside DE. If the DE stays home, give the ball on zone left. If the DE crashes to the RB, throw the bubble to the boundary WR.',
      formation_id: o('Shotgun Spread'),
      read_key: 'Read backside DE — give zone left if DE stays, throw bubble if DE crashes to RB',
      assignments: {
        QB: 'Open to the left, mesh with RB. Read backside DE. Give zone if DE stays, throw bubble right if DE crashes.',
        RB: 'Run zone left. Press the hole, cut off the center\'s block.',
        WR1: 'Boundary slot. Run bubble route on snap — be ready for the throw.',
        WR2: 'Boundary outside. Block the corner for WR1.',
        TE: 'Block the playside DE. Seal him inside.',
        LT: 'Zone step left. Reach the DT.',
        LG: 'Zone step left. Combo with C to playside LB.',
        C: 'Block nose. Zone step left and climb.',
        RG: 'Zone step left. Hinge and protect the backside.',
        RT: 'Zone step left. Cut off the backside DT.',
      },
      tags: ['rpo', 'zone-read', 'bubble', 'backside-read'],
      sort_order: 4,
    },
    {
      name: 'RPO Jet Sweep',
      play_type: 'rpo',
      direction: 'right',
      description: 'Jet motion with an RPO read. QB reads the playside DE. If the DE widens to chase the jet, QB keeps and runs power inside. If the DE stays inside, hand off the jet sweep.',
      formation_id: o('Wing-T'),
      read_key: 'Read playside DE — hand off jet sweep if DE stays inside, run QB power if DE widens',
      assignments: {
        QB: 'Fake or give jet sweep. Read the DE. If DE widens, keep and run power. If DE squeezes, give the jet.',
        RB: 'Lead block on jet sweep. Kick out the first man outside the TE.',
        WR1: 'Jet motion across. Take the handoff at full speed and run outside.',
        WR2: 'Crack block the safety. Sprint inside and seal him.',
        TE: 'Block down on the DE. Seal the edge for the jet.',
        LT: 'Down block. Seal the backside.',
        LG: 'Pull right on QB power. Block the playside LB.',
        C: 'Block nose tackle straight ahead.',
        RG: 'Block down on the DT. Create the lane.',
        RT: 'Reach block the DE. Keep him from getting outside.',
      },
      tags: ['rpo', 'jet', 'motion', 'misdirection'],
      sort_order: 5,
    },
    {
      name: 'RPO Stick Concept',
      play_type: 'rpo',
      direction: 'right',
      description: 'QB reads the flat defender. If the flat defender drops into coverage, QB hands off inside zone. If the flat defender plays the run, QB pulls and hits the stick route at 5 yards.',
      formation_id: o('Shotgun Spread'),
      read_key: 'Read flat defender — hand off if he drops to coverage, throw stick route if he plays the run',
      assignments: {
        QB: 'Mesh with RB. Read the flat defender. Hand off zone if flat drops, throw stick if flat crashes.',
        RB: 'Run inside zone right. Take the handoff and hit the hole.',
        WR1: 'Run a stick route at 5 yards. Sit in the open window and show your numbers to the QB.',
        WR2: 'Run a go route to clear out the deep defender.',
        TE: 'Run to the flat as the checkdown. Give the QB a safety valve.',
        LT: 'Zone step right. Seal the backside.',
        LG: 'Zone step right. Combo to LB.',
        C: 'Block the nose. Drive him back.',
        RG: 'Zone step right. Reach the DT.',
        RT: 'Zone step right. Seal the edge.',
      },
      tags: ['rpo', 'stick', 'quick-game', 'concept'],
      sort_order: 6,
    },
    {
      name: 'RPO Hitch Screen',
      play_type: 'rpo',
      direction: 'left',
      description: 'QB reads the corner. If the corner sits on the hitch, QB hands off inside zone. If the corner bails deep, QB throws the hitch for easy yards.',
      formation_id: o('Shotgun Spread'),
      read_key: 'Read corner — hand off inside zone if corner sits on hitch, throw hitch if corner bails deep',
      assignments: {
        QB: 'Mesh with RB. Eyes on corner. Hand off zone if corner sits, throw hitch left if he bails.',
        RB: 'Run inside zone left. Take the handoff and press the hole.',
        WR1: 'Run a 5-yard hitch. Catch and get upfield for extra yards.',
        WR2: 'Block the safety. Stalk block inside.',
        TE: 'Block the playside DE. Hold your block for 2 seconds.',
        LT: 'Zone step left. Reach the DT.',
        LG: 'Zone step left. Combo C to LB.',
        C: 'Block nose tackle. Stay low.',
        RG: 'Zone step left. Hinge and protect backside.',
        RT: 'Hinge block. Protect the backside gap.',
      },
      tags: ['rpo', 'hitch', 'screen', 'quick-game'],
      sort_order: 7,
    },
    {
      name: 'RPO Draw Pass',
      play_type: 'rpo',
      direction: 'middle',
      description: 'Fake draw action with a pass option. QB fakes the draw handoff and reads the linebacker. If the LB bites on the draw fake, the TE is wide open on the seam route.',
      formation_id: o('Single Back'),
      read_key: 'Fake draw, read LB — throw TE seam if LB bites on draw, hand off if LB drops',
      assignments: {
        QB: 'Fake the draw to RB. Read the LB — if LB bites on the run, throw to TE on the seam. If LB drops, give the draw.',
        RB: 'Fake draw. Sell the run, then block the first free rusher.',
        WR1: 'Run a deep comeback at 12 yards. Pull the safety away from the TE.',
        WR2: 'Run a drag route underneath. Be the checkdown option.',
        TE: 'Fake block for one count, then release up the seam. Sprint past the LB and look for the ball.',
        LT: 'Pass set. Show run block first, then protect.',
        LG: 'Pass set. Let the DT come to you, then anchor.',
        C: 'Block nose. Show run first, then anchor in pass pro.',
        RG: 'Pass set. Seal the inside gap.',
        RT: 'Pass set. Keep the DE in front of you.',
      },
      tags: ['rpo', 'draw', 'play-action', 'seam'],
      sort_order: 8,
    },

    // -----------------------------------------------------------------------
    // RUN PLAYS (8)
    // -----------------------------------------------------------------------
    {
      name: 'Counter Trey',
      play_type: 'run',
      direction: 'right',
      description: 'The RB counter-steps left, then cuts back right behind a pulling guard and fullback lead block. A classic gap-scheme run that uses misdirection to freeze the linebackers.',
      formation_id: o('I-Formation'),
      assignments: {
        QB: 'Reverse pivot, fake left, hand off to RB going right. Carry out the boot fake.',
        RB: 'Counter step left, then plant and cut right. Follow the pulling guard through the hole.',
        FB: 'Lead block through the hole. Kick out the playside LB.',
        WR1: 'Stalk block the corner. Keep him away from the play.',
        WR2: 'Run off the safety. Go route to clear the box.',
        TE: 'Down block the DE. Seal him inside — do not let him cross your face.',
        LT: 'Block down. Seal the backside gap.',
        LG: 'Pull right. Lead through the hole and block the first color you see.',
        C: 'Block back on the nose tackle. Cut off the backside.',
        RG: 'Double team the DT with RT. Drive him off the ball.',
        RT: 'Double team DT, then climb to the LB.',
      },
      tags: ['counter', 'gap-scheme', 'misdirection', 'power'],
      sort_order: 9,
    },
    {
      name: 'Power Sweep',
      play_type: 'run',
      direction: 'right',
      description: 'Both guards pull right and lead the RB around the edge. The wall of blockers creates a convoy for the running back to follow to the outside.',
      formation_id: o('I-Formation'),
      assignments: {
        QB: 'Open right, hand off to RB. Fake the boot left after the handoff.',
        RB: 'Take handoff going right. Be patient — follow the pulling guards around the edge. Cut upfield when you see daylight.',
        FB: 'Lead block. Kick out the corner or the force player.',
        WR1: 'Crack block the safety. Come inside fast and seal him.',
        WR2: 'Stalk block the corner on your side.',
        TE: 'Reach block the DE. Seal the edge — don\'t let him squeeze down.',
        LT: 'Hinge block. Protect the backside.',
        LG: 'Pull right. You\'re the first blocker. Block the end man on the line.',
        C: 'Block the nose tackle. Cut off the backside pursuit.',
        RG: 'Pull right. You\'re the second blocker. Get to the linebacker.',
        RT: 'Down block the DT. Seal him inside.',
      },
      tags: ['sweep', 'gap-scheme', 'outside-run', 'power'],
      sort_order: 10,
    },
    {
      name: 'Toss Crack',
      play_type: 'run',
      direction: 'left',
      description: 'QB tosses the ball to the RB running left while the playside WR crack blocks the safety. The RB sprints outside behind the crack block.',
      formation_id: o('Shotgun Spread'),
      assignments: {
        QB: 'Toss the ball to RB going left. Make a firm, chest-high toss. Fake the keep right after.',
        RB: 'Catch the toss, sprint to the left sideline. Read the crack block — cut upfield when the WR seals the safety.',
        WR1: 'Crack block! Run inside and block the safety or the force player. Big hit, big play.',
        WR2: 'Block the corner. Stalk block and sustain.',
        TE: 'Reach block the DE left. Seal the edge.',
        LT: 'Reach block the DT. Get to his outside shoulder.',
        LG: 'Pull left. Lead the RB outside and block the first defender.',
        C: 'Block nose. Cutoff block — don\'t let him chase the play.',
        RG: 'Hinge block. Protect the backside.',
        RT: 'Hinge block. Cut off any backside pursuit.',
      },
      tags: ['toss', 'crack', 'outside-run', 'misdirection'],
      sort_order: 11,
    },
    {
      name: 'Stretch Zone',
      play_type: 'run',
      direction: 'left',
      description: 'The entire offensive line zone blocks to the left, stretching the defense sideline to sideline. The RB reads the blocks and cuts back against the grain when he sees a crease.',
      formation_id: o('Single Back'),
      assignments: {
        QB: 'Open left, hand off to RB on the stretch. Carry out the fake right.',
        RB: 'Take handoff, press the outside hip of the LT. Read the blocks — if the hole opens, cut upfield. If everything is sealed, keep stretching to the sideline.',
        WR1: 'Stalk block the corner. Stay engaged.',
        WR2: 'Run off the deep safety. Clear the alley.',
        TE: 'Reach block the DE. Get to his outside shoulder and seal.',
        LT: 'Zone step left. Reach the DT — get your head across.',
        LG: 'Zone step left. Combo with C, then climb to LB.',
        C: 'Reach the nose. Zone step left and drive.',
        RG: 'Zone step left. Overtake the backside DT.',
        RT: 'Zone step left. Cut off any backside pursuit.',
      },
      tags: ['zone', 'stretch', 'outside-run', 'zone-scheme'],
      sort_order: 12,
    },
    {
      name: 'QB Sneak',
      play_type: 'run',
      direction: 'middle',
      description: 'Simple QB sneak behind the center for short yardage. The center and guards create a surge, and the QB pushes forward immediately on the snap.',
      formation_id: o('I-Formation'),
      assignments: {
        QB: 'On the snap, push straight ahead behind the center. Stay low, drive your legs. Fall forward for extra yards.',
        RB: 'Push the QB from behind. Help him get over the pile.',
        FB: 'Lead block. Push through the middle with the center.',
        WR1: 'Block the corner. Don\'t let anyone come free.',
        WR2: 'Block the safety.',
        TE: 'Down block. Seal the inside gap and create a wall.',
        LT: 'Fire out. Double team with LG on the DT. Create a surge.',
        LG: 'Fire out. Double team with LT. Drive the defender back.',
        C: 'Fire out low and hard. Get under the nose tackle and drive him back. This is YOUR play.',
        RG: 'Fire out. Double team with RT on the DT.',
        RT: 'Fire out. Double team with RG. Move the pile.',
      },
      tags: ['sneak', 'short-yardage', 'goal-line', 'power'],
      sort_order: 13,
    },
    {
      name: 'Inside Zone Read',
      play_type: 'run',
      direction: 'right',
      description: 'Zone blocking scheme with a read option. The QB meshes with the RB and reads the backside DE. If the DE crashes on the RB, the QB keeps. If the DE stays, the QB gives.',
      formation_id: o('Shotgun Spread'),
      assignments: {
        QB: 'Mesh with RB. Read the backside DE. If DE crashes on RB, keep and run to the open side. If DE stays, give the ball.',
        RB: 'Take the mesh, run zone right. Press the playside A-gap and read the blocks.',
        WR1: 'Stalk block the corner.',
        WR2: 'Block the safety or crack inside.',
        TE: 'Block down on the playside DE.',
        LT: 'Zone step right. Combo with LG to LB.',
        LG: 'Zone step right. Combo with C.',
        C: 'Block the nose. Zone step and drive.',
        RG: 'Zone step right. Reach the DT.',
        RT: 'Zone step right. Seal the edge.',
      },
      tags: ['zone-read', 'inside-zone', 'read-option', 'zone-scheme'],
      sort_order: 14,
    },
    {
      name: 'Outside Zone Read',
      play_type: 'run',
      direction: 'left',
      description: 'Stretch zone to the left with a QB read on the backside DE. The RB stretches to the sideline while the QB decides to give or keep based on the backside defender.',
      formation_id: o('Shotgun Spread'),
      assignments: {
        QB: 'Open left, mesh with RB. Read the backside DE. Give the stretch if DE stays, keep if DE chases.',
        RB: 'Run zone stretch left. Press outside, read the TE\'s block, cut back if nothing outside.',
        WR1: 'Stalk block the corner left side.',
        WR2: 'Run off the safety on the backside.',
        TE: 'Reach block the playside DE. You must seal the edge.',
        LT: 'Zone step left. Reach the DT.',
        LG: 'Zone step left. Combo C to LB.',
        C: 'Zone step left. Reach nose tackle.',
        RG: 'Zone step left. Overtake and cutoff.',
        RT: 'Zone step left. Hinge and cut off backside.',
      },
      tags: ['zone-read', 'outside-zone', 'stretch', 'zone-scheme'],
      sort_order: 15,
    },
    {
      name: 'Speed Option',
      play_type: 'run',
      direction: 'right',
      description: 'QB and pitch man run an option to the right. The QB reads the unblocked DE — if the DE takes the QB, he pitches to the RB. If the DE takes the pitch man, the QB keeps it.',
      formation_id: o('Pistol'),
      assignments: {
        QB: 'Sprint to the right. Read the DE — if he comes at you, pitch to the RB. If he takes the RB, keep it and cut upfield.',
        RB: 'Be the pitch man. Sprint to the right, stay 4 yards behind and 4 yards outside the QB. Catch the pitch and turn upfield.',
        WR1: 'Stalk block the corner. Keep him from the pitch man.',
        WR2: 'Block the safety. Seal him inside.',
        TE: 'Reach block the playside DE — but the DE may be left unblocked for the option read.',
        LT: 'Zone step right. Seal the backside.',
        LG: 'Zone step right. Combo to LB.',
        C: 'Block the nose. Drive him off the ball.',
        RG: 'Zone step right. Reach the playside DT.',
        RT: 'Arc release. Block the playside LB.',
      },
      tags: ['option', 'speed', 'outside-run', 'pitch'],
      sort_order: 16,
    },

    // -----------------------------------------------------------------------
    // PASS PLAYS (6)
    // -----------------------------------------------------------------------
    {
      name: 'Mesh Concept',
      play_type: 'pass',
      direction: 'varies',
      description: 'Two WRs run crossing routes at 5 yards, creating a mesh point that is very hard to defend in man coverage. The natural pick action gets receivers open underneath.',
      formation_id: o('Shotgun Spread'),
      assignments: {
        QB: 'Drop back 3 steps. Read the mesh point — throw to whichever WR comes open. If both are covered, check the RB in the flat.',
        RB: 'Check the blitz. If no blitz, release to the flat as a checkdown.',
        WR1: 'Run a shallow cross right to left at 5 yards. Run tight past WR2 at the mesh point.',
        WR2: 'Run a shallow cross left to right at 5 yards. Run tight past WR1 at the mesh point.',
        TE: 'Run a 10-yard dig route. Sit in the hole of the zone.',
        LT: 'Pass block. Kick step and protect the edge.',
        LG: 'Pass block. Anchor inside. Don\'t let anyone through.',
        C: 'Pass block. Identify the mike LB and block the most dangerous rusher.',
        RG: 'Pass block. Anchor inside.',
        RT: 'Pass block. Kick step and protect the edge.',
      },
      tags: ['mesh', 'crossing', 'man-beater', 'concept'],
      sort_order: 17,
    },
    {
      name: 'Four Verticals',
      play_type: 'pass',
      direction: 'varies',
      description: 'All four receivers run vertical go routes, stretching the defense deep. The QB reads the safeties and throws to whichever receiver is in the open window between defenders.',
      formation_id: o('Shotgun Spread'),
      assignments: {
        QB: 'Drop back 5 steps. Read the safeties. If single high, throw the seam to the slot away from the safety. If two high, throw between them.',
        RB: 'Check the blitz, then release as the hot route to the flat.',
        WR1: 'Run a go route. Sprint past the corner — don\'t let him jam you.',
        WR2: 'Run a go route on the backside. Clear out and take the top off.',
        TE: 'Run a seam route. Sprint straight up the hash marks. Look for the ball over your inside shoulder.',
        LT: 'Pass block. Max protect — buy time for the deep routes.',
        LG: 'Pass block. Anchor and hold your ground.',
        C: 'Pass block. Call out protections and block the A-gap.',
        RG: 'Pass block. Anchor and hold.',
        RT: 'Pass block. Keep the DE in front of you.',
      },
      tags: ['verticals', 'deep-shot', 'aggressive', 'spread'],
      sort_order: 18,
    },
    {
      name: 'Smash Concept',
      play_type: 'pass',
      direction: 'right',
      description: 'A high-low read on the corner. The outside WR runs a hitch at 5 yards while the slot WR runs a corner route at 12 yards. QB reads the corner — if he sits on the hitch, throw the corner route over his head.',
      formation_id: o('Shotgun Spread'),
      assignments: {
        QB: 'Drop back 3 steps. Read the corner. If corner sits on the hitch, throw the corner route deep. If corner bails, throw the hitch underneath.',
        RB: 'Block the blitz. If no blitz, check down to the flat.',
        WR1: 'Outside WR. Run a 5-yard hitch. Sit down and show your numbers to the QB.',
        WR2: 'Slot WR. Run a corner route at 12 yards. Push upfield, then break to the sideline at a 45-degree angle.',
        TE: 'Run a drag route underneath as a safety valve.',
        LT: 'Pass block. Protect the blind side.',
        LG: 'Pass block. Anchor inside.',
        C: 'Pass block. Block the nose.',
        RG: 'Pass block. Anchor inside.',
        RT: 'Pass block. Kick step on the DE.',
      },
      tags: ['smash', 'high-low', 'corner', 'concept'],
      sort_order: 19,
    },
    {
      name: 'Flat-Wheel',
      play_type: 'pass',
      direction: 'right',
      description: 'The RB releases to the flat right while the TE runs a wheel route up the sideline. The flat route pulls the LB down, opening the wheel route behind him.',
      formation_id: o('Single Back'),
      assignments: {
        QB: 'Drop back 3 steps. Look at the flat defender. If he covers the RB flat, throw the TE wheel. If he stays deep, dump it to the RB.',
        RB: 'Release to the flat right. Catch the ball and get upfield.',
        WR1: 'Run a 12-yard comeback. Pull the corner away from the wheel route.',
        WR2: 'Run a post route. Take the safety to the middle of the field.',
        TE: 'Release to the flat, then wheel up the sideline. Sell the flat, then burst upfield.',
        LT: 'Pass block. Protect the left edge.',
        LG: 'Pass block. Anchor inside.',
        C: 'Pass block. Block the nose tackle.',
        RG: 'Pass block. Seal the right gap.',
        RT: 'Pass block. Kick step on the DE.',
      },
      tags: ['flat-wheel', 'concept', 'wheel', 'zone-beater'],
      sort_order: 20,
    },
    {
      name: 'Curl-Flat',
      play_type: 'pass',
      direction: 'left',
      description: 'Another high-low concept. The outside WR runs a 10-yard curl while the inside receiver runs to the flat. The QB reads the flat defender to decide which route to throw.',
      formation_id: o('Shotgun Spread'),
      assignments: {
        QB: 'Drop back 3 steps. Read the flat defender. If he covers the flat, throw the curl. If he drops under the curl, throw the flat.',
        RB: 'Check the blitz. If clean, release backside as checkdown.',
        WR1: 'Run a 10-yard curl. Come back to the QB and sit in the window.',
        WR2: 'Run to the flat at 3 yards depth. Sprint outside and catch the ball with room to run.',
        TE: 'Run a drag route at 6 yards. Be the middle-of-field option.',
        LT: 'Pass block. Protect the left edge.',
        LG: 'Pass block. Anchor.',
        C: 'Pass block. Block the nose.',
        RG: 'Pass block. Seal the gap.',
        RT: 'Pass block. Kick step on the DE.',
      },
      tags: ['curl-flat', 'high-low', 'concept', 'zone-beater'],
      sort_order: 21,
    },
    {
      name: 'Drag Cross',
      play_type: 'pass',
      direction: 'varies',
      description: 'Both WRs run shallow crossing drag routes at different depths. This floods the underneath zone and is very effective against man coverage because defenders must chase through traffic.',
      formation_id: o('Shotgun Spread'),
      assignments: {
        QB: 'Drop back 3 steps. Throw to the first open crosser. The shallow drag comes open first — throw it on rhythm.',
        RB: 'Check blitz. If clean, swing to the flat as a checkdown.',
        WR1: 'Run a shallow drag from left to right at 3 yards. Sprint across the formation.',
        WR2: 'Run a deeper cross from right to left at 8 yards. Sit in the zone hole if coverage is zone.',
        TE: 'Block for 2 counts then release up the seam as a deep option.',
        LT: 'Pass block. Protect the left side.',
        LG: 'Pass block. Anchor.',
        C: 'Pass block. Block the middle.',
        RG: 'Pass block. Anchor.',
        RT: 'Pass block. Protect the right side.',
      },
      tags: ['drag', 'crossing', 'man-beater', 'underneath'],
      sort_order: 22,
    },

    // -----------------------------------------------------------------------
    // TRICK PLAYS (3)
    // -----------------------------------------------------------------------
    {
      name: 'Statue of Liberty',
      play_type: 'trick',
      direction: 'left',
      description: 'The QB fakes a pass to the right, holding the ball behind his back with his left hand. The RB sneaks behind the QB and takes the ball from his back hand, running to the left while the defense bites on the fake throw.',
      formation_id: o('Shotgun Spread'),
      assignments: {
        QB: 'Fake throw to the right with your arm up. Hold the ball behind your back with your left hand. Let the RB take it. Sell the fake — keep your eyes right!',
        RB: 'Sneak behind the QB. Take the ball from his left hand and sprint left. Don\'t look at the ball until you grab it.',
        WR1: 'Run a go route right. Act like the ball is coming to you — sell it!',
        WR2: 'Block the corner left side. Spring the RB.',
        TE: 'Block the DE. Hold your block — do NOT watch the trick.',
        LT: 'Pass block for 2 counts. Protect the left side.',
        LG: 'Pass block. Sell the pass look.',
        C: 'Pass block. Keep the middle clean.',
        RG: 'Pass block. Sell the pass look.',
        RT: 'Pass block. Protect the right side.',
      },
      tags: ['trick', 'misdirection', 'statue-of-liberty', 'big-play'],
      sort_order: 23,
    },
    {
      name: 'Fake Punt Pass',
      play_type: 'trick',
      direction: 'right',
      description: 'From punt formation, the punter catches the snap and fakes the punt. Instead of kicking, he rolls right and throws to the uncovered gunner sprinting down the right sideline.',
      formation_id: s('Punt'),
      assignments: {
        QB: 'You are the personal protector. Sell the punt look, then block the first rusher.',
        RB: 'Line up as a wing. Block the edge rusher, then release as a safety valve.',
        WR1: 'Line up as the gunner on the right. Sprint downfield like it\'s a real punt. After 10 yards, look back for the throw.',
        WR2: 'Line up as the gunner on the left. Sprint downfield to sell the punt look. Block if the ball is thrown right.',
        TE: 'Line up as the punter. Catch the snap, fake the punt, roll right, and throw to the gunner.',
        LT: 'Block the punt rusher. Hold your block for 3 seconds.',
        LG: 'Block. Protect the inside.',
        C: 'Snap the ball to the punter. Then block.',
        RG: 'Block. Protect the inside.',
        RT: 'Block the punt rusher on the right side.',
      },
      tags: ['trick', 'special-teams', 'fake-punt', 'surprise'],
      sort_order: 24,
    },
    {
      name: 'WR Reverse Pass',
      play_type: 'trick',
      direction: 'left',
      description: 'The QB hands off to the RB going right, who then hands it to the WR on a reverse going left. The WR pulls up and throws back to the QB or TE who has leaked out on the opposite side.',
      formation_id: o('Shotgun Spread'),
      assignments: {
        QB: 'Hand off to RB right, then sneak out to the right flat. Be wide open for the throw back.',
        RB: 'Take the handoff going right. Hand off to WR1 on the reverse. Then block the first defender.',
        WR1: 'Run the reverse left. Take the handoff from RB. Pull up and throw the ball back to QB or TE on the right. Set your feet before you throw!',
        WR2: 'Run a go route to clear out defenders. Act like the play is going away from you.',
        TE: 'Fake block for 2 counts, then leak out to the right flat. Be a target for the WR throw.',
        LT: 'Sell the run block right, then shift to pass protect when WR pulls up to throw.',
        LG: 'Run block right. Sell the play.',
        C: 'Block the nose. Sustain your block.',
        RG: 'Run block right. Sell the play.',
        RT: 'Block the DE. Keep him from chasing the reverse.',
      },
      tags: ['trick', 'reverse', 'pass', 'double-reverse'],
      sort_order: 25,
    },

    // -----------------------------------------------------------------------
    // DEFENSE (5)
    // -----------------------------------------------------------------------
    {
      name: 'Cover 3 Sky',
      play_type: 'zone',
      direction: 'varies',
      description: 'Three-deep zone coverage with the strong safety rolling down into the box. The corners and free safety each take a deep third, while the LBs cover the underneath zones.',
      formation_id: d('4-3'),
      assignments: {
        DL: 'Rush the QB. Attack your gap — don\'t let the QB get comfortable.',
        DE: 'Contain rush. Keep the QB in the pocket. Don\'t let him get outside you.',
        LB: 'Drop to your zone. Cover the curl-flat area on your side. Read the QB\'s eyes.',
        CB: 'Backpedal at the snap. Cover the deep outside third on your side. Don\'t let anyone get behind you.',
        S: 'Free safety — cover the deep middle third. Read the QB and break on the ball. Strong safety — roll down and play the flat or support the run.',
      },
      tags: ['zone', 'cover-3', 'sky', 'three-deep'],
      sort_order: 26,
    },
    {
      name: 'Cover 1 Robber',
      play_type: 'man',
      direction: 'varies',
      description: 'Man-to-man coverage across the board with the free safety playing a "robber" role in the middle of the field. The robber reads the QB and jumps any crossers or short routes.',
      formation_id: d('4-3'),
      assignments: {
        DL: 'Rush the passer. Get off the ball fast and collapse the pocket.',
        DE: 'Speed rush. Get to the QB — this is a man coverage play, so the ball comes out fast.',
        LB: 'Cover your man. If the RB stays in to block, spy the QB and pursue.',
        CB: 'Press man coverage. Line up on your WR and stay in his hip pocket. Don\'t let him get a free release.',
        S: 'Free safety — play the ROBBER. Start deep, read the QB, and jump any short route over the middle. Strong safety — man coverage on the TE.',
      },
      tags: ['man', 'cover-1', 'robber', 'press'],
      sort_order: 27,
    },
    {
      name: 'Bear Front',
      play_type: 'blitz',
      direction: 'middle',
      description: 'An aggressive front where the nose tackle lines up on the center and both DTs line up on the guards, taking away the inside gaps. With the offensive line occupied, linebackers are free to blitz.',
      formation_id: d('4-4'),
      assignments: {
        DL: 'Nose tackle — line up on the center. Two-gap him. DTs — line up head-up on the guards. Control your gap and eat up blocks.',
        DE: 'Crash inside. Take the B-gap and force everything outside.',
        LB: 'You\'re free! Blitz the A-gap on your side. Get to the backfield as fast as you can.',
        CB: 'Man coverage on the WR. Press at the line. Don\'t let him get a clean release.',
        S: 'Play deep. If the ball goes short, come up and make the tackle. You\'re the last line.',
      },
      tags: ['blitz', 'bear', 'aggressive', 'run-stuff'],
      sort_order: 28,
    },
    {
      name: 'Stunt T/E',
      play_type: 'blitz',
      direction: 'right',
      description: 'The defensive tackle and end swap gaps to create confusion for the offensive linemen. The tackle loops outside while the end crashes inside, making it hard for blockers to pick up their assignments.',
      formation_id: d('4-3'),
      assignments: {
        DL: 'DT — on the snap, take one step inside then loop around to the outside (the B-gap). Follow the DE\'s path.',
        DE: 'Crash hard inside to the A-gap on the snap. Go first! The DT will loop behind you.',
        LB: 'Read and react. Fill any open gap. If the stunt frees you up, get to the ball carrier.',
        CB: 'Cover the WR. Stay in man coverage. Don\'t peek at the line.',
        S: 'Cover deep. Read the QB and break on the ball. Be ready to come up on a run.',
      },
      tags: ['blitz', 'stunt', 'twist', 'pressure'],
      sort_order: 29,
    },
    {
      name: 'Tampa 2',
      play_type: 'zone',
      direction: 'varies',
      description: 'A Cover 2 look where the MLB drops deep to the middle of the field, turning it into a 3-deep look. The corners play the flats, and the two safeties cover the deep halves while the MLB splits the difference.',
      formation_id: d('4-3'),
      assignments: {
        DL: 'Rush the passer. Get your hands up if you can\'t reach the QB — bat down passes.',
        DE: 'Contain rush. Keep the QB in the pocket and don\'t let him escape the edge.',
        LB: 'Mike LB — drop deep to the middle of the field. Cover the seam. Outside LBs — drop to the hook zones.',
        CB: 'Play the flat zone. Jam the WR at the line, then drop to the flat. Read the QB\'s eyes.',
        S: 'Each safety covers a deep half. Don\'t let anyone get behind you. Break on the ball when the QB throws.',
      },
      tags: ['zone', 'tampa-2', 'cover-2', 'drop'],
      sort_order: 30,
    },

    // -----------------------------------------------------------------------
    // SPECIAL TEAMS (2)
    // -----------------------------------------------------------------------
    {
      name: 'Onside Kick',
      play_type: 'special',
      direction: 'right',
      description: 'A short, hard kick to the right sideline. The kicking team sprints to recover the ball after it travels 10 yards. Used when you need the ball back — often a surprise play.',
      formation_id: s('Kickoff'),
      assignments: {
        QB: 'Line up on the right side. Sprint to the ball after it\'s kicked. Be ready to dive on it!',
        RB: 'Line up next to the kicker. Sprint right and recover the ball. This is YOUR ball.',
        WR1: 'Sprint to the ball. Get there first and recover the kick. Hands on the ball!',
        WR2: 'Sprint downfield right. Block anyone trying to recover the ball for the other team.',
        TE: 'Line up on the right. Sprint and block. Clear a path for the recovery.',
        LT: 'Sprint right. Block the nearest opponent and let the skill players recover.',
        LG: 'Sprint right. Form the wall and block.',
        C: 'Sprint right. Block and pursue the ball.',
        RG: 'Sprint right. Be part of the wall.',
        RT: 'Sprint right. Block the first returner you see.',
      },
      tags: ['special-teams', 'onside', 'recovery', 'surprise'],
      sort_order: 31,
    },
    {
      name: 'Fake Field Goal',
      play_type: 'special',
      direction: 'right',
      description: 'From field goal formation, the holder catches the snap and rolls out right instead of placing the ball. He throws to the TE who leaked out to the right side uncovered.',
      formation_id: s('Field Goal'),
      assignments: {
        QB: 'You\'re the holder. Catch the snap, stand up, roll right, and throw to the TE. Stay calm and make a good throw.',
        RB: 'Line up as a wing blocker. Block the edge rusher, then release as a safety valve.',
        WR1: 'Line up on the right end of the line. Sell the field goal look. After the snap, run a 10-yard out route.',
        WR2: 'Line up on the left end. Hold your block to sell the kick look.',
        TE: 'Line up on the right side in a blocking stance. On the snap, block for 1 count then leak out to the right flat. You are the primary target!',
        LT: 'Block the rusher. Hold your block for 3 seconds — sell the field goal.',
        LG: 'Block inside. Protect the middle.',
        C: 'Snap the ball to the holder. Keep it low and accurate. Then block.',
        RG: 'Block inside. Protect the holder.',
        RT: 'Block the edge rusher on the right. Give the holder time to roll out.',
      },
      tags: ['special-teams', 'fake', 'field-goal', 'trick'],
      sort_order: 32,
    },
  ];
}

// ---------------------------------------------------------------------------
// GET /api/playbook/seed
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = getSupabase();

    // 1. Fetch all formations
    const { data: formations, error: fErr } = await supabase
      .from('playbook_formations')
      .select('*');

    if (fErr) {
      return NextResponse.json({ error: `Failed to load formations: ${fErr.message}` }, { status: 500 });
    }

    if (!formations || formations.length === 0) {
      return NextResponse.json({ error: 'No formations found. Seed formations first.' }, { status: 400 });
    }

    const fMap = buildFormationMap(formations);

    // 2. Build the play list
    const plays = buildPlays(fMap, formations);

    // 3. Fetch existing plays to avoid duplicates
    const { data: existingPlays } = await supabase
      .from('playbook_plays')
      .select('name');

    const existingNames = new Set((existingPlays || []).map((p) => p.name));

    // 4. Filter to only new plays and strip columns that may not exist yet
    const safeColumns = ['name', 'play_type', 'direction', 'description', 'formation_id', 'assignments', 'tags', 'sort_order', 'source'];
    const newPlays = plays
      .filter((p) => !existingNames.has(p.name))
      .map((p) => {
        const safe = { source: 'system' };
        for (const col of safeColumns) {
          if (p[col] !== undefined) safe[col] = p[col];
        }
        // Append read_key to description if it exists (safe fallback)
        if (p.read_key) {
          safe.description = `${p.description}\n\n🔑 Read Key: ${p.read_key}`;
        }
        return safe;
      });

    if (newPlays.length === 0) {
      return NextResponse.json({
        message: 'All plays already exist. Nothing to seed.',
        total_existing: existingNames.size,
        inserted: 0,
      });
    }

    // 5. Insert in batches (Supabase likes smaller batches)
    const BATCH_SIZE = 10;
    let insertedCount = 0;
    const errors = [];

    for (let i = 0; i < newPlays.length; i += BATCH_SIZE) {
      const batch = newPlays.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('playbook_plays')
        .insert(batch)
        .select('id');

      if (error) {
        errors.push(error.message);
      } else {
        insertedCount += data.length;
      }
    }

    return NextResponse.json({
      message: `Seeded ${insertedCount} plays successfully.`,
      inserted: insertedCount,
      skipped: plays.length - newPlays.length,
      total_defined: plays.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[Playbook Seed] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
