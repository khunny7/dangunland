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

The app is **READY** for Windows Store submission with:

- **App Identity**: `31546YounghoonGim.Dangunmudclient`
- **Publisher**: `CN=B3D2417D-BB7D-4AA2-ACED-43B59B9475E0`
- **Capabilities**: Full trust, network access
- **Package Format**: APPX
- **All Required Assets**: ✅ Complete (see `assets/` directory)

### Store Package Creation

**⚠️ Platform Requirement**: Windows Store (.appx) packages can only be built on Windows 10+ systems.

**Local Build (Windows only):**
```bash
npm run dist:win-store
```

**Configuration Validation:**
```bash
npm run validate-config    # Comprehensive validation
npm run check-store-ready  # Quick readiness check
```

This creates an `.appx` file in the `release` directory ready for Store submission.

### Requirements for Store
- Valid Windows Developer Account ($19 USD one-time fee)
- App screenshots (4+ required, 1366x768 or higher)
- Store listing with descriptions, categories, age rating
- Code signing certificate (optional but recommended for sideloading)

### Complete Submission Guide
See [WINDOWS_STORE.md](./WINDOWS_STORE.md) for detailed instructions on:
- Creating Microsoft Developer Account
- Store listing requirements
- Screenshot specifications
- Submission process
- Testing procedures

## Icons and Assets

✅ **All Windows Store assets have been created:**
- `StoreLogo.png` (50x50) - Store listing logo  
- `Square44x44Logo.png` (44x44) - App list icon
- `Square150x150Logo.png` (150x150) - Medium tile
- `Wide310x150Logo.png` (310x150) - Wide tile  
- `LargeTile.png` (310x310) - Large tile
- `SmallTile.png` (71x71) - Small tile
- `SplashScreen.png` (620x300) - Launch screen
- `icon.ico` - Main application icon (multi-resolution)
- `Package.appxmanifest` - Store package manifest

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