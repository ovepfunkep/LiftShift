import puppeteer, { type Browser, type Page } from 'puppeteer';

const HEVY_LOGIN_URL = 'https://hevy.com/login';
const RECAPTCHA_SITE_KEY = '6LfkQG0jAAAAANTrIkVXKPfSPHyJnt4hYPWqxh0R';
const RECAPTCHA_TIMEOUT_MS = 120_000;
const BROWSER_MAX_AGE_MS = 30 * 60 * 1000;
const BROWSER_MAX_USE_COUNT = 100;
const IDLE_CLOSE_MS = 4 * 60 * 1000;
// Keep one active page on low-CPU instances to avoid page-load contention.
const MAX_PAGES = 1;
const TOKEN_TTL_MS = 60_000;

type RecaptchaContext = {
  traceId?: string;
  cacheKey?: string;
  allowCached?: boolean;
  cacheResult?: boolean;
};

type CachedToken = {
  token: string;
  expiresAt: number;
};

const tokenCache = new Map<string, CachedToken>();
let cacheCleanupTimer: ReturnType<typeof setInterval> | null = null;

let browserInitInFlight: Promise<void> | null = null;
let browser: Browser | null = null;
let browserCreatedAt = 0;
let browserUseCount = 0;
let standbyPage: Page | null = null;
let idleCloseTimer: ReturnType<typeof setTimeout> | null = null;
const openPages = new Set<Page>();
const activePages = new Set<Page>();
const pageWaiters: Array<() => void> = [];
let pageCreationReservations = 0;
let sessionWarmupInFlight: Promise<void> | null = null;
const tokenWarmupByKey = new Map<string, Promise<void>>();

const now = (): number => Date.now();

const getTracePrefix = (traceId?: string): string =>
  traceId ? `[System][${traceId}]` : '[System]';

const safeErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const formatDuration = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

const logWarmToken = (action: 'hit' | 'store', cacheKey: string | null | undefined, traceId?: string): void => {
  if (!cacheKey) return;
  const prefix = traceId ? `[User][${traceId}]` : '[User]';
  if (action === 'hit') {
    console.log(`${prefix} Recaptcha token reused for ${cacheKey}`);
    return;
  }
  console.log(`${prefix} Recaptcha token prepared for ${cacheKey}`);
};

const logQueue = (position: number, waitMs: number, traceId?: string): void => {
  if (position <= 0 || waitMs < 100) return;
  const prefix = traceId ? `[User][${traceId}]` : '[User]';
  console.log(`${prefix} Queued #${position}, waited ${formatDuration(waitMs)}`);
};

const normalizeKey = (key?: string): string | null => {
  const trimmed = key?.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
};

const clearIdleCloseTimer = (): void => {
  if (!idleCloseTimer) return;
  clearTimeout(idleCloseTimer);
  idleCloseTimer = null;
};

const scheduleIdleClose = (traceId?: string): void => {
  clearIdleCloseTimer();
  if (!browser) return;
  if (!Number.isFinite(IDLE_CLOSE_MS) || IDLE_CLOSE_MS <= 0) return;
  if (activePages.size > 0) return;

  const prefix = getTracePrefix(traceId);
  idleCloseTimer = setTimeout(() => {
    void closeBrowser('idle_timeout', traceId).catch((err) => {
      console.warn(`${prefix} Failed idle close:`, safeErrorMessage(err));
    });
  }, IDLE_CLOSE_MS);
  idleCloseTimer.unref();
};

const ensureCacheCleanupTimer = (): void => {
  if (cacheCleanupTimer) return;
  cacheCleanupTimer = setInterval(() => {
    const time = now();
    for (const [key, value] of tokenCache) {
      if (value.expiresAt <= time) tokenCache.delete(key);
    }
  }, Math.max(30_000, Math.min(TOKEN_TTL_MS, 60_000)));
  cacheCleanupTimer.unref();
};

const getCachedToken = (cacheKey?: string | null): string | null => {
  if (!cacheKey) return null;
  const cached = tokenCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= now()) {
    tokenCache.delete(cacheKey);
    return null;
  }
  return cached.token;
};

const takeCachedToken = (cacheKey?: string | null): string | null => {
  const token = getCachedToken(cacheKey);
  if (!token || !cacheKey) return null;
  tokenCache.delete(cacheKey);
  return token;
};

const storeCachedToken = (cacheKey: string | null, token: string): void => {
  if (!cacheKey) return;
  tokenCache.set(cacheKey, { token, expiresAt: now() + TOKEN_TTL_MS });
  ensureCacheCleanupTimer();
};

