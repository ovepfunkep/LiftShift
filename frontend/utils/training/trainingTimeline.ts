import type { TrainingLevel } from '../muscle/hypertrophy/muscleParams';

// ---------------------------------------------------------------------------
// Training Timeline – Unified sets + months progression system
// ---------------------------------------------------------------------------

/** A single checkpoint/milestone on the training timeline */
export interface TimelineCheckpointDef {
  /** Unique key for this checkpoint */
  readonly key: string;
  /** Display label */
  readonly label: string;
  /** Short motivational description */
  readonly description: string;
  /** Which core phase this belongs to */
  readonly phase: TrainingLevel;
  /** Position within its phase: 0 = start, 1 = middle, 2 = end */
  readonly positionInPhase: 0 | 1 | 2;
  /** Position on 0-100% scale (non-linear: early tiers condensed, later tiers sparse) */
  readonly positionPercent: number;
  /** Tailwind text color class */
  readonly color: string;
  /** Hex color for visual elements */
  readonly hexColor: string;
}

/** Progress snapshot returned by the timeline calculator */
export interface TimelineProgress {
  /** Unified score (0-100) combining sets and months */
  readonly unifiedScore: number;
  /** Current checkpoint the user is at or has passed */
  readonly currentCheckpoint: TimelineCheckpointDef;
  /** Next checkpoint to reach, or null if at max (Legend) */
  readonly nextCheckpoint: TimelineCheckpointDef | null;
  /** Progress within current → next checkpoint (0-100) */
  readonly progressToNext: number;
  /** Remaining % points to reach next checkpoint */
  readonly remainingToNext: number;
  /** Index of current checkpoint in CHECKPOINTS array */
  readonly currentIndex: number;
  /** The resolved core training level for volume thresholds */
  readonly trainingLevel: TrainingLevel;
  /** User's total lifetime sets */
  readonly totalSets: number;
  /** User's months of training (first to latest workout) */
  readonly monthsTraining: number;
  /** User's weeks of training (first to latest workout) */
  readonly weeksTraining: number;
  /** Sets per week (calculated from recent activity for pace) */
  readonly setsPerWeek: number | null;
  /** Weekly progress rate (% points per week) */
  readonly weeklyProgressRate: number;
  /** Whether user has reached Legend */
  readonly isLegend: boolean;
  /** Estimate months ago when each checkpoint was reached (null if not yet reached) */
  readonly checkpointAchievedAtMonths: ReadonlyMap<string, number | null>;
}

// ---------------------------------------------------------------------------
// Constants – checkpoint definitions (9 checkpoints, 3 per phase)
// ---------------------------------------------------------------------------

export const CHECKPOINTS: readonly TimelineCheckpointDef[] = [
  // ── Beginner phase ────────────────────────────────────────────────────────
  {
    key: 'seedling',
    label: 'Seedling',
    description: 'Just getting started. Focus on learning movements and building the habit.',
    phase: 'beginner',
    positionInPhase: 0,
    positionPercent: 0,
    color: 'text-slate-400',
    hexColor: '#94a3b8',
  },
  {
    key: 'sprout',
    label: 'Sprout',
    description: 'You have a workout routine. Keep showing up consistently.',
    phase: 'beginner',
    positionInPhase: 1,
    positionPercent: 2,
    color: 'text-slate-500',
    hexColor: '#64748b',
  },
  {
    key: 'sapling',
    label: 'Sapling',
    description: 'You train regularly. Now focus on progressive overload.',
    phase: 'beginner',
    positionInPhase: 2,
    positionPercent: 4,
    color: 'text-blue-400',
    hexColor: '#60a5fa',
  },

  // ── Intermediate phase ──────────────────────────────────────────────────
  {
    key: 'foundation',
    label: 'Foundation',
    description: 'You have solid fundamentals. Time to build muscle mass.',
    phase: 'intermediate',
    positionInPhase: 0,
    positionPercent: 7,
    color: 'text-blue-400',
    hexColor: '#60a5fa',
  },
  {
    key: 'builder',
    label: 'Builder',
    description: 'Noticeable muscle growth. Push for progressive overload.',
    phase: 'intermediate',
    positionInPhase: 1,
    positionPercent: 14,
    color: 'text-emerald-400',
    hexColor: '#34d399',
  },
  {
    key: 'sculptor',
    label: 'Sculptor',
    description: 'Significant muscle development. Refine your physique.',
    phase: 'intermediate',
    positionInPhase: 2,
    positionPercent: 25,
    color: 'text-lime-400',
    hexColor: '#a3e635',
  },

  // ── Advanced phase ────────────────────────────────────────────────────────
  {
    key: 'elite',
    label: 'Elite',
    description: 'Impressive dedication. Fine-tune your training and nutrition.',
    phase: 'advanced',
    positionInPhase: 0,
    positionPercent: 35,
    color: 'text-amber-400',
    hexColor: '#fbbf24',
  },
  {
    key: 'master',
    label: 'Master',
    description: 'Elite-level dedication. Maintain and refine your masterpiece.',
    phase: 'advanced',
    positionInPhase: 1,
    positionPercent: 55,
    color: 'text-orange-400',
    hexColor: '#fb923c',
  },
  {
    key: 'legend',
    label: 'Legend',
    description: 'The pinnacle of fitness dedication. You have earned your legacy.',
    phase: 'advanced',
    positionInPhase: 2,
    positionPercent: 100,
    color: 'text-red-400',
    hexColor: '#f87171',
  },
];

