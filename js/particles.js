/* ==========================================================================
   particles.js — the shimmer behind the whole page: glowing dust in three
   depth layers that drifts, twinkles and brightens near the pointer, a few
   four-point sparkles that flare now and then, and a rare shooting star.
   One 2D canvas inside .ambient, pre-rendered glow sprites (no per-frame
   gradients), paused while the tab is hidden. Reduced motion: one still frame.
   Classic script (defer), works from file:// too.
   ========================================================================== */
(function () {
  'use strict';
  const amb = document.querySelector('.ambient');
  if (!amb) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 760px)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'amb-particles';
  canvas.setAttribute('aria-hidden', 'true');
  const beam = amb.querySelector('.amb-beam');
  amb.insertBefore(canvas, beam || null);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const DPR = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.25);
  const N = small ? 60 : 150;
  const SPARKS = small ? 3 : 7;

  /* ---- glow sprites, drawn once ---- */
  const sprite = (rgb, core) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, `rgba(255,255,255,${core})`);
    rg.addColorStop(0.12, `rgba(${rgb},0.95)`);
    rg.addColorStop(0.35, `rgba(${rgb},0.28)`);
    rg.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    return c;
  };
  const SPR = [sprite('34,211,238', 0.9), sprite('165,243,252', 1), sprite('125,211,252', 0.85), sprite('255,255,255', 1), sprite('45,212,191', 0.8)];
  const WEIGHTS = [0, 0, 0, 1, 1, 1, 2, 2, 3, 4];

  /* ---- particles ---- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const dust = Array.from({ length: N }, () => {
    const z = Math.random();                                   // 0 far .. 1 near
    return {
      x: Math.random(), y: Math.random(), z,
      r: 0.5 + z * z * 2.2 + (Math.random() < 0.06 ? 1.6 : 0),  // a few bigger ones
      s: SPR[WEIGHTS[(Math.random() * WEIGHTS.length) | 0]],
      a: 0.25 + z * 0.55,
      tw: rand(0.4, 1.6), ph: rand(0, Math.PI * 2),
      vy: rand(0.004, 0.014) * (0.4 + z), vx: rand(-0.004, 0.004),
    };
  });
  const sparks = Array.from({ length: SPARKS }, () => ({ x: Math.random(), y: Math.random(), per: rand(5, 11), off: rand(0, 11), size: rand(10, 22) }));
  let meteor = null, nextMeteor = performance.now() + rand(4000, 8000);

  /* ---- size ---- */
  let W = 0, H = 0;
  const resize = () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    draw(performance.now(), 0);                                // resizing clears the canvas: repaint at once, no blank frame
  };

  /* ---- pointer + scroll ---- */
  let px = -9999, py = -9999, mx = 0, my = 0, smx = 0, smy = 0, sy = 0;
  if (finePointer) {
    addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; px = e.clientX; py = e.clientY; mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5; }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { px = py = -9999; mx = my = 0; });
  }
  addEventListener('scroll', () => { sy = window.scrollY; }, { passive: true });

  const star4 = (x, y, size, alpha) => {
    ctx.globalAlpha = alpha;
    const l = size * 2.2;
    let g = ctx.createLinearGradient(x - l, y, x + l, y);
    g.addColorStop(0, 'rgba(165,243,252,0)'); g.addColorStop(0.5, 'rgba(236,254,255,0.95)'); g.addColorStop(1, 'rgba(165,243,252,0)');
    ctx.fillStyle = g; ctx.fillRect(x - l, y - 0.7, l * 2, 1.4);
    g = ctx.createLinearGradient(x, y - l, x, y + l);
    g.addColorStop(0, 'rgba(165,243,252,0)'); g.addColorStop(0.5, 'rgba(236,254,255,0.95)'); g.addColorStop(1, 'rgba(165,243,252,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 0.7, y - l, 1.4, l * 2);
    ctx.drawImage(SPR[1], x - size, y - size, size * 2, size * 2);
  };

  function draw(now, dt) {
    const t = now / 1000;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    smx += (mx - smx) * 0.04; smy += (my - smy) * 0.04;

    for (const p of dust) {
      if (dt) { p.y -= p.vy * dt; p.x += (p.vx + Math.sin(t * 0.3 + p.ph) * 0.002) * dt; if (p.y < 0) p.y += 1; if (p.x < -0.05) p.x = 1.05; else if (p.x > 1.05) p.x = -0.05; }
      let x = p.x * W - smx * 30 * p.z;
      const M = 32, HM = H + 2 * M;                          // wrap only while fully off-screen
      let y = ((p.y * HM - sy * 0.05 * p.z - smy * 20 * p.z) % HM + HM) % HM - M;
      const tw = reduceMotion ? 0.8 : 0.35 + 0.65 * Math.pow(Math.sin(t * p.tw + p.ph) * 0.5 + 0.5, 2);
      let a = p.a * tw, size = p.r * 7;
      const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
      if (d2 < 22500) { const k = 1 - Math.sqrt(d2) / 150; a = Math.min(1, a + k * 0.6); size *= 1 + k * 0.8; x += dx * k * 0.08; y += dy * k * 0.08; }
      ctx.globalAlpha = a;
      ctx.drawImage(p.s, x - size / 2, y - size / 2, size, size);
    }

    if (!reduceMotion) {
      for (const s of sparks) {
        const phase = ((t + s.off) % s.per) / s.per;          // 0..1
        const k = phase < 0.12 ? Math.sin((phase / 0.12) * Math.PI) : 0;   // a short flare, then rest
        if (k > 0.01) {
          s.moved = false;
          star4(s.x * W, ((s.y * H - sy * 0.02) % H + H) % H, s.size * (0.6 + k * 0.6), k);
        } else if (!s.moved) { s.x = Math.random(); s.y = Math.random(); s.moved = true; }   // move only once it has gone dark
      }
      if (!meteor && now > nextMeteor) {
        const fromLeft = Math.random() < 0.5;
        meteor = { x: fromLeft ? rand(-0.1, 0.4) * W : rand(0.6, 1.1) * W, y: rand(-0.05, 0.3) * H, vx: (fromLeft ? 1 : -1) * rand(700, 1000), vy: rand(260, 420), life: 0, max: rand(0.9, 1.4) };
      }
      if (meteor) {
        meteor.life += dt; meteor.x += meteor.vx * dt; meteor.y += meteor.vy * dt;
        const k = Math.sin(Math.min(1, meteor.life / meteor.max) * Math.PI);
        const len = 0.16, tx = meteor.x - meteor.vx * len, ty = meteor.y - meteor.vy * len;
        const g = ctx.createLinearGradient(meteor.x, meteor.y, tx, ty);
        g.addColorStop(0, 'rgba(236,254,255,0.9)'); g.addColorStop(0.25, 'rgba(34,211,238,0.35)'); g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.globalAlpha = k; ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(meteor.x, meteor.y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.drawImage(SPR[3], meteor.x - 6, meteor.y - 6, 12, 12);
        if (meteor.life > meteor.max) { meteor = null; nextMeteor = now + rand(5000, 11000); }
      }
    }
    ctx.globalAlpha = 1;
  }

  let running = false, raf = 0, last = 0, woke = performance.now();
  const wake = () => { woke = performance.now(); };
  ['scroll', 'pointermove', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, wake, { passive: true }));
  const frame = now => {
    if (!running) return; raf = requestAnimationFrame(frame);
    const gap = small || (!meteor && now - woke > 5000) ? 30 : 12;   // phones and idle readers ~30 fps
    if (last && now - last < gap) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
    draw(now, dt);
  };
  const start = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  addEventListener('resize', resize, { passive: true });
  resize();
  if (reduceMotion) return;
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();
})();
