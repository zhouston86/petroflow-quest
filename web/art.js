// Procedural 8-bit art: tiles, backgrounds, characters, enemies, items, text.
const SW = 256, SH = 240, TS = 16;

const THEMES = [
  { name: 'GULF OF MEXICO', sub: 'DEEPWATER DOCK', sky: ['#2f7de0', '#b4e6ff'], far: '#5c8fc0', mid: '#3a6aa0', top: '#ffc933', body: '#7c8ca4', dark: '#46566e', liquid: ['#1f5fbf', '#4f9fff'], block: '#d0642a', pipe: '#a9b7c9', bg: 'rigs' },
  { name: 'NORTH SEA', sub: 'STORM PLATFORM', sky: ['#303c58', '#7a8aa8'], far: '#4a5878', mid: '#2e3a56', top: '#c8d0dc', body: '#8a4a3a', dark: '#5a2c24', liquid: ['#18264c', '#3a5a9a'], block: '#7a8aa0', pipe: '#b0bccc', bg: 'waves' },
  { name: 'WEST AFRICA', sub: 'FPSO JUNGLE', sky: ['#e8702a', '#ffd470'], far: '#8a4a2a', mid: '#2a6a2a', top: '#58c038', body: '#9a6a3a', dark: '#6a4424', liquid: ['#0c0c14', '#2c2440'], block: '#b07a3a', pipe: '#6a7a50', bg: 'jungle' },
  { name: 'BARENTS SEA', sub: 'ARCTIC PIPELINE', sky: ['#1a3a78', '#a8e8ff'], far: '#7aa8d0', mid: '#4a7aa8', top: '#f4ffff', body: '#7acaf0', dark: '#3a8ac0', liquid: ['#0a2a5a', '#2a6aa8'], block: '#a8d8f8', pipe: '#e0f4ff', bg: 'ice' },
  { name: 'TOPSIDES', sub: 'PROCESS PLANT', sky: ['#20243a', '#505a78'], far: '#3a4260', mid: '#2a3048', top: '#ffc933', body: '#6a7284', dark: '#3a4254', liquid: ['#08080c', '#282436'], block: '#c0602a', pipe: '#9aa8b8', bg: 'plant' },
  { name: 'THE WILD WELL', sub: 'BLOWOUT ZONE', sky: ['#3a0808', '#e8581c'], far: '#5a1410', mid: '#2e0a0a', top: '#ff8a2a', body: '#4a2a2a', dark: '#2a1414', liquid: ['#c82808', '#ffb020'], block: '#6a3a30', pipe: '#8a7a7a', bg: 'fire' }
];

const CHARS = {
  zach: { name: 'ZACH', jacket: '#1a2a5a', shirt: '#e8a8c8', pants: '#2a2a3a', hp: 3, speed: 1.75, jump: 5.7, cd: 9, shots: 4, dmg: 1, shotSpd: 3.6, dbl: false, tag: 'SPEED + RAPID FIRE', bio: ['SIMULATION ENGINEER', 'DIGITAL TWIN WIZARD', 'SINCE 2011'] },
  geir: { name: 'GEIR', jacket: '#1a2438', shirt: '#9a9ae0', pants: '#2a2a3a', hp: 4, speed: 1.35, jump: 6.0, cd: 20, shots: 2, dmg: 2, shotSpd: 3.0, dbl: false, tag: '4 HP + POWER SHOT', bio: ['37 YEARS IN FLOW', 'ASSURANCE. MULTIPHASE', 'FLOW SPECIALIST'] },
  mack: { name: 'MACK', jacket: '#232c4a', shirt: '#232c4a', pants: '#303040', hp: 3, speed: 1.5, jump: 5.6, cd: 13, shots: 3, dmg: 1, shotSpd: 3.4, dbl: true, tag: 'DOUBLE JUMP', bio: ['LED PIPESIM 10+ YRS', 'SPE DISTINGUISHED', 'LECTURER'] }
};

