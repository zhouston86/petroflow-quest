// Chiptune engine: 2 pulse channels + triangle bass + noise drums, scheduled with WebAudio.
const Sound = (() => {
  let ctx = null, master = null, noiseBuf = null, muted = false;
  let song = null, timer = null, nextTime = 0, step = 0, onEnd = null, curName = '';
  const pulse = {};
  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11],
    phrygDom: [0, 1, 4, 5, 7, 8, 10], harmMinor: [0, 2, 3, 5, 7, 8, 11], phrygian: [0, 1, 3, 5, 7, 8, 10]
  };

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const duty of [0.125, 0.25, 0.5]) {
      const real = new Float32Array(65), imag = new Float32Array(65);
      for (let n = 1; n <= 64; n++) imag[n] = (2 * (1 - Math.cos(2 * Math.PI * n * duty))) / (n * Math.PI);
      pulse[duty] = ctx.createPeriodicWave(real, imag);
    }
  }
  const suspend = () => { if (ctx && ctx.state === 'running') ctx.suspend(); };
  const resume = () => { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function tone(t, freq, dur, vol, wave, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    if (wave === 'triangle' || wave === 'sawtooth' || wave === 'sine') o.type = wave; else o.setPeriodicWave(pulse[wave || 0.5]);
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.linearRampToValueAtTime(vol * 0.6, t + dur * 0.75);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, hp, lp) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; s.loop = true;
    f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || lp || 2000;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function kick(t, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.18);
  }

  // ---- song compilation ----
  function parseLead(str) {
    const toks = str.replace(/\|/g, ' ').trim().split(/\s+/);
    const notes = [];
    toks.forEach((tk, i) => {
      if (tk === '-') { if (notes.length) notes[notes.length - 1].len++; return; }
      if (tk === '.') return;
      const m = /^([1-7])('*)(,*)$/.exec(tk);
      if (!m) throw new Error('bad token ' + tk);
      notes.push({ at: i, len: 1, idx: parseInt(m[1], 10) - 1 + 7 * (m[2].length - m[3].length) });
    });
    return { notes, bars: toks.length / 8 };
  }
  const degMidi = (s, idx) => s.root + s.scale[((idx % 7) + 7) % 7] + 12 * Math.floor(idx / 7);

  function compile(def) {
    const s = { ...def, scale: SCALES[def.scale] };
    const lead = parseLead(def.lead);
    s.bars = lead.bars;
    s.sections = def.sections || [0];
    s.total = s.bars * s.sections.length * 16;
    s.lead = {}; s.harm = {};
    s.sections.forEach((shift, si) => {
      for (const n of lead.notes) {
        const st = (si * s.bars * 8 + n.at) * 2;
        s.lead[st] = { midi: degMidi(s, n.idx + shift), dur: n.len * 2 };
        if (si > 0 && !def.noHarm) s.harm[st] = { midi: degMidi(s, n.idx + shift + 2), dur: n.len * 2 };
      }
    });
    return s;
  }

  const BASS = {
    gallop: '0.00.0000.00.000', pulse: '0.0.0.0.0.0.0.0.', walk: '0...5...0...5...', drive: '0.0.0.8.0.0.0.8.',
    half: '0.......5.......', roll: '00.00.00.00.00.0'
  };
  const ARP = { up: '0123210301232103', plink: '0.1.2.3.2.1.0.1.', run: '0102010201020102', wide: '0.2.1.3.0.2.1.3.' };
  const DRUM = {
    rock: ['k.......k.k.....', '....s.......s...', 'h.h.h.h.h.h.h.h.'],
    drive: ['k..kk..kk..kk..k', '....s.......s..s', 'h.hhh.hhh.hhh.hh'],
    four: ['k...k...k...k...', '....s.......s...', '..h...h...h...h.'],
    half: ['k.......k.......', '........s.......', 'h...h...h...h...'],
    march: ['k.k.k.k.k.k.k.k.', '..s...s...s...s.', '................']
  };

  function scheduleStep(s, st, t) {
    const stepDur = 60 / s.bpm / 4;
    const bar = Math.floor(st / 16), sp = st % 16;
    const sec = Math.floor(bar / s.bars), chordBar = bar % s.bars;
    const root = s.prog[chordBar];
    const ev = s.lead[st];
    if (ev) tone(t, hz(ev.midi), ev.dur * stepDur * 0.95, 0.075, s.duty || 0.25);
    const hv = s.harm[st];
    if (hv) tone(t, hz(hv.midi), hv.dur * stepDur * 0.9, 0.032, 0.125);
    // bass
    const bp = BASS[s.bass || 'pulse'];
    const bc = bp[sp];
    if (bc && bc !== '.') {
      const off = bc === '5' ? 7 : bc === '8' ? 12 : 0;
      tone(t, hz(degMidi(s, root) - 24 + off), stepDur * 1.7, 0.2, 'triangle');
    }
    // arpeggio
    if (!s.noArp) {
      const style = ARP[s.arp || 'up'];
      const ac = style[sp];
      if (ac !== '.') {
        const k = parseInt(ac, 10);
        const idx = root + [0, 2, 4, 7][k];
        tone(t, hz(degMidi(s, idx)), stepDur * 0.9, sec === 0 ? 0.03 : 0.04, 0.125);
      }
    }
    // drums
    if (s.drums) {
      const [k, sn, h] = DRUM[s.drums];
      const lvl = s.sections.length === 1 ? 1 : (sec === 0 ? 0 : 1);
      if (k[sp] === 'k') kick(t, 0.28);
      if (lvl && sn[sp] === 's') noise(t, 0.13, 0.16, 1500);
      if (h[sp] === 'h') noise(t, 0.04, lvl ? 0.07 : 0.045, 7000);
    }
  }

  function tick() {
    if (!song || !ctx) return;
    const stepDur = 60 / song.bpm / 4;
    while (nextTime < ctx.currentTime + 0.12) {
      if (step >= song.total) {
        if (song.loop === false) { const cb = onEnd; stop(); if (cb) cb(); return; }
        step = 0;
      }
      scheduleStep(song, step, nextTime);
      nextTime += stepDur;
      step++;
    }
  }

  function play(name, cb) {
    resume();
    if (!ctx) return;
    if (name === curName && song && song.loop !== false) return;
    stop();
    const def = SONGS[name];
    if (!def) return;
    curName = name;
    song = compile(def);
    onEnd = cb || null;
    step = 0;
    nextTime = ctx.currentTime + 0.06;
    timer = setInterval(tick, 25);
    tick();
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null; song = null; curName = ''; onEnd = null;
  }
  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  // ---- sound effects ----
  function sfx(name) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'jump': tone(t, 300, 0.16, 0.12, 0.5, 700); break;
      case 'shoot': tone(t, 900, 0.08, 0.08, 0.125, 300); break;
      case 'coin': tone(t, hz(83), 0.05, 0.09, 0.5); tone(t + 0.05, hz(88), 0.18, 0.09, 0.5); break;
      case 'hit': noise(t, 0.07, 0.2, 1200); tone(t, 200, 0.07, 0.1, 0.25, 90); break;
      case 'stomp': tone(t, 400, 0.1, 0.12, 0.5, 120); break;
      case 'kill': noise(t, 0.2, 0.22, 0, 3000); tone(t, 500, 0.15, 0.1, 0.25, 100); break;
      case 'hurt': tone(t, 400, 0.3, 0.14, 'sawtooth', 80); break;
      case 'die': [0, 1, 2, 3, 4, 5].forEach(i => tone(t + i * 0.1, hz(76 - i * 3), 0.12, 0.12, 0.25)); break;
      case 'power': [0, 4, 7, 12, 16].forEach((o, i) => tone(t + i * 0.06, hz(72 + o), 0.1, 0.1, 0.25)); break;
      case 'heal': tone(t, hz(76), 0.08, 0.1, 0.5); tone(t + 0.08, hz(83), 0.2, 0.1, 0.5); break;
      case '1up': [0, 4, 7, 12, 7, 12, 16, 19].forEach((o, i) => tone(t + i * 0.07, hz(79 + o), 0.09, 0.1, 0.5)); break;
      case 'check': [0, 7, 12].forEach((o, i) => tone(t + i * 0.08, hz(76 + o), 0.14, 0.1, 0.25)); break;
      case 'boom': noise(t, 0.6, 0.35, 0, 1800); tone(t, 120, 0.5, 0.2, 'triangle', 35); break;
      case 'bosshit': noise(t, 0.08, 0.2, 800); tone(t, 150, 0.12, 0.14, 0.25, 60); break;
      case 'select': tone(t, hz(84), 0.06, 0.08, 0.5); break;
      case 'start': [0, 4, 7, 12].forEach((o, i) => tone(t + i * 0.07, hz(72 + o), 0.12, 0.1, 0.25)); break;
      case 'slam': noise(t, 0.25, 0.3, 0, 900); tone(t, 90, 0.25, 0.2, 'triangle', 30); break;
      case 'warn': [0, 1, 0, 1].forEach((o, i) => tone(t + i * 0.18, hz(70 + o * 4), 0.15, 0.1, 0.5)); break;
      case 'spit': tone(t, 250, 0.12, 0.08, 0.125, 600); break;
    }
  }

  // ---- the soundtrack ----
  const SONGS = {
    title: { bpm: 132, root: 62, scale: 'minor', duty: 0.25, bass: 'gallop', arp: 'up', drums: 'rock',
      prog: [0, 5, 2, 6, 0, 5, 6, 4], sections: [0, 2, 4, 0],
      lead: '1 - 3 5 1\' - - 5 | 6 - 1\' - 3\' - 1\' 6 | 3\' - 2\' 3\' 5\' - - 3\' | 7 - 2\' - 4\' - 2\' 7 | 1\' - - 7 5 - 3 - | 6 - 1\' 3\' 6\' - 5\' 3\' | 7 - 2\' 4\' 7\' - - 4\' | 5 - 7 2\' 5\' - 4\' 2\'' },
    w1: { bpm: 152, root: 67, scale: 'major', duty: 0.5, bass: 'drive', arp: 'run', drums: 'four',
      prog: [0, 4, 5, 3, 0, 4, 3, 4], sections: [0, 2, 4, 0],
      lead: '1\' - 5 1\' 3\' - 1\' 5 | 5 - 7 5 2\' - 7 5 | 6 - 3\' 1\' 6 - 3\' - | 4\' - 6 4\' 1\' - 6 4 | 3\' - 5\' 3\' 1\' - 5 - | 2\' - 7 2\' 5\' - 2\' 7 | 1\' - 6 4 6 - 1\' - | 5 - 7 2\' 5\' - 7\' 5\'' },
    w2: { bpm: 158, root: 64, scale: 'dorian', duty: 0.25, bass: 'roll', arp: 'wide', drums: 'drive',
      prog: [0, 6, 3, 0, 0, 6, 3, 4], sections: [0, 2, 4, 2],
      lead: '1 1 3 1 5 3 5 3 | 7 7 2\' 7 4\' 2\' 4\' 2\' | 4 4 6 4 1\' 6 1\' 6 | 5 5 3 5 1\' 5 3 5 | 1\' - 7 5 3 - 5 - | 2\' - 4\' 2\' 7 - 4 - | 6 - 1\' 6 4 - 6 - | 7 - 5 - 2\' 7 5 7' },
    w3: { bpm: 140, root: 64, scale: 'phrygDom', duty: 0.125, bass: 'gallop', arp: 'plink', drums: 'rock',
      prog: [0, 1, 0, 1, 0, 6, 1, 0], sections: [0, 2, 4, 0],
      lead: '1 - 2 3 5 - 3 2 | 2 - 4 6 2\' - 6 4 | 3 - 5 3 1\' - 3 2 | 4 - 6 4 2\' - 4\' 2\' | 5 - 3 5 1\' - 2\' 3\' | 7 - 2\' 4\' 7 - 4\' 2\' | 6 - 4 2 6 - 4 2 | 3 - 2 1 3 - 5 -' },
    w4: { bpm: 124, root: 60, scale: 'minor', duty: 0.5, bass: 'walk', arp: 'up', drums: 'half',
      prog: [0, 2, 5, 6, 0, 3, 6, 4], sections: [0, 2, 4, 0],
      lead: '5 - - - 3 - 1 - | 7 - - 5 3 - 5 - | 1\' - - 6 3\' - 1\' - | 2\' - - 7 4 - 7 - | 1\' - 3\' - 5\' - 3\' 1\' | 6 - 4\' - 1\' - 6 4 | 7 - 2\' 4\' 7\' - 4\' 2\' | 5 - 7 2\' 5\' - - -' },
    w5: { bpm: 168, root: 64, scale: 'harmMinor', duty: 0.25, bass: 'drive', arp: 'run', drums: 'drive',
      prog: [0, 5, 3, 4, 0, 5, 4, 0], sections: [0, 2, 4, 0],
      lead: '1 3 5 3 1\' 5 3 5 | 6 1\' 3\' 1\' 6 3\' 1\' 3\' | 4 6 1\' 6 4 6 1\' 6 | 5 7 2\' 7 5 7 2\' 7 | 1\' - 3\' 1\' 5\' - 3\' 1\' | 6\' - 3\' 1\' 6 - 1\' 3\' | 7 - 2\' 5\' 2\' - 7 5 | 1\' - - 7 1\' - 5 -' },
    w6: { bpm: 172, root: 65, scale: 'minor', duty: 0.25, bass: 'gallop', arp: 'wide', drums: 'drive',
      prog: [0, 0, 5, 6, 0, 0, 3, 4], sections: [0, 2, 4, 2],
      lead: '1 - 1 3 5 - 3 1 | 1\' - 7 5 3 - 5 7 | 6 - 1\' 3\' 1\' - 3\' 1\' | 7 - 2\' 4\' 7 - 4\' 2\' | 1\' - 1\' 7 5 - 3 - | 3\' - 5\' 3\' 1\' - 3\' 5\' | 4\' - 6\' 4\' 1\' - 6 4 | 5\' - 7 5 2\' - 7 2\'' },
    boss: { bpm: 184, root: 64, scale: 'phrygian', duty: 0.25, bass: 'roll', arp: 'wide', drums: 'drive',
      prog: [0, 1, 0, 1, 0, 5, 6, 1], sections: [0, 2, 0, 4],
      lead: '1 - 1 - 3 1 5 3 | 2 - 2 - 4 2 6 4 | 1\' - 7 - 5 3 5 1\' | 2\' - 6 - 4 2 4 6 | 5 5 3 5 1\' - 3\' 1\' | 6 - 1\' 3\' 6 - 3\' 1\' | 7 - 2\' 4\' 7 - 4\' 2\' | 2\' 6 4 2 4 6 2\' -' },
    final: { bpm: 192, root: 60, scale: 'harmMinor', duty: 0.25, bass: 'gallop', arp: 'run', drums: 'drive',
      prog: [0, 5, 4, 0, 0, 3, 4, 4], sections: [0, 2, 4, 2],
      lead: '1\' - 5 3 1 - 3 5 | 6 - 3\' 1\' 6 - 3\' 1\' | 5 - 7 2\' 5\' - 2\' 7 | 1\' - - 7 1\' - 3\' 5\' | 5\' - 3\' - 1\' - 3\' 5\' | 4\' - 6\' 4\' 1\' - 6 4 | 2\' - 7 5 2\' - 7 5 | 7 - 5 7 2\' - 5\' 7\'' },
    ending: { bpm: 116, root: 62, scale: 'major', duty: 0.5, bass: 'walk', arp: 'plink', drums: 'half',
      prog: [0, 4, 5, 3, 0, 4, 3, 4], sections: [0, 2, 4, 0],
      lead: '3\' - - 1\' 5 - 3 - | 5 - 7 2\' 5\' - 2\' 7 | 6 - - 1\' 3\' - 1\' 6 | 4\' - 6 1\' 4\' - 1\' 6 | 1\' - 3\' - 5\' - 3\' 1\' | 2\' - 5\' - 7 - 2\' - | 1\' - 6 4 6 - 1\' 4\' | 5 - 7 2\' 5\' - - -' },
    clear: { bpm: 150, root: 67, scale: 'major', duty: 0.5, bass: 'drive', noArp: true, loop: false, drums: null, noHarm: true,
      prog: [0, 3, 4, 0], lead: '5 5 5 - 1\' - 3\' - | 6 - 1\' - 4\' - - - | 5\' - 7 - 2\' - 5\' - | 1\' - - - - - - -' },
    gameover: { bpm: 90, root: 64, scale: 'minor', duty: 0.25, bass: 'half', noArp: true, loop: false, noHarm: true,
      prog: [0, 0], lead: '5\' - 3\' - 1\' - 5 - | 3 - - - 1 - - -' }
  };

  return { init, resume, suspend, play, stop, sfx, toggleMute, SONGS, parseLead, compile, BASS, ARP, DRUM, degMidi, isMuted: () => muted };
})();
