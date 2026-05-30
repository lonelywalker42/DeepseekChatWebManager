import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function resolveEffective(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

// Load persisted theme from chrome.storage.local (or localStorage fallback)
function loadPersistedTheme(): Theme {
  try {
    const stored = localStorage.getItem('dsm_theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch { /* ignore */ }
  return 'system';
}

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  topicSidebarCollapsed: boolean;
  toggleTopicSidebar: () => void;

  toast: { message: string; type: 'success' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  clearToast: () => void;

  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

export const useAppStore = create<AppState>((set, get) => {
  // Apply initial theme class immediately
  const initialTheme = loadPersistedTheme();
  const initialEffective = resolveEffective(initialTheme);
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', initialEffective === 'dark');
    document.documentElement.style.colorScheme = initialEffective;
  }

  // Listen for system theme changes
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      const { theme } = get();
      if (theme === 'system') {
        const eff = getSystemTheme();
        set({ effectiveTheme: eff });
        document.documentElement.classList.toggle('dark', eff === 'dark');
        document.documentElement.style.colorScheme = eff;
      }
    });
  }

  return {
    sidebarCollapsed: false,
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    topicSidebarCollapsed: false,
    toggleTopicSidebar: () => set((s) => ({ topicSidebarCollapsed: !s.topicSidebarCollapsed })),

    toast: null,
    showToast: (message, type = 'success') => {
      set({ toast: { message, type } });
      setTimeout(() => set({ toast: null }), 3000);
    },
    clearToast: () => set({ toast: null }),

    theme: initialTheme,
    effectiveTheme: initialEffective,
    setTheme: (theme: Theme) => {
      const effective = resolveEffective(theme);
      set({ theme, effectiveTheme: effective });
      document.documentElement.classList.toggle('dark', effective === 'dark');
      document.documentElement.style.colorScheme = effective;
      try { localStorage.setItem('dsm_theme', theme); } catch { /* ignore */ }
    },
  };
});
