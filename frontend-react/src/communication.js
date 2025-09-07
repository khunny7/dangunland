/**
 * WebSocket Communication for Web-only MUD Client
 * Simple WebSocket adapter without Electron support
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
 * WebSocket-based communication adapter for web browsers
 */
export class WebSocketAdapter extends SimpleEventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.decoder = new TextDecoder('euc-kr');
    this.status = 'disconnected';
    this.currentPort = null;
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

    ws.onmessage = (event) => {
      try {
        if (typeof event.data === 'string') {
          const parsed = JSON.parse(event.data);
          if (parsed.t === 'mudStatus') {
            this.emit('status', parsed.msg);
            // Parse port from status message
            if (parsed.msg.includes('connected:')) {
              const parts = parsed.msg.split(':');
              this.currentPort = parseInt(parts[2], 10);
            } else if (parsed.msg === 'disconnect') {
              this.currentPort = null;
            }
          } else if (parsed.t === 'error') {
            this.emit('error', parsed.msg);
          } else if (parsed.t === 'log') {
            this.emit('log', parsed.data);
          }
        } else {
          // Binary data from MUD
          const text = this.decoder.decode(new Uint8Array(event.data), { stream: true });
          if (text) {
            this.emit('data', text);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
  }

  sendInput(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ t: 'mudInput', data }));
    }
  }

  sendResize(cols, rows) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ t: 'resize', cols, rows }));
    }
  }

  requestLog() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ t: 'requestLog' }));
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

  getStatus() {
    return this.status;
  }

  getCurrentPort() {
    return this.currentPort;
  }

  _getWebSocketHost() {
    // For development, use the development server
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'localhost:8080';
    }
    return window.location.host;
  }
}

/**
 * Factory function to create WebSocket communication adapter
 * @returns {WebSocketAdapter} WebSocket adapter
 */
export function createCommunicationAdapter() {
  return new WebSocketAdapter();
}