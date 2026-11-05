// Boss fights: one state machine per boss, plus their drawings.
const BOSS_DEFS = {
  hulk: { w: 32, h: 32, hp: 30, name: 'HYDRATE HULK', fly: false },
  wyrm: { w: 36, h: 24, hp: 38, name: 'WAXY WYRM', fly: true },
  scorpion: { w: 40, h: 22, hp: 45, name: 'SCALE SCORPION', fly: false, spiky: true },
  slugking: { w: 40, h: 24, hp: 53, name: 'SLUG KING', fly: false },
  golem: { w: 40, h: 40, hp: 60, name: 'ASPHALTENE GOLEM', fly: false, spiky: true },
  doctor: { w: 30, h: 34, hp: 83, name: 'DR. DOWNTIME', fly: true }
};
const FLOOR_Y = 12 * 16;
const AL = () => lv.arenaCol * 16;

function newBoss(type) {
  const d = BOSS_DEFS[type];
  return { type, w: d.w, h: d.h, hp: d.hp, max: d.hp, name: d.name, fly: d.fly, spiky: !!d.spiky, x: AL() + 170, y: -70, vx: 0, vy: 0, dir: -1, state: type === 'doctor' ? 'hover' : (type === 'wyrm' ? 'fly' : (type === 'hulk' ? 'walk' : (type === 'scorpion' ? 'stalk' : (type === 'slugking' ? 'ooze' : 'walk')))), t: 0, inv: 0, hurt: 0, cyc: 0, onGround: false, dead: false, dt: 0, armor: false };
}

function bGround(b) {
  b.vy += GRAV; b.y += b.vy;
  if (b.y + b.h >= FLOOR_Y) { b.y = FLOOR_Y - b.h; b.vy = 0; b.onGround = true; } else b.onGround = false;
}
const bToward = b => (pl.x + 6 > b.x + b.w / 2 ? 1 : -1);
function eshot(o) { eshots.push(Object.assign({ hostile: true, w: 6, h: 6, vx: 0, vy: 0, grav: 0, life: 240 }, o)); }
function groundWaves(b, w, h, speed, col) {
  Sound.sfx('slam'); shakeT = 18;
  for (const d of [-1, 1]) eshot({ kind: 'wave', x: b.x + b.w / 2 - w / 2, y: FLOOR_Y - h, w, h, vx: d * speed, life: 150, col, noTile: true });
}
function bossHit(n) {
  const b = boss;
  if (!b || b.dead || arena !== 2 || b.inv > 0) return false;
  if (b.armor) { Sound.sfx('hit'); return true; }
  b.hp -= n; b.inv = 6; b.hurt = 10;
  Sound.sfx('bosshit'); puff(b.x + b.w / 2, b.y + b.h / 2, '#ffffff', 5, 2);
  if (b.hp <= 0) {
    b.dead = true; b.dt = 0; arena = 3; Sound.stop();
    eshots.length = 0; enemies = enemies.filter(e => !e.fromBoss);
    G.score += 5000;
  }
  return true;
}

function aiHulk(b) {
  const to = bToward(b);
  b.t++;
  if (b.state === 'walk') {
    b.dir = to; b.x += b.dir * 0.7; bGround(b);
    if (b.t > 80) { b.state = b.cyc++ % 2 === 0 ? 'volley' : 'jump'; b.t = 0; }
  } else if (b.state === 'volley') {
    bGround(b); b.dir = to;
    if (b.t === 20) { Sound.sfx('spit'); for (let i = 0; i < 3; i++) eshot({ kind: 'ice', x: b.x + b.w / 2 - 3, y: b.y + 6, vx: to * (0.8 + i * 0.7), vy: -3 - i * 0.5, grav: 0.12 }); }
    if (b.t > 50) { b.state = 'walk'; b.t = 0; }
  } else if (b.state === 'jump') {
    if (b.t === 1) { b.vy = -6.8; b.vx = to * 1.5; }
    b.x += b.vx; bGround(b);
    if (b.t > 5 && b.onGround) { b.vx = 0; groundWaves(b, 8, 8, 1.6, '#8fe3ff'); b.state = 'walk'; b.t = -10; }
  }
}

