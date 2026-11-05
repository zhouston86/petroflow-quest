// Screens, menus, cutscenes and the main loop.
const HERO_QUOTES = [
  'TIME TO CLEAR THESE PLUGS!', 'LET\'S RUN THE TRANSIENTS!', 'I\'LL SIZE THE INJECTION RATE!',
  'SLUGS? WE SIMULATED THIS.', 'TIME TO SHUT IN THIS PLANT!', 'WELL CONTROL: ENGAGED!'
];
const LEVEL_TAG = ['GULF', 'NORTH', 'AFRICA', 'ARCTIC', 'PLANT', 'WELL'];
const DEBUG = {};
const PROMPT = () => TOUCH ? 'TAP TO CONTINUE' : 'PRESS ENTER';
let audioReady = false, clearInfo = null, titleCh = 0, sel = 0, typed = 0, storyPage = 0;

const STORY = [
  ['IT IS A DARK TIME FOR OIL AND GAS.', '', 'PIPELINES CLOG. WAX CREEPS.', 'HYDRATES FREEZE. SLUGS STAMPEDE.', 'PRODUCTION STOPS.'],
  ['BEHIND IT ALL STANDS THE EVIL', 'DR. DOWNTIME, ENEMY OF UPTIME!', '', 'HE STOLE THE GOLDEN BARREL AND', 'CLOGGED THE WORLD\'S PIPELINES.'],
  ['BUT PETROFLOW, INC. IS READY.', 'EST. 2001. 150+ FIELDS. 20+ CLIENTS.', '', 'ZACH. GEIR. MACK.', 'FLOW ASSURANCE SPECIALISTS.', '', 'GO FORTH, AND RESTORE THE FLOW!']
];

