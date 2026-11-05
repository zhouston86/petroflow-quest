// Exports the in-game chiptune soundtrack as standard MIDI files.
// Usage (from the repo root):  node tools/export_midi.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'web', 'audio.js'), 'utf8').replace('const Sound =', 'var Sound =');
const sandbox = {};
vm.runInNewContext(src, sandbox);
const Sound = sandbox.Sound;

const NAMES = {
  title: '00_title_quest_for_the_golden_barrel', w1: '01_gulf_of_mexico', w2: '02_north_sea', w3: '03_west_africa', w4: '04_barents_sea',
  w5: '05_topsides_process_plant', w6: '06_the_wild_well', boss: '07_boss_battle', final: '08_final_boss_dr_downtime', ending: '09_flow_restored_credits',
  clear: '10_world_clear_jingle', gameover: '11_game_over'
};
const PPQ = 480, STEP = PPQ / 4;
const PROGRAMS = { lead: 80, harm: 81, bass: 38, arp: 82 };

function vlq(n) {
  const bytes = [n & 0x7f];
  while ((n >>= 7) > 0) bytes.unshift((n & 0x7f) | 0x80);
  return bytes;
}
function trackChunk(events) {
  events.sort((a, b) => a.tick - b.tick || (a.order || 0) - (b.order || 0));
  const data = [];
  let last = 0;
  for (const e of events) { data.push(...vlq(e.tick - last), ...e.bytes); last = e.tick; }
  data.push(0, 0xff, 0x2f, 0);
  const head = Buffer.alloc(8);
  head.write('MTrk', 0); head.writeUInt32BE(data.length, 4);
  return Buffer.concat([head, Buffer.from(data)]);
}
const noteOn = (tick, ch, n, v) => ({ tick, order: 1, bytes: [0x90 | ch, n, v] });
const noteOff = (tick, ch, n) => ({ tick, order: 0, bytes: [0x80 | ch, n, 0] });

function build(name, def) {
  const s = Sound.compile(def);
  const tracks = { lead: [], harm: [], bass: [], arp: [], drums: [] };
  const add = (t, ch, note, st, dur, vel) => { tracks[t].push(noteOn(st * STEP, ch, note, vel), noteOff((st + dur) * STEP, ch, note)); };
  for (let st = 0; st < s.total; st++) {
    const bar = Math.floor(st / 16), sp = st % 16, chordBar = bar % s.bars, sec = Math.floor(bar / s.bars);
    const root = s.prog[chordBar];
    if (s.lead[st]) add('lead', 0, s.lead[st].midi, st, s.lead[st].dur, 100);
    if (s.harm[st]) add('harm', 1, s.harm[st].midi, st, s.harm[st].dur, 70);
    const bc = Sound.BASS[s.bass || 'pulse'][sp];
    if (bc !== '.') add('bass', 2, Sound.degMidi(s, root) - 24 + (bc === '5' ? 7 : bc === '8' ? 12 : 0), st, 2, 105);
    if (!s.noArp) {
      const ac = Sound.ARP[s.arp || 'up'][sp];
      if (ac !== '.') add('arp', 3, Sound.degMidi(s, root + [0, 2, 4, 7][parseInt(ac, 10)]), st, 1, 60);
    }
    if (s.drums) {
      const [k, sn, h] = Sound.DRUM[s.drums];
      const full = s.sections.length === 1 || sec > 0;
      if (k[sp] === 'k') add('drums', 9, 36, st, 1, 110);
      if (full && sn[sp] === 's') add('drums', 9, 38, st, 1, 100);
      if (h[sp] === 'h') add('drums', 9, 42, st, 1, full ? 70 : 50);
    }
  }
  const us = Math.round(60000000 / s.bpm);
  const meta = [
    { tick: 0, order: -2, bytes: [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255] },
    { tick: 0, order: -1, bytes: [0xff, 0x58, 4, 4, 2, 24, 8] },
    { tick: 0, order: -1, bytes: [0xff, 0x03, name.length, ...Buffer.from(name)] }
  ];
  const chunks = [trackChunk(meta)];
  for (const [t, ch] of [['lead', 0], ['harm', 1], ['bass', 2], ['arp', 3], ['drums', 9]]) {
    const ev = tracks[t];
    if (!ev.length) continue;
    if (t !== 'drums') ev.push({ tick: 0, order: -1, bytes: [0xc0 | ch, PROGRAMS[t]] });
    chunks.push(trackChunk(ev));
  }
  const header = Buffer.alloc(14);
  header.write('MThd', 0); header.writeUInt32BE(6, 4); header.writeUInt16BE(1, 8); header.writeUInt16BE(chunks.length, 10); header.writeUInt16BE(PPQ, 12);
  return Buffer.concat([header, ...chunks]);
}

const outDir = path.join(__dirname, '..', 'soundtrack');
fs.mkdirSync(outDir, { recursive: true });
for (const [k, def] of Object.entries(Sound.SONGS)) {
  const file = path.join(outDir, NAMES[k] + '.mid');
  fs.writeFileSync(file, build(NAMES[k], def));
  console.log('wrote', path.relative(process.cwd(), file));
}
