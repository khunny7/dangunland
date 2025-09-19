/**
 * WebSocket Communication Adapter for web browsers
 * Connects to the proxy server via WebSocket
 */
export class WebSocketCommunicationAdapter {
  constructor() {
    this.ws = null;
    this.onMessage = null;
    this.onStatusChange = null;
    this.reconnectTimer = null;
  }

  getWebSocketHost() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'localhost:8080'; // local development
    }
    return window.location.host; // production (Azure)
  }

  connect(port = '5002') {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }

    const host = this.getWebSocketHost();
    const wsUrl = `ws://${host}/ws`;
    
    this.onStatusChange?.('connecting', port);
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      // Request connection to MUD server
      this.ws.send(JSON.stringify({ t: 'switchPort', port: parseInt(port, 10) }));
    };
    
    this.ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.t === 'status') {
            if (data.data === 'disconnect') {
              this.onStatusChange?.('disconnected');
            } else {
              // Handle status format like "connected:dangunland.iptime.org:5002" or "connecting:dangunland.iptime.org:5002"
              const statusParts = data.data.split(':');
              const state = statusParts[0];
              const port = statusParts[2];
              this.onStatusChange?.(state, port);
            }
          } else if (data.t === 'log') {
            this.onMessage?.({ type: 'log', message: 'Log saved' });
          } else if (data.t === 'error') {
            this.onMessage?.({ type: 'log', message: `Error: ${data.data}` });
          }
        } catch {
          // Not JSON, treat as text data
          this.onMessage?.(event.data);
        }
      } else {
        // Handle binary data (ArrayBuffer)
        const uint8Array = new Uint8Array(event.data);
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(uint8Array, { stream: true });
        this.onMessage?.(text);
      }
    };
    
    this.ws.onclose = () => {
      this.onStatusChange?.('disconnected');
      // Only auto-reconnect if connection was successful first
      // Removed auto-reconnect as it interferes with normal disconnect flow
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.onStatusChange?.('disconnected');
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  sendInput(input) {
    if (this.isConnected()) {
      this.ws.send(JSON.stringify({ t: 'input', data: input }));
    }
  }

  saveLog() {
    if (this.isConnected()) {
      this.ws.send(JSON.stringify({ t: 'saveLog' }));
    }
  }
}