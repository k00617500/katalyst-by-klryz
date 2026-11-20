import { MOODS, type Ratings } from "@/data/vibe-check";

// Poster layout is authored on a 1080 x 1920 canvas and scaled for any output size.
export const POSTER_W = 1080;
export const POSTER_H = 1920;

const CENTER_X = 540;
const CENTER_Y = 960;
const OUTER_R = 390;
const MAX_FACE_R = 380;
const STEPS_PER_SECTOR = 16;
// Axes run clockwise from the top: flowy, deep, edgy, playful, moody.
const AXES = ["flowy", "deep", "edgy", "playful", "moody"] as const;
const AXIS_LABEL_OFFSET = 54;

export interface PosterColors {
  fg: string;
  bg: string;
  muted: string;
}

export interface PosterOptions {
  source: CanvasImageSource | null;
  sourceSize: { w: number; h: number };
  /** Animated, fractional ratings (0 - 10). */
  ratings: Ratings;
  username: string;
  blurb: string;
  thumb: CanvasImageSource | null;
  thumbSize: { w: number; h: number };
  colors: PosterColors;
  fontFamily: string;
  /** Text shown in the middle while there is nothing to warp yet. */
  placeholder?: string;
  transparentBackground?: boolean;
}

const axisAngle = (index: number) => ((-90 + index * 72) * Math.PI) / 180;
const radiusFor = (rating: number) => MAX_FACE_R * (0.2 + 0.8 * Math.min(10, Math.max(0, rating)) / 10);

/** Radius of the stretched shape at an angle: linear between axis tips, pinched in between for a star-like look. */
function shapeRadius(radii: number[], angle: number) {
  let degrees = ((angle * 180) / Math.PI + 90) % 360;
  if (degrees < 0) degrees += 360;
  const sector = Math.min(4, Math.floor(degrees / 72));
  const t = (degrees - sector * 72) / 72;
  const from = radii[sector];
  const to = radii[(sector + 1) % 5];
  const lerp = from + (to - from) * t;
  return lerp * (1 - 0.2 * Math.sin(Math.PI * t));
}

/** Affine map taking the source triangle onto the destination triangle. */
function triangleTransform(s: number[], d: number[]) {
  const dx1 = s[2] - s[0];
  const dy1 = s[3] - s[1];
  const dx2 = s[4] - s[0];
  const dy2 = s[5] - s[1];
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-9) return null;
  const ux1 = d[2] - d[0];
  const uy1 = d[3] - d[1];
  const ux2 = d[4] - d[0];
  const uy2 = d[5] - d[1];
  const a = (ux1 * dy2 - ux2 * dy1) / det;
  const c = (-ux1 * dx2 + ux2 * dx1) / det;
  const b = (uy1 * dy2 - uy2 * dy1) / det;
  const dd = (-uy1 * dx2 + uy2 * dx1) / det;
  return [a, b, c, dd, d[0] - a * s[0] - c * s[1], d[1] - b * s[0] - dd * s[1]] as const;
}

