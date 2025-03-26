# Claude Conversation Chrome Extension with Voice Support

A Chrome extension that lets you chat with Claude AI, featuring full voice capabilities using OpenAI's APIs for speech-to-text and text-to-speech.

## Features

- Chat with Claude AI directly from your browser
- Voice input support with audio visualization (speech-to-text via OpenAI Whisper)
- Voice output with text-to-speech via OpenAI TTS or browser's native speech synthesis
- Real-time streaming of both text and audio for natural conversation flow
- Configurable settings (model, temperature, system prompt, voice selection)
- Modern and responsive UI

## Setup

1. Clone this repository
2. Create a `.env` file in the root directory with your Claude API key:
   ```
   CLAUDE_API_KEY="your-claude-api-key-here"
   ```
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the extension directory
6. Click the extension icon to open the chat interface

## Voice Features

### Voice Input (Speech-to-Text)
The extension uses OpenAI's Whisper API for speech-to-text functionality. To use voice input:

1. Click on "Configure" and add your OpenAI API key in the configuration panel
2. Click the microphone button to start recording
3. Speak clearly into your microphone
4. Click the microphone button again to stop recording and send your transcribed message

### Voice Output (Text-to-Speech)
The extension offers two methods for speaking Claude's responses:

1. **OpenAI TTS** (High Quality):
   - Uses OpenAI's TTS API for premium voice quality
   - Six voice options: Alloy, Echo, Fable, Onyx, Nova, Shimmer
   - Perfect for important conversations where voice quality matters

2. **Browser TTS** (Low Latency):
   - Uses your browser's built-in speech synthesis
   - Much faster response time with lower latency
   - Quality varies by browser/device but generally works well
   - Ideal for quick interactions and real-time conversation

3. **Streaming Mode**:
   - Speaks sentences as they're generated, mirroring natural conversation
   - Adjustable chunk size for balancing latency vs coherence
   - Perfect for having a more natural, flowing conversation

**Controls:**
1. Toggle the speaker button to enable/disable TTS
2. Configure TTS settings in the configuration panel
3. Click any message's speaker icon to replay that message

## Configuration

The extension offers several configuration options:

- **Claude Model**: Choose between Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, or Claude 3 Haiku
- **Temperature**: Adjust the creativity level of responses (0.0 to 1.0)
- **System Prompt**: Customize the system instructions for Claude
- **OpenAI API Key**: For speech services (both Whisper and TTS)
- **TTS Voice**: Select from several OpenAI voice options (Alloy, Echo, Fable, Onyx, Nova, Shimmer)
- **Auto-speak**: Toggle automatic text-to-speech for responses
- **Use Browser TTS**: Switch between OpenAI TTS (high quality) and browser TTS (low latency)
- **Stream Audio**: Enable/disable real-time audio streaming as text is generated
- **Streaming Chunk Size**: Adjust how much text is buffered before speaking (lower = faster but more choppy)

## Privacy

- Your Claude and OpenAI API keys are stored locally in Chrome storage
- Audio input is processed through OpenAI's Whisper API
- Voice output is generated through OpenAI's TTS API
- Conversation data is not stored on any server
- All text and audio processing happens on-demand

## Permissions

The extension requires the following permissions:
- `storage`: To save your configuration settings
- `activeTab`: To interact with the current tab
- `scripting`: For extension functionality
- `audioCapture`: For microphone access during voice recording

## Credits

Created by Lucas Newman