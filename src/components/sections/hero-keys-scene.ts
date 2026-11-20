import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/**
 * Four glossy 3D keycaps that spell "H I ! ★" (white, green, black, white). They drop in, bob gently, lift when the
 * pointer is over them and press down with a springy bounce when clicked. Pressing H, I, ! and ★ in order makes
 * the whole row do a wave.
 */
export interface KeysScene {
  press: (index: number) => void;
  dispose: () => void;
}

const KEYS = [
  { glyph: "H", cap: 0xf3f3ef, ink: "#1b1b1b" },
  { glyph: "I", cap: 0x73c000, ink: "#0d2204" },
  { glyph: "!", cap: 0x131313, ink: "#ffffff" },
  { glyph: "star", cap: 0xf3f3ef, ink: "#1b1b1b" },
] as const;

// Tipped far forward so each key's printed top almost faces the viewer and the legends read clearly.
const BASE = [
  { x: 1.12, y: 0.2, z: -0.2, lift: 0.0 },
  { x: 1.06, y: -0.1, z: 0.08, lift: 0.3 },
  { x: 1.14, y: 0.12, z: -0.06, lift: 0.02 },
  { x: 1.08, y: -0.22, z: 0.18, lift: 0.22 },
];

const SIZE = 1.5;
const HEIGHT = 0.95;
const SPACING = 1.66;

function legend(glyph: string, ink: string) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  if (glyph === "star") {
    // A pixel-art outline star: drawn tiny, then scaled up without smoothing.
    const tiny = document.createElement("canvas");
    tiny.width = tiny.height = 24;
    const t = tiny.getContext("2d")!;
    t.strokeStyle = ink;
    t.lineWidth = 2;
    t.beginPath();
    for (let k = 0; k < 10; k++) {
      const radius = k % 2 ? 5.2 : 11.5;
      const angle = -Math.PI / 2 + (k * Math.PI) / 5;
      const x = 12 + Math.cos(angle) * radius;
      const y = 13 + Math.sin(angle) * radius;
      if (k) t.lineTo(x, y); else t.moveTo(x, y);
    }
    t.closePath();
    t.stroke();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tiny, 0, 0, size, size);
  } else {
    ctx.fillStyle = ink;
    ctx.font = "800 235px 'DM Sans', Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, size / 2, size / 2 + 18);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function keycapGeometry() {
  const geometry = new RoundedBoxGeometry(SIZE, HEIGHT, SIZE, 8, 0.16);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const t = (positions.getY(i) + HEIGHT / 2) / HEIGHT; // 0 at the base, 1 at the top
    const taper = 1 - 0.2 * t;
    positions.setX(i, positions.getX(i) * taper);
    positions.setZ(i, positions.getZ(i) * taper);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createKeysScene(host: HTMLDivElement, onPress: (index: number) => void, onContextLost: () => void): KeysScene {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.65;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x556b2f, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.set(-3, 6, 7);
  scene.add(sun);
  const rim = new THREE.PointLight(0xa3e635, 22);
  rim.position.set(4, 1, 3);
  scene.add(rim);

  const geometry = keycapGeometry();
  const row = new THREE.Group();
  scene.add(row);

  const disposables: { dispose: () => void }[] = [geometry];
  const keys = KEYS.map((definition, index) => {
    const material = new THREE.MeshPhysicalMaterial({
      color: definition.cap,
      roughness: index === 2 ? 0.28 : 0.34,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.16,
    });
    const cap = new THREE.Mesh(geometry, material);
    const texture = legend(definition.glyph, definition.ink);
    const printed = new THREE.Mesh(
      new THREE.PlaneGeometry(0.98, 0.98),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
    );
    printed.rotation.x = -Math.PI / 2;
    printed.position.y = HEIGHT / 2 + 0.003;
    const group = new THREE.Group();
    group.add(cap, printed);
    group.position.x = (index - 1.5) * SPACING;
    row.add(group);
    disposables.push(material, texture, printed.geometry, printed.material as THREE.Material);
    return { group, cap, hover: 0, depth: 0, velocity: 0 };
  });

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointer = { x: 0, y: 0, inside: false };
  let hovered = -1;
  let visible = true;
  let raf = 0;
  let last = performance.now();
  let clock = reduced ? 10 : 0;
  let waveAt = -1;
  let progress = 0; // how far through the H I ! ★ sequence the visitor is

  const raycaster = new THREE.Raycaster();
  const pick = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(keys.map((key) => key.cap), false)[0];
    return hit ? keys.findIndex((key) => key.cap === hit.object) : -1;
  };

  const press = (index: number) => {
    const key = keys[index];
    if (!key) return;
    key.depth = 1;
    key.velocity = 0;
    onPress(index);
    progress = index === progress ? progress + 1 : index === 0 ? 1 : 0;
    if (progress === keys.length) { waveAt = clock; progress = 0; }
  };

  const onMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    pointer.inside = true;
    hovered = pick(event.clientX, event.clientY);
    canvas.style.cursor = hovered >= 0 ? "pointer" : "default";
  };
  const onLeave = () => { pointer.inside = false; hovered = -1; canvas.style.cursor = "default"; };
  const onDown = (event: PointerEvent) => {
    const index = pick(event.clientX, event.clientY);
    if (index >= 0) press(index);
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerdown", onDown);
  const lost = (event: Event) => { event.preventDefault(); onContextLost(); };
  canvas.addEventListener("webglcontextlost", lost);

  const resize = () => {
    const width = host.clientWidth || 1;
    const height = host.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // Frame the row tightly (about 7.8 units wide, 3.6 tall, with room for the tilt and the bounce).
    const distance = Math.max(3.95 / (half * camera.aspect), 1.9 / half);
    camera.position.set(0, 0.2, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
  visibility.observe(host);

  const easeOutBack = (t: number) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;

    row.rotation.y += ((pointer.inside ? pointer.x * 0.14 : 0) - row.rotation.y) * Math.min(1, dt * 4);
    row.rotation.x += ((pointer.inside ? pointer.y * 0.07 : 0) - row.rotation.x) * Math.min(1, dt * 4);

    keys.forEach((key, i) => {
      const base = BASE[i];
      const enter = reduced ? 1 : Math.min(1, Math.max(0, (clock - 0.25 - i * 0.14) / 0.95));
      const drop = (1 - easeOutBack(enter)) * 5;
      key.hover += ((hovered === i ? 1 : 0) - key.hover) * Math.min(1, dt * 12);
      // A damped spring: a click sets depth to 1 and it bounces back to 0.
      key.velocity += (-140 * key.depth - 11 * key.velocity) * dt;
      key.depth += key.velocity * dt;
      const bob = reduced ? 0 : Math.sin(clock * 1.15 + i * 1.4) * 0.06;
      let wave = 0;
      if (waveAt >= 0) {
        const t = clock - waveAt - i * 0.13;
        if (t > 0 && t < 0.7) wave = Math.sin((t / 0.7) * Math.PI);
        if (i === keys.length - 1 && t >= 0.7) waveAt = -1;
      }
      key.group.position.y = base.lift + bob + drop + key.hover * 0.2 - key.depth * 0.38 + wave * 0.65;
      key.group.rotation.set(
        base.x - key.hover * 0.08 + key.depth * 0.1,
        base.y + (reduced ? 0 : Math.sin(clock * 0.8 + i) * 0.05) + wave * 0.5,
        base.z + (reduced ? 0 : Math.cos(clock * 0.9 + i * 2) * 0.03),
      );
      key.group.scale.setScalar(1 + key.hover * 0.05);
    });

    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    press,
    dispose() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("webglcontextlost", lost);
      for (const item of disposables) item.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
