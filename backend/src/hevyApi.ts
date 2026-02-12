import type {
  HevyAccountResponse,
  HevyLoginResponse,
  HevyPagedWorkoutsResponse,
} from './types';
import { getRecaptchaToken } from './hevyRecaptcha';

const requireEnv = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

const HEVY_BASE_URL = process.env.HEVY_BASE_URL ?? 'https://api.hevyapp.com';
const DEFAULT_REFRESH_PATHS = ['/refresh', '/refresh_token'];
let preferredRefreshPath: string | null = null;

// Build headers for OAuth2 Bearer token authentication
const buildHeaders = (accessToken?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': requireEnv('HEVY_X_API_KEY'),
    'Origin': 'https://www.hevy.com',
    'Referer': 'https://www.hevy.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Hevy-Platform': 'web',
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  return headers;
};

const mapOAuthResponse = (data: HevyLoginResponse): HevyLoginResponse => {
  if (data.access_token && !data.auth_token) {
    data.auth_token = data.access_token;
  }
  return data;
};

const parseErrorBody = async (res: Response): Promise<string> => {
  try {
    const text = await res.text();
    return text || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
};

const getRefreshPaths = (): string[] => {
  const envPaths = (process.env.HEVY_REFRESH_PATHS ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.startsWith('/') ? p : `/${p}`));

  const ordered = preferredRefreshPath
    ? [preferredRefreshPath, ...envPaths, ...DEFAULT_REFRESH_PATHS]
    : [...envPaths, ...DEFAULT_REFRESH_PATHS];
  return Array.from(new Set(ordered));
};

export const hevyLogin = async (emailOrUsername: string, password: string): Promise<HevyLoginResponse> => {
  const recaptchaToken = await getRecaptchaToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': requireEnv('HEVY_X_API_KEY'),
    'Origin': 'https://www.hevy.com',
    'Referer': 'https://www.hevy.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Hevy-Platform': 'web',
  };

  const body = { emailOrUsername, password, recaptchaToken, useAuth2_0: true };

  console.log('[Hevy Login] Request:', {
    url: `${HEVY_BASE_URL}/login`,
    headers: { ...headers, 'x-api-key': '***' },
    body: { ...body, password: '***' }
  });

  const res = await fetch(`${HEVY_BASE_URL}/login`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  });

  console.log('[Hevy Login] Response:', {
    status: res.status,
    statusText: res.statusText
  });

  if (!res.ok) {
    const msg = await parseErrorBody(res);
    console.error('[Hevy Login] Error:', msg);
    const err = new Error(msg);
    (err as any).statusCode = res.status;
    throw err;
  }

  return mapOAuthResponse(await res.json() as HevyLoginResponse);
};

// Refresh access token using refresh token
export const hevyRefreshToken = async (refreshToken: string): Promise<HevyLoginResponse> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': requireEnv('HEVY_X_API_KEY'),
    'Origin': 'https://www.hevy.com',
    'Referer': 'https://www.hevy.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Hevy-Platform': 'web',
  };

  const body = { refresh_token: refreshToken };
  const refreshPaths = getRefreshPaths();
  let lastError: { status: number; message: string } | null = null;

  for (const path of refreshPaths) {
    const url = `${HEVY_BASE_URL}${path}`;
    console.log('[Hevy Refresh] Request:', {
      url,
      headers: { ...headers, 'x-api-key': '***' }
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    console.log('[Hevy Refresh] Response:', {
      path,
      status: res.status,
      statusText: res.statusText
    });

    if (res.ok) {
      preferredRefreshPath = path;
      return mapOAuthResponse(await res.json() as HevyLoginResponse);
    }

    const msg = await parseErrorBody(res);
    lastError = { status: res.status, message: msg };
    if (res.status !== 404) {
      console.error('[Hevy Refresh] Error:', msg);
      const err = new Error(msg);
      (err as any).statusCode = res.status;
      throw err;
    }
  }

  const fallbackMsg = lastError?.message ?? 'Token refresh failed';
  const fallbackStatus = lastError?.status ?? 500;
  console.warn('[Hevy Refresh] No valid refresh endpoint detected. Falling back to credential login path.');
  const err = new Error(fallbackMsg);
  (err as any).statusCode = fallbackStatus;
  throw err;
};

// Validate token by checking expiry or making a test request
export const hevyValidateAuthToken = async (accessToken: string): Promise<boolean> => {
  try {
    // Try to get account info - if it works, token is valid
    await hevyGetAccount(accessToken);
    return true;
  } catch (err) {
    const status = (err as any)?.statusCode;
    if (status === 401) return false;
    throw err;
  }
};

export const hevyGetAccount = async (accessToken: string): Promise<HevyAccountResponse> => {
  const res = await fetch(`${HEVY_BASE_URL}/user/account`, {
    method: 'GET',
    headers: buildHeaders(accessToken),
  });

  if (!res.ok) {
    const msg = await parseErrorBody(res);
    const err = new Error(msg);
    (err as any).statusCode = res.status;
    throw err;
  }

  return (await res.json()) as HevyAccountResponse;
};

export const hevyGetWorkoutsPaged = async (
  accessToken: string,
  opts: { username: string; offset: number }
): Promise<HevyPagedWorkoutsResponse> => {
  const params = new URLSearchParams({
    username: opts.username,
    offset: String(opts.offset),
  });

  const res = await fetch(`${HEVY_BASE_URL}/user_workouts_paged?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(accessToken),
  });

  if (!res.ok) {
    const msg = await parseErrorBody(res);
    const err = new Error(msg);
    (err as any).statusCode = res.status;
    throw err;
  }

  return (await res.json()) as HevyPagedWorkoutsResponse;
};
