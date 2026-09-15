/* ==========================================================================
   skills.js — turns the skills grid into a 3D orbit: tilted rings of glass
   cards (two on wide screens, three on phones) around a glowing core. It
   auto-rotates, pauses on hover or focus, drag or swipe to spin (with inertia),
   the pointer tilts the scene, filters dim other areas and spin the first match
   to the front, and a readout shows the card in front with its proof line.
   Runs only while the section is on screen. Classic script (defer).
   With reduced motion (or no JS) the cards stay a plain grid.
   ========================================================================== */
(function () {
  'use strict';
  const root = document.querySelector('.sk');
  if (!root) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const cards = $$('.sk-card', root);
  const buttons = $$('.sk-filters button', root);
  const CAT = { ai: 'AI & data', backend: 'Backend', frontend: 'Frontend & mobile', cloud: 'Cloud & DevOps', payments: 'Payments' };
  let orbit = null;

  /* ---- filters (also work in grid mode) ---- */
  const applyFilter = cat => {
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
    cards.forEach(c => { const dim = cat !== 'all' && c.dataset.cat !== cat; c.classList.toggle('is-dim', dim); c.tabIndex = dim ? -1 : 0; });
  };
  buttons.forEach(b => b.addEventListener('click', () => { applyFilter(b.dataset.cat); if (orbit) orbit.seekFirst(b.dataset.cat); }));

  if (reduceMotion || !cards.length) return;
  const stage = $('.sk-stage', root), scene = $('.sk-scene', root), paths = $$('.sk-path', root), hud = $('.sk-hud', root);
  if (!stage || !scene) return;
  root.classList.add('is-3d');

  const TAU = Math.PI * 2, ZS = 0.6;          // ZS flattens the depth so the front cards stay sharp
  const LAYOUTS = {
    2: [{ speed: 0.12, tilt: 0.15, y: -0.28 }, { speed: -0.09, tilt: 0.14, y: 0.26 }],
    3: [{ speed: 0.13, tilt: 0.2, y: -0.3 }, { speed: -0.1, tilt: 0.2, y: 0.02 }, { speed: 0.11, tilt: 0.2, y: 0.32 }],
  };
  let rings = [], count = 0;
  const indexOf = new Map(cards.map((c, i) => [c, i]));
  const state = cards.map(() => ({ o: -1, t: '' }));
  const buildRings = n => {
    const old = rings;
    rings = LAYOUTS[n].map((cfg, k) => ({ ...cfg, cards: [], rot: old[k] ? old[k].rot : k * 0.5 }));
    cards.forEach((c, i) => rings[i % n].cards.push(c));
    count = n;
    paths.forEach((p, k) => { p.style.display = k < n ? '' : 'none'; });
  };

  /* ---- sizes ---- */
  let W = 0, H = 0, R = 0;
  const measure = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    const narrow = W < 700;
    if ((narrow ? 3 : 2) !== count) buildRings(narrow ? 3 : 2);
    const half = (cards[0].offsetWidth || 180) / 2;
    R = narrow ? Math.max(90, (W / 2 - half - 10) / 1.08) : Math.max(160, Math.min(W * 0.37, 470));
    if (narrow) { const tilt = Math.max(0.2, Math.asin(Math.min(0.41, 50 / R))); rings.forEach(ring => { ring.tilt = tilt; }); }   // small stages: open the rings up so tiles do not bunch
    rings.forEach((ring, k) => {
      const p = paths[k]; if (!p) return;
      p.style.width = p.style.height = (2 * R) + 'px';
      p.style.margin = (-R) + 'px 0 0 ' + (-R) + 'px';
      const s = Math.sin(ring.tilt), c = Math.cos(ring.tilt) * ZS;
      p.style.transform = `matrix3d(1,0,0,0, 0,${s.toFixed(4)},${c.toFixed(4)},0, 0,0,1,0, 0,${(ring.y * H).toFixed(1)},0,1)`;
    });
  };
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage); else addEventListener('resize', measure);
  measure();

  /* ---- interaction ---- */
  let hover = false, focus = false, dragging = false, vel = 0, lastX = 0, moved = 0, lastT = 0;
  let ptrX = 0, ptrY = 0, tiltX = 0, tiltY = 0, seek = null, unfold = 0, started = false, hot = null;

  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
  stage.addEventListener('pointerleave', () => { hover = false; ptrX = ptrY = 0; setHot(null); });
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    if (finePointer) { ptrX = (e.clientX - r.left) / r.width - 0.5; ptrY = (e.clientY - r.top) / r.height - 0.5; }
    if (!dragging) return;
    const dx = e.clientX - lastX, now = performance.now();
    lastX = e.clientX; moved += Math.abs(dx);
    if (moved > 6 && !stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId);   // keep the drag even if the pointer leaves the stage
    const d = dx * (2.4 / Math.max(300, W));
    rings.forEach((ring, k) => { ring.rot += d * (k % 2 ? 0.8 : 1); });
    vel = d / Math.max(0.008, (now - lastT) / 1000); lastT = now;
    seek = null;
  });
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = true; moved = 0; lastX = e.clientX; lastT = performance.now(); vel = 0;
    stage.classList.add('is-drag');
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false; stage.classList.remove('is-drag');
    if (performance.now() - lastT > 90) vel = 0;          // held still before letting go: no fling
    vel = Math.max(-3, Math.min(3, vel));
  };
  addEventListener('pointerup', endDrag); addEventListener('pointercancel', () => { if (!dragging) return; endDrag(); vel = 0; });
  stage.addEventListener('click', e => { if (moved > 6 && e.detail) { e.preventDefault(); e.stopPropagation(); } moved = 0; }, true);   // a drag never opens a link; Enter always does
  stage.addEventListener('dragstart', e => e.preventDefault());

  function setHot(card) {
    if (hot === card) return;
    if (hot) hot.classList.remove('is-hot');
    hot = card;
    if (hot) { hot.classList.add('is-hot'); showHud(hot); }
  }
  cards.forEach(card => {
    card.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !dragging) setHot(card); });
    card.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && hot === card) setHot(null); });
    card.addEventListener('focus', () => { if (!card.matches(':focus-visible')) return; focus = true; seekTo(card); setHot(card); });   // a mouse press also focuses a link: ignore that
    card.addEventListener('blur', () => { focus = false; setHot(null); });
  });

  /* ---- bring a card to the front ---- */
  function seekTo(card) {
    const ring = rings.find(r => r.cards.includes(card)); if (!ring) return;
    const target = -(ring.cards.indexOf(card) / ring.cards.length) * TAU;
    const diff = ((target - ring.rot) % TAU + TAU * 1.5) % TAU - TAU / 2;   // the short way round
    seek = { ring, to: ring.rot + diff, until: performance.now() + 4500 };
    vel = 0;
  }
  orbit = { seekFirst: cat => { const m = x => cat === 'all' || x.dataset.cat === cat; const c = rings[count === 3 ? 1 : 0].cards.find(m) || cards.find(m); if (c) { seekTo(c); showHud(c); lastFront = performance.now() + 700; } } };

  /* ---- readout ---- */
  let hudCard = null;
  const hudLogo = hud && $('.sk-logo img', hud), hudName = hud && $('b', hud), hudCat = hud && $('.sk-hud-cat', hud), hudText = hud && $('p', hud), hudIdx = hud && $('.sk-hud-idx', hud);
  function showHud(card) {
    if (!hud || card === hudCard) return;
    hudCard = card;
    const img = $('img', card);
    if (hudLogo && img) hudLogo.src = img.getAttribute('src');
    if (hudName) hudName.textContent = $('b', card).textContent;
    if (hudCat) hudCat.textContent = CAT[card.dataset.cat] || '';
    if (hudText) hudText.textContent = $('small', card).textContent;
    if (hudIdx) hudIdx.textContent = String(indexOf.get(card) + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
    hud.classList.remove('is-swap'); void hud.offsetWidth; hud.classList.add('is-swap');
  }

  /* ---- frame ---- */
  let running = false, raf = 0, last = 0, inView = false, lastFront = 0;
  const frame = now => {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
    const f = dt * 60;
    const paused = hover || focus || dragging;
    unfold += (1 - unfold) * (1 - Math.pow(0.95, f));

    if (seek) {
      seek.ring.rot += (seek.to - seek.ring.rot) * (1 - Math.pow(0.9, f));
      if (Math.abs(seek.to - seek.ring.rot) < 0.002 || now > seek.until) seek = null;
    }
    if (!dragging) {
      vel *= Math.pow(0.94, f);
      rings.forEach((ring, k) => {
        const auto = paused || (seek && seek.ring === ring) ? 0 : ring.speed;
        ring.rot += (auto + vel * (k % 2 ? 0.8 : 1)) * dt;
      });
    }

    tiltX += ((finePointer ? -ptrY * 8 : 0) - tiltX) * (1 - Math.pow(0.92, f));
    tiltY += ((finePointer ? ptrX * 10 : 0) - tiltY) * (1 - Math.pow(0.92, f));
    scene.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;

    const r = R * (0.3 + 0.7 * unfold), t = now / 1000;
    const readRing = rings[count === 3 ? 1 : 0];
    let front = null, frontC = -2;
    rings.forEach(ring => {
      const n = ring.cards.length, sinT = Math.sin(ring.tilt), cosT = Math.cos(ring.tilt), yb = ring.y * H;
      ring.cards.forEach((card, j) => {
        const a = ring.rot + (j / n) * TAU, s = Math.sin(a), c = Math.cos(a);
        const x = s * r, y = yb + c * r * sinT + Math.sin(t * 0.9 + j) * 2.5, z = c * r * cosT * ZS;
        const depth = (c + 1) / 2, dim = card.classList.contains('is-dim');
        const i = indexOf.get(card), st = state[i];
        const tr = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px)`;
        if (st.t !== tr) { card.style.transform = tr; st.t = tr; }
        const o = Math.round((dim ? 0.08 + depth * 0.1 : 0.3 + depth * 0.7) * unfold * 100) / 100;
        if (st.o !== o) { card.style.opacity = o; st.o = o; }
        if (ring === readRing && !dim && c > frontC) { frontC = c; front = card; }
      });
    });
    if (!hot && front && now - lastFront > 350) { lastFront = now; showHud(front); }

  };
  const start = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  const sync = () => (inView && !document.hidden ? start() : stop());
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView && !started) { started = true; unfold = 0; } sync(); }, { rootMargin: '120px 0px' }).observe(stage);
  } else { inView = true; sync(); }
  showHud(cards[0]);
})();
