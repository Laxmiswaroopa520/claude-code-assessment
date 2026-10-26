/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute API origin. Leave unset in development to use the Vite /api proxy. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
