/**
 * The four greeting-card covers, drawn after the dark-green felt cards in the reference: a bold white stencil (snowflake,
 * deer, fir tree or gift) sitting low on the left, with a speckled, printed grain. One data source feeds both the
 * on-page SVG and the canvas used for the saved PNG and GIF, so they always match.
 */
export const COVER_COUNT = 4;
export const COVER_FELT = "#173a2c";
/** The stencil is drawn in a 140 x 130 box. */
export const COVER_BOX = { w: 140, h: 130 };

export interface CoverOp {
  /** `fill` and `stroke` are white ink; `cut` is felt colour, used for ribbons and gaps. */
  mode: "fill" | "stroke" | "cut";
  d: string;
  width?: number;
}

const rotate = (x: number, y: number, degrees: number) => {
  const a = (degrees * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)] as const;
};
const poly = (points: [number, number][], degrees: number, cx: number, cy: number) =>
  points.map(([x, y], i) => {
    const [rx, ry] = rotate(x, y, degrees);
    return `${i ? "L" : "M"}${(cx + rx).toFixed(1)} ${(cy + ry).toFixed(1)}`;
  }).join(" ");

function snowflake(): CoverOp[] {
  const ops: CoverOp[] = [];
  for (let k = 0; k < 6; k++) {
    const angle = k * 60;
    ops.push({ mode: "stroke", width: 8, d: poly([[0, -14], [0, -54]], angle, 70, 65) });
    ops.push({ mode: "stroke", width: 8, d: poly([[-15, -41], [0, -27], [15, -41]], angle, 70, 65) });
    ops.push({ mode: "stroke", width: 6, d: poly([[-11, -59], [0, -48], [11, -59]], angle, 70, 65) });
  }
  // A hexagon at the heart of the flake.
  const hexagon: [number, number][] = Array.from({ length: 6 }, (_, k) => {
    const [x, y] = rotate(0, -17, k * 60);
    return [x, y];
  });
  ops.push({ mode: "stroke", width: 6, d: poly(hexagon, 0, 70, 65) + " Z" });
  return ops;
}

const COVERS: CoverOp[][] = [
  snowflake(),
  // Deer in profile, looking right, with one branching antler.
  [
    { mode: "fill", d: "M30 52 H100 Q110 52 110 62 V76 Q110 82 104 82 H34 Q26 82 26 74 V58 Q26 52 30 52 Z" },
    { mode: "fill", d: "M94 56 L110 28 L122 22 L139 33 L134 42 L124 40 L116 54 L104 70 Z" },
    { mode: "fill", d: "M114 26 L109 12 L123 21 Z" },
    { mode: "fill", d: "M27 58 L15 51 L22 68 Z" },
    { mode: "fill", d: "M91 80 H102 L100 117 H92 Z" },
    { mode: "fill", d: "M75 80 H86 L85 117 H77 Z" },
    { mode: "fill", d: "M43 80 H54 L53 117 H45 Z" },
    { mode: "fill", d: "M29 80 H40 L39 117 H32 Z" },
    { mode: "stroke", width: 5, d: "M119 24 C112 13 115 6 122 4 M115 15 L107 10 M122 8 L131 6 M120 18 C125 12 133 12 137 15" },
  ],
  // Layered fir tree.
  [
    { mode: "fill", d: "M70 4 L44 36 L54 36 L28 68 L42 68 L14 102 L56 102 L56 120 L84 120 L84 102 L126 102 L98 68 L112 68 L86 36 L96 36 Z" },
  ],
  // Gift in three-quarter view with a big bow.
  [
    { mode: "fill", d: "M70 40 L118 58 L70 76 L22 58 Z" },
    { mode: "fill", d: "M22 62 L68 80 L68 124 L22 106 Z" },
    { mode: "fill", d: "M118 62 L72 80 L72 124 L118 106 Z" },
    { mode: "cut", d: "M62 76 L78 76 L78 124 L62 124 Z" },
    { mode: "cut", d: "M70 40 L82 44.6 L82 64 L70 59.4 Z" },
    { mode: "fill", d: "M70 44 C44 8 22 28 52 46 Z M70 44 C96 8 118 28 88 46 Z" },
    { mode: "cut", d: "M70 44 L52 46 M70 44 L88 46", width: 2 },
  ],
];

export function coverArt(index: number): CoverOp[] {
  return COVERS[((index % COVER_COUNT) + COVER_COUNT) % COVER_COUNT];
}

/** A fixed scatter of felt-coloured specks painted over the stencil to give it a printed, grainy look. */
export const SPECKS: [number, number, number][] = (() => {
  let state = 12345;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return Array.from({ length: 900 }, () => [next() * COVER_BOX.w, next() * COVER_BOX.h, 0.5 + next() * 1.1] as [number, number, number]);
})();
