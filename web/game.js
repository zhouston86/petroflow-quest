// Core engine: input, physics, entities, the play-state update and render.
const canvas = document.getElementById('screen');
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;
const GRAV = 0.28;

// ---------- input ----------
const keys = {}, pressed = {};
const LEFT = ['ArrowLeft', 'KeyA', 'PadLeft'], RIGHT = ['ArrowRight', 'KeyD', 'PadRight'];
const JUMP = ['Space', 'KeyZ', 'PadJump'];
const UP = ['ArrowUp', 'KeyW', 'PadUp'];
const SHOOT = ['KeyX', 'KeyJ', 'KeyK', 'KeyC', 'ShiftLeft', 'ShiftRight', 'PadShoot'];
const CONFIRM = ['Enter', 'Space', 'KeyZ', 'PadStart', 'PadJump'];
const down = a => a.some(k => keys[k]);
const hit = a => a.some(k => pressed[k]);
function setKey(k, v) { if (v && !keys[k]) pressed[k] = true; keys[k] = v; }
addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (!e.repeat) setKey(e.code, true);
  Sound.resume();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const p = pads && pads[0];
  if (!p) return;
  const b = i => p.buttons[i] && p.buttons[i].pressed;
  setKey('PadLeft', p.axes[0] < -0.4 || b(14));
  setKey('PadRight', p.axes[0] > 0.4 || b(15));
  setKey('PadJump', b(0));
  setKey('PadUp', p.axes[1] < -0.5 || b(12));
  setKey('PadShoot', b(1) || b(2));
  setKey('PadStart', b(9));
}

// ---------- game state ----------
const G = { ch: 'zach', lives: 3, score: 0, oil: 0, level: 0, scoreAtLevelStart: 0, totalFrames: 0, scrollsAll: 0 };
let state = 'boot', stT = 0, frame = 0, paused = false;
let lv = null, pl = null, cam = 0, enemies = [], items = [], shots = [], eshots = [], parts = [], floats = [], plats = [], decor = [], checks = [];
let boss = null, arena = 0, arenaT = 0, shakeT = 0, cp = { x: 0, y: 0 }, stats = null;

const ITEM_BOX = { drop: [8, 10], barrel: [12, 14], oneup: [12, 15], scroll: [11, 13], pipesim: [12, 12], olga: [12, 12], frag: [16, 18] };
const ENEMY_HP = { hydrate: 1, wax: 2, scale: 3, slug: 2, tar: 2, bubble: 1, turret: 3, fire: 2 };
const SPIKY = { scale: true, turret: true, fire: true };
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function tile(c, r) {
  if (c < 0 || c >= lv.cols) return T_GROUND;
  if (r < 0) return 0;
  if (r >= ROWS) return T_LIQUID;
  return lv.tiles[r * lv.maxc + c];
}
const isSolid = t => t === T_GROUND || t === T_BLOCK;

function puff(x, y, color, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = (0.3 + Math.random()) * (spd || 1.5);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6, life: 20 + Math.random() * 20, c: color });
  }
}
function floatText(x, y, s, c) { floats.push({ x, y, s, c: c || '#fff', life: 70 }); }

