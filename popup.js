document.addEventListener('DOMContentLoaded', () => {
  const openAssistantBtn = document.getElementById('openAssistant');
  const testMicrophoneBtn = document.getElementById('testMicrophone');
  
  // Open assistant button
  openAssistantBtn.addEventListener('click', function() {
    console.log("Open Assistant button clicked");
    
    // First ensure we have microphone permission
    ensureMicrophonePermission().then(() => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs || tabs.length === 0) {
          console.error("No active tab found");
          return;
        }
        
        const activeTab = tabs[0];
        console.log("Sending message to tab:", activeTab.id);
        
        chrome.tabs.sendMessage(
          activeTab.id, 
          {action: "openAssistant"}, 
          function(response) {
            console.log("Response received:", response);
            if (chrome.runtime.lastError) {
              console.error("Error:", chrome.runtime.lastError);
            } else if (response && response.success) {
              window.close(); // Close popup if successful
            }
          }
        );
      });
    }).catch(error => {
      console.error("Error ensuring microphone permission:", error);
      // Still open the assistant even if we couldn't get microphone permission
      // The user will just need to type instead of using voice
      openAssistantWithoutMic();
    });
  });
  
  // Helper function to ensure microphone permission
  async function ensureMicrophonePermission() {
    // First check if the permission is already granted via the background script
    const result = await new Promise(resolve => {
      chrome.runtime.sendMessage({action: 'checkMicrophonePermission'}, response => {
        resolve(response);
      });
    });
    
    if (result && result.granted) {
      console.log("Microphone permission already granted");
      return true;
    }
    
    // If not granted, try to request permission
    try {
      // This will trigger a permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      // If we get here, permission was granted
      // Stop all tracks immediately
      stream.getTracks().forEach(track => track.stop());
      console.log("Microphone permission granted");
      return true;
    } catch (error) {
      console.error("Could not get microphone permission:", error);
      throw error;
    }
  }
  
  // Open assistant without microphone permission
  function openAssistantWithoutMic() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        console.error("No active tab found");
        return;
      }
      
      const activeTab = tabs[0];
      chrome.tabs.sendMessage(
        activeTab.id, 
        {action: "openAssistant", micPermission: false}, 
        function(response) {
          if (response && response.success) {
            window.close();
          }
        }
      );
    });
  }
  
  // Test microphone button
  testMicrophoneBtn.addEventListener('click', function() {
    console.log("Test Microphone button clicked");
    
    // Open the microphone test page in a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('mic-test.html')
    });
  });
});