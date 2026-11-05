// Level definitions and the procedural level builder.
const T_EMPTY = 0, T_GROUND = 1, T_BLOCK = 2, T_PIPE = 3, T_SPIKE = 4, T_LIQUID = 8;
const ROWS = 15;

const ENEMY_BOX = {
  hydrate: [14, 14], wax: [14, 12], scale: [16, 12], slug: [18, 10], tar: [12, 12], bubble: [12, 12], turret: [16, 16], fire: [12, 14]
};

const LEVELS = [
  { theme: 0, song: 'w1', boss: 'hulk', bossName: 'HYDRATE HULK', enemies: ['hydrate', 'hydrate', 'bubble'], chunks: ['flat', 'smallGap', 'stairs', 'tower', 'upperPath', 'platformPit', 'gauntlet'],
    quest: 'QUEST 1: THE HYDRATE FREEZE',
    story: 'DR. DOWNTIME FROZE THE GULF OF MEXICO WITH HYDRATE PLUGS. THE TEAM MUST CLEAR THE LINE!',
    service: { title: 'WELL + PIPELINE SIMULATION', lines: ['STEADY STATE AND TRANSIENT', 'SIMULATION OF SUBSEA DESIGNS', 'PLUS CONTINUOUS OPS SUPPORT.'] } },
  { theme: 1, song: 'w2', boss: 'wyrm', bossName: 'WAXY WYRM', enemies: ['hydrate', 'wax', 'wax', 'bubble'], chunks: ['flat', 'smallGap', 'stairs', 'tower', 'upperPath', 'platformPit', 'gauntlet', 'spikes', 'mover'],
    quest: 'QUEST 2: THE WAX WAVE',
    story: 'THE NORTH SEA IS COLD AND WAX IS DEPOSITING EVERYWHERE. KEEP THE OIL FLOWING!',
    service: { title: 'FLUID + PVT MODELING', lines: ['THERMODYNAMIC MODELS FOR', 'HYDRATE, WAX, SCALE AND', 'ASPHALTENE RISK MITIGATION.'] } },
  { theme: 2, song: 'w3', boss: 'scorpion', bossName: 'SCALE SCORPION', enemies: ['scale', 'wax', 'scale', 'turret', 'bubble'], chunks: ['flat', 'smallGap', 'stairs', 'tower', 'upperPath', 'platformPit', 'gauntlet', 'spikes', 'mover', 'turretNest'],
    quest: 'QUEST 3: THE SCALE SCOURGE',
    story: 'OFF THE COAST OF WEST AFRICA, SCALE IS CRUSTING THE FPSO. INJECT CHEMICALS AND FIGHT BACK!',
    service: { title: 'CHEMICAL INJECTION STRATEGY', lines: ['FROM EARLY DESIGN AND SIZING', 'TO OPTIMIZATION IN PRODUCING', 'FIELDS. LESS RISK, MORE FLOW.'] } },
  { theme: 3, song: 'w4', boss: 'slugking', bossName: 'SLUG KING', enemies: ['slug', 'hydrate', 'slug', 'bubble', 'scale'], chunks: ['flat', 'smallGap', 'stairs', 'tower', 'upperPath', 'platformPit', 'gauntlet', 'spikes', 'mover'],
    quest: 'QUEST 4: THE SLUG STAMPEDE',
    story: 'ARCTIC TERRAIN SLUGGING! THE BARENTS SEA PIPELINE IS SURGING. RIDE THE SLUGS OUT!',
    service: { title: 'LIFE OF FIELD SIMULATION', lines: ['INTEGRATE YOUR RESERVOIR', 'MODEL. PIPESIM-POWERED CORE', 'WITH OLGA TRANSIENTS.'] } },
  { theme: 4, song: 'w5', boss: 'golem', bossName: 'ASPHALTENE GOLEM', enemies: ['tar', 'scale', 'turret', 'slug', 'tar'], chunks: ['flat', 'smallGap', 'stairs', 'tower', 'upperPath', 'platformPit', 'gauntlet', 'spikes', 'mover', 'turretNest', 'ceilingTar'],
    quest: 'QUEST 5: THE TAR TERROR',
    story: 'THE TOPSIDES PLANT IS CLOGGING WITH ASPHALTENE. SIMULATE, SCRUB AND SHUT IT DOWN!',
    service: { title: 'TOPSIDES + PROCESS SIMULATION', lines: ['TRANSIENT PROCESS MODELS,', 'INTEGRATED RESERVOIR TO', 'REFINERY. ALL IN ONE FLOW.'] } },
  { theme: 5, song: 'w6', boss: 'doctor', bossName: 'DR. DOWNTIME', enemies: ['fire', 'tar', 'slug', 'turret', 'fire'], chunks: ['flat', 'smallGap', 'stairs', 'tower', 'upperPath', 'platformPit', 'gauntlet', 'spikes', 'mover', 'turretNest', 'ceilingTar'],
    quest: 'FINAL QUEST: THE WILD WELL',
    story: 'THE WELL HAS BLOWN! DR. DOWNTIME IS AT THE WELLHEAD. WELL CONTROL TIME, TEAM!',
    service: { title: 'WELL CONTROL + REAL-TIME', lines: ['20+ YEARS MODELING BLOWOUTS,', 'RELIEF WELLS AND KILL JOBS.', 'HYDRAULIC CONTROL SYSTEMS TOO.'] } }
];

