export { MUSCLE_PARAMS, getMuscleParams, ALL_PARAM_MUSCLE_IDS, getVolumeThresholds, DEFAULT_VOLUME_THRESHOLDS } from './muscleParams';
export type { MuscleHypertrophyParams, MuscleSizeCategory, MuscleVolumeThresholds } from './muscleParams';
export {
  weeklyStimulus,
  lifetimeAchievement,
  getTier,
  computeAllMuscleAchievements,
  computeOverallAchievement,
} from './hypertrophyCalculations';
export type { AchievementTier, MuscleAchievementEntry } from './hypertrophyCalculations';
