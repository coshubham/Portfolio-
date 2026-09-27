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
    document.documentElement.classList.remove('reach-open');
    resetTilt();
  }
  dlg.addEventListener('close', closeReach);
  dlg.addEventListener('cancel', function () { document.documentElement.classList.remove('reach-open'); });

  refresh();
})();
