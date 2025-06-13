// Type declaration to fix Vite ServerOptions compatibility
declare module 'vite' {
  interface ServerOptions {
    allowedHosts?: true | string[] | undefined;
  }
}