function moveBody(b, usePlats) {
  b.hitW = 0;
  b.x += b.vx;
  let c0 = Math.floor(b.x / 16), c1 = Math.floor((b.x + b.w - 0.01) / 16);
  let r0 = Math.floor(b.y / 16), r1 = Math.floor((b.y + b.h - 0.01) / 16);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (isSolid(tile(c, r))) {
      if (b.vx > 0) { b.x = c * 16 - b.w; b.hitW = 1; b.vx = 0; }
      else if (b.vx < 0) { b.x = (c + 1) * 16; b.hitW = -1; b.vx = 0; }
    }
  }
  const py = b.y;
  b.y += b.vy; b.onGround = false;
  c0 = Math.floor(b.x / 16); c1 = Math.floor((b.x + b.w - 0.01) / 16);
  r0 = Math.floor(b.y / 16); r1 = Math.floor((b.y + b.h - 0.01) / 16);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const t = tile(c, r);
    if (isSolid(t)) {
      if (b.vy > 0) { b.y = r * 16 - b.h; b.vy = 0; b.onGround = true; }
      else if (b.vy < 0) { b.y = (r + 1) * 16; b.vy = 0; }
    } else if (t === T_PIPE && b.vy >= 0 && py + b.h <= r * 16 + 0.01 && b.y + b.h > r * 16) {
      b.y = r * 16 - b.h; b.vy = 0; b.onGround = true;
    }
  }
  if (usePlats && b.vy >= 0) {
    for (const p of plats) {
      if (b.x + b.w > p.x && b.x < p.x + p.w && py + b.h <= p.prevY + 1 && b.y + b.h >= p.y) {
        b.y = p.y - b.h; b.vy = 0; b.onGround = true; b.plat = p;
      }
    }
  }
}

// ---------- level setup ----------
function spawnEnemy(type, x, y, extra) {
  const [w, h] = ENEMY_BOX[type];
  const e = { type, x, y, w, h, vx: 0, vy: 0, dir: -1, hp: ENEMY_HP[type] + (type === 'hydrate' && lv.li >= 3 ? 1 : 0), hurt: 0, t: 0, spiky: !!SPIKY[type], dead: false, onGround: false };
  Object.assign(e, extra || {});
  if (e.hang) { e.spiky = false; e.hy = e.hy || 16; }
  enemies.push(e);
  return e;
}

function newPlayer(x, y) {
  const C = CHARS[G.ch];
  return { x, y, w: 12, h: 26, vx: 0, vy: 0, facing: 1, onGround: false, coyote: 0, jumpBuf: 0, jumps: 0, hp: C.hp, max: C.hp, inv: 0, cd: 0, anim: 0, dead: false, deadT: 0, triple: 0, star: 0, plat: null, prevY: y };
}

function startLevel(li) {
  lv = buildLevel(li);
  G.level = li;
  enemies = []; items = []; shots = []; eshots = []; parts = []; floats = []; plats = []; decor = []; checks = [];
  for (const e of lv.ents) {
    if (e.k === 'enemy') spawnEnemy(e.type, e.x, e.y, { dir: e.dir || -1, hang: e.hang, hy: e.hy });
    else if (e.k === 'item') { const [w, h] = ITEM_BOX[e.kind]; items.push({ ...e, w, h, ch: G.ch }); }
    else if (e.k === 'sign') decor.push(e);
    else if (e.k === 'check') checks.push({ x: e.x, y: e.y, on: false });
    else if (e.k === 'mp') plats.push({ x: e.x, y: e.y, w: 32, h: 8, vx: e.vx, min: e.min, max: e.max, dx: 0, dy: 0, prevY: e.y });
  }
  stats = { oil: 0, oilTotal: items.filter(i => i.kind === 'drop').length, scrolls: 0, kills: 0, frames: 0 };
  pl = newPlayer(lv.startX, lv.startY);
  cp = { x: lv.startX, y: lv.startY };
  arena = 0; arenaT = 0; boss = null; cam = 0; shakeT = 0;
  Sound.play(LEVELS[li].song);
}

// ---------- player ----------
function hurtPlayer(fromX) {
  if (pl.dead || pl.inv > 0 || pl.star > 0 || arena === 3 && !boss) return;
  pl.hp--;
  Sound.sfx('hurt');
  if (pl.hp <= 0) { killPlayer(); return; }
  pl.inv = 110; pl.vy = -3.2; pl.vx = (pl.x + pl.w / 2 < fromX ? -1 : 1) * 2.2;
  puff(pl.x + 6, pl.y + 10, '#ff4040', 6, 1.5);
}
function killPlayer() {
  if (pl.dead) return;
  pl.dead = true; pl.deadT = 0; pl.vy = -5; pl.vx = 0; pl.hp = 0;
  Sound.sfx('die');
  G.lives--;
}
function respawn() {
  pl = newPlayer(cp.x, cp.y);
  pl.inv = 120;
  cam = arena > 0 ? lv.arenaCol * 16 : clamp(pl.x - 104, 0, lv.cols * 16 - 288);
  if (arena >= 1 && arena < 3) {
    boss = newBoss(lv.bossType);
    arena = 1; arenaT = 40;
    eshots.length = 0; enemies = enemies.filter(e => !e.fromBoss);
    Sound.stop();
  }
}

