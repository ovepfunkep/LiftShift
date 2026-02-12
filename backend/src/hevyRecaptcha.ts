import puppeteer, { type Browser, type Page } from 'puppeteer';

const HEVY_LOGIN_URL = 'https://hevy.com/login';
const RECAPTCHA_SITE_KEY = '6LfkQG0jAAAAANTrIkVXKPfSPHyJnt4hYPWqxh0R';
const RECAPTCHA_TIMEOUT_MS = Number(process.env.HEVY_RECAPTCHA_TIMEOUT_MS ?? 20_000);
const BROWSER_MAX_AGE_MS = Number(process.env.HEVY_RECAPTCHA_BROWSER_MAX_AGE_MS ?? 30 * 60 * 1000);
const BROWSER_MAX_USE_COUNT = Number(process.env.HEVY_RECAPTCHA_BROWSER_MAX_USE_COUNT ?? 100);
const IDLE_CLOSE_MS = Number(process.env.HEVY_RECAPTCHA_IDLE_CLOSE_MS ?? 5 * 60 * 1000);

// Serialize token generation to avoid concurrent browser launches
// Tokens are single-use, so we do not cache or reuse them.
let tokenInFlight: Promise<string> | null = null;
let browserInitInFlight: Promise<void> | null = null;
let browser: Browser | null = null;
let page: Page | null = null;
let browserCreatedAt = 0;
let browserUseCount = 0;
let idleCloseTimer: ReturnType<typeof setTimeout> | null = null;

type RecaptchaContext = {
  traceId?: string;
};

const now = (): number => Date.now();

const getTracePrefix = (traceId?: string): string =>
  traceId ? `[Puppeteer][${traceId}]` : '[Puppeteer]';

const safeErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const isPageClosed = (p: Page | null): boolean => {
  if (!p) return true;
  try {
    return p.isClosed();
  } catch {
    return true;
  }
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

  const prefix = getTracePrefix(traceId);
  idleCloseTimer = setTimeout(() => {
    void closeBrowser('idle_timeout', traceId).catch((err) => {
      console.warn(`${prefix} Failed idle close:`, safeErrorMessage(err));
    });
  }, IDLE_CLOSE_MS);
  idleCloseTimer.unref();
  console.log(`${prefix} Scheduled browser idle close in ${IDLE_CLOSE_MS}ms`);
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
  console.log('[Puppeteer] Launching browser for recaptcha');
  return puppeteer.launch(launchOptions);
};

const closeBrowser = async (reason: string, traceId?: string): Promise<void> => {
  const prefix = getTracePrefix(traceId);
  clearIdleCloseTimer();
  const activePage = page;
  const activeBrowser = browser;

  page = null;
  browser = null;
  browserCreatedAt = 0;
  browserUseCount = 0;

  if (activePage && !isPageClosed(activePage)) {
    try {
      await activePage.close();
    } catch (err) {
      console.warn(`${prefix} Failed to close page during ${reason}:`, safeErrorMessage(err));
    }
  }

  if (activeBrowser) {
    try {
      await activeBrowser.close();
      console.log(`${prefix} Browser closed (${reason})`);
    } catch (err) {
      console.warn(`${prefix} Failed to close browser during ${reason}:`, safeErrorMessage(err));
    }
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
  console.log(`${prefix} Recaptcha page ready in ${now() - startedAt}ms`);
};

const ensureBrowserAndPage = async (traceId?: string): Promise<void> => {
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
      console.log(`${prefix} Browser launched in ${browserCreatedAt - launchStartedAt}ms`);
    }

    if (isPageClosed(page)) {
      page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      page.setDefaultNavigationTimeout(RECAPTCHA_TIMEOUT_MS);
      page.setDefaultTimeout(RECAPTCHA_TIMEOUT_MS);
    }

    if (!page) {
      throw new Error('Recaptcha page is not available');
    }

    await ensureRecaptchaLoaded(page, traceId);
    scheduleIdleClose(traceId);
  })();

  try {
    await browserInitInFlight;
  } finally {
    browserInitInFlight = null;
  }
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
  const prefix = getTracePrefix(traceId);
  const startedAt = now();

  await ensureBrowserAndPage(traceId);
  if (!page) throw new Error('Recaptcha page unavailable');

  try {
    let token: string;
    try {
      token = await executeRecaptcha(page);
    } catch {
      // One reload retry helps recover from stale page JS state.
      await ensureRecaptchaLoaded(page, traceId, true);
      token = await executeRecaptcha(page);
    }

    browserUseCount += 1;
    scheduleIdleClose(traceId);
    console.log(`${prefix} Recaptcha token generated in ${now() - startedAt}ms`, {
      browserUseCount,
    });
    return token;
  } catch (err) {
    await closeBrowser('token_generation_error', traceId);
    console.error(`${prefix} Recaptcha token generation failed:`, safeErrorMessage(err));
    throw err;
  }
};

export const getRecaptchaToken = async (context?: RecaptchaContext): Promise<string> => {
  const enqueuedAt = now();
  const prefix = getTracePrefix(context?.traceId);
  const pending = tokenInFlight ?? Promise.resolve('');
  const next = pending.then(() => {
    const queueWaitMs = now() - enqueuedAt;
    if (queueWaitMs > 0) {
      console.log(`${prefix} Waiting in recaptcha queue for ${queueWaitMs}ms`);
    }
    return fetchRecaptchaToken(context);
  });
  tokenInFlight = next;

  try {
    return await next;
  } finally {
    if (tokenInFlight === next) tokenInFlight = null;
  }
};

export const warmRecaptchaSession = async (context?: RecaptchaContext): Promise<void> => {
  await ensureBrowserAndPage(context?.traceId);
};

export const shutdownRecaptchaSession = async (): Promise<void> => {
  await closeBrowser('shutdown');
};

// Clear serialized token queue and recycle browser state.
export const clearTokenCache = (): void => {
  tokenInFlight = null;
  void closeBrowser('manual_clear').catch((err) => {
    console.warn('[Puppeteer] Failed to clear browser state:', safeErrorMessage(err));
  });
};