function aiWyrm(b) {
  b.t++;
  const L = AL(), R = L + 256 - b.w;
  if (b.state === 'fly') {
    if (!b.vx) b.vx = 1.1 * (Math.random() < 0.5 ? 1 : -1);
    b.x += b.vx; if (b.x < L + 10 || b.x > R - 10) b.vx *= -1;
    b.y = 78 + Math.sin(b.t * 0.07) * 14; b.dir = Math.sign(b.vx);
    if (b.t % 80 === 0) { Sound.sfx('spit'); eshot({ kind: 'wax', w: 8, h: 8, x: b.x + b.w / 2 - 4, y: b.y + b.h, vx: Math.max(-1.5, Math.min(1.5, (pl.x - b.x) / 70)), vy: 0.5, grav: 0.12, life: 200 }); }
    if (b.t >= 330) { b.state = 'wind'; b.t = 0; }
  } else if (b.state === 'wind') {
    b.x += Math.sin(b.t) * 1.2;
    if (b.t > 35) { b.state = 'dive'; b.t = 0; b.dir = b.x + b.w / 2 < L + 128 ? 1 : -1; b.vx = b.dir * 2.7; }
  } else if (b.state === 'dive') {
    b.x += b.vx; b.y += (FLOOR_Y - b.h - 4 - b.y) * 0.12;
    if (b.x <= L + 4 || b.x >= R - 4) { b.state = 'rise'; b.t = 0; b.vx = 0; }
  } else if (b.state === 'rise') {
    b.y -= 2;
    if (b.y <= 78) { b.state = 'fly'; b.t = 0; b.vx = 1.1 * (b.x > L + 128 ? -1 : 1); }
  }
}

function aiScorpion(b) {
  const L = AL(), R = L + 256 - b.w;
  b.t++;
  if (b.state === 'stalk') {
    b.dir = bToward(b); b.x += b.dir * 0.45; bGround(b); b.armor = false;
    if (b.t > 90) { b.state = 'wind'; b.t = 0; }
  } else if (b.state === 'wind') {
    bGround(b); b.armor = true;
    if (b.t > 30) { b.state = 'charge'; b.t = 0; b.vx = b.dir * 2.3; }
  } else if (b.state === 'charge') {
    b.x += b.vx; bGround(b); b.armor = true;
    if (b.x <= L + 3 || b.x >= R - 3) {
      b.state = 'stun'; b.t = 0; b.vx = 0; b.armor = false; shakeT = 14; Sound.sfx('slam');
      for (let i = 0; i < 4; i++) eshot({ kind: 'spike', w: 4, h: 8, x: L + 20 + Math.random() * 216, y: -8 - i * 14, vy: 1.4 + Math.random() * 0.6, grav: 0.02 });
    }
  } else if (b.state === 'stun') {
    bGround(b);
    if (b.t > 55) { b.state = 'stalk'; b.t = 0; }
  }
}

function aiSlugKing(b) {
  const L = AL(), R = L + 256 - b.w;
  const to = bToward(b);
  b.t++;
  if (b.state === 'ooze') {
    b.dir = to; b.x += b.dir * 0.5; bGround(b);
    if (b.t > 70) { b.state = b.cyc++ % 2 === 0 ? 'wind' : 'hop'; b.t = 0; }
  } else if (b.state === 'wind') {
    bGround(b); b.x += Math.sin(b.t * 2) * 0.8;
    if (b.t > 28) { b.state = 'surge'; b.t = 0; b.vx = b.dir * 2.4; }
  } else if (b.state === 'surge') {
    b.x += b.vx; bGround(b);
    if (b.x <= L + 3 || b.x >= R - 3) {
      b.state = 'stun'; b.t = 0; b.vx = 0; shakeT = 12; Sound.sfx('slam');
      const alive = enemies.filter(e => e.fromBoss && !e.dead).length;
      for (let i = 0; i < 2 && alive + i < 3; i++) spawnEnemy('slug', b.x + (b.x < L + 100 ? 44 : -26) + i * 14 * (b.x < L + 100 ? 1 : -1), FLOOR_Y - 10, { fromBoss: true, dir: b.x < L + 100 ? 1 : -1 });
    }
  } else if (b.state === 'stun') {
    bGround(b);
    if (b.t > 45) { b.state = 'ooze'; b.t = 0; }
  } else if (b.state === 'hop') {
    if (b.t === 1) { b.vy = -6.6; b.vx = to * 1.8; }
    b.x += b.vx; bGround(b);
    if (b.t > 5 && b.onGround) { b.vx = 0; groundWaves(b, 10, 6, 1.5, '#5ad6b0'); b.state = 'ooze'; b.t = -10; }
  }
}