const launchBrowser = async (): Promise<Browser> => {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-blink-features=AutomationControlled',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-networking',
      '--disable-sync',
    ],
  };
  console.log('[System] Browser cold start (launching)');
  return puppeteer.launch(launchOptions);
};

const isPageClosed = (p: Page | null): boolean => {
  if (!p) return true;
  try {
    return p.isClosed();
  } catch {
    return true;
  }
};

const closePage = async (p: Page, reason: string, traceId?: string): Promise<void> => {
  const prefix = getTracePrefix(traceId);
  openPages.delete(p);
  activePages.delete(p);
  if (standbyPage === p) standbyPage = null;
  if (!isPageClosed(p)) {
    try {
      await p.close();
    } catch (err) {
      console.warn(`${prefix} Failed to close page during ${reason}:`, safeErrorMessage(err));
    }
  }
};

const closeBrowser = async (reason: string, traceId?: string): Promise<void> => {
  const prefix = getTracePrefix(traceId);
  clearIdleCloseTimer();
  const activeBrowser = browser;
  const pages = Array.from(openPages);

  openPages.clear();
  activePages.clear();
  standbyPage = null;
  browser = null;
  browserCreatedAt = 0;
  browserUseCount = 0;
  pageCreationReservations = 0;

  for (const p of pages) {
    await closePage(p, reason, traceId);
  }

  if (activeBrowser) {
    try {
      await activeBrowser.close();
      console.log(`${prefix} Browser closed (${reason})`);
    } catch (err) {
      console.warn(`${prefix} Failed to close browser during ${reason}:`, safeErrorMessage(err));
    }
  }

  while (pageWaiters.length > 0) {
    const waiter = pageWaiters.shift();
    if (waiter) waiter();
  }
};

const needsBrowserRecycle = (): boolean => {
  if (!browser) return false;
  if (browserUseCount >= BROWSER_MAX_USE_COUNT) return true;
  if (browserCreatedAt === 0) return true;
  return now() - browserCreatedAt >= BROWSER_MAX_AGE_MS;
};

const ensureRecaptchaLoaded = async (p: Page, traceId?: string, forceReload = false): Promise<void> => {
  const prefix = getTracePrefix(traceId);
  const ready = await p.evaluate(() => Boolean((window as any).grecaptcha?.enterprise));
  if (ready && !forceReload) return;

  const startedAt = now();
  await p.goto(HEVY_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: RECAPTCHA_TIMEOUT_MS });
  await p.waitForFunction(() => Boolean((window as any).grecaptcha?.enterprise), {
    timeout: RECAPTCHA_TIMEOUT_MS,
  });
  const elapsed = now() - startedAt;
  if (elapsed > 1000) {
    console.log(`${prefix} Page load took ${formatDuration(elapsed)}`);
  }
};

const ensureBrowser = async (traceId?: string): Promise<void> => {
  if (browserInitInFlight) {
    await browserInitInFlight;
    return;
  }

  const prefix = getTracePrefix(traceId);
  browserInitInFlight = (async () => {
    if (needsBrowserRecycle()) {
      await closeBrowser('recycle', traceId);
    }

    if (!browser || !browser.isConnected()) {
      const launchStartedAt = now();
      browser = await launchBrowser();
      browserCreatedAt = now();
      browserUseCount = 0;
      console.log(`${prefix} Browser ready in ${formatDuration(now() - launchStartedAt)}`);
    }
  })();

  try {
    await browserInitInFlight;
  } finally {
    browserInitInFlight = null;
  }
};

const createPage = async (traceId?: string): Promise<Page> => {
  if (!browser) throw new Error('Recaptcha browser not available');
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  page.setDefaultNavigationTimeout(RECAPTCHA_TIMEOUT_MS);
  page.setDefaultTimeout(RECAPTCHA_TIMEOUT_MS);
  openPages.add(page);
  page.once('close', () => {
    openPages.delete(page);
    activePages.delete(page);
    if (standbyPage === page) standbyPage = null;
  });
  await ensureRecaptchaLoaded(page, traceId);
  return page;
};

const acquirePage = async (
  traceId?: string
): Promise<{ page: Page; isStandby: boolean; queueMs: number; queuePosition: number }> => {
  const startTime = now();
  let queuePosition = 0;

  while (true) {
    await ensureBrowser(traceId);

    if (standbyPage && !activePages.has(standbyPage) && !isPageClosed(standbyPage)) {
      activePages.add(standbyPage);
      return { page: standbyPage, isStandby: true, queueMs: now() - startTime, queuePosition };
    }

    // Reserve a slot synchronously before awaiting page creation.
    if ((openPages.size + pageCreationReservations) < MAX_PAGES) {
      pageCreationReservations += 1;
      let created = false;
      try {
        const page = await createPage(traceId);
        created = true;
        activePages.add(page);
        return { page, isStandby: false, queueMs: now() - startTime, queuePosition };
      } finally {
        pageCreationReservations = Math.max(0, pageCreationReservations - 1);
        if (!created) {
          const waiter = pageWaiters.shift();
          if (waiter) waiter();
        }
      }
    }

    queuePosition = pageWaiters.length + 1;
    await new Promise<void>((resolve) => {
      pageWaiters.push(resolve);
    });
  }
};

