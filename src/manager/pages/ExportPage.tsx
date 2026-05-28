import { useState, useEffect, useRef } from 'react';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
import { exportTopicAsMarkdown } from '../../shared/utils/export-markdown';
import { exportAllAsJSON, importAllFromJSON } from '../../shared/utils/export-json';
import ConfirmDialog from '../components/ConfirmDialog';
import { FileDown, FileUp, Download, Upload } from 'lucide-react';
import type { Topic, Session } from '../../shared/types';

interface ImportSummary {
  topics: number;
  sessions: number;
  templates: number;
}

export default function ExportPage() {
  const showToast = useAppStore((s) => s.showToast);

  // Topic export state
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [exportingTopic, setExportingTopic] = useState(false);

  // Backup state
  const [exportingAll, setExportingAll] = useState(false);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    const res = await sendMessage<Topic[]>({ type: 'GET_TOPICS' });
    if (res.ok) {
      setTopics(res.data);
    }
  };

  // --- Export Topic as Markdown ---
  const handleExportTopic = async () => {
    if (!selectedTopicId) {
      showToast('Please select a topic', 'error');
      return;
    }

    setExportingTopic(true);

    const topicRes = await sendMessage<{ topic: Topic; sessions: Session[] }>({
      type: 'EXPORT_TOPIC',
      payload: { topicId: selectedTopicId },
    });

    if (topicRes.ok) {
      const { topic, sessions } = topicRes.data;
      const markdown = exportTopicAsMarkdown(topic, sessions);
      downloadFile(`${sanitizeFilename(topic.title)}.md`, markdown, 'text/markdown');
      showToast('Topic exported as Markdown');
    } else {
      showToast(topicRes.error, 'error');
    }

    setExportingTopic(false);
  };

  // --- Export All as JSON ---
  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const json = await exportAllAsJSON();
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(`deepseek-manager-backup-${date}.json`, json, 'application/json');
      showToast('Backup exported successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error');
    }
    setExportingAll(false);
  };

  // --- Import from JSON ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      const summary: ImportSummary = {
        topics: Array.isArray(data.topics) ? data.topics.length : 0,
        sessions: Array.isArray(data.sessions) ? data.sessions.length : 0,
        templates: Array.isArray(data.templates) ? data.templates.length : 0,
      };

      setImportData(text);
      setImportSummary(summary);
    } catch {
      showToast('Invalid JSON file', 'error');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importData) return;

    setImporting(true);
    try {
      await importAllFromJSON(importData);
      showToast('Data imported successfully');
      loadTopics();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed', 'error');
    }
    setImporting(false);
    setImportData(null);
    setImportSummary(null);
  };

  const handleCancelImport = () => {
    setImportData(null);
    setImportSummary(null);
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Export / Import</h1>

      {/* Export Topic as Markdown */}
      <div className="card-static p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
            <FileDown className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Export Topic as Markdown</h2>
            <p className="text-xs text-slate-500">
              Export a topic and all its sessions as a formatted Markdown file.
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-slate-600 mb-1">Select Topic</label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="input"
            >
              <option value="">-- Select a topic --</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExportTopic}
            disabled={exportingTopic || !selectedTopicId}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exportingTopic ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Backup / Restore */}
      <div className="card-static p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FileUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Backup / Restore</h2>
            <p className="text-xs text-slate-500">
              Export or import all your data as a JSON backup file.
            </p>
          </div>
        </div>

        {/* Export All */}
        <div className="mb-6">
          <button
            onClick={handleExportAll}
            disabled={exportingAll}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exportingAll ? 'Exporting...' : 'Export All Data'}
          </button>
        </div>

        {/* Import */}
        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500 mb-3">
            Import data from a JSON backup file. This will replace all existing data.
          </p>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-brand-400 transition-colors">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Import confirmation dialog */}
      <ConfirmDialog
        open={!!importSummary}
        title="Confirm Import"
        message={
          importSummary
            ? `This will replace ALL existing data with the imported backup.\n\nThe backup contains:\n- ${importSummary.topics} topic(s)\n- ${importSummary.sessions} session(s)\n- ${importSummary.templates} template(s)\n\nAre you sure you want to proceed?`
            : ''
        }
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
      />
    </div>
  );
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60);
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
