/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIMCAG_GATEWAY_URL: string;
  readonly VITE_DEFAULT_TENANT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