function playerShoot() {
  const C = CHARS[G.ch];
  if (shots.filter(s => !s.hostile).length >= C.shots + (pl.triple > 0 ? 2 : 0)) return;
  pl.cd = C.cd;
  Sound.sfx('shoot');
  const up = down(UP);
  const bx = up ? 0.707 * pl.facing : pl.facing, by = up ? -0.707 : 0;
  const base = Math.atan2(by, bx);
  for (const a of (pl.triple > 0 ? [-0.22, 0, 0.22] : [0])) {
    const dx = Math.cos(base + a), dy = Math.sin(base + a);
    shots.push({ x: pl.x + 3 + dx * 9, y: pl.y + 9 + dy * 9, w: 6, h: 6, vx: dx * C.shotSpd, vy: dy * C.shotSpd, life: 62, dmg: C.dmg });
  }
}

function updPlayer() {
  const C = CHARS[G.ch], p = pl;
  p.anim++;
  if (p.dead) {
    p.deadT++; p.vy += GRAV; p.y += p.vy;
    if (p.deadT > 100) { if (G.lives < 0) { setState('gameover'); } else respawn(); }
    return;
  }
  if (p.plat) { p.x += p.plat.dx; p.y += p.plat.dy; p.plat = null; }
  p.prevY = p.y;
  const dir = (down(RIGHT) ? 1 : 0) - (down(LEFT) ? 1 : 0);
  const acc = p.onGround ? 0.16 : 0.11;
  if (dir) { p.vx = clamp(p.vx + dir * acc, -C.speed, C.speed); p.facing = dir; }
  else { const f = p.onGround ? 0.13 : 0.03; p.vx = Math.abs(p.vx) < f ? 0 : p.vx - Math.sign(p.vx) * f; }
  if (hit(JUMP)) p.jumpBuf = 6; else if (p.jumpBuf > 0) p.jumpBuf--;
  if (p.onGround) { p.coyote = 6; p.jumps = 0; } else if (p.coyote > 0) p.coyote--;
  if (!p.onGround && p.coyote === 0 && p.jumps === 0) p.jumps = 1;
  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = -C.jump; p.coyote = 0; p.jumpBuf = 0; p.jumps = 1; Sound.sfx('jump');
  } else if (p.jumpBuf > 0 && C.dbl && p.jumps === 1 && !p.onGround) {
    p.vy = -C.jump * 0.92; p.jumps = 2; p.jumpBuf = 0; Sound.sfx('jump'); puff(p.x + 6, p.y + 26, '#fff', 6, 1);
  }
  if (!down(JUMP) && p.vy < -2.4) p.vy = -2.4;
  p.vy = Math.min(p.vy + GRAV, 5.5);
  moveBody(p, true);
  if (p.cd > 0) p.cd--;
  if (down(SHOOT) && p.cd <= 0) playerShoot();
  if (p.inv > 0) p.inv--;
  if (p.triple > 0) p.triple--;
  if (p.star > 0) p.star--;
  const lo = arena > 0 ? lv.arenaCol * 16 + 2 : 0;
  if (p.x < lo) { p.x = lo; p.vx = Math.max(0, p.vx); }
  // hazards
  const cc = Math.floor((p.x + p.w / 2) / 16);
  if (tile(cc, Math.floor((p.y + p.h - 5) / 16)) === T_LIQUID || p.y > 250) { killPlayer(); return; }
  const hz = { x: 0, y: 0, w: 12, h: 8 };
  for (let c = Math.floor(p.x / 16); c <= Math.floor((p.x + p.w) / 16); c++) for (let r = Math.floor(p.y / 16); r <= Math.floor((p.y + p.h) / 16); r++) {
    if (tile(c, r) === T_SPIKE) { hz.x = c * 16 + 2; hz.y = r * 16 + 8; if (ov(p, hz)) { hurtPlayer(c * 16 + 8); if (!p.dead) p.vy = -4; } }
  }
}

