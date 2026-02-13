import express from 'express';
import { hevyProGetAllWorkouts, hevyProGetUserInfo, hevyProValidateApiKey } from '../hevyProApi';
import { mapHevyProWorkoutsToWorkoutSets } from '../mapHevyProWorkoutsToWorkoutSets';

const createTraceId = (): string => {
  const random = Math.random().toString(36).slice(2, 6);
  const time = Date.now().toString(36).slice(-4);
  return `${time}${random}`;
};

const formatDuration = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

const extractUsernameFromUrl = (url: string): string => {
  const match = url.match(/\/user\/([^/]+)$/);
  return match ? match[1] : 'unknown';
};

export const createHevyProRouter = (opts: {
  loginLimiter: express.RequestHandler;
  getCachedResponse: <T>(key: string, compute: () => Promise<T>) => Promise<T>;
}) => {
  const { loginLimiter, getCachedResponse } = opts;
  const router = express.Router();

  router.post('/api-key/validate', loginLimiter, async (req, res) => {
    const traceId = createTraceId();
    const apiKey = String(req.body?.apiKey ?? '').trim();

    if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });

    console.log(`[User][${traceId}] 🔑 Hevy Pro validation started`);

    try {
      const valid = await hevyProValidateApiKey(apiKey);
      if (valid) {
        console.log(`[User][${traceId}] ✅ Hevy Pro validation success`);
      } else {
        console.log(`[User][${traceId}] ❌ Hevy Pro validation failed: Invalid API key`);
      }
      res.json({ valid });
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Validate failed';
      console.error(`[User][${traceId}] 💥 Hevy Pro validation error: ${message}`);
      res.status(status).json({ error: message });
    }
  });

  router.post('/api-key/sets', async (req, res) => {
    const traceId = createTraceId();
    const apiKey = String(req.body?.apiKey ?? '').trim();
    if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });

    const startedAt = Date.now();

    try {
      // Get user info for debugging
      const userInfo = await hevyProGetUserInfo(apiKey);
      const username = extractUsernameFromUrl(userInfo.data.url);

      const cacheKey = `hevyProSets:${apiKey}`;
      const { workouts, sets } = await getCachedResponse(cacheKey, async () => {
        const workouts = await hevyProGetAllWorkouts(apiKey);
        const sets = mapHevyProWorkoutsToWorkoutSets(workouts);
        return { workouts, sets };
      });

      const durationMs = Date.now() - startedAt;
      res.json({ sets, meta: { workouts: workouts.length } });
      console.log(`[User][${traceId}] ✅ Hevy Pro sync successful (${formatDuration(durationMs)})`);
      console.log(`[User][${traceId}] 👤 ${userInfo.data.name || username} (@${username}) ${userInfo.data.url}`);
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Failed to fetch sets';
      const durationMs = Date.now() - startedAt;
      console.error(`[User][${traceId}] ❌ Hevy Pro sync failed (${formatDuration(durationMs)}): ${message}`);
      res.status(status).json({ error: message });
    }
  });

  return router;
};
