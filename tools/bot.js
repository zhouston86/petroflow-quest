// Test bot (run in the page): plays a level in god mode, reports where it dies or gets stuck.
window.runBot = function (level, maxFrames, atArena) {
  G.level = level; startLevel(level); state = 'play'; DEBUG.god = true; paused = false;
  if (atArena) { pl.x = lv.arenaCol * 16 + 60; cam = lv.arenaCol * 16 - 60; }
  const rep = { level, deaths: [], stuck: [], frames: 0, reachedArena: false, bossDead: false };
  let lastX = pl.x, still = 0, jumpHeld = 0; const ring = []; let latch = 0;
  const shootOn = () => { setKey('KeyX', true); };
  for (let f = 0; f < maxFrames; f++) {
    for (const k in pressed) delete pressed[k];
    if (state !== 'play') break;
    ring.push([f, Math.round(pl.x), Math.round(pl.y), pl.onGround ? 1 : 0, plats[0] ? Math.round(plats.find(q => Math.abs(q.x - pl.x) < 200)?.x || 0) : 0, keys.ArrowRight ? 1 : 0]); if (ring.length > 40) ring.shift();
    if (pl.dead) { if (pl.deadT === 1) { rep.deaths.push(Math.round(pl.x)); if (!rep.trace) rep.trace = ring.slice(); } }
    const p = pl;
    setKey('ArrowRight', true); setKey('ArrowLeft', false);
    if (arena >= 1 && boss) {
      // boss fight: stay on the left side, shoot at the boss, jump a lot
      const bx = boss.x + boss.w / 2;
      setKey('ArrowRight', p.x + 6 < bx - 60); setKey('ArrowLeft', p.x + 6 > bx + 60);
      p.facing = bx > p.x ? 1 : -1;
      setKey('KeyX', true); setKey('ArrowUp', !!boss.fly);
      if (boss.fly) { const dyb = (p.y + 9) - (boss.y + boss.h / 2), dxb = Math.abs(bx - (p.x + 6)); setKey('ArrowRight', dxb > dyb + 20 && bx > p.x); setKey('ArrowLeft', dxb > dyb + 20 && bx < p.x); }
      setKey('KeyZ', p.onGround && f % 50 === 0);
    } else if (arena === 3) {
      const fr0 = items.find(i => i.kind === 'frag');
      if (fr0) { setKey('ArrowRight', fr0.x > p.x + 6); setKey('ArrowLeft', fr0.x < p.x - 6); setKey('KeyZ', fr0.y < p.y - 10 && p.onGround); }
    } else {
      shootOn();
      const dir = 1;
      const fc = Math.floor((p.x + p.w / 2) / 16), fr = Math.floor((p.y + p.h) / 16);
      const ahead = (n, r) => tile(fc + n, r);
      let jump = false;
      if (p.onGround) {
        const tsup = c => isSolid(tile(c, fr)) || tile(c, fr) === T_PIPE;
        const mp = plats.find(pp => pp.x > p.x - 60 && pp.x < p.x + 150);
        if (isSolid(ahead(1, fr - 1)) || isSolid(ahead(1, fr - 2)) && !isSolid(ahead(1, fr - 4))) jump = true;
        if (tile(fc + 1, fr - 1) === T_SPIKE || tile(fc + 2, fr - 1) === T_SPIKE) jump = true;
        for (const e of enemies) if (!e.dead && e.x > p.x && e.x - p.x < 44 && Math.abs(e.y - p.y) < 30) jump = true;
        if (p.plat) {
          // riding: only walk off once there is real ground ahead
          if (!tsup(fc + 1)) setKey('ArrowRight', false); else setKey('ArrowRight', true);
        } else if (!tsup(fc + 1) && mp) {
          // at a ledge with a mover nearby: wait until it is adjacent
          const adj = mp.x <= p.x + 6 && mp.x + 32 >= p.x + 14;
          if (adj) latch = 20;
          setKey('ArrowRight', (tsup(fc) && p.x + p.w < (fc + 1) * 16 - 0.5) || latch > 0);
        } else if (!tsup(fc + 1) && p.x % 16 > 4) jump = true;
      }
      setKey('KeyZ', jump);
      if (jump) jumpHeld = 20;
      if (jumpHeld > 0) { jumpHeld--; keys.KeyZ = true; }
    }
    if (latch > 0) latch--;
    step();
    rep.frames++;
    if (arena >= 1 && !rep.reachedArena) { rep.reachedArena = true; rep.tArena = f; }
    if (arena === 3 && !rep.tBoss) rep.tBoss = f;
    if (Math.abs(pl.x - lastX) < 0.5 && !pl.dead && arena === 0) { still++; if (still === 240) rep.stuck.push(Math.round(pl.x)); } else { still = 0; lastX = pl.x; }
    if (arena === 3 && !boss) rep.bossDead = true;
  }
  rep.state = state; rep.x = Math.round(pl.x); rep.cols = lv.cols; rep.arenaCol = lv.arenaCol; rep.score = G.score; rep.oil = stats && stats.oil;
  rep.bossHp = boss ? boss.hp : null;
  return rep;
};
