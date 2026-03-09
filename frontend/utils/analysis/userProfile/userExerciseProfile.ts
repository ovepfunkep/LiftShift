import type { WorkoutSet } from '../../../types';
import { isWarmupSet } from '../classification';
import { COMMENTARY_CONFIG } from '../config/commentaryConfig';

export interface SetPositionProfile {
  avgReps: number;
  medianReps: number;
  sampleCount: number;
}

export interface RepProfile {
  positions: Map<number, SetPositionProfile>;
  sessionCount: number;
}

function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export const calculateRepProfile = (
  sets: WorkoutSet[],
  numSessions?: number
): RepProfile | null => {
  const maxSessions = numSessions ?? COMMENTARY_CONFIG.maxSessionsForAnalysis;
  
  if (sets.length < 2) return null;
  
  const workingSets = sets.filter(s => !isWarmupSet(s));
  if (workingSets.length < 2) return null;
  
  const sessionsMap = new Map<string, WorkoutSet[]>();
  
  for (const set of workingSets) {
    if (!set.parsedDate) continue;
    const sessionKey = set.parsedDate.toDateString();
    if (!sessionsMap.has(sessionKey)) {
      sessionsMap.set(sessionKey, []);
    }
    sessionsMap.get(sessionKey)!.push(set);
  }
  
  const sessions = Array.from(sessionsMap.values())
    .sort((a, b) => (b[0]?.parsedDate?.getTime() ?? 0) - (a[0]?.parsedDate?.getTime() ?? 0));
  
  const actualSessions = sessions.slice(0, maxSessions);
  
  if (actualSessions.length < COMMENTARY_CONFIG.repProfile.minSessionsForProfile) {
    return null;
  }
  
  const positionReps = new Map<number, number[]>();
  
  for (const session of actualSessions) {
    const sortedSets = [...session].sort((a, b) => (a.set_index ?? 0) - (b.set_index ?? 0));
    let workingSetPosition = 0;
    
    for (let i = 0; i < sortedSets.length; i++) {
      const set = sortedSets[i];
      if (!isWarmupSet(set) && set.reps > 0) {
        workingSetPosition += 1;
        const position = workingSetPosition;
        if (!positionReps.has(position)) {
          positionReps.set(position, []);
        }
        positionReps.get(position)!.push(set.reps);
      }
    }
  }
  
  const positions = new Map<number, SetPositionProfile>();
  
  positionReps.forEach((reps, position) => {
    if (reps.length >= COMMENTARY_CONFIG.repProfile.minSessionsForProfile) {
      const avg = reps.reduce((a, b) => a + b, 0) / reps.length;
      positions.set(position, {
        avgReps: Math.round(avg * 10) / 10,
        medianReps: getMedian(reps),
        sampleCount: reps.length,
      });
    }
  });
  
  return {
    positions,
    sessionCount: actualSessions.length,
  };
};

export const getRepsForPosition = (
  profile: RepProfile | null,
  position: number
): number | null => {
  if (!profile) return null;
  const posProfile = profile.positions.get(position);
  return posProfile?.medianReps ?? null;
};
