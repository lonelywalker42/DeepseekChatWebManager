import { Outlet } from 'react-router-dom';
import { useAppStore } from '../stores/app-store';
import TopicSidebar from '../components/TopicSidebar';
import {
  CheckCircle,
  XCircle,
  X,
  Sun,
  Moon,
  Monitor,
  FileText,
  Search,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const secondaryNav = [
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/export', label: 'Export', icon: Download },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const toastConfig = {
  success: {
    icon: CheckCircle,
    text: 'text-emerald-700',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: XCircle,
    text: 'text-red-700',
    iconColor: 'text-red-500',
  },
};

const themeIcons: Record<string, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const themeLabels: Record<string, string> = { light: 'Light', dark: 'Dark', system: 'System' };

export default function HomeLayout() {
  const { topicSidebarCollapsed, toggleTopicSidebar, toast, clearToast, theme, setTheme } = useAppStore();

  const cycleTheme = () => {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % 3];
    setTheme(next);
  };

  const ThemeIcon = themeIcons[theme];

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* Left sidebar: topic list + secondary nav */}
      <aside
        className="flex-shrink-0 flex flex-col transition-all duration-200 ease-in-out"
        style={{
          width: topicSidebarCollapsed ? 64 : 280,
          backgroundColor: 'var(--color-bg-sidebar)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Brand header */}
        <div
          className="flex items-center justify-between p-4 h-14 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          {!topicSidebarCollapsed && (
            <span className="text-sm font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent truncate">
              DeepSeek Manager
            </span>
          )}
          <button
            onClick={toggleTopicSidebar}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-sidebar-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--color-text-sidebar)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-sidebar-muted)'; }}
            title={topicSidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {topicSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Topic sidebar content */}
        {!topicSidebarCollapsed && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <TopicSidebar />
          </div>
        )}

        {/* Secondary nav + theme toggle */}
        <div className="flex-shrink-0 px-2 pb-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-150"
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: isActive ? 'var(--color-text-sidebar)' : 'var(--color-text-sidebar-muted)',
                })}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!topicSidebarCollapsed && <span className="truncate text-xs">{item.label}</span>}
              </NavLink>
            );
          })}

          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-150 w-full"
            style={{ color: 'var(--color-text-sidebar-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--color-text-sidebar)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-sidebar-muted)'; }}
            title={`Theme: ${themeLabels[theme]}`}
          >
            <ThemeIcon className="w-4 h-4 flex-shrink-0" />
            {!topicSidebarCollapsed && <span className="truncate text-xs">{themeLabels[theme]}</span>}
          </button>
        </div>
      </aside>

      {/* Right: main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <Outlet />
        </main>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in-right">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-dialog border-l-4 backdrop-blur-sm min-w-[280px]"
            style={{
              backgroundColor: 'var(--color-card-bg)',
              borderColor: toast.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
            }}
          >
            {(() => {
              const config = toastConfig[toast.type || 'success'];
              const Icon = config.icon;
              return <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} />;
            })()}
            <span className="text-sm font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>
              {toast.message}
            </span>
            <button
              onClick={clearToast}
              className="p-0.5 rounded transition-colors"
              style={{ color: 'var(--color-text-tertiary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-b-xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <div className={`h-full animate-shrink ${toast.type === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
