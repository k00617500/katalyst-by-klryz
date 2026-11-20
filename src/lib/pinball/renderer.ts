import * as THREE from "three";
import { FLIPPER, LANE_DIVIDER_TOP, LANE_DIVIDER_X, LAUNCH_X, LAUNCH_Y, TABLE_HEIGHT, TABLE_WIDTH } from "./config";
import type { BodySnapshot, PinballEngine } from "./engine";
import { isChristmasActive } from "@/lib/christmas";

export type PinballTheme = "light" | "dark";
type Paint = CanvasRenderingContext2D;
type Fill = string | CanvasGradient | CanvasPattern;

const baseInk = { purple: "#542177", violet: "#8E1EA2", mint: "#98E8DE", pink: "#FF0B55", lime: "#E4FF30", blue: "#008BFF" };
// Red-and-white Christmas season palette (December 1 to January 6, see lib/christmas.ts).
const festiveInk = { purple: "#7a0f1c", violet: "#c8182b", mint: "#ffffff", pink: "#ff4d5e", lime: "#fff1c9", blue: "#ff8a96" };
const ink = { ...baseInk };
const decks = { light: ["#f1f5e9", "#dbe7d3"], dark: ["#171a27", "#0c0d17"] };
const festiveDecks = { light: ["#b3213a", "#6a0d1c"], dark: ["#a3182a", "#430812"] };
let xmas = false;
const xm = <T,>(normal: T, festive: T): T => (xmas ? festive : normal);

let candyTile: CanvasPattern | null = null;
function candy(ctx: Paint): CanvasPattern | string {
  if (!candyTile) {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 16;
    const g = tile.getContext("2d")!;
    g.fillStyle = "#fdf6f0";
    g.fillRect(0, 0, 16, 16);
    g.fillStyle = "#d8232a";
    for (const offset of [-16, 0, 16]) {
      g.beginPath();
      g.moveTo(offset + 8, 0); g.lineTo(offset + 16, 0); g.lineTo(offset + 8, 16); g.lineTo(offset, 16);
      g.closePath();
      g.fill();
    }
    candyTile = ctx.createPattern(tile, "repeat");
  }
  return candyTile ?? "#d8232a";
}

function star(ctx: Paint, x: number, y: number, r: number, fill: Fill) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const radius = k % 2 ? r * 0.45 : r;
    const angle = -Math.PI / 2 + (k * Math.PI) / 5;
    k ? ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle)) : ctx.moveTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "#8d7a80";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

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

function stroke(ctx: Paint, path: string, color: string | CanvasPattern, width = 1) {
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
  if (xmas && !wall) {
    pill(ctx, -length / 2 - 1.5, -width / 2 - 1.5, length + 3, width + 3, Math.min(5, width / 2 + 1), "#3a0b14");
    pill(ctx, -length / 2, -width / 2, length, width, Math.min(4, width / 2), candy(ctx), "#fdf6f0");
    ctx.restore();
    return;
  }
  pill(ctx, -length / 2, -width / 2, length, width, Math.min(4, width / 2), wall ? xm("#130d29", "#3a0b14") : "#101336", wall ? undefined : ink.blue);
  if (!wall) {
    stroke(ctx, "M " + (-length / 2 + 5) + " 0 H " + (length / 2 - 5), ink.mint + "7a");
    screw(ctx, -length / 2 + 8, 0, 2.5);
    screw(ctx, length / 2 - 8, 0, 2.5);
  }
  ctx.restore();
}

