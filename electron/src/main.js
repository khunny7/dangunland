const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const net = require('net');
const iconv = require('iconv-lite');
const fs = require('fs');

// Configuration
const TARGET_HOST = 'dangunland.iptime.org';
const TARGET_PORTS = [5002, 5003];
const ENCODING = 'euc-kr';

let mainWindow;
let mudSocket = null;
let connectedPort = null;
let sessionLog = [];

// Telnet constants
const IAC = 255; // Interpret As Command
const DONT = 254;
const DO = 253;
const WONT = 252;
const WILL = 251;
const SB = 250;
const SE = 240;
// Common options
const OPT_ECHO = 1;
const OPT_SUPPRESS_GA = 3;
const OPT_NAWS = 31;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'DangunLand MUD Client',
    show: false
  });

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    const devServerUrl = 'http://localhost:3001';
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (mudSocket) {
      mudSocket.destroy();
      mudSocket = null;
    }
  });
}

// Telnet protocol handling functions
function buildCommand(cmd, opt) {
  return Buffer.from([IAC, cmd, opt]);
}

function processTelnetData(buffer, socket) {
  const appBytes = [];
  let i = 0;
  while (i < buffer.length) {
    const b = buffer[i];
    if (b === IAC) {
      const cmd = buffer[i + 1];
      if (cmd === IAC) { // Escaped 0xFF
        appBytes.push(IAC);
        i += 2;
        continue;
      }
      if (cmd === DO || cmd === DONT || cmd === WILL || cmd === WONT) {
        const opt = buffer[i + 2];
        handleNegotiation(cmd, opt, socket);
        i += 3;
        continue;
      }
      if (cmd === SB) {
        // Subnegotiation: skip until IAC SE
        i += 2;
        while (i < buffer.length) {
          if (buffer[i] === IAC && buffer[i + 1] === SE) { i += 2; break; }
          i++;
        }
        continue;
      }
      // Other single-byte commands
      i += 2;
      continue;
    } else {
      appBytes.push(b);
      i++;
    }
  }
  return Buffer.from(appBytes);
}

function handleNegotiation(cmd, opt, socket) {
  // Reactive negotiation like backend/native telnet
  if (cmd === DO) {
    if (opt === OPT_SUPPRESS_GA) {
  const resp = buildCommand(WILL, opt);
  socket.write(resp);
    } else if (opt === OPT_NAWS) {
  const will = buildCommand(WILL, opt);
  socket.write(will);
      if (!socket._sentInitialNAWS) {
        const cols = 80;
        const rows = 24;
        const naws = Buffer.from([
          IAC, SB, OPT_NAWS,
          (cols >> 8) & 0xff, cols & 0xff,
          (rows >> 8) & 0xff, rows & 0xff,
          IAC, SE
        ]);
        socket.write(naws);
        socket._sentInitialNAWS = true;
        
      }
    } else if (opt === OPT_ECHO) {
  const resp = buildCommand(WILL, opt);
  socket.write(resp);
    } else {
  const resp = buildCommand(WONT, opt);
  socket.write(resp);
    }
  } else if (cmd === WILL) {
    if (opt === OPT_ECHO) {
  const resp = buildCommand(DO, opt);
  socket.write(resp);
    } else if (opt === OPT_SUPPRESS_GA) {
  const resp = buildCommand(DO, opt);
  socket.write(resp);
    } else {
  const resp = buildCommand(DONT, opt);
  socket.write(resp);
    }
  }
}

// IPC handlers
ipcMain.handle('connect-to-mud', async (event, port) => {
  return new Promise((resolve, reject) => {
    if (mudSocket) {
      mudSocket.destroy();
      mudSocket = null;
    }

    connectedPort = port;
    sessionLog = [];
    
    mainWindow.webContents.send('status-change', 'connecting', port);

    mudSocket = new net.Socket();
    
    mudSocket.connect(parseInt(port), TARGET_HOST, () => {
      console.log(`Connected to ${TARGET_HOST}:${port}`);
      mainWindow.webContents.send('status-change', 'connected', port);
      resolve(true);
    });

    mudSocket.on('data', (buffer) => {
      sessionLog.push(buffer.toString('hex'));
      const cleaned = processTelnetData(buffer, mudSocket);
      if (cleaned.length > 0) {
        // Convert from EUC-KR to UTF-8
        const text = iconv.decode(cleaned, ENCODING);
        mainWindow.webContents.send('mud-data', text);
      }
    });

    mudSocket.on('error', (error) => {
      console.error(`Connection error on port ${port}:`, error);
      mainWindow.webContents.send('status-change', 'disconnected');
      
      // Try next port if available
      const currentIndex = TARGET_PORTS.indexOf(parseInt(port));
      if (currentIndex >= 0 && currentIndex < TARGET_PORTS.length - 1) {
        const nextPort = TARGET_PORTS[currentIndex + 1].toString();
        setTimeout(() => {
          ipcMain.handle('connect-to-mud', async () => {
            return new Promise((resolve, reject) => {
              // Recursive call with next port
              event.sender.send('connect-to-mud', nextPort);
              resolve(true);
            });
          });
        }, 1000);
      }
      reject(error);
    });

    mudSocket.on('close', () => {
      console.log('Connection closed');
      mainWindow.webContents.send('status-change', 'disconnected');
      mudSocket = null;
      connectedPort = null;
    });
  });
});

ipcMain.handle('disconnect-from-mud', async () => {
  if (mudSocket) {
    mudSocket.destroy();
    mudSocket = null;
    connectedPort = null;
    mainWindow.webContents.send('status-change', 'disconnected');
  }
  return true;
});

ipcMain.handle('send-to-mud', async (event, data) => {
  if (mudSocket && mudSocket.readyState === 'open') {
    // Convert UTF-8 to EUC-KR for input
    const buffer = iconv.encode(data, ENCODING);
    mudSocket.write(buffer);
    return true;
  }
  return false;
});

ipcMain.handle('save-log', async () => {
  if (sessionLog.length === 0) {
    mainWindow.webContents.send('log-message', 'No data to save');
    return false;
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Session Log',
    defaultPath: `dangunland-session-${new Date().toISOString().replace(/[:.]/g, '-')}.hex`,
    filters: [
      { name: 'Hex Files', extensions: ['hex'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled) {
    try {
      const logData = sessionLog.join('\n');
      fs.writeFileSync(result.filePath, logData);
      mainWindow.webContents.send('log-message', `Log saved to ${result.filePath}`);
      return true;
    } catch (error) {
      mainWindow.webContents.send('log-message', `Error saving log: ${error.message}`);
      return false;
    }
  }
  return false;
});

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});