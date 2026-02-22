import { useEffect, useRef, useMemo, RefObject, useState } from 'react';
import svgpath from 'svgpath';
import { BODYMAP_WARP_CONFIG, BODYMAP_STROKE, BodyWarpParams, ResolvedBodyWarpParams, BodyRegionWarp, BodyMapStrokeConfig } from '../config/bodyMapWarp';

const MID_X = 330.26;
const MID_Y = 600;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

const torsoMask = (x: number): number => {
  const dx = Math.abs(x - MID_X);
  return clamp01(1 - (dx - 120) / 80);
};

const gaussian = (y: number, mu: number, sigma: number): number => {
  const z = (y - mu) / sigma;
  return Math.exp(-0.5 * z * z);
};

const clampAmount = (n: number): number => Math.max(-0.15, Math.min(0.15, n));

const xScaleAt = (y: number, params: ResolvedBodyWarpParams): number => {
  const regions: BodyRegionWarp[] = [
    params.shoulders,
    params.chest,
    params.upperAbs,
    params.waist,
    params.lowerAbs,
    params.thighs,
    params.calves,
  ];

  let total = 0;
  for (const region of regions) {
    total += region.amount * gaussian(y, region.yPosition, region.sigma);
  }

  const topFade = clamp01((y - 120) / 120);
  const bottomFade = clamp01((1120 - y) / 160);
  const verticalMask = Math.min(1, topFade, bottomFade);

  const amount = clampAmount(total) * verticalMask;
  return 1 - amount;
};

const warpPoint = (x: number, y: number, params: ResolvedBodyWarpParams): [number, number] => {
  const mask = torsoMask(x);
  const s = mask > 0 ? 1 - (1 - xScaleAt(y, params)) * mask : 1;
  const wx = MID_X + (x - MID_X) * s;
  
  const heightScale = params.heightScale;
  const wy = MID_Y + (y - MID_Y) * heightScale;
  
  return [wx, wy];
};

const warpPathD = (d: string, params: ResolvedBodyWarpParams): string => {
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
          const ny = Number(seg[1]);
          if (Number.isFinite(ny)) {
            const [, wy] = warpPoint(x, ny, params);
            seg[1] = wy;
          }
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

const mergeRegion = (base: BodyRegionWarp, override?: Partial<BodyRegionWarp>): BodyRegionWarp => ({
  amount: override?.amount ?? base.amount,
  yPosition: override?.yPosition ?? base.yPosition,
  sigma: override?.sigma ?? base.sigma,
});

export interface UseBodyMapWarpOptions {
  gender?: 'male' | 'female';
  overrides?: BodyWarpParams;
  stroke?: Partial<BodyMapStrokeConfig>;
}

export interface UseBodyMapWarpResult {
  ref: RefObject<SVGSVGElement>;
  heightScale: number;
  ready: boolean;
}

export const useBodyMapWarp = (options?: UseBodyMapWarpOptions): UseBodyMapWarpResult => {
  const ref = useRef<SVGSVGElement>(null);
  const originalPathsRef = useRef<Map<string, string>>(new Map());
  const originalLinesRef = useRef<Map<string, { x1: number; y1: number; x2: number; y2: number }>>(new Map());
  const [ready, setReady] = useState(false);

  const gender = options?.gender ?? 'male';
  const overrides = options?.overrides;
  const strokeOverride = options?.stroke;

  const stroke: BodyMapStrokeConfig = useMemo(() => ({
    color: strokeOverride?.color ?? BODYMAP_STROKE.color,
    width: strokeOverride?.width ?? BODYMAP_STROKE.width,
    linecap: strokeOverride?.linecap ?? BODYMAP_STROKE.linecap,
    linejoin: strokeOverride?.linejoin ?? BODYMAP_STROKE.linejoin,
  }), [strokeOverride?.color, strokeOverride?.width, strokeOverride?.linecap, strokeOverride?.linejoin]);

  const resolvedParams: ResolvedBodyWarpParams = useMemo(() => {
    const base = BODYMAP_WARP_CONFIG[gender];
    return {
      heightScale: overrides?.heightScale ?? base.heightScale,
      shoulders: mergeRegion(base.shoulders, overrides?.shoulders),
      chest: mergeRegion(base.chest, overrides?.chest),
      upperAbs: mergeRegion(base.upperAbs, overrides?.upperAbs),
      waist: mergeRegion(base.waist, overrides?.waist),
      lowerAbs: mergeRegion(base.lowerAbs, overrides?.lowerAbs),
      thighs: mergeRegion(base.thighs, overrides?.thighs),
      calves: mergeRegion(base.calves, overrides?.calves),
    };
  }, [
    gender,
    overrides?.heightScale,
    overrides?.shoulders?.amount,
    overrides?.shoulders?.yPosition,
    overrides?.shoulders?.sigma,
    overrides?.chest?.amount,
    overrides?.chest?.yPosition,
    overrides?.chest?.sigma,
    overrides?.upperAbs?.amount,
    overrides?.upperAbs?.yPosition,
    overrides?.upperAbs?.sigma,
    overrides?.waist?.amount,
    overrides?.waist?.yPosition,
    overrides?.waist?.sigma,
    overrides?.lowerAbs?.amount,
    overrides?.lowerAbs?.yPosition,
    overrides?.lowerAbs?.sigma,
    overrides?.thighs?.amount,
    overrides?.thighs?.yPosition,
    overrides?.thighs?.sigma,
    overrides?.calves?.amount,
    overrides?.calves?.yPosition,
    overrides?.calves?.sigma,
  ]);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;

    const paths = svg.querySelectorAll('path[d]');
    const lines = svg.querySelectorAll('line[x1][y1][x2][y2]');

    paths.forEach((path, idx) => {
      const key = `path-${idx}`;
      const d = path.getAttribute('d');
      if (!d) return;

      if (!originalPathsRef.current.has(key)) {
        originalPathsRef.current.set(key, d);
      }

      const originalD = originalPathsRef.current.get(key)!;
      const warpedD = warpPathD(originalD, resolvedParams);
      path.setAttribute('d', warpedD);
    });

    lines.forEach((line, idx) => {
      const key = `line-${idx}`;
      const x1 = parseFloat(line.getAttribute('x1') || '');
      const y1 = parseFloat(line.getAttribute('y1') || '');
      const x2 = parseFloat(line.getAttribute('x2') || '');
      const y2 = parseFloat(line.getAttribute('y2') || '');

      if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) return;

      if (!originalLinesRef.current.has(key)) {
        originalLinesRef.current.set(key, { x1, y1, x2, y2 });
      }

      const original = originalLinesRef.current.get(key)!;
      const [wx1, wy1] = warpPoint(original.x1, original.y1, resolvedParams);
      const [wx2, wy2] = warpPoint(original.x2, original.y2, resolvedParams);

      line.setAttribute('x1', String(round2(wx1)));
      line.setAttribute('y1', String(round2(wy1)));
      line.setAttribute('x2', String(round2(wx2)));
      line.setAttribute('y2', String(round2(wy2)));
    });

    svg.querySelectorAll('path, line').forEach((el) => {
      el.setAttribute('stroke', stroke.color);
      el.setAttribute('stroke-width', String(stroke.width));
      el.setAttribute('stroke-linecap', stroke.linecap);
      el.setAttribute('stroke-linejoin', stroke.linejoin);
    });

    setReady(true);
  }, [resolvedParams, stroke]);

  return { ref, heightScale: resolvedParams.heightScale, ready };
};

export type { BodyWarpParams, ResolvedBodyWarpParams, BodyRegionWarp };