// ---------- enemies ----------
function walker(e, speed) {
  e.vx = e.dir * speed;
  e.vy = Math.min(e.vy + GRAV, 5);
  if (e.onGround) {
    const fc = Math.floor((e.x + (e.dir > 0 ? e.w + 1 : -1)) / 16), fr = Math.floor((e.y + e.h + 2) / 16);
    const t = tile(fc, fr);
    if (!isSolid(t) && t !== T_PIPE) e.dir *= -1, e.vx = e.dir * speed;
  }
  moveBody(e);
  if (e.hitW) e.dir *= -1;
}

function updEnemy(e) {
  if (e.hurt > 0) e.hurt--;
  e.t++;
  const dx = pl.x - e.x, dy = pl.y - e.y;
  switch (e.type) {
    case 'hydrate': walker(e, 0.35 + 0.04 * lv.li); break;
    case 'wax':
      e.vy = Math.min(e.vy + GRAV, 5);
      if (e.onGround) {
        e.vx = 0; e.wait = (e.wait === undefined ? 40 : e.wait) - 1;
        if (e.wait <= 0 && Math.abs(dx) < 120) { e.dir = dx > 0 ? 1 : -1; e.vy = -3.4; e.vx = e.dir * 1.0; e.wait = 70; }
      }
      moveBody(e); break;
    case 'scale': walker(e, e.t % 160 < 30 ? 0 : 0.45); break;
    case 'slug': {
      if (e.charge > 0) { e.charge--; walker(e, 1.5); if (e.charge === 0) e.rest = 70; }
      else if (e.rest > 0) { e.rest--; walker(e, 0); }
      else {
        walker(e, 0.3);
        if (Math.abs(dy) < 28 && Math.abs(dx) < 140 && (dx > 0 ? 1 : -1) === e.dir) e.charge = 70;
      }
      break;
    }
    case 'tar':
      if (e.hang) { if (Math.abs(dx + 0) < 30 && dy > 0) e.hang = false; }
      else { e.dir = dx > 0 ? 1 : -1; walker(e, 0.45); }
      break;
    case 'bubble':
      if (e.ox === undefined) { e.ox = e.x; e.oy = e.y; }
      e.x = e.ox + Math.sin(e.t * 0.02) * 50; e.y = e.oy + Math.sin(e.t * 0.06) * 14; e.dir = Math.cos(e.t * 0.02) > 0 ? 1 : -1;
      break;
    case 'turret':
      e.dir = dx > 0 ? 1 : -1;
      if (e.charge > 0) { e.charge--; if (e.charge === 0) { Sound.sfx('spit'); eshot({ kind: 'ball', x: e.x + (e.dir > 0 ? 14 : -2), y: e.y + 5, vx: e.dir * 1.5, life: 200 }); } }
      else if (Math.abs(dx) < 170 && Math.abs(dy) < 70) { e.cd = (e.cd || 60) - 1; if (e.cd <= 0) { e.charge = 14; e.cd = 120; } }
      break;
    case 'fire':
      e.vy = Math.min(e.vy + GRAV, 5);
      if (e.onGround) { e.vx = 0; e.wait = (e.wait === undefined ? 30 : e.wait) - 1; if (e.wait <= 0) { e.dir = dx > 0 ? 1 : -1; e.vy = -4.6; e.vx = e.dir * 0.8; e.wait = 60; } }
      moveBody(e); break;
  }
  if (e.y > 260) e.dead = true;
}

