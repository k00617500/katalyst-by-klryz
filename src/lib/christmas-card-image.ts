import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { TREE_ASPECT, drawLights, drawTree, type Ornament } from "@/lib/christmas-tree";
import { drawSnow, makeSnow } from "@/lib/snow-field";

/**
 * The saved card as a picture. Two square panels side by side when open: a red note page on the left and the visitor's
 * decorated tree on the right (twinkling lights, snow falling on the tree), with a tiny QR code for the site.
 * The PNG is the open card. The GIF plays the whole thing: the closed cover, the card swinging open, then snow
 * falling over the tree. Everything is drawn from time and opening progress; nothing leaves the browser.
 */
export const CARD_SNOW_PERIOD = 4;
const FONT = "'DM Sans', system-ui, sans-serif";
const FELT = "#173a2c";
const PAGE_BG = "#050505";

export interface CardImageOptions {
  ornaments: Ornament[];
  name: string;
  qr: HTMLImageElement | null;
  /** Which cover (0 snowflake, 1 deer, 2 tree, 3 gift). */
  cover: number;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** The red left-hand page, laid out for a square of side `size` whose top-left corner is the origin. */
function drawNotePage(ctx: CanvasRenderingContext2D, size: number, options: CardImageOptions) {
  const k = size / 600;
  const red = ctx.createLinearGradient(0, 0, size, size);
  red.addColorStop(0, "#d1202f");
  red.addColorStop(1, "#8f0d1b");
  ctx.fillStyle = red;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let y = 18 * k; y < size; y += 26 * k) for (let x = 18 * k; x < size; x += 26 * k) ctx.fillRect(x, y, 2 * k, 2 * k);

  ctx.fillStyle = "#fff7ee";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${56 * k}px ${FONT}`;
  const greeting = `Have A Happy Christmas${options.name ? `, ${options.name}` : ""}`;
  const lines = wrap(ctx, greeting, size - 96 * k);
  const top = size * 0.34 - ((lines.length - 1) * 62 * k) / 2;
  lines.forEach((line, i) => ctx.fillText(line, 48 * k, top + i * 62 * k));
  ctx.font = `500 ${26 * k}px ${FONT}`;
  ctx.fillStyle = "#ffd9d4";
  ctx.fillText("From The Katalyst by Klaryze!", 48 * k, top + lines.length * 62 * k + 18 * k);
  ctx.font = `600 ${15 * k}px ${FONT}`;
  ctx.fillStyle = "#ffffffaa";
  ctx.fillText("2026", 48 * k, size - 46 * k);

  if (options.qr) {
    const q = 74 * k;
    const x = size - 48 * k - q;
    const y = size - 48 * k - q;
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.roundRect(x - 5 * k, y - 5 * k, q + 10 * k, q + 10 * k, 10 * k);
    ctx.fill();
    ctx.drawImage(options.qr, x, y, q, q);
  }
}

/** The right-hand page: the tree on black, with "Merry Christmas." in the corner. */
function drawTreePage(ctx: CanvasRenderingContext2D, size: number, options: CardImageOptions, t: number) {
  const k = size / 600;
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, size, size);
  const treeHeight = size * 0.9;
  const treeWidth = treeHeight * TREE_ASPECT;
  ctx.save();
  ctx.translate((size - treeWidth) / 2, (size - treeHeight) / 2 + size * 0.015);
  drawTree(ctx, treeWidth, options.ornaments);
  drawLights(ctx, treeWidth, (t * ((Math.PI * 2) / CARD_SNOW_PERIOD) * 2) / 2.4);
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 ${30 * k}px ${FONT}`;
  ctx.fillText("Merry", 30 * k, 52 * k);
  ctx.fillText("Christmas", 30 * k, 84 * k);
  const dot = ctx.measureText("Christmas").width;
  ctx.fillStyle = "#d8232a";
  ctx.fillText(".", 30 * k + dot, 84 * k);
}

