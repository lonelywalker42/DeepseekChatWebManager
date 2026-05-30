import { useState, useEffect, useRef } from 'react';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
import { exportTopicAsMarkdown } from '../../shared/utils/export-markdown';
import { exportAllAsJSON, importAllFromJSON } from '../../shared/utils/export-json';
import ConfirmDialog from '../components/ConfirmDialog';
import { FileDown, FileUp, Download, Upload } from 'lucide-react';
import type { Topic, Session } from '../../shared/types';

interface ImportSummary { topics: number; sessions: number; templates: number; }

export default function ExportPage() {
  const showToast = useAppStore((s) => s.showToast);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [exportingTopic, setExportingTopic] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => { loadTopics(); }, []);
  const loadTopics = async () => { const res = await sendMessage<Topic[]>({ type: 'GET_TOPICS' }); if (res.ok) setTopics(res.data); };

  const handleExportTopic = async () => {
    if (!selectedTopicId) { showToast('Please select a topic', 'error'); return; }
    setExportingTopic(true);
    const topicRes = await sendMessage<{ topic: Topic; sessions: Session[] }>({ type: 'EXPORT_TOPIC', payload: { topicId: selectedTopicId } });
    if (topicRes.ok) {
      const { topic, sessions } = topicRes.data;
      downloadFile(`${sanitizeFilename(topic.title)}.md`, exportTopicAsMarkdown(topic, sessions), 'text/markdown');
      showToast('Topic exported as Markdown');
    } else { showToast(topicRes.error, 'error'); }
    setExportingTopic(false);
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const json = await exportAllAsJSON();
      downloadFile(`deepseek-manager-backup-${new Date().toISOString().slice(0, 10)}.json`, json, 'application/json');
      showToast('Backup exported successfully');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Export failed', 'error'); }
    setExportingAll(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setImportData(text);
      setImportSummary({ topics: Array.isArray(data.topics) ? data.topics.length : 0, sessions: Array.isArray(data.sessions) ? data.sessions.length : 0, templates: Array.isArray(data.templates) ? data.templates.length : 0 });
    } catch { showToast('Invalid JSON file', 'error'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importData) return;
    setImporting(true);
    try { await importAllFromJSON(importData); showToast('Data imported successfully'); loadTopics(); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Import failed', 'error'); }
    setImporting(false);
    setImportData(null);
    setImportSummary(null);
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>Export / Import</h1>

      {/* Export Topic as Markdown */}
      <div className="card-static p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-subtle)' }}>
            <FileDown className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Export Topic as Markdown</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Export a topic and all its sessions as a formatted Markdown file.</p>
          </div>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Select Topic</label>
            <select value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)} className="input">
              <option value="">-- Select a topic --</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <button onClick={handleExportTopic} disabled={exportingTopic || !selectedTopicId} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <Download className="w-4 h-4" />{exportingTopic ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Backup / Restore */}
      <div className="card-static p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-success-subtle)' }}>
            <FileUp className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Backup / Restore</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Export or import all your data as a JSON backup file.</p>
          </div>
        </div>
        <div className="mb-6">
          <button onClick={handleExportAll} disabled={exportingAll} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />{exportingAll ? 'Exporting...' : 'Export All Data'}
          </button>
        </div>
        <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>Import data from a JSON backup file. This will replace all existing data.</p>
          <div className="rounded-xl p-6 text-center transition-colors" style={{ border: '2px dashed var(--color-border)' }}>
            <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect}
              className="block text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!importSummary}
        title="Confirm Import"
        message={importSummary ? `This will replace ALL existing data with the imported backup.\n\nThe backup contains:\n- ${importSummary.topics} topic(s)\n- ${importSummary.sessions} session(s)\n- ${importSummary.templates} template(s)\n\nAre you sure you want to proceed?` : ''}
        onConfirm={handleConfirmImport}
        onCancel={() => { setImportData(null); setImportSummary(null); }}
      />
    </div>
  );
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 60);
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
