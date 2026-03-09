export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';

export interface TrainingLevelConfig {
  fatigueBufferExtra: number;
  educationEnabled: boolean;
  progressionMultiplier: number;
}

export interface RepProfileConfig {
  minSessionsForProfile: number;
  weightBlending: number;
}

export interface ExerciseTypeConfig {
  compoundFatigueRate: number;
  isolationFatigueRate: number;
}

export interface ProgressionConfig {
  minSessionsForJump: number;
  weightJumpRounding: number;
  compoundRepCeiling: number;
  isolationRepCeiling: number;
}

export interface CommentaryConfig {
  maxSessionsForAnalysis: number;
  trainingLevel: Record<TrainingLevel, TrainingLevelConfig>;
  repProfile: RepProfileConfig;
  exerciseType: ExerciseTypeConfig;
  progression: ProgressionConfig;
}

export const COMMENTARY_CONFIG: CommentaryConfig = {
  maxSessionsForAnalysis: 5,
  
  trainingLevel: {
    beginner: {
      fatigueBufferExtra: 2,
      educationEnabled: true,
      progressionMultiplier: 0.8,
    },
    intermediate: {
      fatigueBufferExtra: 1,
      educationEnabled: true,
      progressionMultiplier: 1.0,
    },
    advanced: {
      fatigueBufferExtra: 0,
      educationEnabled: true,
      progressionMultiplier: 1.2,
    },
  },
  
  repProfile: {
    minSessionsForProfile: 2,
    weightBlending: 0.5,
  },
  
  exerciseType: {
    compoundFatigueRate: 0.5,
    isolationFatigueRate: 0.25,
  },
  
  progression: {
    minSessionsForJump: 2,
    weightJumpRounding: 0.5,
    compoundRepCeiling: 10,
    isolationRepCeiling: 15,
  },
};
