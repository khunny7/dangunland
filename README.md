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

## Architecture

The project consists of two main components:

### Backend (Node.js Proxy Server)
- **Location**: `backend/`
- **Purpose**: Handles Telnet connections and encoding conversion
- **Features**:
  - Telnet protocol handling and negotiation
  - EUC-KR to UTF-8 encoding conversion
  - WebSocket server for frontend communication
  - Static file serving for the React frontend
  - Session logging capabilities

### Frontend (React Application)
- **Location**: `frontend-react/`
- **Purpose**: Modern web interface for MUD interaction
- **Features**:
  - xterm.js terminal emulation
  - Command input with history
  - Server selection dropdown
  - Connection status monitoring
  - Event logging panel

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