function aiGolem(b) {
  b.t++;
  if (b.state === 'walk') {
    b.dir = bToward(b); b.x += b.dir * 0.4; bGround(b);
    if (b.t > 90) { b.state = b.cyc++ % 3 === 1 ? 'spit' : 'slam'; b.t = 0; }
  } else if (b.state === 'slam') {
    bGround(b);
    if (b.t === 30) groundWaves(b, 12, 12, 1.8, '#8a5ac0');
    if (b.t > 62) { b.state = 'walk'; b.t = 0; }
  } else if (b.state === 'spit') {
    bGround(b); b.dir = bToward(b);
    if (b.t === 10 || b.t === 25 || b.t === 40) {
      Sound.sfx('spit');
      const tx = AL() + 30 + Math.random() * 196;
      eshot({ kind: 'tar', w: 8, h: 8, x: b.x + b.w / 2 - 4, y: b.y + 6, vx: (tx - (b.x + b.w / 2)) / 62, vy: -4.4, grav: 0.14, life: 120 });
    }
    if (b.t > 65) { b.state = 'walk'; b.t = 0; }
  }
}

function aiDoctor(b) {
  const L = AL();
  const phase = b.hp > b.max * 0.66 ? 1 : b.hp > b.max * 0.33 ? 2 : 3;
  b.phase = phase;
  b.t++;
  if (b.state === 'hover') {
    const tx = L + 128 - b.w / 2 + Math.sin(b.t * 0.025) * 95;
    b.x += (tx - b.x) * 0.05;
    b.y += (84 + Math.sin(b.t * 0.05) * 10 - b.y) * 0.1;
    b.dir = bToward(b);
    const iv = phase === 3 ? 48 : 72;
    if (b.t % iv === 0) {
      Sound.sfx('spit');
      for (let i = 0; i < 3; i++) eshot({ kind: 'fire', w: 8, h: 8, x: b.x + b.w / 2 - 4, y: b.y + b.h - 4, vx: (i - 1) * (0.7 + 0.12 * phase), vy: 1.6, life: 200 });
    }
    if (phase >= 2 && b.t % 260 === 200) { b.state = 'telegraph'; b.t = 0; }
    if (phase === 3 && b.t % 400 === 350) { b.state = 'laser'; b.t = 0; }
    if (phase >= 2 && b.t % 300 === 120) {
      const alive = enemies.filter(e => e.fromBoss && !e.dead).length;
      if (alive < 2) { spawnEnemy('tar', L + 30 + Math.random() * 196, 20, { fromBoss: true, hang: false }); Sound.sfx('spit'); }
    }
  } else if (b.state === 'telegraph') {
    b.x += (L + (b.x < L + 128 ? 20 : 200) - b.x) * 0.02;
    if (b.t > 45) { b.state = 'dash'; b.t = 0; b.dir = b.x + b.w / 2 < L + 128 ? 1 : -1; b.vx = b.dir * 3.1; }
  } else if (b.state === 'dash') {
    b.x += b.vx; b.y += (FLOOR_Y - b.h - 2 - b.y) * 0.2;
    if (b.x <= L + 3 || b.x >= L + 256 - b.w - 3) { b.state = 'rise'; b.t = 0; b.vx = 0; shakeT = 10; Sound.sfx('slam'); }
  } else if (b.state === 'rise') {
    b.y -= 2.2;
    if (b.y <= 84) { b.state = 'hover'; b.t = 1; }
  } else if (b.state === 'laser') {
    b.y += (72 - b.y) * 0.1;
    if (b.t === 50) { Sound.sfx('boom'); eshot({ kind: 'beam', x: L, y: FLOOR_Y - 8, w: 256, h: 6, life: 38, noTile: true, still: true }); }
    if (b.t > 100) { b.state = 'hover'; b.t = 1; }
  }
}

