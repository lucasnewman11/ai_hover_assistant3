// claude-service.js

class ClaudeService {
    constructor() {
      this.apiKey = null;
      this.initialized = false;
      this.initPromise = this.initialize();
      
      // Simple request queue to prevent race conditions
      this.requestQueue = Promise.resolve();
    }
    
    async initialize() {
      try {
        console.log('Initializing Claude Service...');
        
        // Method 1: Try loading from .env file
        try {
          const envUrl = chrome.runtime.getURL('.env');
          const response = await fetch(envUrl, { cache: 'no-store' });
          
          if (response.ok) {
            const envText = await response.text();
            const match = envText.match(/CLAUDE_API_KEY=["']([^"']+)["']/);
            
            if (match && match[1]) {
              this.apiKey = this.sanitizeApiKey(match[1]);
              console.log('Loaded Claude API key from .env file');
              this.initialized = true;
              return true;
            }
          }
        } catch (envError) {
          console.warn('Failed to load .env file:', envError);
        }
        
        // Method 2: Check if API key is provided in window variable (from env.js)
        if (window.CLAUDE_API_KEY) {
          console.log('Found Claude API key from window.CLAUDE_API_KEY');
          this.apiKey = this.sanitizeApiKey(window.CLAUDE_API_KEY);
          if (this.apiKey) {
            this.initialized = true;
            return true;
          }
        }
        
        console.warn('No Claude API key found in .env file or window.CLAUDE_API_KEY');
        return false;
      } catch (error) {
        console.error('Claude Service initialization error:', error);
        return false;
      }
    }
    
    sanitizeApiKey(key) {
      // Trim whitespace and ensure the key is valid
      if (!key) return null;
      
      const sanitized = key.trim();
      
      // Validate key format - accept both old and new formats
      const isValidOldFormat = sanitized.startsWith('sk-ant-');
      const isValidNewFormat = sanitized.startsWith('sk-') && !sanitized.startsWith('sk-ant-');
      
      if (!isValidOldFormat && !isValidNewFormat) {
        console.warn('API key has invalid format. Should start with sk-ant- or sk-');
        return null;
      }
      
      return sanitized;
    }
    
    determineAuthHeader(apiKey) {
      // Handle both authorization formats for Claude API
      if (!apiKey) return null;
      
      // Determine which authentication method to use based on key format
      const headers = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true' // Required header for browser CORS requests
      };
      
      if (apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant-')) {
        // New format keys use Bearer authentication
        console.log('Using Authorization: Bearer header for newer sk- format key');
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        // Old format keys use x-api-key
        console.log('Using x-api-key header for sk-ant- format key');
        headers['x-api-key'] = apiKey;
      }
      
      return headers;
    }
    
    async query(prompt, context = null) {
      // Add to request queue to prevent race conditions
      return new Promise((resolve, reject) => {
        this.requestQueue = this.requestQueue.then(async () => {
          try {
            const result = await this._executeQuery(prompt, context);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    
    async _executeQuery(prompt, context = null) {
      try {
        // Ensure service is initialized
        if (!this.initialized) {
          await this.initPromise;
        }
        
        // Check for API key
        if (!this.apiKey) {
          throw new Error('Claude API key is not set in the .env file.');
        }
        
        console.log('Preparing Claude API request...');
        
        // Prepare complete prompt with context if provided
        let fullPrompt = prompt;
        
        if (context) {
          fullPrompt = `Current webpage content:
${context.text}

URL: ${context.url || 'Not provided'}
Title: ${context.title || 'Not provided'}

User question: ${prompt}`;
        }
        
        // Build request body
        const requestBody = {
          model: "claude-3-sonnet-20240229",
          messages: [{
            role: "user",
            content: fullPrompt
          }],
          max_tokens: 4096,
          temperature: 0.7
        };
        
        // Get appropriate headers
        const headers = this.determineAuthHeader(this.apiKey);
        
        if (!headers) {
          throw new Error('Failed to determine API authentication method');
        }
        
        console.log('Sending request to Claude API...');
        
        // Make the API request
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(requestBody)
        });
        
        console.log(`Claude API response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Claude API error: ${errorText}`);
          
          if (response.status === 401) {
            throw new Error('Authentication failed. Please check your API key in the .env file.');
          } else {
            throw new Error(`Claude API Error (${response.status}): ${errorText}`);
          }
        }
        
        const data = await response.json();
        console.log('Successfully received Claude API response');
        
        const responseText = data.content[0].text;
        
        return {
          text: responseText,
          rawResponse: data
        };
      } catch (error) {
        console.error('Claude query error:', error);
        throw error;
      }
    }
}

// Make available globally
window.ClaudeService = ClaudeService;