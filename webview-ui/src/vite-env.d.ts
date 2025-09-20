/// <reference types="vite/client" />

declare global {
  interface Window {
    PUBLIC_BASE_URI: string;
    vscode: {
      postMessage: (message: unknown) => void;
    }
  }
}

export {};