function wrap(s, n) {
  const out = []; let line = '';
  for (const w of s.split(' ')) {
    if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim();
  }
  if (line) out.push(line);
  return out;
}
const fmtTime = f => { const s = Math.floor(f / 60); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

function setState(s) {
  state = s; stT = 0; typed = 0;
  if (s === 'title') Sound.play('title');
  if (s === 'clear') {
    const sec = Math.floor(stats.frames / 60);
    const timeBonus = Math.max(0, 240 - sec) * 15;
    const oilBonus = stats.oil * 20;
    clearInfo = { sec, timeBonus, oilBonus, oil: stats.oil, oilTotal: stats.oilTotal, scrolls: stats.scrolls, kills: stats.kills };
    G.score += timeBonus + oilBonus;
    Sound.play('clear');
  }
  if (s === 'intro') Sound.play('title');
  if (s === 'gameover') Sound.play('gameover');
  if (s === 'ending') { Sound.play('ending'); parts = []; }
}

function beginRun() {
  G.lives = 3; G.score = 0; G.oil = 0; G.level = 0; G.totalFrames = 0; G.scoreAtLevelStart = 0;
  setState('intro');
}

// ---------- backgrounds shared by menus ----------
function drawScenery(theme, scroll, ground) {
  const bg = Art.bgs[theme];
  g.drawImage(bg.sky, 0, 0);
  const fo = -((scroll * 0.2) % 512), mo = -((scroll * 0.5) % 512);
  g.drawImage(bg.far, Math.round(fo), 0); g.drawImage(bg.far, Math.round(fo) + 512, 0);
  g.drawImage(bg.mid, Math.round(mo), 0); g.drawImage(bg.mid, Math.round(mo) + 512, 0);
  if (ground) {
    const set = Art.tiles[theme];
    for (let c = 0; c < 17; c++) {
      const x = c * 16 - (Math.round(scroll) % 16);
      g.drawImage(set.top, x, 192);
      g.drawImage(set.fill, x, 208); g.drawImage(set.fill, x, 224);
    }
  }
}
function panel(x, y, w, h, border) {
  g.fillStyle = '#000'; g.fillRect(x, y, w, h);
  g.fillStyle = border || '#ffc000'; g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = '#0a1830'; g.fillRect(x + 3, y + 3, w - 6, h - 6);
}
const blink = (n) => Math.floor(stT / (n || 30)) % 2 === 0;

// ---------- title ----------
function updTitle() {
  if (hit(CONFIRM)) { Sound.sfx('start'); storyPage = 0; setState('story'); }
}
function drawTitle() {
  drawScenery(0, stT * 0.4, true);
  g.fillStyle = '#00000055'; g.fillRect(0, 12, 256, 140);
  Art.logo(g, 128, 28, 12);
  Art.bigText(g, 'PETROFLOW', 128, 46, '#ffc000', 'center', 24);
  Art.bigText(g, 'QUEST', 128, 74, '#ff4030', 'center', 32);
  Art.text(g, 'THE QUEST FOR THE GOLDEN BARREL', 128, 114, '#fff', 'center');
  Art.text(g, 'AN 8-BIT FLOW ASSURANCE SAGA', 128, 128, '#8fe3ff', 'center');
  Art.text(g, 'FLOW ASSURANCE + SIMULATION', 128, 142, '#c0c0d0', 'center', false);
  const chs = ['zach', 'geir', 'mack'];
  chs.forEach((c, i) => { const bob = Math.floor((stT + i * 14) / 14) % 2; Art.drawPlayer(g, c, 78 + i * 38, 160 - bob, 1, 'idle', stT, {}); });
  if (blink(30)) Art.text(g, PROMPT(), 128, 205, '#fff', 'center');
  Art.text(g, 'PETROFLOW, INC.  PETROFLOW.COM', 128, 228, '#ffc000', 'center');
}

// ---------- story ----------
function updStory() {
  const total = STORY[storyPage].join('\n').length;
  typed += 0.8;
  if (hit(CONFIRM)) {
    if (typed < total) typed = total;
    else { storyPage++; typed = 0; Sound.sfx('select'); if (storyPage >= STORY.length) { sel = 0; setState('select'); } }
  }
}
function drawStory() {
  drawScenery(storyPage === 1 ? 5 : (storyPage === 2 ? 0 : 4), stT * 0.3, false);
  g.fillStyle = '#000000a0'; g.fillRect(0, 0, 256, 240);
  if (storyPage === 1) { Art.R(g, '#c01010', 108, 30, 40, 6); }
  panel(12, 40, 232, 150);
  let left = Math.floor(typed);
  STORY[storyPage].forEach((l, i) => {
    const s = l.slice(0, Math.max(0, left)); left -= l.length + 1;
    Art.text(g, s, 128, 56 + i * 16, i === 0 ? '#ffc000' : '#fff', 'center');
  });
  if (storyPage === 2) { ['zach', 'geir', 'mack'].forEach((c, i) => g.drawImage(Art.heads[c], 0, 0, 16, 20, 88 + i * 30, 150, 24, 30)); }
  if (blink(30)) Art.text(g, PROMPT(), 128, 208, '#fff', 'center');
  Art.text(g, 'PAGE ' + (storyPage + 1) + '/' + STORY.length, 250, 228, '#888', 'right');
}

// ---------- character select ----------
const CH_LIST = ['zach', 'geir', 'mack'];
function updSelect() {
  if (hit(LEFT)) { sel = (sel + 2) % 3; Sound.sfx('select'); }
  if (hit(RIGHT)) { sel = (sel + 1) % 3; Sound.sfx('select'); }
  if (hit(CONFIRM)) { G.ch = CH_LIST[sel]; Sound.sfx('start'); beginRun(); }
}
function drawSelect() {
  drawScenery(0, stT * 0.2, true);
  g.fillStyle = '#000000a0'; g.fillRect(0, 0, 256, 240);
  Art.bigText(g, 'CHOOSE YOUR', 128, 8, '#ffc000', 'center', 16);
  Art.bigText(g, 'ENGINEER', 128, 28, '#ffc000', 'center', 16);
  CH_LIST.forEach((c, i) => {
    const cx = 48 + i * 80, on = i === sel;
    if (on) { panel(cx - 34, 52, 68, 100, '#ff4030'); } else { g.fillStyle = '#00000080'; g.fillRect(cx - 34, 52, 68, 100); }
    const bob = on ? Math.floor(stT / 10) % 2 : 0;
    g.save(); g.scale(2, 2);
    Art.drawPlayer(g, c, (cx - 16) / 2, (60 - bob * 2) / 2, 1, on && Math.floor(stT / 20) % 2 ? 'run' : 'idle', stT, {});
    g.restore();
    Art.text(g, CHARS[c].name, cx, 130, on ? '#fff' : '#889', 'center');
  });
  const C = CHARS[CH_LIST[sel]];
  panel(8, 158, 240, 58);
  Art.text(g, C.tag, 128, 164, '#5ce430', 'center');
  C.bio.forEach((l, i) => Art.text(g, l, 128, 178 + i * 10, '#fff', 'center', false));
  Art.text(g, (TOUCH ? 'TAP A HERO, TAP AGAIN: GO' : '< >  CHOOSE     ENTER  GO'), 128, 224, blink(30) ? '#fff' : '#889', 'center');
}

// ---------- level intro ----------
function updIntro() {
  if (stT > 25 && hit(CONFIRM)) { Sound.sfx('start'); G.scoreAtLevelStart = G.score; startLevel(G.level); setState('play'); }
}
function drawIntro() {
  const L = LEVELS[G.level], th = THEMES[L.theme];
  drawScenery(L.theme, stT * 0.5, true);
  g.fillStyle = '#000000b0'; g.fillRect(0, 0, 256, 240);
  Art.bigText(g, 'WORLD ' + (G.level + 1), 128, 16, '#ff4030', 'center', 16);
  const nm = th.name;
  Art.bigText(g, nm, 128, 40, '#ffc000', 'center', nm.length > 13 ? 14 : 16);
  Art.text(g, th.sub, 128, 64, '#8fe3ff', 'center');
  panel(12, 80, 232, 84);
  Art.text(g, L.quest, 128, 88, '#ffc000', 'center');
  wrap(L.story, 27).forEach((l, i) => Art.text(g, l, 128, 104 + i * 11, '#fff', 'center', false));
  g.drawImage(Art.heads[G.ch], 0, 0, 16, 20, 16, 174, 24, 30);
  const q = CHARS[G.ch].name + ': "' + HERO_QUOTES[G.level] + '"';
  wrap(q, 24).forEach((l, i) => Art.text(g, l, 48, 178 + i * 11, '#fff', 'left'));
  Art.text(g, 'BOSS: ' + L.bossName, 128, 212, '#ff8080', 'center');
  if (stT > 25 && blink(30)) Art.text(g, PROMPT(), 128, 226, '#fff', 'center');
}

// ---------- level clear ----------
function updClear() {
  if (stT > 120 && hit(CONFIRM)) {
    Sound.sfx('select');
    if (G.level < LEVELS.length - 1) { G.level++; setState('intro'); } else setState('ending');
  }
}
function drawClear() {
  const L = LEVELS[G.level];
  drawScenery(L.theme, stT * 0.4, true);
  g.fillStyle = '#000000b8'; g.fillRect(0, 0, 256, 240);
  Art.bigText(g, 'WORLD ' + (G.level + 1) + ' CLEAR!', 128, 10, '#5ce430', 'center', 16);
  Art.text(g, 'FLOW RESTORED TO ' + THEMES[L.theme].name, 128, 32, '#fff', 'center', false);
  panel(8, 46, 240, 62, '#c01010');
  Art.text(g, 'SERVICE UNLOCKED!', 128, 52, '#ffc000', 'center');
  Art.text(g, L.service.title, 128, 64, '#8fe3ff', 'center');
  L.service.lines.forEach((l, i) => Art.text(g, l, 128, 80 + i * 9, '#fff', 'center', false));
  const ci = clearInfo;
  const row = (y, a, b, c) => { Art.text(g, a, 28, y, '#c0c0d0'); Art.text(g, b, 184, y, c || '#fff', 'right'); };
  const show = Math.min(5, Math.floor(stT / 14));
  if (show > 0) row(118, 'OIL DROPS', ci.oil + '/' + ci.oilTotal);
  if (show > 1) row(130, 'QUEST SCROLLS', ci.scrolls + '/3', ci.scrolls === 3 ? '#5ce430' : '#fff');
  if (show > 2) row(142, 'ENEMIES', String(ci.kills));
  if (show > 3) row(154, 'TIME', fmtTime(ci.sec * 60));
  if (show > 4) { Art.text(g, '+' + ci.oilBonus, 232, 118, '#ffc000', 'right'); Art.text(g, '+' + ci.timeBonus, 232, 154, '#ffc000', 'right'); }
  if (show > 4) Art.text(g, 'SCORE ' + String(G.score).padStart(7, '0'), 128, 172, '#fff', 'center');
  Art.text(g, 'GOLDEN BARREL PIECES', 128, 188, '#ffc000', 'center', false);
  for (let i = 0; i < 6; i++) {
    const have = i <= G.level;
    Art.R(g, '#000', 62 + i * 22, 198, 16, 18); Art.R(g, have ? '#ffc000' : '#2a2a3a', 63 + i * 22, 199, 14, 16);
    if (have) { Art.R(g, '#c88a00', 63 + i * 22, 203, 14, 2); Art.R(g, '#c88a00', 63 + i * 22, 210, 14, 2); Art.logo(g, 70 + i * 22, 207, 3); }
  }
  if (stT > 120 && blink(30)) Art.text(g, PROMPT(), 128, 224, '#fff', 'center');
}

// ---------- game over ----------
function updGameOver() {
  if (stT > 30 && hit(CONFIRM)) { G.lives = 3; G.score = G.scoreAtLevelStart; startLevel(G.level); setState('play'); }
  if (hit(['Escape'])) { setState('title'); }
}
function drawGameOver() {
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 240);
  Art.bigText(g, 'GAME OVER', 128, 60, '#ff3030', 'center', 24);
  Art.text(g, 'THE FLOW STOPPED...', 128, 104, '#fff', 'center');
  Art.text(g, 'BUT PETROFLOW NEVER QUITS!', 128, 120, '#ffc000', 'center');
  g.drawImage(Art.heads[G.ch], 0, 0, 16, 20, 112, 140, 32, 40);
  if (blink(30)) Art.text(g, (TOUCH ? 'TAP: CONTINUE WORLD ' : 'ENTER: CONTINUE WORLD ') + (G.level + 1), 128, 196, '#fff', 'center');
  if (!TOUCH) Art.text(g, 'ESC: TITLE', 128, 212, '#889', 'center');
}

