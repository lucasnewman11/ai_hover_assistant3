// Create the assistant container and iframe
function createAssistant() {
  // Check if assistant already exists
  if (document.getElementById('claude-assistant-container')) {
    toggleAssistant();
    return;
  }
  
  console.log("Creating Claude assistant...");
  
  // Create container
  const container = document.createElement('div');
  container.id = 'claude-assistant-container';
  container.className = 'claude-assistant-container';
  
  // Create header with close button
  const header = document.createElement('div');
  header.className = 'claude-assistant-header';
  
  const title = document.createElement('div');
  title.className = 'claude-assistant-title';
  title.textContent = 'Claude Conversation';
  
  const closeButton = document.createElement('button');
  closeButton.className = 'claude-assistant-close';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', toggleAssistant);
  
  header.appendChild(title);
  header.appendChild(closeButton);
  
  // Create iframe to load chat interface
  const iframe = document.createElement('iframe');
  iframe.id = 'claude-assistant-frame';
  iframe.src = chrome.runtime.getURL('chat.html');
  iframe.allow = "microphone; camera";
  
  // Append elements
  container.appendChild(header);
  container.appendChild(iframe);
  document.body.appendChild(container);
  
  // Make container draggable
  makeElementDraggable(container, header);
  
  console.log("Claude assistant created successfully");
}

// Toggle the assistant visibility
function toggleAssistant() {
  const container = document.getElementById('claude-assistant-container');
  if (container) {
    if (container.classList.contains('hidden')) {
      container.classList.remove('hidden');
      console.log("Assistant shown");
    } else {
      container.classList.add('hidden');
      console.log("Assistant hidden");
    }
  }
}

// Make element draggable by header
function makeElementDraggable(element, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  handle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e.preventDefault();
    // Get mouse position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call function when mouse moves
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e.preventDefault();
    // Calculate new position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set element's new position
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Content script received message:", request);
  
  if (request.action === "openAssistant") {
    console.log("Opening Claude assistant");
    createAssistant();
    // Send response back to let popup know the action was successful
    sendResponse({success: true});
  }
  
  // Return true to indicate this is an asynchronous response
  return true;
});