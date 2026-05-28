/**
 * Configurable DOM selectors for parsing the DeepSeek chat page.
 *
 * The defaults are tuned for the current chat.deepseek.com DOM.
 * If the site changes its markup, update the values in
 * chrome.storage.local under the key "dsm_selectors" and the
 * extension will pick them up without a code change.
 */

export interface SelectorMap {
  /** Scrollable container that holds all message turns */
  messageContainer: string;
  /** Each individual message turn (user + assistant pair or single) */
  messageItem: string;
  /** Wrapper that marks a user-authored message */
  userMessage: string;
  /** Wrapper that marks an assistant-authored message */
  assistantMessage: string;
  /** Wrapper that marks a thinking/reasoning block */
  thinkingMessage: string;
  /** The element whose innerText yields the visible message text */
  messageContent: string;
  /** Element containing the conversation / page title */
  chatTitle: string;
  /** Optional element that carries a per-message timestamp */
  timestampElement: string;
}

export const DEFAULT_SELECTORS: SelectorMap = {
  // DeepSeek uses a virtual list as the scrollable message container.
  // The actual visible items are nested: .ds-virtual-list > .ds-virtual-list-items > .ds-virtual-list-visible-items
  messageContainer:
    '.ds-virtual-list' +
    ', .ds-virtual-list-items' +
    ', .ds-virtual-list-visible-items' +
    ', [class*="conversation"]' +
    ', [class*="chat-container"]' +
    ', [id*="chat"]',

  // Each message turn is a .ds-message element inside the virtual list.
  // IMPORTANT: Do NOT use [class*="message"] — it matches inner content
  // elements like .ds-assistant-message-main-content, causing duplicates.
  messageItem:
    '.ds-message' +
    ', [data-message-id]',

  // User messages have .ds-message WITH a hash prefix class (e.g. "d29f3d7d ds-message").
  // Assistant messages have .ds-message WITHOUT the hash prefix.
  // We detect user by checking for the hash class pattern, or by exclusion.
  // The :not(.ds-assistant-message-main-content) approach helps distinguish.
  userMessage:
    '[class*="ds-message"]:not(:has(.ds-assistant-message-main-content))' +
    ', [class*="user"]' +
    ', [class*="User"]' +
    ', [data-role="user"]',

  // Assistant messages contain .ds-assistant-message-main-content inside.
  assistantMessage:
    ':has(> .ds-assistant-message-main-content)' +
    ', :has(.ds-markdown.ds-assistant-message-main-content)' +
    ', [class*="assistant"]' +
    ', [class*="Assistant"]' +
    ', [data-role="assistant"]',

  // Thinking/reasoning blocks from DeepSeek Deep Think mode.
  thinkingMessage:
    '.ds-thinking' +
    ', [class*="ds-thinking"]' +
    ', [class*="thinking"]' +
    ', [class*="Thinking"]' +
    ', [data-thinking]',

  // The text content node inside a message.
  // Assistant: .ds-markdown.ds-assistant-message-main-content
  // User: the inner div with a hash class (fallback to any child div).
  messageContent:
    '.ds-markdown.ds-assistant-message-main-content' +
    ', .ds-assistant-message-main-content' +
    ', [class*="markdown"]' +
    ', [class*="content"]' +
    ', [class*="text"]' +
    ', p',

  // The page title: document.title follows "Topic Title - DeepSeek" pattern.
  chatTitle:
    'title' +
    ', [class*="title"]' +
    ', [class*="Title"]' +
    ', h1',

  // Timestamps, if present.
  timestampElement:
    '[class*="time"]' +
    ', [class*="Time"]' +
    ', time' +
    ', [class*="date"]' +
    ', [class*="timestamp"]',
};

const STORAGE_KEY = 'dsm_selectors';

/**
 * Returns the active selector map.
 * Checks chrome.storage.local for user overrides first, then falls back
 * to DEFAULT_SELECTORS.  Any partial override is merged with the defaults.
 */
export async function getSelectors(): Promise<SelectorMap> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    if (stored[STORAGE_KEY]) {
      return { ...DEFAULT_SELECTORS, ...stored[STORAGE_KEY] };
    }
  } catch {
    // storage may be unavailable in some contexts; fall through
  }
  return { ...DEFAULT_SELECTORS };
}
