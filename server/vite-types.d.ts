// Type declaration to fix Vite ServerOptions compatibility
declare module 'vite' {
  interface ServerOptions {
    allowedHosts?: boolean | string[] | undefined;
    middlewareMode?: boolean;
    hmr?: any;
  }
}