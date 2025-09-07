import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MudConnection } from '../shared/mud-connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let mudConnection;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    title: 'DangunLand MUD Client',
    show: false // Don't show until ready
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus the window
    if (isDev) {
      mainWindow.focus();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (mudConnection) {
      mudConnection.close();
      mudConnection = null;
    }
  });
}

// Initialize MUD connection and IPC handlers
function initializeMudConnection() {
  mudConnection = new MudConnection();

  // Forward MUD events to renderer process
  mudConnection.on('data', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('mud-data', data);
    }
  });

  mudConnection.on('status', (status) => {
    if (mainWindow) {
      mainWindow.webContents.send('mud-status', status);
    }
  });

  mudConnection.on('error', (error) => {
    if (mainWindow) {
      mainWindow.webContents.send('mud-error', error);
    }
  });

  // IPC handlers for MUD operations
  ipcMain.handle('mud-connect', async (event, port) => {
    try {
      mudConnection.connect(port);
    } catch (error) {
      console.error('MUD connect error:', error);
      throw error;
    }
  });

  ipcMain.handle('mud-send-input', async (event, data) => {
    try {
      mudConnection.sendInput(data);
    } catch (error) {
      console.error('MUD send input error:', error);
      throw error;
    }
  });

  ipcMain.handle('mud-send-resize', async (event, cols, rows) => {
    try {
      mudConnection.sendResize(cols, rows);
    } catch (error) {
      console.error('MUD send resize error:', error);
      throw error;
    }
  });

  ipcMain.handle('mud-request-log', async (event) => {
    try {
      const log = mudConnection.getSessionLog();
      if (mainWindow) {
        mainWindow.webContents.send('mud-log', log);
      }
    } catch (error) {
      console.error('MUD request log error:', error);
      throw error;
    }
  });

  ipcMain.handle('mud-close', async (event) => {
    try {
      mudConnection.close();
    } catch (error) {
      console.error('MUD close error:', error);
      throw error;
    }
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  initializeMudConnection();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    console.log('Blocked new window creation to:', navigationUrl);
  });
});

// Handle app second instance (for single instance app)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}