/* ==========================================================================
   bg-light.js — the light-mode backdrop. One canvas, one slow 3D scene:
   a silk wave sheet in perspective, wireframe crystals turning in space and
   glass beads drifting in depth. Runs only while html[data-theme="light"].
   ========================================================================== */
(function () {
  'use strict';
  var root = document.documentElement;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var TAU = Math.PI * 2;
  var cv = null, ctx = null, W = 1, H = 1, DPR = 1, raf = 0, small = false, frame = 0, start = 0;
  var beads = [], crystals = [], sprites = null, sheetGrad = null, seed = 11;

  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

  /* ---- a glass bead, drawn once: clear middle, tinted rim, highlight ---- */
  function bead(rgb) {
    var S = 160, c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d'), r = S / 2 - 6, cx = S / 2, cy = S / 2, grd;
    grd = g.createRadialGradient(cx, cy + r * 0.1, r * 0.15, cx, cy, r);
    grd.addColorStop(0, 'rgba(' + rgb + ',0.03)'); grd.addColorStop(0.7, 'rgba(' + rgb + ',0.10)'); grd.addColorStop(0.93, 'rgba(' + rgb + ',0.30)'); grd.addColorStop(1, 'rgba(' + rgb + ',0.50)');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    grd = g.createRadialGradient(cx - r * 0.38, cy - r * 0.42, 0, cx - r * 0.38, cy - r * 0.42, r * 0.55);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    grd = g.createRadialGradient(cx + r * 0.3, cy + r * 0.45, 0, cx + r * 0.3, cy + r * 0.45, r * 0.5);
    grd.addColorStop(0, 'rgba(' + rgb + ',0.22)'); grd.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(' + rgb + ',0.35)'; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
    return c;
  }

  /* ---- an icosahedron: 12 corners, 30 edges ---- */
  var P = (1 + Math.sqrt(5)) / 2;
  var ICO = [[-1, P, 0], [1, P, 0], [-1, -P, 0], [1, -P, 0], [0, -1, P], [0, 1, P], [0, -1, -P], [0, 1, -P], [P, 0, -1], [P, 0, 1], [-P, 0, -1], [-P, 0, 1]];
  var EDGES = (function () {
    var e = [], i, j, d;
    for (i = 0; i < 12; i++) for (j = i + 1; j < 12; j++) {
      d = Math.pow(ICO[i][0] - ICO[j][0], 2) + Math.pow(ICO[i][1] - ICO[j][1], 2) + Math.pow(ICO[i][2] - ICO[j][2], 2);
      if (Math.abs(d - 4) < 0.01) e.push([i, j]);
    }
    return e;
  })();
  var ICO_R = Math.sqrt(1 + P * P);

  function build() {
    var i;
    seed = 11; beads = []; crystals = [];
    var nb = small ? 5 : 10;
    for (i = 0; i < nb; i++) beads.push({ x: rnd(), y: rnd(), z: 0.35 + rnd() * 0.65, vx: (rnd() - 0.5) * 0.004, vy: -0.002 - rnd() * 0.004, ph: rnd() * TAU, tint: i % 3 === 0 ? 1 : 0 });
    crystals = small
      ? [{ x: 0.84, y: 0.16, r: 54, sx: 0.11, sy: 0.17, par: 0.05 }, { x: 0.12, y: 0.78, r: 40, sx: -0.14, sy: 0.1, par: 0.09 }]
      : [{ x: 0.965, y: 0.2, r: 130, sx: 0.09, sy: 0.14, par: 0.04 }, { x: 0.03, y: 0.72, r: 96, sx: -0.12, sy: 0.09, par: 0.08 }, { x: 0.6, y: 0.93, r: 56, sx: 0.15, sy: -0.11, par: 0.12 }];
  }

  function size() {
    if (!cv) return;
    W = Math.max(1, window.innerWidth); H = Math.max(1, window.innerHeight);
    small = W < 700;
    DPR = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    sheetGrad = ctx.createLinearGradient(0, 0, W, 0);
    sheetGrad.addColorStop(0, 'rgb(124,58,237)'); sheetGrad.addColorStop(0.5, 'rgb(219,39,119)'); sheetGrad.addColorStop(1, 'rgb(109,40,217)');
    if (!sprites) sprites = [bead('124,58,237'), bead('219,39,119')];
    build();
  }

  /* ---- the silk sheet: a ground plane of waves, seen in perspective ---- */
  function sheet(t, scroll) {
    var COLS = small ? 34 : 64, ROWS = small ? 16 : 26, X = 34, ZN = 11, ZF = 64;
    var f = H * 0.95, horizon = H * 0.56, camY = 5.2, r, c, z, x, y, k, a, sx, sy;
    var tt = t * 0.32 + scroll * 0.0016;
    ctx.strokeStyle = sheetGrad; ctx.lineWidth = 1.15;
    for (r = 0; r < ROWS; r++) {
      k = r / (ROWS - 1); z = ZN + (ZF - ZN) * k * k;                 // rows bunch up near the viewer
      a = Math.pow(1 - k, 1.25) * (small ? 0.32 : 0.5);
      if (a < 0.012) continue;
      ctx.globalAlpha = a; ctx.beginPath();
      for (c = 0; c < COLS; c++) {
        x = -X + 2 * X * (c / (COLS - 1));
        y = 1.15 * Math.sin(x * 0.19 + tt * 1.6) * Math.cos(z * 0.13 - tt) + 0.7 * Math.sin(x * 0.07 - z * 0.09 + tt * 0.8);
        sx = W / 2 + (x / z) * f; sy = horizon + ((camY - y) / z) * f;
        if (c === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    // a few lines running away from the viewer turn the waves into a mesh
    var step = small ? 4 : 5;
    for (c = 0; c < COLS; c += step) {
      x = -X + 2 * X * (c / (COLS - 1));
      ctx.globalAlpha = 0.13; ctx.beginPath();
      for (r = 0; r < ROWS - 3; r++) {
        k = r / (ROWS - 1); z = ZN + (ZF - ZN) * k * k;
        y = 1.15 * Math.sin(x * 0.19 + tt * 1.6) * Math.cos(z * 0.13 - tt) + 0.7 * Math.sin(x * 0.07 - z * 0.09 + tt * 0.8);
        sx = W / 2 + (x / z) * f; sy = horizon + ((camY - y) / z) * f;
        if (r === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ---- wireframe crystals: rotate, project, draw the near edges stronger ---- */
  function crystal(o, t, scroll) {
    var ay = t * o.sy, ax = t * o.sx, cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    var pts = [], i, v, x, y, z, y2, z2, d;
    var span = H + o.r * 4, py = (((o.y * H - scroll * o.par) % span) + span) % span - o.r * 2, px = o.x * W;
    for (i = 0; i < 12; i++) {
      v = ICO[i]; x = v[0] * cy + v[2] * sy; z = -v[0] * sy + v[2] * cy; y = v[1];
      y2 = y * cx - z * sx; z2 = y * sx + z * cx;
      d = 3.4 / (3.4 + z2 / ICO_R);
      pts.push([px + (x / ICO_R) * o.r * d, py + (y2 / ICO_R) * o.r * d, z2 / ICO_R]);
    }
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgb(109,40,217)';
    for (i = 0; i < EDGES.length; i++) {
      var a = pts[EDGES[i][0]], b = pts[EDGES[i][1]], depth = (a[2] + b[2]) / 2;       // -1 near .. 1 far
      ctx.globalAlpha = 0.06 + (1 - (depth + 1) / 2) * 0.17;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.fillStyle = 'rgb(190,24,93)';
    for (i = 0; i < 12; i++) { ctx.globalAlpha = 0.10 + (1 - (pts[i][2] + 1) / 2) * 0.22; ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], 1.6, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  function draw(now) {
    var t = (now - start) / 1000, scroll = window.pageYOffset || 0, i, b, s, x, y;
    ctx.clearRect(0, 0, W, H);
    sheet(t, scroll);
    for (i = 0; i < crystals.length; i++) crystal(crystals[i], t, scroll);
    for (i = 0; i < beads.length; i++) {
      b = beads[i];
      x = (((b.x + b.vx * t) % 1.2) + 1.2) % 1.2 - 0.1;
      y = (((b.y + b.vy * t - scroll * 0.00018 * b.z) % 1.3) + 1.3) % 1.3 - 0.15;
      s = (small ? 46 : 78) * b.z * (1 + 0.04 * Math.sin(t * 0.6 + b.ph));
      ctx.globalAlpha = 0.28 + b.z * 0.42;
      ctx.drawImage(sprites[b.tint], x * W - s / 2 + Math.sin(t * 0.25 + b.ph) * 14 * b.z, y * H - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (small && (frame++ & 1)) return;                                // phones: every second frame is plenty
    draw(now);
  }

  function isLight() { return root.getAttribute('data-theme') === 'light'; }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function sync() {
    stop();
    if (!isLight() || document.hidden) return;
    if (!cv) {
      cv = document.createElement('canvas'); cv.className = 'amb-light'; cv.setAttribute('aria-hidden', 'true');
      ctx = cv.getContext('2d'); if (!ctx) { cv = null; return; }
      document.body.insertBefore(cv, document.body.firstChild);
      start = performance.now();
    }
    size();
    if (still.matches) draw(start + 4000); else raf = requestAnimationFrame(loop);
  }

  function init() {
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('visibilitychange', sync);
    var rz = 0;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(sync, 160); });
    if (still.addEventListener) still.addEventListener('change', sync);
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
