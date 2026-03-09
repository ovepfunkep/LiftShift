import type { AnalysisResult } from '../../../types';
import { roundTo } from '../../format/formatters';
import { resolveSetCommentary } from '../setCommentary/setCommentaryLibrary';
import { calculatePercentChange } from './masterAlgorithmMath';
import { buildStructured, line } from './masterAlgorithmTooltips';
import { createAnalysisResult } from './masterAlgorithmResults';
import type { ExpectedRepsRange } from './masterAlgorithmTypes';

export const analyzeWeightDecrease = (
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

  if (currReps >= expected.min) {
    const commentary = resolveSetCommentary('weightDecrease_met', seedBase, { pct, currReps }, { whyCount: 2 });
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
      buildStructured(`${pct}% weight`, 'down', [
        line(whyLines[0] ?? 'Weight reduction restored expected output', 'gray'),
        line(`Expected: ${expectedLabel} reps, actual: ${currReps} reps`, 'gray'),
        line(whyLines[1] ?? 'Adjustment size matched current set fatigue', 'gray')
      ])
    );
  }

  if (currReps >= expectedTarget - 3) {
    const commentary = resolveSetCommentary(
      'weightDecrease_slightlyBelow',
      seedBase,
      { pct, currReps, expectedLabel },
      { whyCount: 2 }
    );
    const whyLines = commentary.whyLines;
    return createAnalysisResult(
      transition,
      'info',
      weightChangePct,
      volChangePct,
      currReps,
      expectedLabel,
      commentary.shortMessage,
      commentary.tooltip,
      buildStructured(
        `${pct}% weight`,
        'down',
        [
          line(whyLines[0] ?? 'You recovered some output, but are still below target', 'gray'),
          line(`Expected: ${expectedLabel} reps, actual: ${currReps} reps`, 'gray'),
          line(whyLines[1] ?? 'Current fatigue still needs a slightly deeper reset', 'gray'),
        ]
      )
    );
  }

  const commentary = resolveSetCommentary(
    'weightDecrease_significantlyBelow',
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
      `${pct}% weight`,
      'down',
      [
        line(whyLines[0] ?? 'Even after reducing load, output is still far below target', 'gray'),
        line(`Expected: ${expectedLabel} reps, actual: ${currReps} reps`, 'gray'),
        line(whyLines[1] ?? 'This set likely reflects high in-session fatigue right now', 'gray'),
      ],
      [
        line(improveLines[0] ?? 'Reduce load further for the next attempt', 'gray'),
        line(improveLines[1] ?? 'Restore rep quality first, then build load back gradually', 'gray'),
      ]
    )
  );
};
