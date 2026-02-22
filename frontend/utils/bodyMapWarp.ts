import svgpath from 'svgpath';

const MID_X = 330.26;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

const torsoMask = (x: number): number => {
  const dx = Math.abs(x - MID_X);
  return clamp01(1 - (dx - 120) / 80);
};

const gaussian = (y: number, mu: number, sigma: number): number => {
  const z = (y - mu) / sigma;
  return Math.exp(-0.5 * z * z);
};

interface WarpParams {
  waist?: number;
  chest?: number;
  thighs?: number;
}

const xScaleAt = (y: number, params: WarpParams): number => {
  const { waist = 0.05, chest = 0.03, thighs = 0.04 } = params;

  const waistAmount = waist * gaussian(y, 520, 140);
  const chestAmount = chest * gaussian(y, 320, 180);
  const thighsAmount = thighs * gaussian(y, 820, 220);

  const topFade = clamp01((y - 120) / 120);
  const bottomFade = clamp01((1120 - y) / 160);
  const verticalMask = Math.min(1, topFade, bottomFade);

  const amount = Math.min(0.12, waistAmount + chestAmount + thighsAmount) * verticalMask;
  return 1 - amount;
};

const warpPoint = (x: number, y: number, params: WarpParams): [number, number] => {
  const mask = torsoMask(x);
  if (mask <= 0) return [x, y];
  const s = 1 - (1 - xScaleAt(y, params)) * mask;
  return [MID_X + (x - MID_X) * s, y];
};

export const warpPathD = (d: string, params: WarpParams = {}): string => {
  try {
    return svgpath(d)
      .abs()
      .iterate((seg, _idx, x, y) => {
        const cmd = seg[0];

        const warpXY = (i: number) => {
          const nx = Number(seg[i]);
          const ny = Number(seg[i + 1]);
          if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;
          const [wx, wy] = warpPoint(nx, ny, params);
          seg[i] = wx;
          seg[i + 1] = wy;
        };

        if (cmd === 'M' || cmd === 'L' || cmd === 'T') {
          warpXY(1);
        } else if (cmd === 'H') {
          const nx = Number(seg[1]);
          if (Number.isFinite(nx)) {
            const [wx] = warpPoint(nx, y, params);
            seg[1] = wx;
          }
        } else if (cmd === 'V') {
        } else if (cmd === 'C') {
          warpXY(1);
          warpXY(3);
          warpXY(5);
        } else if (cmd === 'S' || cmd === 'Q') {
          warpXY(1);
          warpXY(3);
        } else if (cmd === 'A') {
          warpXY(6);
        }
      })
      .round(2)
      .toString();
  } catch {
    return d;
  }
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

export const warpLineAttrs = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  params: WarpParams = {}
): { x1: number; y1: number; x2: number; y2: number } => {
  const [wx1, wy1] = warpPoint(x1, y1, params);
  const [wx2, wy2] = warpPoint(x2, y2, params);
  return { x1: round2(wx1), y1: round2(wy1), x2: round2(wx2), y2: round2(wy2) };
};

export type { WarpParams };
