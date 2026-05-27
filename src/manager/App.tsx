import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import TopicList from './pages/TopicList';
import TopicDetail from './pages/TopicDetail';
import SessionDetail from './pages/SessionDetail';
import TemplateManager from './pages/TemplateManager';
import SearchPage from './pages/SearchPage';
import ExportPage from './pages/ExportPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<TopicList />} />
        <Route path="/topic/:id" element={<TopicDetail />} />
        <Route path="/session/:id" element={<SessionDetail />} />
        <Route path="/templates" element={<TemplateManager />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
