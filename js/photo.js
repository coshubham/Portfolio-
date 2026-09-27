/* Case 06 — AI photo search scene: play when on screen, loop while visible,
   still frame for reduced motion. Transform/opacity only; no layout work. */
(function () {
  'use strict';
  var scene = document.querySelector('.photo-scene');
  if (!scene) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var passMs = 5600;   // must match --ph-t in photo.css
  var restMs = 2400;   // pause on the final frame before replaying
  var timer = 0, onScreen = false, waitingForIntro = !!(document.body && document.body.classList.contains('is-loading'));

  function build() {
    // fingerprint points on the photo (random-looking but fixed, so every visit matches)
    var dots = scene.querySelector('.ph-dots');
    var pts = [[38, 30], [58, 26], [47, 48], [62, 60], [34, 62], [52, 78], [41, 88], [68, 42]];
    pts.forEach(function (p, i) {
      var d = document.createElement('i');
      d.style.left = p[0] + '%'; d.style.top = p[1] + '%'; d.style.setProperty('--d', String(i * 90));
      dots.appendChild(d);
    });
    // flying points: from the photo (left) to the catalogue (right)
    var fly = scene.querySelector('.ph-fly');
    var r = scene.getBoundingClientRect();
    var w = r.width || 640, h = r.height || 400;
    for (var k = 0; k < 8; k++) {
      var f = document.createElement('i');
      f.style.left = (26 + (k % 4) * 3) + '%';
      f.style.top = (36 + Math.floor(k / 4) * 10 + (k % 3) * 3) + '%';
      f.style.setProperty('--tx', Math.round(w * (0.36 + (k % 4) * 0.055)) + 'px');
      f.style.setProperty('--ty', Math.round(h * (-0.16 + Math.floor(k / 4) * 0.12 + (k % 3) * 0.03)) + 'px');
      f.style.setProperty('--d', String(k * 60));
      fly.appendChild(f);
    }
  }

  function play() {
    if (reduced.matches) { scene.classList.add('is-still'); return; }
    window.clearTimeout(timer);
    scene.classList.remove('is-done', 'is-still', 'is-playing');
    void scene.offsetWidth;                 // restart the CSS animations
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
  if (reduced.matches) { scene.classList.add('is-still'); }
  reduced.addEventListener && reduced.addEventListener('change', function () { onScreen ? start() : null; });

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
