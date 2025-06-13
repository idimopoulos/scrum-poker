// Type declarations to resolve Vite compatibility issues
declare module 'vite' {
  interface ServerOptions {
    middlewareMode?: boolean;
    hmr?: {
      server?: any;
    };
    allowedHosts?: boolean | string[];
  }
}