/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides for local development; production falls back to the committed values. */
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
