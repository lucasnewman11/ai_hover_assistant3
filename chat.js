// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const voiceButton = document.getElementById('voiceButton');
const speakButton = document.getElementById('speakButton');
const typingIndicator = document.getElementById('typingIndicator');
const statusBar = document.getElementById('statusBar');
const modelSelect = document.getElementById('modelSelect');
const openaiApiKeyInput = document.getElementById('openaiApiKey');
const temperatureSlider = document.getElementById('temperatureSlider');
const temperatureValue = document.getElementById('temperatureValue');
const systemPromptInput = document.getElementById('systemPrompt');
const toggleConfigButton = document.getElementById('toggleConfig');
const configPanel = document.getElementById('configPanel');
const saveConfigButton = document.getElementById('saveConfig');
const audioVisualization = document.getElementById('audioVisualization');
const ttsVoiceSelect = document.getElementById('ttsVoice');
const ttsEnabledCheckbox = document.getElementById('ttsEnabled');
const useBrowserTtsCheckbox = document.getElementById('useBrowserTts');
const liveStreamModeCheckbox = document.getElementById('liveStreamMode');
const streamingTtsBufferSizeSlider = document.getElementById('streamingTtsBufferSize');
const bufferSizeValueSpan = document.getElementById('bufferSizeValue');

// Configuration and state
let apiKey = null;
let openaiApiKey = null;
let claudeService = null;
let pageContent = null;
let messages = [
  { role: "assistant", content: "Hello! I'm Claude. How can I help you today?" }
];

// Text-to-speech settings
let ttsEnabled = true;
let ttsVoice = 'nova';
let isSpeaking = false;
let currentSpeech = null;
let speechQueue = [];
let streamingTtsChunks = [];
let streamingTtsTimer = null;
let streamingTtsBufferSize = 15; // words to buffer before speaking
let useBrowserTts = false; // toggle between OpenAI TTS and browser TTS
let liveStreamMode = true; // enable streaming TTS
let currentStreamText = ''; // current accumulated text being streamed

// Audio recording variables
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let audioContext = null;
let analyser = null;
let animationFrameId = null;

// Update temperature value display
temperatureSlider.addEventListener('input', () => {
  temperatureValue.textContent = temperatureSlider.value;
});

// Update buffer size value display
streamingTtsBufferSizeSlider.addEventListener('input', () => {
  bufferSizeValueSpan.textContent = streamingTtsBufferSizeSlider.value;
});

// Toggle configuration panel
toggleConfigButton.addEventListener('click', () => {
  configPanel.style.display = configPanel.style.display === 'none' ? 'block' : 'none';
});

// Load API keys from .env file
async function loadApiKey() {
  try {
    const envUrl = chrome.runtime.getURL('.env');
    const response = await fetch(envUrl, { cache: 'no-store' });
    
    if (response.ok) {
      const envText = await response.text();
      
      // Load Claude API key
      const claudeMatch = envText.match(/CLAUDE_API_KEY=["']([^"']+)["']/);
      if (claudeMatch && claudeMatch[1]) {
        apiKey = claudeMatch[1].trim();
        console.log('Loaded Claude API key from .env file');
      } else {
        console.warn('No Claude API key found in .env file');
      }
      
      // Load OpenAI API key
      const openaiMatch = envText.match(/OPENAI_API_KEY=["']([^"']+)["']/);
      if (openaiMatch && openaiMatch[1]) {
        openaiApiKey = openaiMatch[1].trim();
        console.log('Loaded OpenAI API key from .env file');
      } else {
        console.warn('No OpenAI API key found in .env file');
      }
      
      if (apiKey || openaiApiKey) {
        updateStatus('API keys loaded from .env file');
        return true;
      } else {
        updateStatus('No API keys found in .env file');
        return false;
      }
    }
    
    console.warn('Could not load .env file');
    updateStatus('Could not load .env file');
    return false;
  } catch (error) {
    console.error('Error loading API keys:', error);
    updateStatus('Error loading API keys');
    return false;
  }
}

