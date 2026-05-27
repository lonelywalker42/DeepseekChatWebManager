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
    if (!tab?.id || !tab.url) return;

    if (statusEl) statusEl.textContent = 'Scraping...';

    let response: { success?: boolean; error?: string } | undefined;

    try {
      // Try sending message to existing content script
      response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_REQUEST' });
    } catch {
      // Content script not injected — try injecting it via scripting API
      if (statusEl) statusEl.textContent = 'Injecting scraper...';
      try {
        // Get content script path from manifest
        const manifest = chrome.runtime.getManifest();
        const contentScripts = manifest.content_scripts;
        if (contentScripts?.[0]?.js) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: contentScripts[0].js,
          });
          // Wait for script to initialize and inject UI
          await new Promise((r) => setTimeout(r, 1500));
          // Retry the scrape request
          response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_REQUEST' });
        }
      } catch (injectErr) {
        if (statusEl) statusEl.textContent = 'Please refresh the DeepSeek page first, then try again.';
        return;
      }
    }

    if (response?.success) {
      if (statusEl) statusEl.textContent = 'Session captured!';
      await loadStats();
    } else {
      if (statusEl) statusEl.textContent = response?.error || 'Scrape failed';
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Could not connect to page. Try refreshing the page.';
  }
});

// Initialize
loadStats();
checkCurrentTab();
