import * as THREE from "three";

export function createArchetypeScene(host: HTMLDivElement) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 40);
  camera.position.set(0, 0, 9);

  const COUNT = 240;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(COUNT * 3);
  const bases = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * 14;
    const y = (Math.random() - 0.5) * 7;
    const z = (Math.random() - 0.5) * 6;
    positions.set([x, y, z], i * 3);
    bases.set([x, y, z], i * 3);
    seeds[i] = Math.random() * Math.PI * 2;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const lime = new THREE.Color(0xb6f500);
  const lilac = new THREE.Color(0xa98aff);
  const colors = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const c = Math.random() > 0.72 ? lime : lilac;
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const linkGeometry = new THREE.BufferGeometry();
  const linkPositions = new Float32Array(24 * 3);
  linkGeometry.setAttribute("position", new THREE.BufferAttribute(linkPositions, 3));
  const linkMaterial = new THREE.LineBasicMaterial({ color: 0xb6f500, transparent: true, opacity: 0.12 });
  const links = new THREE.LineSegments(linkGeometry, linkMaterial);
  scene.add(links);

  const pointer = new THREE.Vector2();
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches;
  let visible = true;
  let time = 0;
  let previous = 0;
  let burst = 0;

  function updateLinks() {
    let edge = 0;
    for (let i = 0; i < 12 && edge < linkPositions.length - 6; i++) {
      const a = Math.floor(Math.random() * COUNT) * 3;
      const b = Math.floor(Math.random() * COUNT) * 3;
      linkPositions.set([positions[a], positions[a + 1], positions[a + 2]], edge);
      linkPositions.set([positions[b], positions[b + 1], positions[b + 2]], edge + 3);
      edge += 6;
    }
    linkGeometry.attributes.position.needsUpdate = true;
  }
  let linkTimer = 0;

  function render(timestamp: number) {
    const delta = previous ? Math.min((timestamp - previous) / 1000, 0.05) : 0;
    previous = timestamp;
    if (!reduced) time += delta;
    burst = THREE.MathUtils.lerp(burst, 0, delta * 2);

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      const idx = i * 3;
      const sway = reduced ? 0 : Math.sin(time * 0.4 + seeds[i]) * 0.25;
      posAttr.array[idx] = bases[idx] + sway + pointer.x * 0.5;
      posAttr.array[idx + 1] = bases[idx + 1] + Math.cos(time * 0.35 + seeds[i]) * (reduced ? 0 : 0.2) - pointer.y * 0.3;
      posAttr.array[idx + 2] = bases[idx + 2] + burst * Math.sin(seeds[i] + i);
    }
    posAttr.needsUpdate = true;

    points.rotation.y = reduced ? 0 : Math.sin(time * 0.08) * 0.08;

    linkTimer += delta;
    if (linkTimer > 0.4) {
      linkTimer = 0;
      updateLinks();
    }

    renderer.render(scene, camera);
  }
  function syncLoop() {
    previous = 0;
    renderer.setAnimationLoop(visible && !document.hidden && !reduced ? render : null);
    if (visible && !document.hidden) render(performance.now());
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render(performance.now());
  }
  function move(event: PointerEvent) {
    const bounds = host.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    pointer.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
    if (reduced) render(performance.now());
  }
  function motionChange() { reduced = motionQuery.matches; syncLoop(); }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncLoop(); });
  intersection.observe(host);
  window.addEventListener("pointermove", move);
  motionQuery.addEventListener("change", motionChange);
  document.addEventListener("visibilitychange", syncLoop);
  resize();
  syncLoop();

  return {
    pulse() { burst = 1.1; },
    dispose() {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", syncLoop);
      window.removeEventListener("pointermove", move);
      geometry.dispose();
      linkGeometry.dispose();
      material.dispose();
      linkMaterial.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
