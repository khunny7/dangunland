import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import './App.css';

const MUD_HOST = 'localhost:8080'; // backend proxy host
const WS_PATH = '/ws';

function useStableCallback(cb) {
  const ref = useRef(cb);
  ref.current = cb;
  return useCallback((...args) => ref.current(...args), []);
}

function App() {
  const termRef = useRef(null);
  const xtermRef = useRef(null);
  const wsRef = useRef(null);
  const [status, setStatus] = useState('Disconnected');
  const [selectedPort, setSelectedPort] = useState('5002');
  const [activePort, setActivePort] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connEvents, setConnEvents] = useState([]); // {ts,message}
  
  // Settings
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(true);
  const [heartbeatInterval, setHeartbeatInterval] = useState(60); // seconds
  
  const decoderRef = useRef(new TextDecoder('euc-kr'));
  const heartbeatTimerRef = useRef(null);
  const lastInputTimeRef = useRef(Date.now()); // Track last user input

  const pushEvent = useStableCallback(message => {
    setConnEvents(evts => {
      const ts = new Date().toISOString().split('T')[1].replace('Z','');
      const next = [...evts, { ts, message }];
      if (next.length > 400) next.splice(0, next.length - 400);
      return next;
    });
  });

  const inputRef = useRef(null);
  const historyRef = useRef([]); // array of past commands
  const historyIndexRef = useRef(-1); // -1 means new entry

  useEffect(() => {
    if (!termRef.current) return;
    
    const term = new Terminal({
      convertEol: true,
      fontFamily: 'Courier New, monospace',
      fontSize: 14,
      cols: 80,
      rows: 24,
      theme: { 
        background: '#001100',
        foreground: '#00ff41',
        cursor: '#00ff41',
        cursorAccent: '#001100',
        selection: 'rgba(255, 255, 255, 0.3)'
      },
      disableStdin: true // prevent direct typing in terminal; use input bar only
    });
    
    try {
      // Ensure the container has proper dimensions before opening
      const container = termRef.current;
      if (!container) {
        console.warn('Terminal container not found');
        return;
      }
      
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        // Wait for the container to be properly sized
        setTimeout(() => {
          if (container.offsetWidth > 0 && container.offsetHeight > 0) {
            term.open(container);
            xtermRef.current = term;
            console.log('Terminal initialized (delayed)');
            initializeTerminalContent(term);
          } else {
            console.warn('Terminal container still has no dimensions after delay');
          }
        }, 100);
      } else {
        term.open(container);
        xtermRef.current = term;
        console.log('Terminal initialized (immediate)');
        initializeTerminalContent(term);
      }
      
      // Focus input after mount
      setTimeout(() => inputRef.current?.focus(), 200);
    } catch (error) {
      console.warn('Terminal initialization error:', error);
    }
    
    return () => {
      try {
        if (xtermRef.current) {
          xtermRef.current.dispose();
          xtermRef.current = null;
        }
      } catch (error) {
        console.warn('Terminal disposal error:', error);
      }
    };
  }, []);

  // Heartbeat functions - defined before they are used
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat(); // Clear any existing timer
    if (heartbeatEnabled && heartbeatInterval > 0) {
      heartbeatTimerRef.current = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const now = Date.now();
          const timeSinceLastInput = (now - lastInputTimeRef.current) / 1000; // seconds
          
          // Only send heartbeat if user has been idle for the configured interval
          if (timeSinceLastInput >= heartbeatInterval) {
            wsRef.current.send(JSON.stringify({ t: 'input', data: '\n' }));
            console.log(`Heartbeat sent after ${Math.round(timeSinceLastInput)}s of inactivity`);
          }
        }
      }, 10000); // Check every 10 seconds instead of waiting the full interval
    }
  }, [heartbeatEnabled, heartbeatInterval, stopHeartbeat]);

  // Effect to restart heartbeat when settings change
  useEffect(() => {
    if (activePort && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      startHeartbeat();
    }
    return () => stopHeartbeat();
  }, [heartbeatEnabled, heartbeatInterval, startHeartbeat, stopHeartbeat, activePort]);

  const initializeTerminalContent = (term) => {
    try {
      // Retro terminal startup message
      term.write('\x1b[32m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m\r\n');
      term.write('\x1b[32m║                        DANGUN TERMINAL v1.0                         ║\x1b[0m\r\n');
      term.write('\x1b[32m║                     System Ready - Awaiting Connection              ║\x1b[0m\r\n');
      term.write('\x1b[32m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m\r\n');
      term.write('\r\n');
      term.write('\x1b[33m> Select a server and click CONNECT to begin...\x1b[0m\r\n');
    } catch (error) {
      console.warn('Error writing to terminal:', error);
    }
  };

  const writeStatus = useCallback(line => {
    console.log('Writing status to terminal:', line);
    console.log('Terminal ref available for status:', !!xtermRef.current);
    if (xtermRef.current && typeof xtermRef.current.write === 'function') {
      try {
        xtermRef.current.write(`\r\n\x1b[33m*** ${line} ***\x1b[0m\r\n`);
      } catch (error) {
        console.error('Error writing status to terminal:', error);
      }
    } else {
      console.warn('Cannot write status - terminal not ready:', {
        hasTerminal: !!xtermRef.current,
        hasWriteMethod: xtermRef.current && typeof xtermRef.current.write === 'function'
      });
    }
  }, []);

  const interpretStatus = useCallback(text => {
    if (/^(connecting|connected):/.test(text)) {
      const parts = text.split(':');
      const state = parts[0];
      const port = parts[2];
      if (state === 'connected') {
        setActivePort(port);
        setStatus(`Connected (port ${port})`);
        pushEvent('mud:connected:' + port);
      } else if (state === 'connecting') {
        setStatus(`Connecting (port ${port})...`);
        pushEvent('mud:connecting:' + port);
      }
    }
    if (text === 'disconnect') {
      pushEvent('mud:disconnect');
    }
  }, [pushEvent]);

  const connect = useCallback(() => {
    console.log('Connect button clicked');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    setStatus('Connecting...');
    pushEvent('ui:connect-click');
    
    // Reset last input time when connecting
    lastInputTimeRef.current = Date.now();
    
    // Clear terminal before connecting
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write('Connecting to MUD server...\r\n');
    }
    
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${MUD_HOST}${WS_PATH}`;
    console.log('Attempting to connect to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    ws.onopen = () => {
      console.log('WebSocket connected');
      setStatus('WebSocket Open');
      pushEvent('ws:open');
      ws.send(JSON.stringify({ t: 'switchPort', port: parseInt(selectedPort, 10) }));
      startHeartbeat();
    };
    ws.onclose = () => {
      console.log('WebSocket closed');
      setStatus('Disconnected');
      pushEvent('ws:close');
      setActivePort(null);
      stopHeartbeat();
    };
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('Error');
      pushEvent('ws:error');
    };
    ws.onmessage = ev => {
      if (typeof ev.data === 'string') {
        try {
          const obj = JSON.parse(ev.data);
          if (obj.t === 'status') {
            writeStatus(obj.data);
            interpretStatus(obj.data);
          } else if (obj.t === 'error') {
            writeStatus('ERROR: ' + obj.data);
          } else if (obj.t === 'log') {
            downloadText(obj.data.join('\n'), 'session-log-hex.txt');
          }
        } catch {
          // Not JSON -> ignore
        }
      } else {
        const u8 = new Uint8Array(ev.data);
        const text = decoderRef.current.decode(u8, { stream: true });
        console.log('Received text from MUD:', JSON.stringify(text));
        console.log('Terminal ref available:', !!xtermRef.current);
        if (text && xtermRef.current && typeof xtermRef.current.write === 'function') {
          try {
            // Convert \n\r to \r\n for better terminal compatibility
            const normalizedText = text.replace(/\n\r/g, '\r\n');
            console.log('Writing to terminal:', normalizedText.length, 'characters');
            console.log('Normalized text sample:', JSON.stringify(normalizedText.substring(0, 100)));
            xtermRef.current.write(normalizedText);
            // Force terminal refresh only if the method exists
            if (typeof xtermRef.current.refresh === 'function') {
              xtermRef.current.refresh(0, xtermRef.current.rows - 1);
            }
          } catch (error) {
            console.error('Error writing to terminal:', error);
          }
        } else {
          console.warn('Cannot write to terminal:', { 
            hasText: !!text, 
            hasTerminal: !!xtermRef.current,
            hasWriteMethod: xtermRef.current && typeof xtermRef.current.write === 'function'
          });
        }
      }
    };
  }, [selectedPort, pushEvent, writeStatus, interpretStatus, startHeartbeat, stopHeartbeat]);

  const sendLine = useCallback(() => {
    const raw = inputValue;
    const line = raw.trimEnd();
    
    // Update last input time when user sends a command
    lastInputTimeRef.current = Date.now();
    
    // Always send something, even if empty (just newline)
    const dataToSend = line + '\n';
    
    // Push to history only if non-empty and different from last
    if (line) {
      const hist = historyRef.current;
      if (hist.length === 0 || hist[hist.length - 1] !== line) {
        hist.push(line);
        if (hist.length > 200) hist.splice(0, hist.length - 200);
      }
    }
    historyIndexRef.current = -1;
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = { t: 'input', data: dataToSend };
      wsRef.current.send(JSON.stringify(payload));
      setInputValue('');
    }
    // refocus input
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [inputValue]);

  const downloadText = (text, name) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveLog = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ t: 'saveLog' }));
    }
  };

  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write('\x1b[32m> Terminal cleared\x1b[0m\r\n');
    }
  };

  return (
    <div className="app">
      {/* Computer Case */}
      <div className="computer-case">
        {/* Decorative Vent */}
        <div className="vent"></div>
        
        {/* Monitor */}
        <div className="monitor">
          <div className="terminal" ref={termRef} />
        </div>

        {/* Control Panel */}
        <div className="control-panel">
          <div className="menu-bar">
            <div className="status-section">
              <span className={`status-light ${activePort ? 'connected' : ''}`}></span>
              <span className="status-text">{status}</span>
            </div>
            
            <select 
              className="retro-select" 
              value={selectedPort} 
              onChange={e => setSelectedPort(e.target.value)}
            >
              <option value="5002">Server 1 (5002)</option>
              <option value="5003">Server 2 (5003)</option>
            </select>

            <button className="retro-button connect" onClick={connect}>
              🔌 Connect
            </button>
            
            <button className="retro-button" onClick={clearTerminal}>
              Clear
            </button>
            
            <button className="retro-button" onClick={saveLog}>
              Save Log
            </button>
            
            <button 
              className="retro-button" 
              onClick={() => setLogOpen(o => !o)}
            >
              {logOpen ? 'Hide Log' : 'Show Log'}
            </button>
            
            <button 
              className="retro-button" 
              onClick={() => setSettingsOpen(o => !o)}
            >
              Settings
            </button>
          </div>

          <input
            ref={inputRef}
            className="input-bar"
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); historyIndexRef.current = -1; }}
            onKeyDown={e => {
              if (e.key === 'Enter') { sendLine(); e.preventDefault(); }
              else if (e.key === 'ArrowUp') {
                const hist = historyRef.current;
                if (hist.length) {
                  if (historyIndexRef.current === -1) historyIndexRef.current = hist.length - 1; 
                  else if (historyIndexRef.current > 0) historyIndexRef.current--;
                  setInputValue(hist[historyIndexRef.current]);
                  e.preventDefault();
                }
              } else if (e.key === 'ArrowDown') {
                const hist = historyRef.current;
                if (hist.length) {
                  if (historyIndexRef.current >= 0) historyIndexRef.current++;
                  if (historyIndexRef.current >= hist.length) { 
                    historyIndexRef.current = -1; 
                    setInputValue(''); 
                  } else { 
                    setInputValue(hist[historyIndexRef.current]); 
                  }
                  e.preventDefault();
                }
              }
            }}
            placeholder="Enter command..."
            spellCheck={false}
            autoComplete="off"
          />

          {logOpen && (
            <div className="log-panel">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <strong>CONNECTION LOG</strong>
                <button className="retro-button" onClick={() => setConnEvents([])} style={{fontSize: '10px', padding: '4px 8px'}}>
                  Clear
                </button>
              </div>
              <div style={{maxHeight: '150px', overflowY: 'auto'}}>
                {connEvents.slice().reverse().map((e,i) => (
                  <div key={i} className="log-entry">
                    [{e.ts}] {e.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Popup */}
      {settingsOpen && (
        <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="settings-popup" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <strong>⚙️ TERMINAL SETTINGS</strong>
              <button 
                className="retro-button close-btn" 
                onClick={() => setSettingsOpen(false)}
                style={{fontSize: '10px', padding: '4px 8px'}}
              >
                ✕ Close
              </button>
            </div>
            
            <div className="settings-content">
              <div className="setting-group">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={heartbeatEnabled}
                    onChange={e => setHeartbeatEnabled(e.target.checked)}
                    className="setting-checkbox"
                  />
                  <span>Auto-Heartbeat (Prevent Timeout)</span>
                </label>
                <div className="setting-description">
                  Sends empty commands only when idle to prevent server timeouts
                </div>
              </div>

              {heartbeatEnabled && (
                <div className="setting-group">
                  <label className="setting-label">
                    Idle Timeout: {heartbeatInterval} seconds
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="300"
                    step="30"
                    value={heartbeatInterval}
                    onChange={e => setHeartbeatInterval(parseInt(e.target.value))}
                    className="setting-slider"
                  />
                  <div className="setting-description">
                    Send heartbeat after this many seconds of inactivity (30-300 seconds)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
