/* ==========================================================================
   extras.js — scroll progress, pipeline stepper, FAQ, magnetic buttons,
   decode-text effect, copy-to-clipboard. Loaded with `defer` after main.js.
   ========================================================================== */
(function () {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------- scroll progress bar ---------- */
  const bar = $('.progress');
  if (bar) {
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- pipeline stepper (tabs with auto-advance) ---------- */
  $$('.stepper').forEach(stepper => {
    const tabs = $$('.step-tab', stepper);
    const panels = $$('.panel', stepper);
    const nodes = $$('.step-flow .node', stepper);
    const DUR = 5200;
    let i = 0, timer = 0, paused = false, userDrove = false;
    stepper.style.setProperty('--step-dur', DUR + 'ms');

    const show = n => {
      i = (n + tabs.length) % tabs.length;
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
      nodes.forEach((nd, k) => { nd.classList.toggle('is-on', k === i); nd.classList.toggle('is-done', k < i); });
      schedule();
    };
    const restartBar = () => { const b = $('.bar', tabs[i]); if (b) { b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; } };
    const stopBar = () => { const b = $('.bar', tabs[i]); if (b) b.style.animation = 'none'; };
    const schedule = () => {
      clearTimeout(timer);
      if (reduceMotion || paused || userDrove) { stopBar(); return; }
      restartBar();
      timer = setTimeout(() => show(i + 1), DUR);
    };
    tabs.forEach((t, k) => {
      t.addEventListener('click', () => { userDrove = true; syncAuto(); show(k); });
      t.addEventListener('keydown', e => {
        if (['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key)) { userDrove = true; syncAuto(); }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); show(i + 1); tabs[i].focus(); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); show(i - 1); tabs[i].focus(); }
        if (e.key === 'Home') { e.preventDefault(); show(0); tabs[0].focus(); }
        if (e.key === 'End') { e.preventDefault(); show(tabs.length - 1); tabs[tabs.length - 1].focus(); }
      });
    });
    const pause = () => { paused = true; stepper.classList.add('is-paused'); clearTimeout(timer); };
    const resume = () => { paused = false; stepper.classList.remove('is-paused'); schedule(); };
    stepper.addEventListener('pointerenter', pause);
    stepper.addEventListener('pointerleave', resume);
    stepper.addEventListener('focusin', pause);
    stepper.addEventListener('focusout', e => { if (!stepper.contains(e.relatedTarget)) resume(); });
    // only auto-advance while on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { if (e.isIntersecting) { if (!paused) schedule(); } else clearTimeout(timer); }, { threshold: 0.3 }).observe(stepper);
    }
    // visible auto-play control (WCAG 2.2.2): any click on a tab also stops auto-play
    const auto = $('.step-auto', stepper);
    const syncAuto = () => { if (auto) { auto.setAttribute('aria-pressed', String(!userDrove)); auto.textContent = userDrove ? 'auto-play off' : 'auto-play on'; } };
    if (auto) auto.addEventListener('click', () => { userDrove = !userDrove; syncAuto(); if (userDrove) { clearTimeout(timer); stopBar(); } else schedule(); });
    syncAuto();
    show(0);
    clearTimeout(timer); stopBar();   // wait for the observer to start it when visible
  });

  /* ---------- FAQ: only one open at a time, smooth ---------- */
  const faq = $('.faq');
  if (faq) {
    $$('details', faq).forEach(d => d.addEventListener('toggle', () => {
      if (d.open) $$('details[open]', faq).forEach(o => { if (o !== d) o.open = false; });
    }));
  }

  /* ---------- magnetic buttons (desktop only) ---------- */
  if (finePointer && !reduceMotion) {
    $$('.magnetic').forEach(el => {
      const strength = parseFloat(el.getAttribute('data-magnet') || '0.35');
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${(dx * strength).toFixed(1)}px, ${(dy * strength - 2).toFixed(1)}px)`;   // -2 keeps the .btn:hover lift
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- decode text: eyebrows scramble into place when revealed ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const CH = '01<>/{}[]=+*#%&';
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target, final = el.getAttribute('data-text') || el.textContent;
        el.setAttribute('data-text', final);
        let frame = 0; const total = 22;
        const tick = () => {
          const done = Math.floor((frame / total) * final.length);
          el.textContent = final.slice(0, done) + final.slice(done).replace(/\S/g, () => CH[Math.random() * CH.length | 0]);
          if (frame++ < total) requestAnimationFrame(tick); else el.textContent = final;
        };
        tick();
      });
    }, { threshold: 0.6 });
    $$('.eyebrow.decode').forEach(el => io.observe(el));
  }

  /* ---------- copy email ---------- */
  $$('.copy-btn').forEach(btn => btn.addEventListener('click', async () => {
    const text = btn.getAttribute('data-copy') || '';
    try { await navigator.clipboard.writeText(text); btn.classList.add('is-done'); btn.textContent = 'copied'; }
    catch (err) { btn.textContent = 'select & copy'; }
    setTimeout(() => { btn.classList.remove('is-done'); btn.textContent = 'copy'; }, 1800);
  }));
})();
