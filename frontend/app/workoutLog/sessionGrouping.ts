import type { WorkoutSet } from '../../types';
import { getSessionKey } from '../../utils/date/dateUtils';
import { buildHistorySessions } from '../../components/historyView/utils/historySessions';

/** Remove all sets belonging to one session (same key as getSessionKey). */
export function removeSessionSets(all: WorkoutSet[], sessionKey: string): WorkoutSet[] {
  return all.filter((s) => getSessionKey(s) !== sessionKey);
}

export interface RecentSessionRow {
  key: string;
  title: string;
  dateLabel: string;
  setCount: number;
  /** ISO timestamp for sorting */
  sortTs: number;
}

/** Recent workouts for sidebar (newest first). */
export function listRecentSessions(sets: WorkoutSet[], limit = 12): RecentSessionRow[] {
  const sessions = buildHistorySessions(sets);
  const rows: RecentSessionRow[] = sessions.map((s) => ({
    key: s.key,
    title: s.title || 'Workout',
    dateLabel: s.date ? s.date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '',
    setCount: s.totalSets,
    sortTs: s.date?.getTime() ?? 0,
  }));
  rows.sort((a, b) => b.sortTs - a.sortTs);
  return rows.slice(0, limit);
}

/** All sets for a session key (for loading into draft). */
export function getSetsForSessionKey(all: WorkoutSet[], sessionKey: string): WorkoutSet[] {
  return all.filter((s) => getSessionKey(s) === sessionKey);
}
