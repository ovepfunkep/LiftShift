import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { NotebookPen } from 'lucide-react';
import type { WorkoutSet } from '../../types';
import type { WeightUnit } from '../../utils/storage/localStorage';
import { getExerciseAssets, type ExerciseAsset } from '../../utils/data/exerciseAssets';
import { buildWorkoutSetsFromDraft } from '../../app/workoutLog/buildWorkoutSetsFromDraft';
import {
  createEmptyDraftExercise,
  createEmptyDraftSet,
  createInitialDraftSession,
  type DraftExercise,
  type DraftSession,
  type DraftSet,
} from '../../app/workoutLog/draftTypes';
import { getLastSetsForExercise } from '../../app/workoutLog/lastSetsLookup';
import { useRestTimer } from '../../app/workoutLog/useRestTimer';
import { convertWeight } from '../../utils/format/units';
import { getSetsForSessionKey, listRecentSessions } from '../../app/workoutLog/sessionGrouping';
import { setsToDraftSession } from '../../app/workoutLog/setsToDraftSession';
import { ExerciseNamePicker } from './ExerciseNamePicker';

interface LogWorkoutViewProps {
  parsedData: WorkoutSet[];
  weightUnit: WeightUnit;
  canSaveManual: boolean;
  onSaveWorkout: (newSets: WorkoutSet[], opts?: { replaceSessionKey?: string }) => void;
}

const formatMmSs = (total: number): string => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatLastLine = (sets: WorkoutSet[], unit: WeightUnit, t: TFunction): string | null => {
  if (sets.length === 0) return null;
  const last = sets[sets.length - 1];
  const w = convertWeight(last.weight_kg, unit);
  const wStr = w.toFixed(1).replace(/\.0$/, '');
  const label = unit === 'kg' ? 'kg' : 'lbs';
  const rpePart = last.rpe != null ? t('log.rpeSuffix', { value: last.rpe }) : '';
  return t('log.lastLine', { weight: wStr, unit: label, reps: last.reps, rpe: rpePart });
};

const validateDraft = (draft: DraftSession, t: TFunction): string | null => {
  const named = draft.exercises.filter((e) => e.name.trim().length > 0);
  if (named.length === 0) return t('log.errNamed');

  let hasWorkSet = false;
  for (const ex of named) {
    for (const s of ex.sets) {
      const reps = s.reps > 0;
      const weight = s.weightInput > 0;
      if (reps || weight) hasWorkSet = true;
    }
  }
  if (!hasWorkSet) return t('log.errSets');

  return null;
};

