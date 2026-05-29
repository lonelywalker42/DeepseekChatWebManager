import { Outlet, NavLink } from 'react-router-dom';
import { useAppStore } from '../stores/app-store';
import SearchBar from '../components/SearchBar';
import {
  LayoutGrid,
  FileText,
  Search,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Topics', icon: LayoutGrid },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/export', label: 'Export', icon: Download },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const toastConfig = {
  success: {
    icon: CheckCircle,
    border: 'border-emerald-500',
    bg: 'bg-white',
    text: 'text-emerald-700',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: XCircle,
    border: 'border-red-500',
    bg: 'bg-white',
    text: 'text-red-700',
    iconColor: 'text-red-500',
  },
};

export default function MainLayout() {
  const { sidebarCollapsed, toggleSidebar, toast, clearToast } = useAppStore();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white transition-all duration-300 ease-in-out relative ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between p-4 h-14 border-b border-white/5">
          {!sidebarCollapsed && (
            <span className="text-sm font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent truncate">
              DeepSeek Manager
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-white/10 text-white shadow-sm border-l-2 border-indigo-400 -ml-0.5 pl-[10px]'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar with search */}
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-slate-200/80 px-6 py-3 flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <SearchBar />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in-right">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-dialog border-l-4 backdrop-blur-sm ${
              toastConfig[toast.type || 'success'].border
            } ${toastConfig[toast.type || 'success'].bg} min-w-[280px]`}
          >
            {(() => {
              const config = toastConfig[toast.type || 'success'];
              const Icon = config.icon;
              return <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} />;
            })()}
            <span className={`text-sm font-medium flex-1 ${toastConfig[toast.type || 'success'].text}`}>
              {toast.message}
            </span>
            <button
              onClick={clearToast}
              className="p-0.5 rounded hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-slate-100 rounded-b-xl overflow-hidden">
              <div
                className={`h-full animate-shrink ${
                  toast.type === 'error' ? 'bg-red-400' : 'bg-emerald-400'
                }`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
