import type { HeadlessMuscleId } from '../mapping/muscleHeadless';
import { HEADLESS_MUSCLE_IDS } from '../mapping/muscleHeadless';

// ---------------------------------------------------------------------------
// Muscle size classification
// ---------------------------------------------------------------------------
export type MuscleSizeCategory = 'large' | 'medium' | 'small';

// ---------------------------------------------------------------------------
// Per-muscle hypertrophy parameters
//
// Weekly stimulus parameters (logistic dose-response):
//   steepness  – how sharply the curve rises around the inflection
//   inflection – sets/wk at which the muscle is at 50% of its weekly stimulus curve
//
// Lifetime achievement parameters (hyperbolic saturation):
//   halfLife   – total lifetime sets at which 50% of natural potential is reached
//   ceiling    – the soft asymptote (never truly reached); represents the
//                theoretical max % of genetic potential achievable through
//                volume alone. Kept < 100 so the number always feels honest.
//
// Design rationale
// ----------------
// Large muscles tolerate and require more volume to fully stimulate both on a
// weekly and career basis. Small muscles saturate faster. The numbers are
// calibrated so that:
//   - A beginner (< 1 yr) sees ~15-30% lifetime achievement  -> motivating
//   - An intermediate (2-4 yrs) sees ~35-55%                  -> realistic
//   - Advanced (5-8 yrs) sees ~55-70%                         -> rewarding
//   - Elite (10+ yrs) sees ~70-82%                            -> aspirational
//   - No one ever hits 90%+ unless truly extreme volume       -> honest
// ---------------------------------------------------------------------------

export interface MuscleHypertrophyParams {
  /** Human-readable display name */
  readonly name: string;
  /** Size bucket */
  readonly size: MuscleSizeCategory;

  // --- Weekly stimulus (logistic) ---
  /** Steepness of logistic curve */
  readonly weeklySteepness: number;
  /** Inflection point in sets/wk */
  readonly weeklyInflection: number;

  // --- Lifetime achievement (hyperbolic saturation) ---
  /** Lifetime sets at which 50% of ceiling is reached */
  readonly lifetimeHalfLife: number;
  /** Soft asymptote – max achievable % (0-100) */
  readonly lifetimeCeiling: number;
}

/**
 * Central muscle parameter table.
 *
 * Every headless muscle ID that appears on the body-map SVG must be present.
 * Values are tuned for psychological correctness – they should "feel right"
 * to lifters at every stage, not be biologically exact.
 */
export const MUSCLE_PARAMS: Readonly<Record<HeadlessMuscleId, MuscleHypertrophyParams>> = {
  // ── Large muscles ────────────────────────────────────────────────────
  quads: {
    name: 'Quads',
    size: 'large',
    weeklySteepness: 0.25,
    weeklyInflection: 12,
    lifetimeHalfLife: 4500,
    lifetimeCeiling: 88,
  },
  lats: {
    name: 'Lats',
    size: 'large',
    weeklySteepness: 0.25,
    weeklyInflection: 12,
    lifetimeHalfLife: 4200,
    lifetimeCeiling: 88,
  },
  glutes: {
    name: 'Glutes',
    size: 'large',
    weeklySteepness: 0.25,
    weeklyInflection: 11,
    lifetimeHalfLife: 4000,
    lifetimeCeiling: 87,
  },
  hamstrings: {
    name: 'Hamstrings',
    size: 'large',
    weeklySteepness: 0.27,
    weeklyInflection: 11,
    lifetimeHalfLife: 3800,
    lifetimeCeiling: 87,
  },
  chest: {
    name: 'Chest',
    size: 'large',
    weeklySteepness: 0.28,
    weeklyInflection: 10,
    lifetimeHalfLife: 3500,
    lifetimeCeiling: 86,
  },

  // ── Medium muscles ───────────────────────────────────────────────────
  shoulders: {
    name: 'Shoulders',
    size: 'medium',
    weeklySteepness: 0.30,
    weeklyInflection: 10,
    lifetimeHalfLife: 3000,
    lifetimeCeiling: 84,
  },
  traps: {
    name: 'Traps',
    size: 'medium',
    weeklySteepness: 0.30,
    weeklyInflection: 9,
    lifetimeHalfLife: 2800,
    lifetimeCeiling: 83,
  },
  triceps: {
    name: 'Triceps',
    size: 'medium',
    weeklySteepness: 0.32,
    weeklyInflection: 9,
    lifetimeHalfLife: 2600,
    lifetimeCeiling: 83,
  },
  biceps: {
    name: 'Biceps',
    size: 'medium',
    weeklySteepness: 0.32,
    weeklyInflection: 9,
    lifetimeHalfLife: 2400,
    lifetimeCeiling: 82,
  },
  abdominals: {
    name: 'Abs',
    size: 'medium',
    weeklySteepness: 0.30,
    weeklyInflection: 9,
    lifetimeHalfLife: 2500,
    lifetimeCeiling: 82,
  },
  lowerback: {
    name: 'Lower Back',
    size: 'medium',
    weeklySteepness: 0.30,
    weeklyInflection: 8,
    lifetimeHalfLife: 2600,
    lifetimeCeiling: 83,
  },
  adductors: {
    name: 'Adductors',
    size: 'medium',
    weeklySteepness: 0.30,
    weeklyInflection: 8,
    lifetimeHalfLife: 2400,
    lifetimeCeiling: 82,
  },

  // ── Small muscles ────────────────────────────────────────────────────
  calves: {
    name: 'Calves',
    size: 'small',
    weeklySteepness: 0.35,
    weeklyInflection: 8,
    lifetimeHalfLife: 2000,
    lifetimeCeiling: 80,
  },
  forearms: {
    name: 'Forearms',
    size: 'small',
    weeklySteepness: 0.35,
    weeklyInflection: 7,
    lifetimeHalfLife: 1800,
    lifetimeCeiling: 78,
  },
  obliques: {
    name: 'Obliques',
    size: 'small',
    weeklySteepness: 0.35,
    weeklyInflection: 7,
    lifetimeHalfLife: 1800,
    lifetimeCeiling: 78,
  },
};

// Compile-time check: every headless muscle must have params
const _exhaustiveCheck: Record<HeadlessMuscleId, MuscleHypertrophyParams> = MUSCLE_PARAMS;
void _exhaustiveCheck;

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Get params for a headless muscle ID, or undefined if unknown. */
export function getMuscleParams(muscleId: string): MuscleHypertrophyParams | undefined {
  return (MUSCLE_PARAMS as Record<string, MuscleHypertrophyParams>)[muscleId];
}

/** All headless muscle IDs that have defined hypertrophy parameters. */
export const ALL_PARAM_MUSCLE_IDS: readonly HeadlessMuscleId[] = [...HEADLESS_MUSCLE_IDS];