// Load saved configuration
async function loadConfig() {
  // First load API key from .env
  await loadApiKey();
  
  chrome.storage.sync.get({
    model: 'claude-3-5-sonnet-20240620',
    temperature: 0.7,
    systemPrompt: 'You are Claude, a helpful AI assistant. Answer questions accurately and concisely.',
    openaiApiKey: '',
    ttsEnabled: true,
    ttsVoice: 'nova',
    useBrowserTts: false,
    liveStreamMode: true,
    streamingTtsBufferSize: 15
  }, function(items) {
    modelSelect.value = items.model;
    temperatureSlider.value = items.temperature;
    temperatureValue.textContent = items.temperature;
    systemPromptInput.value = items.systemPrompt;
    openaiApiKeyInput.value = items.openaiApiKey;
    openaiApiKey = items.openaiApiKey;
    
    // Load TTS settings
    ttsEnabledCheckbox.checked = items.ttsEnabled;
    ttsVoiceSelect.value = items.ttsVoice;
    useBrowserTtsCheckbox.checked = items.useBrowserTts;
    liveStreamModeCheckbox.checked = items.liveStreamMode;
    streamingTtsBufferSizeSlider.value = items.streamingTtsBufferSize;
    bufferSizeValueSpan.textContent = items.streamingTtsBufferSize;
    
    // Update variables
    ttsEnabled = items.ttsEnabled;
    ttsVoice = items.ttsVoice;
    useBrowserTts = items.useBrowserTts;
    liveStreamMode = items.liveStreamMode;
    streamingTtsBufferSize = items.streamingTtsBufferSize;
    
    // Update speak button state
    speakButton.classList.toggle('active', ttsEnabled);
    
    // Initialize browser speech synthesis if needed
    if (useBrowserTts) {
      initBrowserSpeechSynthesis();
    }
    
    updateStatus('Configuration loaded');
  });
}

// Save configuration
saveConfigButton.addEventListener('click', () => {
  const config = {
    model: modelSelect.value,
    temperature: temperatureSlider.value,
    systemPrompt: systemPromptInput.value,
    openaiApiKey: openaiApiKeyInput.value,
    ttsEnabled: ttsEnabledCheckbox.checked,
    ttsVoice: ttsVoiceSelect.value,
    useBrowserTts: useBrowserTtsCheckbox.checked,
    liveStreamMode: liveStreamModeCheckbox.checked,
    streamingTtsBufferSize: parseInt(streamingTtsBufferSizeSlider.value)
  };
  
  // Save variables
  openaiApiKey = openaiApiKeyInput.value;
  ttsEnabled = ttsEnabledCheckbox.checked;
  ttsVoice = ttsVoiceSelect.value;
  useBrowserTts = useBrowserTtsCheckbox.checked;
  liveStreamMode = liveStreamModeCheckbox.checked;
  streamingTtsBufferSize = parseInt(streamingTtsBufferSizeSlider.value);
  
  // Update speak button state
  speakButton.classList.toggle('active', ttsEnabled);
  
  // Initialize browser speech synthesis if needed
  if (useBrowserTts) {
    initBrowserSpeechSynthesis();
  }
  
  chrome.storage.sync.set(config, function() {
    updateStatus('Configuration saved');
    configPanel.style.display = 'none';
  });
});

// Update status
function updateStatus(message) {
  statusBar.textContent = message;
  console.log(message);
}

// Show typing indicator
function showTypingIndicator() {
  typingIndicator.style.display = 'block';
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
  typingIndicator.style.display = 'none';
}

