import * as THREE from "three";
import { FLIPPER, LANE_DIVIDER_TOP, LANE_DIVIDER_X, LAUNCH_X, LAUNCH_Y, TABLE_HEIGHT, TABLE_WIDTH } from "./config";
import type { BodySnapshot, PinballEngine } from "./engine";

export type PinballTheme = "light" | "dark";
type Paint = CanvasRenderingContext2D;
type Fill = string | CanvasGradient;

const ink = { purple: "#542177", violet: "#8E1EA2", mint: "#98E8DE", pink: "#FF0B55", lime: "#E4FF30", blue: "#008BFF" };
const decks = { light: ["#f1f5e9", "#dbe7d3"], dark: ["#171a27", "#0c0d17"] };

function linear(ctx: Paint, x: number, y: number, toX: number, toY: number, colors: string[]) {
  const gradient = ctx.createLinearGradient(x, y, toX, toY);
  colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));
  return gradient;
}

function radial(ctx: Paint, x: number, y: number, radius: number, stops: [number, string][]) {
  const gradient = ctx.createRadialGradient(x - radius * 0.24, y - radius * 0.32, 0, x, y, radius);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

function disc(ctx: Paint, x: number, y: number, radius: number, fill: Fill, stroke?: string, width = 1) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function pill(ctx: Paint, x: number, y: number, w: number, h: number, r: number, fill: Fill, stroke?: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function stroke(ctx: Paint, path: string, color: string, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke(new Path2D(path));
}

function label(ctx: Paint, value: string, x: number, y: number, size: number, color: string, weight = 700, spacing = "1px") {
  ctx.fillStyle = color;
  ctx.font = weight + " " + size + "px system-ui, sans-serif";
  ctx.letterSpacing = spacing;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
  ctx.letterSpacing = "0px";
}

function screw(ctx: Paint, x: number, y: number, r = 4.5) {
  disc(ctx, x, y, r, linear(ctx, x - r, y - r, x + r, y + r, ["#faf8df", "#a7aaa2", "#515f5b"]), "#263937");
  stroke(ctx, "M " + (x - r * .45) + " " + (y + r * .45) + " l " + r * .9 + " " + -r * .9, "#41524f", 1.3);
}

function polygon(ctx: Paint, part: BodySnapshot, fill: Fill, rim?: string, width = 1) {
  ctx.beginPath();
  part.vertices.forEach(({ x, y }, index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (rim) {
    ctx.strokeStyle = rim;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function drawRail(ctx: Paint, part: BodySnapshot) {
  const [a, b, , d] = part.vertices;
  const length = Math.hypot(a.x - b.x, a.y - b.y);
  const width = Math.hypot(a.x - d.x, a.y - d.y);
  ctx.save();
  ctx.translate(part.x, part.y);
  ctx.rotate(part.angle);
  const wall = part.label === "wall";
  pill(ctx, -length / 2, -width / 2, length, width, Math.min(4, width / 2), wall ? "#130d29" : "#101336", wall ? undefined : ink.blue);
  if (!wall) {
    stroke(ctx, "M " + (-length / 2 + 5) + " 0 H " + (length / 2 - 5), ink.mint + "7a");
    screw(ctx, -length / 2 + 8, 0, 2.5);
    screw(ctx, length / 2 - 8, 0, 2.5);
  }
  ctx.restore();
}

function drawBumper(ctx: Paint, part: BodySnapshot, active = false) {
  const { x, y, index = 0 } = part;
  const color = active ? ink.lime : [ink.blue, ink.mint, ink.pink][index];
  disc(ctx, x, y, 30, "#253042", color + "88", 1);
  disc(ctx, x, y, 26, "#0d0c24", color, 2.3);
  disc(ctx, x, y, 21, active ? ink.lime : color + "29", color, 1.25);
  label(ctx, "100", x, y, 13, active ? "#0e1021" : color, 850, "0px");
}

function drawInsert(ctx: Paint, part: BodySnapshot, active = false) {
  const { x, y, label: type, index = 0 } = part;
  const target = type === "target";
  const ramp = type === "ramp";
  const width = target ? 35 : ramp ? 22 : 38;
  const height = target ? 13 : ramp ? 49 : 17;
  const accent = active ? ink.lime : target ? ink.pink : ramp ? ink.blue : ink.mint;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(part.angle);
  pill(ctx, -width / 2, -height / 2, width, height, 2, active ? ink.lime : accent + "24", accent);
  if (ramp) {
    for (const offset of [-12, 0, 12]) stroke(ctx, "M -6 " + (offset + 3) + " l 6 -6 l 6 6", active ? "#110923" : ink.mint, 2);
  } else if (target) {
    label(ctx, String(index + 1), 0, 0, 9, active ? "#110923" : "#ffc8da", 850);
  } else {
    disc(ctx, 0, 0, 4.1, active ? "#110923" : accent);
    stroke(ctx, "M -12 0 H -8 M 8 0 H 12", active ? "#110923" : accent);
  }
  ctx.restore();
}

function drawSling(ctx: Paint, part: BodySnapshot, active = false) {
  const accent = active ? ink.lime : ink.pink;
  polygon(ctx, part, linear(ctx, 0, 517, 0, 622, ["#130b24", ink.purple, "#260d37"]), accent, active ? 3 : 2.5);
  const sign = part.x < TABLE_WIDTH / 2 ? 1 : -1;
  const x = sign > 0 ? 54 : 378;
  for (let i = 0; i < 3; i++) {
    stroke(ctx, "M " + (x + sign * 12) + " " + (550 + i * 15) + " l " + (sign * (15 + i * 14)) + " 24", i === 1 ? ink.mint : accent, 2);
  }
  screw(ctx, x + sign * 9, 592, 3.5);
  screw(ctx, x + sign * 66, 608, 3);
}

function drawCabinet(ctx: Paint, theme: PinballTheme, parts: BodySnapshot[]) {
  ctx.fillStyle = linear(ctx, 0, 0, 400, 780, decks[theme]);
  ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
  ctx.fillStyle = theme === "light" ? "#58704435" : ink.violet + "24";
  for (let y = 11; y < 797; y += 6) {
    for (let x = 10 + (y % 2) * 2; x < 478; x += 6) ctx.fillRect(x, y, 1, 1);
  }

  for (const mirror of [false, true]) {
    ctx.save();
    if (mirror) { ctx.translate(432, 0); ctx.scale(-1, 1); }
    stroke(ctx, "M 44 193 V 243 L 65 264 V 306 L 93 334 H 137", ink.blue + "60", 1.5);
    stroke(ctx, "M 37 525 L 75 487 H 124 L 173 535 V 592 L 148 630 H 102", ink.blue + "64", 1.5);
    stroke(ctx, "M 39 706 L 79 734 H 118", ink.purple, 1.5);
    for (const [x, y] of [[44, 193], [93, 334], [137, 334], [75, 487], [148, 630], [118, 734]]) {
      disc(ctx, x, y, 2.8, "#11101b", ink.mint + "8c");
    }
    ctx.restore();
  }

  stroke(ctx, "M 142 371 L 187 413 H 245 L 290 371 M 177 447 H 255", ink.purple, 1.2);
  stroke(ctx, "M 201 446 H 231", ink.mint + "55", 1.4);
  for (let i = 0; i < 5; i++) {
    const x = 197 + i * 9;
    pill(ctx, x, 473, 5, 12, 1, "#20192c", ink.blue + "60");
  }

  pill(ctx, 105, 765, 222, 45, 13, "#090818");
  stroke(ctx, "M 204 770 V 792 M 216 775 V 800 M 228 770 V 792", ink.blue + "90", 2);
  pill(ctx, LANE_DIVIDER_X, LANE_DIVIDER_TOP, TABLE_WIDTH - LANE_DIVIDER_X, 645, 8, "#10132d");
  stroke(ctx, "M 439 220 V 701 M 460 220 V 701", ink.blue + "75");
  for (const y of [258, 278, 298, 600, 620, 640]) stroke(ctx, "M 444 " + y + " l 6 -6 l 6 6", ink.mint, 1.6);

  for (const part of parts) {
    if (part.label === "wall" || part.label === "lane-rail" || part.label === "guide" || part.label === "apron-rail") drawRail(ctx, part);
    else if (part.label === "bumper") drawBumper(ctx, part);
    else if (part.label === "slingshot") drawSling(ctx, part);
    else if (part.label === "ramp" || part.label === "target" || part.label === "rollover") drawInsert(ctx, part);
    else if (part.label === "post") screw(ctx, part.x, part.y, 8);
    else if (part.label === "deflector") {
      disc(ctx, part.x, part.y, 9, "#2a4227", "#8db768", 2);
      screw(ctx, part.x, part.y, 3);
    }
  }
  const perimeter = "M 20 799 V 144 L 25 102 L 42 70 L 68 47 L 106 32 L 161 25 H 309 L 362 32 L 402 50 L 431 76 L 450 107 L 461 148 V 799";
  stroke(ctx, perimeter, "#202941", 5);
  stroke(ctx, perimeter, ink.blue + "a0", 1.7);
}

function drawFlipper(ctx: Paint, part: BodySnapshot) {
  const left = part.label === "flipper-left";
  const accent = left ? ink.lime : ink.mint;
  ctx.save();
  ctx.translate(part.x, part.y);
  ctx.rotate(part.angle);
  const w = FLIPPER.width;
  const h = FLIPPER.height;
  pill(ctx, -w / 2, -h / 2, w, h, h / 2, "#171735", accent);
  pill(ctx, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, h / 2 - 2, accent + "7a");
  for (let x = -25; x <= 25; x += 6) {
    disc(ctx, x, x % 4 ? -2 : 2, 1.3, "#272345");
  }
  screw(ctx, (left ? -1 : 1) * (w / 2 - 9), 0, 5);
  ctx.restore();
}

function layer(scale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = TABLE_WIDTH * scale;
  canvas.height = TABLE_HEIGHT * scale;
  const context = canvas.getContext("2d")!;
  context.scale(scale, scale);
  return { canvas, context };
}

function createOutput(host: HTMLElement, board: HTMLCanvasElement, moving: HTMLCanvasElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
  } catch {
    host.append(board, moving);
    for (const canvas of [board, moving]) canvas.className = "absolute inset-0 block size-full";
    return { draw() {}, resize() {}, dispose() { board.remove(); moving.remove(); } };
  }
  const canvas = renderer.domElement;
  canvas.className = "absolute inset-0 block size-full";
  host.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-240, 240, 400, -400, .1, 10);
  camera.position.z = 5;
  const geometry = new THREE.PlaneGeometry(TABLE_WIDTH, TABLE_HEIGHT);
  const textures = [board, moving].map((source) => {
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  });
  const materials = textures.map((map, index) => new THREE.MeshBasicMaterial({
    map, transparent: index === 1, depthWrite: index === 0, toneMapped: false,
  }));
  materials.forEach((material, index) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = index;
    scene.add(mesh);
  });
  return {
    draw(boardChanged: boolean) {
      if (boardChanged) textures[0].needsUpdate = true;
      textures[1].needsUpdate = true;
      renderer.render(scene, camera);
    },
    resize() {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(host.clientWidth, host.clientHeight, false);
    },
    dispose() {
      geometry.dispose();
      for (const texture of textures) texture.dispose();
      for (const material of materials) material.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

export function createPinballRenderer(host: HTMLDivElement, engine: PinballEngine, initialTheme: PinballTheme) {
  const board = layer(2);
  const moving = layer(1.25);
  const output = createOutput(host, board.canvas, moving.canvas);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let theme = initialTheme;
  let boardChanged = true;
  let previousTime = -1;
  let previousPhase = "";
  let frame: number;
  let resized = true;
  const trails = new Map<number, { x: number; y: number }[]>();

  function draw() {
    frame = requestAnimationFrame(draw);
    const phase = engine.getPhase();
    const active = phase === "playing" || phase === "ball-lost";
    const { balls, bodies, time } = engine.snapshot(true);
    if (phase !== previousPhase) boardChanged ||= previousPhase === "";
    if (!active && !boardChanged && !resized && time === previousTime && phase === previousPhase) return;
    if (boardChanged) drawCabinet(board.context, theme, bodies);
    const ctx = moving.context;
    ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    for (const part of bodies) {
      if (part.label.startsWith("flipper")) drawFlipper(ctx, part);
      else if (part.flashUntil > time) {
        if (part.label === "bumper") drawBumper(ctx, part, true);
        else if (part.label === "slingshot") drawSling(ctx, part, true);
        else drawInsert(ctx, part, true);
      }
    }

    const travel = engine.getPlungerTravel() * 29;
    const top = LAUNCH_Y + 17 + travel;
    const pulse = engine.getLaunchPulse();
    if (pulse > 0) {
      ctx.save();
      ctx.globalAlpha = pulse * .8;
      disc(ctx, LAUNCH_X, LAUNCH_Y, 22, radial(ctx, LAUNCH_X, LAUNCH_Y, 22, [[0, ink.lime], [1, ink.lime + "00"]]));
      ctx.restore();
    }
    pill(ctx, LAUNCH_X - 13, LAUNCH_Y + 8, 26, 63, 7, "#141127", ink.blue);
    for (let i = 0; i < 7; i++) {
      const y = top + 6 + i * ((787 - top) / 7);
      stroke(ctx, "M 440 " + y + " l 20 3", i % 2 ? ink.mint : ink.blue, 2);
    }
    pill(ctx, LAUNCH_X - 12, top - 7, 24, 12, 4, linear(ctx, 0, top - 7, 0, top + 5, [ink.mint, ink.blue, "#21365f"]), "#141127");

    const ids = new Set(balls.map(({ id }) => id));
    for (const id of trails.keys()) if (!ids.has(id)) trails.delete(id);
    for (const ball of balls) {
      const { id, x, y, radius, vx, vy, angle } = ball;
      if (!reducedMotion.matches && active) {
        const history = trails.get(id) ?? [];
        if (Math.hypot(vx, vy) > 11) {
          history.push({ x, y });
          if (history.length > 5) history.shift();
        } else history.shift();
        trails.set(id, history);
        history.slice(0, -1).forEach((point, index) => {
          disc(ctx, point.x, point.y, 2 + index, "rgba(152,232,222," + (0.06 + index * .065) + ")");
        });
      }
      disc(ctx, x, y, radius, radial(ctx, x, y, radius, [[0, "#fffdf1"], [.34, "#eaf7ed"], [.63, "#a8c8c3"], [.85, "#4a6e76"], [1, "#1c3443"]]), "#314d51");
      disc(ctx, x + Math.cos(angle) * 5, y + Math.sin(angle) * 5, 1.25, "#d8eee9bb");
    }
    output.draw(boardChanged);
    boardChanged = false;
    resized = false;
    previousTime = time;
    previousPhase = phase;
  }

  const observer = new ResizeObserver(() => { output.resize(); resized = true; });
  observer.observe(host);
  output.resize();
  frame = requestAnimationFrame(draw);
  return {
    setTheme(value: PinballTheme) { theme = value; boardChanged = true; },
    dispose() {
      observer.disconnect();
      cancelAnimationFrame(frame);
      output.dispose();
    },
  };
}