function drawOrnament(ctx: Paint, part: BodySnapshot, active: boolean) {
  const { x, y, index = 0 } = part;
  const tones = [["#ffffff", "#f3e9e6", "#b9a7ab"], ["#ffb3b9", "#c8182b", "#5a0711"], ["#ff9aa6", "#a50f20", "#3d0510"]][index % 3];
  const white = index % 3 === 0;
  if (active) disc(ctx, x, y, 38, radial(ctx, x, y, 38, [[0, "#fff1c9aa"], [1, "#fff1c900"]]));
  disc(ctx, x, y, 30, "#00000040");
  disc(ctx, x, y, 28, radial(ctx, x, y, 28, [[0, tones[0]], [0.45, tones[1]], [1, tones[2]]]), active ? "#fff1c9" : "#ffffffcc", 2.2);
  ctx.save();
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = "#ffffff77";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  pill(ctx, x - 7, y - 36, 14, 9, 2, linear(ctx, x, y - 36, x, y - 27, ["#ffffff", "#9c8d92"]), "#7d6a70");
  stroke(ctx, "M " + (x - 4) + " " + (y - 36) + " q 4 -11 8 0", "#e6dde0", 1.6);
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(x - 10, y - 12, 7, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  label(ctx, "100", x, y + 1, 13, white ? "#a50f20" : "#ffffff", 850, "0px");
}

function drawBumper(ctx: Paint, part: BodySnapshot, active = false) {
  if (xmas) return drawOrnament(ctx, part, active);
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
  if (xmas) {
    if (target) {
      const palette = [["#d8232a", "#ffffff"], ["#fdf6f0", "#d8232a"]][index % 2];
      pill(ctx, -18, -9, 36, 20, 2.5, active ? "#fff1c9" : palette[0], "#00000066");
      ctx.fillStyle = palette[1];
      ctx.fillRect(-3, -9, 6, 20);
      ctx.fillRect(-18, -1.5, 36, 4);
      stroke(ctx, "M 0 -9 C -10 -20 -16 -9 -4 -9 M 0 -9 C 10 -20 16 -9 4 -9", palette[1], 2.2);
      ctx.lineJoin = "round";
      label(ctx, String(index + 1), 0, 4, 10, "#7a0f1c", 900, "0px");
    } else if (ramp) {
      pill(ctx, -width / 2, -height / 2, width, height, 4, active ? "#fff1c9" : "#4a0a14", "#d8232a");
      for (const offset of [-14, 0, 14]) stroke(ctx, "M -6 " + (offset + 3) + " l 6 -6 l 6 6", active ? "#7a0f1c" : "#ffffff", 2);
    } else {
      pill(ctx, -19, -11, 38, 22, 4, "#4a0a14", "#ffffff");
      star(ctx, 0, 0, 9, active ? "#fff1c9" : linear(ctx, -8, -8, 8, 8, ["#ffffff", "#e6dde0", "#9c8d92"]));
    }
    ctx.restore();
    return;
  }
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
  if (xmas) {
    polygon(ctx, part, active ? "#fff1c9" : linear(ctx, 0, 517, 0, 622, ["#fff8f4", "#f1e3e3", "#e3d2d4"]), active ? "#ff4d5e" : "#d8232a", active ? 3 : 2.5);
    const sign = part.x < TABLE_WIDTH / 2 ? 1 : -1;
    const x0 = sign > 0 ? 63 : 369;
    [[6, 8], [14, 32], [30, 54], [-2, 56], [46, 72], [18, 76]].forEach(([dx, dy]) => disc(ctx, x0 + sign * dx, 532 + dy, 3.2, "#d8232a"));
    return;
  }
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
  ctx.fillStyle = linear(ctx, 0, 0, 400, 780, xm(decks, festiveDecks)[theme]);
  ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
  ctx.fillStyle = xmas ? "#ffffff30" : theme === "light" ? "#58704435" : ink.violet + "24";
  for (let y = 11; y < 797; y += 6) {
    for (let x = 10 + (y % 2) * 2; x < 478; x += 6) ctx.fillRect(x, y, 1, 1);
  }
  if (xmas) {
    // Snow dust and a few flakes scattered over the deck (fixed pattern, not random per redraw).
    for (let i = 0; i < 220; i++) {
      const sx = (i * 97.13) % 470 + 5;
      const sy = (i * 61.7 + (i % 7) * 31) % 790 + 5;
      ctx.globalAlpha = 0.18 + ((i * 13) % 10) / 22;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8 + (i % 4) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const [fx, fy, fr] of [[60, 200, 7], [410, 260, 6], [240, 160, 5], [90, 640, 6], [380, 700, 7], [215, 520, 5], [40, 400, 5]]) {
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI) / 3;
        stroke(ctx, "M " + (fx - Math.cos(a) * fr) + " " + (fy - Math.sin(a) * fr) + " L " + (fx + Math.cos(a) * fr) + " " + (fy + Math.sin(a) * fr), "#ffffff70", 1.3);
      }
    }
    disc(ctx, 219, 300, 140, radial(ctx, 219, 300, 140, [[0, "#ff6b7820"], [1, "#ff6b7800"]]));
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

  pill(ctx, 105, 765, 222, 45, 13, xm("#090818", "#2a050b"));
  stroke(ctx, "M 204 770 V 792 M 216 775 V 800 M 228 770 V 792", ink.blue + "90", 2);
  pill(ctx, LANE_DIVIDER_X, LANE_DIVIDER_TOP, TABLE_WIDTH - LANE_DIVIDER_X, 645, 8, xm("#10132d", "#4a0a14"));
  stroke(ctx, "M 439 220 V 701 M 460 220 V 701", ink.blue + "75");
  for (const y of [258, 278, 298, 600, 620, 640]) stroke(ctx, "M 444 " + y + " l 6 -6 l 6 6", ink.mint, 1.6);
  if (xmas) {
    // A small white tree with red baubles stands in the middle of the table.
    ctx.save();
    ctx.translate(216, 500);
    ctx.beginPath();
    ctx.moveTo(0, -34); ctx.lineTo(-18, -6); ctx.lineTo(-9, -6); ctx.lineTo(-24, 18); ctx.lineTo(-10, 18); ctx.lineTo(-28, 40);
    ctx.lineTo(28, 40); ctx.lineTo(10, 18); ctx.lineTo(24, 18); ctx.lineTo(9, -6); ctx.lineTo(18, -6);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, -20, -30, 20, 40, ["#fff8f4", "#e3d2d4"]);
    ctx.fill();
    ctx.strokeStyle = "#d8232a";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = "#8a1220";
    ctx.fillRect(-4, 40, 8, 8);
    for (const [bx, by] of [[-6, -4], [7, 6], [-12, 14], [10, 26], [-4, 28]]) disc(ctx, bx, by, 2.6, "#d8232a");
    star(ctx, 0, -40, 10, linear(ctx, -8, -48, 8, -32, ["#ffffff", "#e6dde0", "#9c8d92"]));
    ctx.restore();
  }

  for (const part of parts) {
    if (part.label === "wall" || part.label === "lane-rail" || part.label === "guide" || part.label === "apron-rail") drawRail(ctx, part);
    else if (part.label === "bumper") drawBumper(ctx, part);
    else if (part.label === "slingshot") drawSling(ctx, part);
    else if (part.label === "ramp" || part.label === "target" || part.label === "rollover") drawInsert(ctx, part);
    else if (part.label === "post") screw(ctx, part.x, part.y, 8);
    else if (part.label === "deflector") {
      if (xmas) {
        disc(ctx, part.x, part.y, 9, candy(ctx), "#ffffff", 1.4);
        disc(ctx, part.x, part.y, 2.4, "#ffffff");
      } else {
        disc(ctx, part.x, part.y, 9, "#2a4227", "#8db768", 2);
        screw(ctx, part.x, part.y, 3);
      }
    }
  }
  const perimeter = "M 20 799 V 144 L 25 102 L 42 70 L 68 47 L 106 32 L 161 25 H 309 L 362 32 L 402 50 L 431 76 L 450 107 L 461 148 V 799";
  if (xmas) {
    stroke(ctx, perimeter, "#2a1319", 9);
    stroke(ctx, perimeter, candy(ctx), 5.5);
    // Fairy lights strung along the rail.
    const bulbs: [number, number][] = [[34, 640], [32, 560], [31, 480], [31, 400], [31, 320], [31, 240], [32, 170], [40, 102], [58, 74], [88, 52], [130, 40], [180, 34], [225, 34], [275, 34], [320, 35], [362, 41], [404, 56], [434, 78], [435, 110], [448, 150], [450, 210]];
    bulbs.forEach(([bx, by], i) => {
      const color = ["#ff3b4a", "#ffffff", "#ff7a86", "#fff4f4"][i % 4];
      disc(ctx, bx, by, 9, radial(ctx, bx, by, 9, [[0, color + "88"], [1, color + "00"]]));
      disc(ctx, bx, by, 4.4, color);
      disc(ctx, bx - 1.3, by - 1.5, 1.3, "#ffffffcc");
    });
  } else {
    stroke(ctx, perimeter, "#202941", 5);
    stroke(ctx, perimeter, ink.blue + "a0", 1.7);
  }
}

