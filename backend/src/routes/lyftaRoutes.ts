import express from 'express';
import { lyfatGetAllWorkouts, lyfatGetAllWorkoutSummaries, lyfatValidateApiKey } from '../lyfta';
import { mapLyfataWorkoutsToWorkoutSets } from '../mapLyfataWorkoutsToWorkoutSets';

const createTraceId = (): string => {
  const random = Math.random().toString(36).slice(2, 6);
  const time = Date.now().toString(36).slice(-4);
  return `${time}${random}`;
};

const formatDuration = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

export const createLyftaRouter = (opts: {
  loginLimiter: express.RequestHandler;
  getCachedResponse: <T>(key: string, compute: () => Promise<T>) => Promise<T>;
}) => {
  const { loginLimiter, getCachedResponse } = opts;
  const router = express.Router();

  router.post('/validate', loginLimiter, async (req, res) => {
    const traceId = createTraceId();
    const apiKey = String(req.body?.apiKey ?? '').trim();

    if (!apiKey) {
      return res.status(400).json({ error: 'Missing apiKey' });
    }

    console.log(`[User][${traceId}] Lyfta validation started`);

    try {
      const valid = await lyfatValidateApiKey(apiKey);
      if (valid) {
        console.log(`[User][${traceId}] Lyfta validation success`);
      } else {
        console.log(`[User][${traceId}] Lyfta validation failed: Invalid API key`);
      }
      res.json({ valid });
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Validation failed';
      console.error(`[User][${traceId}] Lyfta validation error: ${message}`);
      res.status(status).json({ error: message });
    }
  });

  router.post('/sets', async (req, res) => {
    const traceId = createTraceId();
    const apiKey = String(req.body?.apiKey ?? '').trim();

    if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });

    const startedAt = Date.now();

    try {
      const cacheKey = `lyftaSets:${apiKey}`;
      const { workouts, sets } = await getCachedResponse(cacheKey, async () => {
        // Fetch both workout details and summaries in parallel
        const [workouts, summaries] = await Promise.all([
          lyfatGetAllWorkouts(apiKey),
          lyfatGetAllWorkoutSummaries(apiKey),
        ]);
        const sets = mapLyfataWorkoutsToWorkoutSets(workouts, summaries);
        return { workouts, sets };
      });

      const durationMs = Date.now() - startedAt;
      res.json({ sets, meta: { workouts: workouts.length } });
      console.log(`[User][${traceId}] Lyfta sync successful in ${formatDuration(durationMs)}`);

      // Log username for debugging
      const username = workouts[0]?.user?.username || 'unknown';
      console.log(`[User][${traceId}] lyfta_${username}`);
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Failed to fetch sets';
      const durationMs = Date.now() - startedAt;
      console.error(`[User][${traceId}] Lyfta sync failed in ${formatDuration(durationMs)}: ${message}`);
      res.status(status).json({ error: message });
    }
  });

  return router;
};
