import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomeLayout from './layouts/HomeLayout';
import TopicList from './pages/TopicList';
import TopicDetail from './pages/TopicDetail';
import SessionDetail from './pages/SessionDetail';
import TemplateManager from './pages/TemplateManager';
import SearchPage from './pages/SearchPage';
import ExportPage from './pages/ExportPage';
import SettingsPage from './pages/SettingsPage';
import { MessageSquare } from 'lucide-react';

function HomeWelcome() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--color-accent-subtle)' }}
      >
        <MessageSquare className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
      </div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        Welcome to DeepSeek Manager
      </h2>
      <p className="text-sm max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
        Select a topic from the sidebar to view its details, or create a new topic to get started.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Home: two-panel layout with topic sidebar */}
      <Route element={<HomeLayout />}>
        <Route path="/" element={<HomeWelcome />} />
        <Route path="/topic/:id" element={<TopicDetail embedded />} />
      </Route>

      {/* Other pages: standard nav sidebar layout */}
      <Route element={<MainLayout />}>
        <Route path="/topics" element={<TopicList />} />
        <Route path="/session/:id" element={<SessionDetail />} />
        <Route path="/templates" element={<TemplateManager />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
