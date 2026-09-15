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

  /* ---------- intro sequence: once per session ---------- */
  const intro = $('.intro');
  if (intro) {
    let seen = false;
    try { seen = sessionStorage.getItem('introShown') === '1'; } catch (e) {}
    let late = false;
    try { late = performance.now() > 3000 || getComputedStyle(intro).visibility === 'hidden'; } catch (e) {}
    if (reduceMotion || seen || late) {
      intro.remove(); document.body.classList.remove('is-loading');
    } else {
      document.body.classList.add('is-loading');
      intro.style.animation = 'none';   // JS owns the sequence now; the CSS auto-dismiss is the no-JS fallback
      intro.classList.add('is-wait');    // hold the letters until the display fonts are in (max 600 ms): the first frame is on-brand
      const name = $('.intro-name', intro);
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        intro.classList.remove('is-wait');
        intro.classList.add('is-done');
        document.body.classList.remove('is-loading');
        try { sessionStorage.setItem('introShown', '1'); } catch (e) {}
        setTimeout(() => intro.remove(), 1000);
      };
      const run = () => {
        if (done || !intro.classList.contains('is-wait')) return;
        intro.classList.remove('is-wait');
        if (name) {
          const text = name.getAttribute('data-text') || 'Shubham Kumar Yadav';
          const accentFrom = text.indexOf(' ') + 1;
          name.textContent = '';
          [...text].forEach((ch, i) => {
            const s = document.createElement('span');
            s.style.setProperty('--i', i);
            if (ch === ' ') { s.className = 'sp'; s.innerHTML = '&nbsp;'; }
            else { s.textContent = ch; if (i >= accentFrom) s.classList.add('accent'); }
            name.appendChild(s);
          });
        }
        setTimeout(finish, 1750);
      };
      const link = document.querySelector('link[href*="fonts.googleapis"][onload]');
      const cssIn = new Promise(r => (!link || link.media === 'all') ? r() : link.addEventListener('load', r, { once: true }));
      const fontsIn = cssIn.then(() => document.fonts && Promise.all([document.fonts.load('800 64px Sora'), document.fonts.load('italic 400 64px "Instrument Serif"')]));
      Promise.race([fontsIn, new Promise(r => setTimeout(r, 600))]).then(run, run);
      window.__introFinish = finish;
      intro.addEventListener('click', finish);   // impatient visitors can skip
      addEventListener('keydown', finish, { once: true });   // keyboard users too, so focus never lands under the overlay
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
