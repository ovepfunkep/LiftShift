export { COMMENTARY_CONFIG, type CommentaryConfig, type TrainingLevel } from '../config/commentaryConfig';

export { 
  calculateRepProfile, 
  getRepsForPosition, 
  type RepProfile, 
  type SetPositionProfile 
} from './userExerciseProfile';

export { 
  getExerciseType, 
  calculateTypicalWeightJump, 
  getExerciseContext, 
  type ExerciseContext 
} from './exerciseContext';

export { 
  getTrainingParams, 
  type TrainingParams 
} from './trainingLevelParams';

export {
  buildExerciseProgressionProfile,
  getSuggestedWeightForTarget,
  type ExerciseProgressionProfile,
} from './exerciseProgressionProfile';
