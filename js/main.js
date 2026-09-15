/* ==========================================================================
   main.js — nav, typed line, scroll reveal, counters, card tilt, cursor glow
   No build step. Runs after DOM is parsed (script is `defer`).
   ========================================================================== */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------- nav: scrolled state, mobile toggle, active link ---------- */
  const nav = $('.nav');
  const links = $('.nav-links');
  const toggle = $('.nav-toggle');
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 24);
    const top = $('.to-top');
    if (top) top.classList.toggle('is-visible', window.scrollY > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('a', links).forEach(a => a.addEventListener('click', () => {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    }));
  }

  // highlight the nav link for the section in view
  const sections = $$('main section[id]');
  const navAnchors = $$('.nav-links a[href^="#"]');
  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        navAnchors.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(s => io.observe(s));
  }

  const toTop = $('.to-top');
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  /* ---------- typed hero line ---------- */
  const typedEl = $('.hero-line .typed');
  if (typedEl) {
    const strings = JSON.parse(typedEl.getAttribute('data-strings') || '[]');
    if (!typedEl.textContent.trim()) typedEl.textContent = strings[0] || '';   // the first title ships in the markup
    if (!reduceMotion && typeof window.Typed === 'function' && strings.length > 1) {
      // starts once the hero has been readable for a moment (never behind the intro), and pauses while off-screen
      let typed = null;
      const boot = () => {
        if (typed) return;
        typed = new window.Typed(typedEl, { strings: strings.slice(1), typeSpeed: 46, backSpeed: 26, backDelay: 1900, loop: true, smartBackspace: true, onLastStringBackspaced: () => { typed.strPos = 0; } });
        // Typed's stop() only parks at its next tick: resume only a chain that has really parked (curString null = not parked yet)
        if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { const p = typed.pause; if (!e.isIntersecting) { if (!p.status) { typed.stop(); p.curString = null; } } else if (p.status) { if (p.curString === null) p.status = false; else typed.start(); } }).observe(typedEl.closest('.hx-role') || typedEl);
      };
      const later = () => setTimeout(boot, 2600);
      if (window.__hxReady) later(); else document.addEventListener('hx:ready', later, { once: true });
      setTimeout(boot, 8000);
    }
  }

  /* ---------- GSAP Scroll Animations ---------- */
  const revealTargets = $$('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger, .section-head, .case');
  const showAllReveals = () => revealTargets.forEach(el => el.classList.add('is-in'));
  if (reduceMotion) {
    showAllReveals();
  } else if (window.gsap && window.ScrollTrigger) {
    // GSAP path (only when gsap + ScrollTrigger are loaded on the page)
    gsap.registerPlugin(ScrollTrigger);
    revealTargets.forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 88%', onEnter: () => el.classList.add('is-in'), once: true }));
    const heroCanvas = $('.hero-canvas');
    if (heroCanvas) gsap.to(heroCanvas, { y: 200, ease: 'none', scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true } });
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    revealTargets.forEach(el => io.observe(el));
  } else {
    showAllReveals();
  }

  /* ---------- counters (data-count="255350" data-prefix="" data-suffix="") ---------- */
  const counters = $$('[data-count]');
  if (!reduceMotion) counters.forEach(el => { const n = $('.n', el); if (!n) return; const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = n.textContent; n.setAttribute('aria-hidden', 'true'); el.appendChild(sr); });
  const fmt = (n, decimals) => decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString('en-US');
  const runCounter = el => {
    const target = parseFloat(el.getAttribute('data-count'));
    const from = parseFloat(el.getAttribute('data-from') || '0');
    const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const numEl = $('.n', el) || el;
    if (reduceMotion) { numEl.textContent = prefix + fmt(target, decimals) + suffix; return; }
    numEl.textContent = prefix + fmt(from, decimals) + suffix;
    const dur = 1500, start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      numEl.textContent = prefix + fmt(from + (target - from) * eased, decimals) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (counters.length) {
    window.__runCounter = runCounter;                       // hero.js starts the hero readouts after its entrance
    const later = counters.filter(c => !c.closest('.hero-x'));
    if (!('IntersectionObserver' in window)) later.forEach(runCounter);
    else {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { runCounter(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.4 });
      later.forEach(c => io.observe(c));
    }
  }

  /* ---------- the ticker under the hero pauses while off-screen ---------- */
  const ticker = $('.hx-marquee');
  if (ticker && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => ticker.classList.toggle('is-off', !e.isIntersecting)).observe(ticker);

  /* ---------- 3D tilt + spotlight on cards (desktop, fine pointer only) ---------- */
  if (finePointer && !reduceMotion) {
    $$('.tilt').forEach(card => {
      card.classList.add('spot');
      let raf = 0;
      const onMove = e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const max = parseFloat(card.getAttribute('data-tilt') || '15'); // Increased default tilt for stronger 3D effect
          const rx = (0.5 - py) * max;
          const ry = (px - 0.5) * max;
          if (!card.style.transition) card.style.transition = 'transform 120ms ease-out, border-color var(--med), box-shadow var(--med)';
          card.style.transform = `perspective(700px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-8px) scale3d(1.02, 1.02, 1.02)`; // Stronger 3D pop
          card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        });
      };
      const reset = () => { cancelAnimationFrame(raf); card.style.transform = ''; card.style.transition = ''; };
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', reset);
    });

    // custom cursor: the dot IS the pointer (no lag); the ring follows and sleeps once it has caught up
    const dot = $('#cursor-dot');
    const ring = $('#cursor-ring');
    if (dot && ring && !matchMedia('(forced-colors: active)').matches) {
      document.body.classList.add('has-pointer');
      let tx = -100, ty = -100, rx = tx, ry = ty, raf = 0, last = 0;
      const follow = now => {
        const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60; last = now;
        const k = 1 - Math.pow(0.8, dt * 60);               // same feel at 60 and 120 Hz
        rx += (tx - rx) * k; ry += (ty - ry) * k;
        ring.style.translate = `${rx.toFixed(1)}px ${ry.toFixed(1)}px`;
        if (Math.abs(tx - rx) + Math.abs(ty - ry) > 0.3) raf = requestAnimationFrame(follow); else { raf = 0; last = 0; }
      };
      window.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        tx = e.clientX; ty = e.clientY;
        if (!document.body.classList.contains('cursor-on')) { rx = tx; ry = ty; ring.style.translate = `${tx}px ${ty}px`; document.body.classList.add('cursor-on'); }
        dot.style.translate = `${tx}px ${ty}px`;
        if (!raf) raf = requestAnimationFrame(follow);
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => document.body.classList.remove('cursor-on'));
      document.addEventListener('pointerover', e => {
        const field = e.target.closest('input, textarea, select, [contenteditable]');
        document.body.classList.toggle('cursor-field', !!field);           // text fields keep the system I-beam only
        const hit = !field && e.target.closest('a, button, [role="button"], summary, label, .sk-stage');
        const light = !!(hit && hit.closest('.btn-primary, .btn-whatsapp'));  // dark cursor over the white and green buttons
        dot.classList.toggle('is-active', !!hit); ring.classList.toggle('is-active', !!hit);
        dot.classList.toggle('on-light', light); ring.classList.toggle('on-light', light);
      });
      document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
      document.addEventListener('pointerup', () => ring.classList.remove('is-down'));
    }
  }   // end: fine-pointer only

  /* ---------- contact form: send with fetch, show a result, never leave the page ---------- */
  const form = $('#contact-form');
  if (form) {
    const status = $('.form-status', form);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = $('button[type="submit"]', form);
      const orig = btn.innerHTML;
      btn.disabled = true; btn.textContent = 'Sending…';
      if (status) { status.textContent = ''; status.style.color = ''; }
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success !== false) {
          form.reset();
          if (status) { status.textContent = 'Thanks — your message is on its way. I reply within one working day.'; status.style.color = 'var(--green)'; }
        } else {
          throw new Error(data.message || 'Send failed');
        }
      } catch (err) {
        if (status) { status.textContent = 'Could not send. Please email shubhamky1612@gmail.com instead.'; status.style.color = 'var(--rose)'; }
      } finally {
        btn.disabled = false; btn.innerHTML = orig;
      }
    });
  }

  window.__mainReady = true;

  /* ---------- footer year ---------- */
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