function dmgEnemy(e, n) {
  if (e.dead) return;
  e.hp -= n; e.hurt = 12;
  if (e.hp <= 0) {
    e.dead = true; stats.kills++; G.score += 100;
    puff(e.x + e.w / 2, e.y + e.h / 2, '#fff', 8, 2);
    Sound.sfx('kill');
    if (Math.random() < 0.4) items.push({ k: 'item', kind: 'drop', x: e.x + e.w / 2 - 4, y: e.y + e.h / 2 - 4, w: 8, h: 10, fromKill: true });
  } else Sound.sfx('hit');
}

function updShots() {
  for (const s of shots) {
    s.x += s.vx; s.y += s.vy; s.life--;
    if (s.life <= 0 || isSolid(tile(Math.floor((s.x + 3) / 16), Math.floor((s.y + 3) / 16)))) { s.life = 0; puff(s.x + 3, s.y + 3, '#8fe3ff', 3, 1); continue; }
    for (const e of enemies) {
      if (e.dead || e.hang && e.type !== 'tar') continue;
      if (ov(s, e)) { s.life = 0; dmgEnemy(e, s.dmg); break; }
    }
    if (s.life > 0 && boss && ov(s, boss) && bossHit(s.dmg)) s.life = 0;
  }
  shots = shots.filter(s => s.life > 0);
  for (const s of eshots) {
    s.x += s.vx; s.y += s.vy; s.vy += s.grav; s.life--;
    if (!s.noTile && (isSolid(tile(Math.floor((s.x + s.w / 2) / 16), Math.floor((s.y + s.h / 2) / 16))) || s.y + s.h > FLOOR_Y + 2 && s.vy > 0 && s.kind !== 'ball')) { s.life = 0; puff(s.x + 3, s.y + 3, '#fff', 4, 1); continue; }
    if (!pl.dead && ov(pl, s)) { hurtPlayer(s.x + s.w / 2); if (s.kind !== 'wave' && s.kind !== 'beam') s.life = 0; }
  }
  eshots = eshots.filter(s => s.life > 0 && s.y < 250);
}

function collect(it) {
  switch (it.kind) {
    case 'drop': G.oil++; stats.oil++; G.score += 10; Sound.sfx('coin'); if (G.oil % 100 === 0) { G.lives++; Sound.sfx('1up'); floatText(pl.x, pl.y - 10, '1UP! 100 OIL', '#ffc000'); } break;
    case 'barrel': pl.hp = Math.min(pl.max, pl.hp + 1); G.score += 50; Sound.sfx('heal'); floatText(pl.x, pl.y - 10, 'FLOW +1', '#5ce430'); break;
    case 'oneup': G.lives++; Sound.sfx('1up'); floatText(pl.x, pl.y - 10, '1UP!', '#ffc000'); break;
    case 'scroll':
      stats.scrolls++; G.score += 500; Sound.sfx('power'); floatText(pl.x - 10, pl.y - 10, 'QUEST SCROLL ' + stats.scrolls + '/3', '#ffc000');
      if (stats.scrolls === 3) { G.lives++; Sound.sfx('1up'); floatText(pl.x - 10, pl.y - 22, 'QUEST BONUS 1UP!', '#5ce430'); }
      break;
    case 'pipesim': pl.triple = 720; G.score += 200; Sound.sfx('power'); floatText(pl.x - 10, pl.y - 10, 'PIPESIM! TRIPLE SHOT', '#8fe3ff'); break;
    case 'olga': pl.star = 480; G.score += 200; Sound.sfx('power'); floatText(pl.x - 10, pl.y - 10, 'OLGA! TRANSIENT SHIELD', '#ffe000'); break;
    case 'frag': levelDone(); break;
  }
}