// Add a message to the chat
function addMessageToChat(content, sender, shouldSpeak = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;
  messageDiv.dataset.timestamp = Date.now();
  
  const messageText = document.createElement('div');
  messageText.className = 'message-text';
  messageText.textContent = content;
  
  // Add a speak button for assistant messages
  if (sender === 'assistant') {
    const speakThisButton = document.createElement('button');
    speakThisButton.className = 'message-speak-button';
    speakThisButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    speakThisButton.title = 'Speak this message';
    speakThisButton.addEventListener('click', () => {
      speakText(content);
    });
    messageDiv.appendChild(speakThisButton);
  }
  
  messageDiv.appendChild(messageText);
  chatMessages.appendChild(messageDiv);
  
  // Keep the scroll at the bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Update messages array
  messages.push({ role: sender === 'user' ? 'user' : 'assistant', content });
  
  // Speak the text if it's an assistant message and TTS is enabled
  if (sender === 'assistant' && shouldSpeak && ttsEnabled) {
    speakText(content);
  }
}

// Determine auth header based on API key format
function determineAuthHeader(apiKey) {
  if (!apiKey) return null;
  
  const headers = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true' // Required header for browser CORS requests
  };
  
  if (apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant-')) {
    // New format keys use Bearer authentication
    console.log('Using Authorization: Bearer header');
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else {
    // Old format keys use x-api-key
    console.log('Using x-api-key header');
    headers['x-api-key'] = apiKey;
  }
  
  return headers;
}

// Initialize browser speech synthesis
function initBrowserSpeechSynthesis() {
  if (!('speechSynthesis' in window)) {
    console.warn('Browser speech synthesis not supported');
    useBrowserTts = false;
    return false;
  }
  
  return true;
}

// Get available browser voices
function getBrowserVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

// Browser-based text-to-speech
function speakTextBrowser(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('Browser speech synthesis not supported');
    return;
  }
  
  // Cancel any current speech
  window.speechSynthesis.cancel();
  
  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set voice - try to find a good quality voice
  const voices = getBrowserVoices();
  let voice = null;
  
  // Map OpenAI voices to browser voices (very rough approximation)
  switch (ttsVoice) {
    case 'alloy':
      voice = voices.find(v => v.name.includes('Google') && v.name.includes('Female'));
      break;
    case 'echo':
      voice = voices.find(v => v.name.includes('Google') && v.name.includes('Male'));
      break;
    case 'fable':
      voice = voices.find(v => v.name.includes('US Female'));
      break;
    case 'onyx':
      voice = voices.find(v => v.name.includes('US Male'));
      break;
    case 'nova':
      voice = voices.find(v => v.name.includes('Female'));
      break;
    case 'shimmer':
      voice = voices.find(v => v.name.includes('Female'));
      break;
    default:
      // Default to the first voice
      voice = voices[0];
  }
  
  if (voice) {
    utterance.voice = voice;
  }
  
  // Set properties
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  // Event handlers
  utterance.onstart = () => {
    isSpeaking = true;
    speakButton.classList.add('speaking');
  };
  
  utterance.onend = () => {
    isSpeaking = false;
    speakButton.classList.remove('speaking');
    
    // Play next in queue if any
    if (speechQueue.length > 0) {
      const nextText = speechQueue.shift();
      speakTextBrowser(nextText);
    } else {
      updateStatus('Ready');
    }
  };
  
  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event);
    isSpeaking = false;
    speakButton.classList.remove('speaking');
    updateStatus('Error playing speech');
  };
  
  // Speak
  window.speechSynthesis.speak(utterance);
  updateStatus('Speaking...');
}

