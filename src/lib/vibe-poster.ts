import { MAX_RATING, type MoodTone } from "@/data/vibe-check";

// The on-screen poster is a 1080 x 1080 square. The downloaded file is an Instagram story: 1080 x 1920 (9:16).
export const POSTER_W = 1080;
export const POSTER_H = 1080;
export const STORY_W = 1080;
export const STORY_H = 1920;

export type PosterLayout = "square" | "story";

interface Frame {
  w: number;
  h: number;
  cx: number;
  cy: number;
  outer: number;
  face: number;
  labelFont: number;
  labelOffset: number;
  axisExtra: number;
  /** Footer: where the username sits and how the text + tiles are arranged. */
  footer: "left" | "center";
  nameY: number;
  nameFont: number;
  resultsY: number;
  resultsFont: number;
  blurbY: number;
  blurbFont: number;
  blurbLine: number;
  blurbWidth: number;
  tile: number;
  tilesY: number;
  glowScale: number;
  /** The saved story carries the section's title and question above the chart. */
  header?: { titleY: number; titleFont: number; subY: number; subFont: number };
}

const FRAMES: Record<PosterLayout, Frame> = {
  square: {
    w: POSTER_W, h: POSTER_H, cx: 540, cy: 480, outer: 360, face: 352, labelFont: 30, labelOffset: 50, axisExtra: 36,
    footer: "left", nameY: 928, nameFont: 50, resultsY: 972, resultsFont: 28, blurbY: 1012, blurbFont: 24, blurbLine: 30, blurbWidth: 600,
    tile: 128, tilesY: 922, glowScale: 1,
  },
  // Instagram keeps roughly the top and bottom 250px free of content, so everything sits inside 250 - 1670.
  story: {
    w: STORY_W, h: STORY_H, cx: 540, cy: 800, outer: 330, face: 322, labelFont: 32, labelOffset: 30, axisExtra: 14,
    footer: "center", nameY: 1310, nameFont: 76, resultsY: 1372, resultsFont: 36, blurbY: 1436, blurbFont: 31, blurbLine: 42, blurbWidth: 860,
    tile: 150, tilesY: 1540, glowScale: 1.6,
    header: { titleY: 316, titleFont: 76, subY: 376, subFont: 36 },
  },
};


export interface PosterColors {
  fg: string;
  bg: string;
  muted: string;
}

export interface PosterImage {
  source: CanvasImageSource;
  w: number;
  h: number;
}

export interface PosterOptions {
  layout?: PosterLayout;
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
  /** The Katalyst QR code, drawn beside the chosen picture. */
  qr?: PosterImage | null;
  colors: PosterColors;
  /** Hex colour of the corner gradient. */
  glow: string;
  fontFamily: string;
  /** Text shown in the middle while there is nothing to warp yet. */
  placeholder?: string;
}

const axisAngle = (index: number, count: number) => ((-90 + (index * 360) / count) * Math.PI) / 180;
const radiusFor = (rating: number, face: number) => face * (0.32 + 0.68 * Math.min(MAX_RATING, Math.max(0, rating)) / MAX_RATING);

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

// Rings (as a fraction of the picture's radius) the warp mesh is built from; denser toward the edge, where the stretch lives.
const WARP_RINGS = [0.3, 0.5, 0.66, 0.8, 0.91, 1];
const WARP_STEPS_PER_AXIS = 24;
// How strongly the stretch is held back toward the centre: the face stays natural in the middle and only the edge is pulled.
const WARP_EDGE_POWER = 2.4;

/**
 * Draws the picture warped toward the chart: the middle keeps its natural size and shape, while the edge part is
 * stretched (or pulled in) toward each mood's reach, like taffy being tugged at the rim.
 */
