import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import './App.css';
import Logo from './components/Logo';
import SettingsFlyout from './components/SettingsFlyout';
import LanguageSwitcher from './components/LanguageSwitcher';





// Dynamically determine WebSocket host
const getWebSocketHost = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'localhost:8080'; // local development
  }
  return window.location.host; // production (Azure)
};

const MUD_HOST = getWebSocketHost();
const WS_PATH = '/ws';

function useStableCallback(cb) {
  const ref = useRef(cb);
  ref.current = cb;
  return useCallback((...args) => ref.current(...args), []);
}

function App() {
  const { t } = useTranslation();
  const termRef = useRef(null);
  const xtermRef = useRef(null);
  const wsRef = useRef(null);
  const [status, setStatus] = useState('disconnected');
  const [selectedPort, setSelectedPort] = useState('5002');
  const [activePort, setActivePort] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connEvents, setConnEvents] = useState([]); // {ts,message}
  
  // Settings
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(true);
  const [heartbeatInterval, setHeartbeatInterval] = useState(60); // seconds
  
  // Macros and Triggers
  const [macros, setMacros] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'macros', 'triggers'
  
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

  // Load saved settings, macros, and triggers from localStorage
  useEffect(() => {
    const savedHeartbeat = localStorage.getItem('heartbeatEnabled');
    const savedInterval = localStorage.getItem('heartbeatInterval');
    const savedMacros = localStorage.getItem('mudClientMacros');
    const savedTriggers = localStorage.getItem('mudClientTriggers');

    if (savedHeartbeat !== null) setHeartbeatEnabled(JSON.parse(savedHeartbeat));
    if (savedInterval !== null) setHeartbeatInterval(parseInt(savedInterval));
    
    // Load macros with default examples if none exist
    if (savedMacros) {
      setMacros(JSON.parse(savedMacros));
    } else {
      // Add some default macro examples
      const defaultMacros = [
        { id: 1, name: 'Quick Heal', type: 'alias', trigger: 'heal', command: 'cast cure light wounds on self' },
        { id: 2, name: 'Check Stats', type: 'function', trigger: 'F1', command: 'score' },
        { id: 3, name: 'Look Around', type: 'function', trigger: 'F2', command: 'look' }
      ];
      setMacros(defaultMacros);
    }
    
    // Load triggers with default examples if none exist
    if (savedTriggers) {
      setTriggers(JSON.parse(savedTriggers));
    } else {
      // Add some default trigger examples
      const defaultTriggers = [
        { id: 1, name: 'Auto Heal', type: 'contains', pattern: 'You are badly wounded', command: 'drink healing potion', delay: 0, enabled: true },
        { id: 2, name: 'Combat Alert', type: 'contains', pattern: 'attacks you', command: 'say Help! I am under attack!', delay: 500, enabled: true }
      ];
      setTriggers(defaultTriggers);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('heartbeatEnabled', JSON.stringify(heartbeatEnabled));
  }, [heartbeatEnabled]);

  useEffect(() => {
    localStorage.setItem('heartbeatInterval', heartbeatInterval.toString());
  }, [heartbeatInterval]);

  useEffect(() => {
    localStorage.setItem('mudClientMacros', JSON.stringify(macros));
  }, [macros]);

  useEffect(() => {
    localStorage.setItem('mudClientTriggers', JSON.stringify(triggers));
  }, [triggers]);

  // Terminal initialization helper
  const initializeTerminalContent = useCallback((term) => {
    try {
      // Retro terminal startup message
      term.write('\x1b[32m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m\r\n');
      term.write(`\x1b[32m║      ${t('terminal.title').padStart(36).padEnd(59)}║\x1b[0m\r\n`);
      term.write(`\x1b[32m║      ${t('terminal.systemReady').padStart(36).padEnd(52)}║\x1b[0m\r\n`);
      term.write('\x1b[32m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m\r\n');
      term.write('\r\n');
      term.write(`\x1b[33m${t('terminal.selectAndConnect')}\x1b[0m\r\n`);
    } catch (error) {
      console.warn('Error writing to terminal:', error);
    }
  }, [t]);

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
  }, [initializeTerminalContent]);

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
        setStatus(`connected:${port}`);
        pushEvent('mud:connected:' + port);
      } else if (state === 'connecting') {
        setStatus(`connecting:${port}`);
        pushEvent('mud:connecting:' + port);
      }
    }
    if (text === 'disconnect') {
      pushEvent('mud:disconnect');
    }
  }, [pushEvent]);

  // Trigger processing helper
  const processTriggers = useCallback((text) => {
    // Check each line of text against triggers
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      
      for (const trigger of triggers) {
        if (!trigger.enabled) continue;
        
        let matches = false;
        if (trigger.type === 'exact') {
          matches = line.trim() === trigger.pattern;
        } else if (trigger.type === 'contains') {
          matches = line.includes(trigger.pattern);
        } else if (trigger.type === 'regex') {
          try {
            const regex = new RegExp(trigger.pattern, 'i');
            matches = regex.test(line);
          } catch {
            console.warn('Invalid regex pattern:', trigger.pattern);
          }
        }
        
        if (matches && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // Execute trigger command
          setTimeout(() => {
            const payload = { t: 'input', data: trigger.command + '\n' };
            wsRef.current.send(JSON.stringify(payload));
            console.log(`Trigger fired: "${trigger.name}" -> "${trigger.command}"`);
          }, trigger.delay || 0);
        }
      }
    }
  }, [triggers]);

  const toggleConnection = useCallback(() => {
    // Check if currently connected or connecting
    const isConnected = status.startsWith('connected:');
    const isConnecting = status.startsWith('connecting:');
    
    if (isConnected || isConnecting) {
      // Disconnect
      console.log('Disconnect button clicked');
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      setStatus('disconnected');
      setActivePort(null);
      stopHeartbeat();
      pushEvent('ui:disconnect-click');
      
      if (xtermRef.current) {
        xtermRef.current.write(`\r\n\x1b[33m${t('terminal.disconnected')}\x1b[0m\r\n`);
      }
    } else {
      // Connect
      console.log('Connect button clicked');
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      setStatus('connecting');
      pushEvent('ui:connect-click');
      
      // Reset last input time when connecting
      lastInputTimeRef.current = Date.now();
      
      // Clear terminal before connecting
      if (xtermRef.current) {
        xtermRef.current.clear();
        xtermRef.current.write(`${t('terminal.connectingToServer')}\r\n`);
      }
      
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${MUD_HOST}${WS_PATH}`;
      console.log('Attempting to connect to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;
      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');
        pushEvent('ws:open');
        ws.send(JSON.stringify({ t: 'switchPort', port: parseInt(selectedPort, 10) }));
        startHeartbeat();
      };
      ws.onclose = () => {
        console.log('WebSocket closed');
        setStatus('disconnected');
        pushEvent('ws:close');
        setActivePort(null);
        stopHeartbeat();
      };
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('connectionError');
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
              // Process triggers before displaying text
              processTriggers(text);
              
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
    }
  }, [status, selectedPort, pushEvent, writeStatus, interpretStatus, startHeartbeat, stopHeartbeat, processTriggers, t]);

  // Macro expansion helper
  const expandMacros = useCallback((input) => {
    let expanded = input;
    // Check for text alias macros
    for (const macro of macros) {
      if (macro.type === 'alias' && macro.trigger === expanded.trim()) {
        expanded = macro.command;
        break;
      }
    }
    return expanded;
  }, [macros]);

  const sendLine = useCallback(() => {
    const raw = inputValue;
    let line = raw.trimEnd();
    
    // Update last input time when user sends a command
    lastInputTimeRef.current = Date.now();
    
    // Expand macros before sending
    line = expandMacros(line);
    
    // Always send something, even if empty (just newline)
    const dataToSend = line + '\n';
    
    // Push original input to history (not expanded), only if non-empty and different from last
    if (raw.trim()) {
      const hist = historyRef.current;
      if (hist.length === 0 || hist[hist.length - 1] !== raw.trim()) {
        hist.push(raw.trim());
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
  }, [inputValue, expandMacros]);

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

  // Function key macro handler
  const handleFunctionKey = useCallback((e) => {
    // Check for function key macros (F1-F12)
    if (e.key.startsWith('F') && /^F([1-9]|1[0-2])$/.test(e.key)) {
      const functionKey = e.key;
      const macro = macros.find(m => m.type === 'function' && m.trigger === functionKey);
      if (macro && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        e.preventDefault();
        const payload = { t: 'input', data: macro.command + '\n' };
        wsRef.current.send(JSON.stringify(payload));
        console.log(`Function key macro fired: ${functionKey} -> ${macro.command}`);
        return true;
      }
    }
    return false;
  }, [macros]);

  // Add global function key handler
  useEffect(() => {
    const globalKeyHandler = (e) => {
      if (handleFunctionKey(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', globalKeyHandler);
    return () => document.removeEventListener('keydown', globalKeyHandler);
  }, [handleFunctionKey]);

  // Macro management functions
  const addMacro = (macro) => {
    setMacros(prev => [...prev, { ...macro, id: Date.now() }]);
  };

  const editMacro = (id, updatedMacro) => {
    setMacros(prev => prev.map(m => m.id === id ? { ...updatedMacro, id } : m));
  };

  const deleteMacro = (id) => {
    setMacros(prev => prev.filter(m => m.id !== id));
  };

  // Trigger management functions
  const addTrigger = (trigger) => {
    setTriggers(prev => [...prev, { ...trigger, id: Date.now(), enabled: true }]);
  };

  const editTrigger = (id, updatedTrigger) => {
    setTriggers(prev => prev.map(t => t.id === id ? { ...updatedTrigger, id } : t));
  };

  const deleteTrigger = (id) => {
    setTriggers(prev => prev.filter(t => t.id !== id));
  };

  const toggleTrigger = (id) => {
    setTriggers(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  const getStatusText = (status) => {
    if (status.startsWith('connected:')) {
      const port = status.split(':')[1];
      return `${t('app.connected')} (port ${port})`;
    }
    if (status.startsWith('connecting:')) {
      const port = status.split(':')[1];
      return `${t('app.connecting')} (port ${port})...`;
    }
    return t(`app.${status}`) || status;
  };

  return (
    <div className="app">
      {/* Top-right Controls */}
      <div className="top-controls">
        <LanguageSwitcher />
        <button 
          className="top-settings-button"
          onClick={() => setSettingsOpen(true)}
          title={t('settings.title')}
        >
          ⚙️
        </button>
      </div>

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
            <div className="app-logo-section">
              <Logo size={24} className="app-logo" />
              <span className="app-title">{t('app.title')}</span>
            </div>
            
            <div className="status-section">
              <span className={`status-light ${activePort ? 'connected' : ''}`}></span>
              <span className="status-text">{getStatusText(status)}</span>
            </div>
            
            <select 
              className="retro-select" 
              value={selectedPort} 
              onChange={e => setSelectedPort(e.target.value)}
            >
              <option value="5002">Server 1 (5002)</option>
              <option value="5003">Server 2 (5003)</option>
            </select>

            <button 
              className={`retro-button ${status.startsWith('connected:') ? 'disconnect' : 'connect'}`} 
              onClick={toggleConnection}
            >
              {status.startsWith('connected:') ? '🔌 ' + t('app.disconnect') : '🔌 ' + t('app.connect')}
            </button>
            
            <button className="retro-button" onClick={clearTerminal}>
              {t('app.clear')}
            </button>
            
            <button className="retro-button" onClick={saveLog}>
              {t('app.saveLog')}
            </button>
            
            <button 
              className="retro-button" 
              onClick={() => setLogOpen(o => !o)}
            >
              {logOpen ? t('app.hideLog') : t('app.showLog')}
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
            placeholder={t('terminal.placeholder')}
            spellCheck={false}
            autoComplete="off"
          />

          {logOpen && (
            <div className="log-panel">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <strong>{t('app.connectionLog')}</strong>
                <button className="retro-button" onClick={() => setConnEvents([])} style={{fontSize: '10px', padding: '4px 8px'}}>
                  {t('app.clear')}
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

      {/* Settings Flyout */}
      <SettingsFlyout
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        heartbeatEnabled={heartbeatEnabled}
        setHeartbeatEnabled={setHeartbeatEnabled}
        heartbeatInterval={heartbeatInterval}
        setHeartbeatInterval={setHeartbeatInterval}
        macros={macros}
        addMacro={addMacro}
        editMacro={editMacro}
        deleteMacro={deleteMacro}
        triggers={triggers}
        addTrigger={addTrigger}
        editTrigger={editTrigger}
        deleteTrigger={deleteTrigger}
        toggleTrigger={toggleTrigger}
      />
    </div>
  );
}
export default App;
