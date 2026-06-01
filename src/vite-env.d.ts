/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIMCAG_GATEWAY_URL: string;
  readonly VITE_DEV_PROXY_TARGET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
