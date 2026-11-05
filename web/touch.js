// Mobile support: on-screen controls, tap-to-continue menus, responsive scaling.
let TOUCH = matchMedia('(pointer: coarse)').matches || /[?&]touch=1/.test(location.search);

(function () {
  const canvas = document.getElementById('screen');
  const ui = document.createElement('div');
  ui.id = 'touch';
  ui.innerHTML =
    '<div id="dpad"><div class="arrow l">&#9664;</div><div class="arrow r">&#9654;</div></div>' +
    '<div id="tbtns">' +
    '<div class="tb" id="tb-up" data-k="ArrowUp">&#9650;<small>AIM</small></div>' +
    '<div class="tb" id="tb-shoot" data-k="KeyX">B<small>SHOOT</small></div>' +
    '<div class="tb" id="tb-jump" data-k="KeyZ">A<small>JUMP</small></div>' +
    '</div>' +
    '<div class="tb sm" id="tb-pause" data-k="KeyP">II</div>' +
    '<div class="tb sm" id="tb-mute">&#9835;</div>';
  document.body.appendChild(ui);

  const pulse = code => { setKey(code, true); setTimeout(() => { keys[code] = false; }, 60); };

  // held buttons (jump, shoot, aim)
  ui.querySelectorAll('.tb[data-k]').forEach(el => {
    const code = el.dataset.k;
    const press = e => { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('on'); setKey(code, true); Sound.resume(); };
    const release = e => { e.preventDefault(); el.classList.remove('on'); keys[code] = false; };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
  });
  document.getElementById('tb-mute').addEventListener('pointerdown', e => { e.preventDefault(); Sound.resume(); Sound.toggleMute(); });

  // d-pad: one pad, finger can slide between left and right
  const dpad = document.getElementById('dpad');
  const setDir = (x, active) => {
    const r = dpad.getBoundingClientRect();
    const rel = (x - r.left) / r.width - 0.5;
    keys.ArrowLeft = active && rel < -0.08;
    keys.ArrowRight = active && rel > 0.08;
    if (keys.ArrowLeft && !prevDir.l) pressed.ArrowLeft = true;
    if (keys.ArrowRight && !prevDir.r) pressed.ArrowRight = true;
    prevDir.l = keys.ArrowLeft; prevDir.r = keys.ArrowRight;
    dpad.classList.toggle('left', keys.ArrowLeft); dpad.classList.toggle('right', keys.ArrowRight);
  };
  const prevDir = { l: false, r: false };
  dpad.addEventListener('pointerdown', e => { e.preventDefault(); dpad.setPointerCapture(e.pointerId); Sound.resume(); setDir(e.clientX, true); });
  dpad.addEventListener('pointermove', e => { if (dpad.hasPointerCapture(e.pointerId)) setDir(e.clientX, true); });
  const dpadUp = e => { setDir(0, false); };
  dpad.addEventListener('pointerup', dpadUp);
  dpad.addEventListener('pointercancel', dpadUp);
  dpad.addEventListener('lostpointercapture', dpadUp);

  // tapping the screen drives menus
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    Sound.resume();
    if (e.pointerType === 'mouse' && !TOUCH) return;
    if (state === 'play') { if (paused) pulse('KeyP'); return; }
    if (state === 'select') {
      const x = (e.clientX - canvas.getBoundingClientRect().left) / canvas.getBoundingClientRect().width * 256;
      const i = Math.max(0, Math.min(2, Math.floor(x / (256 / 3))));
      if (i !== sel) { sel = i; Sound.sfx('select'); return; }
    }
    if (state === 'gameover' && stT > 30) { pulse('Enter'); return; }
    pulse('Enter');
  });

  function showTouch() { TOUCH = true; document.body.classList.add('touch'); fit(); }
  window.addEventListener('touchstart', () => { if (!TOUCH) showTouch(); }, { passive: true });
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());

  // auto-pause and silence when the tab or app goes to the background
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (state === 'play') paused = true; Sound.suspend(); }
    else Sound.resume();
  });

  window.fit = function () {
    const c = canvas, w = innerWidth, h = innerHeight;
    if (!TOUCH) {
      const s = Math.max(1, Math.floor(Math.min(w / 256, (h - 24) / 240)));
      c.style.width = 256 * s + 'px'; c.style.height = 240 * s + 'px';
      document.body.classList.remove('portrait', 'landscape');
      return;
    }
    const portrait = h > w;
    document.body.classList.toggle('portrait', portrait);
    document.body.classList.toggle('landscape', !portrait);
    const availH = portrait ? Math.max(120, h - Math.min(230, h * 0.38)) : h;
    const s = Math.min(w / 256, availH / 240);
    c.style.width = Math.floor(256 * s) + 'px'; c.style.height = Math.floor(240 * s) + 'px';
  };
  if (TOUCH) document.body.classList.add('touch');
  addEventListener('resize', fit);
  addEventListener('orientationchange', () => setTimeout(fit, 150));
  fit();
})();
