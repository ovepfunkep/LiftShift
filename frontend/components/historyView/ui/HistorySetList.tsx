import React from 'react';
import type { AnalysisResult, SetWisdom } from '../../../types';
import { isWorkingSet } from '../../../utils/analysis/classification';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import type { GroupedExercise } from '../utils/historySessions';
import type { ExerciseBestEvent, ExerciseVolumePrEvent } from '../utils/historyViewTypes';
import { HistorySetRow } from './HistorySetRow';
import { getWisdomColor } from '../../../utils/analysis/masterAlgorithm';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface HistorySetListProps {
  group: GroupedExercise;
  insights: AnalysisResult[];
  macroInsight?: SetWisdom | null;
  prEventsForSession: ExerciseBestEvent[];
  volPrEvent: ExerciseVolumePrEvent | null;
  volPrAnchorIndex: number;
  weightUnit: WeightUnit;
  onTooltipToggle: (e: React.MouseEvent, data: any, variant: 'set' | 'macro') => void;
  onMouseEnter: (e: React.MouseEvent, data: any, variant: 'set' | 'macro') => void;
  onClearTooltip: () => void;
}

export const HistorySetList: React.FC<HistorySetListProps> = ({
  group,
  insights,
  macroInsight,
  prEventsForSession,
  volPrEvent,
  volPrAnchorIndex,
  weightUnit,
  onTooltipToggle,
  onMouseEnter,
  onClearTooltip,
}) => {
  let workingSetNumber = 0;

  return (
    <div className="relative flex-1 min-w-0 flex flex-col justify-center gap-2">
      {group.sets.map((set, sIdx) => {
        const isWorking = isWorkingSet(set);
        if (isWorking) workingSetNumber++;
        const workingSetIdx = group.sets.slice(0, sIdx).filter((s) => isWorkingSet(s)).length;
        const insight = isWorking && workingSetIdx > 0 ? insights[workingSetIdx - 1] : undefined;

        return (
          <HistorySetRow
            key={sIdx}
            set={set}
            setIndex={sIdx}
            weightUnit={weightUnit}
            insight={insight}
            workingSetNumber={workingSetNumber}
            isWorking={isWorking}
            prEventsForSession={prEventsForSession}
            volPrEvent={volPrEvent}
            volPrAnchorIndex={volPrAnchorIndex}
            onTooltipToggle={onTooltipToggle}
            onMouseEnter={onMouseEnter}
            onClearTooltip={onClearTooltip}
          />
        );
      })}

      {macroInsight && (
        <div
          className={`flex flex-col gap-1 p-3 rounded-lg border ${getWisdomColor(macroInsight.type)}`}
        >
          <div className="flex items-center gap-2">
            {macroInsight.type === 'promote' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <div className="flex-1 text-sm font-semibold text-slate-200">
              {macroInsight.message}
            </div>
          </div>
          {macroInsight.tooltip && (
            <div className="text-xs text-slate-400 leading-relaxed">
              {macroInsight.tooltip}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