function drawWarpedImage(ctx: CanvasRenderingContext2D, frame: Frame, source: CanvasImageSource, size: { w: number; h: number }, ratings: number[]) {
  const { cx, cy } = frame;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const edges = ratings.map((rating) => radiusFor(rating, frame.face));
  const centreScale = frame.face * 0.64;
  const sourceRadius = Math.min(size.w, size.h) / 2;
  const sx = size.w / 2;
  const sy = size.h / 2;
  const steps = WARP_STEPS_PER_AXIS * edges.length;
  const angles = Array.from({ length: steps + 1 }, (_, i) => -Math.PI / 2 + (i / steps) * Math.PI * 2);
  const reach = angles.map((angle) => shapeRadius(edges, angle));

  const source2 = (rho: number, i: number) => [sx + Math.cos(angles[i]) * rho * sourceRadius, sy + Math.sin(angles[i]) * rho * sourceRadius];
  const dest2 = (rho: number, i: number) => {
    const r = centreScale * rho * (1 + (reach[i] / centreScale - 1) * rho ** WARP_EDGE_POWER);
    return [cx + Math.cos(angles[i]) * r, cy + Math.sin(angles[i]) * r];
  };

  const triangle = (s: number[][], d: number[][]) => {
    const matrix = triangleTransform([s[0][0], s[0][1], s[1][0], s[1][1], s[2][0], s[2][1]], [d[0][0], d[0][1], d[1][0], d[1][1], d[2][0], d[2][1]]);
    if (!matrix) return;
    // Grow each clip by about a pixel on every side (scaling by its inradius, so thin slivers grow enough too) so
    // neighbouring triangles always overlap and anti-aliased edges never leave hairline gaps on the face.
    const mx = (d[0][0] + d[1][0] + d[2][0]) / 3;
    const my = (d[0][1] + d[1][1] + d[2][1]) / 3;
    const side = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const area = Math.abs((d[1][0] - d[0][0]) * (d[2][1] - d[0][1]) - (d[2][0] - d[0][0]) * (d[1][1] - d[0][1])) / 2;
    const inradius = (2 * area) / ((side(d[0], d[1]) + side(d[1], d[2]) + side(d[2], d[0])) || 1);
    const grow = Math.min(2.5, 1 + 1.2 / Math.max(inradius, 0.2));
    ctx.save();
    ctx.beginPath();
    d.forEach(([x, y], index) => {
      const gx = mx + (x - mx) * grow;
      const gy = my + (y - my) * grow;
      if (index === 0) ctx.moveTo(gx, gy); else ctx.lineTo(gx, gy);
    });
    ctx.closePath();
    ctx.clip();
    ctx.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
    ctx.drawImage(source, 0, 0, size.w, size.h);
    ctx.restore();
  };

  // The middle is one smooth disc at natural proportions (no triangles meeting at a point, so no seams on the face).
  const innerRho = WARP_RINGS[0];
  const innerRadius = reach.reduce((sum, _, i) => sum + Math.hypot(dest2(innerRho, i)[0] - cx, dest2(innerRho, i)[1] - cy), 0) / reach.length;
  const discScale = innerRadius / (innerRho * sourceRadius);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius + 1.5, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(source, cx - sx * discScale, cy - sy * discScale, size.w * discScale, size.h * discScale);
  ctx.restore();

  for (let i = 0; i < steps; i++) {
    // Bands out to the edge.
    for (let ring = 0; ring < WARP_RINGS.length - 1; ring++) {
      const inner = WARP_RINGS[ring];
      const outer = WARP_RINGS[ring + 1];
      const [sA, sB, sC, sD] = [source2(inner, i), source2(inner, i + 1), source2(outer, i), source2(outer, i + 1)];
      const [dA, dB, dC, dD] = [dest2(inner, i), dest2(inner, i + 1), dest2(outer, i), dest2(outer, i + 1)];
      triangle([sA, sB, sC], [dA, dB, dC]);
      triangle([sB, sD, sC], [dB, dD, dC]);
    }
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
const CORNER_GLOWS = [
  { corner: [0, 0], rx: 300, ry: 210, alpha: 0.34 },
  { corner: [1, 0], rx: 170, ry: 250, alpha: 0.2 },
  { corner: [0, 1], rx: 210, ry: 150, alpha: 0.24 },
  { corner: [1, 1], rx: 270, ry: 290, alpha: 0.3 },
] as const;

function hexToRgb(hex: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex) ?? /^#([0-9a-f]{6})$/i.exec(DEFAULT_GLOW)!;
  return [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16)).join(",");
}

