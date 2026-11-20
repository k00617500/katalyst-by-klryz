/**
 * "Decorate your own tree": a dot-matrix Christmas tree on black (white square dots, like a printed halftone) that
 * visitors hang ornaments on. Everything here is pure canvas drawing, so the same code paints the live tree and the
 * picture used inside the greeting card. Nothing is stored or sent anywhere.
 */
export type OrnamentKind =
  | "red" | "green" | "blue" | "white" | "yellow"
  | "stripe-red" | "stripe-green" | "candy" | "ginger" | "star";

export interface Ornament {
  id: number;
  kind: OrnamentKind;
  /** 0..1 across and down the tree picture. */
  x: number;
  y: number;
}

export const ORNAMENT_LIST: { kind: OrnamentKind; label: string }[] = [
  { kind: "red", label: "Red" },
  { kind: "green", label: "Green" },
  { kind: "blue", label: "Blue" },
  { kind: "white", label: "White" },
  { kind: "yellow", label: "Yellow" },
  { kind: "stripe-red", label: "Red stripes" },
  { kind: "stripe-green", label: "Green stripes" },
  { kind: "candy", label: "Candy cane" },
  { kind: "ginger", label: "Gingerbread" },
  { kind: "star", label: "Star" },
];

export const MAX_ORNAMENTS = 40;
/** Width divided by height of the tree picture. */
export const TREE_ASPECT = 0.8;

const COLS = 60;
const ROWS = 75;

function hash(a: number, b: number) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (((h ^ (h >>> 16)) >>> 0) % 10000) / 10000;
}

/** A smooth, blotchy field in -1..1 so the dots clump like snow on branches. */
function blotch(c: number, r: number) {
  return (
    Math.sin(c * 0.55 + r * 0.21) * 0.4 +
    Math.sin(c * 0.23 - r * 0.47 + 1.3) * 0.35 +
    Math.sin((c + r) * 0.9 + 2.1) * 0.25
  );
}

const TIERS: [number, number, number][] = [
  [0.1, 0.38, 0.19],
  [0.27, 0.62, 0.29],
  [0.5, 0.86, 0.42],
];

/** Is this point (0..1 across and down) inside the tree silhouette? */
export function insideTree(u: number, v: number): boolean {
  const d = Math.abs(u - 0.5);
  for (const [top, bottom, half] of TIERS) {
    if (v >= top && v <= bottom && d <= (half * (v - top)) / (bottom - top)) return true;
  }
  if (v > 0.855 && v < 0.945 && d < 0.052) return true;
  if (d * 1.7 + Math.abs(v - 0.062) < 0.05) return true;
  return false;
}

/** Close enough to the tree to hang something on it. */
export function nearTree(u: number, v: number): boolean {
  if (insideTree(u, v)) return true;
  for (const [dx, dy] of [[0.03, 0], [-0.03, 0], [0, 0.03], [0, -0.03]]) if (insideTree(u + dx, v + dy)) return true;
  return false;
}

interface Dot { x: number; y: number; a: number }
let dots: Dot[] | null = null;

function treeDots(): Dot[] {
  if (dots) return dots;
  const list: Dot[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const u = (c + 0.5) / COLS;
      const v = (r + 0.5) / ROWS;
      const inside = insideTree(u, v);
      const edge = inside && !(insideTree(u + 1.6 / COLS, v) && insideTree(u - 1.6 / COLS, v) && insideTree(u, v + 1.6 / ROWS) && insideTree(u, v - 1.6 / ROWS));
      const n = hash(c, r);
      if (inside) {
        // Edges stay mostly filled; the middle is patchy, like the printed reference.
        const keep = edge ? n > 0.03 : blotch(c, r) + (n - 0.5) * 0.9 > -0.5;
        if (keep) list.push({ x: u, y: v, a: 0.78 + n * 0.22 });
      } else if (n > 0.985 && nearTree(u, v)) {
        list.push({ x: u, y: v, a: 0.7 });
      }
    }
  }
  dots = list;
  return list;
}

function ornamentRadius(width: number) {
  return width * 0.036;
}

export function hitOrnament(ornaments: Ornament[], u: number, v: number, width: number): Ornament | null {
  const height = width / TREE_ASPECT;
  const reach = ornamentRadius(width) * 1.35;
  for (let i = ornaments.length - 1; i >= 0; i--) {
    const o = ornaments[i];
    if (Math.hypot((o.x - u) * width, (o.y - v) * height) <= reach) return o;
  }
  return null;
}

type Ctx = CanvasRenderingContext2D;

const BALLS: Record<string, [string, string, string]> = {
  red: ["#ff8a8f", "#d8232a", "#7a0d14"],
  green: ["#8fe3ad", "#1f9d55", "#0b4a27"],
  blue: ["#9cc7ff", "#2f7be0", "#123d82"],
  white: ["#ffffff", "#ece4e6", "#a99ea3"],
  yellow: ["#fff0a0", "#f5c518", "#a77a05"],
};

