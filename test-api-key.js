// Simple script to test API key parsing
const fs = require('fs');

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  console.log('Raw .env content:', envContent);
  
  const match = envContent.match(/CLAUDE_API_KEY=["']([^"']+)["']/);
  
  if (match && match[1]) {
    console.log('Extracted API key:', match[1]);
    console.log('Valid format:', match[1].startsWith('sk-ant-') || (match[1].startsWith('sk-') && !match[1].startsWith('sk-ant-')));
  } else {
    console.log('No API key found with regex');
  }
} catch (err) {
  console.error('Error reading .env file:', err);
}