// ---------- ending ----------
function creditLines() {
  return [
    ['big', 'FLOW RESTORED!', '#ffc000'], ['', ''], ['t', 'DR. DOWNTIME IS SHUT IN.', '#fff'], ['t', 'THE GOLDEN BARREL IS HOME.', '#fff'], ['t', 'THE PIPELINES RUN FREE!', '#fff'], ['', ''], ['', ''],
    ['t', 'CAST', '#ff4030'], ['', ''],
    ['head', 'zach'], ['t', 'ZACH', '#ffc000'], ['t', 'FLOW ASSURANCE CONSULTANT', '#fff'], ['t', 'SIMULATION ENGINEER', '#fff'], ['t', 'DIGITAL TWIN APPLICATIONS', '#fff'], ['', ''],
    ['head', 'geir'], ['t', 'GEIR', '#ffc000'], ['t', '37 YEARS IN FLOW ASSURANCE', '#fff'], ['t', 'MULTIPHASE FLOW SPECIALIST', '#fff'], ['', ''],
    ['head', 'mack'], ['t', 'MACK', '#ffc000'], ['t', 'LED PIPESIM 10+ YEARS', '#fff'], ['t', 'SPE DISTINGUISHED LECTURER', '#fff'], ['', ''], ['', ''],
    ['logo'], ['t', 'PETROFLOW, INC.', '#ffc000'], ['t', 'EST. 2001', '#fff'], ['t', '150+ FIELDS AND ASSETS', '#fff'], ['t', '20+ CUSTOMERS', '#fff'], ['t', '25 YEARS AVG EXPERIENCE', '#fff'], ['', ''],
    ['t', 'WHAT WE DO', '#ff4030'], ['', ''],
    ['t', 'WELL + PIPELINE SIMULATION', '#8fe3ff'], ['t', 'FLUID + PVT MODELING', '#8fe3ff'], ['t', 'CHEMICAL INJECTION STRATEGY', '#8fe3ff'], ['t', 'LIFE OF FIELD SIMULATION', '#8fe3ff'],
    ['t', 'TOPSIDES PROCESS SIMULATION', '#8fe3ff'], ['t', 'WELL CONTROL', '#8fe3ff'], ['t', 'REAL-TIME OPS SUPPORT', '#8fe3ff'], ['t', 'HYDRAULIC CONTROL ANALYSIS', '#8fe3ff'], ['', ''], ['', ''],
    ['t', 'GOT A FLOW PROBLEM?', '#ffc000'], ['t', 'CONTACTUS@PETROFLOW.COM', '#fff'], ['t', 'WWW.PETROFLOW.COM', '#fff'], ['', ''], ['', ''],
    ['t', 'FINAL SCORE ' + String(G.score).padStart(7, '0'), '#5ce430'], ['t', 'TOTAL TIME ' + fmtTime(G.totalFrames), '#5ce430'], ['', ''],
    ['t', 'NO SLUGS WERE HARMED', '#889'], ['t', 'IN THE MAKING OF THIS GAME.', '#889'], ['', ''], ['', ''],
    ['big', 'THANKS FOR PLAYING!', '#ffc000']
  ];
}
let credits = null;
function updEnding() {
  if (stT === 1) credits = creditLines();
  if (stT % 20 === 0 && stT < 600) {
    const x = 30 + Math.random() * 196, y = 30 + Math.random() * 90, c = ['#ffc000', '#ff4030', '#8fe3ff', '#5ce430', '#fff'][Math.floor(Math.random() * 5)];
    puff(x, y, c, 22, 2.2);
  }
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life--; }
  parts = parts.filter(p => p.life > 0);
  const end = credits ? credits.length * 14 + 300 : 0;
  if (stT > end + 120 && hit(CONFIRM)) { setState('title'); }
}
function drawEnding() {
  drawScenery(5, stT * 0.3, true);
  g.fillStyle = '#00000050'; g.fillRect(0, 0, 256, 240);
  for (const p of parts) Art.R(g, p.c, p.x, p.y, 2, 2);
  ['zach', 'geir', 'mack'].forEach((c, i) => { const hop = Math.abs(Math.sin((stT + i * 12) * 0.12)) * 8; Art.drawPlayer(g, c, 40 + i * 70, 160 - hop, 1, 'jump', stT, {}); });
  if (stT < 120) Art.bigText(g, 'WELL CAPPED!', 128, 90, '#5ce430', 'center', 16);
  if (!credits || stT < 120) return;
  g.fillStyle = '#000000' + (stT < 150 ? '60' : 'c0'); g.fillRect(0, 0, 256, 240);
  let y = 250 - Math.max(0, stT - 120) * 0.45;
  for (const ln of credits) {
    if (y > -30 && y < 244) {
      if (ln[0] === 'big') Art.bigText(g, ln[1], 128, y, ln[2], 'center', ln[1].length > 14 ? 12 : 16);
      else if (ln[0] === 't') Art.text(g, ln[1], 128, y, ln[2], 'center');
      else if (ln[0] === 'head') g.drawImage(Art.heads[ln[1]], 0, 0, 16, 20, 112, y - 4, 32, 40);
      else if (ln[0] === 'logo') Art.logo(g, 128, y + 14, 16);
    }
    y += ln[0] === 'head' ? 42 : (ln[0] === 'logo' ? 34 : (ln[0] === 'big' ? 22 : 14));
  }
  if (y < 120) { Art.bigText(g, 'THE END', 128, 100, '#ff4030', 'center', 24); if (blink(30)) Art.text(g, PROMPT(), 128, 140, '#fff', 'center'); }
}

