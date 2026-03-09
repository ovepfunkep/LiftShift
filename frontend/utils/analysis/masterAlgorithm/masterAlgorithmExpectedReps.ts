import { MAX_EXPECTED_REPS_DISPLAY } from './masterAlgorithmConstants';
import { adjustOneRMForRPE, clamp, median, percentile, predictReps } from './masterAlgorithmMath';
import type { ExpectedRepsRange, SetMetrics } from './masterAlgorithmTypes';
import { COMMENTARY_CONFIG } from '../config/commentaryConfig';
import type { RepProfile, TrainingParams } from '../userProfile';

export interface UserProfileContext {
  repProfile: RepProfile | null;
  trainingParams: TrainingParams;
  isCompound: boolean;
}

export const buildExpectedRepsRange = (
  priorSets: SetMetrics[],
  targetWeight: number,
  targetSetNumber: number,
  userProfile?: UserProfileContext
): ExpectedRepsRange => {
  const candidates = priorSets
    .map(s => adjustOneRMForRPE(s.oneRM, s.rpe))
    .filter(v => v > 0);

  if (candidates.length === 0 || targetWeight <= 0) {
    return { min: 1, max: 1, center: 1, label: '~1' };
  }

  const recent = candidates.slice(-4);
  const estimateOneRM = percentile(recent, 0.75) || median(recent) || median(candidates);
  const basePredicted = predictReps(estimateOneRM, targetWeight);

  let fatigueRate = 0.4;
  if (userProfile) {
    fatigueRate = userProfile.isCompound
      ? COMMENTARY_CONFIG.exerciseType.compoundFatigueRate
      : COMMENTARY_CONFIG.exerciseType.isolationFatigueRate;
  }
  
  const fatiguePenalty = clamp(
    fatigueRate * Math.max(0, targetSetNumber - 1) + 
    (userProfile?.trainingParams.fatigueBufferExtra ?? 0),
    0,
    3
  );
  const rawCenter = Math.max(1, basePredicted - fatiguePenalty);
  let center = Math.min(rawCenter, MAX_EXPECTED_REPS_DISPLAY);

  if (userProfile?.repProfile) {
    const userReps = userProfile.repProfile.positions.get(targetSetNumber);
    if (userReps) {
      const blendWeight = COMMENTARY_CONFIG.repProfile.weightBlending;
      center = center * (1 - blendWeight) + userReps.medianReps * blendWeight;
      center = Math.max(1, center);
    }
  }

  const q25 = percentile(recent, 0.25);
  const q75 = percentile(recent, 0.75);
  const med = median(recent);
  const spreadPct = med > 0 ? (q75 - q25) / med : 0;
  const halfWidth = clamp(1 + Math.round(spreadPct * 3), 1, 3);

  let min = Math.max(1, Math.floor(center - halfWidth));
  let max = Math.max(min, Math.ceil(center + halfWidth));
  min = Math.min(min, MAX_EXPECTED_REPS_DISPLAY);
  max = Math.min(max, MAX_EXPECTED_REPS_DISPLAY);
  if (max < min) max = min;

  const roundedCenter = Math.round(center);
  const label = `~${roundedCenter}`;
  return { min: roundedCenter, max: roundedCenter, center: roundedCenter, label };
};
