/* Case 06 - AI photo search scene: play when on screen, loop while visible,
   still frame for reduced motion. Transform/opacity only; no layout work. */
(function () {
  'use strict';
  var scene = document.querySelector('.photo-scene');
  if (!scene) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var passMs = 6400;   // must match --ph-t in photo.css
  var restMs = 3600;   // hold the final frame before replaying
  var timer = 0, onScreen = false, waitingForIntro = !!(document.body && document.body.classList.contains('is-loading'));

  function build() {
    // fingerprint points on the print (fixed positions, so every visit matches)
    var dots = scene.querySelector('.ph-dots');
    [[36, 30], [58, 24], [46, 50], [64, 62], [33, 66], [52, 80]].forEach(function (p, i) {
      var d = document.createElement('i');
      d.style.left = p[0] + '%'; d.style.top = p[1] + '%'; d.style.setProperty('--d', String(i * 90));
      dots.appendChild(d);
    });
    // flying points: from the print, through the middle column, into the wall
    var fly = scene.querySelector('.ph-fly');
    var r = scene.getBoundingClientRect(), w = r.width || 640, h = r.height || 400;
    for (var k = 0; k < 6; k++) {
      var f = document.createElement('i');
      f.style.left = (20 + (k % 3) * 3) + '%';
      f.style.top = (36 + Math.floor(k / 3) * 14 + (k % 2) * 4) + '%';
      f.style.setProperty('--tx', Math.round(w * (0.42 + (k % 3) * 0.06)) + 'px');
      f.style.setProperty('--ty', Math.round(h * (-0.10 + Math.floor(k / 3) * 0.12 + (k % 2) * 0.04)) + 'px');
      f.style.setProperty('--d', String(k * 60));
      fly.appendChild(f);
    }
    // tiles: a little depth each, and a ripple delay that spreads out from the match
    var figs = scene.querySelectorAll('.ph-grid figure');
    var hit = 5, hx = hit % 4, hy = Math.floor(hit / 4);
    figs.forEach(function (fig, i) {
      var x = i % 4, y = Math.floor(i / 4);
      var dist = Math.sqrt((x - hx) * (x - hx) + (y - hy) * (y - hy));
      fig.style.setProperty('--z', String(((i * 7) % 3) * 3 - 3));   // -3..3px: depth without breaking the grid lines
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
