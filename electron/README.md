# DangunLand MUD Client - Electron App

This directory contains the desktop Electron application for DangunLand MUD Client.

## Features

- **Direct Telnet Connection**: No proxy server required - connects directly to MUD server
- **Native Performance**: Full desktop app performance with direct network access  
- **EUC-KR Encoding**: Proper Korean text support for MUD servers
- **Shared UI**: Uses the same React components as the web version
- **Windows Store Ready**: Configured for Microsoft Store deployment

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Install dependencies (from project root)
npm run install-all

# Build shared UI library first
npm --workspace shared-ui run build

# Development mode
npm --workspace electron run dev

# Build for production
npm --workspace electron run build
```

### Scripts
- `npm run dev` - Development mode with hot reload
- `npm run build` - Build renderer and main process
- `npm run pack` - Package without distributing
- `npm run dist` - Create distribution packages
- `npm run dist:win` - Windows-specific build
- `npm run dist:win-store` - Windows Store package (APPX)

## Architecture

### Main Process (`src/main.js`)
- Handles window creation and lifecycle
- Direct telnet connections to MUD server (`dangunland.iptime.org:5002/5003`)
- Telnet protocol negotiation and EUC-KR encoding conversion
- IPC communication with renderer process
- Session logging and file save dialogs

### Renderer Process (`src/renderer.jsx`)
- React app using shared UI components
- Electron IPC adapter for communication
- Same UI as web version but with native connectivity

### Preload Script (`src/preload.js`)
- Secure IPC bridge between main and renderer
- Exposes `window.electronAPI` for renderer communication

## Communication Flow

```
React App → ElectronIPCAdapter → IPC → Main Process → Direct Telnet → MUD Server
```

## Windows Store Deployment

The app is configured for Windows Store submission with:

- **App Identity**: `khunny7.DangunLandMUDClient`
- **Publisher**: `CN=khunny7`
- **Capabilities**: Full trust, network access
- **Package Format**: APPX

### Store Package Creation
```bash
npm run dist:win-store
```

This creates an `.appx` file in the `release` directory ready for Store submission.

### Requirements for Store
- Valid Windows Developer Account
- Code signing certificate (for trusted deployment)
- Store listing with descriptions, screenshots, etc.

## Icons and Assets

The app uses SVG icons converted to multiple formats for Windows:
- `icon.ico` - Main application icon
- Store logos in various sizes (Square44x44, Square150x150, etc.)

## Security

- Context isolation enabled
- Node integration disabled in renderer
- Secure IPC communication via preload script
- Network access restricted to MUD server connections

## Distribution

### Local Installation
```bash
npm run pack  # Creates unpacked app in dist/
```

### Windows Installer
```bash
npm run dist:win  # Creates .exe installer
```

### Windows Store
```bash
npm run dist:win-store  # Creates .appx package
```