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
      this.ws.send(JSON.stringify({ t: 'connect', port }));
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.t === 'status') {
          this.onStatusChange?.(data.data.split(':')[0], data.data.split(':')[2]);
        } else if (data.t === 'log') {
          this.onMessage?.({ type: 'log', message: 'Log saved' });
        } else if (data.t === 'error') {
          this.onMessage?.({ type: 'log', message: `Error: ${data.data}` });
        }
      } catch {
        // Handle binary/text data
        if (typeof event.data === 'string') {
          this.onMessage?.(event.data);
        } else {
          // Convert ArrayBuffer to string
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(event.data);
          this.onMessage?.(text);
        }
      }
    };
    
    this.ws.onclose = () => {
      this.onStatusChange?.('disconnected');
      // Auto-reconnect after 3 seconds
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CLOSED) {
          this.connect(port);
        }
      }, 3000);
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
      this.ws.send(JSON.stringify({ t: 'input', data: input + '\n' }));
    }
  }

  saveLog() {
    if (this.isConnected()) {
      this.ws.send(JSON.stringify({ t: 'saveLog' }));
    }
  }
}