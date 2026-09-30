/* =========================================================================
   Contact chooser — "How would you like to reach me?"
   Any element with [data-reach] opens it (the normal href stays as the
   no-JS fallback). Step 1 picks a channel, step 2 shows a ready-written,
   editable message; the visitor's own app sends it. Nothing is sent to any
   server from here.
   ========================================================================= */
(function () {
  'use strict';

  var dlg = document.getElementById('reach');
  if (!dlg || typeof dlg.showModal !== 'function') return; // very old browser: links keep working as normal

  var ME = {
    email: 'shubhamky1612@gmail.com',
    whatsapp: '918383015195',
    linkedin: 'https://www.linkedin.com/in/shubham-kumar-yadav-3220a81ba/'
  };

  var TOPICS = {
    ai:    { phrase: 'adding AI search or an AI chat assistant to my app', subject: 'AI search / AI chat' },
    app:   { phrase: 'building or improving a full-stack web app', subject: 'Full-stack web app' },
    pay:   { phrase: 'fixing a Stripe or PayPal integration', subject: 'Stripe / PayPal fix' },
    job:   { phrase: 'a job opportunity at our company', subject: 'Job opportunity' },
    other: { phrase: 'a project I have in mind', subject: 'Hello' }
  };

  var CHANNELS = {
    whatsapp: { label: 'WhatsApp', title: 'Your WhatsApp message is ready', send: 'Open WhatsApp' },
    email:    { label: 'Email', title: 'Your email is ready', send: 'Open my email app' },
    linkedin: { label: 'LinkedIn', title: 'Your LinkedIn message is ready', send: 'Copy & open LinkedIn' },
    form:     { label: 'Quick form', title: 'Your message is ready', send: 'Put it in the form' }
  };

  var $ = function (sel, root) { return (root || dlg).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || dlg).querySelectorAll(sel)); };

  // background: colourful 3D glass (spheres, rings) and flowing lines, all drawn on ONE canvas.
  // One layer to composite, so phones never run short of graphics memory (that made the card blink).
  var lines = (function () {
    var cv = $('.reach-lines');
    if (!cv || !cv.getContext) return { start: function () {}, stop: function () {}, resize: function () {}, warm: function () {} };
    var ctx = cv.getContext('2d');
    var still = window.matchMedia('(prefers-reduced-motion: reduce)');
    var COLOURS = [[201, 169, 97], [143, 169, 201], [176, 150, 201], [201, 139, 139], [233, 215, 166]];
    var S = 256, TAU = 6.2832;
    var raf = 0, w = 1, h = 1, waves = [], pulses = [], things = [], sprites = null, glow = null;
    var card = null, frame = 0, seed = 5;

    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
    function blank(size) { var c = document.createElement('canvas'); c.width = c.height = size; return c; }
    function soften(src) {                       // out-of-focus copy: many faint offset copies = a smooth blur
      var big = blank(S), g = big.getContext('2d'), k, n = 0, pts = [];
      for (k = 0; k < 12; k++) pts.push([Math.cos(k / 12 * TAU) * 9, Math.sin(k / 12 * TAU) * 9]);
      for (k = 0; k < 8; k++) pts.push([Math.cos(k / 8 * TAU) * 4.5, Math.sin(k / 8 * TAU) * 4.5]);
      pts.push([0, 0]);
      g.globalAlpha = 1 / pts.length * 1.6;
      for (n = 0; n < pts.length; n++) g.drawImage(src, 10 + pts[n][0], 10 + pts[n][1], S - 20, S - 20);
      return big;
    }
    function ball(c) {                           // a glass sphere: thin middle, dense rim, caustic, highlight
      var el = blank(S), g = el.getContext('2d'), r = S / 2 - 4, cx = S / 2, cy = S / 2, grd;
      g.save();
      g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
      grd = g.createRadialGradient(cx, cy + r * 0.08, r * 0.1, cx, cy, r);
      grd.addColorStop(0, rgba(c, 0.10)); grd.addColorStop(0.62, rgba(c, 0.26));
      grd.addColorStop(0.9, rgba(c, 0.62)); grd.addColorStop(1, rgba(c, 0.92));
      g.fillStyle = grd; g.fillRect(0, 0, S, S);
      grd = g.createRadialGradient(cx + r * 0.34, cy + r * 0.42, 0, cx + r * 0.34, cy + r * 0.42, r * 0.72);
      grd.addColorStop(0, 'rgba(255,246,230,0.6)'); grd.addColorStop(0.35, rgba(c, 0.38)); grd.addColorStop(1, rgba(c, 0));
      g.fillStyle = grd; g.fillRect(0, 0, S, S);
      g.translate(cx - r * 0.36, cy - r * 0.46); g.rotate(-0.6); g.scale(1, 0.55);
      grd = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.42);
      grd.addColorStop(0, 'rgba(255,246,230,0.95)'); grd.addColorStop(0.5, 'rgba(255,246,230,0.35)'); grd.addColorStop(1, 'rgba(255,246,230,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, r * 0.42, 0, TAU); g.fill();
      g.restore();
      grd = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      grd.addColorStop(0, 'rgba(255,246,230,0.9)'); grd.addColorStop(0.45, 'rgba(255,246,230,0.08)'); grd.addColorStop(1, rgba(c, 0.75));
      g.lineWidth = 2.5; g.strokeStyle = grd; g.beginPath(); g.arc(cx, cy, r - 1.5, 0, TAU); g.stroke();
      return el;
    }
    function ring(c) {                           // a glass ring (torus seen face-on; tilted when drawn)
      var el = blank(S), g = el.getContext('2d'), cx = S / 2, cy = S / 2, R = S * 0.34, grd;
      grd = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      grd.addColorStop(0, rgba(c, 0.9)); grd.addColorStop(0.5, rgba(c, 0.22)); grd.addColorStop(1, rgba(c, 0.75));
      g.lineWidth = S * 0.13; g.strokeStyle = grd; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
      g.lineCap = 'round';
      g.lineWidth = 3.5; g.strokeStyle = 'rgba(255,246,230,0.85)'; g.beginPath(); g.arc(cx, cy, R + S * 0.04, 3.5, 4.9); g.stroke();
      g.lineWidth = 2; g.strokeStyle = 'rgba(255,246,230,0.4)'; g.beginPath(); g.arc(cx, cy, R - S * 0.038, 0.4, 1.7); g.stroke();
      return el;
    }
    function makeSprites() {
      sprites = COLOURS.map(function (c) {
        var b = ball(c), r = ring(c);
        return { ball: b, ballSoft: soften(b), ring: r, ringSoft: soften(r) };
      });
      glow = blank(64);
      var g = glow.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, 'rgba(255,246,230,0.95)'); rg.addColorStop(0.22, 'rgba(233,215,166,0.55)'); rg.addColorStop(1, 'rgba(201,169,97,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    }
    function measureCard() {
      var c = $('.reach-card'), r = c && c.getBoundingClientRect(), o = cv.getBoundingClientRect();
      card = r ? { l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top } : null;
    }
    function size() {
      var r = cv.getBoundingClientRect(), phone = r.width < 600, i;
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      var dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!sprites) makeSprites();
      seed = 5; waves = []; pulses = []; things = [];
      var n = phone ? 6 : 9;
      for (i = 0; i < n; i++) {
        var a = COLOURS[i % 5], b = COLOURS[(i + 2) % 5], c = COLOURS[(i + 3) % 5], g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, rgba(a, 0)); g.addColorStop(0.18, rgba(a, 0.6)); g.addColorStop(0.5, rgba(b, 0.6));
        g.addColorStop(0.82, rgba(c, 0.6)); g.addColorStop(1, rgba(c, 0));
        waves.push({ y: (i + 0.5) / n, a: 16 + rnd() * 30, k: 0.004 + rnd() * 0.006, k2: 0.011 + rnd() * 0.01,
                     s: 0.25 + rnd() * 0.45, p: rnd() * TAU, g: g });
      }
      for (i = 0; i < (phone ? 3 : 6); i++) pulses.push({ line: Math.floor(rnd() * n), x: rnd(), v: 0.07 + rnd() * 0.1 });
      var m = phone ? 8 : 12, base = phone ? 58 : 84;
      for (i = 0; i < m; i++) {
        things.push({ ring: i % 4 === 3, c: i % 5, size: base + rnd() * base,
                      ax: 0.30 + rnd() * 0.22, ay: 0.30 + rnd() * 0.20,
                      fx: 0.030 + rnd() * 0.035, fy: 0.026 + rnd() * 0.034, fz: 0.040 + rnd() * 0.04,
                      px: rnd() * TAU, py: rnd() * TAU, pz: rnd() * TAU,
                      spin: rnd() * TAU, vs: (rnd() - 0.5) * 0.5, squash: 0.42 + rnd() * 0.4, x: 0, y: 0, z: 0 });
      }
      measureCard();
    }
    function yAt(wv, x, t) {
      return wv.y * h + Math.sin(x * wv.k + t * wv.s + wv.p) * wv.a + Math.sin(x * wv.k2 - t * wv.s * 0.7) * wv.a * 0.35;
    }
    function draw(ms) {
      var t = ms / 1000, i, x;
      if (++frame % 30 === 0) measureCard();     // the card changes height between the two steps
      ctx.clearRect(0, 0, w, h);
      for (i = 0; i < waves.length; i++) {       // the lines
        var wv = waves[i];
        ctx.beginPath();
        ctx.moveTo(-20, yAt(wv, -20, t));
        for (x = -8; x <= w + 20; x += 12) ctx.lineTo(x, yAt(wv, x, t));
        ctx.strokeStyle = wv.g;
        ctx.globalAlpha = 0.16; ctx.lineWidth = 6; ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 1.3; ctx.stroke();
      }
      for (i = 0; i < pulses.length; i++) {      // light running along the lines
        var p = pulses[i], px = (((p.x + t * p.v) % 1.2) - 0.1) * w;
        ctx.drawImage(glow, px - 26, yAt(waves[p.line], px, t) - 26, 52, 52);
      }
      for (i = 0; i < things.length; i++) {      // where every piece of glass is, in 3D
        var o = things[i];
        o.z = Math.sin(t * o.fz * TAU + o.pz);   // -1 near .. +1 far
        var sc = 1 / (1 + o.z * 0.36);
        o.x = w / 2 + Math.sin(t * o.fx * TAU + o.px) * o.ax * w * sc;
        o.y = h / 2 + Math.sin(t * o.fy * TAU + o.py) * o.ay * h * sc;
        o.d = o.size * sc;
      }
      things.sort(function (a, b) { return b.z - a.z; });   // far first
      for (i = 0; i < things.length; i++) {
        var q = things[i], set = sprites[q.c], half = q.d / 2;
        var under = card && q.x > card.l - half * 0.4 && q.x < card.r + half * 0.4 && q.y > card.t - half * 0.4 && q.y < card.b + half * 0.4;
        var soft = under || q.z < -0.5 || q.z > 0.7;         // behind the frosted card, or out of focus
        var img = q.ring ? (soft ? set.ringSoft : set.ring) : (soft ? set.ballSoft : set.ball);
        ctx.globalAlpha = (under ? 0.62 : 0.96) - Math.max(0, q.z) * 0.3;
        if (q.ring) {
          ctx.save();
          ctx.translate(q.x, q.y); ctx.rotate(q.spin + t * q.vs); ctx.scale(1, q.squash + Math.sin(t * 0.6 + q.px) * 0.18);
          ctx.drawImage(img, -half, -half, q.d, q.d);
          ctx.restore();
        } else {
          ctx.drawImage(img, q.x - half, q.y - half, q.d, q.d);
        }
      }
      ctx.globalAlpha = 1;
    }
    function loop(ms) { draw(ms); raf = window.requestAnimationFrame(loop); }
    return {
      start: function () {
        size(); window.cancelAnimationFrame(raf); raf = 0;
        if (still.matches) draw(4000); else raf = window.requestAnimationFrame(loop);
      },
      stop: function () { window.cancelAnimationFrame(raf); raf = 0; },
      warm: function () { if (!sprites) makeSprites(); },
      resize: function () { if (dlg.open) { size(); if (still.matches) draw(4000); } }
    };
  })();
  window.addEventListener('resize', lines.resize);
  // draw the glass once while the page is idle, so opening the chooser is instant
  if ('requestIdleCallback' in window) window.requestIdleCallback(lines.warm, { timeout: 5000 }); else window.setTimeout(lines.warm, 3000);

  var tilt = $('.reach-tilt');
  var steps = $$('.reach-step');
  var nameEl = $('#r-name');
  var subjEl = $('#r-subject');
  var msgEl = $('#r-msg');
  var sendBtn = $('[data-reach-send]');
  var gmailLink = $('[data-reach-gmail]');
  var statusEl = $('.reach-status');
  var channel = 'email';
  var msgDirty = false;
  var subjDirty = false;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  function topic() {
    var r = $('input[name="r-topic"]:checked');
    return r && TOPICS[r.value] ? r.value : 'ai';
  }

  function buildMessage() {
    var name = nameEl.value.trim();
    var lines = [
      'Hello Shubham,',
      '',
      "I found your portfolio and I'd like to talk about " + TOPICS[topic()].phrase + '.',
      '',
      'A bit more about it: ',
      '',
      'Thanks,'
    ];
    if (name) lines.push(name);
    return lines.join('\n');
  }

  function buildSubject() { return TOPICS[topic()].subject + ' — from your portfolio'; }

  function enc(s) { return encodeURIComponent(s); }
  function crlf(s) { return s.replace(/\r?\n/g, '\r\n'); } // mail clients expect CRLF line breaks

  function mailtoUrl() {
    return 'mailto:' + ME.email + '?subject=' + enc(subjEl.value) + '&body=' + enc(crlf(msgEl.value));
  }
  function gmailUrl() {
    return 'https://mail.google.com/mail/?view=cm&fs=1&to=' + enc(ME.email) +
      '&su=' + enc(subjEl.value) + '&body=' + enc(msgEl.value);
  }

  function refresh() {
    if (!msgDirty) msgEl.value = buildMessage();
    if (!subjDirty) subjEl.value = buildSubject();
    if (gmailLink) gmailLink.href = gmailUrl();
  }

  function say(text, ok) {
    statusEl.textContent = text;
    statusEl.classList.toggle('is-ok', !!ok);
  }

  function showStep(name, back) {
    steps.forEach(function (s) {
      var on = s.getAttribute('data-step') === name;
      s.hidden = !on;
      s.classList.remove('is-entering', 'is-back');
      if (on && !reduced.matches) {
        void s.offsetWidth; // restart the step animation
        s.classList.add(back ? 'is-back' : 'is-entering');
      }
    });
    var cur = $('.reach-step[data-step="' + name + '"]');
    var h = cur && cur.querySelector('h2');
    if (h) h.focus({ preventScroll: true });
    if (name !== 'pick') resetTilt();
  }

  function choose(ch) {
    if (!CHANNELS[ch]) return;
    channel = ch;
    var c = CHANNELS[ch];
    $('[data-reach-label]').textContent = c.label;
    $('[data-reach-title]').textContent = c.title;
    sendBtn.firstChild.nodeValue = c.send + ' ';
    $$('[data-only]').forEach(function (el) {
      el.hidden = el.getAttribute('data-only').split(' ').indexOf(ch) === -1;
    });
    say('', false);
    refresh();
    showStep('write');
  }

  function copyMessage() {
    var ok = false;
    // execCommand runs synchronously inside the click, so a popup opened right after is not blocked
    try {
      msgEl.focus({ preventScroll: true });
      msgEl.select();
      ok = document.execCommand('copy');
      msgEl.setSelectionRange(msgEl.value.length, msgEl.value.length);
    } catch (e) { ok = false; }
    if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msgEl.value).catch(function () {});
      ok = true;
    }
    return ok;
  }

  function openTab(url) {
    var w = window.open(url, '_blank', 'noopener,noreferrer');
    return w !== undefined; // with noopener the handle is null by design
  }

  function send() {
    if (!msgEl.value.trim()) { say('Write a short message first.', false); msgEl.focus(); return; }

    if (channel === 'whatsapp') {
      openTab('https://wa.me/' + ME.whatsapp + '?text=' + enc(msgEl.value));
      say('WhatsApp opened in a new tab. Check the message there and press send.', true);
    } else if (channel === 'email') {
      window.location.href = mailtoUrl();
      say('Your email app should open with everything filled in. Nothing opened? Use Gmail in the browser, or copy the message.', true);
    } else if (channel === 'linkedin') {
      var copied = copyMessage();
      openTab(ME.linkedin);
      say(copied
        ? 'Message copied. On my LinkedIn profile press Message (or Connect → Add a note) and paste it.'
        : 'LinkedIn opened. Copy the message above and paste it into LinkedIn.', true);
    } else if (channel === 'form') {
      fillSiteForm();
    }
  }

  function fillSiteForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var fName = document.getElementById('f-name');
    var fMsg = document.getElementById('f-msg');
    var fSubj = form.querySelector('input[name="subject"]');
    if (fName && nameEl.value.trim()) fName.value = nameEl.value.trim();
    if (fMsg) fMsg.value = msgEl.value;
    if (fSubj) fSubj.value = 'Portfolio: ' + TOPICS[topic()].subject;
    closeReach();
    var contact = document.getElementById('contact');
    if (contact) contact.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
    var next = fName && !fName.value ? fName : document.getElementById('f-email');
    window.setTimeout(function () { if (next) next.focus({ preventScroll: true }); }, reduced.matches ? 0 : 700);
  }

  function copyOnly() {
    say(copyMessage() ? 'Message copied.' : 'Select the message and copy it.', true);
  }

  /* ---------- open / close ---------- */
  function openReach(hint) {
    if (dlg.open) return;
    if (hint && TOPICS[hint]) {
      var r = $('input[name="r-topic"][value="' + hint + '"]');
      if (r) { r.checked = true; refresh(); }
    } else if (hint === 'question') {
      var q = $('input[name="r-topic"][value="other"]');
      if (q) { q.checked = true; refresh(); }
    }
    steps.forEach(function (s) { s.hidden = s.getAttribute('data-step') !== 'pick'; s.classList.remove('is-entering', 'is-back'); });
    say('', false);
    try { dlg.showModal(); } catch (err) { return; }
    document.documentElement.classList.add('reach-open');
    lines.start();
    var first = $('.reach-opt');
    if (first) first.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-reach]');
    if (!t) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let "open in new tab" work
    e.preventDefault();
    e.stopPropagation(); // the anchor's own smooth-scroll must not run
    openReach(t.getAttribute('data-reach'));
  }, true);

  // The dialog fills the viewport, so a click on its empty area (not the card) is "outside".
  // Only close when the press also started outside, so a text selection dragged out of a field is safe.
  var downOnEmpty = false;
  dlg.addEventListener('pointerdown', function (e) { downOnEmpty = e.target === dlg; });
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg && downOnEmpty) closeReach();
    downOnEmpty = false;
  });

  $('.reach-close').addEventListener('click', closeReach);
  $$('.reach-opt').forEach(function (b) {
    b.addEventListener('click', function () { choose(b.getAttribute('data-channel')); });
  });
  $('.reach-back').addEventListener('click', function () { showStep('pick', true); var o = $('.reach-opt[data-channel="' + channel + '"]'); if (o) o.focus({ preventScroll: true }); });
  sendBtn.addEventListener('click', send);
  $('[data-reach-copy]').addEventListener('click', copyOnly);
  $$('input[name="r-topic"]').forEach(function (r) { r.addEventListener('change', refresh); });
  nameEl.addEventListener('input', refresh);
  msgEl.addEventListener('input', function () { msgDirty = true; if (gmailLink) gmailLink.href = gmailUrl(); });
  subjEl.addEventListener('input', function () { subjDirty = true; if (gmailLink) gmailLink.href = gmailUrl(); });
  $('[data-reach-rewrite]').addEventListener('click', function () {
    msgDirty = false; subjDirty = false; refresh(); say('Rewritten from your choices above.', true);
  });

  /* ---------- 3D tilt on the choice step (fine pointers, motion allowed) ---------- */
  var raf = 0;
  function resetTilt() { tilt.style.setProperty('--rx', '0deg'); tilt.style.setProperty('--ry', '0deg'); }
  dlg.addEventListener('pointermove', function (e) {
    if (!finePointer.matches || reduced.matches) return;
    if ($('.reach-step[data-step="pick"]').hidden) return;
    if (raf) return;
    raf = window.requestAnimationFrame(function () {
      raf = 0;
      var r = tilt.getBoundingClientRect();
      var x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      x = Math.max(-1, Math.min(1, x));
      y = Math.max(-1, Math.min(1, y));
      tilt.style.setProperty('--ry', (x * 5).toFixed(2) + 'deg');
      tilt.style.setProperty('--rx', (-y * 4).toFixed(2) + 'deg');
    });
  });
  dlg.addEventListener('pointerleave', resetTilt);
  function closeReach() {
    if (dlg.open) dlg.close();
    document.documentElement.classList.remove('reach-open'); lines.stop();
    resetTilt();
  }
  dlg.addEventListener('close', closeReach);
  dlg.addEventListener('cancel', function () { document.documentElement.classList.remove('reach-open'); lines.stop(); });

  refresh();
})();