// Text-to-speech function using OpenAI API
async function speakTextOpenAI(text) {
  if (!openaiApiKey) {
    updateStatus('OpenAI API key not set. Please configure it for text-to-speech.');
    return;
  }
  
  try {
    // Stop any current speech
    stopSpeaking();
    
    // Set speaking state
    isSpeaking = true;
    speakButton.classList.add('speaking');
    updateStatus('Generating speech...');
    
    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: ttsVoice,
        input: text
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS API error:', errorText);
      throw new Error(`OpenAI TTS Error (${response.status}): ${errorText}`);
    }
    
    // Convert the response to an audio blob
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Create and play audio
    const audio = new Audio(audioUrl);
    currentSpeech = audio;
    
    audio.onended = () => {
      isSpeaking = false;
      speakButton.classList.remove('speaking');
      URL.revokeObjectURL(audioUrl);
      currentSpeech = null;
      updateStatus('Ready');
      
      // Play next in queue if any
      if (speechQueue.length > 0) {
        const nextText = speechQueue.shift();
        speakText(nextText);
      }
    };
    
    audio.onerror = (error) => {
      console.error('Audio playback error:', error);
      isSpeaking = false;
      speakButton.classList.remove('speaking');
      updateStatus('Error playing speech');
    };
    
    await audio.play();
    updateStatus('Speaking...');
    
  } catch (error) {
    console.error('Error generating speech:', error);
    isSpeaking = false;
    speakButton.classList.remove('speaking');
    updateStatus(`Error: ${error.message}`);
    
    // Try browser TTS as fallback
    if (!useBrowserTts) {
      console.log('Trying browser TTS as fallback');
      try {
        speakTextBrowser(text);
      } catch (browserError) {
        console.error('Browser TTS fallback also failed:', browserError);
      }
    }
  }
}

// Main speak function that routes to the appropriate TTS method
function speakText(text) {
  if (useBrowserTts) {
    speakTextBrowser(text);
  } else {
    speakTextOpenAI(text);
  }
}

// Process streaming text for TTS
function processStreamingText(text) {
  if (!ttsEnabled || !liveStreamMode) return;
  
  // Make sure we're not already speaking
  if (isSpeaking) {
    // If already speaking but we want to append to current stream
    currentStreamText += ' ' + text;
    return;
  }
  
  // Check if the text has enough words to start speaking
  const words = text.split(/\s+/);
  
  if (words.length >= streamingTtsBufferSize) {
    // If browser TTS, we can just speak it
    if (useBrowserTts) {
      speakTextBrowser(text);
      currentStreamText = '';
    } else {
      // For OpenAI TTS, add to queue
      speakTextOpenAI(text);
      currentStreamText = '';
    }
  } else {
    // Not enough words yet, accumulate
    currentStreamText = text;
  }
}

// Reset streaming text state
function resetStreamingText() {
  currentStreamText = '';
  clearTimeout(streamingTtsTimer);
  streamingTtsTimer = null;
}

// Stop current speech
function stopSpeaking() {
  // Stop OpenAI audio
  if (currentSpeech) {
    currentSpeech.pause();
    currentSpeech.currentTime = 0;
    currentSpeech = null;
  }
  
  // Stop browser speech synthesis
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  
  // Reset state
  isSpeaking = false;
  speakButton.classList.remove('speaking');
  speechQueue = [];
  resetStreamingText();
}

// Queue a text for speech
function queueSpeech(text) {
  if (isSpeaking) {
    speechQueue.push(text);
  } else {
    speakText(text);
  }
}

