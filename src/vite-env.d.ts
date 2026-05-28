/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PACKAGE_VERSION: string;
  /** GitHub OAuth App client_id (Device Flow). From `.env.local` at build time. */
  readonly GITHUB_OAUTH_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
