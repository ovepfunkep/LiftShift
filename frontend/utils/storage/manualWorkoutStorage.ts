import type { WorkoutSet } from '../../types';
import { parseFlexibleDate } from '../csv/csvParserUtils';
import { createCompressedStorageManager } from './createStorageManager';

const KEY = 'liftshift_manual_workout_sets_v1';

const storage = createCompressedStorageManager(KEY);

type SerializedSet = Omit<WorkoutSet, 'parsedDate'>;

/** Persist full workout history for manual source; omit parsedDate (rebuilt from start_time). */
export function saveManualWorkoutSets(sets: WorkoutSet[]): void {
  const serializable: SerializedSet[] = sets.map(({ parsedDate: _p, ...rest }) => rest);
  storage.set(JSON.stringify(serializable));
}

export function getManualWorkoutSets(): WorkoutSet[] | null {
  const raw = storage.get();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SerializedSet[];
    if (!Array.isArray(parsed)) return null;
    return parsed.map((s) => ({
      ...s,
      parsedDate: parseFlexibleDate(s.start_time) ?? undefined,
    }));
  } catch {
    return null;
  }
}

export function clearManualWorkoutSets(): void {
  storage.clear();
}