/** The felt cover with its white stencil, laid out for a square of side `size` at the origin. */
function drawCover(ctx: CanvasRenderingContext2D, size: number, cover: number) {
  ctx.fillStyle = FELT;
  ctx.fillRect(0, 0, size, size);
  // A little felt grain (a fixed pattern).
  for (let i = 0; i < 900; i++) {
    const x = (((i * 0.6180339 * 1000) % 1000) / 1000) * size;
    const y = (((i * 0.7548776 * 1000) % 1000) / 1000) * size;
    ctx.fillStyle = `rgba(255,255,255,${0.025 + ((i * 7) % 10) / 160})`;
    ctx.fillRect(x, y, size / 300, size / 300);
  }
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `500 ${size * 0.047}px ${FONT}`;
  ctx.fillText("HAPPY CHRISTMAS", size * 0.09, size * 0.115);
  ctx.fillText("2026", size * 0.09, size * 0.165);
  ctx.fillStyle = "#0b1f17";
  ctx.beginPath();
  ctx.arc(size * 0.9, size * 0.07, size * 0.026, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c9a85a";
  ctx.lineWidth = size * 0.004;
  ctx.stroke();

  // The stencil, drawn in the same 140 x 130 space the page uses.
  const scale = (size * 0.58) / 140;
  ctx.save();
  ctx.translate(size * 0.09, size - size * 0.07 - 130 * scale);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (cover === 0) {
    ctx.translate(70, 65);
    for (let k = 0; k < 6; k++) {
      ctx.save();
      ctx.rotate((k * Math.PI) / 3);
      ctx.lineWidth = 9;
      ctx.lineCap = "butt";
      ctx.stroke(new Path2D("M0 0 L0 -54 M-15 -42 L0 -28 L15 -42"));
      ctx.lineWidth = 7;
      ctx.stroke(new Path2D("M-12 -62 L0 -50 L12 -62"));
      ctx.restore();
    }
  } else if (cover === 1) {
    ctx.fill(new Path2D("M26 50 H104 Q112 50 112 58 V78 H26 Z M96 52 L116 26 L130 36 L112 66 Z M112 28 L134 20 L140 34 L124 42 Z M22 52 L14 46 L22 60 Z"));
    for (const x of [30, 50, 82, 98]) ctx.fillRect(x, 76, 10, 38);
    ctx.lineWidth = 5;
    ctx.stroke(new Path2D("M120 24 L112 6 M114 14 L102 10 M127 22 L136 6 M132 13 L141 14"));
  } else if (cover === 2) {
    ctx.translate(8, -2);
    ctx.fill(new Path2D("M62 8 L40 40 L50 40 L30 68 L42 68 L18 102 L54 102 L54 118 L70 118 L70 102 L106 102 L82 68 L94 68 L74 40 L84 40 Z"));
  } else {
    ctx.fill(new Path2D("M24 56 H116 V70 H24 Z M30 72 H110 V122 H30 Z"));
    ctx.fillStyle = FELT;
    ctx.fillRect(62, 56, 16, 66);
    ctx.fillStyle = "#ffffff";
    ctx.fill(new Path2D("M70 56 C46 26 24 40 50 56 Z M70 56 C94 26 116 40 90 56 Z"));
  }
  ctx.restore();
}

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/**
 * Draws the card into a (2 x size) by (size) canvas. `open` runs from 0 (closed, showing the cover) to 1 (open flat);
 * `t` is the snow/light time in seconds.
 */
export function drawCard(ctx: CanvasRenderingContext2D, size: number, options: CardImageOptions, t: number, open = 1) {
  const width = size * 2;
  ctx.fillStyle = PAGE_BG;
  ctx.fillRect(0, 0, width, size);

  // The right-hand page stays put; the cover swings open on its left edge and the card slides to the middle.
  const hinge = size / 2 + (open * size) / 2;
  ctx.save();
  ctx.translate(hinge, 0);
  drawTreePage(ctx, size, options, t);
  ctx.restore();

  // Snow falls on the tree page once the card is open.
  if (open > 0.4) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(hinge, 0, size, size);
    ctx.clip();
    ctx.globalAlpha = Math.min(1, (open - 0.4) / 0.6) ** 2;
    ctx.translate(hinge, 0);
    drawSnow(ctx, size, size, t, snow, CARD_SNOW_PERIOD, (size / 600) * 1.1);
    ctx.restore();
  }

  const angle = open * Math.PI;
  const cosine = Math.cos(angle);
  const shade = Math.sin(angle); // darkest while the cover stands edge-on
  if (cosine > 0.001) {
    // Front of the cover, narrowing as it swings away.
    ctx.save();
    ctx.translate(hinge, 0);
    ctx.scale(cosine, 1);
    drawCover(ctx, size, options.cover);
    ctx.fillStyle = `rgba(0,0,0,${0.35 * shade})`;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  } else if (cosine < -0.001) {
    // Back of the cover, which is the red note page, widening on the left of the hinge.
    ctx.save();
    ctx.translate(hinge, 0);
    ctx.scale(-cosine, 1);
    ctx.translate(-size, 0);
    drawNotePage(ctx, size, options);
    ctx.fillStyle = `rgba(0,0,0,${0.35 * shade})`;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }
}

