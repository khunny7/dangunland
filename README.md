# DangunLand MUD Client

A modern web-based MUD (Multi-User Dungeon) client that supports legacy Korean encoding (EUC-KR) for connecting to Korean MUD servers.

## Features

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
  - **Persistent Settings**: All configurations saved locally

## Architecture

The project now supports both web and desktop deployment:

### Web Version
- **Backend** (Node.js Proxy Server): `backend/`
- **Frontend** (React Application): `frontend-react/`

### Desktop Version (Electron)
- **Electron App**: `electron-app/`
- **Shared Modules**: `shared/`

### Key Features:
- **Dual Deployment**: Same codebase runs as both web app and desktop app
- **Direct Connection**: Electron app connects directly to MUD server (no proxy needed)
- **Code Sharing**: MUD connection logic and communication layer shared between versions
- **Environment Detection**: React app automatically detects web vs Electron environment

### Backend (Node.js Proxy Server)
- **Location**: `backend/`
- **Purpose**: Handles Telnet connections and encoding conversion for web version
- **Features**:
  - Telnet protocol handling and negotiation
  - EUC-KR to UTF-8 encoding conversion
  - WebSocket server for frontend communication
  - Static file serving for the React frontend
  - Session logging capabilities

### Frontend (React Application)
- **Location**: `frontend-react/`
- **Purpose**: Modern web interface for MUD interaction (works in both web and Electron)
- **Features**:
  - xterm.js terminal emulation
  - Command input with history
  - Server selection dropdown
  - Connection status monitoring
  - Event logging panel
  - Macros & triggers system

### Electron App (Desktop Version)
- **Location**: `electron-app/`
- **Purpose**: Desktop application that provides native Windows app experience
- **Features**:
  - Direct MUD server connection (no proxy needed)
  - Native desktop window management
  - Same React frontend as web version
  - Windows installer and app registration

### Shared Modules
- **Location**: `shared/`
- **Purpose**: Common code shared between web and desktop versions
- **Features**:
  - MUD connection management with Telnet protocol support
  - Communication abstraction layer
  - Environment detection utilities

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd dangunland
   ```

2. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**:
   ```bash
   cd ../frontend-react
   npm install
   ```

### Running the Application

#### Web Version

1. **Start the backend server**:
   ```bash
   cd backend
   node src/server.js
   ```
   The server will start on `http://localhost:8080`

2. **Start the frontend development server** (in a new terminal):
   ```bash
   cd frontend-react
   npm run dev
   ```
   The React app will be available at `http://localhost:5173`

3. **For production**: The backend serves the built React app, so you only need to:
   ```bash
   cd frontend-react
   npm run build
   cd ../backend
   node src/server.js
   ```
   Then visit `http://localhost:8080`

#### Desktop Version (Electron)

1. **Build the React frontend**:
   ```bash
   npm run build
   ```

2. **Start the Electron app**:
   ```bash
   cd electron-app
   npm run dev
   ```

3. **Build for distribution**:
   ```bash
   cd electron-app
   npm run dist
   ```
   This creates a Windows installer in `electron-app/release/`

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
