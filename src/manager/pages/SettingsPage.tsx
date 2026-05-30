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
  const [selectors, setSelectors] = useState<SelectorMap>({ ...DEFAULT_SELECTORS });
  const [selectorsLoaded, setSelectorsLoaded] = useState(false);
  const [errors, setErrors] = useState<LogEntry[]>([]);
  const [clearStep, setClearStep] = useState<'idle' | 'warning' | 'confirm'>('idle');

  useEffect(() => { loadSelectors(); loadErrors(); }, []);

  const loadSelectors = async () => {
    try { const result = await chrome.storage.local.get('dsm_selectors'); if (result.dsm_selectors) setSelectors({ ...DEFAULT_SELECTORS, ...result.dsm_selectors }); } catch { /* use defaults */ }
    setSelectorsLoaded(true);
  };
  const loadErrors = async () => { setErrors(await getRecentErrors()); };
  const handleSelectorChange = (key: keyof SelectorMap, value: string) => setSelectors((prev) => ({ ...prev, [key]: value }));
  const handleSaveSelectors = async () => { try { await chrome.storage.local.set({ dsm_selectors: selectors }); showToast('Selectors saved'); } catch { showToast('Failed to save selectors', 'error'); } };
  const handleResetSelectors = async () => { try { await chrome.storage.local.remove('dsm_selectors'); setSelectors({ ...DEFAULT_SELECTORS }); showToast('Selectors reset to defaults'); } catch { showToast('Failed to reset selectors', 'error'); } };
  const handleClearErrors = async () => { await clearErrors(); setErrors([]); showToast('Error log cleared'); };

  const handleConfirmClearAll = async () => {
    try {
      const topicsRes = await sendMessage<any[]>({ type: 'GET_TOPICS' });
      if (topicsRes.ok) { for (const topic of topicsRes.data) { await sendMessage({ type: 'DELETE_TOPIC', payload: { id: topic.id } }); } }
      await chrome.storage.local.remove('dsm_selectors');
      await clearErrors();
      showToast('All data cleared');
      setClearStep('idle');
      setErrors([]);
    } catch { showToast('Failed to clear data', 'error'); setClearStep('idle'); }
  };

  if (!selectorsLoaded) return <div className="p-6"><div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading settings...</div></div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>Settings</h1>

      {/* DOM Selectors */}
      <div className="card-static p-6 mb-6">
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>DOM Selectors Configuration</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>Customize the CSS selectors used to parse the DeepSeek chat page.</p>
        <div className="space-y-3">
          {SELECTOR_KEYS.map((key) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{SELECTOR_LABELS[key]}</label>
              <input type="text" value={selectors[key]} onChange={(e) => handleSelectorChange(key, e.target.value)} className="input font-mono text-xs" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={handleSaveSelectors} className="btn-primary">Save</button>
          <button onClick={handleResetSelectors} className="btn-secondary">Reset to Defaults</button>
        </div>
      </div>

      {/* Error Log */}
      <div className="card-static p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Recent Errors</h2>
          {errors.length > 0 && <button onClick={handleClearErrors} className="btn-ghost text-xs">Clear Log</button>}
        </div>
        {errors.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>No errors recorded.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {errors.map((entry, idx) => (
              <div key={idx} className="text-xs pb-2 last:border-0" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-medium" style={{ color: 'var(--color-danger)' }}>{entry.message}</span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                {entry.details && <pre className="mt-1 whitespace-pre-wrap break-all text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{entry.details}</pre>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* About */}
      <div className="card-static p-6 mb-6">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>About</h2>
        <div className="text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
          <p><span className="font-medium">DeepSeekChat Manager</span> v0.1.0</p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>A Chrome extension for organizing, searching, and managing your DeepSeek AI chat conversations.</p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card-static p-6" style={{ borderColor: 'var(--color-danger)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-danger)' }}>Danger Zone</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>These actions are irreversible. Please be careful.</p>
        {clearStep === 'idle' && <button onClick={() => setClearStep('warning')} className="btn-danger">Clear All Data</button>}
        {clearStep === 'warning' && (
          <div className="rounded-lg p-4" style={{ border: '1px solid var(--color-danger)', backgroundColor: 'var(--color-danger-subtle)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-danger)' }}>Warning: This will permanently delete ALL your data.</p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>All topics, sessions, templates, and settings will be removed. This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={handleConfirmClearAll} className="btn-danger">Yes, Delete Everything</button>
              <button onClick={() => setClearStep('idle')} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
