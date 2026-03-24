/**
 * Converts user-entered weight to kg. Keep in sync with toKg in csvRowTransform.ts
 * when the value is already in the user's preferred unit (no per-row unit).
 */
const LBS_TO_KG = 0.45359237;

export function userInputWeightToKg(weight: number, userUnit: 'kg' | 'lbs'): number {
  if (!Number.isFinite(weight) || weight < 0) return 0;
  return userUnit === 'lbs' ? weight * LBS_TO_KG : weight;
}

/** kg → display weight for the user's unit */
export function kgToWeightDisplay(kg: number, userUnit: 'kg' | 'lbs'): number {
  if (!Number.isFinite(kg) || kg < 0) return 0;
  return userUnit === 'lbs' ? kg / LBS_TO_KG : kg;
}