function drawWarpedImage(ctx: CanvasRenderingContext2D, source: CanvasImageSource, size: { w: number; h: number }, ratings: Ratings) {
  const radii = AXES.map((axis) => radiusFor(ratings[axis]));
  const sourceRadius = Math.min(size.w, size.h) / 2;
  const sx = size.w / 2;
  const sy = size.h / 2;
  const total = STEPS_PER_SECTOR * 5;
  const points: Array<{ dx: number; dy: number; sx: number; sy: number }> = [];
  for (let i = 0; i <= total; i++) {
    const angle = -Math.PI / 2 + (i / total) * Math.PI * 2;
    const r = shapeRadius(radii, angle);
    points.push({
      dx: CENTER_X + Math.cos(angle) * r,
      dy: CENTER_Y + Math.sin(angle) * r,
      sx: sx + Math.cos(angle) * sourceRadius,
      sy: sy + Math.sin(angle) * sourceRadius,
    });
  }
  for (let i = 0; i < total; i++) {
    const a = points[i];
    const b = points[i + 1];
    const matrix = triangleTransform([sx, sy, a.sx, a.sy, b.sx, b.sy], [CENTER_X, CENTER_Y, a.dx, a.dy, b.dx, b.dy]);
    if (!matrix) continue;
    // Grow the clip a hair so neighbouring triangles never leave seams.
    const grow = (px: number, py: number) => {
      const vx = px - CENTER_X;
      const vy = py - CENTER_Y;
      const len = Math.hypot(vx, vy) || 1;
      return [px + (vx / len) * 1.2, py + (vy / len) * 1.2] as const;
    };
    const ga = grow(a.dx, a.dy);
    const gb = grow(b.dx, b.dy);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(CENTER_X, CENTER_Y);
    ctx.lineTo(ga[0], ga[1]);
    ctx.lineTo(gb[0], gb[1]);
    ctx.closePath();
    ctx.clip();
    ctx.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
    ctx.drawImage(source, 0, 0, size.w, size.h);
    ctx.restore();
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function drawPoster(ctx: CanvasRenderingContext2D, options: PosterOptions) {
  const { colors, fontFamily } = options;
  ctx.save();
  ctx.clearRect(0, 0, POSTER_W, POSTER_H);
  if (!options.transparentBackground) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, POSTER_W, POSTER_H);
  }
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = colors.fg;
  ctx.textAlign = "center";
  ctx.font = `700 70px ${fontFamily}`;
  ctx.fillText("what’s your vibe today?", POSTER_W / 2, 190);
  ctx.font = `600 34px ${fontFamily}`;
  ctx.fillText("pause and see which hit matches your energy.", POSTER_W / 2, 262);

  // Chart frame: three rings, five axes, five labels.
  ctx.lineWidth = 2;
  ctx.strokeStyle = colors.fg;
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, OUTER_R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([3, 9]);
  ctx.strokeStyle = colors.muted;
  for (const factor of [0.78, 0.56]) {
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, OUTER_R * factor, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 2;
  AXES.forEach((_, i) => {
    const angle = axisAngle(i);
    ctx.beginPath();
    ctx.moveTo(CENTER_X, CENTER_Y);
    ctx.lineTo(CENTER_X + Math.cos(angle) * (OUTER_R + 40), CENTER_Y + Math.sin(angle) * (OUTER_R + 40));
    ctx.stroke();
  });

  if (options.source) drawWarpedImage(ctx, options.source, options.sourceSize, options.ratings);
  else if (options.placeholder) {
    ctx.fillStyle = colors.muted;
    ctx.font = `500 34px ${fontFamily}`;
    ctx.fillText(options.placeholder, CENTER_X, CENTER_Y + 12);
  }

  ctx.fillStyle = colors.fg;
  ctx.font = `500 36px ${fontFamily}`;
  AXES.forEach((axis, i) => {
    const angle = axisAngle(i);
    const r = OUTER_R + AXIS_LABEL_OFFSET;
    const x = CENTER_X + Math.cos(angle) * r;
    const y = CENTER_Y + Math.sin(angle) * r + 12;
    ctx.textAlign = Math.abs(Math.cos(angle)) < 0.2 ? "center" : Math.cos(angle) > 0 ? "left" : "right";
    const label = axis;
    ctx.fillText(label, x, y);
  });

  // Footer: wordmark, results line, blurb, small memoji tile.
  ctx.textAlign = "left";
  ctx.fillStyle = colors.fg;
  ctx.font = `700 54px ${fontFamily}`;
  ctx.fillText("the katalyst.", 60, 1640);
  ctx.font = `600 32px ${fontFamily}`;
  const name = options.username.trim() || "you";
  ctx.fillText(`results : ${name}`, 60, 1696);
  ctx.font = `500 30px ${fontFamily}`;
  ctx.fillStyle = colors.fg;
  const lines = wrapText(ctx, options.blurb, 700);
  lines.slice(0, 4).forEach((line, i) => ctx.fillText(line, 60, 1760 + i * 42));

  if (options.thumb) {
    const size = 210;
    const x = POSTER_W - 60 - size;
    const y = 1620;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 28);
    ctx.fillStyle = colors.muted + "33";
    ctx.fill();
    ctx.clip();
    const scale = Math.min((size * 0.88) / options.thumbSize.w, (size * 0.88) / options.thumbSize.h);
    const w = options.thumbSize.w * scale;
    const h = options.thumbSize.h * scale;
    ctx.drawImage(options.thumb, x + (size - w) / 2, y + (size - h) / 2, w, h);
    ctx.restore();
  }
  ctx.restore();
}

/** Blurb for a result: the strongest mood, plus a nod to the runner-up. */
export function describeVibe(ratings: Ratings) {
  const ranked = [...MOODS].sort((a, b) => ratings[b.key] - ratings[a.key]);
  const [first, second] = ranked;
  const spread = ratings[first.key] - ratings[second.key];
  if (spread <= 0.5) return `${first.blurb} also very ${second.label.toLowerCase()}. a balanced hit, a quiet powerhouse of style.`;
  return `${first.blurb} with a side of ${second.label.toLowerCase()}. a quiet powerhouse of style.`;
}
