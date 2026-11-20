
// The poster is authored on a 1080 x 1080 square and scaled for any output size.
export const POSTER_W = 1080;
export const POSTER_H = 1080;

const CENTER_X = 540;
const CENTER_Y = 480;
const OUTER_R = 360;
const MAX_FACE_R = 352;
const STEPS_PER_SECTOR = 24;
const AXIS_LABEL_OFFSET = 50;

export interface PosterColors {
  fg: string;
  bg: string;
  muted: string;
}

import { MAX_RATING, type MoodTone } from "@/data/vibe-check";

export interface PosterOptions {
  source: CanvasImageSource | null;
  sourceSize: { w: number; h: number };
  /** One label per axis, clockwise from the top. Empty strings draw unlabeled axes. */
  labels: string[];
  /** Animated, fractional ratings (0 - MAX_RATING) that drive the stretch, one per axis. */
  ratings: number[];
  /** The qualitative overall review shown after "results :". */
  review: string;
  username: string;
  blurb: string;
  thumb: CanvasImageSource | null;
  thumbSize: { w: number; h: number };
  colors: PosterColors;
  /** Hex colour of the corner gradient. */
  glow: string;
  fontFamily: string;
  /** Text shown in the middle while there is nothing to warp yet. */
  placeholder?: string;
}

const axisAngle = (index: number, count: number) => ((-90 + (index * 360) / count) * Math.PI) / 180;
const radiusFor = (rating: number) => MAX_FACE_R * (0.32 + 0.68 * Math.min(MAX_RATING, Math.max(0, rating)) / MAX_RATING);

export function averageRating(ratings: number[]) {
  return ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0;
}

/** Radius of the stretched shape at an angle: eased between axis radii so every lobe is soft and rounded, never pointy. */
function shapeRadius(radii: number[], angle: number) {
  const count = radii.length;
  const span = 360 / count;
  let degrees = ((angle * 180) / Math.PI + 90) % 360;
  if (degrees < 0) degrees += 360;
  const sector = Math.min(count - 1, Math.floor(degrees / span));
  const t = (degrees - sector * span) / span;
  const from = radii[sector];
  const to = radii[(sector + 1) % count];
  const eased = t * t * (3 - 2 * t);
  return from + (to - from) * eased;
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

function drawWarpedImage(ctx: CanvasRenderingContext2D, source: CanvasImageSource, size: { w: number; h: number }, ratings: number[]) {
  const radii = ratings.map(radiusFor);
  const sourceRadius = Math.min(size.w, size.h) / 2;
  const sx = size.w / 2;
  const sy = size.h / 2;
  const total = STEPS_PER_SECTOR * radii.length;
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
    // Overlap neighbouring wedges along the chord so antialiased clip edges never leave seam lines.
    const stretch = 0.2;
    const ga = [a.dx + (a.dx - b.dx) * stretch, a.dy + (a.dy - b.dy) * stretch] as const;
    const gb = [b.dx + (b.dx - a.dx) * stretch, b.dy + (b.dy - a.dy) * stretch] as const;
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

// One colour, spread unevenly: each corner gets its own reach and strength so the touch of colour never looks stamped.
// It stays tucked into the corners and never reaches the chart.
export const DEFAULT_GLOW = "#a4dd00";
const CORNER_GLOWS: Array<{ x: number; y: number; rx: number; ry: number; alpha: number }> = [
  { x: 0, y: 0, rx: 300, ry: 210, alpha: 0.34 },
  { x: POSTER_W, y: 0, rx: 170, ry: 250, alpha: 0.2 },
  { x: 0, y: POSTER_H, rx: 210, ry: 150, alpha: 0.24 },
  { x: POSTER_W, y: POSTER_H, rx: 270, ry: 290, alpha: 0.3 },
];

function hexToRgb(hex: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex) ?? /^#([0-9a-f]{6})$/i.exec(DEFAULT_GLOW)!;
  return [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16)).join(",");
}

function drawCornerGlows(ctx: CanvasRenderingContext2D, color: string) {
  const rgb = hexToRgb(color);
  for (const glow of CORNER_GLOWS) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(glow.x === 0 ? 0 : glow.x - glow.rx, glow.y === 0 ? 0 : glow.y - glow.ry, glow.rx, glow.ry);
    ctx.clip();
    // Stretch a round gradient into an ellipse so each side spreads by a different amount.
    ctx.translate(glow.x, glow.y);
    ctx.scale(glow.rx, glow.ry);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, `rgba(${rgb},${glow.alpha})`);
    gradient.addColorStop(0.55, `rgba(${rgb},${glow.alpha * 0.36})`);
    gradient.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
    ctx.restore();
  }
}

