import { useEffect, useRef } from 'react';
import { backendWakeup } from '../utils/api/hevyBackend';

const INTERACTION_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'mousemove',
  'click',
  'wheel',
] as const;

const PING_TIMEOUT_MS = 5_000;

/**
 * Tracks first user interaction and pings backend once to wake it up.
 * Only triggers on the very first interaction, then stops listening.
 */
export const useBackendWakeup = (): void => {
  const hasPingedRef = useRef(false);

  useEffect(() => {
    const pingBackend = async () => {
      if (hasPingedRef.current) return;
      hasPingedRef.current = true;

      console.log('[Frontend] ☀️ First interaction - waking up backend...');

      try {
        await backendWakeup(PING_TIMEOUT_MS);
        // Backend will log if it was cold start, no need for frontend to log success
      } catch {
        // Silent fail - backend being down is not critical at this point
      }

      // Remove all listeners after first ping
      INTERACTION_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
    };

    const handleInteraction = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => pingBackend(), { timeout: 1000 });
      } else {
        setTimeout(() => pingBackend(), 100);
      }
    };

    // Add listeners to all interaction events
    INTERACTION_EVENTS.forEach((event) => {
      window.addEventListener(event, handleInteraction, { passive: true });
    });

    // Cleanup
    return () => {
      INTERACTION_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, []);
};

export default useBackendWakeup;
