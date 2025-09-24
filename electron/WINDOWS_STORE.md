# Windows Store Submission Guide

This document provides a complete guide for submitting the DangunLand MUD Client to the Microsoft Windows Store.

## Prerequisites

### 1. Microsoft Developer Account
- Register for a Microsoft Developer Account at [https://developer.microsoft.com/](https://developer.microsoft.com/)
- Cost: $19 USD (one-time fee for individual developers)
- Verify your account and complete the registration process

### 2. Development Environment
- Windows 10/11 development machine (for final testing)
- Visual Studio (Community edition is sufficient)
- Windows 10 SDK installed

## App Assets (✅ READY)

All required Windows Store assets have been created and are located in the `assets/` directory:

### Icon Assets
- **StoreLogo.png** (50x50) - Store listing logo
- **Square44x44Logo.png** (44x44) - App list and search results  
- **Square150x150Logo.png** (150x150) - Medium tile
- **Wide310x150Logo.png** (310x150) - Wide tile
- **LargeTile.png** (310x310) - Large tile
- **SmallTile.png** (71x71) - Small tile
- **SplashScreen.png** (620x300) - App splash screen
- **icon.ico** - Main application icon (multi-resolution)

### Package Manifest
- **Package.appxmanifest** - Windows Store package manifest with proper metadata

## Building the Windows Store Package

**⚠️ IMPORTANT: Windows Store (.appx) packages can only be built on Windows 10 or Windows Server 2012 R2 (version 6.3+). This is a limitation of the Microsoft AppX packaging tools.**

### Prerequisites for Windows Store Build
- Windows 10 or Windows Server 2012 R2 (version 6.3+)
- Node.js 18+
- Visual Studio Build Tools or Visual Studio Community (for Windows SDK)

### Option 1: Using Electron Builder (Recommended)
```bash
# Install dependencies (run from project root)
npm run install-all

# Build the shared UI library
npm --workspace shared-ui run build

# Build the electron renderer
npm --workspace electron run build:renderer

# Create Windows Store package (.appx) - REQUIRES WINDOWS
npm --workspace electron run dist:win-store
```

### Verification Before Building
Check if your configuration is ready:
```bash
npm --workspace electron run check-store-ready
```

### Option 2: Manual APPX Creation
If the automated build fails, you can create the APPX manually:

1. Build the electron app:
   ```bash
   npm --workspace electron run build
   ```

2. Use Visual Studio or the Windows SDK tools to package the app:
   ```bash
   makeappx pack /d "dist" /p "DangunLandMUDClient.appx" /l
   ```

## App Configuration

### Package Identity
- **Package Name**: `31546YounghoonGim.Dangunmudclient`
- **Publisher**: `CN=B3D2417D-BB7D-4AA2-ACED-43B59B9475E0`
- **Version**: `1.0.0.0`

### Capabilities
The app requests the following permissions:
- **runFullTrust** - Required for Electron apps
- **internetClient** - Network access for MUD server connections
- **privateNetworkClientServer** - Local network access

### Supported Languages
- English (en-US) - Primary
- Korean (ko-KR) - Secondary

## Store Listing Requirements

### 1. Screenshots (Required)
Create screenshots showing:
- Main application interface
- Terminal/MUD gameplay
- Settings/configuration panels
- Macro system in action

**Specifications:**
- PNG format
- 1366x768, 1920x1080, or 2560x1440 pixels
- At least 4 screenshots required

### 2. Store Description

**Title**: DangunLand MUD Client

**Short Description**: 
Modern MUD client for DangunLand (단군의땅) Korean MUD server with direct telnet connectivity and advanced features.

**Full Description**:
```
DangunLand MUD Client is a modern, feature-rich desktop client designed specifically for connecting to DangunLand (단군의땅), a popular Korean MUD (Multi-User Dungeon) server.

🎮 KEY FEATURES:
• Direct telnet connectivity - no proxy servers required
• Full EUC-KR encoding support for proper Korean text display
• Advanced macro system with customizable commands
• Intelligent command triggers and automation
• Retro terminal interface with authentic MUD experience
• Heartbeat functionality to maintain connections
• Session logging and chat history
• Windows Store certified and secure

🔧 TECHNICAL HIGHLIGHTS:
• Native desktop performance with Electron framework
• Secure communication with context isolation
• Modern React-based user interface
• Cross-platform compatibility
• Full Windows integration

Perfect for Korean MUD gaming enthusiasts who want a reliable, feature-rich client with modern conveniences while maintaining the classic MUD experience.

단군의땅 MUD 서버 전용 클라이언트로 한국어 완벽 지원과 고급 기능을 제공합니다.
```

**Keywords**: MUD, client, Korean, gaming, dangunland, telnet, terminal, retro

### 3. Age Rating
- **Age Group**: Teen (13+)
- **Content**: Mild fantasy violence (typical for MUD games)

### 4. Category
- **Primary**: Games > Role Playing
- **Secondary**: Developer Tools

## Submission Process

### Step 1: Create App Submission
1. Log into [Microsoft Partner Center](https://partner.microsoft.com/)
2. Go to Apps and Games → Create a new app
3. Reserve the app name: "DangunLand MUD Client"

### Step 2: App Identity
1. Copy the Package Identity values to match your APPX:
   - Package/Identity/Name: `31546YounghoonGim.Dangunmudclient`
   - Package/Identity/Publisher: `CN=B3D2417D-BB7D-4AA2-ACED-43B59B9475E0`

### Step 3: Upload Package
1. Upload the generated `.appx` file
2. The system will automatically validate the package
3. Fix any validation errors that appear

### Step 4: Store Listing
1. Upload screenshots (minimum 4)
2. Add app description and features
3. Set age rating and content warnings
4. Configure pricing (Free recommended)

### Step 5: Certification
1. Submit for certification
2. Microsoft will review the app (typically 24-48 hours)
3. Address any feedback from the review process

## Code Signing (Optional but Recommended)

For trusted installation outside the Store:
1. Obtain a code signing certificate from a trusted CA
2. Update the electron builder configuration:
   ```json
   "win": {
     "certificateFile": "path/to/certificate.p12",
     "certificatePassword": "your-password"
   }
   ```

## Testing Before Submission

### 1. Local Testing
- Install the generated APPX locally using PowerShell:
  ```powershell
  Add-AppxPackage -Path "DangunLandMUDClient.appx"
  ```

### 2. Windows App Certification Kit
- Download and run the [Windows App Certification Kit](https://developer.microsoft.com/en-us/windows/downloads/app-certification-kit/)
- Test your APPX package for compliance

### 3. Functional Testing
- Test all app features including:
  - MUD server connections
  - Korean text encoding
  - Macro functionality
  - Settings persistence
  - App lifecycle (suspend/resume)

## Troubleshooting

### Common Issues
1. **"AppX is supported only on Windows 10 or Windows Server 2012 R2" Error**: 
   - This occurs when trying to build AppX packages on non-Windows systems (Linux, macOS)
   - Solution: Build the Windows Store package on a Windows machine
   - Alternative: Use GitHub Actions with Windows runners or Windows VM

2. **Package validation errors**: Check manifest syntax and asset references
3. **Icon not displaying**: Ensure all PNG files are properly formatted
4. **App crashes on startup**: Verify Electron build includes all dependencies
5. **Korean text issues**: Confirm EUC-KR encoding is working correctly

### Platform Requirements
- **Windows Store (.appx) builds**: Requires Windows 10+ or Windows Server 2012 R2+
- **Regular Windows (.exe) builds**: Can be cross-compiled from Linux/macOS
- **Development**: Can be done on any platform (Windows, Linux, macOS)

### Support Resources
- [Microsoft Store Developer Documentation](https://docs.microsoft.com/en-us/windows/uwp/publish/)
- [Electron Builder Windows Store Guide](https://www.electron.build/configuration/appx)
- [Windows App Certification Requirements](https://docs.microsoft.com/en-us/windows/apps/get-started/developer-mode-features-and-debugging)

## Maintenance

### Updates
- Use semantic versioning (e.g., 1.0.1, 1.1.0)
- Test updates thoroughly before submission
- Provide clear update notes for users

### Analytics
- Monitor app performance through Partner Center
- Track download and usage metrics
- Respond to user reviews and feedback

---

**Status**: ✅ Assets Ready | 🔧 Build Configuration Complete | 📝 Documentation Complete

The app is now ready for Windows Store submission with all required assets and proper configuration.