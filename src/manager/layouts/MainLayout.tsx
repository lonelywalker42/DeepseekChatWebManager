import { Outlet, NavLink } from 'react-router-dom';
import { useAppStore } from '../stores/app-store';
import SearchBar from '../components/SearchBar';

const navItems = [
  { to: '/', label: 'Topics', icon: 'T' },
  { to: '/templates', label: 'Templates', icon: 'W' },
  { to: '/search', label: 'Search', icon: 'S' },
  { to: '/export', label: 'Export', icon: 'E' },
  { to: '/settings', label: 'Settings', icon: 'G' },
];

export default function MainLayout() {
  const { sidebarCollapsed, toggleSidebar, toast, clearToast } = useAppStore();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 bg-gray-900 text-white transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        <div className="flex items-center justify-between p-4">
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold truncate">DeepSeek Manager</span>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded hover:bg-gray-700"
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? '>' : '<'}
          </button>
        </div>

        <nav className="mt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm rounded mx-2 ${
                  isActive ? 'bg-gray-700' : 'hover:bg-gray-800'
                }`
              }
            >
              {sidebarCollapsed ? item.icon : item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar with search */}
        <header className="flex-shrink-0 bg-white border-b px-6 py-3 flex items-center gap-4">
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
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-white text-sm cursor-pointer ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}
          onClick={clearToast}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
