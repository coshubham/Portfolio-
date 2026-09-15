/* ==========================================================================
   motion.js — intro sequence, scroll-linked timeline,
   ambient parallax, word-by-word headings, case depth. Loaded with `defer`.
   ========================================================================== */
(function () {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------- the loader: the SK monogram sequence ----------
     Every load shows it (a quicker run on repeat visits in the same session). The counter holds at 96% until
     the page has loaded, it never runs past ~3 s, and a click or any key skips straight to the exit. */
  const intro = $('.intro');
  if (intro) {
    let late = false;
    try { late = performance.now() > 3500 || getComputedStyle(intro).visibility === 'hidden'; } catch (e) {}
    if (reduceMotion || late) {
      intro.remove(); document.body.classList.remove('is-loading');
    } else {
      document.body.classList.add('is-loading');
      intro.style.animation = 'none';   // JS owns the sequence now; the CSS auto-dismiss is the no-JS fallback
      let repeat = false;
      try { repeat = sessionStorage.getItem('introShown') === '1'; } catch (e) {}
      const mark = $('.lx-mark', intro), front = $('.lx-front', intro), tilt = $('.lx-tilt', intro);
      const countEl = $('.lx-count', intro), fill = $('.lx-rule i', intro), rule = $('.lx-rule', intro);

      // extruded thickness: darker copies of the metal strokes stacked behind the face
      const small = Math.min(innerWidth, innerHeight) < 560;
      const layers = small ? 5 : 10, step = small ? 1.5 : 1.3;
      const depth = [];
      if (mark && front) {
        const bodies = front.querySelectorAll('.body');
        for (let i = layers; i >= 1; i--) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('class', 'lx-svg lx-depth'); svg.setAttribute('viewBox', '30 30 140 140'); svg.setAttribute('aria-hidden', 'true');
          svg.style.setProperty('--dc', `hsl(196 60% ${Math.round(30 - (i / layers) * 20)}%)`);
          svg.style.transform = `translateZ(${(-i * step).toFixed(2)}px)`;
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('transform', 'translate(-3 0)');
          bodies.forEach(b => g.appendChild(b.cloneNode(false)));
          svg.appendChild(g); mark.insertBefore(svg, front); depth.push(svg);
        }
      }

      const LOAD = repeat ? 900 : 2000, START = 60, LOCK_AT = repeat ? 200 : 1050, LOCK_SEEN = repeat ? 450 : 800, MAX = 3000;
      let t0 = 0, last = -1, done = false, lockStart = 0, raf = 0;
      let loaded = document.readyState === 'complete';
      addEventListener('load', () => { loaded = true; }, { once: true });

      // the name waits for its fonts (Sora 300, Instrument Serif) so it never appears in a fallback face
      const whenFonts = cb => {
        let fired = false;
        const go = () => { if (!fired) { fired = true; cb(); } };
        setTimeout(go, 1400);
        if (!document.fonts || !document.fonts.load) return go();
        const link = document.querySelector('link[href*="fonts.googleapis"][onload]');
        const cssIn = new Promise(r => (!link || link.media === 'all') ? r() : link.addEventListener('load', r, { once: true }));
        cssIn.then(() => Promise.all([document.fonts.load('300 15px Sora'), document.fonts.load('italic 400 24px "Instrument Serif"'), document.fonts.load('500 12px "JetBrains Mono"')])).then(go, go);
      };
      const startLockup = () => {
        const now = performance.now();
        const wait = t0 ? Math.max(0, LOCK_AT - (now - t0)) : LOCK_AT;
        intro.style.setProperty('--lk', Math.round(wait) + 'ms');
        lockStart = now + wait;
        intro.classList.add('lk-go');
      };
      const ease = x => 1 - Math.pow(1 - x, 1.7);
      const setP = p => {
        const v = Math.round(p * 100);
        if (v !== last && countEl) { last = v; countEl.textContent = String(v).padStart(3, '0'); }
        if (fill) fill.style.transform = `scaleX(${p.toFixed(4)})`;
      };

      // a gentle 3D follow of the pointer once the mark faces front (mouse only)
      const onPointer = e => {
        if (!tilt || e.pointerType !== 'mouse' || performance.now() - t0 < 2100) return;
        const px = e.clientX / innerWidth - 0.5, py = e.clientY / innerHeight - 0.5;
        tilt.style.transform = `rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 10).toFixed(2)}deg)`;
      };
      addEventListener('pointermove', onPointer, { passive: true });

      const finish = () => {
        if (done) return; done = true;
        cancelAnimationFrame(raf);
        removeEventListener('pointermove', onPointer);
        setP(1);
        if (rule) {
          const ir = intro.getBoundingClientRect(), r = rule.getBoundingClientRect();
          intro.style.setProperty('--line', Math.round(r.top - ir.top) + 'px');
          intro.style.setProperty('--rs', (r.width / Math.max(1, ir.width)).toFixed(4));
        }
        intro.classList.add('is-seal');                           // a short cyan beat at 100
        setTimeout(() => {
          intro.classList.add('is-done');                          // the seam grows and glides to the centre
          document.body.classList.remove('is-loading');            // the hero entrance starts as the doors open
          try { sessionStorage.setItem('introShown', '1'); } catch (e) {}
          setTimeout(() => intro.classList.add('is-open'), 440);
          setTimeout(() => intro.remove(), 1700);
        }, 220);
      };

      const tick = now => {
        if (!t0) t0 = now;
        const el = now - t0;
        const x = Math.min(1, Math.max(0, (el - START) / LOAD));
        const p = Math.min(ease(x), loaded || el > MAX ? 1 : 0.96);
        setP(p);
        if (p >= 1 && ((lockStart && now >= lockStart + LOCK_SEEN) || el > MAX)) { finish(); return; }
        raf = requestAnimationFrame(tick);
      };

      requestAnimationFrame(now => {
        intro.classList.add('is-playing');
        t0 = now;
        whenFonts(startLockup);
        raf = requestAnimationFrame(tick);
      });
      if (small) setTimeout(() => depth.forEach(d => { d.style.display = 'none'; }), 2300);   // phones: drop the thickness once it faces front
      setTimeout(finish, 4200);                                     // never trap a visitor
      window.__introFinish = finish;
      intro.addEventListener('click', finish);
      addEventListener('keydown', finish, { once: true });
    }
  }
  /* ---------- scroll-linked: timeline line + ambient parallax ---------- */
  // the ambient layer stays fixed: --sp (page progress, set on the layer itself so only its few children restyle)
  // drives a small parallax, and the aurora is softer behind the hero, full strength below it;
  // the timeline only measures while it is near the viewport, reading all rects before writing
  const tl = $('.timeline');
  const items = $$('.tl-item');
  const amb = $('.ambient');
  let tlNear = !('IntersectionObserver' in window), ticking = false, ambMax = 1;
  const measureAmb = () => { ambMax = Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  measureAmb(); addEventListener('resize', measureAmb, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(measureAmb).observe(document.body);
  const onScroll = () => {
    ticking = false;
    if (amb) {
      if (!reduceMotion) amb.style.setProperty('--sp', Math.min(1, scrollY / ambMax).toFixed(4));
      amb.style.opacity = Math.min(1, 0.6 + (scrollY / Math.max(1, innerHeight)) * 0.4).toFixed(3);
    }
    if (tl && tlNear) {
      const vh = innerHeight * 0.7, r = tl.getBoundingClientRect();
      const tops = items.map(it => it.getBoundingClientRect().top);
      tl.style.setProperty('--tl', Math.max(0, Math.min(1, (vh - r.top) / r.height)).toFixed(3));
      items.forEach((it, i) => it.classList.toggle('is-past', tops[i] < vh));
    }
  };
  if (tl && !tlNear) new IntersectionObserver(([e]) => { tlNear = e.isIntersecting; if (tlNear) onScroll(); }, { rootMargin: '50% 0px' }).observe(tl);
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- word-by-word headings ---------- */
  if (!reduceMotion) {
    $$('.section-head h2').forEach(h => {
      if (h.querySelector('.w')) return;
      const words = h.textContent.trim().split(/\s+/);
      h.setAttribute('aria-label', h.textContent.trim());
      h.textContent = '';
      words.forEach((w, i) => {
        const outer = document.createElement('span'); outer.className = 'w';
        const inner = document.createElement('span'); inner.textContent = w; inner.style.setProperty('--i', i);
        outer.appendChild(inner); h.appendChild(outer);
        if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
      });
    });
  }

  /* ---------- case visual depth under the pointer ---------- */
  if (finePointer && !reduceMotion) {
    $$('.case').forEach(card => {
      const svg = $('.case-visual svg', card);
      if (!svg) return;
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        svg.style.transform = `translate3d(${(px * -10).toFixed(1)}px, ${(py * -8).toFixed(1)}px, 0)`;
      });
      card.addEventListener('pointerleave', () => { svg.style.transform = ''; });
    });
  }
})();
