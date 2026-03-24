import { useCallback, useEffect, useState } from 'react';

/** Rest countdown between sets; one-second steps via timeout chain. */
export const useRestTimer = () => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [targetSeconds, setTargetSeconds] = useState(0);

  const stop = useCallback(() => {
    setIsRunning(false);
    setSecondsLeft(0);
  }, []);

  const startRest = useCallback((seconds: number) => {
    const s = Math.max(1, Math.floor(seconds));
    setTargetSeconds(s);
    setSecondsLeft(s);
    setIsRunning(true);
  }, []);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;
    const t = window.setTimeout(() => {
      setSecondsLeft((n) => {
        if (n <= 1) {
          setIsRunning(false);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => window.clearTimeout(t);
  }, [isRunning, secondsLeft]);

  return { secondsLeft, isRunning, targetSeconds, startRest, stop };
};