/** Helper: get checkpoints belonging to a given phase */
export function getPhaseCheckpoints(phase: TrainingLevel): TimelineCheckpointDef[] {
  return CHECKPOINTS.filter(c => c.phase === phase);
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Calculate unified score (0-100) combining sets and months.
 * Formula: (sets/50000 * 0.6 + months/96 * 0.4) * 100
 */
export function calculateUnifiedScore(totalSets: number, monthsTraining: number): number {
  const setsProgress = Math.min(totalSets / 50000, 1);
  const monthsProgress = Math.min(monthsTraining / 96, 1);
  
  const score = (setsProgress * 0.6 + monthsProgress * 0.4) * 100;
  return Math.round(score * 10) / 10;
}

/**
 * Find the current checkpoint based on unified score.
 * Returns the highest checkpoint whose positionPercent <= user's score.
 */
export function findCurrentCheckpointIndexByScore(unifiedScore: number): number {
  let idx = 0;
  for (let i = CHECKPOINTS.length - 1; i >= 0; i--) {
    if (unifiedScore >= CHECKPOINTS[i].positionPercent) {
      idx = i;
      break;
    }
  }
  return idx;
}

/**
 * Compute full timeline progress snapshot.
 *
 * @param totalSets     Total lifetime sets
 * @param monthsTraining Months of training
 * @param setsPerWeek   Average sets per week (for ETA calculation)
 */
export function computeTimelineProgress(
  totalSets: number,
  monthsTraining: number,
  setsPerWeek?: number | null,
): TimelineProgress {
  // Calculate weeks of training
  const weeksTraining = Math.max(1, Math.round(monthsTraining * 4.33));
  
  // Calculate unified score first
  const unifiedScore = calculateUnifiedScore(totalSets, monthsTraining);
  const currentIndex = findCurrentCheckpointIndexByScore(unifiedScore);
  const currentCheckpoint = CHECKPOINTS[currentIndex];
  const isLegend = currentIndex === CHECKPOINTS.length - 1;

  const nextCheckpoint = !isLegend && currentIndex < CHECKPOINTS.length - 1
    ? CHECKPOINTS[currentIndex + 1]
    : null;

  // Calculate progress to next based on unified score and checkpoint positions
  let progressToNext = 100;
  let remainingToNext = 0;
  if (nextCheckpoint) {
    const fromPercent = currentCheckpoint.positionPercent;
    const toPercent = nextCheckpoint.positionPercent;
    const range = toPercent - fromPercent;
    if (range > 0) {
      progressToNext = Math.min(100, Math.round(((unifiedScore - fromPercent) / range) * 100));
      remainingToNext = toPercent - unifiedScore;
    }
  }

  // Calculate weekly progress rate based on recent pace (last 4 weeks)
  // Uses sets per week converted to % points per week
  let weeklyProgressRate = 0;
  if (setsPerWeek && setsPerWeek > 0) {
    const setsProgressPerWeek = setsPerWeek / 50000;
    weeklyProgressRate = setsProgressPerWeek * 0.6 * 100;
  }

  // Estimate when each checkpoint was achieved (simple linear interpolation)
  const checkpointAchievedAtMonths = new Map<string, number | null>();
  if (unifiedScore > 0 && monthsTraining > 0) {
    for (const cp of CHECKPOINTS) {
      if (cp.positionPercent <= unifiedScore && cp.positionPercent > 0) {
        const achievedAt = (cp.positionPercent / unifiedScore) * monthsTraining;
        checkpointAchievedAtMonths.set(cp.key, Math.round(achievedAt * 10) / 10);
      } else if (cp.positionPercent === 0) {
        checkpointAchievedAtMonths.set(cp.key, 0);
      } else {
        checkpointAchievedAtMonths.set(cp.key, null);
      }
    }
  }

  return {
    unifiedScore,
    currentCheckpoint,
    nextCheckpoint,
    progressToNext,
    remainingToNext,
    currentIndex,
    trainingLevel: currentCheckpoint.phase,
    totalSets,
    monthsTraining,
    weeksTraining,
    setsPerWeek: setsPerWeek ?? null,
    weeklyProgressRate,
    isLegend,
    checkpointAchievedAtMonths,
  };
}

// ---------------------------------------------------------------------------
// ETA formatting helpers
// ---------------------------------------------------------------------------

/** Format a week count into a human-readable label */
export function formatEta(weeks: number | null): string {
  if (weeks === null || weeks <= 0) return 'Reached';
  if (weeks <= 1) return '~1 week';
  if (weeks < 6) return `~${weeks} weeks`;
  const months = Math.round(weeks / 4.33);
  if (months <= 1) return '~1 month';
  if (months < 12) return `~${months} months`;
  const years = Math.round((months / 12) * 10) / 10;
  if (years <= 1) return '~1 year';
  return `~${years} years`;
}

/** Format months count for display */
export function formatMonths(n: number): string {
  if (n < 12) return `${n} month${n !== 1 ? 's' : ''}`;
  const years = n / 12;
  return `${years.toFixed(1)} year${years !== 1 ? 's' : ''}`;
}
