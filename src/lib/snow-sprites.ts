/** Pre-rendered snowflake sprites (soft fluffy flakes and tumbling six-arm crystals), shared by every snow effect. */
const sprites = new Map<string, HTMLCanvasElement>();

function makeCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  return canvas;
}

export function softSprite(color: string): HTMLCanvasElement {
  const key = "soft" + color;
  let sprite = sprites.get(key);
  if (!sprite) {
    sprite = makeCanvas(48);
    const g = sprite.getContext("2d")!;
    const gradient = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.3, color + "d9");
    gradient.addColorStop(0.65, color + "40");
    gradient.addColorStop(1, color + "00");
    g.fillStyle = gradient;
    g.fillRect(0, 0, 48, 48);
  }
  sprites.set(key, sprite);
  return sprite;
}

/** Three crystal designs: a branched star, a hexagonal plate, and a simple star with bobbles. */
export function crystalSprite(design: number, color: string): HTMLCanvasElement {
  const key = "crystal" + design + color;
  let sprite = sprites.get(key);
  if (!sprite) {
    const size = 128;
    const c = size / 2;
    sprite = makeCanvas(size);
    const g = sprite.getContext("2d")!;
    const glow = g.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, color + "55");
    glow.addColorStop(1, color + "00");
    g.fillStyle = glow;
    g.fillRect(0, 0, size, size);
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.translate(c, c);
    const arm = 50;
    for (let k = 0; k < 6; k++) {
      g.save();
      g.rotate((k * Math.PI) / 3);
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(arm, 0);
      g.stroke();
      g.lineWidth = 3.6;
      if (design === 0) {
        // Dendrite: two pairs of side branches.
        for (const [at, len] of [[0.4, 17], [0.68, 12]]) {
          for (const side of [-1, 1]) {
            g.beginPath();
            g.moveTo(arm * at, 0);
            g.lineTo(arm * at + len * 0.6, side * len);
            g.stroke();
          }
        }
      } else if (design === 1) {
        // Plate: a small V near the tip and a ring of bobbles.
        for (const side of [-1, 1]) {
          g.beginPath();
          g.moveTo(arm * 0.62, 0);
          g.lineTo(arm * 0.86, side * 12);
          g.stroke();
        }
      } else {
        g.beginPath();
        g.arc(arm * 1.0, 0, 5.5, 0, Math.PI * 2);
        g.fill();
        for (const side of [-1, 1]) {
          g.beginPath();
          g.moveTo(arm * 0.5, 0);
          g.lineTo(arm * 0.68, side * 10);
          g.stroke();
        }
      }
      g.restore();
    }
    if (design === 1) {
      g.lineWidth = 3.4;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const angle = (k * Math.PI) / 3;
        const x = Math.cos(angle) * 16;
        const y = Math.sin(angle) * 16;
        if (k) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath();
      g.stroke();
    }
    g.beginPath();
    g.arc(0, 0, 4.5, 0, Math.PI * 2);
    g.fill();
  }
  sprites.set(key, sprite);
  return sprite;
}

