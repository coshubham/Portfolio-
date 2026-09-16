/* ==========================================================================
   hero.js — the workstation hero. One story, told in order:
   the server boots in the terminal, the route is written in the editor, the
   request hits the server, then the tenant-isolation tests go green.
   Also: the Noida clock, the hero counters (started after the entrance), and
   the 3D window stack that tilts to the pointer, sways when idle and falls
   back into the scene as you scroll. Classic script, loaded with `defer`,
   no dependencies. The entrance itself is CSS; this flips the switch.
   ========================================================================== */
(function () {
  'use strict';
  const born = performance.now();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wide = () => window.matchMedia('(min-width: 1080px)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const hero = $('.hero-x');
  if (!hero) return;

  /* ---- the editor: an illustrative version of the search route (k-NN with the price filter inside the query) ---- */
  const K = (c, t) => `<span class="${c}">${t}</span>`;
  const codeLines = [
    K('com', '# search.py · FastAPI + OpenSearch k-NN'),
    `${K('kw', 'from')} fastapi ${K('kw', 'import')} APIRouter${K('punc', ',')} Depends`,
    `${K('kw', 'from')} ${K('punc', '.')}deps ${K('kw', 'import')} osc${K('punc', ',')} require_tenant`,
    `${K('kw', 'from')} ${K('punc', '.')}embed ${K('kw', 'import')} embed_query  ${K('com', '# 3072 dims, cached')}`,
    `${K('kw', 'from')} ${K('punc', '.')}models ${K('kw', 'import')} SearchIn${K('punc', ',')} SearchOut`,
    '',
    `router ${K('op', '=')} ${K('fn', 'APIRouter')}${K('punc', '(')}prefix${K('op', '=')}${K('str', '"/v1"')}${K('punc', ')')}`,
    '',
    `${K('dec', '@router.post')}${K('punc', '(')}${K('str', '"/search"')}${K('punc', ',')} response_model${K('op', '=')}SearchOut${K('punc', ')')}`,
    `${K('kw', 'async def')} ${K('fn', 'search')}${K('punc', '(')}q${K('punc', ':')} ${K('type', 'SearchIn')}${K('punc', ',')} t${K('op', '=')}${K('fn', 'Depends')}${K('punc', '(')}require_tenant${K('punc', '))')}${K('punc', ':')}`,
    `    knn ${K('op', '=')} ${K('punc', '{')}${K('str', '"vector"')}${K('punc', ':')} ${K('kw', 'await')} ${K('fn', 'embed_query')}${K('punc', '(')}q${K('punc', '.')}text${K('punc', '),')} ${K('str', '"k"')}${K('punc', ':')} ${K('num', '24')}${K('punc', '}')}`,
    `    ${K('kw', 'if')} ${K('punc', '(')}cap ${K('op', ':=')} q${K('punc', '.')}price_max${K('punc', ')')} ${K('kw', 'is not')} ${K('kw', 'None')}${K('punc', ':')}  ${K('com', '# filter in k-NN')}`,
    `        knn${K('punc', '[')}${K('str', '"filter"')}${K('punc', ']')} ${K('op', '=')} ${K('punc', '{')}${K('str', '"range"')}${K('punc', ':')} ${K('punc', '{')}${K('str', '"price"')}${K('punc', ':')} ${K('punc', '{')}${K('str', '"lte"')}${K('punc', ':')} cap${K('punc', '}}}')}`,
    `    res ${K('op', '=')} ${K('kw', 'await')} osc${K('punc', '.')}${K('fn', 'search')}${K('punc', '(')}index${K('op', '=')}${K('str', 'f"products-{t.id}"')}${K('punc', ',')}`,
    `        body${K('op', '=')}${K('punc', '{')}${K('str', '"query"')}${K('punc', ':')} ${K('punc', '{')}${K('str', '"knn"')}${K('punc', ':')} ${K('punc', '{')}${K('str', '"vec"')}${K('punc', ':')} knn${K('punc', '}}},')} size${K('op', '=')}${K('num', '24')}${K('punc', ')')}`,
    `    ${K('kw', 'return')} SearchOut${K('punc', '.')}${K('fn', 'from_hits')}${K('punc', '(')}res${K('punc', '[')}${K('str', '"hits"')}${K('punc', '][')}${K('str', '"hits"')}${K('punc', '])')}`,
  ];
  const PREFILL = 10;                       // imports, router, decorator and signature: the file is already open
  const RETURN_LINE = codeLines.length - 1;

  // split each line into tags + characters so the typing never breaks a tag
  const tokens = html => {
    const out = []; let i = 0;
    while (i < html.length) {
      if (html[i] === '<') { const e = html.indexOf('>', i); if (e === -1) { out.push({ ch: html[i] }); i++; continue; } out.push({ tag: html.slice(i, e + 1) }); i = e + 1; }
      else if (html[i] === '&') { const e = html.indexOf(';', i); if (e === -1 || e - i > 8) { out.push({ ch: html[i] }); i++; continue; } out.push({ ch: html.slice(i, e + 1) }); i = e + 1; }
      else { out.push({ ch: html[i] }); i++; }
    }
    return out;
  };
  const plans = codeLines.map(l => { const t = tokens(l); return { t, n: t.filter(x => x.ch !== undefined).length }; });
  const portion = (plan, count) => { let out = '', c = 0; for (const x of plan.t) { if (x.tag) { out += x.tag; continue; } if (c < count) { out += x.ch; c++; } else break; } return out; };

  const codeEl = $('#hx-code'), gutterEl = $('#hx-gutter'), lnEl = $('#hx-ln'), colEl = $('#hx-col');
  let lineEls = [], gutterEls = [];
  if (codeEl) {
    codeEl.innerHTML = plans.map(() => '<span class="ln"> </span>').join('');
    lineEls = Array.from(codeEl.children);
    if (gutterEl) { gutterEl.innerHTML = plans.map((_, i) => `<span>${i + 1}</span>`).join(''); gutterEls = Array.from(gutterEl.children); }
  }
  let curLine = -1;
  const setCursor = (li, col) => {
    if (li !== curLine) {
      if (curLine >= 0) { lineEls[curLine].classList.remove('is-cur'); if (gutterEls[curLine]) gutterEls[curLine].classList.remove('is-cur'); }
      curLine = li; lineEls[li].classList.add('is-cur'); if (gutterEls[li]) gutterEls[li].classList.add('is-cur');
      if (lnEl) lnEl.textContent = li + 1;
    }
    if (colEl) colEl.textContent = col + 1;
  };
  const showLine = (li, count, caret) => { lineEls[li].innerHTML = (portion(plans[li], count) || (caret ? '' : ' ')) + (caret ? '<span class="hx-caret"></span>' : ''); };
  const finishCode = () => { plans.forEach((p, i) => showLine(i, p.n, i === RETURN_LINE)); setCursor(RETURN_LINE, plans[RETURN_LINE].n); };
  if (codeEl) { for (let k = 0; k < PREFILL; k++) showLine(k, plans[k].n, false); showLine(PREFILL, 0, true); setCursor(PREFILL, 0); }

  // keystroke stops for one line: the indent arrives at once, names of 7+ letters autocomplete after 3
  const stopsFor = plan => {
    const text = plan.t.filter(x => x.ch !== undefined).map(x => (x.ch.length > 1 ? '_' : x.ch)).join('');
    const skip = new Set(), lead = text.length - text.trimStart().length;
    for (let k = 1; k <= lead; k++) skip.add(k);
    for (const m of text.matchAll(/[A-Za-z_]{7,}/g)) for (let k = m.index + 4; k < m.index + m[0].length; k++) skip.add(k);
    const s = []; for (let k = 1; k <= text.length; k++) if (!skip.has(k)) s.push(k);
    return s;
  };

  let typingStarted = false;
  function startTyping(onReturnLine, onDone) {
    if (typingStarted || !codeEl) return; typingStarted = true;
    if (reduceMotion) { finishCode(); if (onReturnLine) onReturnLine(); if (onDone) onDone(); return; }
    let li = PREFILL, si = 0, shown = 0, stops = stopsFor(plans[li]), due = performance.now() + 250;
    // time-based: a late frame shows several characters at once instead of the typing crawling
    const step = () => {
      const now = performance.now();
      while (due <= now) {
        if (si < stops.length) { shown = stops[si++]; due += si < stops.length && stops[si] - shown > 1 ? 90 + Math.random() * 60 : 14 + Math.random() * 18; }
        else if (li < plans.length - 1) { showLine(li, shown, false); li++; si = 0; shown = 0; stops = stopsFor(plans[li]); due += 160; if (li === RETURN_LINE && onReturnLine) onReturnLine(); }
        else { showLine(li, shown, true); setCursor(li, shown); if (onDone) onDone(); return; }
      }
      showLine(li, shown, true); setCursor(li, shown);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---- terminal: every line exists from the start (hidden), so the window never grows ---- */
  const termBody = $('#hx-term-body');
  const termLines = [
    { text: '$ uvicorn app:api --host 0.0.0.0 --port 8000', cls: 'p' },
    { text: '✓ opensearch · products-{tenant} · 3072-d knn · green', cls: 'ok' },
    { text: '→ POST /v1/search  "gift for someone who cooks"', cls: 'accent' },
    { text: '✓ 200 · 24 hits · 178 ms · cache miss', cls: 'ok' },
    { text: '⚡ POST /v1/search  repeat query · 0 ms · cache hit', cls: 'warn' },
  ];
  let termStarted = false, releaseAt = Infinity, termKick = null;
  const termRelease = () => { if (releaseAt !== Infinity) return; releaseAt = performance.now(); if (termKick) termKick(); };
  function startTerminal() {
    if (termStarted || !termBody) return; termStarted = true;
    const els = termLines.map(l => { const s = document.createElement('span'); s.className = 'line ' + l.cls; s.textContent = l.text; termBody.appendChild(s); return s; });
    if (reduceMotion || !termBody.getClientRects().length) return;          // hidden (phones) or reduced motion: show it all
    els.forEach(s => { s.style.visibility = 'hidden'; });
    // [delay ms, typed?, counted from the editor reaching the return line?]
    const plan = [[0, true, false], [1300, false, false], [120, false, true], [650, false, true], [1500, false, true]];
    const PER_CHAR = 22, t0 = performance.now();
    let timer = 0;
    const tick = () => {
      timer = 0;
      const now = performance.now(); let busy = false;
      plan.forEach(([at, typed, waits], i) => {
        const base = (waits ? releaseAt : t0) + at, text = termLines[i].text, el = els[i];
        if (now < base) { if (base !== Infinity) busy = true; return; }
        const n = typed ? Math.min(text.length, 1 + Math.floor((now - base) / PER_CHAR)) : text.length;   // n comes from the clock
        if (el._n !== n) { el._n = n; el.textContent = text.slice(0, n); el.style.visibility = ''; }
        if (n < text.length) busy = true;
      });
      if (busy) timer = setTimeout(tick, 16);
    };
    termKick = () => { if (!timer) tick(); };
    tick();
    setTimeout(termRelease, 12000);   // failsafe if the editor never reaches the return line
  }

  /* ---- test runner: 31 tenant-isolation tests; the stagger is transition-delay, so no timers ---- */
  const dotsEl = $('#hx-tests-dots'), resultEl = $('#hx-tests-result');
  let testsStarted = false;
  function startTests() {
    if (testsStarted || !dotsEl) return; testsStarted = true;
    const N = 31; dotsEl.innerHTML = '<i></i>'.repeat(N);
    const dots = Array.from(dotsEl.children);
    if (!reduceMotion && dotsEl.getClientRects().length) {
      let acc = 0;   // irregular bursts, like a real pytest run
      dots.forEach(d => { acc += 16 + Math.random() * 48; d.style.transitionDelay = Math.round(acc) + 'ms'; });
      if (resultEl) resultEl.style.transitionDelay = Math.round(acc + 300) + 'ms';
      void dotsEl.offsetWidth;   // commit the hidden state so the transitions run
    }
    dots.forEach(d => d.classList.add('on'));
    if (resultEl) resultEl.classList.add('on');
  }

  /* ---- clock: Noida local time ---- */
  const clockEl = $('#hx-clock');
  if (clockEl) {
    let fmt = null;
    try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) {}
    const tickClock = () => { if (fmt) clockEl.textContent = `Noida · ${fmt.format(new Date())} IST`; };
    tickClock(); setInterval(tickClock, 20000);
  }

  /* ---- the 3D stack: pointer tilt, idle sway, and a scroll-linked exit ---- */
  const stack = $('#hx-stack'), stage = $('.hx-stage'), copy = $('.hx-content');
  const wideMQ = window.matchMedia('(min-width: 1080px)');
  if (stack && !reduceMotion) {   // follows the 1080px breakpoint live (window resize, tablet rotation)
    let tx = 0, ty = 0, cx = 0, cy = 0, sp = 0, hover = false, running = false, raf = 0, inView = true, last = 0, hr = null;
    let heroH = hero.offsetHeight;
    addEventListener('resize', () => { heroH = hero.offsetHeight; hr = null; }, { passive: true });
    addEventListener('scroll', () => { hr = null; }, { passive: true });
    if (finePointer) {   // touch screens still get the idle sway
      hero.addEventListener('pointermove', e => { const r = hr || (hr = hero.getBoundingClientRect()); tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2; hover = true; }, { passive: true });
      hero.addEventListener('pointerleave', () => { hover = false; });
    }
    const loop = now => {
      if (!running) return; raf = requestAnimationFrame(loop);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
      const t = now / 1000, k = 1 - Math.pow(0.95, dt * 60), ks = 1 - Math.pow(0.85, dt * 60);   // same feel at 60 and 120 Hz
      const ix = hover ? tx : Math.sin(t * 0.45) * 0.4, iy = hover ? ty : Math.cos(t * 0.37) * 0.3;
      cx += (ix - cx) * k; cy += (iy - cy) * k;
      sp += (Math.min(1, Math.max(0, scrollY / (heroH * 0.85))) - sp) * ks;
      const x = sp * sp * (3 - 2 * sp);   // smoothstep: slow start, soft landing
      // scrolling away: the stack lifts, falls back toward the grid, tips back and turns
      stack.style.transform = `translate3d(0, ${(Math.sin(t * 0.8) * 7 - x * 110).toFixed(1)}px, ${(-x * 460).toFixed(0)}px) rotateY(${(-7 + cx * 9 - x * 16).toFixed(2)}deg) rotateX(${(4 - cy * 5 + x * 30).toFixed(2)}deg)`;
      // opacity goes on .hx-stage (the perspective parent), never on the preserve-3d elements: that would flatten the 3D
      if (stage) stage.style.opacity = x > 0.35 ? (1 - (x - 0.35) / 0.65).toFixed(3) : '';
      if (copy) copy.style.transform = x > 0.001 ? `translate3d(0, ${(x * 48).toFixed(1)}px, 0)` : '';
    };
    const start = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); if (!wideMQ.matches) { stack.style.transform = ''; if (stage) stage.style.opacity = ''; if (copy) copy.style.transform = ''; sp = 0; } };
    const sync = () => (wideMQ.matches && inView && !document.hidden ? start() : stop());
    const onBreakpoint = () => { heroH = hero.offsetHeight; hr = null; sync(); };
    if (wideMQ.addEventListener) wideMQ.addEventListener('change', onBreakpoint); else if (wideMQ.addListener) wideMQ.addListener(onBreakpoint);
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: 0.05 }).observe(hero);
    sync();
  }

  /* ---- entrance: stagger indices for the CSS transitions, then run the story ---- */
  hero.querySelectorAll('.hx-title .word').forEach((w, i) => w.style.setProperty('--i', i));
  hero.querySelectorAll('.hx-content [data-anim]').forEach((el, i) => { if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', i); });

  // phones and tablets: the editor sits below the copy, so it starts typing when it scrolls into view
  const whenVisible = (el, fn) => {
    if (!el || reduceMotion || wide() || !('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { threshold: 0.3 });
    io.observe(el);
  };
  let shown = false;
  const showAll = () => {
    if (shown) return; shown = true;
    hero.classList.add('hx-ready');
    window.__hxReady = true; document.dispatchEvent(new Event('hx:ready'));
    const d = ms => (reduceMotion ? 0 : ms);
    setTimeout(startTerminal, d(500));
    setTimeout(() => whenVisible($('.hx-editor'), () => startTyping(termRelease, () => setTimeout(startTests, d(300)))), d(800));
    // the hero readouts count once the stats row is fading in (and on short phones, once it is on screen)
    setTimeout(() => {
      const run = window.__runCounter, els = Array.from(hero.querySelectorAll('[data-count]'));
      if (!run || !els.length) return;
      els.forEach(el => { const n = $('.n', el) || el; n.style.display = 'inline-block'; n.style.minWidth = Math.ceil(n.getBoundingClientRect().width) + 'px'; });   // reserve the final width (measured, so the row never grows)
      if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
      const io = new IntersectionObserver(en => en.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.4 });
      els.forEach(el => io.observe(el));
    }, d(900));
  };
  // wait for the intro overlay (motion.js) so the two never fight
  const introUp = () => document.body.classList.contains('is-loading') || (document.querySelector('.intro') && !document.querySelector('.intro.is-done'));
  const go = () => { if (introUp() && performance.now() - born < 8000) { setTimeout(go, 120); return; } requestAnimationFrame(() => requestAnimationFrame(showAll)); };
  go();
  setTimeout(function f() { if (introUp() && performance.now() - born < 8000) { setTimeout(f, 150); return; } showAll(); }, 4800);   // failsafe: nothing stays hidden, but never behind the loader
})();
