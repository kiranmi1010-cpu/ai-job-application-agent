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
