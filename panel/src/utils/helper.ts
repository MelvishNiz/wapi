type RuntimeConfig = {
  API_URL?: string;
};

type BrowserGlobal = typeof globalThis & {
  window?: {
    __WAPI_CONFIG__?: RuntimeConfig;
    location?: {
      origin?: string;
    };
  };
};

const browserWindow = (globalThis as BrowserGlobal).window;
const runtimeConfig = browserWindow?.__WAPI_CONFIG__ ?? {};

export const API_URL = runtimeConfig.API_URL || import.meta.env.VITE_API_URL || browserWindow?.location?.origin || "";
export const PANEL_API_URL = "";