export const LogWorkoutView: React.FC<LogWorkoutViewProps> = ({
  parsedData,
  weightUnit,
  canSaveManual,
  onSaveWorkout,
}) => {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState<DraftSession>(() => createInitialDraftSession());
  const [exerciseAssets, setExerciseAssets] = useState<Map<string, ExerciseAsset>>(() => new Map());
  const [customRest, setCustomRest] = useState('150');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingSessionKey, setEditingSessionKey] = useState<string | null>(null);
  const { secondsLeft, isRunning, startRest, stop } = useRestTimer();

  useEffect(() => {
    let cancelled = false;
    void getExerciseAssets().then((map) => {
      if (cancelled) return;
      setExerciseAssets(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recentRows = useMemo(() => listRecentSessions(parsedData, 12), [parsedData]);

  const updateDraft = (next: DraftSession) => {
    setDraft(next);
    setSaveError(null);
  };

  const addExercise = () => {
    updateDraft({
      ...draft,
      exercises: [...draft.exercises, createEmptyDraftExercise()],
    });
  };

  const removeExercise = (localId: string) => {
    updateDraft({
      ...draft,
      exercises: draft.exercises.filter((e) => e.localId !== localId),
    });
  };

  const patchExercise = (localId: string, fn: (e: DraftExercise) => DraftExercise) => {
    updateDraft({
      ...draft,
      exercises: draft.exercises.map((e) => (e.localId === localId ? fn(e) : e)),
    });
  };

  const patchSet = (exId: string, setId: string, fn: (s: DraftSet) => DraftSet) => {
    patchExercise(exId, (e) => ({
      ...e,
      sets: e.sets.map((s) => (s.localId === setId ? fn(s) : s)),
    }));
  };

  const addSet = (exId: string) => {
    patchExercise(exId, (e) => ({
      ...e,
      sets: [...e.sets, createEmptyDraftSet()],
    }));
  };

  const removeSet = (exId: string, setId: string) => {
    patchExercise(exId, (e) => ({
      ...e,
      sets: e.sets.length <= 1 ? e.sets : e.sets.filter((s) => s.localId !== setId),
    }));
  };

  const beginEditSession = (sessionKey: string) => {
    if (!canSaveManual) return;
    const sets = getSetsForSessionKey(parsedData, sessionKey);
    if (sets.length === 0) return;
    setDraft(setsToDraftSession(sets, weightUnit));
    setEditingSessionKey(sessionKey);
    setSaveError(null);
  };

  const cancelEditSession = () => {
    setEditingSessionKey(null);
    updateDraft(createInitialDraftSession());
  };

  const handleSave = () => {
    setSaveError(null);
    if (!canSaveManual) {
      window.alert(t('log.saveBlocked'));
      return;
    }
    const err = validateDraft(draft, t);
    if (err) {
      setSaveError(err);
      return;
    }
    const sets = buildWorkoutSetsFromDraft(draft, weightUnit);
    if (sets.length === 0) {
      setSaveError(t('log.errNothing'));
      return;
    }
    onSaveWorkout(sets, editingSessionKey ? { replaceSessionKey: editingSessionKey } : undefined);
    setEditingSessionKey(null);
    updateDraft(createInitialDraftSession());
  };

  const lastHint = useMemo(
    () => (name: string) => formatLastLine(getLastSetsForExercise(parsedData, name, 3), weightUnit, t),
    [parsedData, weightUnit, t, i18n.language]
  );

  const weightColLabel = weightUnit === 'kg' ? 'kg' : 'lbs';

  const restTimerBlock = (
    <div className="rounded-lg border border-slate-700/60 bg-black/25 p-4 lg:sticky lg:top-2">
      <div className="text-sm font-medium text-slate-300 mb-2">{t('log.restTimer')}</div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {[60, 90, 120].map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => startRest(sec)}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
          >
            {t('log.seconds', { n: sec })}
          </button>
        ))}
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            value={customRest}
            onChange={(e) => setCustomRest(e.target.value)}
            className="w-16 rounded border border-slate-600/60 bg-black/50 px-2 py-1 text-xs text-white"
            aria-label={t('log.restTimer')}
          />
          <button
            type="button"
            onClick={() => startRest(parseInt(customRest, 10) || 60)}
            className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-white/5"
          >
            {t('log.start')}
          </button>
        </div>
        {isRunning ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
          >
            {t('log.stop')}
          </button>
        ) : null}
      </div>
      <div className="font-mono text-2xl tracking-widest text-slate-100" aria-live="polite">
        {formatMmSs(secondsLeft)}
      </div>
    </div>
  );

  const recentBlock = (
    <div className="rounded-lg border border-slate-700/60 bg-black/20 p-3 lg:sticky lg:top-2">
      <div className="text-sm font-medium text-slate-300 mb-2">{t('log.recentWorkouts')}</div>
      {!canSaveManual ? (
        <p className="text-xs text-slate-500 mb-2">{t('log.editUnavailable')}</p>
      ) : null}
      <ul className="space-y-2 max-h-[min(24rem,50vh)] overflow-y-auto pr-1">
        {recentRows.length === 0 ? (
          <li className="text-xs text-slate-500">{t('log.lastNoData')}</li>
        ) : (
          recentRows.map((row) => (
            <li
              key={row.key}
              className="rounded border border-slate-800/80 bg-black/30 px-2 py-2 text-xs text-slate-300"
            >
              <div className="font-medium text-slate-200 truncate" title={row.title}>
                {row.title}
              </div>
              <div className="text-slate-500 text-[11px] mt-0.5">{row.dateLabel}</div>
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <span className="text-slate-500">{t('log.setsCount', { count: row.setCount })}</span>
                <button
                  type="button"
                  disabled={!canSaveManual}
                  title={!canSaveManual ? t('log.editUnavailable') : undefined}
                  onClick={() => beginEditSession(row.key)}
                  className="shrink-0 rounded border border-slate-600 px-2 py-0.5 text-[11px] text-emerald-300/90 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('log.edit')}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-3 px-1 text-[color:var(--app-fg)]">
      <div className="flex items-center gap-2 mb-4">
        <NotebookPen className="w-6 h-6 text-slate-300" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">{t('log.pageTitle')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_14rem_minmax(11rem,13rem)] gap-4 lg:gap-5 lg:items-start">
        <div className="order-1 min-w-0 space-y-4 lg:col-start-1">
          {editingSessionKey ? (
            <div
              className="flex flex-wrap items-center gap-2 rounded-md border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-100/90"
              role="status"
            >
              <span>{t('log.editingSession')}</span>
              <button
                type="button"
                onClick={cancelEditSession}
                className="rounded border border-amber-700/50 px-2 py-0.5 text-xs hover:bg-white/5"
              >
                {t('log.cancelEdit')}
              </button>
            </div>
          ) : null}

          <label className="block text-sm text-slate-400 mb-1">{t('log.workoutTitle')}</label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => updateDraft({ ...draft, title: e.target.value })}
            className="w-full rounded-md border border-slate-600/70 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 mb-4"
            placeholder={t('log.workoutTitlePh')}
          />

          <div className="space-y-4">
            {draft.exercises.map((ex) => (
              <div
                key={ex.localId}
                className="rounded-lg border border-slate-700/60 bg-black/30 p-3 space-y-3"
              >
                <div>
                  <label className="block text-xs text-slate-400 mb-1" htmlFor={`ex-name-${ex.localId}`}>
                    {t('log.exercise')}
                  </label>
                  <ExerciseNamePicker
                    id={`ex-name-${ex.localId}`}
                    value={ex.name}
                    onChange={(name) =>
                      patchExercise(ex.localId, (x) => ({
                        ...x,
                        name,
                      }))
                    }
                    assets={exerciseAssets}
                    placeholder={t('log.searchPlaceholder')}
                  />
                  {ex.name.trim() ? (
                    <p className="mt-1 text-xs text-slate-500">{lastHint(ex.name) ?? t('log.lastNoData')}</p>
                  ) : null}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-700/50">
                        <th id={`log-h-w-${ex.localId}`} className="py-1 pr-2 font-medium align-top max-w-[5.5rem]">
                          <span className="block">{weightColLabel}</span>
                          <span className="block text-[10px] font-normal text-slate-500 leading-snug mt-0.5">
                            {t('log.hintWeightShort')}
                          </span>
                        </th>
                        <th className="py-1 pr-2 font-medium align-top">{t('log.reps')}</th>
                        <th id={`log-h-rpe-${ex.localId}`} className="py-1 pr-2 font-medium align-top max-w-[4rem]">
                          <span className="block">{t('log.rpe')}</span>
                          <span className="block text-[10px] font-normal text-slate-500 leading-snug mt-0.5">
                            {t('log.hintRpeShort')}
                          </span>
                        </th>
                        <th id={`log-h-type-${ex.localId}`} className="py-1 pr-2 font-medium align-top max-w-[6rem]">
                          <span className="block">{t('log.type')}</span>
                          <span className="block text-[10px] font-normal text-slate-500 leading-snug mt-0.5">
                            {t('log.hintSetTypeShort')}
                          </span>
                        </th>
                        <th className="py-1 pr-2 font-medium min-w-[5rem]">{t('log.notes')}</th>
                        <th className="py-1 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets.map((s) => (
                        <tr key={s.localId} className="border-b border-slate-800/80">
                          <td className="py-1 pr-1">
                            <input
                              type="number"
                              inputMode="decimal"
                              value={s.weightInput || ''}
                              onChange={(e) =>
                                patchSet(ex.localId, s.localId, (row) => ({
                                  ...row,
                                  weightInput: parseFloat(e.target.value) || 0,
                                }))
                              }
                              className="w-16 rounded border border-slate-600/60 bg-black/50 px-1 py-1 text-white"
                              aria-labelledby={`log-h-w-${ex.localId}`}
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <input
                              type="number"
                              inputMode="numeric"
                              value={s.reps || ''}
                              onChange={(e) =>
                                patchSet(ex.localId, s.localId, (row) => ({
                                  ...row,
                                  reps: Math.max(0, Math.floor(parseFloat(e.target.value) || 0)),
                                }))
                              }
                              className="w-14 rounded border border-slate-600/60 bg-black/50 px-1 py-1 text-white"
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <input
                              type="number"
                              inputMode="decimal"
                              value={s.rpe ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                patchSet(ex.localId, s.localId, (row) => ({
                                  ...row,
                                  rpe: raw === '' ? null : Math.min(10, Math.max(1, parseFloat(raw) || 0)),
                                }));
                              }}
                              className="w-14 rounded border border-slate-600/60 bg-black/50 px-1 py-1 text-white"
                              placeholder="—"
                              aria-labelledby={`log-h-rpe-${ex.localId}`}
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <select
                              value={s.setType}
                              onChange={(e) =>
                                patchSet(ex.localId, s.localId, (row) => ({
                                  ...row,
                                  setType: e.target.value === 'warmup' ? 'warmup' : 'working',
                                }))
                              }
                              className="rounded border border-slate-600/60 bg-black/50 px-1 py-1 text-white max-w-[6rem]"
                              aria-labelledby={`log-h-type-${ex.localId}`}
                            >
                              <option value="working">{t('log.working')}</option>
                              <option value="warmup">{t('log.warmup')}</option>
                            </select>
                          </td>
                          <td className="py-1 pr-1">
                            <input
                              type="text"
                              value={s.notes}
                              onChange={(e) =>
                                patchSet(ex.localId, s.localId, (row) => ({
                                  ...row,
                                  notes: e.target.value,
                                }))
                              }
                              className="w-full min-w-[4rem] rounded border border-slate-600/60 bg-black/50 px-1 py-1 text-white"
                            />
                          </td>
                          <td className="py-1 text-right">
                            <button
                              type="button"
                              onClick={() => removeSet(ex.localId, s.localId)}
                              className="text-slate-500 hover:text-rose-400 text-xs"
                              aria-label={t('log.removeSet')}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addSet(ex.localId)}
                    className="text-xs rounded-md border border-slate-600 px-2 py-1 text-slate-200 hover:bg-white/5"
                  >
                    {t('log.addSet')}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeExercise(ex.localId)}
                    className="text-xs rounded-md border border-slate-700 px-2 py-1 text-slate-400 hover:text-rose-300"
                  >
                    {t('log.removeExercise')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addExercise}
            className="mt-4 w-full sm:w-auto rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            {t('log.addExercise')}
          </button>

          <div className="mt-6 space-y-2 lg:mt-8">
            {saveError ? <p className="text-sm text-amber-400/90">{saveError}</p> : null}
            {!canSaveManual ? <p className="text-sm text-slate-500">{t('log.saveBlocked')}</p> : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSaveManual}
              className="w-full sm:w-auto rounded-md border border-emerald-700/60 bg-emerald-900/30 px-6 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('log.saveWorkout')}
            </button>
          </div>
        </div>

        <div className="order-2 lg:col-start-2 lg:row-start-1">{restTimerBlock}</div>
        <div className="order-3 lg:col-start-3 lg:row-start-1">{recentBlock}</div>
      </div>
    </div>
  );
};