const BOSS_AI = { hulk: aiHulk, wyrm: aiWyrm, scorpion: aiScorpion, slugking: aiSlugKing, golem: aiGolem, doctor: aiDoctor };

function bossUpdate() {
  const b = boss;
  if (!b) return;
  if (b.dead) {
    b.dt++;
    if (b.dt % 5 === 0) puff(b.x + Math.random() * b.w, b.y + Math.random() * b.h, ['#ffc000', '#ff6a10', '#fff'][b.dt % 3], 6, 2.5);
    if (b.dt % 22 === 0) { Sound.sfx('boom'); shakeT = 10; }
    if (b.dt === 120) {
      puff(b.x + b.w / 2, b.y + b.h / 2, '#fff', 30, 4);
      items.push({ k: 'item', kind: 'frag', x: AL() + 120, y: FLOOR_Y - 42, w: 16, h: 18 });
      boss = null;
    }
    return;
  }
  if (arena === 1) {
    if (b.fly) { b.y += (80 - b.y) * 0.06; } else bGround(b);
    return;
  }
  if (b.inv > 0) b.inv--;
  if (b.hurt > 0) b.hurt--;
  BOSS_AI[b.type](b);
  const L = AL();
  b.x = Math.max(L + 2, Math.min(L + 256 - b.w - 2, b.x));
}