function drawCornerGlows(ctx: CanvasRenderingContext2D, frame: Frame, color: string) {
  const rgb = hexToRgb(color);
  for (const glow of CORNER_GLOWS) {
    const rx = glow.rx * frame.glowScale;
    const ry = glow.ry * frame.glowScale;
    const x = glow.corner[0] * frame.w;
    const y = glow.corner[1] * frame.h;
    ctx.save();
    ctx.beginPath();
    ctx.rect(glow.corner[0] === 0 ? 0 : x - rx, glow.corner[1] === 0 ? 0 : y - ry, rx, ry);
    ctx.clip();
    // Stretch a round gradient into an ellipse so each side spreads by a different amount.
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, `rgba(${rgb},${glow.alpha})`);
    gradient.addColorStop(0.55, `rgba(${rgb},${glow.alpha * 0.36})`);
    gradient.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
    ctx.restore();
  }
}

function drawTile(ctx: CanvasRenderingContext2D, image: CanvasImageSource, imageSize: { w: number; h: number }, x: number, y: number, size: number, fill: string, pad: number) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.15);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
  const scale = Math.min((size * pad) / imageSize.w, (size * pad) / imageSize.h);
  const w = imageSize.w * scale;
  const h = imageSize.h * scale;
  ctx.drawImage(image, x + (size - w) / 2, y + (size - h) / 2, w, h);
  ctx.restore();
}