function cap(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = "#e8c15a";
  ctx.fillRect(x - r * 0.3, y - r * 1.22, r * 0.6, r * 0.32);
  ctx.strokeStyle = "#e8c15a";
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.arc(x, y - r * 1.38, r * 0.2, 0, Math.PI * 2);
  ctx.stroke();
}

function ball(ctx: Ctx, x: number, y: number, r: number, colors: [string, string, string], stripe?: string) {
  const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
  body.addColorStop(0, colors[0]);
  body.addColorStop(0.45, colors[1]);
  body.addColorStop(1, colors[2]);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  if (stripe) {
    ctx.clip();
    ctx.strokeStyle = stripe;
    ctx.lineWidth = r * 0.36;
    for (let k = -4; k <= 4; k++) {
      ctx.beginPath();
      ctx.moveTo(x - r * 1.6 + k * r * 0.72, y + r * 1.4);
      ctx.lineTo(x + r * 0.2 + k * r * 0.72, y - r * 1.4);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.fillStyle = "#ffffff99";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.36, y - r * 0.4, r * 0.26, r * 0.15, -0.6, 0, Math.PI * 2);
  ctx.fill();
  cap(ctx, x, y, r);
}

function star(ctx: Ctx, x: number, y: number, r: number) {
  ctx.save();
  ctx.shadowColor = "#ffd54a";
  ctx.shadowBlur = r * 0.8;
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const radius = k % 2 ? r * 0.5 : r * 1.25;
    const angle = -Math.PI / 2 + (k * Math.PI) / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#ffd54a";
  ctx.fill();
  ctx.restore();
}

function candy(ctx: Ctx, x: number, y: number, r: number) {
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(x + r * 0.35, y + r * 1.25);
    ctx.lineTo(x + r * 0.35, y - r * 0.55);
    ctx.arc(x - r * 0.1, y - r * 0.55, r * 0.45, 0, -Math.PI, true);
  };
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = r * 0.5;
  ctx.strokeStyle = "#fdf6f0";
  trace();
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.strokeStyle = "#d8232a";
  ctx.setLineDash([r * 0.26, r * 0.4]);
  trace();
  ctx.stroke();
  ctx.restore();
}

function ginger(ctx: Ctx, x: number, y: number, r: number) {
  ctx.save();
  ctx.fillStyle = "#b8702f";
  ctx.strokeStyle = "#7a4a1d";
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.arc(x, y - r * 0.62, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x - r * 0.38, y - r * 0.28, r * 0.76, r * 0.9, r * 0.2);
  ctx.fill();
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(x + side * r * 0.4 - (side < 0 ? r * 0.5 : 0), y - r * 0.2, r * 0.5, r * 0.26, r * 0.13);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(x + side * r * 0.1 - (side < 0 ? r * 0.28 : 0), y + r * 0.5, r * 0.3, r * 0.62, r * 0.14);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#3b2008";
  ctx.beginPath();
  ctx.arc(x - r * 0.14, y - r * 0.68, r * 0.05, 0, Math.PI * 2);
  ctx.arc(x + r * 0.14, y - r * 0.68, r * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fdf6f0";
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.arc(x, y - r * 0.55, r * 0.14, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = "#d8232a";
  for (const dy of [-0.08, 0.2, 0.48]) {
    ctx.beginPath();
    ctx.arc(x, y + r * dy, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawOrnament(ctx: Ctx, kind: OrnamentKind, x: number, y: number, r: number) {
  switch (kind) {
    case "stripe-red": return ball(ctx, x, y, r, BALLS.red, "#fdf6f0");
    case "stripe-green": return ball(ctx, x, y, r, BALLS.green, "#fdf6f0");
    case "star": return star(ctx, x, y, r);
    case "candy": return candy(ctx, x, y, r);
    case "ginger": return ginger(ctx, x, y, r);
    default: return ball(ctx, x, y, r, BALLS[kind]);
  }
}

/** Paints the dot-matrix tree and its ornaments into a width x (width / TREE_ASPECT) area. */
export function drawTree(ctx: Ctx, width: number, ornaments: Ornament[], background: string | null = null) {
  const height = width / TREE_ASPECT;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  const cell = width / COLS;
  const side = cell * 0.68;
  for (const dot of treeDots()) {
    ctx.fillStyle = `rgba(255,255,255,${dot.a})`;
    ctx.fillRect(dot.x * width - side / 2, dot.y * height - side / 2, side, side);
  }
  const r = ornamentRadius(width);
  for (const o of ornaments) drawOrnament(ctx, o.kind, o.x * width, o.y * height, r);
}
