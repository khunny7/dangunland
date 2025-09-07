/**
 * Communication Abstraction Layer
 * Provides a unified interface for both WebSocket (web) and direct MUD connection (Electron)
 */

// Simple browser-compatible EventEmitter implementation
class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

/**
 * Detects if running in Electron environment
 * @returns {boolean} True if running in Electron
 */
export function isElectron() {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
}

/**
 * Abstract base class for communication adapters
 */
export class CommunicationAdapter extends SimpleEventEmitter {
  constructor() {
    super();
    this.status = 'disconnected';
    this.currentPort = null;
  }

  /**
   * Connect to MUD server
   * @param {number} port - Port number to connect to
   */
  connect(port) {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * Send input to MUD server
   * @param {string} data - Text to send
   */
  sendInput(data) {
    throw new Error('sendInput() must be implemented by subclass');
  }

  /**
   * Send terminal resize information
   * @param {number} cols - Terminal columns
   * @param {number} rows - Terminal rows
   */
  sendResize(cols, rows) {
    throw new Error('sendResize() must be implemented by subclass');
  }

  /**
   * Request session log
   */
  requestLog() {
    throw new Error('requestLog() must be implemented by subclass');
  }

  /**
   * Close connection
   */
  close() {
    throw new Error('close() must be implemented by subclass');
  }

  /**
   * Get current status
   * @returns {string} Current connection status
   */
  getStatus() {
    return this.status;
  }

  /**
   * Get current port
   * @returns {number|null} Current connected port
   */
  getCurrentPort() {
    return this.currentPort;
  }
}

/**
 * WebSocket-based communication adapter for web browsers
 */
export class WebSocketAdapter extends CommunicationAdapter {
  constructor() {
    super();
    this.ws = null;
    this.decoder = new TextDecoder('euc-kr');
  }

  connect(port) {
    this.close(); // Close existing connection

    const wsHost = this._getWebSocketHost();
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${wsHost}/ws`;
    
    console.log('WebSocket connecting to:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      this.status = 'websocket-open';
      this.emit('status', 'WebSocket Open');
      // Tell backend to switch port
      ws.send(JSON.stringify({ t: 'switchPort', port: parseInt(port, 10) }));
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      this.status = 'disconnected';
      this.currentPort = null;
      this.emit('status', 'Disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.status = 'error';
      this.emit('error', 'WebSocket error');
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        try {
          const obj = JSON.parse(ev.data);
          if (obj.t === 'status') {
            this.emit('status', obj.data);
            // Parse port from status message
            if (obj.data.includes('connected:')) {
              const parts = obj.data.split(':');
              this.currentPort = parseInt(parts[2], 10);
            }
          } else if (obj.t === 'error') {
            this.emit('error', obj.data);
          } else if (obj.t === 'log') {
            this.emit('log', obj.data);
          }
        } catch {
          // Not JSON, ignore
        }
      } else {
        // Binary data from MUD server
        const u8 = new Uint8Array(ev.data);
        const text = this.decoder.decode(u8, { stream: true });
        if (text) {
          this.emit('data', text);
        }
      }
    };
  }

  sendInput(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ t: 'input', data }));
    }
  }

  sendResize(cols, rows) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ t: 'resize', cols, rows }));
    }
  }

  requestLog() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ t: 'saveLog' }));
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
    this.currentPort = null;
  }

  _getWebSocketHost() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'localhost:8080'; // local development
    }
    return window.location.host; // production (Azure)
  }
}

/**
 * Direct connection adapter for Electron using IPC
 */
export class ElectronAdapter extends CommunicationAdapter {
  constructor() {
    super();
    this.decoder = new TextDecoder('euc-kr');
    this._setupIPC();
  }

  _setupIPC() {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    // Listen for events from main process
    window.electronAPI.onMudData((data) => {
      const text = this.decoder.decode(new Uint8Array(data), { stream: true });
      if (text) {
        this.emit('data', text);
      }
    });

    window.electronAPI.onMudStatus((status) => {
      this.emit('status', status);
      // Parse port from status message
      if (status.includes('connected:')) {
        const parts = status.split(':');
        this.currentPort = parseInt(parts[2], 10);
      } else if (status === 'disconnect') {
        this.currentPort = null;
      }
    });

    window.electronAPI.onMudError((error) => {
      this.emit('error', error);
    });

    window.electronAPI.onMudLog((logData) => {
      this.emit('log', logData);
    });
  }

  connect(port) {
    this.close(); // Close existing connection
    window.electronAPI.mudConnect(port);
  }

  sendInput(data) {
    window.electronAPI.mudSendInput(data);
  }

  sendResize(cols, rows) {
    window.electronAPI.mudSendResize(cols, rows);
  }

  requestLog() {
    window.electronAPI.mudRequestLog();
  }

  close() {
    window.electronAPI.mudClose();
    this.status = 'disconnected';
    this.currentPort = null;
  }
}

/**
 * Factory function to create appropriate communication adapter
 * @returns {CommunicationAdapter} WebSocket or Electron adapter based on environment
 */
export function createCommunicationAdapter() {
  if (isElectron()) {
    return new ElectronAdapter();
  } else {
    return new WebSocketAdapter();
  }
}