const Art = (() => {
  const heads = {};
  const tiles = [];
  const bgs = [];
  let logoCanvas = null;

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function text(g, s, x, y, color, align, shadow) {
    g.font = '8px "PS2P", monospace';
    g.textBaseline = 'top';
    g.textAlign = align || 'left';
    x = Math.round(x); y = Math.round(y);
    if (shadow !== false) { g.fillStyle = '#000'; g.fillText(s, x + 1, y + 1); }
    g.fillStyle = color || '#fff';
    g.fillText(s, x, y);
  }
  function bigText(g, s, x, y, color, align, size) {
    g.font = (size || 16) + 'px "PS2P", monospace';
    g.textBaseline = 'top'; g.textAlign = align || 'left';
    g.fillStyle = '#000'; g.fillText(s, Math.round(x) + 2, Math.round(y) + 2);
    g.fillStyle = color || '#fff'; g.fillText(s, Math.round(x), Math.round(y));
  }

  function logo(g, cx, cy, r) {
    const circle = (c, rr) => { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill(); };
    circle('#c01010', r); circle('#ffc000', r * 0.86); circle('#101010', r * 0.62); circle('#1f6f94', r * 0.42);
  }

  function buildHeads() {
    for (const k in FACES) {
      const c = mk(16, 20), g = c.getContext('2d');
      FACES[k].rows.forEach((row, y) => {
        for (let x = 0; x < 16; x++) {
          const ch = row[x];
          if (ch === '.') continue;
          g.fillStyle = ch === '#' ? '#000' : FACES[k].pal[ch];
          g.fillRect(x, y, 1, 1);
        }
      });
      heads[k] = c;
    }
  }

  // sprite box 16x32 at (x,y). st: 'idle' | 'run' | 'jump'
  function drawPlayer(g, ch, x, y, facing, st, t, extra) {
    const C = CHARS[ch];
    g.save();
    g.translate(Math.round(x) + (facing < 0 ? 16 : 0), Math.round(y));
    g.scale(facing < 0 ? -1 : 1, 1);
    const run = st === 'run';
    const bob = run && Math.floor(t / 6) % 2 === 1 ? 1 : 0;
    const s = Math.round(Math.sin(t * 0.35) * 2);
    // legs
    let l1 = 4, l2 = 9, ly = 26;
    if (run) { l1 = 5 + s; l2 = 8 - s; }
    if (st === 'jump') { l1 = 3; l2 = 10; ly = 25; }
    R(g, C.pants, l1, ly, 3, 5); R(g, C.pants, l2, ly, 3, 5);
    R(g, '#4a2a18', l1 - 1, 30, 5, 2); R(g, '#4a2a18', l2 - 1, 30, 5, 2);
    // torso
    R(g, C.jacket, 3, 19 + bob, 10, 8);
    R(g, C.shirt, 6, 19 + bob, 4, 5);
    R(g, '#ffc000', 4, 22 + bob, 2, 2); R(g, '#c01010', 4, 24 + bob, 2, 1);
    // arms: back arm swings, front arm holds sprayer
    R(g, C.jacket, 1, 20 + bob + (run ? s : 0) * 0, 3, 6);
    R(g, C.jacket, 12, 21 + bob, 3, 3);
    R(g, '#e8b090', 14, 21 + bob, 2, 3);
    R(g, '#8a8a9a', 15, 20 + bob, 1 + (extra && extra.fire ? 1 : 0), 2);
    g.drawImage(heads[ch], 0, bob);
    g.restore();
  }

  // ---------- tiles ----------
  function buildTiles() {
    THEMES.forEach((th, ti) => {
      const r = rng(ti * 77 + 3);
      const set = {};
      // ground fill
      let c = mk(16, 16), g = c.getContext('2d');
      R(g, th.body, 0, 0, 16, 16);
      R(g, th.dark, 0, 15, 16, 1); R(g, th.dark, 15, 0, 1, 16); R(g, th.dark, 0, 7, 16, 1);
      if (ti === 2 || ti === 5) { for (let i = 0; i < 6; i++) R(g, th.dark, (r() * 14) | 0, (r() * 14) | 0, 2, 2); }
      else { R(g, '#ffffff22', 2, 2, 2, 2); R(g, '#ffffff22', 11, 10, 2, 2); }
      if (ti === 5) { R(g, th.liquid[1], 4, 9, 6, 1); R(g, th.liquid[0], 5, 10, 3, 1); }
      set.fill = c;
      // ground top
      c = mk(16, 16); g = c.getContext('2d');
      g.drawImage(set.fill, 0, 0);
      R(g, th.top, 0, 0, 16, 4);
      R(g, '#ffffff55', 0, 0, 16, 1);
      R(g, th.dark, 0, 4, 16, 1);
      if (ti === 0 || ti === 4) { for (let x = 0; x < 16; x += 8) R(g, '#222', x, 1, 4, 2); }
      if (ti === 2) { for (let x = 0; x < 16; x += 3) R(g, th.top, x, 4, 1, 2 + (x % 2)); }
      if (ti === 3) { R(g, '#fff', 2, 1, 5, 1); R(g, th.dark, 11, 4, 2, 3); R(g, th.dark, 12, 7, 1, 2); }
      if (ti === 5) { R(g, '#ffe070', 3, 1, 4, 1); R(g, '#ffe070', 10, 2, 3, 1); }
      set.top = c;
      // block (crate)
      c = mk(16, 16); g = c.getContext('2d');
      R(g, th.dark, 0, 0, 16, 16); R(g, th.block, 1, 1, 14, 14);
      R(g, '#00000033', 1, 12, 14, 3); R(g, '#ffffff44', 1, 1, 14, 2);
      R(g, th.dark, 1, 7, 14, 2); R(g, th.dark, 7, 1, 2, 14);
      R(g, '#ffffff66', 3, 3, 2, 2); R(g, '#ffffff66', 11, 11, 2, 2);
      set.block = c;
      // one-way pipe platform
      c = mk(16, 16); g = c.getContext('2d');
      R(g, '#222', 0, 0, 16, 8); R(g, th.pipe, 0, 1, 16, 6);
      R(g, '#ffffff88', 0, 1, 16, 2); R(g, '#00000044', 0, 5, 16, 2);
      R(g, '#222', 7, 0, 2, 8); R(g, '#ffc000', 7, 1, 2, 6);
      set.pipe = c;
      // spikes
      c = mk(16, 16); g = c.getContext('2d');
      for (let i = 0; i < 2; i++) {
        const x = i * 8;
        for (let y = 0; y < 8; y++) { const w = 1 + y; R(g, '#d8d8e8', x + 4 - Math.floor(w / 2), 8 + y, w, 1); }
        R(g, '#8a8a9a', x + 4, 12, 1, 4);
      }
      R(g, '#333', 0, 15, 16, 1);
      set.spike = c;
      // liquid frames
      set.liq = [0, 1].map(f => {
        const cc = mk(16, 16), gg = cc.getContext('2d');
        R(gg, th.liquid[0], 0, 0, 16, 16);
        R(gg, th.liquid[1], 0, 0, 16, 3);
        for (let x = 0; x < 16; x += 8) R(gg, '#ffffff77', x + (f ? 4 : 0), 1, 3, 1);
        R(gg, th.liquid[1], 3 + f * 6, 8, 5, 1);
        return cc;
      });
      tiles.push(set);
    });
  }

  // ---------- backgrounds ----------
  function buildBgs() {
    THEMES.forEach((th, ti) => {
      const r = rng(ti * 991 + 17);
      const sky = mk(SW, SH), sg = sky.getContext('2d');
      const grad = sg.createLinearGradient(0, 0, 0, SH);
      grad.addColorStop(0, th.sky[0]); grad.addColorStop(1, th.sky[1]);
      sg.fillStyle = grad; sg.fillRect(0, 0, SW, SH);
      // banded 8-bit sky
      for (let y = 0; y < SH; y += 8) if ((y / 8) % 2) R(sg, '#ffffff0c', 0, y, SW, 4);
      if (ti === 3) { for (let i = 0; i < 5; i++) R(sg, ['#40e090', '#40c0e0'][i % 2] + '44', 0, 20 + i * 14, SW, 8); }
      if (ti === 0 || ti === 2) { sg.fillStyle = '#fff4c0'; sg.beginPath(); sg.arc(190, 64, 18, 0, 7); sg.fill(); }
      if (ti === 5) { sg.fillStyle = '#ffd04080'; sg.beginPath(); sg.arc(128, 200, 70, 0, 7); sg.fill(); }
      const far = mk(512, SH), fg = far.getContext('2d');
      const mid = mk(512, SH), mg = mid.getContext('2d');
      const horizon = 176;
      if (ti === 0) { // offshore rigs and clouds
        for (let i = 0; i < 4; i++) { const x = i * 128 + 20; R(fg, th.far, x, 118, 40, 8); R(fg, th.far, x + 4, 126, 3, 50); R(fg, th.far, x + 32, 126, 3, 50); R(fg, th.far, x + 16, 60 + (i % 2) * 10, 3, 58); R(fg, th.far, x + 12, 84, 11, 2); R(fg, th.far, x + 8, 100, 19, 2); }
        for (let i = 0; i < 6; i++) { const x = r() * 480; R(mg, '#ffffffcc', x, 30 + r() * 60, 40 + r() * 30, 8); R(mg, '#ffffffcc', x + 8, 26, 22, 6); }
      } else if (ti === 1) { // storm waves
        for (let i = 0; i < 4; i++) { const x = i * 128 + 40; R(fg, th.far, x, 130, 30, 6); R(fg, th.far, x + 4, 136, 3, 40); R(fg, th.far, x + 22, 136, 3, 40); R(fg, th.far, x + 12, 100, 3, 30); }
        for (let i = 0; i < 8; i++) { const x = r() * 480; R(mg, '#1a2238', x, 20 + r() * 50, 60, 10); R(mg, '#1a2238', x + 10, 14 + r() * 4, 40, 8); }
        for (let i = 0; i < 40; i++) R(mg, '#c0d0ff55', r() * 512, r() * 200, 1, 6);
      } else if (ti === 2) { // jungle + flare stack
        for (let x = 0; x < 512; x += 16) R(fg, th.far, x, 130 + Math.sin(x * 0.03) * 14, 16, 60);
        R(fg, '#3a2a1a', 300, 70, 4, 110); fg.fillStyle = '#ffb020'; fg.beginPath(); fg.arc(302, 62, 7, 0, 7); fg.fill(); R(fg, '#ffe060', 300, 58, 4, 6);
        for (let i = 0; i < 6; i++) { const x = i * 86 + 10; R(mg, '#3a2a1a', x + 6, 120, 4, 60); R(mg, th.mid, x - 6, 112, 28, 6); R(mg, th.mid, x, 106, 16, 6); R(mg, th.mid, x - 10, 120, 12, 4); R(mg, th.mid, x + 14, 120, 12, 4); }
      } else if (ti === 3) { // ice peaks
        for (let i = 0; i < 5; i++) { const x = i * 100, h = 60 + r() * 40; for (let y = 0; y < h; y++) R(fg, y < 14 ? '#ffffff' : th.far, x + h / 1.2 - y / 1.2, 176 - h + y, y * 1.7, 1); }
        for (let i = 0; i < 4; i++) { const x = i * 140 + 30; for (let y = 0; y < 40; y++) R(mg, th.mid, x + 20 - y / 1.5, 176 - 40 + y, y * 1.3, 1); }
        for (let i = 0; i < 40; i++) R(mg, '#ffffffaa', r() * 512, r() * 200, 2, 2);
      } else if (ti === 4) { // refinery
        for (let i = 0; i < 6; i++) { const x = i * 86; R(fg, th.far, x, 90 - (i % 3) * 14, 16, 90); R(fg, th.far, x + 20, 120, 28, 60); R(fg, th.far, x + 26, 100, 16, 20); R(fg, '#ff8a2a', x + 6, 80 - (i % 3) * 14, 4, 8); }
        for (let i = 0; i < 5; i++) { const x = i * 110 + 8; R(mg, th.mid, x, 140, 50, 40); R(mg, '#ffc93388', x + 6, 148, 4, 4); R(mg, '#ffc93388', x + 20, 148, 4, 4); R(mg, th.mid, x + 10, 110, 6, 30); R(mg, th.mid, x + 34, 100, 6, 40); }
        for (let y = 40; y < 170; y += 24) R(mg, '#3a4a68', 0, y, 512, 4);
      } else { // wild well: fire peaks and a geyser of flame
        for (let i = 0; i < 6; i++) { const x = i * 90, h = 50 + r() * 50; for (let y = 0; y < h; y++) R(fg, th.far, x + 40 - y / 1.3, 176 - h + y, y * 1.5, 1); }
        for (let i = 0; i < 5; i++) { const x = i * 110 + 30; R(mg, '#ff6a10', x, 100, 8, 80); R(mg, '#ffc030', x + 2, 88, 4, 90); R(mg, '#ff6a10', x - 4, 150, 16, 30); }
        for (let i = 0; i < 30; i++) R(mg, '#ffb03088', r() * 512, r() * 180, 2, 2);
      }
      R(fg, ti === 0 || ti === 1 || ti === 3 ? th.liquid[0] : th.mid, 0, 176, 512, 64);
      bgs.push({ sky, far, mid });
    });
  }

  // ---------- items ----------
  function drawItem(g, it, t) {
    const x = Math.round(it.x), y = Math.round(it.y + (it.bob ? Math.sin(t * 0.08 + it.x) * 2 : 0));
    switch (it.kind) {
      case 'drop': R(g, '#000', x + 3, y, 2, 2); R(g, '#000', x + 2, y + 2, 4, 3); R(g, '#000', x + 1, y + 5, 6, 4); R(g, '#222', x + 2, y + 9, 4, 1); R(g, '#7a7aff', x + 2, y + 5, 1, 2); R(g, '#fff', x + 2, y + 6, 1, 1); break;
      case 'barrel': R(g, '#000', x, y + 1, 12, 14); R(g, '#d02828', x + 1, y + 2, 10, 12); R(g, '#ffc000', x + 1, y + 4, 10, 2); R(g, '#ffc000', x + 1, y + 10, 10, 2); R(g, '#ff8080', x + 2, y + 2, 2, 2); logo(g, x + 6, y + 8, 2.4); break;
      case 'oneup': g.drawImage(heads[it.ch], 0, 0, 16, 20, x - 1, y - 2, 12, 15); R(g, '#ffc000', x + 3, y + 12, 6, 3); text(g, '+', x + 3, y + 12, '#c01010', 'left', false); break;
      case 'scroll': R(g, '#000', x, y, 11, 13); R(g, '#f4e4b0', x + 1, y + 1, 9, 11); R(g, '#c8a860', x + 1, y + 1, 9, 2); R(g, '#c8a860', x + 1, y + 10, 9, 2); R(g, '#c01010', x + 3, y + 5, 5, 1); R(g, '#c01010', x + 3, y + 7, 5, 1); R(g, '#1f6f94', x + 4, y + 3, 3, 1); break;
      case 'pipesim': R(g, '#000', x - 1, y - 1, 14, 14); R(g, '#1f6f94', x, y, 12, 12); R(g, '#8fe3ff', x + 1, y + 1, 10, 2); R(g, '#fff', x + 2, y + 5, 2, 2); R(g, '#fff', x + 5, y + 5, 2, 2); R(g, '#fff', x + 8, y + 5, 2, 2); R(g, '#ffc000', x + 2, y + 9, 8, 1); break;
      case 'olga': { const f = Math.floor(t / 6) % 2; R(g, '#000', x - 1, y - 1, 14, 14); R(g, f ? '#ffc000' : '#ffe870', x, y, 12, 12); R(g, '#c01010', x + 5, y + 1, 2, 10); R(g, '#c01010', x + 1, y + 5, 10, 2); R(g, '#fff', x + 5, y + 5, 2, 2); break; }
      case 'frag': { const p = Math.sin(t * 0.1) * 2; R(g, '#000', x, y + p, 16, 18); R(g, '#ffc000', x + 1, y + 1 + p, 14, 16); R(g, '#fff4a0', x + 2, y + 2 + p, 3, 12); R(g, '#c88a00', x + 1, y + 5 + p, 14, 2); R(g, '#c88a00', x + 1, y + 12 + p, 14, 2); logo(g, x + 8, y + 9 + p, 3.4); if (Math.floor(t / 8) % 2) { R(g, '#fff', x - 4, y + 2, 3, 1); R(g, '#fff', x + 17, y + 12, 3, 1); R(g, '#fff', x + 8, y - 5, 1, 3); } break; }
    }
  }

  // ---------- enemies ----------
  function eyes(g, x, y, dir, c1) {
    R(g, '#fff', x, y, 4, 4); R(g, '#fff', x + 6, y, 4, 4);
    const o = dir > 0 ? 2 : 0;
    R(g, c1 || '#000', x + o, y + 1, 2, 3); R(g, c1 || '#000', x + 6 + o, y + 1, 2, 3);
  }
  function drawEnemy(g, e, t) {
    const x = Math.round(e.x), y = Math.round(e.y);
    g.save();
    if (e.hurt > 0 && Math.floor(e.hurt / 2) % 2) g.globalAlpha = 0.45;
    switch (e.type) {
      case 'hydrate': {
        const b = Math.floor(t / 10) % 2;
        R(g, '#0c4a80', x, y + 1, 14, 13); R(g, '#8fe3ff', x + 1, y + 2, 12, 11); R(g, '#e0faff', x + 2, y + 3, 5, 2); R(g, '#c0f0ff', x + 2, y + 5, 2, 2);
        R(g, '#4ab8e8', x + 1, y + 11, 12, 2);
        eyes(g, x + 2, y + 6, e.dir); R(g, '#0c4a80', x + 2, y + 5, 10, 1);
        R(g, '#0c4a80', x + 1 + b, y + 14 - 1, 4, 1); R(g, '#0c4a80', x + 9 - b, y + 13, 4, 1);
        break;
      }
      case 'wax': {
        const rows = [[4, 6], [2, 10], [1, 12], [0, 14], [0, 14], [0, 14], [0, 14], [0, 14], [0, 14], [1, 12]];
        rows.forEach((rw, i) => { R(g, '#a88a30', x + rw[0], y + i + 1, rw[1], 1); R(g, '#f4e8a8', x + rw[0] + 1, y + i + 1, Math.max(0, rw[1] - 2), 1); });
        R(g, '#a88a30', x + 2, y + 11, 3, 1); R(g, '#f4e8a8', x + 3, y + 11, 1, 2); R(g, '#f4e8a8', x + 9, y + 11, 2, 1);
        R(g, '#fff', x + 3, y + 2, 3, 2); eyes(g, x + 2, y + 5, e.dir, '#6a4a00');
        break;
      }
      case 'scale': {
        const b = Math.floor(t / 8) % 2;
        R(g, '#000', x + 1, y + 3, 14, 9); R(g, '#c97b3a', x + 2, y + 4, 12, 7); R(g, '#e8a060', x + 3, y + 4, 6, 2);
        for (let i = 0; i < 4; i++) { R(g, '#d8d8e8', x + 2 + i * 3, y + 1, 2, 3); R(g, '#8a8a9a', x + 2 + i * 3, y + 3, 2, 1); }
        R(g, '#d02828', x + 0, y + 6 - b, 3, 3); R(g, '#d02828', x + 13, y + 6 + b, 3, 3);
        eyes(g, x + 3, y + 5, e.dir, '#c01010');
        R(g, '#000', x + 3, y + 11, 2, 1 + b); R(g, '#000', x + 11, y + 11, 2, 2 - b);
        break;
      }
      case 'slug': {
        const s = Math.floor(t / 8) % 2, d = e.dir;
        R(g, '#0a5a4a', x, y + 2, 18, 8); R(g, '#5ad6b0', x + 1, y + 2, 16, 6); R(g, '#9af0d0', x + 3, y + 3, 6, 1);
        R(g, '#2a9a7a', x + 1, y + 8, 16, 2 - s);
        const hx = d > 0 ? x + 13 : x + 1;
        R(g, '#5ad6b0', hx, y, 2, 3); R(g, '#5ad6b0', hx + 2, y, 2, 3); R(g, '#000', hx, y, 2, 2); R(g, '#000', hx + 2, y, 2, 2);
        R(g, '#fff', hx + (d > 0 ? 1 : 0), y, 1, 1);
        break;
      }
      case 'tar': {
        if (e.hang) { R(g, '#1a1020', x + 5, e.hy, 2, y - e.hy + 2); }
        R(g, '#000', x, y + 2, 12, 10); R(g, '#1a1020', x + 1, y + 1, 10, 10); R(g, '#000', x + 3, y, 6, 2);
        R(g, '#6a3a9a', x + 2, y + 2, 3, 2); R(g, '#fff', x + 2, y + 3, 1, 1);
        R(g, '#ffe000', x + 3, y + 6, 2, 2); R(g, '#ffe000', x + 7, y + 6, 2, 2);
        const w = Math.floor(t / 10) % 2; R(g, '#000', x + 1 + w, y + 11, 3, 1); R(g, '#000', x + 8 - w, y + 11, 3, 1);
        break;
      }
      case 'bubble': {
        const f = Math.sin(t * 0.1) * 0.8;
        g.fillStyle = '#d8c8ff'; g.beginPath(); g.arc(x + 6, y + 6 + f, 6.5, 0, 7); g.fill();
        g.fillStyle = '#f4eeff'; g.beginPath(); g.arc(x + 6, y + 6 + f, 5, 0, 7); g.fill();
        R(g, '#fff', x + 2, y + 2, 2, 2); R(g, '#7a5ac0', x + 3, y + 5, 2, 3); R(g, '#7a5ac0', x + 7, y + 5, 2, 3);
        R(g, '#7a5ac0', x + 4, y + 9, 4, 1);
        break;
      }
      case 'turret': {
        R(g, '#000', x, y + 6, 16, 10); R(g, '#8a8a9a', x + 1, y + 7, 14, 8); R(g, '#c0c0d0', x + 1, y + 7, 14, 2);
        const a = t * 0.1;
        g.fillStyle = '#d03030'; g.beginPath(); g.arc(x + 8, y + 6, 6, 0, 7); g.fill();
        g.fillStyle = '#400'; g.beginPath(); g.arc(x + 8, y + 6, 4, 0, 7); g.fill();
        g.strokeStyle = '#ff8080'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 8 + Math.cos(a) * 5, y + 6 + Math.sin(a) * 5); g.lineTo(x + 8 - Math.cos(a) * 5, y + 6 - Math.sin(a) * 5); g.stroke();
        R(g, '#222', e.dir > 0 ? x + 12 : x, y + 5, 4, 3);
        if (e.charge > 0) R(g, '#ffe000', e.dir > 0 ? x + 14 : x, y + 5, 2, 3);
        break;
      }
      case 'fire': {
        const f = Math.floor(t / 4) % 2;
        R(g, '#c82808', x + 1, y + 6, 10, 8); R(g, '#ff6a10', x + 2, y + 4, 8, 9); R(g, '#ffc030', x + 3, y + 7, 6, 6);
        R(g, '#ff6a10', x + 5 + f, y, 2, 5); R(g, '#c82808', x + 1, y + 4 + f, 2, 3); R(g, '#c82808', x + 9, y + 3 + (1 - f), 2, 4);
        R(g, '#000', x + 3, y + 8, 2, 2); R(g, '#000', x + 7, y + 8, 2, 2);
        break;
      }
    }
    g.restore();
  }

  // ---------- projectiles ----------
  function drawShot(g, s, t) {
    const x = Math.round(s.x), y = Math.round(s.y);
    if (s.hostile) {
      if (s.kind === 'ice') { R(g, '#0c4a80', x, y, 6, 6); R(g, '#8fe3ff', x + 1, y + 1, 4, 4); R(g, '#fff', x + 1, y + 1, 2, 2); }
      else if (s.kind === 'wax') { R(g, '#a88a30', x, y, 8, 8); R(g, '#f4e8a8', x + 1, y + 1, 6, 6); R(g, '#fff', x + 2, y + 2, 2, 2); }
      else if (s.kind === 'tar') { R(g, '#000', x, y, 8, 8); R(g, '#3a2050', x + 1, y + 1, 6, 6); R(g, '#8a5ac0', x + 2, y + 2, 2, 2); }
      else if (s.kind === 'fire') { R(g, '#c82808', x, y, 8, 8); R(g, '#ffc030', x + 2, y + 2, 4, 4); }
      else if (s.kind === 'spike') { R(g, '#000', x, y, 4, 8); R(g, '#d8d8e8', x + 1, y + 1, 2, 6); }
      else if (s.kind === 'wave') { const w = s.w || 8; R(g, '#000', x, y, w, s.h); R(g, s.col || '#ffe070', x + 1, y + 1, w - 2, s.h - 2); }
      else if (s.kind === 'beam') { R(g, '#fff', x, y, s.w, s.h); R(g, '#ff3030', x, y + 1, s.w, s.h - 2); }
      else { R(g, '#000', x, y, 6, 6); R(g, '#ff4040', x + 1, y + 1, 4, 4); R(g, '#fff', x + 1, y + 1, 1, 1); }
      return;
    }
    R(g, '#0c3a80', x, y, 6, 6); R(g, '#8fe3ff', x + 1, y + 1, 4, 4); R(g, '#fff', x + 1, y + 1, 2, 2);
  }

  function init() {
    buildHeads();
    buildTiles();
    buildBgs();
  }

  return { init, text, bigText, logo, R, mk, rng, drawPlayer, drawItem, drawEnemy, drawShot, tiles, bgs, heads };
})();