const snow = makeSnow(46, 11);

export function loadQr(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/images/the-katalyst-back.png";
  });
}

/** The card is always set in DM Sans, so make sure it is loaded before anything is drawn. */
async function loadFonts() {
  try {
    await Promise.all(["500", "600", "700"].map((weight) => document.fonts.load(`${weight} 40px 'DM Sans'`)));
    await document.fonts.ready;
  } catch { /* fall back to the system font */ }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function savePng(options: CardImageOptions) {
  await loadFonts();
  const size = 800;
  const canvas = document.createElement("canvas");
  canvas.width = size * 2;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  drawCard(ctx, size, options, 1.3, 1);
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (blob) download(blob, "my-christmas-card.png");
}

/**
 * Renders an animated GIF: the closed card, the card swinging open, then snow falling over the tree on the right
 * page with the lights twinkling. Reports progress 0..1.
 */
export async function saveGif(options: CardImageOptions, onProgress: (value: number) => void) {
  await loadFonts();
  const size = 320; // each page; the GIF is 640 x 320 to keep the file small
  const fps = 10;
  const closedFrames = 9;
  const openingFrames = 10;
  const snowFrames = CARD_SNOW_PERIOD * fps;
  const total = closedFrames + openingFrames + snowFrames;
  const delay = Math.round(1000 / fps);
  const canvas = document.createElement("canvas");
  canvas.width = size * 2;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const gif = GIFEncoder();
  for (let i = 0; i < total; i++) {
    let open = 0;
    let t = 0;
    if (i >= closedFrames && i < closedFrames + openingFrames) open = easeInOut((i - closedFrames + 1) / openingFrames);
    else if (i >= closedFrames + openingFrames) { open = 1; t = ((i - closedFrames - openingFrames) / snowFrames) * CARD_SNOW_PERIOD; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCard(ctx, size, options, t, open);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(data, 128);
    // Linger on the closed card, and on the first open frame, a little longer than a single tick.
    const frameDelay = i === closedFrames - 1 ? delay * 6 : i === closedFrames + openingFrames - 1 ? delay * 3 : delay;
    gif.writeFrame(applyPalette(data, palette), canvas.width, canvas.height, { palette, delay: frameDelay });
    onProgress((i + 1) / total);
    await new Promise((resolve) => window.setTimeout(resolve, 0)); // let the page breathe between frames
  }
  gif.finish();
  download(new Blob([gif.bytes() as BlobPart], { type: "image/gif" }), "my-christmas-card.gif");
}
