import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function createHeroScene(host: HTMLDivElement, onContextLost: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, 11);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x697737, 3));
  const key = new THREE.DirectionalLight(0xffffff, 5);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0xb695ff, 35);
  rim.position.set(3, 1, 2);
  scene.add(rim);

  const sculpture = new THREE.Group();
  scene.add(sculpture);
  const lime = new THREE.MeshPhysicalMaterial({ color: 0xb6f500, metalness: 0.32, roughness: 0.24, clearcoat: 1 });
  const lilac = new THREE.MeshPhysicalMaterial({ color: 0xa98aff, metalness: 0.48, roughness: 0.18, clearcoat: 1, iridescence: 0.55 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe6e9e0, metalness: 1, roughness: 0.14 });
  const wire = new THREE.MeshBasicMaterial({ color: 0x9b9f91, wireframe: true, transparent: true, opacity: 0.45 });
  const starShape = new THREE.Shape();
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const radius = i % 2 ? 0.8 : 1.23;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
  }
  starShape.closePath();
  const starGeometry = new THREE.ExtrudeGeometry(starShape, { depth: 0.22, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.08, bevelThickness: 0.08 });
  starGeometry.center();
  const star = new THREE.Mesh(starGeometry, lime);
  star.position.set(-0.85, 0.95, 0);
  star.rotation.set(0.18, -0.35, 0.1);
  sculpture.add(star);

  const loop = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.32, 24, 80), lilac);
  loop.position.set(0.75, -0.25, 0.2);
  loop.rotation.set(0.55, -0.38, -0.3);
  sculpture.add(loop);
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.61, 0.19, 100, 16), chrome);
  knot.position.set(-0.95, -1.05, 0.5);
  knot.rotation.set(0.4, 0.2, -0.3);
  sculpture.add(knot);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 12), wire);
  orb.position.set(1.25, 1.4, -0.5);
  sculpture.add(orb);
  const satellite = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), lime);
  satellite.position.set(1.85, -1.3, 0.3);
  sculpture.add(satellite);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.009, 6, 100), chrome);
  orbit.rotation.set(1.05, 0.3, -0.35);
  sculpture.add(orbit);

  const objects = [star, loop, knot, orb, satellite];
  const bases = objects.map(object => object.position.clone());
  const pointer = new THREE.Vector2();
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches;
  let paused = false;
  let visible = true;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let turn = 0;
  let tilt = 0;
  let remix = 0;
  let time = 0;
  let previous = 0;
  let scrollShift = 0;

  function render(timestamp: number) {
    const delta = previous ? Math.min((timestamp - previous) / 1000, 0.05) : 0;
    previous = timestamp;
    if (!paused && !reduced) time += delta;
    const ease = reduced || paused ? 1 : 1 - Math.exp(-delta * 5);
    sculpture.rotation.y = THREE.MathUtils.lerp(sculpture.rotation.y, turn + pointer.x * 0.12, ease);
    sculpture.rotation.x = THREE.MathUtils.lerp(sculpture.rotation.x, tilt - pointer.y * 0.08 + scrollShift * 0.5, ease);
    sculpture.position.y = THREE.MathUtils.lerp(sculpture.position.y, reduced ? 0 : scrollShift * -1.3, ease);
    objects.forEach((object, index) => {
      object.position.y = bases[index].y + Math.sin(time * 0.75 + index * 1.4) * (reduced ? 0 : 0.12);
      object.rotation.z = THREE.MathUtils.lerp(object.rotation.z, Math.sin(time * 0.3 + index) * 0.18 + remix * (index % 2 ? -0.7 : 0.7), ease);
    });
    orb.rotation.y = time * 0.16;
    knot.rotation.y = time * 0.18;
    renderer.render(scene, camera);
  }
  function syncLoop() {
    previous = 0;
    renderer.setAnimationLoop(visible && !document.hidden && !paused && !reduced ? render : null);
    if (visible && !document.hidden) render(performance.now());
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.position.z = camera.aspect < 0.85 ? 13 : 11;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render(performance.now());
  }
  function move(event: PointerEvent) {
    const bounds = host.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * 2 - 1;
    const y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    pointer.set(THREE.MathUtils.clamp(x, -1.6, 1.6), THREE.MathUtils.clamp(y, -1.6, 1.6));
    if (dragging) {
      turn += (event.clientX - lastX) * 0.008;
      tilt = THREE.MathUtils.clamp(tilt + (event.clientY - lastY) * 0.005, -0.7, 0.7);
    }
    lastX = event.clientX;
    lastY = event.clientY;
    if (paused || reduced) render(performance.now());
  }
  function down(event: PointerEvent) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging = true;
    lastX = event.clientX; lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  }
  function up() { dragging = false; }
  function scroll() {
    const bounds = host.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const progress = THREE.MathUtils.clamp((vh - bounds.top) / (vh + bounds.height), 0, 1);
    scrollShift = progress - 0.5;
    if (paused || reduced) render(performance.now());
  }
  function motionChange() { reduced = motionQuery.matches; syncLoop(); }
  function contextLost(event: Event) { event.preventDefault(); renderer.setAnimationLoop(null); onContextLost(); }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncLoop(); });
  intersection.observe(host);
  window.addEventListener("pointermove", move);
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("lostpointercapture", up);
  canvas.addEventListener("webglcontextlost", contextLost);
  window.addEventListener("scroll", scroll, { passive: true });
  motionQuery.addEventListener("change", motionChange);
  document.addEventListener("visibilitychange", syncLoop);
  resize();
  scroll();
  syncLoop();

  return {
    remix() { remix += 1; turn += Math.PI * 0.35; render(performance.now()); },
    pause(value: boolean) { paused = value; syncLoop(); },
    dispose() {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect(); intersection.disconnect();
      motionQuery.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", syncLoop);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("webglcontextlost", contextLost);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      [lime, lilac, chrome, wire].forEach(material => material.dispose());
      environment.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
