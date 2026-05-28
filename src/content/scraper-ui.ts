/**
 * Injected UI for triggering scraping from the DeepSeek page.
 *
 * All styles are applied via an injected <style> element or inline styles
 * so that the content script does not depend on any external CSS (Tailwind,
 * etc.).
 */

// ---------------------------------------------------------------------------
// Style injection
// ---------------------------------------------------------------------------

const STYLE_ID = 'dsm-scraper-styles';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* --- Floating Action Button --- */
    #dsm-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    #dsm-fab-toggle {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: #fff;
      font-size: 22px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease;
    }
    #dsm-fab-toggle:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5);
    }
    #dsm-fab-toggle.dsm-rotated {
      transform: rotate(45deg);
    }

    #dsm-fab-menu {
      display: none;
      flex-direction: column;
      gap: 6px;
      opacity: 0;
      transform: translateY(8px) scale(0.95);
      transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    #dsm-fab-menu.dsm-open {
      display: flex;
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .dsm-fab-action {
      padding: 10px 18px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      background: rgba(255, 255, 255, 0.95);
      color: #1e293b;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;
    }
    .dsm-fab-action:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
      transform: translateY(-1px);
    }
    .dsm-fab-action:active {
      transform: scale(0.96);
    }

    #dsm-btn-scrape {
      border-left: 3px solid #2563eb;
    }

    #dsm-btn-summary {
      border-left: 3px solid #059669;
    }

    /* --- Notification toast --- */
    #dsm-notification {
      position: fixed;
      bottom: 120px;
      right: 24px;
      z-index: 2147483647;
      max-width: 360px;
      padding: 12px 18px;
      border-radius: 12px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.45;
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      opacity: 0;
      transform: translateX(100%);
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
    }
    #dsm-notification.dsm-visible {
      opacity: 1;
      transform: translateX(0);
      pointer-events: auto;
    }
    #dsm-notification.dsm-info {
      border-left: 4px solid #3b82f6;
    }
    #dsm-notification.dsm-success {
      border-left: 4px solid #10b981;
    }
    #dsm-notification.dsm-error {
      border-left: 4px solid #ef4444;
    }
    #dsm-notification.dsm-warn {
      border-left: 4px solid #f59e0b;
    }

    /* --- Dialog overlay (shared by conflict + topic selector) --- */
    .dsm-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      animation: dsm-fade-in 0.2s ease-out;
    }

    @keyframes dsm-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes dsm-scale-in {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .dsm-dialog {
      background: #1e293b;
      color: #f1f5f9;
      border-radius: 16px;
      padding: 28px 32px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
      animation: dsm-scale-in 0.2s ease-out;
      border: 1px solid #334155;
    }

    .dsm-dialog h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      font-weight: 700;
    }

    .dsm-dialog p {
      margin: 0 0 20px 0;
      font-size: 13px;
      color: #d1d5db;
      line-height: 1.5;
    }

    .dsm-dialog-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .dsm-dialog-btn {
      padding: 8px 18px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .dsm-btn-primary {
      background: #2563eb;
      color: #fff;
    }
    .dsm-btn-primary:hover {
      background: #1d4ed8;
    }

    .dsm-btn-secondary {
      background: #4b5563;
      color: #f9fafb;
    }
    .dsm-btn-secondary:hover {
      background: #374151;
    }

    .dsm-btn-cancel {
      background: transparent;
      color: #9ca3af;
    }
    .dsm-btn-cancel:hover {
      color: #d1d5db;
    }

    /* --- Topic selector specific --- */
    #dsm-topic-overlay .dsm-dialog {
      max-width: 460px;
    }

    .dsm-topic-list {
      max-height: 240px;
      overflow-y: auto;
      margin-bottom: 16px;
      border: 1px solid #374151;
      border-radius: 8px;
    }

    .dsm-topic-item {
      display: block;
      width: 100%;
      padding: 10px 14px;
      border: none;
      background: transparent;
      color: #f9fafb;
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      border-bottom: 1px solid #374151;
      transition: background 0.12s ease;
    }
    .dsm-topic-item:last-child {
      border-bottom: none;
    }
    .dsm-topic-item:hover {
      background: #374151;
    }
    .dsm-topic-item.dsm-selected {
      background: #1e40af;
    }
    .dsm-topic-item-type {
      font-size: 11px;
      color: #9ca3af;
      margin-left: 8px;
    }

    .dsm-new-topic-row {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .dsm-new-topic-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #4b5563;
      border-radius: 8px;
      background: #111827;
      color: #f9fafb;
      font-size: 13px;
      outline: none;
    }
    .dsm-new-topic-input:focus {
      border-color: #2563eb;
    }
    .dsm-new-topic-input::placeholder {
      color: #6b7280;
    }

    /* --- Current topic badge --- */
    #dsm-topic-badge {
      position: fixed;
      bottom: 84px;
      right: 24px;
      z-index: 2147483647;
      background: #1e293b;
      color: #a5b4fc;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid #334155;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      white-space: nowrap;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
      opacity: 0.9;
    }
  `;

  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Notification helper
// ---------------------------------------------------------------------------

let notificationTimer: ReturnType<typeof setTimeout> | null = null;

function getOrCreateNotification(): HTMLElement {
  let el = document.getElementById('dsm-notification');
  if (!el) {
    el = document.createElement('div');
    el.id = 'dsm-notification';
    document.body.appendChild(el);
  }
  return el;
}

export function showNotification(
  message: string,
  type: 'info' | 'success' | 'error' | 'warn' = 'info',
  durationMs = 4000,
): void {
  const el = getOrCreateNotification();
  el.textContent = message;
  el.className = `dsm-visible dsm-${type}`;

  if (notificationTimer) clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => {
    el.classList.remove('dsm-visible');
  }, durationMs);
}

// ---------------------------------------------------------------------------
// Conflict dialog
// ---------------------------------------------------------------------------

type ConflictChoice = 'update' | 'new' | 'cancel';

/**
 * Show a modal asking the user what to do when a session URL already exists.
 * Resolves with the user's choice.
 */
export function showConflictPrompt(existingTitle: string): Promise<ConflictChoice> {
  return new Promise((resolve) => {
    document.querySelectorAll('.dsm-overlay').forEach((el) => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'dsm-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'dsm-dialog';

    dialog.innerHTML = `
      <h3>Session Already Exists</h3>
      <p>A session with this URL is already saved as "<strong>${escapeHtml(existingTitle)}</strong>".
         Would you like to update it with the new data, or create a new session?</p>
      <div class="dsm-dialog-actions">
        <button data-choice="cancel" class="dsm-dialog-btn dsm-btn-cancel">Cancel</button>
        <button data-choice="new" class="dsm-dialog-btn dsm-btn-secondary">Create New</button>
        <button data-choice="update" class="dsm-dialog-btn dsm-btn-primary">Update Existing</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function cleanup(choice: ConflictChoice) {
      overlay.remove();
      resolve(choice);
    }

    dialog.querySelectorAll('[data-choice]').forEach((btn) => {
      btn.addEventListener('click', () => cleanup(btn.getAttribute('data-choice') as ConflictChoice));
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup('cancel');
    });
  });
}

