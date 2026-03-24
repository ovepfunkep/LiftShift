import { format } from 'date-fns';
import type { WorkoutSet } from '../../types';
import type { WeightUnit } from '../../utils/storage/localStorage';
import { userInputWeightToKg } from '../../utils/units/weight';
import { normalizeSetType, OUTPUT_DATE_FORMAT } from '../../utils/csv/csvParserUtils';
import { calculateSetIndices, inferWorkoutTitles } from '../../utils/csv/csvRowTransform';
import type { DraftSession } from './draftTypes';

/** Map UI set type to a value normalizeSetType accepts */
function draftSetTypeToStored(setType: 'warmup' | 'working'): string {
  return normalizeSetType(setType === 'warmup' ? 'warmup' : 'working');
}

/**
 * Builds WorkoutSet[] from a draft session. One session start time; each set gets +1s offset for ordering.
 */
export function buildWorkoutSetsFromDraft(session: DraftSession, weightUnit: WeightUnit): WorkoutSet[] {
  const title = session.title.trim() || 'Workout';
  const sessionStart = session.startedAt;
  /** One timestamp per session so getSessionKey matches all sets in this workout */
  const startTime = format(sessionStart, OUTPUT_DATE_FORMAT);

  const out: WorkoutSet[] = [];

  for (const ex of session.exercises) {
    const exerciseName = ex.name.trim();
    if (!exerciseName) continue;

    for (const set of ex.sets) {
      const weight_kg = userInputWeightToKg(set.weightInput, weightUnit);
      const reps = Math.max(0, Math.floor(set.reps));
      if (reps <= 0 && weight_kg <= 0) continue;

      out.push({
        title,
        start_time: startTime,
        end_time: startTime,
        description: session.description?.trim() ?? '',
        exercise_title: exerciseName,
        superset_id: '',
        exercise_notes: set.notes.trim(),
        set_index: 0,
        set_type: draftSetTypeToStored(set.setType),
        weight_kg,
        reps,
        distance_km: 0,
        duration_seconds: 0,
        rpe: set.rpe != null && Number.isFinite(set.rpe) ? set.rpe : null,
        parsedDate: new Date(sessionStart),
      });
    }
  }

  calculateSetIndices(out);
  inferWorkoutTitles(out);

  return out;
}
