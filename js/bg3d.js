/* ==========================================================================
   bg3d.js — the 3D backdrop behind the whole page: an ocean of light.
   A wide field of glowing points and fine silk contour lines rolls in slow
   waves toward a far horizon. Scrolling carries you forward over the field,
   the camera drifts and follows the mouse a little, and crests catch a
   brighter cyan. All the motion runs in the vertex shader (one draw call for
   the points, one per contour line), so it stays light on phones.
   Starts after the intro overlay is gone, pauses while the tab is hidden,
   one still frame for reduced motion. Classic script (defer); Three.js comes
   in through the import map with a dynamic import(), so file:// works too.
   ========================================================================== */
(function () {
  'use strict';
  const born = performance.now();
  const amb = document.querySelector('.ambient');
  if (!amb) return;
  const probe = document.createElement('canvas');
  const probeGL = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!probeGL) return;
  const lose = probeGL.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();

  import('three')
    .then(THREE => { try { init(THREE); } catch (err) { console.warn('background scene skipped:', err); } })
    .catch(err => console.warn('background scene skipped (three.js did not load):', err));

  function init(THREE) {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = matchMedia('(max-width: 760px)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1 : 1.25));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.className = 'amb-3d';
    canvas.setAttribute('aria-hidden', 'true');
    amb.insertBefore(canvas, amb.querySelector('.amb-grid') || amb.firstChild);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(small ? 62 : 55, 1, 0.1, 220);

    // the field: COLS x ROWS points on the ground plane
    const COLS = small ? 96 : 190, ROWS = small ? 64 : 118;
    const X = 66, Z0 = 10, Z1 = -96;
    const pts = new Float32Array(COLS * ROWS * 3);
    let o = 0;
    for (let r = 0; r < ROWS; r++) {
      const z = Z0 + (Z1 - Z0) * (r / (ROWS - 1));
      for (let c = 0; c < COLS; c++) { pts[o++] = -X + (2 * X) * (c / (COLS - 1)); pts[o++] = 0; pts[o++] = z; }
    }

    const uniforms = {
      uTime: { value: 0 }, uScroll: { value: 0 }, uPR: { value: renderer.getPixelRatio() },
      uSize: { value: small ? 2.3 : 2.1 }, uAlpha: { value: 0 },
      cLow: { value: new THREE.Color(0x4a3a1a) }, cMid: { value: new THREE.Color(0xc9a961) }, cHigh: { value: new THREE.Color(0xf1e6c8) },
    };
    const VERT = `
      uniform float uTime; uniform float uScroll; uniform float uSize; uniform float uPR;
      varying float vA; varying float vK;
      float wave(vec2 p, float t) {
        return sin(p.x * 0.16 + t * 0.50) * 0.85
             + sin(p.y * 0.20 - t * 0.66 + p.x * 0.05) * 0.65
             + sin((p.x * 0.55 + p.y) * 0.075 + t * 0.28) * 1.35
             + sin(p.x * 0.42 - p.y * 0.31 + t * 1.05) * 0.2;
      }
      void main() {
        vec3 p = position;
        float h = wave(vec2(p.x, p.z - uScroll), uTime);
        p.y += h;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float depth = -mv.z;
        gl_PointSize = uSize * uPR * (24.0 / depth);
        vK = clamp((h + 2.6) / 5.2, 0.0, 1.0);
        vA = (1.0 - smoothstep(38.0, 96.0, depth)) * smoothstep(1.5, 8.0, depth) * (1.0 - smoothstep(0.6, 1.0, abs(position.x) / ${X.toFixed(1)}));
      }`;
    const COLOR = `
      uniform vec3 cLow; uniform vec3 cMid; uniform vec3 cHigh; uniform float uAlpha;
      varying float vA; varying float vK;
      vec3 tint() { vec3 c = mix(cLow, cMid, smoothstep(0.15, 0.62, vK)); return mix(c, cHigh, smoothstep(0.7, 1.0, vK)); }`;

    const pointMat = new THREE.ShaderMaterial({
      uniforms, vertexShader: VERT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      fragmentShader: COLOR + `
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.06, d);
          gl_FragColor = vec4(tint(), a * vA * uAlpha * (0.28 + 0.72 * vK));
        }`,
    });
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    scene.add(new THREE.Points(pgeo, pointMat));

    // silk contour lines: every few rows, drawn as continuous lines with the same waves
    const lineMat = new THREE.ShaderMaterial({
      uniforms, vertexShader: VERT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      fragmentShader: COLOR + `
        void main() { gl_FragColor = vec4(tint(), vA * uAlpha * (0.08 + 0.2 * vK)); }`,
    });
    const EVERY = small ? 8 : 7, LCOLS = COLS * 2;
    for (let r = 3; r < ROWS; r += EVERY) {
      const z = Z0 + (Z1 - Z0) * (r / (ROWS - 1));
      const lp = new Float32Array(LCOLS * 3);
      for (let c = 0; c < LCOLS; c++) { lp[c * 3] = -X + (2 * X) * (c / (LCOLS - 1)); lp[c * 3 + 1] = 0; lp[c * 3 + 2] = z; }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
      scene.add(new THREE.Line(lg, lineMat));
    }

    // size
    let W = 0, H = 0;
    const resize = () => {
      const w = innerWidth, h = Math.max(innerHeight, document.documentElement.clientHeight || 0);
      if (Math.abs(w - W) < 2 && Math.abs(h - H) < 80) return;       // ignore the mobile URL bar showing and hiding
      W = w; H = h;
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      if (!running) renderOnce();
    };

    // input
    let mx = 0, my = 0, smx = 0, smy = 0, sScroll = 0;
    if (finePointer) addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; } }, { passive: true });

    const place = t => {
      const sp = Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
      sScroll += (scrollY - sScroll) * 0.06;
      smx += (mx - smx) * 0.03; smy += (my - smy) * 0.03;
      uniforms.uScroll.value = sScroll * (small ? 0.012 : 0.009);                  // scrolling carries you forward over the field
      camera.position.set(Math.sin(t * 0.05) * 2.2 + smx * 3.2, 4.6 + Math.sin(t * 0.08) * 0.35 - smy * 1.2 + sp * 1.4, 13);
      camera.lookAt(smx * 4, 0.2 - sp * 0.8, -26);
      camera.rotateZ(Math.sin(t * 0.04) * 0.02);
    };
    const renderOnce = () => { place(uniforms.uTime.value); renderer.render(scene, camera); };

    // loop
    let running = false, raf = 0, last = 0, t0 = 0, fadeStart = 0;
    const gap = small ? 32 : 15;
    const frame = now => {
      raf = requestAnimationFrame(frame);
      if (now - last < gap) return;
      const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
      uniforms.uTime.value += dt;
      const fade = Math.min(1, (now - fadeStart) / 2200);
      uniforms.uAlpha.value = (small ? 0.85 : 0.95) * fade * fade * (3 - 2 * fade);
      renderOnce();
    };
    const start = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : (fadeStart && !reduceMotion && start())));
    addEventListener('resize', resize, { passive: true });
    resize();

    // begin once the intro overlay has cleared (no shader compile behind the loader)
    const go = () => {
      if (document.body.classList.contains('is-loading') && performance.now() - born < 8000) { setTimeout(go, 150); return; }
      renderer.compile(scene, camera);
      fadeStart = performance.now();
      if (reduceMotion) { uniforms.uTime.value = 6; uniforms.uAlpha.value = small ? 0.8 : 0.9; renderOnce(); addEventListener('scroll', () => requestAnimationFrame(renderOnce), { passive: true }); return; }
      if (!document.hidden) start();
    };
    go();
  }
})();
