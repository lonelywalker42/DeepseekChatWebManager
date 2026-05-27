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
  /** The element whose innerText yields the visible message text */
  messageContent: string;
  /** Element containing the conversation / page title */
  chatTitle: string;
  /** Optional element that carries a per-message timestamp */
  timestampElement: string;
}

export const DEFAULT_SELECTORS: SelectorMap = {
  // DeepSeek wraps the entire conversation in a scrollable div.
  // Multiple candidate selectors; the first one that matches will be used.
  messageContainer:
    '[class*="conversation"]' +
    ', [class*="chat-container"]' +
    ', [id*="chat"]' +
    ', main [class*="scroll"]' +
    ', [class*="Messages"]',

  // Each conversational turn is typically a direct child element of the
  // container.  DeepSeek uses a wrapper per message.
  messageItem:
    '[class*="message"]' +
    ', [class*="Message"]' +
    ', [data-message-id]' +
    ', [class*="chat-message"]',

  // User messages are visually left-aligned and carry a distinct class.
  userMessage:
    '[class*="user"]' +
    ', [class*="User"]' +
    ', [class*="human"]' +
    ', [data-role="user"]',

  // Assistant messages are right-aligned / have a different accent.
  assistantMessage:
    '[class*="assistant"]' +
    ', [class*="Assistant"]' +
    ', [class*="bot"]' +
    ', [class*="ai-"]' +
    ', [data-role="assistant"]',

  // The actual text content node inside a message wrapper.
  messageContent:
    '[class*="content"]' +
    ', [class*="text"]' +
    ', [class*="markdown"]' +
    ', [class*="msg-body"]' +
    ', p',

  // The page title element that shows the conversation name.
  chatTitle:
    'title' +
    ', [class*="title"]' +
    ', [class*="Title"]' +
    ', h1' +
    ', [class*="conversation-title"]',

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
