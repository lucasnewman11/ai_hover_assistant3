// Test script to validate Claude API key
const https = require('https');
const fs = require('fs');

try {
  // Read the API key from .env file
  const envContent = fs.readFileSync('.env', 'utf8');
  const match = envContent.match(/CLAUDE_API_KEY=["']([^"']+)["']/);
  
  if (!match || !match[1]) {
    console.error('No API key found in .env file');
    process.exit(1);
  }
  
  const apiKey = match[1];
  console.log(`Using API key starting with: ${apiKey.substring(0, 10)}...`);
  
  // Determine which auth header to use based on key format
  let headers = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01'
  };
  
  if (apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant-')) {
    // New format keys use Bearer authentication
    headers['Authorization'] = `Bearer ${apiKey}`;
    console.log('Using Authorization: Bearer header');
  } else {
    // Old format keys use x-api-key
    headers['x-api-key'] = apiKey;
    console.log('Using x-api-key header');
  }
  
  // Prepare the request body
  const requestBody = JSON.stringify({
    model: "claude-3-sonnet-20240229",
    messages: [{
      role: "user",
      content: "Hello, this is a test to verify my API key is working."
    }],
    max_tokens: 100
  });
  
  // Options for the API request
  const options = {
    hostname: 'api.anthropic.com',
    port: 443,
    path: '/v1/messages',
    method: 'POST',
    headers: headers
  };
  
  console.log('Sending test request to Claude API...');
  
  // Make the API request
  const req = https.request(options, (res) => {
    console.log(`Response status code: ${res.statusCode}`);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('SUCCESS: API key is valid and working!');
        try {
          const response = JSON.parse(data);
          console.log(`Claude response: "${response.content[0].text.substring(0, 100)}..."`);
        } catch (e) {
          console.log('Response received but could not parse JSON:', data.substring(0, 200));
        }
      } else {
        console.error('API key test failed. Response:');
        console.log(data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Error making request:', error.message);
  });
  
  // Send the request
  req.write(requestBody);
  req.end();
  
} catch (err) {
  console.error('Error:', err);
}