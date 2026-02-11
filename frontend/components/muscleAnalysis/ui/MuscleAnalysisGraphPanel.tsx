import React, { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { TrendingDown, TrendingUp, X } from 'lucide-react';
import { CHART_TOOLTIP_STYLE } from '../../../utils/ui/uiConstants';
import { formatNumber } from '../../../utils/format/formatters';
import { getRechartsCategoricalTicks, RECHARTS_XAXIS_PADDING } from '../../../utils/chart/chartEnhancements';
import { QUICK_FILTER_LABELS, HEADLESS_MUSCLE_NAMES } from '../../../utils/muscle/mapping';
import type { WeeklySetsWindow } from '../../../utils/muscle/analytics';
import type { QuickFilterCategory } from '../hooks/useMuscleSelection';

interface MuscleAnalysisGraphPanelProps {
  selectedMuscle: string | null;
  activeQuickFilter: QuickFilterCategory | null;
  weeklySetsWindow: WeeklySetsWindow;
  weeklySetsSummary: number | null;
  volumeDelta: { direction: 'up' | 'down' | 'same'; formattedPercent: string } | null;
  trendData: Array<{ period: string; sets: number }>;
  windowedSelectionBreakdown: { totalSetsInWindow: number } | null;
  clearSelection: () => void;
}

export const MuscleAnalysisGraphPanel: React.FC<MuscleAnalysisGraphPanelProps> = React.memo(({
  selectedMuscle,
  activeQuickFilter,
  weeklySetsWindow,
  weeklySetsSummary,
  volumeDelta,
  trendData,
  windowedSelectionBreakdown,
  clearSelection,
}) => {
  const title = activeQuickFilter
    ? QUICK_FILTER_LABELS[activeQuickFilter]
    : selectedMuscle
      ? ((HEADLESS_MUSCLE_NAMES as any)[selectedMuscle] ?? selectedMuscle)
      : 'All Muscles';

  const totalSetsInWindow = windowedSelectionBreakdown?.totalSetsInWindow ?? 0;

  // Compute x-axis ticks and filter data to match (prevents zigzag from too many points)
  const xTicks = useMemo(() => {
    return getRechartsCategoricalTicks(trendData, (row: any) => row?.period);
  }, [trendData]);

  // Filter data to only include points that have x-axis labels
  const displayData = useMemo(() => {
    if (!xTicks || xTicks.length === 0) return trendData;
    const tickSet = new Set(xTicks);
    return trendData.filter((row: any) => tickSet.has(row.period));
  }, [trendData, xTicks]);

  return (
    <div id="all-muscles-graph" className="bg-black/70 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col h-full min-h-0">
      <div className="bg-black/70  p-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <h2 className="text-sm font-bold text-white truncate">{title}</h2>
          <span
            className=" text-xs font-semibold whitespace-nowrap"
            title={activeQuickFilter || selectedMuscle ? 'sets in current filter' : ''}
          >
            {activeQuickFilter || selectedMuscle
              ? `${Math.round(totalSetsInWindow * 10) / 10} sets`
              : null}
          </span>
          <span
            className="text-blue-400 text-xs font-semibold whitespace-nowrap"
            title="avg weekly sets in selected window"
          >
            {weeklySetsSummary !== null && `${weeklySetsSummary.toFixed(1)}/wk`}
          </span>
          {volumeDelta && volumeDelta.direction !== 'same' && (
            <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold ${volumeDelta.direction === 'up'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-rose-500/10 text-rose-400'
              }`}>
              {volumeDelta.direction === 'up' ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {volumeDelta.formattedPercent} vs prev {weeklySetsWindow === '7d' ? 'wk' : weeklySetsWindow === '30d' ? 'mo' : 'yr'}

            </span>
          )}
        </div>
        {(selectedMuscle || activeQuickFilter) && (
          <button
            onClick={clearSelection}
            className="p-1 hover:bg-black/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      <div className="p-2">
        <div className="bg-black/50 rounded-lg p-2">
          {trendData.length > 0 ? (
            <>
              <div className="block sm:hidden h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayData}>
                    <defs>
                      <linearGradient id="muscleColorGradientGraphMobile" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={volumeDelta?.direction === 'down' ? '#f43f5e' : '#10b981'} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={volumeDelta?.direction === 'down' ? '#f43f5e' : '#10b981'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="period"
                      tick={{ fill: '#64748b', fontSize: 8 }}
                      tickLine={false}
                      axisLine={false}
                      padding={RECHARTS_XAXIS_PADDING as any}
                      interval={0}
                      ticks={xTicks as any}
                    />
                    <YAxis hide />
                    <RechartsTooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={{ color: 'var(--text-primary)' }}
                      formatter={(value: number) => {
                        const v = formatNumber(Number(value), { maxDecimals: 1 });
                        return [`${v} sets/wk`];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sets"
                      stroke={volumeDelta?.direction === 'down' ? '#f43f5e' : '#10b981'}
                      strokeWidth={2}
                      fill="url(#muscleColorGradientGraphMobile)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="hidden sm:block h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayData}>
                    <defs>
                      <linearGradient id="muscleColorGradientGraph" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={volumeDelta?.direction === 'down' ? '#f43f5e' : '#10b981'} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={volumeDelta?.direction === 'down' ? '#f43f5e' : '#10b981'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="period"
                      tick={{ fill: '#64748b', fontSize: 8 }}
                      tickLine={false}
                      axisLine={false}
                      padding={RECHARTS_XAXIS_PADDING as any}
                      interval={0}
                      ticks={xTicks as any}
                    />
                    <YAxis hide />
                    <RechartsTooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={{ color: 'var(--text-primary)' }}
                      formatter={(value: number) => {
                        const v = formatNumber(Number(value), { maxDecimals: 1 });
                        return [`${v} sets/wk`];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sets"
                      stroke={volumeDelta?.direction === 'down' ? '#f43f5e' : '#10b981'}
                      strokeWidth={2}
                      fill="url(#muscleColorGradientGraph)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-slate-500 text-xs">
              No data
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MuscleAnalysisGraphPanel.displayName = 'MuscleAnalysisGraphPanel';
