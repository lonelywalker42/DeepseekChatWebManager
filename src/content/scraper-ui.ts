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
      background: #4f46e5;
      color: #fff;
      font-size: 22px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    #dsm-fab-toggle:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.55);
    }

    #dsm-fab-menu {
      display: none;
      flex-direction: column;
      gap: 6px;
    }
    #dsm-fab-menu.dsm-open {
      display: flex;
    }

    .dsm-fab-action {
      padding: 10px 18px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
      transition: background 0.15s ease, transform 0.1s ease;
    }
    .dsm-fab-action:active {
      transform: scale(0.96);
    }

    #dsm-btn-scrape {
      background: #2563eb;
      color: #fff;
    }
    #dsm-btn-scrape:hover {
      background: #1d4ed8;
    }

    #dsm-btn-summary {
      background: #059669;
      color: #fff;
    }
    #dsm-btn-summary:hover {
      background: #047857;
    }

    /* --- Notification toast --- */
    #dsm-notification {
      position: fixed;
      bottom: 90px;
      right: 24px;
      z-index: 2147483647;
      max-width: 360px;
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.45;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      pointer-events: none;
    }
    #dsm-notification.dsm-visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
    #dsm-notification.dsm-info {
      background: #1e40af;
      color: #dbeafe;
    }
    #dsm-notification.dsm-success {
      background: #065f46;
      color: #d1fae5;
    }
    #dsm-notification.dsm-error {
      background: #991b1b;
      color: #fee2e2;
    }
    #dsm-notification.dsm-warn {
      background: #92400e;
      color: #fef3c7;
    }

    /* --- Conflict prompt overlay --- */
    #dsm-conflict-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    #dsm-conflict-dialog {
      background: #1f2937;
      color: #f9fafb;
      border-radius: 14px;
      padding: 28px 32px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    }

    #dsm-conflict-dialog h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      font-weight: 700;
    }

    #dsm-conflict-dialog p {
      margin: 0 0 20px 0;
      font-size: 13px;
      color: #d1d5db;
      line-height: 1.5;
    }

    #dsm-conflict-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .dsm-conflict-btn {
      padding: 8px 18px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    #dsm-conflict-update {
      background: #2563eb;
      color: #fff;
    }
    #dsm-conflict-update:hover {
      background: #1d4ed8;
    }

    #dsm-conflict-new {
      background: #4b5563;
      color: #f9fafb;
    }
    #dsm-conflict-new:hover {
      background: #374151;
    }

    #dsm-conflict-cancel {
      background: transparent;
      color: #9ca3af;
    }
    #dsm-conflict-cancel:hover {
      color: #d1d5db;
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
    // Remove any previous overlay
    document.getElementById('dsm-conflict-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dsm-conflict-overlay';

    const dialog = document.createElement('div');
    dialog.id = 'dsm-conflict-dialog';

    dialog.innerHTML = `
      <h3>Session Already Exists</h3>
      <p>A session with this URL is already saved as "<strong>${escapeHtml(existingTitle)}</strong>".
         Would you like to update it with the new data, or create a new session?</p>
      <div id="dsm-conflict-actions">
        <button id="dsm-conflict-cancel" class="dsm-conflict-btn">Cancel</button>
        <button id="dsm-conflict-new" class="dsm-conflict-btn">Create New</button>
        <button id="dsm-conflict-update" class="dsm-conflict-btn">Update Existing</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function cleanup(choice: ConflictChoice) {
      overlay.remove();
      resolve(choice);
    }

    dialog
      .querySelector('#dsm-conflict-update')!
      .addEventListener('click', () => cleanup('update'));
    dialog
      .querySelector('#dsm-conflict-new')!
      .addEventListener('click', () => cleanup('new'));
    dialog
      .querySelector('#dsm-conflict-cancel')!
      .addEventListener('click', () => cleanup('cancel'));

    // Clicking the backdrop also cancels
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup('cancel');
    });
  });
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
  });

  // Close menu when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!fab.contains(e.target as Node) && menuOpen) {
      menuOpen = false;
      menu.classList.remove('dsm-open');
    }
  });

  btnScrape.addEventListener('click', (e) => {
    e.stopPropagation();
    menuOpen = false;
    menu.classList.remove('dsm-open');
    onScrape();
  });

  btnSummary.addEventListener('click', (e) => {
    e.stopPropagation();
    menuOpen = false;
    menu.classList.remove('dsm-open');
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
