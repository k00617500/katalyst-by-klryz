import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { TREE_ASPECT, drawLights, drawTree, type Ornament } from "@/lib/christmas-tree";
import { drawSnow, makeSnow } from "@/lib/snow-field";

/**
 * The saved card as a picture: two square panels side by side. Left, a red panel with the greeting and a tiny QR
 * code; right, the visitor's decorated tree with twinkling lights. Snow falls over both. Everything is drawn from
 * the time `t`, so the PNG is one frame and the GIF is a seamless loop of frames. Nothing leaves the browser.
 */
export const CARD_SNOW_PERIOD = 4;
const FONT = "'DM Sans', Inter, system-ui, sans-serif";

export interface CardImageOptions {
  ornaments: Ornament[];
  name: string;
  qr: HTMLImageElement | null;
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

/** Draws the whole card into a (2 x size) by (size) canvas at time `t` seconds. */
export function drawCard(ctx: CanvasRenderingContext2D, size: number, options: CardImageOptions, t: number) {
  const width = size * 2;
  const k = size / 600; // everything below is laid out for a 600px panel

  // Left panel: red, with a soft light from the top left.
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

  // A very small QR code, for the site.
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

  // Right panel: the tree, on black.
  ctx.save();
  ctx.translate(size, 0);
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, size, size);
  const treeHeight = size * 0.9;
  const treeWidth = treeHeight * TREE_ASPECT;
  ctx.save();
  ctx.translate((size - treeWidth) / 2, (size - treeHeight) / 2 + size * 0.015);
  drawTree(ctx, treeWidth, options.ornaments);
  drawLights(ctx, treeWidth, t * ((Math.PI * 2) / CARD_SNOW_PERIOD) / 2.4 * 2);
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${30 * k}px ${FONT}`;
  ctx.fillText("Merry", 30 * k, 52 * k);
  ctx.fillText("Christmas", 30 * k, 52 * k + 32 * k);
  const dot = ctx.measureText("Christmas").width;
  ctx.fillStyle = "#d8232a";
  ctx.fillText(".", 30 * k + dot, 52 * k + 32 * k);
  ctx.restore();

  drawSnow(ctx, width, size, t, snow, CARD_SNOW_PERIOD, k * 1.1);
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
  const size = 800;
  const canvas = document.createElement("canvas");
  canvas.width = size * 2;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  drawCard(ctx, size, options, 1.3);
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (blob) download(blob, "my-christmas-card.png");
}

/** Renders an animated, looping GIF (snow falling, lights twinkling). Reports progress 0..1. */
export async function saveGif(options: CardImageOptions, onProgress: (value: number) => void) {
  const size = 320; // each panel; the GIF is 640 x 320 to keep the file small
  const frames = 40;
  const delay = Math.round((CARD_SNOW_PERIOD * 1000) / frames);
  const canvas = document.createElement("canvas");
  canvas.width = size * 2;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const gif = GIFEncoder();
  for (let i = 0; i < frames; i++) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCard(ctx, size, options, (i / frames) * CARD_SNOW_PERIOD);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(data, 128);
    gif.writeFrame(applyPalette(data, palette), canvas.width, canvas.height, { palette, delay });
    onProgress((i + 1) / frames);
    await new Promise((resolve) => window.setTimeout(resolve, 0)); // let the page breathe between frames
  }
  gif.finish();
  download(new Blob([gif.bytes() as BlobPart], { type: "image/gif" }), "my-christmas-card.gif");
}