// ---------- drawing ----------
function drawBoss(g, b, t) {
  const R = Art.R;
  let x = Math.round(b.x);
  const y = Math.round(b.y);
  g.save();
  if (b.hurt > 0 && Math.floor(b.hurt / 2) % 2) g.globalAlpha = 0.5;
  if (b.dead && Math.floor(b.dt / 3) % 2) g.globalAlpha = 0.6;
  const flash = (b.state === 'wind' || b.state === 'telegraph') && Math.floor(t / 4) % 2;
  const d = b.dir || -1;
  switch (b.type) {
    case 'hulk': {
      R(g, '#0c4a80', x, y + 4, 32, 28); R(g, flash ? '#fff' : '#8fe3ff', x + 2, y + 6, 28, 24); R(g, '#e0faff', x + 4, y + 8, 10, 4); R(g, '#c0f0ff', x + 4, y + 12, 4, 8);
      R(g, '#4ab8e8', x + 2, y + 24, 28, 6);
      for (let i = 0; i < 5; i++) { R(g, '#0c4a80', x + 2 + i * 6, y - (i % 2 ? 0 : 3) + 1, 4, 6); R(g, '#bff0ff', x + 3 + i * 6, y - (i % 2 ? 0 : 3) + 2, 2, 5); }
      R(g, '#0c4a80', x + 5, y + 12, 22, 2);
      R(g, '#fff', x + 7, y + 14, 6, 5); R(g, '#fff', x + 19, y + 14, 6, 5);
      R(g, '#ff2020', x + 8 + (d > 0 ? 3 : 0), y + 15, 3, 4); R(g, '#ff2020', x + 20 + (d > 0 ? 3 : 0), y + 15, 3, 4);
      for (let i = 0; i < 6; i++) R(g, '#fff', x + 8 + i * 3, y + 24, 2, 3 + (i % 2));
      R(g, '#0c4a80', x - 4, y + 14, 6, 12); R(g, '#8fe3ff', x - 3, y + 15, 4, 10); R(g, '#0c4a80', x + 30, y + 14, 6, 12); R(g, '#8fe3ff', x + 31, y + 15, 4, 10);
      break;
    }
    case 'wyrm': {
      for (let i = 4; i >= 1; i--) { const bx = x - d * i * 13 + 6, by = y + 6 + Math.sin(t * 0.12 + i) * 4; g.fillStyle = '#a88a30'; g.beginPath(); g.arc(bx + 6, by + 6, 8 - i, 0, 7); g.fill(); g.fillStyle = '#f4e8a8'; g.beginPath(); g.arc(bx + 6, by + 6, 6.5 - i, 0, 7); g.fill(); }
      g.fillStyle = '#a88a30'; g.beginPath(); g.arc(x + 18, y + 12, 14, 0, 7); g.fill();
      g.fillStyle = flash ? '#fff' : '#f4e8a8'; g.beginPath(); g.arc(x + 18, y + 12, 12, 0, 7); g.fill();
      R(g, '#fff', x + 8, y + 5, 6, 3);
      R(g, '#a88a30', x + 6, y - 4, 4, 8); R(g, '#a88a30', x + 26, y - 4, 4, 8);
      R(g, '#fff', x + 9, y + 10, 7, 6); R(g, '#fff', x + 21, y + 10, 7, 6);
      R(g, '#ff2020', x + 11 + (d > 0 ? 2 : 0), y + 11, 3, 4); R(g, '#ff2020', x + 23 + (d > 0 ? 2 : 0), y + 11, 3, 4);
      R(g, '#6a4a00', x + 8, y + 9, 8, 1); R(g, '#6a4a00', x + 21, y + 9, 8, 1);
      for (let i = 0; i < 5; i++) R(g, '#fff', x + 10 + i * 4, y + 20, 2, 3);
      R(g, '#f4e8a8', x + 12, y + 24, 3, 5 + Math.floor(t / 8) % 2 * 2);
      break;
    }
    case 'scorpion': {
      const sh = b.state === 'wind' ? Math.sin(t * 2) : 0;
      x += Math.round(sh);
      R(g, '#000', x + 4, y + 4, 32, 18); R(g, flash ? '#fff' : '#c97b3a', x + 5, y + 5, 30, 14); R(g, '#e8a060', x + 7, y + 6, 14, 3);
      R(g, '#5a3a1a', x + 5, y + 14, 30, 4);
      for (let i = 0; i < 6; i++) { R(g, '#d8d8e8', x + 6 + i * 5, y + 1, 3, 5); R(g, '#8a8a9a', x + 6 + i * 5, y + 4, 3, 1); }
      const fx = d > 0 ? x + 32 : x - 4;
      R(g, '#000', fx, y + 5, 12, 12); R(g, '#d02828', fx + 1, y + 6, 10, 10); R(g, '#000', fx + (d > 0 ? 6 : 0), y + 9, 6, 3);
      // tail
      const tx = d > 0 ? x + 4 : x + 30;
      for (let i = 0; i < 5; i++) { R(g, '#000', tx - d * i * 2 - 1, y - i * 4 + 1, 8, 6); R(g, '#c97b3a', tx - d * i * 2, y - i * 4 + 2, 6, 4); }
      R(g, '#ff4040', tx - d * 10 + (d > 0 ? 4 : 0), y - 21, 3, 5);
      R(g, '#fff', x + 14, y + 8, 5, 4); R(g, '#fff', x + 22, y + 8, 5, 4); R(g, '#c01010', x + 15 + (d > 0 ? 2 : 0), y + 9, 2, 3); R(g, '#c01010', x + 23 + (d > 0 ? 2 : 0), y + 9, 2, 3);
      for (let i = 0; i < 4; i++) R(g, '#000', x + 6 + i * 9, y + 19, 3, 3 + (Math.floor(t / 6 + i) % 2));
      break;
    }
    case 'slugking': {
      R(g, '#0a5a4a', x, y + 4, 40, 20); R(g, flash ? '#fff' : '#5ad6b0', x + 1, y + 5, 38, 16); R(g, '#9af0d0', x + 4, y + 6, 14, 3); R(g, '#2a9a7a', x + 1, y + 18, 38, 5);
      const hx = d > 0 ? x + 28 : x + 2;
      R(g, '#5ad6b0', hx, y, 4, 8); R(g, '#5ad6b0', hx + 6, y, 4, 8); R(g, '#fff', hx - 1, y - 3, 6, 5); R(g, '#fff', hx + 5, y - 3, 6, 5); R(g, '#c01010', hx + (d > 0 ? 2 : 0), y - 2, 2, 3); R(g, '#c01010', hx + 6 + (d > 0 ? 2 : 0), y - 2, 2, 3);
      R(g, '#000', x + 14, y + 12, 12, 2);
      R(g, '#000', x + 12, y - 4, 16, 6); R(g, '#ffc000', x + 13, y - 3, 14, 4); for (let i = 0; i < 3; i++) R(g, '#ffc000', x + 13 + i * 6, y - 7, 3, 4);
      R(g, '#3ab890', x + (d > 0 ? -8 : 40), y + 18, 8, 5);
      break;
    }
    case 'golem': {
      R(g, '#000', x + 2, y + 6, 36, 34); R(g, flash ? '#fff' : '#1a1020', x + 3, y + 7, 34, 32); R(g, '#000', x + 8, y, 24, 10); R(g, '#1a1020', x + 9, y + 1, 22, 8);
      R(g, '#6a3a9a', x + 6, y + 9, 8, 3); R(g, '#3a2050', x + 10, y + 14, 16, 3); R(g, '#fff', x + 8, y + 10, 1, 1);
      R(g, '#ffe000', x + 10, y + 12, 6, 6); R(g, '#ffe000', x + 24, y + 12, 6, 6); R(g, '#c01010', x + 12 + (d > 0 ? 2 : 0), y + 14, 2, 3); R(g, '#c01010', x + 26 + (d > 0 ? 2 : 0), y + 14, 2, 3);
      for (let i = 0; i < 6; i++) R(g, '#ffe000', x + 10 + i * 4, y + 24, 2, 3);
      const up = b.state === 'slam' && b.t < 30 ? -10 : 0;
      R(g, '#000', x - 6, y + 14 + up, 10, 22); R(g, '#1a1020', x - 5, y + 15 + up, 8, 20); R(g, '#000', x + 36, y + 14 + up, 10, 22); R(g, '#1a1020', x + 37, y + 15 + up, 8, 20);
      const dr = Math.floor(t / 10) % 2; R(g, '#1a1020', x + 6, y + 40, 4, 3 + dr); R(g, '#1a1020', x + 28, y + 40, 4, 4 - dr); R(g, '#6a3a9a', x + 20, y + 28, 6, 2);
      break;
    }
    case 'doctor': {
      const bob = Math.round(Math.sin(t * 0.1) * 1);
      if (b.state === 'laser' && b.t < 50 && Math.floor(t / 3) % 2) R(g, '#ff3030', AL(), FLOOR_Y - 5, 256, 1);
      // hover pod
      R(g, '#000', x - 2, y + 22 + bob, 34, 12); R(g, '#9aa0b8', x - 1, y + 23 + bob, 32, 10); R(g, '#d8dcf0', x + 1, y + 23 + bob, 28, 2);
      R(g, '#c01010', x + 3, y + 28 + bob, 4, 3); R(g, Math.floor(t / 8) % 2 ? '#ffe000' : '#c88a00', x + 13, y + 28 + bob, 4, 3); R(g, '#c01010', x + 23, y + 28 + bob, 4, 3);
      g.fillStyle = '#8fe3ff55'; g.beginPath(); g.arc(x + 15, y + 22 + bob, 14, Math.PI, 0); g.fill();
      // doctor
      R(g, '#fff', x + 7, y + 14 + bob, 16, 9);
      R(g, '#000', x + 6, y + 2 + bob, 18, 14); R(g, '#e8b090', x + 7, y + 3 + bob, 16, 12);
      R(g, '#e8e8f0', x + 3, y + 3 + bob, 4, 8); R(g, '#e8e8f0', x + 23, y + 3 + bob, 4, 8); R(g, '#e8e8f0', x + 7, y + 1 + bob, 16, 3);
      R(g, '#000', x + 8, y + 6 + bob, 6, 4); R(g, '#000', x + 16, y + 6 + bob, 6, 4);
      R(g, flash ? '#fff' : '#ff3030', x + 10 + (d > 0 ? 1 : 0), y + 7 + bob, 2, 2); R(g, flash ? '#fff' : '#ff3030', x + 18 + (d > 0 ? 1 : 0), y + 7 + bob, 2, 2);
      R(g, '#000', x + 8, y + 5 + bob, 6, 1); R(g, '#000', x + 16, y + 5 + bob, 6, 1);
      R(g, '#3a2a24', x + 9, y + 11 + bob, 12, 2); R(g, '#a8403a', x + 11, y + 13 + bob, 8, 1);
      if (b.phase >= 2) { R(g, '#ff3030', x + 6, y + 0 + bob, 3, 2); R(g, '#ff3030', x + 21, y + 0 + bob, 3, 2); }
      break;
    }
  }
  g.restore();
}
