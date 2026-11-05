/// <reference types="vite/client" />
// Type declarations for Vite asset imports
declare module '*.js?url' {
  const src: string;
  export default src;
}

declare module '*.mjs?url' {
  const src: string;
  export default src;
}

declare module '*.pdf?url' {
  const src: string;
  export default src;
}

declare module '*.worker.js?url' {
  const src: string;
  export default src;
}

declare module '*.worker.mjs?url' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
