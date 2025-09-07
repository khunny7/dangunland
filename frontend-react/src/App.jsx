import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import './App.css';
import { createCommunicationAdapter, isElectron } from '../../shared/communication.js';

// Macro Manager Component
function MacroManager({ macros, onAdd, onEdit, onDelete }) {
  const [newMacro, setNewMacro] = useState({ name: '', type: 'alias', trigger: '', command: '' });
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMacro.name || !newMacro.trigger || !newMacro.command) return;
    
    if (editingId !== null) {
      onEdit(editingId, newMacro);
      setEditingId(null);
    } else {
      onAdd(newMacro);
    }
    setNewMacro({ name: '', type: 'alias', trigger: '', command: '' });
  };

  const startEdit = (macro) => {
    setNewMacro({ name: macro.name, type: macro.type, trigger: macro.trigger, command: macro.command });
    setEditingId(macro.id);
  };

  const cancelEdit = () => {
    setNewMacro({ name: '', type: 'alias', trigger: '', command: '' });
    setEditingId(null);
  };

  return (
    <div className="manager-container">
      <div className="manager-header">
        <h3>Macro Management</h3>
        <div className="help-text">
          Create aliases and function key shortcuts for quick command execution.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="macro-form">
        <div className="form-row">
          <input
            type="text"
            placeholder="Macro name"
            value={newMacro.name}
            onChange={e => setNewMacro(prev => ({ ...prev, name: e.target.value }))}
            className="form-input"
          />
          <select
            value={newMacro.type}
            onChange={e => setNewMacro(prev => ({ ...prev, type: e.target.value, trigger: '' }))}
            className="form-select"
          >
            <option value="alias">Text Alias</option>
            <option value="function">Function Key</option>
          </select>
        </div>

        <div className="form-row">
          {newMacro.type === 'alias' ? (
            <input
              type="text"
              placeholder="Trigger text (e.g., 'heal')"
              value={newMacro.trigger}
              onChange={e => setNewMacro(prev => ({ ...prev, trigger: e.target.value }))}
              className="form-input"
            />
          ) : (
            <select
              value={newMacro.trigger}
              onChange={e => setNewMacro(prev => ({ ...prev, trigger: e.target.value }))}
              className="form-select"
            >
              <option value="">Select Function Key</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={`F${i + 1}`}>F{i + 1}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="Command to execute"
            value={newMacro.command}
            onChange={e => setNewMacro(prev => ({ ...prev, command: e.target.value }))}
            className="form-input"
            style={{ flex: 2 }}
          />
        </div>

        <div className="form-buttons">
          <button type="submit" className="retro-button">
            {editingId !== null ? 'Update' : 'Add'} Macro
          </button>
          {editingId !== null && (
            <button type="button" onClick={cancelEdit} className="retro-button">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="macro-list">
        {macros.map(macro => (
          <div key={macro.id} className="macro-item">
            <div className="macro-info">
              <strong>{macro.name}</strong>
              <span className="macro-type">({macro.type})</span>
              <div className="macro-detail">
                {macro.type === 'alias' ? `"${macro.trigger}"` : macro.trigger} → "{macro.command}"
              </div>
            </div>
            <div className="macro-actions">
              <button onClick={() => startEdit(macro)} className="retro-button small">
                Edit
              </button>
              <button onClick={() => onDelete(macro.id)} className="retro-button small danger">
                Delete
              </button>
            </div>
          </div>
        ))}
        {macros.length === 0 && (
          <div className="empty-state">No macros configured. Add your first macro above!</div>
        )}
      </div>
    </div>
  );
}

// Trigger Manager Component
function TriggerManager({ triggers, onAdd, onEdit, onDelete, onToggle }) {
  const [newTrigger, setNewTrigger] = useState({ 
    name: '', 
    type: 'contains', 
    pattern: '', 
    command: '', 
    delay: 0 
  });
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTrigger.name || !newTrigger.pattern || !newTrigger.command) return;
    
    if (editingId !== null) {
      onEdit(editingId, newTrigger);
      setEditingId(null);
    } else {
      onAdd(newTrigger);
    }
    setNewTrigger({ name: '', type: 'contains', pattern: '', command: '', delay: 0 });
  };

  const startEdit = (trigger) => {
    setNewTrigger({ 
      name: trigger.name, 
      type: trigger.type, 
      pattern: trigger.pattern, 
      command: trigger.command, 
      delay: trigger.delay || 0 
    });
    setEditingId(trigger.id);
  };

  const cancelEdit = () => {
    setNewTrigger({ name: '', type: 'contains', pattern: '', command: '', delay: 0 });
    setEditingId(null);
  };

  return (
    <div className="manager-container">
      <div className="manager-header">
        <h3>Trigger Management</h3>
        <div className="help-text">
          Automatically execute commands when specific text patterns are received from the server.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="trigger-form">
        <div className="form-row">
          <input
            type="text"
            placeholder="Trigger name"
            value={newTrigger.name}
            onChange={e => setNewTrigger(prev => ({ ...prev, name: e.target.value }))}
            className="form-input"
          />
          <select
            value={newTrigger.type}
            onChange={e => setNewTrigger(prev => ({ ...prev, type: e.target.value }))}
            className="form-select"
          >
            <option value="contains">Contains Text</option>
            <option value="exact">Exact Match</option>
            <option value="regex">Regular Expression</option>
          </select>
        </div>

        <div className="form-row">
          <input
            type="text"
            placeholder={`Pattern to match (${newTrigger.type})`}
            value={newTrigger.pattern}
            onChange={e => setNewTrigger(prev => ({ ...prev, pattern: e.target.value }))}
            className="form-input"
            style={{ flex: 2 }}
          />
          <input
            type="text"
            placeholder="Command to execute"
            value={newTrigger.command}
            onChange={e => setNewTrigger(prev => ({ ...prev, command: e.target.value }))}
            className="form-input"
            style={{ flex: 2 }}
          />
        </div>

        <div className="form-row">
          <label className="delay-label">
            Delay: {newTrigger.delay}ms
            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={newTrigger.delay}
              onChange={e => setNewTrigger(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
              className="setting-slider"
            />
          </label>
        </div>

        <div className="form-buttons">
          <button type="submit" className="retro-button">
            {editingId !== null ? 'Update' : 'Add'} Trigger
          </button>
          {editingId !== null && (
            <button type="button" onClick={cancelEdit} className="retro-button">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="trigger-list">
        {triggers.map(trigger => (
          <div key={trigger.id} className={`trigger-item ${trigger.enabled ? 'enabled' : 'disabled'}`}>
            <div className="trigger-info">
              <div className="trigger-header">
                <strong>{trigger.name}</strong>
                <span className="trigger-type">({trigger.type})</span>
                <button 
                  onClick={() => onToggle(trigger.id)}
                  className={`toggle-btn ${trigger.enabled ? 'on' : 'off'}`}
                >
                  {trigger.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="trigger-detail">
                Pattern: "{trigger.pattern}" → Command: "{trigger.command}"
                {trigger.delay > 0 && <span className="delay-info"> (Delay: {trigger.delay}ms)</span>}
              </div>
            </div>
            <div className="trigger-actions">
              <button onClick={() => startEdit(trigger)} className="retro-button small">
                Edit
              </button>
              <button onClick={() => onDelete(trigger.id)} className="retro-button small danger">
                Delete
              </button>
            </div>
          </div>
        ))}
        {triggers.length === 0 && (
          <div className="empty-state">No triggers configured. Add your first trigger above!</div>
        )}
      </div>
    </div>
  );
}

// Environment detection
const isElectronEnv = isElectron();

function useStableCallback(cb) {
  const ref = useRef(cb);
  ref.current = cb;
  return useCallback((...args) => ref.current(...args), []);
}

function App() {
  const termRef = useRef(null);
  const xtermRef = useRef(null);
  const commRef = useRef(null); // Communication adapter
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

  // Initialize communication adapter
  useEffect(() => {
    const comm = createCommunicationAdapter();
    commRef.current = comm;

    // Set up event listeners
    comm.on('data', (text) => {
      if (xtermRef.current) {
        try {
          // Process triggers before displaying text
          processTriggers(text);
          
          // Convert \n\r to \r\n for better terminal compatibility
          const normalizedText = text.replace(/\n\r/g, '\r\n');
          xtermRef.current.write(normalizedText);
          
          // Force terminal refresh only if the method exists
          if (typeof xtermRef.current.refresh === 'function') {
            xtermRef.current.refresh(0, xtermRef.current.rows - 1);
          }
        } catch (error) {
          console.error('Error writing to terminal:', error);
        }
      }
    });

    comm.on('status', (statusMsg) => {
      writeStatus(statusMsg);
      interpretStatus(statusMsg);
    });

    comm.on('error', (errorMsg) => {
      writeStatus('ERROR: ' + errorMsg);
    });

    comm.on('log', (logData) => {
      downloadText(logData.join('\n'), 'session-log-hex.txt');
    });

    return () => {
      comm.close();
      comm.removeAllListeners();
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
        if (commRef.current && commRef.current.getStatus() === 'connected') {
          const now = Date.now();
          const timeSinceLastInput = (now - lastInputTimeRef.current) / 1000; // seconds
          
          // Only send heartbeat if user has been idle for the configured interval
          if (timeSinceLastInput >= heartbeatInterval) {
            commRef.current.sendInput('\n');
            console.log(`Heartbeat sent after ${Math.round(timeSinceLastInput)}s of inactivity`);
          }
        }
      }, 10000); // Check every 10 seconds instead of waiting the full interval
    }
  }, [heartbeatEnabled, heartbeatInterval, stopHeartbeat]);

  // Effect to restart heartbeat when settings change
  useEffect(() => {
    if (activePort && commRef.current && commRef.current.getCurrentPort()) {
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
    if (commRef.current) {
      commRef.current.close();
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
    
    // Use communication adapter to connect
    if (commRef.current) {
      commRef.current.connect(parseInt(selectedPort, 10));
    }
  }, [selectedPort, pushEvent]);

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
          } catch (e) {
            console.warn('Invalid regex pattern:', trigger.pattern);
          }
        }
        
        if (matches && commRef.current && commRef.current.getCurrentPort()) {
          // Execute trigger command
          setTimeout(() => {
            commRef.current.sendInput(trigger.command + '\n');
            console.log(`Trigger fired: "${trigger.name}" -> "${trigger.command}"`);
          }, trigger.delay || 0);
        }
      }
    }
  }, [triggers]);

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
    
    if (commRef.current && commRef.current.getCurrentPort()) {
      commRef.current.sendInput(dataToSend);
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
    if (commRef.current && commRef.current.getCurrentPort()) {
      commRef.current.requestLog();
    }
  };

  // Function key macro handler
  const handleFunctionKey = useCallback((e) => {
    // Check for function key macros (F1-F12)
    if (e.key.startsWith('F') && /^F([1-9]|1[0-2])$/.test(e.key)) {
      const functionKey = e.key;
      const macro = macros.find(m => m.type === 'function' && m.trigger === functionKey);
      if (macro && commRef.current && commRef.current.getCurrentPort()) {
        e.preventDefault();
        commRef.current.sendInput(macro.command + '\n');
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
      }
    };
    document.addEventListener('keydown', globalKeyHandler);
    return () => document.removeEventListener('keydown', globalKeyHandler);
  }, [handleFunctionKey]);

  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write('\x1b[32m> Terminal cleared\x1b[0m\r\n');
    }
  };

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
            
            {/* Tab Navigation */}
            <div className="settings-tabs">
              <button 
                className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveTab('general')}
              >
                General
              </button>
              <button 
                className={`tab-button ${activeTab === 'macros' ? 'active' : ''}`}
                onClick={() => setActiveTab('macros')}
              >
                Macros ({macros.length})
              </button>
              <button 
                className={`tab-button ${activeTab === 'triggers' ? 'active' : ''}`}
                onClick={() => setActiveTab('triggers')}
              >
                Triggers ({triggers.filter(t => t.enabled).length}/{triggers.length})
              </button>
            </div>
            
            <div className="settings-content">
              {/* General Settings Tab */}
              {activeTab === 'general' && (
                <>
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
                </>
              )}

              {/* Macros Tab */}
              {activeTab === 'macros' && (
                <MacroManager 
                  macros={macros}
                  onAdd={addMacro}
                  onEdit={editMacro}
                  onDelete={deleteMacro}
                />
              )}

              {/* Triggers Tab */}
              {activeTab === 'triggers' && (
                <TriggerManager 
                  triggers={triggers}
                  onAdd={addTrigger}
                  onEdit={editTrigger}
                  onDelete={deleteTrigger}
                  onToggle={toggleTrigger}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