const releasePage = async (page: Page, traceId?: string): Promise<void> => {
  activePages.delete(page);

  if (!standbyPage || standbyPage === page) {
    if (!standbyPage) standbyPage = page;
  } else {
    await closePage(page, 'page_release', traceId);
  }

  if (activePages.size === 0) {
    scheduleIdleClose(traceId);
  }

  const waiter = pageWaiters.shift();
  if (waiter) waiter();
};

const executeRecaptcha = async (p: Page): Promise<string> => {
  const token = await p.evaluate(async (siteKey: string) => {
    const enterprise = (window as any).grecaptcha?.enterprise;
    if (!enterprise) return '';
    return await enterprise.execute(siteKey, { action: 'login' });
  }, RECAPTCHA_SITE_KEY);

  if (!token || typeof token !== 'string') {
    throw new Error('Failed to retrieve recaptcha token');
  }

  return token;
};

const fetchRecaptchaToken = async (context?: RecaptchaContext): Promise<string> => {
  const traceId = context?.traceId;
  const startedAt = now();

  const { page, isStandby, queueMs, queuePosition } = await acquirePage(traceId);

  logQueue(queuePosition, queueMs, traceId);

  try {
    let token: string;
    try {
      token = await executeRecaptcha(page);
    } catch {
      await ensureRecaptchaLoaded(page, traceId, true);
      token = await executeRecaptcha(page);
    }

    browserUseCount += 1;
    const totalMs = now() - startedAt;
    const userPrefix = traceId ? `[User][${traceId}]` : '[User]';
    console.log(`${userPrefix} Auth ready${isStandby ? ' (standby)' : ''} in ${formatDuration(totalMs)}`);
    return token;
  } finally {
    await releasePage(page, traceId);
  }
};

export const getRecaptchaToken = async (context?: RecaptchaContext): Promise<string> => {
  const cacheKey = normalizeKey(context?.cacheKey);
  if (context?.allowCached !== false) {
    const cached = takeCachedToken(cacheKey);
    if (cached) {
      logWarmToken('hit', cacheKey, context?.traceId);
      return cached;
    }
  }
  const token = await fetchRecaptchaToken(context);
  if (context?.cacheResult) {
    storeCachedToken(cacheKey, token);
    logWarmToken('store', cacheKey, context?.traceId);
  }
  return token;
};

export const warmRecaptchaToken = async (context?: RecaptchaContext): Promise<void> => {
  const cacheKey = normalizeKey(context?.cacheKey);
  if (cacheKey && getCachedToken(cacheKey)) return;

  if (cacheKey) {
    const inFlight = tokenWarmupByKey.get(cacheKey);
    if (inFlight) {
      await inFlight;
      return;
    }
  }

  const warmupPromise = (async () => {
    const token = await fetchRecaptchaToken(context);
    storeCachedToken(cacheKey, token);
    logWarmToken('store', cacheKey, context?.traceId);
  })();

  if (!cacheKey) {
    await warmupPromise;
    return;
  }

  tokenWarmupByKey.set(cacheKey, warmupPromise);
  try {
    await warmupPromise;
  } finally {
    tokenWarmupByKey.delete(cacheKey);
  }
};

export const warmRecaptchaSession = async (context?: RecaptchaContext): Promise<void> => {
  if (sessionWarmupInFlight) {
    await sessionWarmupInFlight;
    return;
  }

  sessionWarmupInFlight = (async () => {
    await ensureBrowser(context?.traceId);
    if (!standbyPage || isPageClosed(standbyPage)) {
      standbyPage = await createPage(context?.traceId);
    }
    scheduleIdleClose(context?.traceId);
  })();

  try {
    await sessionWarmupInFlight;
  } finally {
    sessionWarmupInFlight = null;
  }
};

export const shutdownRecaptchaSession = async (): Promise<void> => {
  await closeBrowser('shutdown');
};

export const clearTokenCache = (): void => {
  tokenCache.clear();
  void closeBrowser('manual_clear').catch((err) => {
    console.warn('[Puppeteer] Failed to clear browser state:', safeErrorMessage(err));
  });
};