function drawFlipper(ctx: Paint, part: BodySnapshot) {
  const left = part.label === "flipper-left";
  const accent = left ? ink.lime : ink.mint;
  ctx.save();
  ctx.translate(part.x, part.y);
  ctx.rotate(part.angle);
  const w = FLIPPER.width;
  const h = FLIPPER.height;
  if (xmas) {
    pill(ctx, -w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3, h / 2 + 1, "#2a1319");
    pill(ctx, -w / 2, -h / 2, w, h, h / 2, candy(ctx), "#ffffff");
  } else {
    pill(ctx, -w / 2, -h / 2, w, h, h / 2, "#171735", accent);
    pill(ctx, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, h / 2 - 2, accent + "7a");
    for (let x = -25; x <= 25; x += 6) {
      disc(ctx, x, x % 4 ? -2 : 2, 1.3, "#272345");
    }
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
  xmas = isChristmasActive();
  Object.assign(ink, xmas ? festiveInk : baseInk);
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
    pill(ctx, LAUNCH_X - 13, LAUNCH_Y + 8, 26, 63, 7, xm("#141127", "#2a1319"), ink.blue);
    for (let i = 0; i < 7; i++) {
      const y = top + 6 + i * ((787 - top) / 7);
      stroke(ctx, "M 440 " + y + " l 20 3", i % 2 ? ink.mint : ink.blue, 2);
    }
    pill(ctx, LAUNCH_X - 12, top - 7, 24, 12, 4, linear(ctx, 0, top - 7, 0, top + 5, xm([ink.mint, ink.blue, "#21365f"], ["#ffffff", "#e6dde0", "#9c8d92"])), xm("#141127", "#2a1319"));

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

