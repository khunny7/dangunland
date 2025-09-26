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
    this.intentionalDisconnect = false; // Track if disconnect was user-initiated
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
    
    // Reset disconnect flag when starting a new connection
    this.intentionalDisconnect = false;
    
    const host = this.getWebSocketHost();
    // Use secure websocket when the page itself is loaded via https
    const isBrowser = typeof window !== 'undefined';
    const protocol = isBrowser && window.location.protocol === 'https:' ? 'wss' : 'ws';
    // Allow a global override (e.g., window.__WS_BASE_HOST = 'somehost:1234') or env-like injection
    let finalHost = host;
    if (isBrowser && window.__WS_BASE_HOST) {
      finalHost = window.__WS_BASE_HOST;
    }
    const wsUrl = `${protocol}://${finalHost}/ws`;
    
    console.log('[WebSocketAdapter] Connecting to', wsUrl);
    this.onStatusChange?.('connecting', port);
    
  this.ws = new WebSocket(wsUrl);
  // Console log for diagnostics (helps identify mixed content issues in production)
  try { console.debug('[WebSocketAdapter] Connecting to', wsUrl); } catch {}
    // Ensure we always receive raw ArrayBuffer (not Blob) for binary frames
    this.ws.binaryType = 'arraybuffer';
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      try {
        this.ws.send(JSON.stringify({ t: 'switchPort', port: parseInt(port, 10) }));
      } catch (e) {
        console.error('Failed to send switchPort message:', e);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        if (typeof event.data === 'string') {
          // Likely JSON control frame
          try {
            const data = JSON.parse(event.data);
            if (data.t === 'status') {
              if (data.data === 'disconnect') {
                console.log('[WebSocketAdapter] Server sent disconnect message');
                this.onStatusChange?.('disconnected');
              } else {
                const statusParts = data.data.split(':');
                const state = statusParts[0];
                const port = statusParts[2];
                console.log('[WebSocketAdapter] Server status change:', state, 'port:', port);
                this.onStatusChange?.(state, port);
              }
            } else if (data.t === 'log') {
              this.onMessage?.({ type: 'log', message: 'Log saved' });
            } else if (data.t === 'error') {
              this.onMessage?.({ type: 'log', message: `Error: ${data.data}` });
            } else {
              // Fallback raw text
              this.onMessage?.(event.data);
            }
          } catch {
            // Plain text payload
            this.onMessage?.(event.data);
          }
        } else if (event.data instanceof ArrayBuffer) {
          const uint8Array = new Uint8Array(event.data);
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(uint8Array);
          this.onMessage?.(text);
        } else if (event.data instanceof Blob) {
          // Should not happen after binaryType change, but handle gracefully
            event.data.arrayBuffer().then(buf => {
              const uint8Array = new Uint8Array(buf);
              const decoder = new TextDecoder('utf-8');
              const text = decoder.decode(uint8Array);
              this.onMessage?.(text);
            }).catch(err => console.error('Blob decode error', err));
        } else {
          console.warn('Unknown WebSocket message type', event.data);
        }
      } catch (e) {
        console.error('WebSocket message handling error:', e);
      }
    };
    
    this.ws.onclose = (event) => {
      const reason = this.intentionalDisconnect ? 'Disconnected by user' : `Connection lost (code: ${event.code})`;
      console.log('[WebSocketAdapter]', reason);
      
      // Reset the flag
      this.intentionalDisconnect = false;
      
      this.onStatusChange?.('disconnected');
      // No auto-reconnect to avoid interfering with normal disconnect flow
    };
    
    this.ws.onerror = (error) => {
      console.error('[WebSocketAdapter] WebSocket error:', error);
      this.onStatusChange?.('disconnected');
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      console.log('[WebSocketAdapter] Initiating disconnect by user');
      this.intentionalDisconnect = true;
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