// ---------- pause ----------
function drawPause() {
  g.fillStyle = '#000000c0'; g.fillRect(0, 0, 256, 240);
  Art.bigText(g, 'PAUSED', 128, 40, '#ffc000', 'center', 24);
  const l = TOUCH ? [['LEFT PAD', 'MOVE'], ['A', 'JUMP'], ['B', 'SHOOT'], ['HOLD AIM + B', 'SHOOT UP']] : [['ARROWS / WASD', 'MOVE'], ['Z / SPACE', 'JUMP'], ['X / J / K', 'SHOOT'], ['UP + X', 'AIM UP'], ['P / ESC', 'PAUSE'], ['M', 'MUTE'], ['F', 'FULLSCREEN']];
  l.forEach((s, i) => { Art.text(g, s[0], 28, 92 + i * 12, '#ffc000'); Art.text(g, s[1], 148, 92 + i * 12, '#fff'); });
  Art.text(g, 'STOMP ENEMIES OR SHOOT THEM', 128, 186, '#8fe3ff', 'center', false);
  Art.text(g, 'FIND 3 QUEST SCROLLS PER WORLD', 128, 198, '#8fe3ff', 'center', false);
  if (blink(30)) Art.text(g, (TOUCH ? 'TAP TO RESUME' : 'PRESS P TO RESUME'), 128, 218, '#fff', 'center');
}

