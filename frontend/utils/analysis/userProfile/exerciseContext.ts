import type { WorkoutSet } from '../../../types';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { COMMENTARY_CONFIG } from '../config/commentaryConfig';
import { convertWeight } from '../../../utils/format/units';
import type { WeightUnit } from '../../../utils/storage/localStorage';

export interface ExerciseContext {
  isCompound: boolean;
  typicalWeightJump: number;
}

function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export const getExerciseType = (
  exerciseName: string,
  assetsMap: Map<string, ExerciseAsset> | null
): boolean => {
  const asset = assetsMap?.get(exerciseName);
  return !!asset?.secondary_muscle;
};

export const calculateTypicalWeightJump = (
  sets: WorkoutSet[],
  weightUnit: WeightUnit
): number => {
  if (sets.length < 2) return 0;
  
  const workingSets = sets.filter(s => s.weight_kg > 0 && s.reps > 0);
  if (workingSets.length < 2) return 0;
  
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
  
  const recentSessions = sessions.slice(0, COMMENTARY_CONFIG.maxSessionsForAnalysis);
  
  if (recentSessions.length < COMMENTARY_CONFIG.progression.minSessionsForJump) {
    return 0;
  }
  
  const weightJumps: number[] = [];
  
  for (let i = 1; i < recentSessions.length; i++) {
    const prevSession = recentSessions[i - 1];
    const currSession = recentSessions[i];
    
    const prevMaxWeight = Math.max(...prevSession.map(s => s.weight_kg));
    const currMaxWeight = Math.max(...currSession.map(s => s.weight_kg));
    
    // Sessions are sorted newest -> oldest, so progression jump is prev(newer) - curr(older)
    const jump = prevMaxWeight - currMaxWeight;
    if (jump > 0) {
      const jumpInUnit = convertWeight(jump, weightUnit);
      weightJumps.push(jumpInUnit);
    }
  }
  
  if (weightJumps.length === 0) return 0;
  
  const medianJump = getMedian(weightJumps);
  const rounded = Math.round(medianJump / COMMENTARY_CONFIG.progression.weightJumpRounding) 
    * COMMENTARY_CONFIG.progression.weightJumpRounding;
  
  return Math.max(0, rounded);
};

export const getExerciseContext = (
  exerciseName: string,
  assetsMap: Map<string, ExerciseAsset> | null,
  historicalSets: WorkoutSet[],
  weightUnit: WeightUnit
): ExerciseContext => {
  const isCompound = getExerciseType(exerciseName, assetsMap);
  const typicalWeightJump = calculateTypicalWeightJump(historicalSets, weightUnit);
  
  return {
    isCompound,
    typicalWeightJump,
  };
};
