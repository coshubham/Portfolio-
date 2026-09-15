import * as THREE from 'three';

const mount = document.getElementById('global-3d-bg');

if (mount) {
  try {
    initGlobalBackground(mount);
  } catch (e) {
    console.error("Global 3D Background init error:", e);
  }
}

function initGlobalBackground(mount) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(w, h);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.0015);

  const camera = new THREE.PerspectiveCamera(60, w / h, 1, 2000);
  camera.position.z = 400;

  // Particle System
  const particleGeo = new THREE.BufferGeometry();
  const particleCount = 1500;
  const posArray = new Float32Array(particleCount * 3);
  
  for(let i=0; i < particleCount * 3; i++) {
    // Spread across a large volume
    posArray[i] = (Math.random() - 0.5) * 1500;
  }
  
  particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  
  // Use the perfect purple color for particles
  const particleMat = new THREE.PointsMaterial({
    size: 2.5,
    color: 0xa855f7, // tailwind purple 500
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  
  const particleMesh = new THREE.Points(particleGeo, particleMat);
  scene.add(particleMesh);

  // Additional subtle wave mesh in background
  const waveGeo = new THREE.PlaneGeometry(2000, 2000, 60, 60);
  const waveMat = new THREE.MeshBasicMaterial({
    color: 0x9333ea,
    wireframe: true,
    transparent: true,
    opacity: 0.08
  });
  const waveMesh = new THREE.Mesh(waveGeo, waveMat);
  waveMesh.rotation.x = -Math.PI / 2.5;
  waveMesh.position.y = -300;
  waveMesh.position.z = -200;
  scene.add(waveMesh);

  // Interaction variables
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  const windowHalfX = window.innerWidth / 2;
  const windowHalfY = window.innerHeight / 2;

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - windowHalfX) * 0.05;
    mouseY = (e.clientY - windowHalfY) * 0.05;
  });

  let scrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  }, { passive: true });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    
    const t = clock.getElapsedTime();

    targetX = mouseX;
    targetY = mouseY;
    
    // Smooth camera movement based on mouse
    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (-targetY - camera.position.y) * 0.02;
    
    // Add scroll parallax
    camera.position.y += (-(scrollY * 0.2) - camera.position.y) * 0.05;
    
    camera.lookAt(scene.position);

    // Slowly rotate particles
    particleMesh.rotation.y = t * 0.05;
    particleMesh.rotation.x = t * 0.02;

    // Animate wave mesh vertices
    const positions = waveGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const vx = positions.getX(i);
      const vy = positions.getY(i);
      const z = Math.sin(vx * 0.005 + t) * Math.cos(vy * 0.005 + t) * 50;
      positions.setZ(i, z);
    }
    waveGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  animate();
}