const SLOGANS = [
  ['SINCE 2001', '150+ FIELDS', 'AND COUNTING!'],
  ['20+ CLIENTS', 'WORLDWIDE'],
  ['25 YEARS AVG', 'EXPERIENCE'],
  ['FLOW ASSURANCE', 'SPECIALISTS'],
  ['SIMULATION', 'TECHNOLOGY'],
  ['NO SLUGS.', 'NO PLUGS.', 'JUST FLOW.'],
  ['GEIR: 37 YRS', 'FLOW ASSURANCE'],
  ['PIPESIM  OLGA', 'PVTSIM  & MORE'],
  ['HYDRATES? WAX?', 'SCALE? WE GOT', 'THIS.'],
  ['LIFE OF FIELD', 'SUPPORT'],
  ['GOT FLOW?', 'PETROFLOW!'],
  ['REAL-TIME OPS', 'SUPPORT 20+ YRS'],
  ['MACK: LED', 'PIPESIM 10+ YRS'],
  ['ZACH: DIGITAL', 'TWIN WIZARD'],
  ['CONTACTUS@', 'PETROFLOW.COM'],
  ['PETROFLOW.COM', 'GET IN TOUCH!']
];

function buildLevel(li) {
  const L = LEVELS[li];
  const rnd = Art.rng(4242 + li * 131);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = a => a[Math.floor(rnd() * a.length)];
  const MAXC = 760;
  const tiles = new Uint8Array(MAXC * ROWS);
  const ents = [];
  const set = (c, r, t) => { if (c >= 0 && c < MAXC && r >= 0 && r < ROWS) tiles[r * MAXC + c] = t; };
  let col = 0, g = 12, signIdx = li * 3;
  const diff = li / 5;
  const target = 342 + li * 6;

  const ground = (c, gr) => { for (let r = gr; r < ROWS; r++) set(c, r, T_GROUND); };
  const flat = n => { const s = col; for (let i = 0; i < n; i++) ground(col++, g); return s; };
  const gap = n => { for (let i = 0; i < n; i++) { set(col, 13, T_LIQUID); set(col, 14, T_LIQUID); col++; } };
  const enemy = (type, c, gr, extra) => {
    const [w, h] = ENEMY_BOX[type];
    const e = { k: 'enemy', type, x: c * 16 + (16 - w) / 2, y: gr * 16 - h };
    if (type === 'bubble') e.y = (gr - 3 - ri(0, 2)) * 16;
    ents.push(Object.assign(e, extra || {}));
  };
  const item = (kind, x, y, extra) => ents.push(Object.assign({ k: 'item', kind, x, y }, extra || {}));
  const coins = (c, r, n) => { for (let i = 0; i < n; i++) item('drop', (c + i) * 16 + 4, r * 16 + 3); };
  const arc = (c, n, r) => { for (let i = 0; i < n; i++) item('drop', (c + i) * 16 + 4, (r - Math.round(Math.sin((i + 0.5) / n * Math.PI) * 2)) * 16 + 3); };
  const maxEn = () => Math.min(1 + Math.floor(diff * 3) + ri(0, 1), 4);
  const spawnGround = (c0, n, gr, w) => { for (let i = 0; i < n; i++) enemy(pick(L.enemies), Math.max(c0 + 2, Math.min(c0 + w - 2, c0 + 1 + Math.floor((i + 0.5) * (w - 2) / n) + ri(-1, 1))), gr); };
  const sign = (c, gr, lines, kind) => ents.push({ k: 'sign', x: c * 16, y: gr * 16, lines, kind: kind || 'sign' });
  const stairsTo = (target_g) => { while (g !== target_g) { g += g > target_g ? -1 : 1; flat(2); } };

  const R = {
    flat() { const n = ri(9, 15), s = flat(n); spawnGround(s, ri(1, maxEn()), g, n); coins(s + 2, g - 2, ri(3, 6)); },
    smallGap() { const s = flat(3); const gw = ri(2, 3); const c0 = col; gap(gw); arc(c0 - 1, gw + 2, g - 2); const e = flat(4); if (rnd() < 0.5) enemy(pick(L.enemies), e + 1, g); },
    stairs() {
      const up = g > 11 && (rnd() < 0.6 || g > 12);
      const steps = ri(2, 3);
      for (let i = 0; i < steps; i++) { if (g > 10 && up) g--; else if (g < 13 && !up) g++; flat(2); }
      const w = ri(5, 8), s = flat(w); spawnGround(s, 1, g, w); coins(s, g - 2, 4);
      if (g < 12 && rnd() < 0.8) stairsTo(12); else if (g > 12) stairsTo(12);
    },
    tower() { const s = flat(ri(3, 4)); const h = ri(2, 3); const c0 = col; for (let i = 0; i < 2; i++) { ground(col, g); for (let k = 1; k <= h; k++) set(col, g - k, T_BLOCK); col++; } coins(c0, g - h - 2, 2); const w = ri(5, 7), e = flat(w); spawnGround(e, 1, g, w); },
    upperPath() {
      const w = ri(12, 14), s = flat(w);
      const r1 = g - 2, r2 = g - 3;
      for (let i = 0; i < 3; i++) set(s + 2 + i, r1, T_PIPE);
      for (let i = 0; i < 3; i++) set(s + 6 + i, r2, T_PIPE);
      coins(s + 2, r1 - 1, 3); coins(s + 6, r2 - 1, 3);
      if (rnd() < 0.35) item('barrel', (s + 7) * 16 + 2, (r2 - 2) * 16);
      spawnGround(s, ri(1, 2), g, w);
    },
    platformPit() {
      flat(3);
      const n = ri(6, 8), c0 = col; gap(n);
      for (let p = 0; p < 2; p++) { const pc = c0 + 1 + p * 3 + (n > 6 && p === 1 ? 1 : 0); for (let i = 0; i < 2; i++) set(pc + i, g - 1 - (p % 2), T_PIPE); coins(pc, g - 3 - (p % 2), 2); }
      if (n > 7) { for (let i = 0; i < 2; i++) set(c0 + 6 + i, g - 1, T_PIPE); }
      flat(4);
    },
    gauntlet() { const w = ri(15, 18), s = flat(w); set(s + 5, g - 1, T_BLOCK); set(s + 11, g - 1, T_BLOCK); set(s + 11, g - 2, T_BLOCK); spawnGround(s, Math.min(4, 2 + Math.floor(diff * 3)), g, w); coins(s + 3, g - 3, 3); },
    spikes() { const s = flat(3); const n = ri(2, 3), c0 = col; for (let i = 0; i < n; i++) { ground(col, g); set(col, g - 1, T_SPIKE); col++; } arc(c0 - 1, n + 2, g - 2); flat(4); },
    mover() { flat(3); const n = 8, c0 = col; gap(n); ents.push({ k: 'mp', x: c0 * 16 - 16, y: g * 16, min: c0 * 16 - 16, max: (c0 + n) * 16 - 16, vx: 0.6 }); coins(c0 + 2, g - 2, 4); flat(4); },
    turretNest() { const s = flat(10); const c0 = s + 7; set(c0, g - 1, T_BLOCK); set(c0 + 1, g - 1, T_BLOCK); enemy('turret', c0, g - 1, { dir: -1 }); coins(s + 1, g - 2, 4); },
    ceilingTar() { const s = flat(12); for (let i = 0; i < 2; i++) enemy('tar', s + 3 + i * 5, 3, { hang: true, hy: 16 }); coins(s + 2, g - 2, 5); },
    secret() {
      const s = flat(13);
      const rs = [g - 2, g - 4, g - 6];
      rs.forEach((r, i) => { for (let k = 0; k < 2; k++) set(s + 2 + i * 3 + k, r, T_PIPE); });
      item('scroll', (s + 2 + 6) * 16 + 10, (rs[2] - 1) * 16 + 1, { bob: true, quest: true });
      spawnGround(s, 1, g, 13);
    }
  };

  // opening safe zone
  flat(14);
  coins(4, g - 2, 5);
  ents.push({ k: 'sign', x: 8 * 16, y: g * 16, lines: ['WORLD ' + (li + 1), THEMES[L.theme].name], kind: 'sign' });
  let chunks = 0, cps = 0, secrets = 0;
  const cpAt = [0.15, 0.3, 0.45, 0.6, 0.75];
  const secretAt = [0.18, 0.45, 0.72];
  while (col < target) {
    const prog = col / target;
    if (g !== 12 && rnd() < 0.5) stairsTo(12);
    if (cps < cpAt.length && prog > cpAt[cps]) {
      stairsTo(12);
      const s = flat(12);
      ents.push({ k: 'check', x: (s + 4) * 16, y: g * 16 });
      if (cps === 2) item('barrel', (s + 9) * 16 + 2, (g - 3) * 16);
      cps++;
      continue;
    }
    if (secrets < 3 && prog > secretAt[secrets]) { stairsTo(12); R.secret(); secrets++; continue; }
    if (chunks % 4 === 3) { const s = flat(ri(7, 9)); sign(s + 2, g, SLOGANS[(signIdx++) % SLOGANS.length]); }
    const name = pick(L.chunks);
    if ((name === 'upperPath' || name === 'stairs') && g !== 12) stairsTo(12);
    R[name]();
    chunks++;
    if (rnd() < 0.13) { const s = col - 3; item(pick(['pipesim', 'pipesim', 'olga']), s * 16 + 2, (g - 3) * 16, { bob: true }); }
    if (rnd() < 0.05) item('oneup', (col - 4) * 16 + 2, (g - 4) * 16, { bob: true });
    if (rnd() < 0.1) item('barrel', (col - 5) * 16 + 2, (g - 2) * 16, { bob: true });
  }
  stairsTo(12);
  const pre = flat(8);
  sign(pre + 2, g, ['WARNING!', L.bossName, 'AHEAD']);
  const arenaCol = col;
  flat(16);
  for (let k = 0; k < 2; k++) for (let r = 0; r < ROWS; r++) set(col + k, r, T_GROUND);
  col += 2;
  const cols = col;
  return { li, theme: L.theme, cols, tiles, maxc: MAXC, ents, startX: 3 * 16, startY: 12 * 16 - 26, arenaCol, bossType: L.boss, secretsTotal: 3 };
}