// ---------- main play update ----------
function updPlay() {
  frame++;
  stats.frames++;
  if (shakeT > 0) shakeT--;
  for (const p of plats) { p.prevY = p.y; p.dx = p.vx; p.dy = 0; p.x += p.vx; if (p.x < p.min || p.x > p.max) p.vx *= -1; }
  updPlayer();
  const act0 = cam - 40, act1 = cam + 256 + 60;
  for (const e of enemies) if (!e.dead && (e.fromBoss || (e.x > act0 && e.x < act1))) updEnemy(e);
  // player vs enemies
  if (!pl.dead) for (const e of enemies) {
    if (e.dead || !ov(pl, e)) continue;
    const stomp = !e.spiky && pl.vy > 0.4 && pl.prevY + pl.h <= e.y + 8;
    if (stomp) { dmgEnemy(e, 1); pl.vy = down(JUMP) ? -5.4 : -3.8; pl.jumps = Math.min(pl.jumps, 1); Sound.sfx('stomp'); }
    else if (!(e.hang)) hurtPlayer(e.x + e.w / 2);
  }
  enemies = enemies.filter(e => !e.dead);
  // boss contact
  if (boss && !boss.dead && !pl.dead && arena === 2 && ov(pl, boss)) {
    const stomp = !boss.spiky && !boss.armor && pl.vy > 0.4 && pl.prevY + pl.h <= boss.y + 10;
    if (stomp) { if (bossHit(2)) { pl.vy = -5.2; } }
    else hurtPlayer(boss.x + boss.w / 2);
  }
  updShots();
  if (!pl.dead) for (const it of items) {
    if (!it.taken && ov(pl, it)) { it.taken = true; collect(it); }
  }
  items = items.filter(i => !i.taken);
  for (const c of checks) if (!c.on && pl.x > c.x + 20) { c.on = true; cp = { x: c.x + 24, y: c.y - 26 }; Sound.sfx('check'); floatText(c.x + 10, c.y - 70, 'FLOW ASSURED!', '#5ce430'); pl.hp = Math.min(pl.max, pl.hp + 1); }
  // boss arena
  if (arena === 0 && pl.x > lv.arenaCol * 16 + 48 && !pl.dead) {
    arena = 1; arenaT = 0; boss = newBoss(lv.bossType); Sound.stop(); Sound.sfx('warn');
    cp = { x: lv.arenaCol * 16 + 24, y: FLOOR_Y - 26 };
  }
  if (arena === 1) { arenaT++; if (arenaT >= 100) { arena = 2; Sound.play(lv.bossType === 'doctor' ? 'final' : 'boss'); } }
  if (boss || arena === 3) bossUpdate();
  // camera
  const tgt = arena > 0 ? lv.arenaCol * 16 : clamp(pl.x - 104 + pl.facing * 14, 0, lv.cols * 16 - 256 - 32);
  cam += clamp(tgt - cam, -(arena > 0 ? 4 : 3.5), arena > 0 ? 4 : 3.5) * (arena > 0 ? 1 : 1);
  if (arena === 0) cam = clamp(cam, 0, lv.cols * 16 - 256);
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--; }
  parts = parts.filter(p => p.life > 0);
  for (const f of floats) { f.y -= 0.4; f.life--; }
  floats = floats.filter(f => f.life > 0);
}

function levelDone() {
  G.totalFrames += stats.frames;
  setState('clear');
}

// ---------- rendering ----------
function drawTiles(cx, cy) {
  const set = Art.tiles[lv.theme];
  const c0 = Math.floor(cx / 16), c1 = c0 + 17;
  const tf = Math.floor(frame / 24) % 2;
  for (let c = c0; c <= c1; c++) for (let r = 0; r < ROWS; r++) {
    const t = tile(c, r);
    if (!t) continue;
    const x = c * 16 - cx, y = r * 16 + cy;
    if (t === T_GROUND) g.drawImage(isSolid(tile(c, r - 1)) ? set.fill : set.top, x, y);
    else if (t === T_BLOCK) g.drawImage(set.block, x, y);
    else if (t === T_PIPE) g.drawImage(set.pipe, x, y);
    else if (t === T_SPIKE) g.drawImage(set.spike, x, y);
    else if (t === T_LIQUID) g.drawImage(set.liq[(tf + c) % 2], x, y);
  }
}

