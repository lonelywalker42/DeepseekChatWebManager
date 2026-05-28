/**
 * Content script entry point for DeepSeek Chat Manager (Phase 2).
 *
 * Injects the scraper UI on chat.deepseek.com pages and wires up the
 * scrape / scrape-summary flows end-to-end.
 */

import { getSelectors } from './selectors';
import { parseConversation, parseLastAssistantMessage } from './parser';
import {
  injectScraperUI,
  showNotification,
  showConflictPrompt,
  showTopicSelector,
  showCurrentTopicBadge,
} from './scraper-ui';

// Inline sendMessage to avoid shared dependency with background script
// (shared imports cause @crxjs to bundle content + background together)
interface ContentSession {
  id: string;
  topicId: string;
  title: string;
  sourceUrl: string;
}

interface ContentResponse {
  ok: boolean;
  error?: string;
  conflict?: boolean;
  existingSession?: ContentSession;
  data?: unknown;
}

async function sendMessage(msg: Record<string, unknown>): Promise<ContentResponse> {
  return chrome.runtime.sendMessage(msg);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[DeepSeekManager]';
const DEEPSEEK_HOST_PATTERN = /(^|\.)deepseek\.com$/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Are we on a DeepSeek chat page? */
function isDeepSeekPage(): boolean {
  return DEEPSEEK_HOST_PATTERN.test(window.location.hostname);
}

/** Wait until the document is ready (DOMContentLoaded at minimum). */
function waitForReady(): Promise<void> {
  return new Promise((resolve) => {
    if (
      document.readyState === 'complete' ||
      document.readyState === 'interactive'
    ) {
      resolve();
    } else {
      document.addEventListener('DOMContentLoaded', () => resolve(), {
        once: true,
      });
    }
  });
}

/**
 * Wait until at least one message element is visible in the DOM.
 * This avoids scraping before React/Vue hydration finishes.
 */
function waitForMessages(selectors: Awaited<ReturnType<typeof getSelectors>>, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    // Quick check first
    const containerParts = selectors.messageContainer
      .split(',')
      .map((s) => s.trim());
    const itemParts = selectors.messageItem.split(',').map((s) => s.trim());

    function check(): boolean {
      for (const cPart of containerParts) {
        const container = document.querySelector(cPart);
        if (container) {
          for (const iPart of itemParts) {
            if (container.querySelector(iPart)) return true;
          }
        }
      }
      return false;
    }

    if (check()) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      observer.disconnect();
      // Don't hard-fail — the parser itself will surface a clearer error.
      resolve();
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      if (check()) {
        clearTimeout(timeout);
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

/**
 * Scroll through the message container to force the virtual list to render
 * all messages. Scrolls to the top first, then incrementally to the bottom,
 * waiting for new messages to appear at each step.
 */
async function scrollToLoadAllMessages(
  selectors: Awaited<ReturnType<typeof getSelectors>>,
): Promise<void> {
  const containerParts = selectors.messageContainer
    .split(',')
    .map((s) => s.trim());
  const itemParts = selectors.messageItem.split(',').map((s) => s.trim());

  // Find the scrollable container
  let container: Element | null = null;
  for (const cPart of containerParts) {
    container = document.querySelector(cPart);
    if (container) break;
  }
  if (!container) return;

  function countMessages(): number {
    let count = 0;
    for (const iPart of itemParts) {
      count += container!.querySelectorAll(iPart).length;
    }
    return count;
  }

  // Scroll to top first
  (container as HTMLElement).scrollTop = 0;
  await new Promise((r) => setTimeout(r, 300));

  // Incrementally scroll down to load all messages
  const scrollStep = Math.floor((container as HTMLElement).clientHeight * 0.8);
  let prevCount = 0;
  let stableRounds = 0;

  for (let i = 0; i < 200; i++) {
    const currentCount = countMessages();

    if (currentCount === prevCount) {
      stableRounds++;
      if (stableRounds >= 3) break; // No new messages after 3 scrolls
    } else {
      stableRounds = 0;
    }
    prevCount = currentCount;

    (container as HTMLElement).scrollTop += scrollStep;
    await new Promise((r) => setTimeout(r, 400));
  }

  // Scroll back to bottom so the user sees the latest messages
  (container as HTMLElement).scrollTop = (container as HTMLElement).scrollHeight;
  await new Promise((r) => setTimeout(r, 200));
}

// ---------------------------------------------------------------------------
// Scrape All
// ---------------------------------------------------------------------------

async function handleScrapeAll(): Promise<void> {
  showNotification('Scraping conversation...', 'info');

  try {
    const selectors = await getSelectors();
    await waitForMessages(selectors);
    await scrollToLoadAllMessages(selectors);
    const data = parseConversation(selectors);

    // Show topic selector BEFORE creating the session to avoid
    // creating an unnecessary __uncategorized__ topic.
    const topicChoice = await showTopicSelector();

    let topicId: string | undefined;

    if (topicChoice.kind === 'skip') {
      // Leave topicId undefined — background will assign __uncategorized__
      topicId = undefined;
    } else if (topicChoice.kind === 'create') {
      const createTopicResp = await sendMessage({
        type: 'CREATE_TOPIC',
        payload: {
          title: topicChoice.title,
          type: 'other',
          status: 'active',
          tags: [],
          progressSummary: '',
        },
      });
      if (!createTopicResp.ok) {
        showNotification(`Failed to create topic: ${createTopicResp.error}`, 'error');
        return;
      }
      topicId = (createTopicResp.data as { id: string }).id;
    } else {
      topicId = topicChoice.topicId;
    }

    const payload: Record<string, unknown> = { ...data };
    if (topicId) payload.topicId = topicId;

    const response = await sendMessage({ type: 'SCRAPE_SESSION', payload });

    if (response.ok) {
      showNotification(
        `Saved "${data.title}" with ${data.messages.length} messages.`,
        'success',
      );
      return;
    }

    if ('conflict' in response && response.conflict) {
      const existing = response.existingSession as ContentSession;
      const choice = await showConflictPrompt(existing.title);

      if (choice === 'cancel') {
        showNotification('Scrape cancelled.', 'warn');
        return;
      }

      if (choice === 'update') {
        const updateResp = await sendMessage({
          type: 'UPDATE_SESSION',
          payload: {
            id: existing.id,
            changes: {
              messages: data.messages,
              title: data.title,
            },
          },
        });
        if (updateResp.ok) {
          showNotification(`Updated "${data.title}".`, 'success');
        } else {
          showNotification(
            `Update failed: ${'error' in updateResp ? updateResp.error : 'Unknown error'}`,
            'error',
          );
        }
        return;
      }

      // choice === 'new' — force-create by sending CREATE_SESSION directly
      const createResp = await sendMessage({
        type: 'CREATE_SESSION',
        payload: { ...data, topicId: existing.topicId },
      });
      if (createResp.ok) {
        showNotification(
          `Created new session "${data.title}".`,
          'success',
        );
      } else {
        showNotification(
          `Create failed: ${'error' in createResp ? createResp.error : 'Unknown error'}`,
          'error',
        );
      }
      return;
    }

    // Generic error
    showNotification(
      `Error: ${'error' in response ? response.error : 'Unknown error'}`,
      'error',
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} Scrape error:`, msg);
    showNotification(`Scrape failed: ${msg}`, 'error');
  }
}

// ---------------------------------------------------------------------------
// Scrape Summary
// ---------------------------------------------------------------------------

async function handleScrapeSummary(): Promise<void> {
  showNotification('Scraping last assistant message...', 'info');

  try {
    const selectors = await getSelectors();
    await waitForMessages(selectors);
    const summaryText = parseLastAssistantMessage(selectors);

    // We need the current URL to locate the existing session
    const sessionUrl = window.location.href;

    const response = await sendMessage({
      type: 'SCRAPE_SUMMARY',
      payload: { sessionUrl, summaryText },
    });

    if (response.ok) {
      showNotification('Summary saved successfully.', 'success');
    } else {
      showNotification(
        `Error: ${'error' in response ? response.error : 'Unknown error'}`,
        'error',
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} Summary scrape error:`, msg);
    showNotification(`Summary scrape failed: ${msg}`, 'error');
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!isDeepSeekPage()) {
    console.log(`${LOG_PREFIX} Not a DeepSeek page, skipping content script.`);
    return;
  }

  console.log(`${LOG_PREFIX} Content script loaded on ${window.location.href}`);

  await waitForReady();

  // Give the SPA a moment to hydrate before injecting UI
  await new Promise((r) => setTimeout(r, 500));

  injectScraperUI(handleScrapeAll, handleScrapeSummary);

  // Check if the current page is already saved to a real topic (not uncategorized)
  // and show topic badge in the top-right corner.
  try {
    const resp = await sendMessage({
      type: 'GET_SESSION_BY_URL',
      payload: { url: window.location.href },
    });
    if (resp.ok && resp.data) {
      const { topic } = resp.data as { session: ContentSession; topic: { id: string; title: string } | null };
      // Only show badge if the session is assigned to a real topic (not __uncategorized__)
      if (topic?.title && topic.id !== '__uncategorized__') {
        showCurrentTopicBadge(topic.title);
      }
    }
  } catch {
    // Silently ignore — badge is a nice-to-have
  }

  // Listen for messages from the popup (chrome.tabs.sendMessage)
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === 'SCRAPE_REQUEST') {
      handleScrapeAll()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: String(err) }));
      return true; // keep channel open for async response
    }
  });

  console.log(`${LOG_PREFIX} Scraper UI injected.`);
}

main();
