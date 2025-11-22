import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { loadAuth } from "../utils/authStorage";

type Tokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

type RefreshHandler = () => Promise<Tokens | null>;
type AuthHandlers = {
  refresh?: RefreshHandler | null;
  onAuthFailure?: (() => void) | null;
};

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

// Initialize in-memory tokens from localStorage to avoid request races
const storedAuth = typeof window !== "undefined" ? loadAuth() : { seller: null, tokens: null };
let tokens: Tokens = {
  accessToken: storedAuth.tokens?.accessToken ?? null,
  refreshToken: storedAuth.tokens?.refreshToken ?? null,
};
try {
  // eslint-disable-next-line no-console
  console.debug("api.client: initialized tokens from localStorage", {
    hasAccess: !!tokens.accessToken,
    hasRefresh: !!tokens.refreshToken,
  });
} catch (e) {
  /* ignore */
}
let authHandlers: AuthHandlers = { refresh: null, onAuthFailure: null };
let refreshingPromise: Promise<Tokens | null> | null = null;
const MAX_REFRESH_ATTEMPTS = 3;

function isRefreshEndpoint(config?: InternalAxiosRequestConfig<any>) {
  if (!config?.url) return false;
  return config.url.includes("/auth/refresh");
}

export function configureAuth(initialTokens: Tokens, handlers?: AuthHandlers | null) {
  tokens = initialTokens;
  if (handlers) {
    authHandlers = {
      refresh: handlers.refresh ?? null,
      onAuthFailure: handlers.onAuthFailure ?? null,
    };
  }
}

export function clearTokens() {
  tokens = { accessToken: null, refreshToken: null };
}

async function runRefreshWithRetry(): Promise<Tokens | null> {
  if (!authHandlers.refresh) return null;
  for (let attempt = 1; attempt <= MAX_REFRESH_ATTEMPTS; attempt++) {
    try {
      const refreshed = await authHandlers.refresh();
      if (refreshed?.accessToken) {
        tokens = refreshed;
        return refreshed;
      }
    } catch (err) {
      if (attempt === MAX_REFRESH_ATTEMPTS) {
        break;
      }
    }
  }
  authHandlers.onAuthFailure?.();
  return null;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (tokens.accessToken && !isRefreshEndpoint(config)) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  // Debugging: log outgoing request url and whether Authorization header is present
  try {
    // avoid logging tokens directly in production; this is temporary debug info
    // eslint-disable-next-line no-console
    console.debug("api.request:", { url: config.url, hasAuth: !!config.headers?.Authorization });
  } catch (e) {
    /* ignore */
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalConfig: any = error.config;

    if (
      status === 401 &&
      authHandlers.refresh &&
      !originalConfig?._retry &&
      !isRefreshEndpoint(originalConfig)
    ) {
      if (!refreshingPromise) {
        refreshingPromise = runRefreshWithRetry().finally(() => {
          refreshingPromise = null;
        });
      }

      const refreshed = await refreshingPromise;
      if (refreshed?.accessToken) {
        originalConfig._retry = true;
        originalConfig.headers = {
          ...(originalConfig.headers ?? {}),
          Authorization: `Bearer ${refreshed.accessToken}`,
        };
        return api.request(originalConfig);
      }
    }

    // Log 401 failures to help debug authorization issues
    try {
      // eslint-disable-next-line no-console
      console.debug("api.response.error:", {
        url: originalConfig?.url,
        status,
        tokensPresent: { access: !!tokens.accessToken, refresh: !!tokens.refreshToken },
        _retry: originalConfig?._retry ?? false,
      });
    } catch (e) {
      /* ignore */
    }

    return Promise.reject(error);
  }
);
