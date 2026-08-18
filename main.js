import * as THREE from "./vendor/three/three.module.min.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const lerp = (a, b, t) => a + (b - a) * t;

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

/* =========================================================
   PERSISTENT 3D JOURNEY — dunia 3D kontinu di belakang halaman
   Kamera terbang maju sepanjang sumbu Z mengikuti scroll,
   melewati objek-objek 3D yang ditempatkan di sepanjang jalur.
   ========================================================= */
let scrollProgress = 0; // 0..1 dari atas halaman
const pointer = { x: 0, y: 0 };

function initJourney() {
  const canvas = document.getElementById("bg-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0b1220, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
  camera.position.set(0, 0.5, 6);

  const world = new THREE.Group();
  scene.add(world);

  const matStandard = (color, opts = {}) =>
    new THREE.MeshStandardMaterial({
      color,
      metalness: opts.metalness ?? 0.55,
      roughness: opts.roughness ?? 0.22,
      transparent: opts.transparent ?? true,
      opacity: opts.opacity ?? 0.9,
      emissive: opts.emissive ?? 0x0369a1,
      emissiveIntensity: opts.emissiveIntensity ?? 0.25,
    });
  const matWire = (color, opacity = 0.28) =>
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });

  // ---- HERO CENTERPIECE (torus knot) ----
  const heroKnot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.15, 0.32, 140, 18),
    matStandard(0x0ea5e9)
  );
  heroKnot.position.set(0, 0.6, -18);
  const heroShell = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.45, 0.37, 90, 12),
    matWire(0x38bdf8, 0.3)
  );
  heroShell.position.copy(heroKnot.position);
  world.add(heroKnot, heroShell);

  // ---- ZONE CENTERPIECES (objek besar per bagian halaman) ----
  const zoneDefs = [
    { z: -66, geo: new THREE.IcosahedronGeometry(1.7, 0), color: 0x38bdf8, wire: true, wireColor: 0x7dd3fc },
    { z: -112, geo: new THREE.OctahedronGeometry(1.9, 0), color: 0x0ea5e9 },
    { z: -158, geo: new THREE.TorusGeometry(1.5, 0.45, 20, 48), color: 0x38bdf8 },
    { z: -204, geo: new THREE.DodecahedronGeometry(1.6, 0), color: 0x7dd3fc },
    { z: -252, geo: new THREE.BoxGeometry(2.4, 2.4, 2.4), color: 0x0ea5e9, wire: true, wireColor: 0x38bdf8 },
  ];
  const zones = zoneDefs.map((d, i) => {
    const g = new THREE.Group();
    const main = d.wire
      ? new THREE.Mesh(d.geo, matWire(d.wireColor, 0.5))
      : new THREE.Mesh(d.geo, matStandard(d.color));
    g.add(main);
    if (!d.wire) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(d.geo.parameters?.radius ? 2.1 : 2.2, (d.geo.parameters?.radius ? 2.1 : 2.2) + 0.08, 48),
        matWire(0x7dd3fc, 0.45)
      );
      ring.position.z = 0.3;
      ring.rotation.x = Math.PI / 2.2;
      g.add(ring);
    }
    g.position.set((i % 2 === 0 ? 1 : -1) * 2.6, (i % 3 === 0 ? 1.1 : -0.6), d.z);
    g.userData.spin = { x: (i % 2 ? 0.12 : -0.1), y: 0.2 + i * 0.03 };
    g.userData.bob = i * 0.7;
    world.add(g);
    return g;
  });

  // ---- SCATTER OBJECTS (objek kecil di sepanjang jalur terbang) ----
  const scatter = [];
  const scatterGeos = [
    () => new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.3, 0),
    () => new THREE.OctahedronGeometry(0.25 + Math.random() * 0.28, 0),
    () => new THREE.BoxGeometry(0.4 + Math.random() * 0.3, 0.4 + Math.random() * 0.3, 0.4 + Math.random() * 0.3),
    () => new THREE.TetrahedronGeometry(0.3 + Math.random() * 0.3, 0),
  ];
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(
      scatterGeos[i % scatterGeos.length](),
      matStandard(new THREE.Color().setHSL(0.54 + Math.random() * 0.16, 0.7, 0.62), {
        metalness: 0.4, roughness: 0.3, opacity: 0.7, emissiveIntensity: 0.15,
      })
    );
    const z = -24 - Math.random() * 236;
    m.position.set(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 7,
      z
    );
    m.userData.spin = { x: (Math.random() - 0.5) * 0.02, y: (Math.random() - 0.5) * 0.02 };
    m.userData.baseY = m.position.y;
    m.userData.baseZ = z;
    scatter.push(m);
    world.add(m);
  }

  // ---- PARTICLE STREAM (koridor partikel yang terbang lewat) ----
  const pCount = 1100;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const z = -Math.random() * 280;
    pPos[i * 3] = (Math.random() - 0.5) * 20;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    pPos[i * 3 + 2] = z;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.06, transparent: true, opacity: 0.65 })
  );
  scene.add(particles);

  // ---- GRID FLOOR (landasan kedalaman) ----
  const grid = new THREE.GridHelper(120, 60, 0x0ea5e9, 0x1e3a5f);
  grid.material.transparent = true;
  grid.material.opacity = 0.28;
  grid.position.y = -5;
  scene.add(grid);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const d1 = new THREE.DirectionalLight(0x7dd3fc, 1.2);
  d1.position.set(5, 6, 8);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.5);
  d2.position.set(-6, -3, 4);
  scene.add(d1, d2);
  const pt = new THREE.PointLight(0x0ea5e9, 16, 30);
  pt.position.set(0, 3, 4);
  scene.add(pt);

  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    },
    { passive: true }
  );

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  const TRAVEL = 268; // total kedalaman jalur = progress 0..1

  function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    const sp = scrollProgress;
    const camZ = 6 + sp * TRAVEL;
    const smoothZ = lerp(camera.position.z, camZ, 0.1);

    // kamera terbang + goyangan halus + parallax mouse
    camera.position.z = smoothZ;
    camera.position.x = lerp(camera.position.x, pointer.x * 1.4, 0.04);
    camera.position.y = lerp(camera.position.y, 0.5 + pointer.y * 0.6 + Math.sin(t * 0.5) * 0.15, 0.04);
    camera.lookAt(camera.position.x * 1.2, camera.position.y * 0.8, smoothZ + 20);

    // grid mengikuti kamera agar efek "terbang" terasa
    grid.position.z = smoothZ;

    // hero knot
    heroKnot.rotation.x = t * 0.24 + sp * 5;
    heroKnot.rotation.y = t * 0.36 + sp * 4;
    heroShell.rotation.x = -t * 0.16 - sp * 2.6;
    heroShell.rotation.y = t * 0.2 + sp * 3;

    // zone centerpieces
    zones.forEach((g, i) => {
      g.rotation.x += g.userData.spin.x;
      g.rotation.y += g.userData.spin.y;
      g.position.y += Math.sin(t * 0.6 + g.userData.bob) * 0.004;
    });

    // scatter objects: spin + drift + parallax
    scatter.forEach((m) => {
      m.rotation.x += m.userData.spin.x;
      m.rotation.y += m.userData.spin.y;
      m.position.y = m.userData.baseY + Math.sin(t * 0.6 + m.userData.baseZ * 0.1) * 0.35;
      m.position.z = m.userData.baseZ + sp * 0;
    });

    // particles: drift lembut + rotasi global
    const arr = pGeo.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += Math.sin(t * 0.5 + arr[i] * 0.6 + arr[i + 2] * 0.3) * 0.0018;
    }
    pGeo.attributes.position.needsUpdate = true;
    particles.rotation.y = t * 0.012 + sp * 0.6;

    renderer.render(scene, camera);
  }

  if (prefersReducedMotion) {
    camera.position.z = 6;
    heroKnot.rotation.x = 0.5;
    heroKnot.rotation.y = 0.8;
    renderer.render(scene, camera);
  } else {
    tick();
  }
}
initJourney();