export function drawPoster(ctx: CanvasRenderingContext2D, options: PosterOptions) {
  const { colors, fontFamily } = options;
  ctx.save();
  ctx.clearRect(0, 0, POSTER_W, POSTER_H);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);
  drawCornerGlows(ctx, options.glow);
  ctx.textBaseline = "alphabetic";

  // Chart frame: three rings, five axes.
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
  options.labels.forEach((_, i) => {
    const angle = axisAngle(i, options.labels.length);
    ctx.beginPath();
    ctx.moveTo(CENTER_X, CENTER_Y);
    ctx.lineTo(CENTER_X + Math.cos(angle) * (OUTER_R + 36), CENTER_Y + Math.sin(angle) * (OUTER_R + 36));
    ctx.stroke();
  });

  if (options.source) drawWarpedImage(ctx, options.source, options.sourceSize, options.ratings);
  else if (options.placeholder) {
    ctx.fillStyle = colors.muted;
    ctx.textAlign = "center";
    ctx.font = `400 30px ${fontFamily}`;
    ctx.fillText(options.placeholder, CENTER_X, CENTER_Y + 10);
  }

  ctx.fillStyle = colors.fg;
  ctx.font = `400 30px ${fontFamily}`;
  options.labels.forEach((axis, i) => {
    if (!axis) return;
    const angle = axisAngle(i, options.labels.length);
    const r = OUTER_R + AXIS_LABEL_OFFSET;
    const x = CENTER_X + Math.cos(angle) * r;
    const y = CENTER_Y + Math.sin(angle) * r + 10;
    const text = axis.toLowerCase();
    const width = ctx.measureText(text).width;
    const align = Math.abs(Math.cos(angle)) < 0.2 ? "center" : Math.cos(angle) > 0 ? "left" : "right";
    ctx.textAlign = align;
    // Keep long mood names inside the poster.
    const margin = 28;
    const fitted = align === "right" ? Math.max(x, margin + width) : align === "left" ? Math.min(x, POSTER_W - margin - width) : Math.min(Math.max(x, margin + width / 2), POSTER_W - margin - width / 2);
    ctx.fillText(text, fitted, y);
  });

  // Footer: the username (the only bold text), the rating average, then the blurb.
  const name = options.username.trim() || "you";
  ctx.textAlign = "left";
  ctx.fillStyle = colors.fg;
  ctx.font = `700 50px ${fontFamily}`;
  ctx.fillText(name.length > 18 ? `${name.slice(0, 17)}…` : name, 56, 928);
  ctx.font = `400 28px ${fontFamily}`;
  ctx.fillText(`results : ${options.review.toLowerCase()}`, 56, 972);
  ctx.font = `400 22px ${fontFamily}`;
  const lines = wrapText(ctx, options.blurb, 700);
  lines.slice(0, 3).forEach((line, i) => ctx.fillText(line, 56, 1010 + i * 28));

  if (options.thumb) {
    const size = 150;
    const x = POSTER_W - 56 - size;
    const y = 898;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 22);
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

/**
 * Short, informative blurb for a result: the strongest mood in its own words, how the runner-up sits behind it,
 * and a note on the overall tone. Stays around two lines on the poster.
 */
export function describeVibe(moods: Array<{ label: string; description: string; rating: number; tone?: MoodTone }>) {
  if (!moods.length) return "pick a few moods to see what your vibe looks like.";
  const ranked = [...moods].sort((a, b) => b.rating - a.rating);
  const [first, second] = ranked;
  const lead = `mostly ${first.label.toLowerCase()}: ${first.description.toLowerCase()}.`;
  if (!second) return lead;

  const runnerUp = first.rating - second.rating <= 1 ? `${second.label.toLowerCase()} close behind` : `with a side of ${second.label.toLowerCase()}`;
  const negative = ranked.find((mood) => mood.tone === "negative" && mood.rating >= 5 && mood !== first && mood !== second);
  const allPositive = moods.every((mood) => mood.tone !== "negative");
  const tone = negative ? `a touch of ${negative.label.toLowerCase()} in the mix` : allPositive ? "nothing but good vibes" : "";
  return `${lead} ${runnerUp}${tone ? `, ${tone}` : ""}.`;
}

export interface OverallReview {
  label: string;
  /** -1 (all negative) to 1 (all positive), weighted by how strongly each mood was rated. */
  score: number;
}

/** Qualitative overall review from the picked moods: positive moods lift it, negative moods pull it down. */
export function overallReview(moods: Array<{ tone: MoodTone; rating: number }>): OverallReview {
  const total = moods.reduce((sum, mood) => sum + mood.rating, 0);
  if (!total) return { label: "Not enough to go on yet", score: 0 };
  const score = moods.reduce((sum, mood) => sum + (mood.tone === "positive" ? mood.rating : -mood.rating), 0) / total;
  return { label: overallReviewFromScore(score), score };
}

/** Qualitative label for a -1..1 sentiment score. */
export function overallReviewFromScore(score: number) {
  return score >= 0.7 ? "Overwhelmingly positive" : score >= 0.35 ? "Positive" : score > -0.35 ? "Mixed feelings" : score > -0.7 ? "Leaning negative" : "Negative";
}
