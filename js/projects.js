/* ==========================================================================
   projects.js — project filters + "show all", and the hero terminal demo.
   ========================================================================== */
(function () {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------- projects: filter + show all ---------- */
  const grid = $('.proj-grid');
  if (grid) {
    const cards = $$('.proj', grid);
    const buttons = $$('.proj-filters button');
    const more = $('.proj-more');
    const count = $('.proj-count');
    const LIMIT = window.matchMedia('(max-width: 600px)').matches ? 7 : 12;   // phones: the seven featured projects, then 'Show all'
    let filter = 'all', expanded = false;
    const matches = c => filter === 'all' || c.getAttribute('data-cat') === filter;
    const apply = () => {
      let shown = 0;
      cards.forEach(c => {
        const m = matches(c);
        const visible = m && (expanded || shown < LIMIT);
        if (m) shown++;
        c.hidden = !visible;
      });
      const total = cards.filter(matches).length;
      if (more) { more.hidden = expanded || total <= LIMIT; more.textContent = 'Show all ' + total + ' projects'; }
      if (count) count.textContent = total + (total === 1 ? ' project' : ' projects');
    };
    buttons.forEach(b => b.addEventListener('click', () => {
      filter = b.getAttribute('data-filter') || 'all';
      buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      expanded = false; apply();
      if (!reduceMotion && grid.animate) grid.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    }));
    if (more) more.addEventListener('click', () => { expanded = true; apply(); more.blur(); });
    apply();
  }

  /* ---------- hero terminal: types a search request, prints the answer, loops ---------- */
  const term = $('#term-code');
  if (term) {
    const RUNS = [
      { cmd: ['$ curl -s -X POST https://api.example.com/v1/search \\', '    -H "X-Client-Id: demo-store" \\', '    -d \'{"q": "gift for someone who cooks"}\''],
        out: ['{', '  "intent":  { "core": "cookware", "gift": true },', '  "results": ["Chef\'s knife", "Cast-iron pan", "Spice set"],', '  "latency_ms": 178,', '  "cache": "miss"', '}'] },
      { cmd: ['$ curl -s -X POST https://api.example.com/v1/search \\', '    -H "X-Client-Id: demo-store" \\', '    -d \'{"q": "wireless headphones under 5000"}\''],
        out: ['{', '  "intent":  { "core": "headphones", "price_max": 5000 },', '  "results": ["ANC over-ear", "Neckband", "True wireless"],', '  "latency_ms": 0,', '  "cache": "hit"', '}'] },
    ];
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const colour = line => {
      if (line.startsWith('$')) return '<span class="t-cmd">' + esc(line) + '</span>';
      if (line.startsWith('    -')) return '<span class="t-arg">' + esc(line) + '</span>';
      return esc(line)
        .replace(/"([^"]+)":/g, '<span class="t-key">"$1":</span>')
        .replace(/: (\d+)/g, ': <span class="t-num">$1</span>')
        .replace(/"(hit|miss)"/g, '"<span class="t-str">$1</span>"');
    };
    const render = (done, partial) => { term.innerHTML = done.map(colour).join('\n') + (done.length && partial !== null ? '\n' : '') + (partial !== null ? colour(partial) : '') + '<span class="cur"></span>'; };

    if (reduceMotion) { term.innerHTML = RUNS[0].cmd.concat(RUNS[0].out).map(colour).join('\n'); }
    else {
      let run = 0, active = false, timer = 0, token = 0;
      const sleep = ms => new Promise(r => { timer = setTimeout(r, ms); });
      const play = async () => {
        if (active) return; active = true; const me = ++token;
        while (active && me === token) {
          const R = RUNS[run++ % RUNS.length]; const done = [];
          for (const line of R.cmd) {
            let typed = '';
            for (const ch of line) { typed += ch; render(done, typed); await sleep(20 + Math.random() * 28); if (!active || me !== token) return; }
            done.push(line);
          }
          render(done, null); await sleep(500); if (!active || me !== token) return;
          for (const line of R.out) { done.push(line); render(done, null); await sleep(55); if (!active || me !== token) return; }
          await sleep(4500);
        }
      };
      const stop = () => { active = false; clearTimeout(timer); };
      if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? play() : stop()), { threshold: 0.2 }).observe(term);
      else play();
      document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));
    }
  }
})();
