import { sendMessage } from './shared/messaging';
import type { Topic, Session } from './shared/types';

async function loadStats() {
  try {
    const topicsRes = await sendMessage<Topic[]>({ type: 'GET_TOPICS' });
    if (topicsRes.ok) {
      const topicCountEl = document.getElementById('topic-count');
      if (topicCountEl) topicCountEl.textContent = String(topicsRes.data.length);

      // Count all sessions across all topics
      let totalSessions = 0;
      for (const topic of topicsRes.data) {
        const sessionsRes = await sendMessage<Session[]>({
          type: 'GET_SESSIONS',
          payload: { topicId: topic.id },
        });
        if (sessionsRes.ok) {
          totalSessions += sessionsRes.data.length;
        }
      }
      const sessionCountEl = document.getElementById('session-count');
      if (sessionCountEl) sessionCountEl.textContent = String(totalSessions);
    }
  } catch {
    // ignore errors in popup stats
  }
}

async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const scrapeBtn = document.getElementById('scrape-page') as HTMLButtonElement | null;
    const statusEl = document.getElementById('status-message');

    if (tab?.url?.includes('deepseek.com') && scrapeBtn) {
      scrapeBtn.disabled = false;
      scrapeBtn.title = '';
    } else if (statusEl) {
      statusEl.textContent = 'Navigate to deepseek.com to scrape';
    }
  } catch {
    // ignore
  }
}

// Open Manager
document.getElementById('open-manager')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/manager/index.html') });
});

// Scrape Current Page
document.getElementById('scrape-page')?.addEventListener('click', async () => {
  const statusEl = document.getElementById('status-message');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    if (statusEl) statusEl.textContent = 'Scraping...';

    // Send message to content script to scrape
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_REQUEST' });

    if (response?.success) {
      if (statusEl) statusEl.textContent = 'Session captured!';
      // Refresh stats
      await loadStats();
    } else {
      if (statusEl) statusEl.textContent = response?.error || 'Scrape failed';
    }
  } catch {
    if (statusEl) statusEl.textContent = 'Could not connect to page';
  }
});

// Initialize
loadStats();
checkCurrentTab();
