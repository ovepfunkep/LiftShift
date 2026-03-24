import type { WorkoutSet } from '../../types';
import { parseFlexibleDate } from '../../utils/csv/csvValueParsers';

const setTime = (s: WorkoutSet): number => {
  const d = s.parsedDate ?? parseFlexibleDate(s.start_time);
  return d ? d.getTime() : 0;
};

/** Latest sets for an exercise name from existing data (for “last time” hints). */
export const getLastSetsForExercise = (
  parsedData: WorkoutSet[],
  exerciseName: string,
  limit: number
): WorkoutSet[] => {
  const trimmed = exerciseName.trim();
  if (!trimmed || limit <= 0) return [];

  const matches = parsedData.filter((s) => s.exercise_title.trim() === trimmed);
  matches.sort((a, b) => setTime(a) - setTime(b));

  return matches.slice(-limit);
};
