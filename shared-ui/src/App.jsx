import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import './App.css';
import Logo from './components/Logo';
import SettingsFlyout from './components/SettingsFlyout';
import LanguageSwitcher from './components/LanguageSwitcher';
import MacroBoard from './components/MacroBoard';

function useStableCallback(cb) {
  const ref = useRef(cb);
  ref.current = cb;
  return useCallback((...args) => ref.current(...args), []);
}

/**
 * Main App component that works with different communication backends
 * @param {Object} props
 * @param {Object} props.communicationAdapter - Adapter for handling connections (WebSocket for web, IPC for Electron)
 */
function App({ communicationAdapter }) {
  const { t } = useTranslation();
  const termRef = useRef(null);
  const xtermRef = useRef(null);
  const [status, setStatus] = useState('disconnected');
  const [selectedPort, setSelectedPort] = useState('5002');
  const [activePort, setActivePort] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Settings flyout tab state
  const [activeTab, setActiveTab] = useState('general');
  const [connEvents, setConnEvents] = useState([]); // {ts,message}
  
  // Settings
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(true);
  const [heartbeatInterval, setHeartbeatInterval] = useState(60); // seconds
  
  // Macros and Triggers
  const [macros, setMacros] = useState([]);
  const [triggers, setTriggers] = useState([]);

  // Macro handlers
  const addMacro = useCallback((macro) => {
    setMacros(prev => {
      const nextId = prev.length ? Math.max(...prev.map(m => m.id)) + 1 : 1;
      return [...prev, { id: nextId, enabled: true, ...macro }];
    });
  }, []);

  const editMacro = useCallback((id, updated) => {
    setMacros(prev => prev.map(m => m.id === id ? { ...m, ...updated } : m));
  }, []);

  const deleteMacro = useCallback((id) => {
    setMacros(prev => prev.filter(m => m.id !== id));
  }, []);

  // Trigger handlers
  const addTrigger = useCallback((trigger) => {
    setTriggers(prev => {
      const nextId = prev.length ? Math.max(...prev.map(t => t.id)) + 1 : 1;
      return [...prev, { id: nextId, enabled: true, delay: 0, ...trigger }];
    });
  }, []);

  const editTrigger = useCallback((id, updated) => {
    setTriggers(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
  }, []);

  const deleteTrigger = useCallback((id) => {
    setTriggers(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleTrigger = useCallback((id) => {
    setTriggers(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  }, []);

  // Refs for history and timers
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const inputRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const lastInputTimeRef = useRef(Date.now());

  // Load settings from localStorage
  useEffect(() => {
    const savedHeartbeat = localStorage.getItem('heartbeatEnabled');
    if (savedHeartbeat !== null) {
      setHeartbeatEnabled(JSON.parse(savedHeartbeat));
    }

    const savedInterval = localStorage.getItem('heartbeatInterval');
    if (savedInterval !== null) {
      setHeartbeatInterval(parseInt(savedInterval, 10));
    }

    const savedMacros = localStorage.getItem('mudClientMacros');
    if (savedMacros) {
      setMacros(JSON.parse(savedMacros));
    } else {
      // Default macros
      const defaultMacros = [
        { id: 1, name: 'Look Around', type: 'alias', trigger: 'l', commands: 'look', enabled: true },
        { id: 2, name: 'Quick Attack', type: 'function', trigger: 'F1', commands: 'kill target\nlook', enabled: true },
        { id: 3, name: 'Combat Combo', type: 'function', trigger: 'F2', commands: 'cast magic missile\ncast magic missile\ndrink healing potion', enabled: true }
      ];
      setMacros(defaultMacros);
    }

    const savedTriggers = localStorage.getItem('mudClientTriggers');
    if (savedTriggers) {
      setTriggers(JSON.parse(savedTriggers));
    } else {
      // Default triggers
      const defaultTriggers = [
        { id: 1, name: 'Health Warning', type: 'contains', pattern: 'hp', commands: 'drink healing\nrest', delay: 1000, enabled: true },
        { id: 2, name: 'Combat Alert', type: 'contains', pattern: 'attacks you', commands: 'say Help! I am under attack!\nflee', delay: 500, enabled: true },
        { id: 3, name: 'Auto Rest', type: 'contains', pattern: 'You are tired', commands: 'sit\nrest\nsay Taking a break', delay: 1000, enabled: true }
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

  // Connection event helper
  const pushEvent = useCallback((message) => {
    const ts = new Date().toLocaleTimeString();
    setConnEvents(prev => [...prev, { ts, message }]);
  }, []);

  // Heartbeat functionality
  const startHeartbeat = useCallback(() => {
    if (!heartbeatEnabled || heartbeatIntervalRef.current) return;

    heartbeatIntervalRef.current = setInterval(() => {
      const timeSinceLastInput = Date.now() - lastInputTimeRef.current;
      const shouldSendHeartbeat = timeSinceLastInput >= (heartbeatInterval * 1000);

      if (shouldSendHeartbeat && communicationAdapter && communicationAdapter.isConnected()) {
        communicationAdapter.sendInput('\r\n');
        console.log('Heartbeat sent (via adapter, CRLF)');
      }
    }, heartbeatInterval * 1000);
  }, [heartbeatEnabled, heartbeatInterval, communicationAdapter]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopHeartbeat();
  }, [stopHeartbeat]);

  // Execute trigger commands (supports multiple commands)
  const executeTrigger = useCallback((trigger) => {
    if (!communicationAdapter || !communicationAdapter.isConnected()) return;
    
    const commands = (trigger.commands || trigger.command || '').split('\n').filter(cmd => cmd.trim());
    
    commands.forEach((command, index) => {
      const trimmedCommand = command.trim();
      if (trimmedCommand) {
        // Add delay between commands (base delay + index delay)
        const totalDelay = (trigger.delay || 0) + (index * 150);
        setTimeout(() => {
          const payload = trimmedCommand.replace(/[\r\n]+$/g, '') + '\r\n';
          communicationAdapter.sendInput(payload);
          console.log(`Trigger fired: "${trigger.pattern}" -> "${trimmedCommand}"`);
        }, totalDelay);
      }
    });
  }, [communicationAdapter]);

  // Trigger processing
  const processTriggers = useCallback((text) => {
    for (const trigger of triggers) {
      if (!trigger.enabled) continue;

      let matches = false;
      if (trigger.type === 'contains') {
        matches = text.toLowerCase().includes(trigger.pattern.toLowerCase());
      } else if (trigger.type === 'regex') {
        try {
          const regex = new RegExp(trigger.pattern, 'i');
          matches = regex.test(text);
        } catch (e) {
          console.warn('Invalid regex pattern:', trigger.pattern);
        }
      }

      if (matches) {
        executeTrigger(trigger);
      }
    }
  }, [triggers, executeTrigger]);

  // Terminal output helper
  const writeToTerminal = useCallback((text) => {
    if (xtermRef.current && text) {
      try {
        xtermRef.current.write(text);
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
  }, []);

  // Setup communication adapter
  useEffect(() => {
    if (!communicationAdapter) return;

    communicationAdapter.onMessage = (data) => {
      if (typeof data === 'string') {
        writeToTerminal(data);
        processTriggers(data);
      } else if (data && typeof data === 'object') {
        if (data.type === 'log') {
          pushEvent(data.message);
        } else if (data.data) {
          writeToTerminal(data.data);
          processTriggers(data.data);
        }
      }
    };

    communicationAdapter.onStatusChange = (newStatus, port) => {
      setStatus(newStatus);
      if (newStatus === 'connected' && port) {
        setActivePort(port);
        pushEvent(`Connected to port ${port}`);
        startHeartbeat();
      } else if (newStatus === 'disconnected') {
        setActivePort(null);
        pushEvent('Disconnected');
        stopHeartbeat();
      } else if (newStatus === 'connecting') {
        pushEvent(`Connecting to port ${port}...`);
        // Clear any previous activePort when starting connection
        setActivePort(null);
      }
    };

    return () => {
      if (communicationAdapter.onMessage) {
        communicationAdapter.onMessage = null;
      }
      if (communicationAdapter.onStatusChange) {
        communicationAdapter.onStatusChange = null;
      }
    };
  }, [communicationAdapter, writeToTerminal, processTriggers, pushEvent, startHeartbeat, stopHeartbeat]);

  // Macro expansion helper
  const expandMacros = useCallback((input) => {
    // Check for text alias macros
    for (const macro of macros) {
      if (macro.type === 'alias' && macro.trigger === input.trim()) {
        // Execute all commands for this macro inline
        if (communicationAdapter && communicationAdapter.isConnected()) {
          const commands = (macro.commands || macro.command || '').split('\n').filter(cmd => cmd.trim());
          commands.forEach((command, index) => {
            const trimmedCommand = command.trim();
            if (trimmedCommand) {
              setTimeout(() => {
                const payload = trimmedCommand.replace(/[\r\n]+$/g, '') + '\r\n';
                communicationAdapter.sendInput(payload);
                console.log(`Macro command executed: ${trimmedCommand}`);
              }, index * 100);
            }
          });
        }
        return ''; // Return empty string to prevent sending the original input
      }
    }
    return input; // Return original input if no macro matches
  }, [macros, communicationAdapter]);

  const sendLine = useCallback(() => {
    const raw = inputValue;
    // Remove any trailing CR/LF so we don't send double newlines
    let line = raw.replace(/[\r\n]+$/g, '').trimEnd();
    
    // Update last input time when user sends a command
    lastInputTimeRef.current = Date.now();
    
    // Expand macros before sending
    line = expandMacros(line);
    
    // Always send something, even if empty (just newline)
    // Use CRLF to satisfy Telnet/MUD servers expecting carriage return + line feed
    const dataToSend = line + '\r\n';
    
    // Push original input to history (not expanded), only if non-empty and different from last
    if (raw.trim()) {
      const hist = historyRef.current;
      if (hist.length === 0 || hist[hist.length - 1] !== raw.trim()) {
        hist.push(raw.trim());
        if (hist.length > 200) hist.splice(0, hist.length - 200);
      }
    }
    historyIndexRef.current = -1;
    
    if (communicationAdapter && communicationAdapter.isConnected()) {
      communicationAdapter.sendInput(dataToSend);
      setInputValue('');
    }
    // refocus input
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [inputValue, macros, communicationAdapter]);

  // Execute a macro command directly (from MacroBoard click)
  const executeMacroCommand = useCallback((command) => {
    if (!command) return;
    if (communicationAdapter && communicationAdapter.isConnected()) {
      const payload = command.replace(/[\r\n]+$/g, '') + '\r\n';
      communicationAdapter.sendInput(payload);
      // Update last input time to avoid heartbeat firing immediately
      lastInputTimeRef.current = Date.now();
      // Provide subtle terminal feedback
      if (xtermRef.current) {
        try {
          xtermRef.current.write(`\x1b[33m> ${command}\x1b[0m\r\n`);
        } catch(e) {}
      }
    }
  }, [communicationAdapter]);

  const downloadText = (text, name) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveLog = () => {
    if (communicationAdapter && communicationAdapter.saveLog) {
      communicationAdapter.saveLog();
    }
  };

  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write('\x1b[32m> Terminal cleared\x1b[0m\r\n');
    }
  };

  // Execute macro commands (supports multiple commands)
  const executeMacroCommands = useCallback((macro) => {
    if (!communicationAdapter || !communicationAdapter.isConnected()) return;
    
    const commands = (macro.commands || macro.command || '').split('\n').filter(cmd => cmd.trim());
    
    commands.forEach((command, index) => {
      const trimmedCommand = command.trim();
      if (trimmedCommand) {
        // Add small delay between commands to avoid overwhelming the server
        setTimeout(() => {
          const payload = trimmedCommand.replace(/[\r\n]+$/g, '') + '\r\n';
          communicationAdapter.sendInput(payload);
          console.log(`Macro command executed: ${trimmedCommand}`);
        }, index * 100); // 100ms delay between each command
      }
    });
  }, [communicationAdapter]);

  // Function key macro handler
  const handleFunctionKey = useCallback((e) => {
    // Check for function key macros (F1-F12)
    if (e.key.startsWith('F') && /^F([1-9]|1[0-2])$/.test(e.key)) {
      const functionKey = e.key;
      const macro = macros.find(m => m.type === 'function' && m.trigger === functionKey);
      if (macro && communicationAdapter && communicationAdapter.isConnected()) {
        e.preventDefault();
        
        // Execute macro commands inline to avoid circular dependency
        const commands = (macro.commands || macro.command || '').split('\n').filter(cmd => cmd.trim());
        commands.forEach((command, index) => {
          const trimmedCommand = command.trim();
          if (trimmedCommand) {
            setTimeout(() => {
              const payload = trimmedCommand.replace(/[\r\n]+$/g, '') + '\r\n';
              communicationAdapter.sendInput(payload);
              console.log(`Macro command executed: ${trimmedCommand}`);
            }, index * 100);
          }
        });
        
        console.log(`Function key macro fired: ${functionKey}`);
        return true;
      }
    }
    return false;
  }, [macros, communicationAdapter]);

  // Global key handler for function keys
  useEffect(() => {
    const globalKeyHandler = (e) => {
      handleFunctionKey(e);
    };

    document.addEventListener('keydown', globalKeyHandler);
    return () => document.removeEventListener('keydown', globalKeyHandler);
  }, [handleFunctionKey]);

  const toggleConnection = useCallback(() => {
    if (!communicationAdapter) return;

    if (communicationAdapter.isConnected()) {
      communicationAdapter.disconnect();
    } else {
      communicationAdapter.connect(selectedPort);
    }
  }, [communicationAdapter, selectedPort]);

  // Status text helper
  const getStatusText = (status) => {
    if (status === 'connected' && activePort) {
      return `${t('app.connected')} (port ${activePort})`;
    }
    if (status === 'connecting') {
      return `${t('app.connecting')} (port ${selectedPort})...`;
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
              className={`retro-button ${status === 'connected' ? 'disconnect' : 'connect'}`} 
              onClick={toggleConnection}
            >
              {status === 'connected' ? '🔌 ' + t('app.disconnect') : '🔌 ' + t('app.connect')}
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

        </div>
      </div>

  {/* Macro Board (sticky notes) */}
  <MacroBoard macros={macros} onExecute={executeMacroCommand} />

      {/* Settings Flyout */}
      {settingsOpen && (
        <SettingsFlyout
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          macros={macros}
          addMacro={addMacro}
          editMacro={editMacro}
          deleteMacro={deleteMacro}
          triggers={triggers}
          addTrigger={addTrigger}
          editTrigger={editTrigger}
          deleteTrigger={deleteTrigger}
          toggleTrigger={toggleTrigger}
          heartbeatEnabled={heartbeatEnabled}
          setHeartbeatEnabled={setHeartbeatEnabled}
          heartbeatInterval={heartbeatInterval}
          setHeartbeatInterval={setHeartbeatInterval}
          logs={connEvents}
          onClearLogs={() => setConnEvents([])}
          onSaveLogs={saveLog}
        />
      )}
    </div>
  );
}

export default App;