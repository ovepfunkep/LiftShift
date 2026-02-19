import { useMemo } from 'react';
import { differenceInMonths } from 'date-fns';
import type { WorkoutSet } from '../../types';
import { getTrainingLevel, type TrainingLevel } from '../../utils/muscle/hypertrophy/muscleParams';

interface UseTrainingLevelResult {
  /** User's training level based on data history */
  trainingLevel: TrainingLevel;
  /** Months of training history found in data */
  monthsTraining: number;
  /** Earliest workout date in the dataset */
  earliestDate: Date | null;
}

/**
 * Calculate user's training level from their workout history.
 * This provides personalized volume thresholds based on training experience.
 * 
 * Training levels:
 * - beginner: < 6 months
 * - intermediate: 6-36 months  
 * - advanced: > 36 months
 * 
 * Thresholds by level:
 * - beginner: MV=3, MEV=6, MRV=12, MAXV=15
 * - intermediate: MV=5, MEV=10, MRV=18, MAXV=22
 * - advanced: MV=7, MEV=14, MRV=24, MAXV=30
 */
export const useTrainingLevel = (
  data: WorkoutSet[],
  effectiveNow?: Date
): UseTrainingLevelResult => {
  return useMemo(() => {
    if (!data || data.length === 0) {
      return {
        trainingLevel: 'beginner',
        monthsTraining: 0,
        earliestDate: null,
      };
    }

    // Find earliest workout date
    let earliestDate: Date | null = null;
    for (const set of data) {
      const date = set.parsedDate;
      if (!date) continue;
      if (!earliestDate || date < earliestDate) {
        earliestDate = date;
      }
    }

    if (!earliestDate) {
      return {
        trainingLevel: 'beginner',
        monthsTraining: 0,
        earliestDate: null,
      };
    }

    const referenceNow = effectiveNow ?? new Date();
    const monthsTraining = differenceInMonths(referenceNow, earliestDate);
    const trainingLevel = getTrainingLevel(monthsTraining);

    return {
      trainingLevel,
      monthsTraining,
      earliestDate,
    };
  }, [data, effectiveNow]);
};

export type { TrainingLevel };
