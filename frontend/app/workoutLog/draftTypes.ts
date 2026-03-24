import { format } from 'date-fns';

/** Local id for React keys and draft identity before save */
export type DraftSet = {
  localId: string;
  /** Weight as entered in the user's preferred unit (kg or lbs) */
  weightInput: number;
  reps: number;
  rpe: number | null;
  setType: 'warmup' | 'working';
  notes: string;
};

export type DraftExercise = {
  localId: string;
  name: string;
  sets: DraftSet[];
};

export type DraftSession = {
  startedAt: Date;
  title: string;
  /** Optional session-wide notes (stored on first set's description if needed later) */
  description?: string;
  exercises: DraftExercise[];
};

const newLocalId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `ls-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const createEmptyDraftSet = (): DraftSet => ({
  localId: newLocalId(),
  weightInput: 0,
  reps: 0,
  rpe: null,
  setType: 'working',
  notes: '',
});

export const createEmptyDraftExercise = (): DraftExercise => ({
  localId: newLocalId(),
  name: '',
  sets: [createEmptyDraftSet()],
});

export const createInitialDraftSession = (): DraftSession => ({
  startedAt: new Date(),
  title: format(new Date(), 'dd MMM yyyy, HH:mm'),
  exercises: [],
});
