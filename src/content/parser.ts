/**
 * DOM parsing logic for extracting conversation data from chat.deepseek.com.
 *
 * All helpers are pure-DOM and do not communicate with the extension
 * background — that responsibility belongs to the content-script entry
 * point (index.ts).
 */

import TurndownService from 'turndown';
import type { Message, ScrapedSessionData } from '../shared/types';
import type { SelectorMap } from './selectors';

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

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
 * Determine whether `el` is a thinking/reasoning block.
 *
 * DeepSeek DOM: thinking blocks from Deep Think mode are wrapped in
 * elements with thinking-related CSS classes.
 */
function isThinkingMessage(el: Element, selectors: SelectorMap): boolean {
  const thinkSelParts = selectors.thinkingMessage.split(',').map((s) => s.trim());
  for (const part of thinkSelParts) {
    try {
      if (el.matches(part)) return true;
      if (el.querySelector(part)) return true;
      if (el.closest(part)) return true;
    } catch {
      // selector may throw in some contexts; ignore
    }
  }
  return false;
}

/**
 * Determine whether `el` is (or is inside) a user-message container.
 *
 * DeepSeek DOM: user messages are `.ds-message` elements that do NOT
 * contain `.ds-assistant-message-main-content`.
 */
function isUserMessage(el: Element, selectors: SelectorMap): boolean {
  // Primary: if the element contains assistant content, it's NOT a user message
  if (el.querySelector('.ds-assistant-message-main-content')) return false;

  // Check for assistant content in reverse — if found, it's assistant
  if (isAssistantMessage(el, selectors)) return false;

  // Not a user message if it's a thinking block
  if (isThinkingMessage(el, selectors)) return false;

  // Fallback: check user-specific selectors
  const userSelParts = selectors.userMessage.split(',').map((s) => s.trim());
  for (const part of userSelParts) {
    try {
      if (el.matches(part)) return true;
      if (el.closest(part)) return true;
    } catch {
      // :has() may throw in some contexts; ignore
    }
  }

  // If the element has class "ds-message" and no assistant content, treat as user
  if (el.classList.contains('ds-message')) return true;

  return false;
}

/**
 * Determine whether `el` is (or is inside) an assistant-message container.
 *
 * DeepSeek DOM: assistant messages contain `.ds-assistant-message-main-content`.
 */
function isAssistantMessage(el: Element, selectors: SelectorMap): boolean {
  // Primary: check for the assistant content marker
  if (el.querySelector('.ds-assistant-message-main-content')) return true;
  if (el.querySelector('.ds-markdown.ds-assistant-message-main-content')) return true;

  // Fallback: check assistant-specific selectors
  const asstSelParts = selectors.assistantMessage
    .split(',')
    .map((s) => s.trim());
  for (const part of asstSelParts) {
    try {
      if (el.matches(part)) return true;
      if (el.closest(part)) return true;
    } catch {
      // :has() may throw in some contexts; ignore
    }
  }

  return false;
}

/**
 * Convert an HTML element's content to markdown, preserving formatting
 * like headings, bold, italic, code blocks, lists, and formulas.
 */
function htmlToMarkdown(el: Element): string {
  const html = (el as HTMLElement).innerHTML;
  return turndown.turndown(html).trim();
}

/**
 * Extract the visible text content from a message element.
 *
 * For assistant/thinking messages, HTML-to-markdown conversion preserves
 * headings, formulas, code blocks, and other formatting.
 * For user messages, plain text extraction is used since they rarely
 * contain rich formatting.
 */
function extractContent(msgEl: Element, selectors: SelectorMap, role?: string): string {
  // For thinking blocks: try the thinking content element first
  if (role === 'thinking') {
    const thinkContent = msgEl.querySelector(
      '[class*="thinking-content"], [class*="ds-thinking-content"], [class*="think"]',
    );
    if (thinkContent) {
      return htmlToMarkdown(thinkContent);
    }
    // Fallback to the element's own markdown
    return htmlToMarkdown(msgEl);
  }

  // For assistant messages: use the specific ds-markdown content element
  const assistantContent = msgEl.querySelector(
    '.ds-markdown.ds-assistant-message-main-content',
  );
  if (assistantContent) {
    return htmlToMarkdown(assistantContent);
  }

  // For user messages: the content is in a direct child div (hash class).
  // Try the configured selectors first.
  const contentEl = queryFirst(msgEl, selectors.messageContent);
  if (contentEl && contentEl !== msgEl) {
    // Use innerText for user messages (they rarely have rich formatting)
    return (contentEl as HTMLElement).innerText.trim();
  }

  // Fallback: for user messages, grab the first child div's text
  if (msgEl.children.length === 1 && msgEl.children[0] instanceof HTMLDivElement) {
    return (msgEl.children[0] as HTMLElement).innerText.trim();
  }

  // Last resort: use the whole element's text
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

    if (isThinkingMessage(msgEl, selectors)) {
      role = 'thinking';
    } else if (isUserMessage(msgEl, selectors)) {
      role = 'user';
    } else if (isAssistantMessage(msgEl, selectors)) {
      role = 'assistant';
    } else {
      // If we cannot determine the role, skip this element to avoid
      // polluting the scraped data with UI chrome (e.g. input boxes).
      continue;
    }

    const content = extractContent(msgEl, selectors, role);
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
