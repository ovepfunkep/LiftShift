import type { AnalysisResult } from '../../../types';
import { roundTo } from '../../format/formatters';
import { resolveSetCommentary } from '../setCommentary/setCommentaryLibrary';
import { FATIGUE_BUFFER } from './masterAlgorithmConstants';
import { calculatePercentChange } from './masterAlgorithmMath';
import { buildStructured, line } from './masterAlgorithmTooltips';
import { createAnalysisResult } from './masterAlgorithmResults';
import type { ExpectedRepsRange } from './masterAlgorithmTypes';

export const analyzeWeightIncrease = (
  transition: string,
  weightChangePct: number,
  prevWeight: number,
  currWeight: number,
  prevReps: number,
  currReps: number,
  expected: ExpectedRepsRange
): AnalysisResult => {
  const expectedLabel = expected.label;
  const expectedTarget = Math.round(expected.center);

  const prevVol = prevWeight * prevReps;
  const currVol = currWeight * currReps;
  const volChangePct = calculatePercentChange(prevVol, currVol);
  const pct = roundTo(weightChangePct, 0);
  const seedBase = `${transition}|${weightChangePct}|${currReps}|${expectedLabel}`;

  if (currReps > expected.max) {
    const commentary = resolveSetCommentary(
      'weightIncrease_exceeded',
      seedBase,
      { pct, currReps, expectedLabel },
      { whyCount: 2 }
    );
    const whyLines = commentary.whyLines;
    return createAnalysisResult(
      transition,
      'success',
      weightChangePct,
      volChangePct,
      currReps,
      expectedLabel,
      commentary.shortMessage,
      commentary.tooltip,
      buildStructured(`+${pct}% weight`, 'up', [
        line(whyLines[0] ?? `You beat expected output at this heavier load`, 'gray'),
        line(`Expected: ${expectedLabel} reps, actual: ${currReps} reps`, 'gray'),
        line(whyLines[1] ?? 'This suggests headroom at this load today', 'gray'),
      ])
    );
  }

  if (currReps >= (expected.center - FATIGUE_BUFFER) || (currReps >= expected.min && currReps <= expected.max)) {
    const commentary = resolveSetCommentary('weightIncrease_met', seedBase, { pct, currReps }, { whyCount: 2 });
    const whyLines = commentary.whyLines;
    return createAnalysisResult(
      transition,
      'success',
      weightChangePct,
      volChangePct,
      currReps,
      expectedLabel,
      commentary.shortMessage,
      commentary.tooltip,
      buildStructured(`+${pct}% weight`, 'up', [
        line(whyLines[0] ?? 'You met the expected output at the higher load', 'gray'),
        line(`Expected: ${expectedLabel} reps, actual: ${currReps} reps`, 'gray'),
        line(whyLines[1] ?? 'Progression and recovery are aligned for this set', 'gray'),
      ])
    );
  }

  if (currReps >= expectedTarget - 3) {
    const commentary = resolveSetCommentary(
      'weightIncrease_slightlyBelow',
      seedBase,
      { pct, currReps, expectedLabel },
      { whyCount: 2, improveCount: 2 }
    );
    const whyLines = commentary.whyLines;
    const improveLines = commentary.improveLines;
    return createAnalysisResult(
      transition,
      'warning',
      weightChangePct,
      volChangePct,
      currReps,
      expectedLabel,
      commentary.shortMessage,
      commentary.tooltip,
      buildStructured(
        `+${pct}% weight`,
        'up',
        [
          line(whyLines[0] ?? 'You are close, but current output is under target', 'gray'),
          line(`Expected: ${expectedLabel} reps, actual: ${currReps} reps`, 'gray'),
          line(whyLines[1] ?? 'A small rest or pacing adjustment can close this gap', 'gray'),
        ],
        [
          line(improveLines[0] ?? 'Add more rest before this set', 'gray'),
          line(improveLines[1] ?? 'Keep load steady and recover reps on the next attempt', 'gray'),
        ]
      )
    );
  }

  const commentary = resolveSetCommentary(
    'weightIncrease_significantlyBelow',
    seedBase,
    { pct, currReps, expectedLabel },
    { whyCount: 2, improveCount: 2 }
  );
  const whyLines = commentary.whyLines;
  const improveLines = commentary.improveLines;
  return createAnalysisResult(
    transition,
    'danger',
    weightChangePct,
    volChangePct,
    currReps,
    expectedLabel,
    commentary.shortMessage,
    commentary.tooltip,
    buildStructured(
      `+${pct}% weight`,
      'up',
      [
        line(whyLines[0] ?? 'Load jump is currently above your usable capacity', 'gray'),
        line(`Expected: ${expectedLabel} reps, actual: ${currReps} reps`, 'gray'),
        line(whyLines[1] ?? 'The jump likely outpaced your current in-session capacity', 'gray'),
      ],
      [
        line(improveLines[0] ?? 'Reduce increment size for the next progression', 'gray'),
        line(improveLines[1] ?? 'Rebuild quality reps at a slightly lower load first', 'gray'),
      ]
    )
  );
};