// ---------------------------------------------------------------------------
// Topic selector
// ---------------------------------------------------------------------------

interface TopicInfo {
  id: string;
  title: string;
  type: string;
}

type TopicChoice = { kind: 'select'; topicId: string } | { kind: 'create'; title: string } | { kind: 'skip' };

/**
 * Show a modal letting the user pick which topic to save the scraped session to.
 * Fetches existing topics from the background, allows selecting one or creating new.
 */
export function showTopicSelector(): Promise<TopicChoice> {
  return new Promise(async (resolve) => {
    // Fetch topics from background
    let topics: TopicInfo[] = [];
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_TOPICS' });
      if (resp?.ok && Array.isArray(resp.data)) {
        topics = resp.data.filter((t: TopicInfo) => t.id !== '__uncategorized__');
      }
    } catch {
      // If fetch fails, just show empty list
    }

    document.querySelectorAll('.dsm-overlay').forEach((el) => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'dsm-overlay';
    overlay.id = 'dsm-topic-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'dsm-dialog';

    const topicItemsHtml = topics.length > 0
      ? topics.map((t) => `
        <button class="dsm-topic-item" data-topic-id="${escapeHtml(t.id)}">
          ${escapeHtml(t.title)}
          <span class="dsm-topic-item-type">${escapeHtml(t.type)}</span>
        </button>
      `).join('')
      : '<div style="padding:16px;text-align:center;color:#9ca3af;font-size:13px;">No topics yet. Create one below.</div>';

    dialog.innerHTML = `
      <h3>Save to Topic</h3>
      <p>Choose a topic for this conversation, or create a new one.</p>
      <div class="dsm-topic-list">${topicItemsHtml}</div>
      <div class="dsm-new-topic-row">
        <input class="dsm-new-topic-input" type="text" placeholder="New topic name..." id="dsm-new-topic-name" />
        <button class="dsm-dialog-btn dsm-btn-primary" id="dsm-create-topic-btn">Create</button>
      </div>
      <div class="dsm-dialog-actions">
        <button class="dsm-dialog-btn dsm-btn-cancel" id="dsm-topic-skip">Skip (Uncategorized)</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const input = dialog.querySelector('#dsm-new-topic-name') as HTMLInputElement;
    const createBtn = dialog.querySelector('#dsm-create-topic-btn')!;
    const skipBtn = dialog.querySelector('#dsm-topic-skip')!;

    function cleanup(result: TopicChoice) {
      overlay.remove();
      resolve(result);
    }

    // Select existing topic
    dialog.querySelectorAll('.dsm-topic-item').forEach((item) => {
      item.addEventListener('click', () => {
        const topicId = item.getAttribute('data-topic-id')!;
        cleanup({ kind: 'select', topicId });
      });
    });

    // Create new topic
    function handleCreate() {
      const title = input.value.trim();
      if (title) {
        cleanup({ kind: 'create', title });
      }
    }

    createBtn.addEventListener('click', handleCreate);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCreate();
    });

    // Skip
    skipBtn.addEventListener('click', () => cleanup({ kind: 'skip' }));

    // Click backdrop to skip
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup({ kind: 'skip' });
    });

    // Focus the input
    setTimeout(() => input.focus(), 100);
  });
}

// ---------------------------------------------------------------------------
// Current topic badge
// ---------------------------------------------------------------------------

export function showCurrentTopicBadge(topicTitle: string): void {
  // Remove existing badge if any
  document.getElementById('dsm-topic-badge')?.remove();

  injectStyles();

  const badge = document.createElement('div');
  badge.id = 'dsm-topic-badge';
  badge.textContent = `📁 ${topicTitle}`;
  badge.title = `Topic: ${topicTitle}`;
  document.body.appendChild(badge);
}

// ---------------------------------------------------------------------------
// FAB injection
// ---------------------------------------------------------------------------

/**
 * Inject the floating action button and wire up callbacks.
 *
 * @param onScrape       Called when user clicks "Scrape All"
 * @param onScrapeSummary Called when user clicks "Scrape Summary"
 */
export function injectScraperUI(
  onScrape: () => void,
  onScrapeSummary: () => void,
): void {
  // Prevent double-injection
  if (document.getElementById('dsm-fab')) return;

  injectStyles();

  // Root container
  const fab = document.createElement('div');
  fab.id = 'dsm-fab';

  // Menu (hidden by default)
  const menu = document.createElement('div');
  menu.id = 'dsm-fab-menu';

  const btnScrape = document.createElement('button');
  btnScrape.id = 'dsm-btn-scrape';
  btnScrape.className = 'dsm-fab-action';
  btnScrape.textContent = 'Scrape All';

  const btnSummary = document.createElement('button');
  btnSummary.id = 'dsm-btn-summary';
  btnSummary.className = 'dsm-fab-action';
  btnSummary.textContent = 'Scrape Summary';

  menu.append(btnScrape, btnSummary);

  // Toggle button
  const toggle = document.createElement('button');
  toggle.id = 'dsm-fab-toggle';
  toggle.textContent = '\u{1F9E0}'; // brain emoji
  toggle.title = 'DeepSeek Manager';

  fab.append(menu, toggle);
  document.body.appendChild(fab);

  // --- Event handlers ---

  let menuOpen = false;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    menuOpen = !menuOpen;
    menu.classList.toggle('dsm-open', menuOpen);
    toggle.classList.toggle('dsm-rotated', menuOpen);
  });

  // Close menu when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!fab.contains(e.target as Node) && menuOpen) {
      menuOpen = false;
      menu.classList.remove('dsm-open');
      toggle.classList.remove('dsm-rotated');
    }
  });

  btnScrape.addEventListener('click', (e) => {
    e.stopPropagation();
    menuOpen = false;
    menu.classList.remove('dsm-open');
    toggle.classList.remove('dsm-rotated');
    onScrape();
  });

  btnSummary.addEventListener('click', (e) => {
    e.stopPropagation();
    menuOpen = false;
    menu.classList.remove('dsm-open');
    toggle.classList.remove('dsm-rotated');
    onScrapeSummary();
  });
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
