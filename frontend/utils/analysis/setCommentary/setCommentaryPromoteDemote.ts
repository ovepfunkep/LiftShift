export const PROMOTE_INCREASE_WEIGHT: readonly string[] = [
  'At ~{topWeight}, you hit at least {minReps} reps, keep this load until you can repeat {targetReps}+ reps, then move to ~{nextWeight}',
  'Top sets reached {minReps} reps at ~{topWeight}, stabilize at {targetReps}+ reps first, then move to ~{nextWeight}',
  'Performance is stable at ~{topWeight}, keep pushing to {targetReps}+ reps before moving to ~{nextWeight}',
  'You completed the target reps, rebuild consistency at ~{topWeight}, then move to ~{nextWeight}',
  'You are above target at top weight, lock in {targetReps}+ reps at ~{topWeight}, then use ~{nextWeight}',
  'Reps are strong at ~{topWeight}, hold this weight until {targetReps}+ reps are consistent, then move to ~{nextWeight}',
  'You have headroom, keep ~{topWeight} and use {targetReps}+ reps as the checkpoint before ~{nextWeight}',
  'Current output supports progression, maintain ~{topWeight}, hit {targetReps}+ reps, then go to ~{nextWeight}',
];

export const DEMOTE_TOO_HEAVY: readonly string[] = [
  'Top-set output is only {minReps} reps, use ~{topWeight} and rebuild to {targetReps} reps before moving back to ~{nextWeight}',
  'Load is limiting quality reps, use ~{topWeight} and target {targetReps} reps, then move to ~{nextWeight}',
  'You are capped by current load, repeat ~{topWeight} until {targetReps} reps are repeatable, then move up to ~{nextWeight}',
  'Current set quality is low, use ~{topWeight}, rebuild to {targetReps} reps first, then return to ~{nextWeight}',
  'Recovery cost is high at this load, use ~{topWeight}, hit {targetReps} reps, then progress to ~{nextWeight}',
  'Rep output is too low, standardize at ~{topWeight} and hold {targetReps} reps before trying ~{nextWeight}',
  'Too heavy for productive execution right now, use ~{topWeight}, reach {targetReps} reps, then move up',
  'Capacity is lagging load, repeat ~{topWeight} and rebuild to {targetReps} reps before the next jump to ~{nextWeight}',
];

export const DEMOTE_INCONSISTENT: readonly string[] = [
  'Rep spread is too wide ({minReps}-{maxReps}), pick {targetReps} reps and keep ~{topWeight} for consistency',
  'Performance fluctuates set to set, anchor at {targetReps} reps with ~{topWeight}, then move to ~{nextWeight} once repeatable',
  'Load control is inconsistent, keep ~{topWeight} and hold {targetReps} reps across sets before trying ~{nextWeight}',
  'Output variability is high, lock in {targetReps} reps at ~{topWeight}, then increase to ~{nextWeight}',
  'Progress is harder with scattered reps, choose {targetReps} reps and standardize at ~{topWeight}',
  'Set quality is uneven, tighten to {targetReps} reps with ~{topWeight}, then move up to ~{nextWeight}',
  'Consistency is the bottleneck, repeat {targetReps} reps at ~{topWeight} first, then move to ~{nextWeight}',
];