/* ---------- SCROLL PROGRESS ---------- */
function updateScrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
}
window.addEventListener("scroll", updateScrollProgress, { passive: true });
updateScrollProgress();

/* ---------- REVEAL (opacity) ---------- */
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
  { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
);
revealEls.forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 80}ms`;
  io.observe(el);
});

/* ---------- SCROLL-DRIVEN 3D (section cards) ---------- */
function initScroll3D() {
  const vh = window.innerHeight;
  const registry = [];
  document.querySelectorAll("[data-3d]").forEach((el) => {
    const kind = el.dataset["3d"];
    const kids = [...el.children];
    if (kind === "fan") {
      registry.push({
        el,
        kind,
        childTf: kids.map((c, i) => {
          const n = kids.length;
          const mid = (n - 1) / 2;
          return { c, base: (i - mid) / Math.max(n / 2, 1) };
        }),
      });
    } else if (kind === "marquee") {
      registry.push({ el, kind, marquee: el });
    } else {
      registry.push({ el, kind });
    }
  });

  function apply() {
    const winTop = window.scrollY;
    registry.forEach((item) => {
      const r = item.el.getBoundingClientRect();
      const enter = winTop + vh - r.top - 40;
      const span = vh * 0.9;
      const p = clamp(enter / span, 0, 1);

      if (item.kind === "fan") {
        item.el.style.transform = `perspective(1400px) rotateX(${lerp(-22, 0, p)}deg)`;
        item.el.style.transformOrigin = "50% 0%";
        item.childTf.forEach(({ c, base }) => {
          const rotY = base * lerp(38, 0, p);
          const rotX = lerp(-16, 0, p);
          const z = lerp(-140, 0, p) + Math.cos(base * Math.PI) * lerp(120, 0, p);
          c.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg) translateZ(${z}px)`;
          c.style.willChange = "transform";
        });
      } else if (item.kind === "card") {
        item.el.style.transform = `perspective(1200px) rotateY(${lerp(-14, 0, p)}deg) rotateX(${lerp(10, 0, p)}deg) translateZ(${lerp(-60, 0, p)}px)`;
      }
    });
  }

  if (prefersReducedMotion) return;
  let raf = 0;
  const onScroll = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(apply);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  apply();
}
initScroll3D();

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
        const pr = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - pr, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (pr < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      cio.unobserve(el);
    });
  },
  { threshold: 0.5 }
);
counters.forEach((c) => cio.observe(c));

/* ---------- 3D TILT CARDS (hover) ---------- */
const tiltCards = document.querySelectorAll(".card.tilt");
if (!prefersReducedMotion) {
  tiltCards.forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-4px) scale(1.02)`;
      card.style.zIndex = 2;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
      card.style.zIndex = "";
    });
  });
}

/* ---------- INDUSTRY 3D MARQUEE ---------- */
const industryGrid = document.getElementById("industryGrid");
if (industryGrid && !prefersReducedMotion) {
  const items = [...industryGrid.children].map((c) => c.cloneNode(true));
  items.forEach((c) => {
    c.classList.remove("reveal");
    c.setAttribute("aria-hidden", "true");
    industryGrid.appendChild(c);
  });
  industryGrid.classList.add("marquee-track");
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