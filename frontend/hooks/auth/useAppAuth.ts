import { useState, useCallback, useMemo, useEffect } from 'react';
import { WorkoutSet } from '../types';
import { WeightUnit } from '../../utils/storage/localStorage';
import type { DataSourceChoice } from '../../utils/storage/dataSourceStorage';
import type { OnboardingFlow } from '../../app/onboarding/types';
import type { AppAuthHandlersDeps } from './appAuthHandlers';
import {
  runCsvImport,
  runHevyApiKeyLogin,
  runHevyLogin,
  runHevySyncSaved,
  runLyfatLogin,
  runLyfatSyncSaved,
} from './appAuthHandlers';

export interface UseAppAuthReturn {
  hevyLoginError: string | null;
  lyfatLoginError: string | null;
  csvImportError: string | null;
  loadingKind: 'hevy' | 'lyfta' | 'csv' | null;
  isAnalyzing: boolean;
  loadingStep: number;
  progress: number;
  setLoadingKind: (kind: 'hevy' | 'lyfta' | 'csv' | null) => void;
  setIsAnalyzing: (value: boolean) => void;
  setLoadingStep: (step: number) => void;
  startProgress: () => number;
  finishProgress: (startedAt: number) => void;
  handleHevySyncSaved: () => void;
  handleHevyApiKeyLogin: (apiKey: string) => void;
  handleHevyLogin: (emailOrUsername: string, password: string) => void;
  handleLyfatSyncSaved: () => void;
  handleLyfatLogin: (apiKey: string) => void;
  processFile: (file: File, platform: DataSourceChoice, unitOverride?: WeightUnit) => void;
  clearHevyLoginError: () => void;
  clearLyfatLoginError: () => void;
  clearCsvImportError: () => void;
}

export interface UseAppAuthProps {
  weightUnit: WeightUnit;
  setParsedData: (data: WorkoutSet[]) => void;
  setDataSource: (source: DataSourceChoice | null) => void;
  setOnboarding: (flow: OnboardingFlow | null) => void;
  setSelectedMonth: (month: string) => void;
  setSelectedDay: (day: Date | null) => void;
}

export function useAppAuth({
  weightUnit,
  setParsedData,
  setDataSource,
  setOnboarding,
  setSelectedMonth,
  setSelectedDay,
}: UseAppAuthProps): UseAppAuthReturn {
  const [hevyLoginError, setHevyLoginError] = useState<string | null>(null);
  const [lyfatLoginError, setLyfatLoginError] = useState<string | null>(null);
  const [csvImportError, setCsvImportError] = useState<string | null>(null);
  const [loadingKind, setLoadingKind] = useState<'hevy' | 'lyfta' | 'csv' | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = { current: null as number | null };
  const progressValueRef = { current: 0 };
  
  // Keep ref in sync with state for finishProgress to read current value
  useEffect(() => {
    progressValueRef.current = progress;
  }, [progress]);

  const startProgress = useCallback((): number => {
    setProgress(0);
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
    }
    const startTime = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      // Hybrid approach: fast initial bump to 30%, then asymptotic to 95%
      let simulatedProgress: number;
      if (elapsed < 300) {
        // Fast ramp to 30% in first 300ms (instant feedback)
        simulatedProgress = (elapsed / 300) * 30;
      } else {
        // Asymptotic easing from 30% toward 95%
        const decay = 1 - Math.exp(-(elapsed - 300) / 2500);
        simulatedProgress = 30 + (65 * decay);
      }
      setProgress(Math.min(95, simulatedProgress));
    }, 50);
    progressTimerRef.current = interval;
    return startTime;
  }, []);

  const finishProgress = useCallback((startedAt: number): void => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    
    // Rapidly animate to 100% and show completion state
    const currentProgress = progressValueRef.current;
    const remaining = 100 - currentProgress;
    const animationDuration = 80; // ms to reach 100%
    const animationStart = Date.now();
    
    // Show all steps as completed
    setLoadingStep(2); // Step 2 means both steps (0 and 1) show as completed
    
    // Animate progress bar to 100% quickly
    const animationInterval = window.setInterval(() => {
      const elapsed = Date.now() - animationStart;
      const progressRatio = Math.min(1, elapsed / animationDuration);
      const newProgress = currentProgress + (remaining * progressRatio);
      setProgress(newProgress);
      
      if (progressRatio >= 1) {
        window.clearInterval(animationInterval);
        // Brief moment to show completed state, then hide
        window.setTimeout(() => {
          setIsAnalyzing(false);
          setLoadingKind(null);
          setProgress(0);
          setLoadingStep(0);
        }, 100);
      }
    }, 16); // ~60fps
  }, []);

  const handlerDeps = useMemo<AppAuthHandlersDeps>(
    () => ({
      weightUnit,
      setParsedData,
      setDataSource,
      setOnboarding,
      setSelectedMonth,
      setSelectedDay,
      setHevyLoginError,
      setLyfatLoginError,
      setCsvImportError,
      setLoadingKind,
      setIsAnalyzing,
      setLoadingStep,
      startProgress,
      finishProgress,
    }),
    [
      weightUnit,
      setParsedData,
      setDataSource,
      setOnboarding,
      setSelectedMonth,
      setSelectedDay,
      setHevyLoginError,
      setLyfatLoginError,
      setCsvImportError,
      setLoadingKind,
      setIsAnalyzing,
      setLoadingStep,
      startProgress,
      finishProgress,
    ]
  );

  const handleHevySyncSaved = useCallback(() => runHevySyncSaved(handlerDeps), [handlerDeps]);
  const handleHevyApiKeyLogin = useCallback(
    (apiKey: string) => runHevyApiKeyLogin(handlerDeps, apiKey),
    [handlerDeps]
  );
  const handleHevyLogin = useCallback(
    (emailOrUsername: string, password: string) => runHevyLogin(handlerDeps, emailOrUsername, password),
    [handlerDeps]
  );
  const handleLyfatSyncSaved = useCallback(() => runLyfatSyncSaved(handlerDeps), [handlerDeps]);
  const handleLyfatLogin = useCallback((apiKey: string) => runLyfatLogin(handlerDeps, apiKey), [handlerDeps]);
  const processFile = useCallback(
    (file: File, platform: DataSourceChoice, unitOverride?: WeightUnit) =>
      runCsvImport(handlerDeps, file, platform, unitOverride),
    [handlerDeps]
  );

  return {
    hevyLoginError,
    lyfatLoginError,
    csvImportError,
    loadingKind,
    isAnalyzing,
    loadingStep,
    progress,
    setLoadingKind,
    setIsAnalyzing,
    setLoadingStep,
    startProgress,
    finishProgress,
    handleHevySyncSaved,
    handleHevyApiKeyLogin,
    handleHevyLogin,
    handleLyfatSyncSaved,
    handleLyfatLogin,
    processFile,
    clearHevyLoginError: () => setHevyLoginError(null),
    clearLyfatLoginError: () => setLyfatLoginError(null),
    clearCsvImportError: () => setCsvImportError(null),
  };
}
