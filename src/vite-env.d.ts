/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BUILD_TARGET: 'community' | 'org';
  readonly PACKAGE_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
