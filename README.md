# DangunLand MUD Client

A modern MUD client for connecting to 단군의땅 (Dangun's Land) MUD server with both web and desktop support.

## 🚀 Available Versions

### 🌐 Web Application
Browser-based client that works on any device with a modern web browser.
- Uses WebSocket proxy for telnet connectivity
- No installation required
- Cross-platform compatibility

### 💻 Desktop Application (Electron)
Native desktop app with direct telnet connectivity.
- No proxy server required - direct telnet connections
- Better performance and native OS integration
- **Windows Store Ready** - configured for Microsoft Store deployment
- Offline capable (except for MUD server connection)

## Architecture

The project uses a shared UI architecture to maximize code reuse:

```
┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │ Electron Client │
│                 │    │                 │
│ WebSocket ←--→  │    │   IPC ←--→      │
│ Proxy Server    │    │ Direct Telnet   │
└─────────────────┘    └─────────────────┘
         │                       │
         └─── Shared UI Library ──┘
              (React Components)
```

### Components

- **`backend/`** - Node.js WebSocket proxy server (for web client)
- **`shared-ui/`** - Shared React components and communication adapters
- **`web/`** - Web application wrapper 
- **`electron/`** - Desktop Electron application
- **`frontend/`** - Legacy vanilla JS frontend

### Key Features

- **Legacy Encoding Support**: Full EUC-KR encoding support for Korean MUD servers
- **Modern React Frontend**: Clean, professional UI built with React and Vite
- **Terminal Emulation**: xterm.js-powered terminal with proper text rendering
- **Command History**: Navigate through previous commands with arrow keys
- **Multiple Server Support**: Easy switching between different MUD servers
- **Connection Logging**: Built-in connection event logging
- **Real-time Communication**: WebSocket-based communication for low latency
- **Macros & Triggers**: Advanced automation features for power users
  - **Text Aliases**: Create short commands that expand to longer sequences
  - **Function Key Macros**: Bind F1-F12 keys to execute commands instantly
  - **Pattern Triggers**: Automatically respond to specific text from the server
- **Internationalization**: English and Korean language support

## Quick Start

### Web Version (No Installation)
1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd dangunland
   npm run install-all
   ```

2. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

3. **Open browser**: Navigate to `http://localhost:8080`

### Desktop Version (Electron)
1. **Setup** (same as web):
   ```bash
   git clone <repository-url>
   cd dangunland
   npm run install-all
   ```

2. **Development**:
   ```bash
   npm run dev:electron
   ```

3. **Build distribution**:
   ```bash
   npm run build:electron
   npm run dist:electron-win
   ```

## Development Workflow

### For Web Development
```bash
npm run dev  # Starts backend + web frontend with hot reload
```

### For Electron Development
```bash
npm run dev:electron  # Starts Electron app with hot reload
```

### Building for Production
```bash
# Web version
npm run build

# Electron version
npm run build:electron

# Windows Store package
npm run dist:electron-win-store
```

### Backend (Node.js Proxy Server)
- **Location**: `backend/`
- **Purpose**: Handles Telnet connections and encoding conversion
- **Features**:
  - Telnet protocol handling and negotiation
  - EUC-KR to UTF-8 encoding conversion
  - WebSocket server for frontend communication
  - Static file serving for the React frontend
  - Session logging capabilities

### Frontend (Shared UI Architecture)
- **Location**: `shared-ui/` (components), `web/` (web wrapper), `electron/` (desktop wrapper)
- **Purpose**: Modern web interface for MUD interaction with shared codebase
- **Features**:
  - xterm.js terminal emulation
  - Command input with history
  - Server selection dropdown
  - Connection status monitoring
  - Event logging panel
  - Retro 80s computer aesthetic
  - Macro and trigger support

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd dangunland
   ```

2. **Install all dependencies**:
   ```bash
   npm run install-all
   ```

### Running the Application

#### Web Version
1. **Start the development server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173` with backend at `http://localhost:8080`

2. **For production**:
   ```bash
   npm run build
   npm start
   ```
   Then visit `http://localhost:8080`

#### Desktop Version (Electron)
1. **Start the development app**:
   ```bash
   npm run dev:electron
   ```

2. **Build for distribution**:
   ```bash
   npm run dist:electron-win
   ```

## Usage

1. **Connect to a server**:
   - Select a server from the dropdown (Server 1: port 5002, Server 2: port 5003)
   - Click the "Connect" button
   - Wait for the connection status to show "Connected"

2. **Send commands**:
   - Type commands in the input field at the bottom
   - Press Enter to send commands
   - Use Up/Down arrow keys to navigate command history

3. **Additional features**:
   - **Clear**: Clear the terminal display
   - **Save Log**: Download session logs
   - **Show/Hide Log**: Toggle connection event log panel
   - **Settings**: Configure heartbeat, macros, and triggers

## Macros and Triggers

### Macros
The client supports two types of macros:
- **Text Aliases**: Short commands that expand to longer ones (e.g., "heal" → "cast cure light wounds on self")
- **Function Key Bindings**: F1-F12 keys that execute commands instantly

### Triggers
Automatically execute commands when specific text patterns are received:
- **Contains**: Trigger when text contains a phrase
- **Exact Match**: Trigger on exact text match
- **Regular Expression**: Advanced pattern matching
- **Configurable Delay**: Add delays between trigger and response

### Settings Management
Access the Settings panel to:
- Configure auto-heartbeat to prevent timeouts
- Create and manage macros
- Set up triggers for automation
- All settings are automatically saved locally

## Configuration

The target MUD server is configured in `backend/src/server.js`:
- **Host**: `dangunland.iptime.org`
- **Ports**: `5002`, `5003`
- **Encoding**: `EUC-KR`

To connect to different servers, modify these values in the server configuration.

## Technical Details

- **Backend**: Node.js with WebSocket (ws) and encoding conversion (iconv-lite)
- **Frontend**: React 19, Vite, xterm.js for terminal emulation
- **Communication**: WebSocket for real-time bidirectional communication
- **Encoding**: EUC-KR to UTF-8 conversion handled server-side
- **Telnet**: Full telnet protocol support with command negotiation

## Development

- **Backend hot reload**: Restart `node src/server.js` after changes
- **Frontend hot reload**: Vite automatically reloads on file changes
- **Debugging**: Console logs available in browser developer tools

## License

This project is for educational and personal use.

## Contributing

Feel free to submit issues and enhancement requests!