export function drawPoster(ctx: CanvasRenderingContext2D, options: PosterOptions) {
  const frame = FRAMES[options.layout ?? "square"];
  const { colors, fontFamily } = options;
  ctx.save();
  ctx.clearRect(0, 0, frame.w, frame.h);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, frame.w, frame.h);
  drawCornerGlows(ctx, frame, options.glow);
  ctx.textBaseline = "alphabetic";

  if (frame.header) {
    ctx.textAlign = "center";
    ctx.fillStyle = colors.fg;
    ctx.font = `700 ${frame.header.titleFont}px ${fontFamily}`;
    ctx.fillText("Vibe check", frame.w / 2, frame.header.titleY);
    ctx.fillStyle = colors.muted;
    ctx.font = `400 ${frame.header.subFont}px ${fontFamily}`;
    ctx.fillText("How are you feeling in here?", frame.w / 2, frame.header.subY);
  }

  // Chart frame: three rings, five axes.
  ctx.lineWidth = 2;
  ctx.strokeStyle = colors.fg;
  ctx.beginPath();
  ctx.arc(frame.cx, frame.cy, frame.outer, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([3, 9]);
  ctx.strokeStyle = colors.muted;
  for (const factor of [0.78, 0.56]) {
    ctx.beginPath();
    ctx.arc(frame.cx, frame.cy, frame.outer * factor, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = colors.muted;
  options.labels.forEach((_, i) => {
    const angle = axisAngle(i, options.labels.length);
    ctx.beginPath();
    ctx.moveTo(frame.cx, frame.cy);
    ctx.lineTo(frame.cx + Math.cos(angle) * (frame.outer + frame.axisExtra), frame.cy + Math.sin(angle) * (frame.outer + frame.axisExtra));
    ctx.stroke();
  });

  if (options.source) drawWarpedImage(ctx, frame, options.source, options.sourceSize, options.ratings);
  else if (options.placeholder) {
    ctx.fillStyle = colors.muted;
    ctx.textAlign = "center";
    ctx.font = `400 ${frame.labelFont}px ${fontFamily}`;
    ctx.fillText(options.placeholder, frame.cx, frame.cy + 10);
  }

  ctx.fillStyle = colors.fg;
  ctx.font = `400 ${frame.labelFont}px ${fontFamily}`;
  options.labels.forEach((axis, i) => {
    if (!axis) return;
    const angle = axisAngle(i, options.labels.length);
    const r = frame.outer + frame.labelOffset;
    const x = frame.cx + Math.cos(angle) * r;
    const y = frame.cy + Math.sin(angle) * r + frame.labelFont / 3;
    const text = axis.toLowerCase();
    const width = ctx.measureText(text).width;
    const align = Math.abs(Math.cos(angle)) < 0.2 ? "center" : Math.cos(angle) > 0 ? "left" : "right";
    ctx.textAlign = align;
    // Keep long mood names inside the poster.
    const margin = 28;
    const fitted = align === "right" ? Math.max(x, margin + width) : align === "left" ? Math.min(x, frame.w - margin - width) : Math.min(Math.max(x, margin + width / 2), frame.w - margin - width / 2);
    ctx.fillText(text, fitted, y);
  });

  // Footer: the username (the only bold text), the qualitative review, then a one-sentence narrative.
  const name = options.username.trim() || "you";
  const shown = name.length > 18 ? `${name.slice(0, 17)}…` : name;
  const centered = frame.footer === "center";
  const textX = centered ? frame.w / 2 : 56;
  ctx.textAlign = centered ? "center" : "left";
  ctx.fillStyle = colors.fg;
  ctx.font = `700 ${frame.nameFont}px ${fontFamily}`;
  ctx.fillText(shown, textX, frame.nameY);
  ctx.font = `400 ${frame.resultsFont}px ${fontFamily}`;
  ctx.fillText(`results : ${options.review.toLowerCase()}`, textX, frame.resultsY);
  ctx.font = `400 ${frame.blurbFont}px ${fontFamily}`;
  wrapText(ctx, options.blurb, frame.blurbWidth).slice(0, 3).forEach((line, i) => ctx.fillText(line, textX, frame.blurbY + i * frame.blurbLine));

  // The chosen picture with The Katalyst QR code beside it.
  const gap = frame.tile * 0.16;
  const thumbCount = options.thumb ? 1 : 0;
  const qrCount = options.qr ? 1 : 0;
  const rowWidth = (thumbCount + qrCount) * frame.tile + (thumbCount && qrCount ? gap : 0);
  let tileX = centered ? (frame.w - rowWidth) / 2 : frame.w - 56 - rowWidth;
  if (options.thumb) {
    drawTile(ctx, options.thumb, options.thumbSize, tileX, frame.tilesY, frame.tile, colors.muted + "33", 0.88);
    tileX += frame.tile + gap;
  }
  if (options.qr) drawTile(ctx, options.qr.source, { w: options.qr.w, h: options.qr.h }, tileX, frame.tilesY, frame.tile, "#0b0b0c", 1);
  ctx.restore();
}

/**
 * One short narrative sentence for the result: how the visit felt overall, who sits close behind, and any rough edge.
 * e.g. "You're mostly impressed, with engaged close behind and nothing but good vibes."
 */
export function describeVibe(moods: Array<{ label: string; description?: string; rating: number; tone?: MoodTone }>) {
  if (!moods.length) return "pick a few moods to see what your vibe looks like.";
  const ranked = [...moods].sort((a, b) => b.rating - a.rating);
  const [first, second] = ranked;
  if (!second) return `You're mostly ${first.label.toLowerCase()}.`;

  const runnerUp = first.rating - second.rating <= 1 ? `with ${second.label.toLowerCase()} close behind` : `with a side of ${second.label.toLowerCase()}`;
  const negative = ranked.find((mood) => mood.tone === "negative" && mood.rating >= 3 && mood !== first && mood !== second);
  const allPositive = moods.every((mood) => mood.tone !== "negative");
  const tail = negative ? ` and a touch of ${negative.label.toLowerCase()}` : allPositive ? " and nothing but good vibes" : "";
  return `You're mostly ${first.label.toLowerCase()}, ${runnerUp}${tail}.`;
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
