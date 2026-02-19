import { useMemo } from 'react';
import {
  computeAllMuscleAchievements,
  computeOverallAchievement,
  getTier,
} from '../../../utils/muscle/hypertrophy';
import type { MuscleAchievementEntry, AchievementTier } from '../../../utils/muscle/hypertrophy';
import type { HeadlessMuscleId } from '../../../utils/muscle/mapping/muscleHeadless';

export interface LifetimeAchievementData {
  /** Overall weighted achievement % across all muscles */
  overallPercent: number;
  /** Overall tier */
  overallTier: AchievementTier;
  /** Per-muscle breakdown (sorted highest achievement first) */
  muscles: MuscleAchievementEntry[];
  /** Context-specific achievement (for selected muscle, or overall if nothing selected) */
  contextPercent: number;
  /** Context-specific tier */
  contextTier: AchievementTier;
  /** Context label (e.g., "Chest", or "Overall") */
  contextLabel: string;
  /** Total lifetime sets across all muscles */
  totalLifetimeSets: number;
}

interface UseLifetimeAchievementParams {
  lifetimeHeadlessVolumes: ReadonlyMap<string, number>;
  weeklyHeadlessVolumes?: ReadonlyMap<string, number>;
  selectedMuscle: string | null;
}

/**
 * Computes lifetime hypertrophy achievement data for the current selection context.
 *
 * - No selection → overall weighted average
 * - Muscle selected → that specific muscle's achievement
 */
export function useLifetimeAchievement({
  lifetimeHeadlessVolumes,
  weeklyHeadlessVolumes,
  selectedMuscle,
}: UseLifetimeAchievementParams): LifetimeAchievementData {
  return useMemo(() => {
    const muscles = computeAllMuscleAchievements(lifetimeHeadlessVolumes, weeklyHeadlessVolumes);
    const overallPercent = computeOverallAchievement(lifetimeHeadlessVolumes);
    const overallTier = getTier(overallPercent);

    let totalLifetimeSets = 0;
    for (const v of lifetimeHeadlessVolumes.values()) totalLifetimeSets += v;
    totalLifetimeSets = Math.round(totalLifetimeSets * 10) / 10;

    // No selection → show overall
    if (!selectedMuscle) {
      return {
        overallPercent,
        overallTier,
        muscles,
        contextPercent: overallPercent,
        contextTier: overallTier,
        contextLabel: 'Overall',
        totalLifetimeSets,
      };
    }

    // Muscle selected → direct lookup
    const entry = muscles.find((m) => m.muscleId === selectedMuscle);
    if (entry) {
      return {
        overallPercent,
        overallTier,
        muscles,
        contextPercent: entry.achievementPercent,
        contextTier: entry.tier,
        contextLabel: entry.name,
        totalLifetimeSets,
      };
    }

    // Fallback → overall
    return {
      overallPercent,
      overallTier,
      muscles,
      contextPercent: overallPercent,
      contextTier: overallTier,
      contextLabel: 'Overall',
      totalLifetimeSets,
    };
  }, [lifetimeHeadlessVolumes, selectedMuscle, weeklyHeadlessVolumes]);
}