function drawSign(s, cx) {
  const R = Art.R;
  const w = Math.max(...s.lines.map(l => l.length)) * 8 + 12, h = s.lines.length * 10 + 6;
  const x = Math.round(s.x - cx), by = s.y - 14 - h;
  R(g, '#000', x + 4, by + h, 3, 14); R(g, '#000', x + w - 7, by + h, 3, 14);
  R(g, '#7a5a3a', x + 5, by + h, 1, 14); R(g, '#7a5a3a', x + w - 6, by + h, 1, 14);
  R(g, '#000', x, by, w, h); R(g, '#ffc000', x + 1, by + 1, w - 2, h - 2); R(g, '#0c2a48', x + 3, by + 3, w - 6, h - 6);
  s.lines.forEach((l, i) => Art.text(g, l, x + w / 2, by + 5 + i * 10, i === 0 ? '#ffc000' : '#fff', 'center', false));
  Art.logo(g, x + 4, by + 4, 6);
}
function drawCheck(c, cx) {
  const R = Art.R, x = Math.round(c.x - cx), by = c.y - 64;
  R(g, '#000', x + 6, by + 40, 4, 24); R(g, '#000', x + 78, by + 40, 4, 24);
  R(g, '#7a5a3a', x + 7, by + 40, 2, 24); R(g, '#7a5a3a', x + 79, by + 40, 2, 24);
  R(g, '#000', x, by, 88, 42); R(g, c.on ? '#5ce430' : '#c01010', x + 1, by + 1, 86, 40); R(g, '#0c2a48', x + 3, by + 3, 82, 36);
  Art.logo(g, x + 16, by + 20, 11);
  Art.text(g, 'PETRO', x + 32, by + 8, '#fff', 'left', false); Art.text(g, 'FLOW', x + 32, by + 18, '#ffc000', 'left', false);
  Art.text(g, c.on ? 'ASSURED!' : 'CHECK!', x + 44, by + 30, c.on ? '#5ce430' : '#ff8080', 'center', false);
  const f = Math.floor(frame / 10) % 2;
  R(g, c.on ? '#5ce430' : (f ? '#ff3030' : '#801010'), x + 38, by - 4, 12, 4);
}

function drawPlay() {
  const th = THEMES[lv.theme], bg = Art.bgs[lv.theme];
  const sx = shakeT > 0 ? Math.round(Math.random() * 4 - 2) : 0, sy = shakeT > 0 ? Math.round(Math.random() * 4 - 2) : 0;
  const cx = Math.round(cam) + sx, cy = sy;
  g.drawImage(bg.sky, 0, 0);
  const fo = -((cam * 0.2) % 512), mo = -((cam * 0.5) % 512);
  g.drawImage(bg.far, Math.round(fo), 0); g.drawImage(bg.far, Math.round(fo) + 512, 0);
  g.drawImage(bg.mid, Math.round(mo), 0); g.drawImage(bg.mid, Math.round(mo) + 512, 0);
  drawTiles(cx, cy);
  g.save(); g.translate(-cx, cy);
  for (const s of decor) if (s.x > cx - 120 && s.x < cx + 260) { g.save(); g.translate(cx, 0); drawSign(s, cx); g.restore(); }
  for (const c of checks) if (c.x > cx - 120 && c.x < cx + 260) { g.save(); g.translate(cx, 0); drawCheck(c, cx); g.restore(); }
  for (const it of items) if (it.x > cx - 20 && it.x < cx + 280) Art.drawItem(g, it, frame);
  for (const p of plats) { Art.R(g, '#000', p.x, p.y, 32, 8); Art.R(g, '#ffc000', p.x + 1, p.y + 1, 30, 3); Art.R(g, '#7c8ca4', p.x + 1, p.y + 4, 30, 3); Art.R(g, '#c01010', p.x + 12, p.y + 1, 8, 3); }
  for (const e of enemies) if (e.x > cx - 40 && e.x < cx + 300) Art.drawEnemy(g, e, frame);
  if (boss) drawBoss(g, boss, frame);
  for (const s of eshots) Art.drawShot(g, s, frame);
  for (const s of shots) Art.drawShot(g, s, frame);
  // player
  const C = CHARS[G.ch];
  const showP = pl.inv <= 0 || Math.floor(pl.inv / 4) % 2 === 0 || pl.dead;
  if (showP) {
    if (pl.star > 0) { g.fillStyle = Math.floor(frame / 3) % 2 ? '#ffe00066' : '#ffffff55'; g.beginPath(); g.arc(pl.x + 6, pl.y + 12, 20, 0, 7); g.fill(); }
    const st = pl.dead ? 'jump' : (!pl.onGround ? 'jump' : (Math.abs(pl.vx) > 0.2 ? 'run' : 'idle'));
    Art.drawPlayer(g, G.ch, pl.x - 2, pl.y - 6, pl.facing, st, pl.anim, { fire: pl.cd > C.cd - 4 });
  }
  for (const p of parts) Art.R(g, p.c, p.x, p.y, 2, 2);
  for (const f of floats) Art.text(g, f.s, f.x, f.y, f.c, 'left');
  g.restore();
  drawHUD();
}

