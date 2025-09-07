# Electron App Development Guide

## Quick Start

### For Development
```bash
# Build the React frontend and start Electron
npm run dev:electron
```

### For Distribution
```bash
# Build Windows installer
npm run dist:electron
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DangunLand MUD Client                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Web Version                     Desktop Version            │
│  ┌─────────────┐                ┌─────────────────────┐    │
│  │   Browser   │                │   Electron App      │    │
│  │             │                │                     │    │
│  │  React App  │◄──WebSocket──► │  React App (same)   │    │
│  │             │                │                     │    │
│  └─────────────┘                │  ┌───────────────┐  │    │
│         │                       │  │ Main Process  │  │    │
│  ┌─────────────┐                │  │ (Node.js)     │  │    │
│  │   Backend   │                │  └───────────────┘  │    │
│  │   Proxy     │                └─────────────────────┘    │
│  │ (Node.js)   │                          │                │
│  └─────────────┘                          │                │
│         │                                 │                │
│         └─────────────┬───────────────────┘                │
│                       │                                    │
│                ┌─────────────┐                             │
│                │ MUD Server  │                             │
│                │dangunland...│                             │
│                └─────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Differences

| Aspect | Web Version | Electron Version |
|--------|-------------|------------------|
| **Connection** | Browser → WebSocket → Proxy → MUD | Electron → Direct TCP → MUD |
| **Deployment** | Web server required | Standalone executable |
| **Installation** | URL bookmark | Windows installer (.exe) |
| **Updates** | Automatic (server-side) | Manual/auto-updater |
| **Performance** | Network dependent | Direct connection |
| **Offline** | Requires server | Fully offline capable |

## Development Workflow

1. **Make changes to React frontend** (`frontend-react/src/`)
2. **Test in web version**:
   ```bash
   npm run dev  # Starts both backend and frontend dev servers
   ```
3. **Test in Electron**:
   ```bash
   npm run dev:electron  # Builds frontend and starts Electron
   ```
4. **Build for distribution**:
   ```bash
   npm run dist:electron  # Creates Windows installer
   ```

## File Structure

```
electron-app/
├── src/
│   ├── main.js          # Electron main process
│   └── preload.js       # Secure IPC bridge
├── dist/                # Built React app (copied from frontend-react/dist)
├── release/             # Distribution builds
├── assets/
│   └── icon.png         # App icon
├── package.json         # Electron dependencies and build config
└── README.md           # This file
```

## Build Configuration

The `package.json` includes Windows-specific build settings:

- **App ID**: `com.khunny7.dangunland`
- **Installer**: NSIS with user-configurable install directory
- **Shortcuts**: Desktop and Start Menu
- **File Association**: Could be extended for `.mud` files

## Security

- **Context Isolation**: Enabled for security
- **Node Integration**: Disabled in renderer
- **Preload Script**: Provides controlled access to Node.js APIs
- **IPC**: All main↔renderer communication goes through secure channels

## Extending the App

### Adding New Features

1. **Shared Logic**: Add to `shared/` directory
2. **Web-Specific**: Modify `backend/` or `frontend-react/`
3. **Electron-Specific**: Modify `electron-app/src/main.js`
4. **UI Changes**: Modify `frontend-react/src/` (affects both versions)

### Distribution

The built installer will:
- Install to `Program Files/DangunLand MUD Client/`
- Create desktop and start menu shortcuts
- Register as a Windows application
- Support uninstall via Control Panel