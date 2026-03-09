import { WorkoutSet, SetWisdom } from '../../../types';
import { isWarmupSet } from '../classification';
import { MIN_HYPERTROPHY_REPS } from './masterAlgorithmConstants';
import type { WeightUnit } from '../../storage/localStorage';
import type { ExerciseProgressionProfile } from '../userProfile';
import { convertWeight } from '../../format/units';
import { getSuggestedWeightForTarget } from '../userProfile';

const fmt = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
};

const roundReps = (value: number): number => Math.max(3, Math.round(value));

export interface AnalyzeProgressionOptions {
  typicalWeightJump?: number;
  weightUnit?: WeightUnit;
  isCompound?: boolean;
  progressionProfile?: ExerciseProgressionProfile | null;
}

export const analyzeProgression = (
  allSetsForExercise: WorkoutSet[],
  _targetReps = 10,
  options?: AnalyzeProgressionOptions
): SetWisdom | null => {
  const workingSets = allSetsForExercise.filter(s => !isWarmupSet(s) && s.reps > 0 && s.weight_kg > 0);
  if (workingSets.length < 2) return null;

  const weightUnit = options?.weightUnit ?? 'kg';
  const profile = options?.progressionProfile;
  if (!profile || profile.availableWeights.length === 0) return null;

  const sets = workingSets.map((s) => ({ reps: s.reps, weight: convertWeight(s.weight_kg, weightUnit) }));
  const reps = sets.map((s) => s.reps);
  const weights = sets.map((s) => s.weight);
  const maxWeight = Math.max(...weights);
  const topWeightSets = sets.filter((s) => s.weight >= maxWeight * 0.95);
  if (topWeightSets.length === 0) return null;

  const topWeightReps = topWeightSets.map((s) => s.reps);
  const minReps = Math.min(...reps);
  const maxReps = Math.max(...reps);
  const spread = maxReps - minReps;
  const avgReps = Math.round(reps.reduce((a, b) => a + b, 0) / reps.length);

  const targetReps = roundReps(profile.repTarget);
  const ceilingReps = roundReps(profile.repCeiling);
  const topWeightDisplay = `${fmt(maxWeight)}${weightUnit}`;

  const suggestedDownWeight = getSuggestedWeightForTarget(profile, maxWeight, 'down');
  const suggestedUpWeight = getSuggestedWeightForTarget(profile, maxWeight, 'up');
  const downDisplay = `${fmt(suggestedDownWeight)}${weightUnit}`;
  const upDisplay = `${fmt(suggestedUpWeight)}${weightUnit}`;

  // Strong promote only when top load is repeated and both sets are at/above ceiling
  const topRepeated = topWeightReps.length >= 2;
  const topAllAtCeiling = topWeightReps.every((r) => r >= ceilingReps);
  if (topRepeated && topAllAtCeiling) {
    return {
      type: 'promote',
      message: 'Ceiling hit - ready to progress',
      tooltip: `Next: Pick ~${upDisplay}, target ${targetReps} reps across all sets`,
    };
  }

  // Too heavy if output collapses below hypertrophy floor
  if (minReps < MIN_HYPERTROPHY_REPS) {
    const rebuildTarget = Math.max(MIN_HYPERTROPHY_REPS, targetReps);
    return {
      type: 'demote',
      message: 'Load is limiting you',
      tooltip: `Next: Pick ~${downDisplay}, target ${rebuildTarget} reps across all sets`,
    };
  }

  // Inconsistency branch: keep/choose weight based on average-target fit
  if (spread >= 2) {
    // If current top weight is above target output, settle one step down
    const preferredWeight = avgReps < targetReps ? downDisplay : topWeightDisplay;
    return {
      type: 'demote',
      message: 'Load control is inconsistent',
      tooltip: `Next: Pick ~${preferredWeight}, target ${targetReps} reps across all sets`,
    };
  }

  return null;
};
