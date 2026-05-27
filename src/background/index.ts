import { handleMessage } from './message-router';

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  // handleMessage is async, so we need to return true to keep the message channel open
  handleMessage(request).then(sendResponse);
  return true;
});