function drawHUD() {
  const R = Art.R, C = CHARS[G.ch];
  g.fillStyle = '#000000b0'; g.fillRect(0, 0, 256, 22);
  R(g, '#c01010', 0, 22, 256, 1);
  Art.text(g, 'SCORE ' + String(G.score).padStart(6, '0'), 4, 3, '#fff');
  Art.text(g, 'OIL ' + String(G.oil).padStart(3, '0'), 108, 3, '#ffc000');
  Art.text(g, 'W' + (G.level + 1) + '-' + LEVEL_TAG[G.level], 252, 3, '#8fe3ff', 'right');
  for (let i = 0; i < pl.max; i++) { const x = 4 + i * 9; R(g, '#000', x, 12, 8, 9); R(g, i < pl.hp ? '#ffc000' : '#3a3a4a', x + 1, 13, 6, 7); if (i < pl.hp) R(g, '#fff', x + 2, 14, 1, 2); }
  g.drawImage(Art.heads[G.ch], 0, 0, 16, 20, 84, 11, 8, 10);
  Art.text(g, 'x' + Math.max(0, G.lives), 94, 13, '#fff');
  R(g, '#f4e4b0', 124, 12, 6, 8); R(g, '#c01010', 125, 15, 4, 1);
  Art.text(g, stats.scrolls + '/3', 132, 13, '#f4e4b0');
  Art.logo(g, 192, 17, 4);
  Art.text(g, 'PETROFLOW', 254, 13, '#ffc000', 'right');
  if (pl.triple > 0) Art.text(g, 'PIPESIM ' + Math.ceil(pl.triple / 60), 4, 26, '#8fe3ff');
  if (pl.star > 0) Art.text(g, 'OLGA ' + Math.ceil(pl.star / 60), 4, pl.triple > 0 ? 36 : 26, '#ffe000');
  if (boss && arena >= 1) {
    const w = 120, x = 128 - w / 2;
    Art.text(g, boss.name, 128, 26, '#ff8080', 'center');
    R(g, '#000', x - 1, 36, w + 2, 7); R(g, '#401010', x, 37, w, 5);
    R(g, '#ff3030', x, 37, Math.max(0, w * boss.hp / boss.max), 5); R(g, '#ff9090', x, 37, Math.max(0, w * boss.hp / boss.max), 1);
  }
  if (arena === 1 && Math.floor(arenaT / 8) % 2 === 0) Art.bigText(g, 'WARNING!', 128, 100, '#ff3030', 'center');
  if (Sound.isMuted()) Art.text(g, 'MUTE', 252, 227, '#888', 'right');
}
