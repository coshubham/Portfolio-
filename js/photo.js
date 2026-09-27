/* Case 06 - AI photo search scene: play when on screen, loop while visible,
   still frame for reduced motion, pointer parallax on desktop.
   Transform/opacity only; no layout work. */
(function () {
  'use strict';
  var scene = document.querySelector('.photo-scene');
  if (!scene) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var passMs = 6400;   // must match --ph-t in photo.css
  var restMs = 3200;   // hold the final frame before replaying
  var timer = 0, onScreen = false, waitingForIntro = !!(document.body && document.body.classList.contains('is-loading'));

  function build() {
    // fingerprint points on the photo (fixed positions, so every visit matches)
    var dots = scene.querySelector('.ph-dots');
    [[36, 30], [56, 24], [46, 47], [62, 58], [33, 62], [52, 76], [41, 86], [68, 40]].forEach(function (p, i) {
      var d = document.createElement('i');
      d.style.left = p[0] + '%'; d.style.top = p[1] + '%'; d.style.setProperty('--d', String(i * 80));
      dots.appendChild(d);
    });
    // flying points: from the photo to the catalogue wall
    var fly = scene.querySelector('.ph-fly');
    var r = scene.getBoundingClientRect(), w = r.width || 640, h = r.height || 400;
    for (var k = 0; k < 9; k++) {
      var f = document.createElement('i');
      f.style.left = (25 + (k % 3) * 4) + '%';
      f.style.top = (34 + Math.floor(k / 3) * 11 + (k % 2) * 3) + '%';
      f.style.setProperty('--tx', Math.round(w * (0.34 + (k % 4) * 0.05)) + 'px');
      f.style.setProperty('--ty', Math.round(h * (-0.14 + Math.floor(k / 3) * 0.10 + (k % 3) * 0.03)) + 'px');
      f.style.setProperty('--d', String(k * 50));
      fly.appendChild(f);
    }
    // tiles: a little depth each, and a ripple delay that spreads out from the match
    var figs = scene.querySelectorAll('.ph-grid figure');
    var hit = 5, hx = hit % 4, hy = Math.floor(hit / 4);
    figs.forEach(function (fig, i) {
      var x = i % 4, y = Math.floor(i / 4);
      var dist = Math.sqrt((x - hx) * (x - hx) + (y - hy) * (y - hy));
      fig.style.setProperty('--z', String(((i * 7) % 5) * 5 - 10));   // -10..10px
      fig.style.setProperty('--r', String(Math.round(dist * 70)));
    });
  }

  function play() {
    if (reduced.matches) { scene.classList.add('is-still'); return; }
    window.clearTimeout(timer);
    scene.classList.remove('is-done', 'is-still', 'is-playing');
    void scene.offsetWidth;
    scene.classList.add('is-playing');
    timer = window.setTimeout(function () {
      scene.classList.add('is-done');
      scene.classList.remove('is-playing');
      if (onScreen) timer = window.setTimeout(play, restMs);
    }, passMs);
  }

  function start() {
    if (!onScreen) return;
    if (waitingForIntro && document.body.classList.contains('is-loading')) { window.setTimeout(start, 200); return; }
    waitingForIntro = false;
    play();
  }

  build();
  if (reduced.matches) scene.classList.add('is-still');

  var replay = scene.querySelector('.ph-replay');
  if (replay) replay.addEventListener('click', play);

  // parallax: the whole stage leans a few degrees toward the pointer (desktop only)
  var stage = scene.querySelector('.ph-stage'), raf = 0;
  if (finePointer.matches && !reduced.matches && stage) {
    scene.addEventListener('pointermove', function (e) {
      if (raf) return;
      raf = window.requestAnimationFrame(function () {
        raf = 0;
        var b = scene.getBoundingClientRect();
        var px = (e.clientX - b.left) / b.width - 0.5, py = (e.clientY - b.top) / b.height - 0.5;
        stage.style.transform = 'rotateY(' + (px * 6).toFixed(2) + 'deg) rotateX(' + (-py * 4).toFixed(2) + 'deg)';
      });
    });
    scene.addEventListener('pointerleave', function () { stage.style.transform = ''; });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var was = onScreen;
        onScreen = e.isIntersecting && e.intersectionRatio >= 0.35;
        if (onScreen && !was) start();
        if (!onScreen) { window.clearTimeout(timer); if (!scene.classList.contains('is-done')) scene.classList.remove('is-playing'); }
      });
    }, { threshold: [0, 0.35, 0.6] }).observe(scene);
  } else {
    onScreen = true; start();
  }
})();
