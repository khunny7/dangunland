/**
 * Electron IPC Communication Adapter
 * Communicates with Electron main process for direct telnet connections
 */
export class ElectronIPCAdapter {
  constructor() {
    this.onMessage = null;
    this.onStatusChange = null;
    this.currentPort = null;
    
    // Check if we're in Electron
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.electronAPI = window.electronAPI;
      this.setupListeners();
    } else {
      console.warn('ElectronIPCAdapter: electronAPI not available');
    }
  }

  setupListeners() {
    if (!this.electronAPI) return;

    // Listen for data from MUD server
    this.electronAPI.onMudData((data) => {
      this.onMessage?.(data);
    });

    // Listen for status changes
    this.electronAPI.onStatusChange((status, port) => {
      this.onStatusChange?.(status, port);
    });

    // Listen for log messages
    this.electronAPI.onLogMessage((message) => {
      this.onMessage?.({ type: 'log', message });
    });
  }

  connect(port = '5002') {
    if (!this.electronAPI) {
      console.error('ElectronIPCAdapter: electronAPI not available');
      return;
    }

    this.currentPort = port;
    this.electronAPI.connectToMud(port);
  }

  disconnect() {
    if (!this.electronAPI) return;
    
    this.electronAPI.disconnectFromMud();
    this.currentPort = null;
  }

  isConnected() {
    // We'll need to track this state or get it from the main process
    return this.currentPort !== null;
  }

  sendInput(input) {
    if (!this.electronAPI || !this.currentPort) return;
    
    this.electronAPI.sendToMud(input + '\n');
  }

  saveLog() {
    if (!this.electronAPI) return;
    
    this.electronAPI.saveLog();
  }
}