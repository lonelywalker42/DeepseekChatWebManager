import { handleMessage } from './message-router';

console.log('[DeepSeekManager] Background service worker started');

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('[DeepSeekManager] Received message:', request.type);
  // handleMessage is async, so we need to return true to keep the message channel open
  handleMessage(request)
    .then((result) => {
      console.log('[DeepSeekManager] Response for', request.type, ':', result);
      sendResponse(result);
    })
    .catch((err) => {
      console.error('[DeepSeekManager] Handler error:', err);
      sendResponse({ ok: false, error: String(err) });
    });
  return true;
});
