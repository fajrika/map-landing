import * as THREE from "./vendor/three/three.module.min.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- NAV ---------- */
const nav = document.getElementById("nav");
const onScrollNav = () => nav.classList.toggle("scrolled", window.scrollY > 30);
window.addEventListener("scroll", onScrollNav, { passive: true });
onScrollNav();

/* ---------- MOBILE MENU ---------- */
const toggle = document.getElementById("navToggle");
const menu = document.getElementById("mobileMenu");
toggle.addEventListener("click", () => {
  const open = menu.hidden;
  menu.hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
});
menu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  })
);

/* ---------- 3D HERO ---------- */
function initScene() {
  const canvas = document.getElementById("hero-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 9;

  const group = new THREE.Group();
  scene.add(group);

  // --- Central torus knot (signature 3D object) ---
  const knotGeo = new THREE.TorusKnotGeometry(1.15, 0.32, 140, 18);
  const knotMat = new THREE.MeshPhysicalMaterial({
    color: 0x0ea5e9,
    metalness: 0.55,
    roughness: 0.18,
    transparent: true,
    opacity: 0.92,
    emissive: 0x0369a1,
    emissiveIntensity: 0.28,
  });
  const knot = new THREE.Mesh(knotGeo, knotMat);
  knot.position.set(0, 0.2, 0);
  group.add(knot);

  // --- Wireframe shell ---
  const shellMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.28 });
  const shell = new THREE.Mesh(new THREE.TorusKnotGeometry(1.42, 0.36, 90, 12), shellMat);
  group.add(shell);

  // --- Orbiting rings ---
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.48, 64), ringMat);
  ring1.rotation.x = Math.PI / 2.4;
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(2.9, 2.96, 64), ringMat);
  ring2.rotation.x = Math.PI / 1.8;
  ring2.material.opacity = 0.28;
  group.add(ring1, ring2);

  // --- Particles (network field) ---
  const count = 520;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 22;
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.035, transparent: true, opacity: 0.7 });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // --- Connection lines between nearby particles ---
  const maxDist = 2.2;
  const linesGeo = new THREE.BufferGeometry();
  const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.14 });
  const lines = new THREE.LineSegments(linesGeo, lineMat);
  scene.add(lines);
  const linePositions = [];

  // --- Small floating accent shapes ---
  const accentGroup = new THREE.Group();
  const geoPool = [
    new THREE.IcosahedronGeometry(0.16, 0),
    new THREE.OctahedronGeometry(0.13, 0),
    new THREE.BoxGeometry(0.16, 0.16, 0.16),
    new THREE.DodecahedronGeometry(0.13, 0),
  ];
  for (let i = 0; i < 26; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.56 + Math.random() * 0.12, 0.75, 0.6),
      metalness: 0.4,
      roughness: 0.3,
      transparent: true,
      opacity: 0.75,
    });
    const m = new THREE.Mesh(geoPool[i % geoPool.length], mat);
    m.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 8 - 2);
    m.userData.spin = { x: (Math.random() - 0.5) * 0.02, y: (Math.random() - 0.5) * 0.02 };
    accentGroup.add(m);
  }
  scene.add(accentGroup);

  // --- Lights ---
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const d1 = new THREE.DirectionalLight(0x7dd3fc, 1.2);
  d1.position.set(5, 6, 6);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.6);
  d2.position.set(-5, -3, 4);
  scene.add(d1, d2);
  const pt = new THREE.PointLight(0x0ea5e9, 18, 24);
  pt.position.set(0, 2, 4);
  scene.add(pt);

  let mouse = { x: 0, y: 0 };
  let target = { x: 0, y: 0 };
  window.addEventListener(
    "pointermove",
    (e) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -(e.clientY / window.innerHeight) * 2 + 1;
    },
    { passive: true }
  );

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    mouse.x += (target.x - mouse.x) * 0.04;
    mouse.y += (target.y - mouse.y) * 0.04;

    knot.rotation.x = t * 0.24 + mouse.y * 0.35;
    knot.rotation.y = t * 0.36 + mouse.x * 0.45;
    shell.rotation.x = -t * 0.16;
    shell.rotation.y = t * 0.2;
    ring1.rotation.z = t * 0.12;
    ring2.rotation.z = -t * 0.09;

    const posAttr = particles.geometry.attributes.position;
    const arr = posAttr.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += Math.sin(t * 0.4 + arr[i] * 0.7 + arr[i + 2] * 0.5) * 0.0012;
    }
    posAttr.needsUpdate = true;
    particles.rotation.y = t * 0.018;

    accentGroup.children.forEach((m) => {
      m.rotation.x += m.userData.spin.x;
      m.rotation.y += m.userData.spin.y;
      m.position.y += Math.sin(t * 0.6 + m.position.x) * 0.0015;
    });

    // connections
    linePositions.length = 0;
    for (let i = 0; i < count; i++) {
      const ax = arr[i * 3], ay = arr[i * 3 + 1], az = arr[i * 3 + 2];
      for (let j = i + 1; j < count; j++) {
        const dx = ax - arr[j * 3], dy = ay - arr[j * 3 + 1], dz = az - arr[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < maxDist * maxDist) {
          linePositions.push(ax, ay, az, arr[j * 3], arr[j * 3 + 1], arr[j * 3 + 2]);
        }
      }
    }
    lines.geometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    lines.geometry.attributes.position.needsUpdate = true;
    lines.geometry.setDrawRange(0, linePositions.length / 3);

    group.position.x = mouse.x * 0.5;
    group.position.y = -mouse.y * 0.35;
    group.rotation.y = mouse.x * 0.18;
    camera.position.z = 9 + mouse.y * 0.6;

    renderer.render(scene, camera);
  }

  if (prefersReducedMotion) {
    knot.rotation.x = 0.5;
    knot.rotation.y = 0.8;
    renderer.render(scene, camera);
  } else {
    tick();
  }
}
initScene();

/* ---------- REVEAL ON SCROLL ---------- */
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);
revealEls.forEach((el, i) => {
  el.style.transitionDelay = `${(i % 3) * 90}ms`;
  io.observe(el);
});

/* ---------- ANIMATED COUNTERS ---------- */
const counters = document.querySelectorAll("[data-count]");
const cio = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || "";
      if (prefersReducedMotion) {
        el.textContent = target + suffix;
        cio.unobserve(el);
        return;
      }
      const dur = 1400;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      cio.unobserve(el);
    });
  },
  { threshold: 0.5 }
);
counters.forEach((c) => cio.observe(c));

/* ---------- 3D TILT CARDS ---------- */
const tiltCards = document.querySelectorAll(".tilt");
if (!prefersReducedMotion) {
  tiltCards.forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

/* ---------- NEWSLETTER ---------- */
document.getElementById("newsForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  const old = btn.textContent;
  btn.textContent = "Terdaftar ✓";
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = old;
    btn.disabled = false;
    e.target.reset();
  }, 2600);
});