// Send text message to Anthropic with streaming support
async function sendMessage(content) {
  if (!content.trim()) return;
  
  if (!apiKey) {
    const loaded = await loadApiKey();
    if (!loaded) {
      updateStatus('No API key found. Please add your Claude API key to .env file');
      return;
    }
  }
  
  // Add user message to chat
  addMessageToChat(content, 'user');
  chatInput.value = '';
  
  // Create a new message div for the streaming response
  const responseDiv = document.createElement('div');
  responseDiv.className = 'message assistant-message';
  
  const responseText = document.createElement('div');
  responseText.className = 'message-text';
  responseText.textContent = '';
  
  // Add a speak button
  const speakThisButton = document.createElement('button');
  speakThisButton.className = 'message-speak-button';
  speakThisButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
  speakThisButton.title = 'Speak this message';
  
  responseDiv.appendChild(speakThisButton);
  responseDiv.appendChild(responseText);
  chatMessages.appendChild(responseDiv);
  
  // Show typing indicator initially
  showTypingIndicator();
  
  try {
    // Get other configuration
    const config = await new Promise(resolve => {
      chrome.storage.sync.get({
        model: 'claude-3-5-sonnet-20240620',
        temperature: 0.7,
        systemPrompt: 'You are Claude, a helpful AI assistant. Answer questions accurately and concisely.'
      }, resolve);
    });
    
    // Prepare messages array with system prompt
    const messageHistory = messages.slice(-10); // Keep the conversation context manageable
    
    // Get auth headers
    const headers = determineAuthHeader(apiKey);
    
    if (!headers) {
      throw new Error('Failed to determine API authentication method');
    }
    
    // Prepare system prompt with page content if available
    let enhancedSystemPrompt = config.systemPrompt;
    if (pageContent) {
      enhancedSystemPrompt += `\n\nThe following is the content of the current webpage the user is viewing. Please use this information to help answer their questions:\n\n${pageContent}`;
    }
    
    // Add stream parameter for streaming responses
    const requestBody = {
      model: config.model,
      system: enhancedSystemPrompt,
      messages: messageHistory,
      temperature: parseFloat(config.temperature),
      max_tokens: 4096,
      stream: true
    };
    
    // Call Anthropic API with streaming
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Claude API error: ${errorText}`);
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Please check your API key in the .env file.');
      } else {
        throw new Error(`Claude API Error (${response.status}): ${errorText}`);
      }
    }
    
    // Hide typing indicator once we start getting the stream
    hideTypingIndicator();
    
    // Process the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let accumulatedChunk = '';
    let sentenceBuffer = '';
    let wordCount = 0;
    let lastProcessedTime = Date.now();
    const processingInterval = 500; // ms between processing for streaming TTS
    
    // Reset streaming state
    resetStreamingText();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data:')) continue;
        
        try {
          // Extract the JSON payload
          const jsonStr = line.substring(5).trim();
          if (jsonStr === '[DONE]') continue;
          
          const data = JSON.parse(jsonStr);
          
          // Check if this is a content delta
          if (data.type === 'content_block_delta' && data.delta && data.delta.text) {
            const deltaText = data.delta.text;
            
            // Update the displayed text
            fullText += deltaText;
            responseText.textContent = fullText;
            
            // Accumulate text for streaming TTS
            accumulatedChunk += deltaText;
            
            // Process words for streaming
            if (ttsEnabled && liveStreamMode) {
              // Check if we have a good chunk to process (contains end of sentence, or enough words)
              const currentTime = Date.now();
              const timeSinceLastProcess = currentTime - lastProcessedTime;
              
              // Check for sentence endings or a minimum word count
              const endsWithSentenceMarker = /[.!?]\s*$/.test(accumulatedChunk);
              const wordsInChunk = accumulatedChunk.split(/\s+/).length;
              
              // Process chunk if it's a complete sentence or we've accumulated enough
              if ((endsWithSentenceMarker || wordsInChunk >= 5) && timeSinceLastProcess > processingInterval) {
                // For browser TTS, we can process more frequently
                if (useBrowserTts) {
                  // Only speak if we have something substantial
                  if (sentenceBuffer.length > 0 || wordsInChunk > 2) {
                    sentenceBuffer += accumulatedChunk;
                    speakTextBrowser(sentenceBuffer);
                    sentenceBuffer = '';
                  }
                } else {
                  // For OpenAI TTS, accumulate more before processing
                  sentenceBuffer += accumulatedChunk;
                  wordCount += wordsInChunk;
                  
                  // If we have enough words, process them
                  if (wordCount >= streamingTtsBufferSize || endsWithSentenceMarker) {
                    if (sentenceBuffer.trim()) {
                      // Process for streaming
                      processStreamingText(sentenceBuffer);
                      sentenceBuffer = '';
                      wordCount = 0;
                    }
                  }
                }
                
                // Reset accumulation
                accumulatedChunk = '';
                lastProcessedTime = currentTime;
              }
            }
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } catch (e) {
          console.error('Error parsing streaming data:', e);
        }
      }
    }
    
    // Process any remaining text
    if (sentenceBuffer.length > 0 && ttsEnabled && liveStreamMode) {
      if (useBrowserTts) {
        speakTextBrowser(sentenceBuffer);
      } else {
        processStreamingText(sentenceBuffer);
      }
    }
    
    // Add event listener to speak button once we have the complete text
    speakThisButton.addEventListener('click', () => {
      speakText(fullText);
    });
    
    // Add to messages array
    messages.push({ role: 'assistant', content: fullText });
    
    // If not streaming but TTS is enabled, speak the full response
    if (ttsEnabled && !liveStreamMode) {
      speakText(fullText);
    }
    
    updateStatus('Ready');
    
  } catch (error) {
    hideTypingIndicator();
    updateStatus(`Error: ${error.message}`);
    console.error('Error:', error);
  }
}

// Event listener for send button
sendButton.addEventListener('click', () => {
  sendMessage(chatInput.value);
});

// Event listener for Enter key in input field
chatInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    sendMessage(chatInput.value);
  }
});

// Setup the audio visualization
function setupAudioVisualization() {
  // Clear existing bars
  audioVisualization.innerHTML = '';
  
  // Create bars for visualization
  for (let i = 0; i < 50; i++) {
    const bar = document.createElement('div');
    bar.className = 'audio-bar';
    bar.style.height = '3px';
    audioVisualization.appendChild(bar);
  }
}

// Update the audio visualization
function updateAudioVisualization() {
  if (!analyser) return;
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  
  const bars = audioVisualization.children;
  const step = Math.floor(bufferLength / bars.length);
  
  for (let i = 0; i < bars.length; i++) {
    const value = dataArray[i * step];
    const height = Math.max(3, value / 2); // Scale the height
    bars[i].style.height = `${height}px`;
  }
  
  if (isRecording) {
    animationFrameId = requestAnimationFrame(updateAudioVisualization);
  }
}

// Start recording audio - simplified direct approach
async function startRecording() {
  try {
    updateStatus('Requesting microphone access...');
    
    // Directly try to access the microphone without permission prompts
    // The audioCapture permission in the manifest handles this
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true 
    });
    
    // Setup audio context for visualization
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    
    // Setup MediaRecorder with options for best compatibility
    const options = { 
      mimeType: 'audio/webm' 
    };
    
    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      console.log('MediaRecorder not supported with these options, trying without options');
      mediaRecorder = new MediaRecorder(stream);
    }
    
    audioChunks = [];
    
    // When data is available, add it to our chunks
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    // When recording stops, process the audio
    mediaRecorder.onstop = async () => {
      // Get the stream tracks and stop them
      stream.getTracks().forEach(track => track.stop());
      
      // Hide visualization and reset UI
      audioVisualization.style.display = 'none';
      voiceButton.classList.remove('recording');
      
      // Process the recorded audio
      await processAudio();
    };
    
    // Show visualization
    setupAudioVisualization();
    audioVisualization.style.display = 'flex';
    
    // Request data frequently for better results on short recordings
    mediaRecorder.start(100);
    isRecording = true;
    voiceButton.classList.add('recording');
    updateAudioVisualization();
    
    updateStatus('Recording... Click microphone again to stop');
  } catch (error) {
    console.error('Error starting recording:', error);
    updateStatus('Microphone access denied. Please try the alternative method.');
    voiceButton.classList.remove('recording');
    
    // Trigger the fallback method directly
    setTimeout(() => {
      startRecordingFallback();
    }, 500);
  }
}

// Stop recording audio
function stopRecording() {
  // Standard MediaRecorder method
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    updateStatus('Processing audio...');
    return;
  }
  
  // Fallback method
  if (window.recordingStream && isRecording) {
    // Stop microphone access
    window.recordingStream.getTracks().forEach(track => track.stop());
    
    // Disconnect and clean up the audio processor
    if (window.audioProcessor) {
      window.audioProcessor.disconnect();
    }
    
    // Stop visualization
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    // Hide visualization
    audioVisualization.style.display = 'none';
    voiceButton.classList.remove('recording');
    
    isRecording = false;
    
    // Process the recorded audio data if we have any
    if (window.audioDataArray && window.audioDataArray.length > 0) {
      // Convert the array of Float32Arrays to a single Float32Array
      const length = window.audioDataArray.reduce((total, buffer) => total + buffer.length, 0);
      const audioBuffer = new Float32Array(length);
      let offset = 0;
      for (const buffer of window.audioDataArray) {
        audioBuffer.set(buffer, offset);
        offset += buffer.length;
      }
      
      // Create WAV file from the audio data
      const wavBuffer = createWaveFile(audioBuffer, 44100);
      const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      
      // Replace the audioChunks with our manually created blob
      audioChunks = [audioBlob];
      
      // Process the audio
      processAudio();
    } else {
      updateStatus('No audio data recorded');
    }
    
    // Clean up
    window.audioDataArray = [];
    window.audioProcessor = null;
    window.recordingStream = null;
  }
}

// Function to create a WAV file from raw audio data
function createWaveFile(samples, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');                        // ChunkID
  view.setUint32(4, 36 + dataSize, true);              // ChunkSize
  writeString(view, 8, 'WAVE');                        // Format
  writeString(view, 12, 'fmt ');                       // Subchunk1ID
  view.setUint32(16, 16, true);                        // Subchunk1Size
  view.setUint16(20, 1, true);                         // AudioFormat (PCM)
  view.setUint16(22, numChannels, true);               // NumChannels
  view.setUint32(24, sampleRate, true);                // SampleRate
  view.setUint32(28, byteRate, true);                  // ByteRate
  view.setUint16(32, blockAlign, true);                // BlockAlign
  view.setUint16(34, bitsPerSample, true);             // BitsPerSample
  writeString(view, 36, 'data');                       // Subchunk2ID
  view.setUint32(40, dataSize, true);                  // Subchunk2Size
  
  // Convert float samples to int16
  const volume = 0.5;
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let sample = Math.max(-1, Math.min(1, samples[i]));
    sample = sample * volume * 32767;
    view.setInt16(offset, sample, true);
  }
  
  return buffer;
}

// Helper function to write strings to a DataView
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Process the recorded audio
async function processAudio() {
  try {
    if (!openaiApiKey) {
      updateStatus('Error: OpenAI API key is not set. Please configure it.');
      return;
    }
    
    if (audioChunks.length === 0) {
      updateStatus('No audio recorded');
      return;
    }
    
    // Create audio blob
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    
    // Create form data for the API request
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Optionally specify language
    
    updateStatus('Transcribing audio...');
    
    // Make the API request to OpenAI's Whisper
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`OpenAI Whisper API Error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.text) {
      // Send the transcribed text to chat
      chatInput.value = data.text.trim();
      updateStatus('Audio transcribed successfully');
      
      // Send the message
      sendMessage(chatInput.value);
    } else {
      updateStatus('No speech detected in audio');
    }
  } catch (error) {
    console.error('Error processing audio:', error);
    updateStatus(`Error: ${error.message}`);
    
    // If there was an error with the MediaRecorder approach, show message to user
    const errorMsg = error.message || 'Unknown error occurred during audio transcription';
    addMessageToChat(`There was an error transcribing your audio: ${errorMsg}. Please try typing your message instead.`, 'assistant');
  }
}

