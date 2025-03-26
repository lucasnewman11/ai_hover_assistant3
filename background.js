// This will ensure the extension's resources (chat.html, etc.) can be accessed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Claude Conversation extension installed with voice support');
});

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  // Handle microphone permission check
  if (message.action === 'checkMicrophonePermission') {
    // For Manifest V3, we're using the audioCapture permission which should be granted at install time
    // Just return success since we included it in required permissions
    sendResponse({ granted: true });
    return true;
  }
  
  return false;
});

// When the extension is installed or updated, set up initial permissions
chrome.runtime.onInstalled.addListener(() => {
  console.log('Setting up extension resources and permissions');
});

// Set up listeners for tab updates to ensure chat.html loads with microphone permissions
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only run when a page is completely loaded
  if (changeInfo.status === 'complete') {
    // If it's our chat interface or contains it
    if (tab.url && (tab.url.includes('chat.html') || tab.url.includes('chrome-extension'))) {
      console.log('Detected chat interface page, ensuring microphone permissions');
      
      chrome.scripting.executeScript({
        target: { tabId },
        function: () => {
          // Set audio permission attributes
          document.documentElement.setAttribute('allow', 'microphone; camera');
          
          // For iframes in the page
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(iframe => {
            iframe.allow = 'microphone; camera';
          });
          
          console.log('Added microphone permissions to page elements');
        }
      }).catch(error => console.error('Error injecting script:', error));
    }
  }
});