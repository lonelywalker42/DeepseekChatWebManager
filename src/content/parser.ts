/**
 * DOM parsing logic for extracting conversation data from chat.deepseek.com.
 *
 * All helpers are pure-DOM and do not communicate with the extension
 * background — that responsibility belongs to the content-script entry
 * point (index.ts).
 */

import type { Message, ScrapedSessionData } from '../shared/types';
import type { SelectorMap } from './selectors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the first element matching any of the comma-separated selectors
 * within `root`, or null.
 */
function queryFirst(root: ParentNode, selector: string): Element | null {
  // selector may contain commas (multiple selectors); querySelectorAll
  // handles that natively, but we want the first match across all of them.
  const parts = selector.split(',').map((s) => s.trim());
  for (const part of parts) {
    const el = root.querySelector(part);
    if (el) return el;
  }
  return null;
}

/**
 * Returns all elements matching any of the comma-separated selectors
 * within `root`.
 */
function queryAll(root: ParentNode, selector: string): Element[] {
  const parts = selector.split(',').map((s) => s.trim());
  const results: Element[] = [];
  const seen = new Set<Element>();
  for (const part of parts) {
    for (const el of Array.from(root.querySelectorAll(part))) {
      if (!seen.has(el)) {
        seen.add(el);
        results.push(el);
      }
    }
  }
  return results;
}

/**
 * Determine whether `el` is (or is inside) a user-message container.
 */
function isUserMessage(el: Element, selectors: SelectorMap): boolean {
  const userSelParts = selectors.userMessage.split(',').map((s) => s.trim());
  for (const part of userSelParts) {
    // Check the element itself and any ancestor up to the messageItem
    if (el.matches(part)) return true;
    if (el.closest(part)) return true;
  }
  return false;
}

/**
 * Determine whether `el` is (or is inside) an assistant-message container.
 */
function isAssistantMessage(el: Element, selectors: SelectorMap): boolean {
  const asstSelParts = selectors.assistantMessage
    .split(',')
    .map((s) => s.trim());
  for (const part of asstSelParts) {
    if (el.matches(part)) return true;
    if (el.closest(part)) return true;
  }
  return false;
}

/**
 * Extract the visible text content from a message element.
 */
function extractContent(msgEl: Element, selectors: SelectorMap): string {
  const contentEl = queryFirst(msgEl, selectors.messageContent);
  if (contentEl) {
    return (contentEl as HTMLElement).innerText.trim();
  }
  // Fallback: use the whole element's text
  return (msgEl as HTMLElement).innerText.trim();
}

/**
 * Extract a timestamp string from a message element, if available.
 */
function extractTimestamp(
  msgEl: Element,
  selectors: SelectorMap,
): string | undefined {
  const timeEl = queryFirst(msgEl, selectors.timestampElement);
  if (timeEl) {
    return (
      timeEl.getAttribute('datetime') ||
      (timeEl as HTMLElement).innerText.trim() ||
      undefined
    );
  }
  return undefined;
}

/**
 * Derive the conversation title from the page.
 */
function extractTitle(selectors: SelectorMap): string {
  // Try the document <title> first (most reliable)
  const docTitle = document.title?.trim();
  if (docTitle && docTitle.length > 0 && docTitle !== 'DeepSeek') {
    // DeepSeek titles often look like "Chat Title | DeepSeek" or similar
    return docTitle.replace(/\s*[|\-–—]\s*DeepSeek\s*$/i, '').trim() || docTitle;
  }

  // Fall back to an in-page heading
  const titleEl = queryFirst(document, selectors.chatTitle);
  if (titleEl) {
    return (titleEl as HTMLElement).innerText.trim();
  }

  return 'Untitled Conversation';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse all visible messages from the current DeepSeek chat page.
 *
 * @returns ScrapedSessionData with the page URL, title, and messages.
 * @throws If the page has no parseable messages.
 */
export function parseConversation(selectors: SelectorMap): ScrapedSessionData {
  const title = extractTitle(selectors);

  // Find the main message container
  const container = queryFirst(document, selectors.messageContainer);
  if (!container) {
    throw new Error(
      'Could not find the message container on this page. ' +
        'The page layout may have changed — try updating selectors in extension settings.',
    );
  }

  // Collect individual message items
  const messageItems = queryAll(container, selectors.messageItem);
  if (messageItems.length === 0) {
    throw new Error(
      'Found the message container but no messages inside. ' +
        'The conversation may be empty or still loading.',
    );
  }

  const messages: Message[] = [];

  for (const msgEl of messageItems) {
    let role: Message['role'];

    if (isUserMessage(msgEl, selectors)) {
      role = 'user';
    } else if (isAssistantMessage(msgEl, selectors)) {
      role = 'assistant';
    } else {
      // If we cannot determine the role, skip this element to avoid
      // polluting the scraped data with UI chrome (e.g. input boxes).
      continue;
    }

    const content = extractContent(msgEl, selectors);
    if (!content) continue; // skip empty wrappers

    const timestamp = extractTimestamp(msgEl, selectors);

    messages.push({ role, content, ...(timestamp ? { timestamp } : {}) });
  }

  if (messages.length === 0) {
    throw new Error(
      'No messages could be extracted. The page may still be loading — ' +
        'wait a moment and try again.',
    );
  }

  return {
    title,
    sourceUrl: window.location.href,
    messages,
  };
}

/**
 * Extract only the last assistant message from the page.
 *
 * Useful for "Scrape Summary" — the user may have asked DeepSeek
 * to summarise the conversation and we just grab that answer.
 *
 * @throws If no assistant message is found.
 */
export function parseLastAssistantMessage(selectors: SelectorMap): string {
  const container = queryFirst(document, selectors.messageContainer);
  if (!container) {
    throw new Error('Could not find the message container on this page.');
  }

  const messageItems = queryAll(container, selectors.messageItem);

  // Walk backwards to find the last assistant message quickly
  for (let i = messageItems.length - 1; i >= 0; i--) {
    const msgEl = messageItems[i];
    if (isAssistantMessage(msgEl, selectors)) {
      const content = extractContent(msgEl, selectors);
      if (content) return content;
    }
  }

  throw new Error(
    'No assistant message found on this page. ' +
      'Make sure the assistant has replied before scraping.',
  );
}
