import { contextBridge, ipcRenderer } from 'electron';

// Expose Electron APIs to renderer process via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  // MUD connection methods
  mudConnect: (port) => ipcRenderer.invoke('mud-connect', port),
  mudSendInput: (data) => ipcRenderer.invoke('mud-send-input', data),
  mudSendResize: (cols, rows) => ipcRenderer.invoke('mud-send-resize', cols, rows),
  mudRequestLog: () => ipcRenderer.invoke('mud-request-log'),
  mudClose: () => ipcRenderer.invoke('mud-close'),

  // Event listeners for MUD events
  onMudData: (callback) => {
    ipcRenderer.on('mud-data', (event, data) => callback(data));
  },
  onMudStatus: (callback) => {
    ipcRenderer.on('mud-status', (event, status) => callback(status));
  },
  onMudError: (callback) => {
    ipcRenderer.on('mud-error', (event, error) => callback(error));
  },
  onMudLog: (callback) => {
    ipcRenderer.on('mud-log', (event, logData) => callback(logData));
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});