// Fallback recording method using Web Audio API directly
async function startRecordingFallback() {
  try {
    updateStatus('Using alternative recording method...');
    
    // Create a simple recorder without using MediaRecorder
    const constraints = {
      audio: {
        echoCancellation: {ideal: true},
        noiseSuppression: {ideal: true},
        autoGainControl: {ideal: true}
      }
    };
    
    // Get microphone stream directly
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Initialize audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    
    // Create a processor node for recording
    // Note: ScriptProcessorNode is deprecated but still widely supported
    const bufferSize = 4096;
    const recorder = audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    // Create an array to store audio data
    const audioData = [];
    
    // Process audio data
    recorder.onaudioprocess = (e) => {
      const sample = e.inputBuffer.getChannelData(0);
      const buffer = new Float32Array(sample.length);
      for (let i = 0; i < sample.length; i++) {
        buffer[i] = sample[i];
      }
      audioData.push(buffer);
    };
    
    // Connect the nodes
    source.connect(recorder);
    recorder.connect(audioContext.destination);
    
    // Setup visualization
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    
    setupAudioVisualization();
    audioVisualization.style.display = 'flex';
    updateAudioVisualization();
    
    // Save references for later stopping
    window.recordingStream = stream;
    window.audioProcessor = recorder;
    window.audioDataArray = audioData;
    
    isRecording = true;
    voiceButton.classList.add('recording');
    
    updateStatus('Recording with alternative method... Click microphone again to stop');
  } catch (error) {
    console.error('Alternative recording method error:', error);
    updateStatus('Microphone access failed. Please check browser permissions.');
    
    // Show a message to the user
    addMessageToChat("I couldn't access your microphone. Please make sure your browser allows microphone access and try again.", 'assistant');
  }
}

