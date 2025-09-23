import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'dark' | 'light';

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
);

const mapVsCodeTheme = (kind?: number | string): Theme => {
  if (kind === 2 || kind === 3) {
    return 'dark';
  }
  if (kind === 4) {
    return 'light';
  }
  if (typeof kind === 'string') {
    const normalized = kind.toLowerCase();
    if (normalized.includes('dark') && !normalized.includes('light')) {
      return 'dark';
    }
  }
  return 'light';
};

const detectThemeFromDom = (): Theme => {
  if (
    document.body.classList.contains('vscode-dark') ||
    document.body.classList.contains('vscode-high-contrast')
  ) {
    return 'dark';
  }
  return 'light';
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => detectThemeFromDom());

  useEffect(() => {
    const applyThemeClass = (value: Theme) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(value);
    };

    const syncTheme = (next: Theme) => {
      setThemeState(next);
      applyThemeClass(next);
    };

    syncTheme(detectThemeFromDom());

    const handleMessage = (event: MessageEvent) => {
      const { data } = event;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'colorTheme') {
        const nextTheme = mapVsCodeTheme(data.data?.kind ?? data.kind);
        syncTheme(nextTheme);
      }
    };

    window.addEventListener('message', handleMessage);
    window.vscode?.postMessage({ type: 'requestColorTheme' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const value = useMemo<ThemeProviderState>(
    () => ({
      theme,
      setTheme: (nextTheme: Theme) => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(nextTheme);
        setThemeState(nextTheme);
      },
    }),
    [theme],
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
