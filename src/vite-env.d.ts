/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PACKAGE_VERSION: string;
  /** GitHub OAuth App client_id (Device Flow). From `.env.local` at build time. */
  readonly GITHUB_OAUTH_CLIENT_ID: string;
  /** HTTPS OAuth relay URL. Defaults to localhost:8787 when empty. */
  readonly FIGHUB_OAUTH_RELAY_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
