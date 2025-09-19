# DangunLand Shared UI Library

This library contains all the shared React components and communication adapters used by both the web and Electron versions of DangunLand MUD Client.

## Architecture

The shared UI library abstracts the communication layer to work with different backends:
- **Web**: Uses WebSocket to connect to proxy server
- **Electron**: Uses IPC to communicate with main process for direct telnet

## Components

### Core Components
- `App` - Main application component that accepts a communication adapter
- `Logo` - Brand logo component
- `SettingsFlyout` - Settings panel with macros, triggers, and configuration
- `LanguageSwitcher` - i18n language selection

### Communication Adapters
- `WebSocketCommunicationAdapter` - For web browsers (connects to proxy server)
- `ElectronIPCAdapter` - For Electron app (uses IPC for direct telnet)

## Usage

### Web Application
```jsx
import { App, WebSocketCommunicationAdapter } from 'dangunland-shared-ui';
import 'dangunland-shared-ui/dist/index.css';

const adapter = new WebSocketCommunicationAdapter();
<App communicationAdapter={adapter} />
```

### Electron Application
```jsx
import { App, ElectronIPCAdapter } from 'dangunland-shared-ui';
import 'dangunland-shared-ui/dist/index.css';

const adapter = new ElectronIPCAdapter();
<App communicationAdapter={adapter} />
```

## Communication Adapter Interface

All adapters must implement:

```javascript
class CommunicationAdapter {
  onMessage = null;        // Callback for data from server
  onStatusChange = null;   // Callback for connection status changes
  
  connect(port)           // Connect to server on specified port
  disconnect()            // Disconnect from server
  isConnected()           // Return connection status
  sendInput(input)        // Send input to server
  saveLog()               // Save session log (optional)
}
```

## Internationalization

The library includes i18n support with:
- English (en) - Default
- Korean (ko) - For Korean MUD server interface

## Building

```bash
npm run build  # Builds ES module library
npm run dev    # Watch mode for development
npm run lint   # ESLint checking
```

## Output

- `dist/index.js` - ES module with all components and adapters
- `dist/index.css` - Bundled styles including xterm.js CSS

## Dependencies

### Core
- React 19+
- xterm.js 5+ (terminal emulation)
- react-i18next (internationalization)

### Peer Dependencies
- react
- react-dom

Applications using this library must provide React as a peer dependency.