// Toggle recording when voice button is clicked
voiceButton.addEventListener('click', async () => {
  if (isRecording) {
    stopRecording();
  } else {
    try {
      await startRecording();
    } catch (error) {
      console.error('Error with standard recording method, trying fallback:', error);
      updateStatus('Trying alternative recording method...');
      try {
        startRecordingFallback();
      } catch (fallbackError) {
        console.error('Fallback recording also failed:', fallbackError);
        updateStatus('Recording not supported in this browser');
        addMessageToChat("I couldn't access your microphone. Please ensure you've granted microphone permissions and try again, or type your message instead.", 'assistant');
      }
    }
  }
});

// Toggle text-to-speech
speakButton.addEventListener('click', () => {
  // Toggle TTS setting
  ttsEnabled = !ttsEnabled;
  speakButton.classList.toggle('active', ttsEnabled);
  
  // Save the setting
  chrome.storage.sync.set({ ttsEnabled: ttsEnabled });
  
  // If turning off, stop any current speech
  if (!ttsEnabled) {
    stopSpeaking();
    updateStatus('Text-to-speech disabled');
  } else {
    updateStatus('Text-to-speech enabled');
  }
});

// Handle page content capture button
const capturePageButton = document.getElementById('capturePageButton');
capturePageButton.addEventListener('click', () => {
  // Request the page content from the parent window (content script)
  window.parent.postMessage({ action: 'getPageContent' }, '*');
  updateStatus('Requesting page content...');
});

// Listen for messages from the content script
window.addEventListener('message', function(event) {
  // We only accept messages from ourselves
  if (event.source !== window.parent) return;
  
  console.log("Chat iframe received message:", event.data);
  
  if (event.data.action === 'setPageContent') {
    pageContent = event.data.content;
    console.log("Page content received and stored");
    
    // Update status to show page content was loaded
    updateStatus("Page content loaded. You can ask questions about the current page.");
    
    // Add a system message indicating we have page content
    const pageContentMsg = `I've loaded the content from the current webpage. Feel free to ask me questions about it.`;
    addMessageToChat(pageContentMsg, 'assistant');
  }
});

// Load configuration on page load
window.addEventListener('DOMContentLoaded', loadConfig);