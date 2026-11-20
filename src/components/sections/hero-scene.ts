import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// A little desk of 3D props: a computer mouse, a pen, a chess pawn and a camera, all built from primitives.
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
  camera.position.set(0, 0, 10.6);
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
  // Natural colours: graphite mouse, navy pen, ivory pawn, black-and-silver camera.
  const graphite = new THREE.MeshPhysicalMaterial({ color: 0x24272b, metalness: 0.35, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25 });
  const navy = new THREE.MeshPhysicalMaterial({ color: 0x1b2f6b, metalness: 0.3, roughness: 0.28, clearcoat: 1 });
  const ivory = new THREE.MeshPhysicalMaterial({ color: 0xece2c8, metalness: 0.05, roughness: 0.38, clearcoat: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe2e6, metalness: 1, roughness: 0.16 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x101214, metalness: 0.5, roughness: 0.26, clearcoat: 1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1424, metalness: 0.85, roughness: 0.05, clearcoat: 1 });
  const materials = [graphite, navy, ivory, chrome, dark, glass];

  // ---- Computer mouse -------------------------------------------------------------------------------------------
  const mouse = new THREE.Group();
  const mouseBody = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 36), graphite);
  mouseBody.scale.set(0.9, 0.55, 1.45);
  mouse.add(mouseBody);
  const surfaceY = (z: number) => 0.55 * Math.sqrt(Math.max(0, 1 - (z / 1.45) ** 2));
  const splitPoints = Array.from({ length: 14 }, (_, i) => {
    const z = -0.12 - i * 0.075;
    return new THREE.Vector3(0, surfaceY(z) + 0.006, z);
  });
  mouse.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(splitPoints), 30, 0.014, 6), dark));
  const wheel = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.2, 8, 16), chrome);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(0, surfaceY(-0.5) + 0.018, -0.5);
  mouse.add(wheel);
  mouse.scale.setScalar(0.9);

  // ---- Chess pawn -----------------------------------------------------------------------------------------------
  const pawn = new THREE.Group();
  const profile = [
    [0, 0], [0.6, 0], [0.64, 0.07], [0.58, 0.15], [0.42, 0.24], [0.27, 0.42], [0.2, 0.78], [0.22, 0.92],
    [0.4, 0.99], [0.42, 1.08], [0.27, 1.12], [0.22, 1.18], [0, 1.2],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  pawn.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 56), ivory));
  const pawnHead = new THREE.Mesh(new THREE.SphereGeometry(0.4, 40, 28), ivory);
  pawnHead.position.y = 1.5;
  pawn.add(pawnHead);
  pawn.position.y = -0.7;
  pawn.scale.setScalar(1.1);
  const pawnHolder = new THREE.Group();
  pawnHolder.add(pawn);

  // ---- Pen ------------------------------------------------------------------------------------------------------
  const pen = new THREE.Group();
  const penBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.1, 40), navy);
  pen.add(penBody);
  const penTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 40), chrome);
  penTip.position.y = -1.3;
  penTip.rotation.x = Math.PI;
  pen.add(penTip);
  const penNib = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 20), dark);
  penNib.position.y = -1.61;
  penNib.rotation.x = Math.PI;
  pen.add(penNib);
  const penGrip = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.03, 12, 40), chrome);
  penGrip.rotation.x = Math.PI / 2;
  penGrip.position.y = -0.95;
  pen.add(penGrip);
  const penCap = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.5, 40), dark);
  penCap.position.y = 1.3;
  pen.add(penCap);
  const penClip = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.9, 0.08, 3, 0.02), chrome);
  penClip.position.set(0.16, 1.1, 0);
  pen.add(penClip);
  pen.scale.setScalar(1.1);

  // ---- Camera ---------------------------------------------------------------------------------------------------
  const cam = new THREE.Group();
  cam.add(new THREE.Mesh(new RoundedBoxGeometry(2.3, 1.45, 0.95, 6, 0.14), dark));
  const topPlate = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.32, 0.95, 6, 0.12), chrome);
  topPlate.position.y = 0.62;
  cam.add(topPlate);
  const hump = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.3, 0.6, 5, 0.1), chrome);
  hump.position.set(-0.55, 0.9, 0);
  cam.add(hump);
  const shutter = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 28), chrome);
  shutter.position.set(0.75, 0.82, 0);
  cam.add(shutter);
  const flash = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.26, 0.08, 3, 0.03), glass);
  flash.position.set(0.7, 0.25, 0.46);
  cam.add(flash);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.64, 0.5, 56), graphite);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(-0.1, -0.02, 0.7);
  cam.add(barrel);
  const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 16, 60), chrome);
  lensRing.position.set(-0.1, -0.02, 0.96);
  cam.add(lensRing);
  const lensGlass = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 28, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  lensGlass.rotation.x = Math.PI / 2;
  lensGlass.position.set(-0.1, -0.02, 0.9);
  cam.add(lensGlass);
  cam.scale.setScalar(0.92);

  // Slots the props rest in; Remix deals the props into the next slot.
  const slots = [
    new THREE.Vector3(-0.45, 0.55, 0),
    new THREE.Vector3(0.95, -0.4, 0.4),
    new THREE.Vector3(-1.3, -1.05, 0.5),
    new THREE.Vector3(0.95, 1.15, -0.3),
  ];
  const props = [
    { object: cam, rotation: new THREE.Euler(0.2, -0.45, 0.06), spin: 0.5 },
    { object: mouse, rotation: new THREE.Euler(0.9, 0.5, -0.15), spin: 0.35 },
    { object: pawnHolder, rotation: new THREE.Euler(0.05, 0.3, 0.12), spin: 0.9 },
    { object: pen, rotation: new THREE.Euler(0.15, 0.2, 0.75), spin: 0.4 },
  ];
  props.forEach(({ object, rotation }, index) => {
    object.position.copy(slots[index]);
    object.rotation.copy(rotation);
    sculpture.add(object);
  });

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
  let spinUntil = 0;
  const propTurn = props.map(() => ({ current: new THREE.Vector3(), target: new THREE.Vector3() }));

  function render(timestamp: number) {
    const delta = previous ? Math.min((timestamp - previous) / 1000, 0.05) : 0;
    previous = timestamp;
    if (!paused && !reduced) time += delta;
    const spinning = time < spinUntil;
    const ease = reduced || paused ? 1 : 1 - Math.exp(-delta * (spinning ? 11 : 5));
    const propEase = reduced || paused ? 1 : 1 - Math.exp(-delta * 7);
    sculpture.rotation.y = THREE.MathUtils.lerp(sculpture.rotation.y, turn + pointer.x * 0.12, ease);
    sculpture.rotation.x = THREE.MathUtils.lerp(sculpture.rotation.x, tilt - pointer.y * 0.08 + scrollShift * 0.5, ease);
    sculpture.position.y = THREE.MathUtils.lerp(sculpture.position.y, reduced ? 0 : scrollShift * -1.3, ease);
    props.forEach(({ object, rotation, spin }, index) => {
      const slot = slots[(index + remix) % slots.length];
      object.position.x = THREE.MathUtils.lerp(object.position.x, slot.x, ease);
      object.position.z = THREE.MathUtils.lerp(object.position.z, slot.z, ease);
      object.position.y = THREE.MathUtils.lerp(object.position.y, slot.y + Math.sin(time * 0.75 + index * 1.4) * (reduced ? 0 : 0.14), ease);
      propTurn[index].current.lerp(propTurn[index].target, propEase);
      const extra = propTurn[index].current;
      object.rotation.y = rotation.y + Math.sin(time * 0.45 * spin + index) * 0.55 + extra.y;
      object.rotation.x = rotation.x + Math.sin(time * 0.3 + index * 2) * 0.06 + extra.x;
      object.rotation.z = rotation.z + extra.z;
    });
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
    camera.position.z = camera.aspect < 0.85 ? 13.5 : 10.6;
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
  // Double-click: the whole desk and every prop spin fast in random directions (and tumble on random axes), then settle.
  const randomSign = () => (Math.random() < 0.5 ? -1 : 1);
  const randomTurns = (min: number, max: number) => randomSign() * (min + Math.random() * (max - min)) * Math.PI;
  function spinFast() {
    if (reduced) return;
    spinUntil = time + 1.6;
    turn += randomTurns(2, 4);
    tilt = THREE.MathUtils.clamp(tilt + (Math.random() - 0.5) * 0.8, -0.7, 0.7);
    propTurn.forEach(state => {
      state.target.y += randomTurns(2, 5);
      state.target.x += Math.random() < 0.6 ? randomTurns(0, 3) : 0;
      state.target.z += Math.random() < 0.4 ? randomTurns(0, 2) : 0;
    });
    if (paused) render(performance.now());
  }
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
  canvas.addEventListener("dblclick", spinFast);
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
    spin: spinFast,
    pause(value: boolean) { paused = value; syncLoop(); },
    dispose() {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect(); intersection.disconnect();
      motionQuery.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", syncLoop);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("dblclick", spinFast);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("webglcontextlost", contextLost);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      materials.forEach(material => material.dispose());
      environment.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
