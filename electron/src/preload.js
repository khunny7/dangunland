const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Connect to MUD server
  connectToMud: (port) => ipcRenderer.invoke('connect-to-mud', port),
  
  // Disconnect from MUD server
  disconnectFromMud: () => ipcRenderer.invoke('disconnect-from-mud'),
  
  // Send data to MUD server
  sendToMud: (data) => ipcRenderer.invoke('send-to-mud', data),
  
  // Save session log
  saveLog: () => ipcRenderer.invoke('save-log'),
  
  // Listen for MUD data
  onMudData: (callback) => {
    ipcRenderer.on('mud-data', (_event, data) => callback(data));
  },
  
  // Listen for status changes
  onStatusChange: (callback) => {
    ipcRenderer.on('status-change', (_event, status, port) => callback(status, port));
  },
  
  // Listen for log messages
  onLogMessage: (callback) => {
    ipcRenderer.on('log-message', (_event, message) => callback(message));
  },
  
  // Remove listeners (cleanup)
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});