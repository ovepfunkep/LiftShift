import type { WeightUnit } from '../../utils/storage/localStorage';
import type { WorkoutSet } from '../../types';
import { convertWeight } from '../../utils/format/units';
import { isWarmupSet } from '../../utils/analysis/classification';
import {
  createEmptyDraftSet,
  createEmptyDraftExercise,
  type DraftExercise,
  type DraftSession,
  type DraftSet,
} from './draftTypes';

const newLocalId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `ls-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function workoutSetToDraftSet(set: WorkoutSet, weightUnit: WeightUnit): DraftSet {
  const weightInput = convertWeight(set.weight_kg, weightUnit);
  return {
    localId: newLocalId(),
    weightInput: Number.isFinite(weightInput) ? weightInput : 0,
    reps: Math.max(0, Math.floor(set.reps ?? 0)),
    rpe: set.rpe != null && Number.isFinite(set.rpe) ? set.rpe : null,
    setType: isWarmupSet(set) ? 'warmup' : 'working',
    notes: set.exercise_notes?.trim() ?? '',
  };
}

/**
 * Rebuild a DraftSession from saved sets (one session). Order follows exercise_index / set_index.
 */
export function setsToDraftSession(sets: WorkoutSet[], weightUnit: WeightUnit): DraftSession {
  if (sets.length === 0) {
    return {
      startedAt: new Date(),
      title: '',
      exercises: [],
    };
  }

  const first = sets[0];
  const startedAt = first.parsedDate ? new Date(first.parsedDate) : new Date();
  const title = (first.title ?? '').trim() || 'Workout';

  const byExercise = new Map<string, WorkoutSet[]>();
  const order: string[] = [];

  const sorted = [...sets].sort((a, b) => {
    const ex = (a.exercise_index ?? 0) - (b.exercise_index ?? 0);
    if (ex !== 0) return ex;
    return (a.set_index ?? 0) - (b.set_index ?? 0);
  });

  for (const s of sorted) {
    const name = (s.exercise_title ?? '').trim();
    if (!name) continue;
    if (!byExercise.has(name)) {
      byExercise.set(name, []);
      order.push(name);
    }
    byExercise.get(name)!.push(s);
  }

  const exercises: DraftExercise[] = order.map((exName) => {
    const exSets = byExercise.get(exName) ?? [];
    const draftSets =
      exSets.length > 0 ? exSets.map((st) => workoutSetToDraftSet(st, weightUnit)) : [createEmptyDraftSet()];
    return {
      localId: newLocalId(),
      name: exName,
      sets: draftSets,
    };
  });

  if (exercises.length === 0) {
    return {
      startedAt,
      title,
      exercises: [createEmptyDraftExercise()],
    };
  }

  return {
    startedAt,
    title,
    exercises,
  };
}