// ---------- main loop ----------
// secret: number keys 1-6 jump straight to that world
function secretWarp() {
  for (let n = 1; n <= LEVELS.length; n++) {
    if (!hit(['Digit' + n, 'Numpad' + n])) continue;
    if (state === 'boot') return;
    if (G.lives <= 0) G.lives = 3;
    paused = false; G.level = n - 1; G.scoreAtLevelStart = G.score;
    startLevel(G.level); setState('play'); Sound.sfx('start');
    return;
  }
}

function warpNext() {
  paused = false;
  if (G.level >= LEVELS.length - 1) { setState('ending'); return; }
  G.level++; G.scoreAtLevelStart = G.score;
  startLevel(G.level); setState('play'); Sound.sfx('start');
}

function step() {
  pollPad();
  secretWarp();
  if (hit(['KeyM'])) Sound.toggleMute();
  stT++;
  if (state === 'play') {
    if (hit(['KeyP', 'Escape'])) paused = !paused;
    if (paused) return;
    if (DEBUG.god && pl) { pl.inv = 99; pl.hp = pl.max; }
    updPlay();
    return;
  }
  paused = false;
  if (state === 'title' && audioReady) Sound.play('title');
  if (state === 'title') updTitle();
  else if (state === 'story') updStory();
  else if (state === 'select') updSelect();
  else if (state === 'intro') updIntro();
  else if (state === 'clear') updClear();
  else if (state === 'gameover') updGameOver();
  else if (state === 'ending') updEnding();
}
function render() {
  if (state === 'play') { drawPlay(); if (paused) drawPause(); return; }
  if (state === 'title') drawTitle();
  else if (state === 'story') drawStory();
  else if (state === 'select') drawSelect();
  else if (state === 'intro') drawIntro();
  else if (state === 'clear') drawClear();
  else if (state === 'gameover') drawGameOver();
  else if (state === 'ending') drawEnding();
}

let last = 0, acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { step(); for (const k in pressed) delete pressed[k]; acc -= 1000 / 60; }
  render();
  requestAnimationFrame(loop);
}

async function boot() {
  try {
    const f = new FontFace('PS2P', 'url(' + FONT_DATA + ')');
    await f.load(); document.fonts.add(f);
  } catch (e) { console.warn('font failed', e); }
  Art.init();
  const q = new URLSearchParams(location.search);
  if (q.get('god')) DEBUG.god = true;
  if (q.get('char') && CHARS[q.get('char')]) G.ch = q.get('char');
  if (q.get('level')) { G.level = Math.max(0, Math.min(5, parseInt(q.get('level'), 10) - 1)); startLevel(G.level); state = 'play'; if (q.get('boss')) { pl.x = lv.arenaCol * 16 + 20; cam = lv.arenaCol * 16 - 100; } }
  else setState('title');
  const go = () => { audioReady = true; Sound.resume(); };
  addEventListener('keydown', go); addEventListener('pointerdown', go); addEventListener('touchend', go); addEventListener('click', go);
  last = performance.now();
  requestAnimationFrame(loop);
}
boot();
