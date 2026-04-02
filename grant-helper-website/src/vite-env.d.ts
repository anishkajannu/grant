/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRANT_API: string;
  readonly VITE_GRANTS_API_KEY?: string;
  readonly VITE_SIMPLER_GRANTS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
