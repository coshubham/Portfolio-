/* ==========================================================================
   three-hero.js — the hero backdrop. A floor grid flowing toward the camera,
   translucent shards of code drifting in depth on the stack side (never
   behind the copy), light streaks flying past, rising dust and a soft
   spotlight. Pointer parallax (mouse only), scroll drift, and a camera dolly
   that starts only once the intro overlay is gone. The loop stops when the
   hero is mostly off-screen or the tab is hidden.
   Classic script (defer). Three.js 0.160 comes in through the import map with a
   dynamic import(), so the scene also works when index.html is opened from disk.
   ========================================================================== */
(function () {
'use strict';
const born = performance.now();

const mount = document.querySelector('.hero-x .hero-canvas');
const probe = document.createElement('canvas');
const probeGL = probe.getContext('webgl2') || probe.getContext('webgl');
if (probeGL) { const lose = probeGL.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); }   // give the probe context back
if (mount && probeGL) {
  import('three')
    .then(THREE => { try { init(THREE, mount); } catch (err) { console.warn('hero scene skipped:', err); mount.remove(); } })
    .catch(err => { console.warn('hero scene skipped (three.js did not load):', err); mount.remove(); });
} else if (mount) { mount.remove(); }

function init(THREE, mount) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mqMobile = matchMedia('(max-width: 1079px)');
  const isMobile = mqMobile.matches;
  const small = matchMedia('(max-width: 600px)').matches;
  const dprCap = isMobile ? 1 : 1.25;
  const BG = 0x0b1120, A = 0x22d3ee, B = 0x7dd3fc, W = 0xe8eefb;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  renderer.setClearColor(BG, 0);
  mount.style.opacity = '0';                       // stays hidden until the entrance
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, isMobile ? 0.075 : 0.058);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 90);
  const camHome = new THREE.Vector3(0, 0.9, 7.4);
  const lookAt = new THREE.Vector3(0, 0.25, 0);
  camera.position.copy(camHome);

  /* ---- floor grid, flows toward the camera ---- */
  const STEP = 1.6, HALF = 32;
  const gridPts = [];
  for (let i = -HALF; i <= HALF; i += STEP) { gridPts.push(-HALF, 0, i, HALF, 0, i); gridPts.push(i, 0, -HALF, i, 0, HALF); }
  const gridGeo = new THREE.BufferGeometry(); gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
  const grid = new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: A, transparent: true, opacity: isMobile ? 0.11 : 0.15, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  grid.position.set(0, -2.7, -18); scene.add(grid);

  /* ---- shards of code (desktop only; stacked layouts are text-first). search.py is not here: the editor already shows it ---- */
  const files = [
    ['# embed.py', 'async def embed_query(text: str) -> list[float]:', '    key = "emb:" + sha1(text.encode()).hexdigest()', '    if cached := await redis.get(key):', '        return orjson.loads(cached)', '    res = await oai.embeddings.create(  # AsyncOpenAI', '        model="text-embedding-3-large", input=text)', '    vec = res.data[0].embedding', '    await redis.set(key, orjson.dumps(vec), ex=86400)', '    return vec'],
    ['# docker-compose.yml', 'services:', '  api:', '    build: .', '    depends_on: [opensearch, redis]', '  redis:', '    image: redis:7-alpine', '  opensearch:', '    image: opensearchproject/opensearch:2.11', '  nginx:', '    image: nginx:1.27-alpine'],
    ['// SearchBox.jsx', 'export function SearchBox({ tenant }) {', '  const [q, setQ] = useState("");', '  const { data, isFetching } = useSearch(q, tenant);', '  return (', '    <form onSubmit={e => e.preventDefault()}>', '      <input value={q} onChange={e => setQ(e.target.value)} />', '      <Results hits={data?.hits} loading={isFetching} />', '    </form>', '  );', '}'],
    ['-- latency by day', 'SELECT client_id, date_trunc(\'day\', ts) AS day,', '       count(*) AS searches,', '       percentile_cont(0.5) WITHIN GROUP (ORDER BY ms) AS p50', 'FROM search_log', 'WHERE ts > now() - interval \'30 days\'', 'GROUP BY 1, 2', 'ORDER BY day DESC;'],
    ['# nginx.conf', 'server {', '  listen 443 ssl;', '  http2 on;', '  ssl_certificate     /etc/letsencrypt/live/api/fullchain.pem;', '  ssl_certificate_key /etc/letsencrypt/live/api/privkey.pem;', '  location /v1/ {', '    proxy_pass http://api:8000;', '    proxy_read_timeout 30s;', '  }', '}'],
    ['# test_tenant_isolation.py', '@pytest.mark.parametrize("tenant", TENANTS)', 'async def test_search_never_leaks(tenant, client):', '    r = await client.post("/v1/search",', '                          json={"text": "shoes"},', '                          headers=auth(tenant))', '    assert r.status_code == 200', '    ids = {h["client_id"] for h in r.json()["hits"]}', '    assert ids <= {tenant.id}'],
  ];
  const NS = isMobile ? 0 : 9;
  let textures = NS ? files.map(codeTexture) : [];
  let seed = 7;
  const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const shards = new THREE.Group(); scene.add(shards);
  const shardGeo = new THREE.PlaneGeometry(3.4, 1.9);
  for (let i = 0; i < NS; i++) {
    const s = new THREE.Mesh(shardGeo, new THREE.MeshBasicMaterial({ map: textures[i % textures.length], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }));
    s.rotation.set((rand() - 0.5) * 0.5, (rand() - 0.5) * 0.9, (rand() - 0.5) * 0.12);
    s.scale.setScalar(0.65 + rand() * 0.75);
    s.userData = { y0: 0, ry: s.rotation.y, ph: rand() * Math.PI * 2, sp: 0.12 + rand() * 0.2, op: 0 };
    shards.add(s);
  }
  // the same composition on every load; each shard's left edge must clear the text column (screen x > 0.04)
  const probeV = new THREE.Vector3();
  const placeShards = () => {
    if (!NS) return;
    seed = 20260915;
    camera.position.copy(camHome); camera.lookAt(lookAt); camera.updateMatrixWorld();
    for (const s of shards.children) {
      for (let n = 0; n < 40; n++) {
        const z = -1.5 - rand() * 9.5, spread = 7 + -z * 0.45;
        s.position.set(0.5 + rand() * spread, -1.4 + rand() * 4.6, z);
        if (probeV.set(s.position.x - 1.7 * s.scale.x - 0.4, s.position.y, z).project(camera).x > 0.04) break;   // 1.7 = half width, 0.4 = parallax margin
      }
      const depth = (-s.position.z - 1.5) / 9.5;          // 0 near, 1 far
      s.userData.y0 = s.position.y;
      s.userData.op = 0.2 - depth * 0.12;                  // far shards are dimmer
    }
  };

  /* ---- light streaks: packets flying past (stack side only on desktop) ---- */
  const NK = small ? 0 : isMobile ? 6 : 14;
  const streakGeo = new THREE.BoxGeometry(0.018, 0.018, 1);
  const streaks = [];
  const resetStreak = (s, first) => {
    const side = mqMobile.matches ? (Math.random() < 0.5 ? -1 : 1) : 1;
    s.position.set(side * (1.8 + Math.random() * 7), -2.4 + Math.random() * 5.5, first ? -50 + Math.random() * 60 : -50 - Math.random() * 20);
    s.scale.z = 1.5 + Math.random() * 5; s.userData.v = 5 + Math.random() * 9;
  };
  for (let i = 0; i < NK; i++) {
    const s = new THREE.Mesh(streakGeo, new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? W : A, transparent: true, opacity: 0.25 + Math.random() * 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
    s.userData = {}; resetStreak(s, true); scene.add(s); streaks.push(s);
  }

  /* ---- dust ---- */
  const ND = small ? 120 : isMobile ? 220 : 520;
  const dustPos = new Float32Array(ND * 3);
  for (let i = 0; i < ND; i++) dustPos.set([(Math.random() - 0.5) * 20, -2.6 + Math.random() * 7, -15 + Math.random() * 19], i * 3);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: B, size: 0.05, sizeAttenuation: true, map: dotTexture(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  scene.add(dust);

  /* ---- spotlight + a cooler bloom on the left ---- */
  const glowTex = glowTexture();
  const spotOp = isMobile ? 0.4 : 0.55;
  const spot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: A, transparent: true, opacity: spotOp, blending: THREE.AdditiveBlending, depthWrite: false }));
  spot.scale.set(12, 10, 1); spot.position.set(isMobile ? 0 : 2.6, 0.9, -4.5); scene.add(spot);
  const bloom = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x0ea5e9, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  bloom.scale.set(16, 12, 1); bloom.position.set(-4, -1.5, -9); scene.add(bloom);

  /* ---- pointer (mouse only: a finger drag should not swing the camera) + scroll ---- */
  const ptr = { x: 0, y: 0 }, sm = { x: 0, y: 0 }; let scrollT = 0, scrollCur = 0;
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.x = 0; ptr.y = 0; });
  addEventListener('scroll', () => { scrollT = scrollY / Math.max(1, innerHeight); }, { passive: true });

  /* ---- resize: follows the hero box itself, not only the window ---- */
  let lw = 0, lh = 0, ready = false;
  const resize = () => {
    const w = mount.clientWidth || innerWidth, h = mount.clientHeight || innerHeight;
    if (w === lw && h === lh) return; lw = w; lh = h;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    camHome.z = w / h < 1 ? 9.6 : w / h < 1.4 ? 8.2 : 7.4;
    placeShards();
    shards.visible = !mqMobile.matches;                    // stacked layouts are text-first, even after a resize
    if (reduceMotion && ready) renderStatic();
  };
  if ('ResizeObserver' in window) new ResizeObserver(() => resize()).observe(mount); else addEventListener('resize', resize);
  resize();

  /* ---- loop ---- */
  const clock = new THREE.Clock();
  const ENTER = 2600;
  const easeOut = x => 1 - Math.pow(1 - x, 4);
  let t0 = 0, running = false, raf = 0, inView = true, last = 0;
  const GAP = small ? 30 : 0;                                // small phones: ~30 fps is plenty for a slow drift
  const frame = now => {
    if (!running) return; raf = requestAnimationFrame(frame);
    if (GAP && now - last < GAP) return; last = now;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const e = easeOut(Math.min(1, (performance.now() - t0) / ENTER));
    const f = dt * 60, kp = 1 - Math.pow(0.955, f), ks = 1 - Math.pow(0.92, f);   // frame-rate independent easing
    sm.x += (ptr.x - sm.x) * kp; sm.y += (ptr.y - sm.y) * kp; scrollCur += (scrollT - scrollCur) * ks;
    if (isMobile) { sm.x = Math.sin(t * 0.25) * 0.5; sm.y = Math.cos(t * 0.19) * 0.35; }

    grid.position.z = -18 + ((t * 0.9) % STEP);
    for (const s of shards.children) { const d = s.userData; s.position.y = d.y0 + Math.sin(t * d.sp + d.ph) * 0.2; s.rotation.y = d.ry + Math.sin(t * 0.18 + d.ph) * 0.08 + sm.x * 0.05; s.material.opacity = d.op * e; }
    for (const s of streaks) { s.position.z += s.userData.v * dt; if (s.position.z > 10) resetStreak(s, false); }
    const p = dustGeo.attributes.position.array;
    for (let i = 1; i < p.length; i += 3) { p[i] += dt * 0.07; if (p[i] > 4.6) p[i] = -2.6; }
    dustGeo.attributes.position.needsUpdate = true;
    dust.rotation.y = Math.sin(t * 0.05) * 0.1;
    spot.material.opacity = spotOp * (0.9 + Math.sin(t * 0.8) * 0.1) * e;

    camera.position.x = camHome.x + sm.x * 0.6;
    camera.position.y = camHome.y - sm.y * 0.3 - scrollCur * 1.6;
    camera.position.z = camHome.z + (1 - e) * 5;
    camera.lookAt(lookAt.x, lookAt.y - scrollCur * 0.6, lookAt.z);
    renderer.render(scene, camera);
  };
  const start = () => { if (!running) { running = true; last = 0; clock.getDelta(); raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  const sync = () => (ready && !reduceMotion && inView && !document.hidden ? start() : stop());
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { inView = en.intersectionRatio >= 0.2; sync(); }, { threshold: [0, 0.2] }).observe(mount);

  function renderStatic() {
    shards.children.forEach(s => { s.material.opacity = s.userData.op; });
    camera.position.copy(camHome); camera.lookAt(lookAt); renderer.render(scene, camera);
  }

  /* ---- code font: redraw the shards once JetBrains Mono has really loaded ---- */
  const monoOK = () => !!document.fonts && [...document.fonts].some(f => f.family.replace(/["']/g, '') === 'JetBrains Mono' && f.status === 'loaded');
  const redraw = () => {
    if (!NS || !monoOK()) return;
    document.fonts.removeEventListener('loadingdone', redraw);
    const fresh = files.map(codeTexture);
    fresh.forEach(tx => renderer.initTexture(tx));                 // upload now, not on an entrance frame
    shards.children.forEach((s, i) => { s.material.map = fresh[i % fresh.length]; s.material.needsUpdate = true; });
    textures.forEach(tx => tx.dispose()); textures = fresh;
    if (reduceMotion && ready) renderStatic();
  };
  if (NS && document.fonts && !monoOK()) document.fonts.addEventListener('loadingdone', redraw);

  /* ---- start: compile shaders and upload textures behind the intro, then fade in and dolly ---- */
  const warm = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera));
  warm.catch(() => {}).then(function go() {
    if (document.body.classList.contains('is-loading') && performance.now() - born < 8000) { setTimeout(go, 120); return; }
    textures.forEach(tx => renderer.initTexture(tx));
    void mount.offsetWidth;
    mount.style.transition = reduceMotion ? 'none' : 'opacity 1.6s ease';
    mount.style.opacity = '';                                     // ends on the stylesheet value (1 / 0.75 / 0.5)
    ready = true; t0 = performance.now();
    if (reduceMotion) { renderStatic(); return; }
    sync();
  });

  /* ---- helpers ---- */
  function codeTexture(lines) {
    const c = document.createElement('canvas'); c.width = 680; c.height = 380;
    const g = c.getContext('2d');
    g.font = '500 17px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace'; g.textBaseline = 'top';
    const KW = /^(from|import|async|def|await|return|if|else|for|in|export|function|const|SELECT|FROM|WHERE|GROUP|ORDER|BY|AS|WITHIN|server|location|listen|services|build|image|assert)$/;
    lines.forEach((ln, i) => {
      let x = 22; const y = 20 + i * 34;
      if (/^(#|\/\/|--)/.test(ln)) { g.fillStyle = 'rgba(148,163,184,0.55)'; g.fillText(ln, x, y); return; }
      const parts = ln.match(/("[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|[A-Za-z_][\w.]*|\s+|.)/g) || [ln];
      for (const p of parts) {
        if (/^["']/.test(p)) g.fillStyle = 'rgba(134,239,172,0.9)';
        else if (/^\d/.test(p)) g.fillStyle = 'rgba(252,211,77,0.9)';
        else if (KW.test(p)) g.fillStyle = 'rgba(103,232,249,0.95)';
        else if (/^[A-Za-z_]/.test(p)) g.fillStyle = 'rgba(226,232,240,0.85)';
        else g.fillStyle = 'rgba(148,163,184,0.7)';
        g.fillText(p, x, y); x += g.measureText(p).width;
      }
    });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.anisotropy = 4; return t;
  }
  function glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function dotTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.4)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
  }
}
})();
