const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://prpcrwdsunjaxhcuvwqo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycGNyd2RzdW5qYXhoY3V2d3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg3MzgwNiwiZXhwIjoyMDkyNDQ5ODA2fQ.gRJEGrljtg2QKwIGFoSa1EpgObV4ihPtDLNRiS38sEg'
);

async function seed() {
  console.log('Seeding formations...');

  // ── OFFENSIVE FORMATIONS ──
  const offFormations = [
    { name: 'Beast T-Formation', side: 'offense', description: 'Classic Beast power formation. 3 backs behind QB, tight splits. Dominant ground game.', sort_order: 1 },
    { name: 'Beast I-Formation', side: 'offense', description: 'Maryland I variant. FB/HB stacked behind QB. Power running with play-action.', sort_order: 2 },
    { name: 'Beast Single Back', side: 'offense', description: 'Single RB, spread look. Versatile run/pass. Good for misdirection.', sort_order: 3 },
    { name: 'Beast Strongman', side: 'offense', description: 'Heavy formation with extra blockers. Short yardage and goal line.', sort_order: 4 },
    { name: 'Beast Air Raid', side: 'offense', description: 'Spread passing attack. 3-4 receivers, shotgun QB. Aggressive downfield.', sort_order: 5 },
    { name: 'Shotgun Spread', side: 'offense', description: 'QB in shotgun, 3-4 WRs spread wide. Quick passing and outside runs.', sort_order: 6 },
    { name: 'Wishbone', side: 'offense', description: 'Triple option look. QB under center, 3 backs in V shape. Option running.', sort_order: 7 },
    { name: 'Wing-T', side: 'offense', description: 'Motion-heavy misdirection offense. Buck sweeps, traps, and counters.', sort_order: 8 },
    { name: 'Power I', side: 'offense', description: 'FB/TB stacked. Power running with lead blocker. Downhill attack.', sort_order: 9 },
    { name: 'Trips Right', side: 'offense', description: '3 receivers to the right. Creates numbers advantage for passing.', sort_order: 10 },
    { name: 'Trips Left', side: 'offense', description: '3 receivers to the left. Mirror of Trips Right.', sort_order: 11 },
    { name: 'Goal Line', side: 'offense', description: 'Heavy personnel. Extra linemen/TEs. Short yardage power.', sort_order: 12 },
  ];

  const defFormations = [
    { name: '4-2-5 Ring of Fire', side: 'defense', description: 'Beast 425 defense. 4 DL, 2 LB, 5 DB. Aggressive run fits with pass coverage.', sort_order: 1 },
    { name: '6-2 Savage', side: 'defense', description: 'Beast 62 defense. 6-man front, 2 LBs. Dominant against the run.', sort_order: 2 },
    { name: '4-4 Reaper', side: 'defense', description: 'Beast 44 defense. Balanced front. 4 DL, 4 LB. Versatile blitz packages.', sort_order: 3 },
    { name: '5-3 Base', side: 'defense', description: 'Standard youth defense. 5 DL, 3 LB. Gap responsibility focused.', sort_order: 4 },
    { name: '4-3 Base', side: 'defense', description: 'Pro-style defense. 4 DL, 3 LB. Good balance of run/pass defense.', sort_order: 5 },
    { name: '3-3 Stack', side: 'defense', description: 'LBs stacked behind DL. Disguises blitz. Good vs spread.', sort_order: 6 },
  ];

  const stFormations = [
    { name: 'Kickoff', side: 'special_teams', description: 'Kickoff coverage team alignment.', sort_order: 1 },
    { name: 'Kickoff Return', side: 'special_teams', description: 'Return team wall/wedge formation.', sort_order: 2 },
    { name: 'Punt', side: 'special_teams', description: 'Punt team protection and coverage.', sort_order: 3 },
  ];

  const { data: formations, error: fErr } = await supabase
    .from('playbook_formations')
    .insert([...offFormations, ...defFormations, ...stFormations])
    .select();
  
  if (fErr) { console.error('Formation error:', fErr); return; }
  console.log(`✅ ${formations.length} formations seeded`);

  // Build formation lookup
  const fMap = {};
  formations.forEach(f => fMap[f.name] = f.id);

  // ── OFFENSIVE PLAYS ──
  const plays = [
    // Beast T-Formation
    { formation_id: fMap['Beast T-Formation'], name: 'Beast Power Right', play_type: 'run', direction: 'right', source: 'beast',
      description: 'Power run to the right behind double team at POA. FB kicks out DE, HB leads through hole.',
      assignments: { QB: 'Reverse pivot, hand off to TB', FB: 'Kick out DE', HB: 'Lead block through B-gap', TB: 'Take handoff, follow HB through B-gap', RT: 'Down block DT', RG: 'Pull and lead through hole' },
      tags: ['power', 'gap_scheme', 'beast'] },
    { formation_id: fMap['Beast T-Formation'], name: 'Beast Power Left', play_type: 'run', direction: 'left', source: 'beast',
      description: 'Mirror of Power Right. Power run to the left.',
      assignments: { QB: 'Reverse pivot, hand off to TB', FB: 'Kick out DE', HB: 'Lead block through B-gap', TB: 'Take handoff, follow blocks left', LT: 'Down block DT', LG: 'Pull and lead' },
      tags: ['power', 'gap_scheme', 'beast'] },
    { formation_id: fMap['Beast T-Formation'], name: 'Beast Trap', play_type: 'run', direction: 'middle', source: 'beast',
      description: 'Interior trap. Guard pulls to trap backside DT. RB hits the A-gap.',
      assignments: { QB: 'Hand off up the middle', RG: 'Pull and trap DT', C: 'Block backside', TB: 'Take handoff, hit A-gap hard', FB: 'Lead block on LB' },
      tags: ['trap', 'gap_scheme', 'beast'] },
    { formation_id: fMap['Beast T-Formation'], name: 'Beast Counter', play_type: 'run', direction: 'left', source: 'beast',
      description: 'Misdirection counter. RB takes a jab step right, cuts back left. Guard and FB lead.',
      assignments: { QB: 'Fake right, hand off left', TB: 'Jab step right, cut back left', FB: 'Kick out backside DE', RG: 'Pull and lead through hole' },
      tags: ['counter', 'misdirection', 'beast'] },
    { formation_id: fMap['Beast T-Formation'], name: 'Beast Sweep Right', play_type: 'run', direction: 'right', source: 'beast',
      description: 'Outside sweep. Both guards pull. Get the RB to the edge.',
      assignments: { QB: 'Toss or hand off wide', TB: 'Take ball, get to the edge', LG: 'Pull and lead right', RG: 'Pull and kick out CB', FB: 'Seal inside LB' },
      tags: ['sweep', 'outside', 'beast'] },
    { formation_id: fMap['Beast T-Formation'], name: 'Beast Sweep Left', play_type: 'run', direction: 'left', source: 'beast',
      description: 'Mirror sweep to the left side.',
      assignments: { QB: 'Toss or hand off wide left', TB: 'Take ball, get to left edge', RG: 'Pull and lead left', LG: 'Pull and kick out CB', FB: 'Seal inside LB' },
      tags: ['sweep', 'outside', 'beast'] },
    { formation_id: fMap['Beast T-Formation'], name: 'Beast Wedge', play_type: 'run', direction: 'middle', source: 'beast',
      description: 'Short yardage wedge. All blockers drive forward. TB follows the push.',
      assignments: { QB: 'Quick hand off up gut', C: 'Drive block nose', LG: 'Wedge block', RG: 'Wedge block', TB: 'Follow the wedge, fall forward', FB: 'Lead into pile' },
      tags: ['wedge', 'short_yardage', 'beast'] },
    { formation_id: fMap['Beast T-Formation'], name: 'Beast QB Sneak', play_type: 'run', direction: 'middle', source: 'beast',
      description: 'QB sneak behind center. Short yardage / goal line.',
      assignments: { QB: 'Take snap, push forward behind C', C: 'Fire out on nose', LG: 'Double team', RG: 'Double team' },
      tags: ['sneak', 'short_yardage', 'goal_line', 'beast'] },
    { formation_id: fMap['Beast T-Formation'], name: 'Beast Bootleg Right', play_type: 'pass', direction: 'right', source: 'beast',
      description: 'Play-action boot. Fake power left, QB rolls right. TE leaks out.',
      assignments: { QB: 'Fake left, roll right, find TE or run', FB: 'Sell fake left', TE: 'Leak out right flat', WR: 'Run a comeback' },
      tags: ['play_action', 'bootleg', 'beast'] },
    { formation_id: fMap['Beast T-Formation'], name: 'Beast Jet Sweep', play_type: 'run', direction: 'right', source: 'beast',
      description: 'Motion WR/HB takes jet handoff. Speed to the edge.',
      assignments: { QB: 'Hand off on jet motion', WR: 'Motion across, take handoff, sprint to edge', OL: 'Reach block right', FB: 'Seal backside' },
      tags: ['jet', 'motion', 'speed', 'beast'] },

    // Beast I-Formation
    { formation_id: fMap['Beast I-Formation'], name: 'ISO Right', play_type: 'run', direction: 'right', source: 'beast',
      description: 'Isolation run. FB leads on LB, TB runs through B-gap.',
      assignments: { QB: 'Hand off to TB', FB: 'Lead block on MIKE LB', TB: 'Follow FB through B-gap', OL: 'Man blocking scheme' },
      tags: ['iso', 'man_scheme', 'beast'] },
    { formation_id: fMap['Beast I-Formation'], name: 'ISO Left', play_type: 'run', direction: 'left', source: 'beast',
      description: 'Mirror ISO to the left.',
      assignments: { QB: 'Hand off to TB', FB: 'Lead block on MIKE LB', TB: 'Follow FB through left B-gap', OL: 'Man blocking scheme' },
      tags: ['iso', 'man_scheme', 'beast'] },
    { formation_id: fMap['Beast I-Formation'], name: 'Dive', play_type: 'run', direction: 'middle', source: 'beast',
      description: 'Quick hitting dive up the A-gap. FB gets the ball fast.',
      assignments: { QB: 'Quick hand off to FB', FB: 'Hit A-gap, fall forward', OL: 'Double team at POA', TB: 'Fake outside' },
      tags: ['dive', 'quick_hit', 'beast'] },
    { formation_id: fMap['Beast I-Formation'], name: 'Play-Action Deep', play_type: 'pass', direction: 'varies', source: 'beast',
      description: 'Fake ISO, QB drops back and throws deep.',
      assignments: { QB: 'Fake ISO, drop back, throw deep', FB: 'Sell fake, block backside DE', TB: 'Sell fake, release to flat', WR: 'Run go route' },
      tags: ['play_action', 'deep', 'beast'] },

    // Beast Single Back
    { formation_id: fMap['Beast Single Back'], name: 'Inside Zone Right', play_type: 'run', direction: 'right', source: 'beast',
      description: 'Zone blocking scheme. RB reads the blocks and finds the crease.',
      assignments: { QB: 'Hand off to RB', RB: 'Read OL blocks, find the crease', OL: 'Zone step right, combo to LB level' },
      tags: ['zone', 'inside', 'beast'] },
    { formation_id: fMap['Beast Single Back'], name: 'Inside Zone Left', play_type: 'run', direction: 'left', source: 'beast',
      description: 'Mirror inside zone to the left.',
      assignments: { QB: 'Hand off to RB', RB: 'Read OL blocks left, find crease', OL: 'Zone step left, combo to LB level' },
      tags: ['zone', 'inside', 'beast'] },
    { formation_id: fMap['Beast Single Back'], name: 'Outside Zone Right', play_type: 'run', direction: 'right', source: 'beast',
      description: 'Stretch play. RB aims for the edge, cuts up when he sees daylight.',
      assignments: { QB: 'Hand off wide', RB: 'Stretch to right, cut upfield at first daylight', OL: 'Reach block right, run to sideline' },
      tags: ['zone', 'outside', 'stretch', 'beast'] },
    { formation_id: fMap['Beast Single Back'], name: 'Draw Play', play_type: 'run', direction: 'middle', source: 'beast',
      description: 'Fake pass, give to RB on delayed handoff.',
      assignments: { QB: 'Fake pass drop, hand off to RB', RB: 'Wait for fake, take handoff up middle', OL: 'Pass set, then drive block' },
      tags: ['draw', 'misdirection', 'beast'] },

    // Beast Strongman
    { formation_id: fMap['Beast Strongman'], name: 'Strongman Power', play_type: 'run', direction: 'right', source: 'beast',
      description: 'Heavy power run. Extra TE/FB as lead blockers. Downhill smash.',
      assignments: { QB: 'Hand off to TB', FB: 'Lead block through hole', TE: 'Down block DE', TB: 'Follow blocks, run downhill' },
      tags: ['power', 'heavy', 'short_yardage', 'beast'] },
    { formation_id: fMap['Beast Strongman'], name: 'Strongman Wedge', play_type: 'run', direction: 'middle', source: 'beast',
      description: 'Goal line wedge. Everyone drives forward. 1-2 yard situation.',
      assignments: { QB: 'Sneak or quick hand off', OL: 'All drive forward', FB: 'Push the pile', TB: 'Fall forward behind the push' },
      tags: ['wedge', 'goal_line', 'beast'] },

    // Beast Air Raid
    { formation_id: fMap['Beast Air Raid'], name: 'Four Verticals', play_type: 'pass', direction: 'varies', source: 'beast',
      description: '4 receivers run go routes. Stretch the defense vertically.',
      assignments: { QB: 'Read safety, throw to open vertical', WR1: 'Go route outside left', WR2: 'Seam route inside left', WR3: 'Seam route inside right', WR4: 'Go route outside right' },
      tags: ['pass', 'vertical', 'aggressive', 'beast'] },
    { formation_id: fMap['Beast Air Raid'], name: 'Mesh Concept', play_type: 'pass', direction: 'varies', source: 'beast',
      description: 'Two receivers cross underneath (mesh). Creates confusion for man coverage.',
      assignments: { QB: 'Read mesh crossers, throw to open man', WR1: 'Shallow cross left to right', WR2: 'Shallow cross right to left', WR3: 'Sit route at 10 yards', RB: 'Check release to flat' },
      tags: ['pass', 'mesh', 'crossing', 'beast'] },
    { formation_id: fMap['Beast Air Raid'], name: 'Screen Right', play_type: 'pass', direction: 'right', source: 'beast',
      description: 'RB screen to the right. Let rushers through, throw behind them.',
      assignments: { QB: 'Drop back, dump to RB behind LOS', RB: 'Release right, catch screen', OL: 'Let rush through, release downfield to block', WR: 'Block downfield' },
      tags: ['screen', 'quick', 'beast'] },

    // Shotgun Spread (Top 40 general plays)
    { formation_id: fMap['Shotgun Spread'], name: 'RPO Bubble', play_type: 'run', direction: 'varies', source: 'top40',
      description: 'Run-Pass Option. QB reads DE — hand off if DE crashes, throw bubble if DE sits.',
      assignments: { QB: 'Read DE: give if he widens, throw bubble if he crashes', RB: 'Take handoff on inside zone', WR: 'Run bubble route' },
      tags: ['rpo', 'read', 'spread'] },
    { formation_id: fMap['Shotgun Spread'], name: 'QB Read Zone', play_type: 'run', direction: 'varies', source: 'top40',
      description: 'Zone read. QB reads backside DE — give or keep.',
      assignments: { QB: 'Read backside DE: give to RB or keep and run', RB: 'Zone path, take handoff or sell fake', OL: 'Zone blocking' },
      tags: ['read', 'zone', 'option'] },
    { formation_id: fMap['Shotgun Spread'], name: 'Slant-Flat', play_type: 'pass', direction: 'right', source: 'top40',
      description: 'Quick game. WR runs slant, RB releases to flat. High-low read.',
      assignments: { QB: 'Read LB: slant if LB drops, flat if LB jumps slant', WR: 'Run slant at 5 yards', RB: 'Release to flat' },
      tags: ['quick_game', 'pass', 'high_low'] },
    { formation_id: fMap['Shotgun Spread'], name: 'Hitch-Seam', play_type: 'pass', direction: 'varies', source: 'top40',
      description: 'Outside WR runs hitch, slot runs seam. Read the safety.',
      assignments: { QB: 'Read safety: hitch if safety stays deep, seam if safety jumps hitch', WR: 'Hitch at 5 yards', SLOT: 'Seam route' },
      tags: ['quick_game', 'pass'] },
    { formation_id: fMap['Shotgun Spread'], name: 'WR Reverse', play_type: 'run', direction: 'left', source: 'top40',
      description: 'Fake sweep right, WR takes reverse handoff left. Big play potential.',
      assignments: { QB: 'Fake sweep right, hand to WR coming left', RB: 'Fake sweep right', WR: 'Come in motion, take reverse handoff, run left' },
      tags: ['trick', 'reverse', 'misdirection'] },

    // Wing-T
    { formation_id: fMap['Wing-T'], name: 'Buck Sweep', play_type: 'run', direction: 'right', source: 'top40',
      description: 'Wing-T signature play. Both guards pull. Wing kicks out, guards lead.',
      assignments: { QB: 'Hand off to HB on sweep path', HB: 'Take handoff, follow pulling guards', LG: 'Pull right, lead through hole', RG: 'Pull right, kick out CB', WB: 'Crack block on DE' },
      tags: ['sweep', 'wing_t', 'signature'] },
    { formation_id: fMap['Wing-T'], name: 'Trap', play_type: 'run', direction: 'middle', source: 'top40',
      description: 'Wing-T trap. Guard pulls to trap DT. Quick hitting.',
      assignments: { QB: 'Quick handoff up middle', FB: 'Take handoff, hit the hole', LG: 'Pull and trap backside DT', C: 'Block backside' },
      tags: ['trap', 'wing_t', 'quick_hit'] },
    { formation_id: fMap['Wing-T'], name: 'Waggle Pass', play_type: 'pass', direction: 'right', source: 'top40',
      description: 'Boot action off buck sweep fake. QB rolls opposite with WB releasing.',
      assignments: { QB: 'Fake buck sweep left, roll right, find WB or TE', WB: 'Fake block, release to flat', TE: 'Run crossing route at 10 yards' },
      tags: ['play_action', 'boot', 'wing_t'] },

    // Power I
    { formation_id: fMap['Power I'], name: 'Lead Iso', play_type: 'run', direction: 'right', source: 'top40',
      description: 'Classic isolation. FB on LB, TB hits the hole.',
      assignments: { QB: 'Hand off to TB', FB: 'Lead on MIKE LB', TB: 'Follow FB, one cut and go', OL: 'Man/gap blocking' },
      tags: ['iso', 'power', 'downhill'] },
    { formation_id: fMap['Power I'], name: 'Toss Sweep', play_type: 'run', direction: 'right', source: 'top40',
      description: 'QB tosses to TB. FB and pulling guard lead to the edge.',
      assignments: { QB: 'Toss to TB wide right', TB: 'Catch toss, get to edge', FB: 'Lead to edge, block CB', LG: 'Pull and lead' },
      tags: ['toss', 'outside', 'speed'] },
    { formation_id: fMap['Power I'], name: 'FB Dive', play_type: 'run', direction: 'middle', source: 'top40',
      description: 'Quick FB dive. Short yardage bread and butter.',
      assignments: { QB: 'Quick handoff to FB', FB: 'Hit A-gap, fall forward for 2-3 yards', OL: 'Double team nose' },
      tags: ['dive', 'short_yardage', 'quick'] },

    // Wishbone
    { formation_id: fMap['Wishbone'], name: 'Triple Option', play_type: 'run', direction: 'right', source: 'top40',
      description: 'Classic triple option. QB reads DE for give/keep, then reads pitch key.',
      assignments: { QB: 'Read DE: give to FB if DE widens, keep if DE crashes. Then read OLB for keep/pitch', FB: 'Dive at A-gap', HB: 'Pitch relationship with QB' },
      tags: ['option', 'triple', 'read'] },
    { formation_id: fMap['Wishbone'], name: 'Speed Option', play_type: 'run', direction: 'right', source: 'top40',
      description: 'QB and pitch back speed to the edge. QB reads end man on LOS.',
      assignments: { QB: 'Sprint to edge, read EMOL, keep or pitch', HB: 'Maintain pitch relationship', OL: 'Zone reach right' },
      tags: ['option', 'speed', 'outside'] },

    // Defensive Plays
    { formation_id: fMap['4-2-5 Ring of Fire'], name: 'Cover 3 Base', play_type: 'zone', direction: 'varies', source: 'beast',
      description: 'Base Cover 3 zone. 3 deep, 4 under. Safe against run and pass.',
      assignments: { DL: 'Gap responsibility, rush QB', LB: 'Hook/curl zones', CB: 'Deep third', FS: 'Deep middle third', SS: 'Flat/hook zone' },
      tags: ['zone', 'cover3', 'base', 'beast'] },
    { formation_id: fMap['4-2-5 Ring of Fire'], name: 'Fire Blitz', play_type: 'blitz', direction: 'varies', source: 'beast',
      description: 'All-out blitz. Both LBs rush. Man coverage behind it.',
      assignments: { DL: 'Rush lanes', LB1: 'Blitz A-gap', LB2: 'Blitz B-gap', CB: 'Man coverage on WR', FS: 'Man on TE', SS: 'Man on RB' },
      tags: ['blitz', 'pressure', 'aggressive', 'beast'] },
    { formation_id: fMap['6-2 Savage'], name: 'Savage Run Stuff', play_type: 'man', direction: 'varies', source: 'beast',
      description: '6-man front fills every gap. Dominant vs inside run.',
      assignments: { DL: 'Two-gap responsibility', DE: 'Set edge, squeeze', LB: 'Fill downhill on flow', CB: 'Force player', FS: 'Alley player' },
      tags: ['run_stuff', 'gap_control', 'beast'] },
    { formation_id: fMap['4-4 Reaper'], name: 'Reaper Overload', play_type: 'blitz', direction: 'right', source: 'beast',
      description: 'Overload blitz to the right. 3 rushers from one side.',
      assignments: { DE: 'Rush outside', OLB: 'Rush B-gap', ILB: 'Rush A-gap', CB: 'Man on WR', FS: 'Deep half', SS: 'Man on TE' },
      tags: ['blitz', 'overload', 'beast'] },
  ];

  // Add sort_order
  plays.forEach((p, i) => p.sort_order = i + 1);

  const { data: playData, error: pErr } = await supabase
    .from('playbook_plays')
    .insert(plays)
    .select('id, name');

  if (pErr) { console.error('Play error:', pErr); return; }
  console.log(`✅ ${playData.length} plays seeded`);
  console.log('Done!');
}

seed().catch(console.error);
