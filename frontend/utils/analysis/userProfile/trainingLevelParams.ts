import { COMMENTARY_CONFIG, type TrainingLevel, type TrainingLevelConfig } from '../config/commentaryConfig';

export interface TrainingParams {
  fatigueBufferExtra: number;
  educationEnabled: boolean;
  progressionMultiplier: number;
  trainingLevel: TrainingLevel;
}

export const getTrainingParams = (
  trainingLevel: TrainingLevel | undefined
): TrainingParams => {
  const level = trainingLevel ?? 'intermediate';
  const config = COMMENTARY_CONFIG.trainingLevel[level];
  
  return {
    fatigueBufferExtra: config.fatigueBufferExtra,
    educationEnabled: config.educationEnabled,
    progressionMultiplier: config.progressionMultiplier,
    trainingLevel: level,
  };
};
