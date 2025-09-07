# Electron App

This directory contains the Electron application that allows DangunLand MUD Client to run as a desktop application.

## Features

- **Direct MUD Connection**: Connects directly to the MUD server without requiring a proxy server
- **Native Desktop Experience**: Runs as a native Windows application
- **Shared Codebase**: Uses the same React frontend as the web version
- **Code Sharing**: Shares MUD connection logic with the web version

## Development

1. First, build the React frontend:
   ```bash
   cd ../frontend-react
   npm run build
   ```

2. Copy the frontend to the Electron app:
   ```bash
   npm run copy:frontend
   ```

3. Start the Electron app:
   ```bash
   npm run dev
   ```

## Building for Distribution

```bash
npm run dist
```

This will create a Windows installer in the `release/` directory.

## Architecture

- **Main Process** (`src/main.js`): Handles window management and MUD connection
- **Preload Script** (`src/preload.js`): Exposes secure APIs to the renderer process
- **Renderer Process**: The React application (same as web version)
- **Shared Modules**: MUD connection logic shared with web version

## How it Works

1. The Electron main process creates a BrowserWindow
2. The preload script exposes secure IPC APIs to the React app
3. The React app detects it's running in Electron and uses the Electron adapter
4. The Electron adapter communicates with the main process via IPC
5. The main process uses the shared MUD connection module to connect directly to the server
6. No WebSocket proxy server is needed - direct TCP connection to MUD server