import { useState, useEffect } from 'react';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
import { DEFAULT_SELECTORS, SelectorMap } from '../../content/selectors';
import { getRecentErrors, clearErrors, LogEntry } from '../../shared/utils/logger';
import ConfirmDialog from '../components/ConfirmDialog';

const SELECTOR_LABELS: Record<keyof SelectorMap, string> = {
  messageContainer: 'Message Container',
  messageItem: 'Message Item',
  userMessage: 'User Message',
  assistantMessage: 'Assistant Message',
  thinkingMessage: 'Thinking Block',
  messageContent: 'Message Content',
  chatTitle: 'Chat Title',
  timestampElement: 'Timestamp Element',
};

const SELECTOR_KEYS = Object.keys(DEFAULT_SELECTORS) as (keyof SelectorMap)[];

export default function SettingsPage() {
  const showToast = useAppStore((s) => s.showToast);

  // Selector overrides state
  const [selectors, setSelectors] = useState<SelectorMap>({ ...DEFAULT_SELECTORS });
  const [selectorsLoaded, setSelectorsLoaded] = useState(false);

  // Error log state
  const [errors, setErrors] = useState<LogEntry[]>([]);

  // Clear all data state
  const [clearStep, setClearStep] = useState<'idle' | 'warning' | 'confirm'>('idle');

  useEffect(() => {
    loadSelectors();
    loadErrors();
  }, []);

  const loadSelectors = async () => {
    try {
      const result = await chrome.storage.local.get('dsm_selectors');
      if (result.dsm_selectors) {
        setSelectors({ ...DEFAULT_SELECTORS, ...result.dsm_selectors });
      }
    } catch {
      // use defaults
    }
    setSelectorsLoaded(true);
  };

  const loadErrors = async () => {
    const recentErrors = await getRecentErrors();
    setErrors(recentErrors);
  };

  const handleSelectorChange = (key: keyof SelectorMap, value: string) => {
    setSelectors((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSelectors = async () => {
    try {
      await chrome.storage.local.set({ dsm_selectors: selectors });
      showToast('Selectors saved');
    } catch {
      showToast('Failed to save selectors', 'error');
    }
  };

  const handleResetSelectors = async () => {
    try {
      await chrome.storage.local.remove('dsm_selectors');
      setSelectors({ ...DEFAULT_SELECTORS });
      showToast('Selectors reset to defaults');
    } catch {
      showToast('Failed to reset selectors', 'error');
    }
  };

  const handleClearErrors = async () => {
    await clearErrors();
    setErrors([]);
    showToast('Error log cleared');
  };

  // Clear all data - double confirmation
  const handleClearAllClick = () => {
    if (clearStep === 'idle') {
      setClearStep('warning');
    }
  };

  const handleConfirmClearAll = async () => {
    try {
      // Send DELETE messages for all data
      const topicsRes = await sendMessage<any[]>({ type: 'GET_TOPICS' });
      if (topicsRes.ok) {
        for (const topic of topicsRes.data) {
          await sendMessage({ type: 'DELETE_TOPIC', payload: { id: topic.id } });
        }
      }
      // Clear selectors
      await chrome.storage.local.remove('dsm_selectors');
      // Clear error log
      await clearErrors();

      showToast('All data cleared');
      setClearStep('idle');
      setErrors([]);
    } catch {
      showToast('Failed to clear data', 'error');
      setClearStep('idle');
    }
  };

  if (!selectorsLoaded) {
    return (
      <div className="p-6">
        <div className="text-slate-500 text-sm">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Settings</h1>

      {/* DOM Selectors Configuration */}
      <div className="card-static p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">DOM Selectors Configuration</h2>
        <p className="text-xs text-slate-500 mb-4">
          Customize the CSS selectors used to parse the DeepSeek chat page. Changes here will be
          used instead of the defaults.
        </p>

        <div className="space-y-3">
          {SELECTOR_KEYS.map((key) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {SELECTOR_LABELS[key]}
              </label>
              <input
                type="text"
                value={selectors[key]}
                onChange={(e) => handleSelectorChange(key, e.target.value)}
                className="input font-mono text-xs"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={handleSaveSelectors} className="btn-primary">
            Save
          </button>
          <button onClick={handleResetSelectors} className="btn-secondary">
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Error Log */}
      <div className="card-static p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Recent Errors</h2>
          {errors.length > 0 && (
            <button onClick={handleClearErrors} className="btn-ghost text-xs">
              Clear Log
            </button>
          )}
        </div>

        {errors.length === 0 ? (
          <p className="text-xs text-slate-400">No errors recorded.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {errors.map((entry, idx) => (
              <div key={idx} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-red-600 font-medium">{entry.message}</span>
                  <span className="text-slate-400">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                {entry.details && (
                  <pre className="text-slate-500 mt-1 whitespace-pre-wrap break-all text-[11px]">
                    {entry.details}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* About */}
      <div className="card-static p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">About</h2>
        <div className="text-sm text-slate-600 space-y-1">
          <p>
            <span className="font-medium">DeepSeekChat Manager</span> v0.1.0
          </p>
          <p className="text-xs text-slate-500">
            A Chrome extension for organizing, searching, and managing your DeepSeek AI chat
            conversations. Capture sessions, group them into topics, search across all your
            conversations, and export your data.
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card-static p-6 border-red-200">
        <h2 className="text-sm font-semibold text-red-700 mb-1">Danger Zone</h2>
        <p className="text-xs text-slate-500 mb-4">
          These actions are irreversible. Please be careful.
        </p>

        {clearStep === 'idle' && (
          <button onClick={handleClearAllClick} className="btn-danger">
            Clear All Data
          </button>
        )}

        {clearStep === 'warning' && (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <p className="text-sm text-red-700 font-medium mb-2">
              Warning: This will permanently delete ALL your data.
            </p>
            <p className="text-xs text-red-600 mb-3">
              All topics, sessions, templates, and settings will be removed. This action cannot be
              undone.
            </p>
            <div className="flex gap-2">
              <button onClick={handleConfirmClearAll} className="btn-danger">
                Yes, Delete Everything
              </button>
              <button onClick={() => setClearStep('idle')} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
