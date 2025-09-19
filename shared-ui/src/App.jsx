import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import './App.css';
import Logo from './components/Logo';
import SettingsFlyout from './components/SettingsFlyout';
import LanguageSwitcher from './components/LanguageSwitcher';

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
  const [logOpen, setLogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connEvents, setConnEvents] = useState([]); // {ts,message}
  
  // Settings
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(true);
  const [heartbeatInterval, setHeartbeatInterval] = useState(60); // seconds
  
  // Macros and Triggers
  const [macros, setMacros] = useState([]);
  const [triggers, setTriggers] = useState([]);
  
  // Terminal setup
  useEffect(() => {
    if (!termRef.current) return;
    
    const term = new Terminal({
      convertEol: true,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      fontSize: 16,
      lineHeight: 1.2,
      theme: {
        background: '#000000',
        foreground: '#00FF00',
        cursor: '#00FF00',
        cursorAccent: '#000000',
        selection: '#333333'
      },
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      allowTransparency: true
    });
    
    term.open(termRef.current);
    xtermRef.current = term;
    
    return () => {
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  // Communication adapter setup
  useEffect(() => {
    if (!communicationAdapter) return;

    const handleMessage = (data) => {
      if (typeof data === 'string') {
        // Handle text data
        if (xtermRef.current) {
          xtermRef.current.write(data);
        }
      } else if (data && typeof data === 'object') {
        // Handle structured messages
        if (data.type === 'status') {
          setStatus(data.status);
          if (data.port) setActivePort(data.port);
        } else if (data.type === 'data' && xtermRef.current) {
          xtermRef.current.write(data.content);
        } else if (data.type === 'log') {
          const timestamp = new Date().toISOString();
          setConnEvents(prev => [...prev.slice(-199), { ts: timestamp, message: data.message }]);
        }
      }
    };

    const handleStatusChange = (status, port) => {
      setStatus(status);
      if (port) setActivePort(port);
      const timestamp = new Date().toISOString();
      setConnEvents(prev => [...prev.slice(-199), { ts: timestamp, message: `${status}${port ? `:${port}` : ''}` }]);
    };

    communicationAdapter.onMessage = handleMessage;
    communicationAdapter.onStatusChange = handleStatusChange;

    return () => {
      communicationAdapter.disconnect?.();
    };
  }, [communicationAdapter]);

  const connect = useStableCallback((port = selectedPort) => {
    if (communicationAdapter) {
      communicationAdapter.connect(port);
    }
  });

  const disconnect = useStableCallback(() => {
    if (communicationAdapter) {
      communicationAdapter.disconnect();
    }
  });

  const sendInput = useStableCallback((input) => {
    if (communicationAdapter && communicationAdapter.isConnected()) {
      communicationAdapter.sendInput(input);
    }
  });

  const handleInputSubmit = useStableCallback(() => {
    if (inputValue.trim()) {
      sendInput(inputValue);
      setInputValue('');
    }
  });

  const saveLog = () => {
    if (communicationAdapter) {
      communicationAdapter.saveLog?.();
    }
  };

  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  // Load settings from localStorage
  useEffect(() => {
    const savedMacros = localStorage.getItem('dangunland-macros');
    const savedTriggers = localStorage.getItem('dangunland-triggers');
    const savedHeartbeat = localStorage.getItem('dangunland-heartbeat');
    const savedInterval = localStorage.getItem('dangunland-heartbeat-interval');
    
    if (savedMacros) {
      try {
        setMacros(JSON.parse(savedMacros));
      } catch (e) {
        console.warn('Failed to load macros from localStorage:', e);
      }
    }
    
    if (savedTriggers) {
      try {
        setTriggers(JSON.parse(savedTriggers));
      } catch (e) {
        console.warn('Failed to load triggers from localStorage:', e);
      }
    }
    
    if (savedHeartbeat !== null) {
      setHeartbeatEnabled(savedHeartbeat === 'true');
    }
    
    if (savedInterval) {
      const interval = parseInt(savedInterval, 10);
      if (!isNaN(interval) && interval > 0) {
        setHeartbeatInterval(interval);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('dangunland-macros', JSON.stringify(macros));
  }, [macros]);

  useEffect(() => {
    localStorage.setItem('dangunland-triggers', JSON.stringify(triggers));
  }, [triggers]);

  useEffect(() => {
    localStorage.setItem('dangunland-heartbeat', heartbeatEnabled.toString());
  }, [heartbeatEnabled]);

  useEffect(() => {
    localStorage.setItem('dangunland-heartbeat-interval', heartbeatInterval.toString());
  }, [heartbeatInterval]);

  return (
    <div className="app">
      <header className="header">
        <Logo />
        <div className="header-controls">
          <LanguageSwitcher />
          <button
            className="settings-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('settings.title')}
          >
            ⚙️
          </button>
        </div>
      </header>

      <main className="main">
        <div className="terminal-container">
          <div className="terminal-header">
            <div className="connection-status">
              <span className={`status-indicator ${status}`} />
              <span className="status-text">
                {status === 'connected' ? t('status.connected') : 
                 status === 'connecting' ? t('status.connecting') : 
                 t('status.disconnected')}
                {activePort && ` (${t('port')} ${activePort})`}
              </span>
            </div>
            <div className="terminal-controls">
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                disabled={status === 'connected' || status === 'connecting'}
              >
                <option value="5002">5002</option>
                <option value="5003">5003</option>
              </select>
              {status === 'connected' ? (
                <button onClick={disconnect} className="disconnect-btn">
                  {t('disconnect')}
                </button>
              ) : (
                <button 
                  onClick={() => connect(selectedPort)} 
                  className="connect-btn"
                  disabled={status === 'connecting'}
                >
                  {t('connect')}
                </button>
              )}
              <button onClick={clearTerminal} className="clear-btn">
                {t('clear')}
              </button>
              <button onClick={saveLog} className="save-log-btn">
                {t('saveLog')}
              </button>
              <button 
                onClick={() => setLogOpen(!logOpen)} 
                className="toggle-log-btn"
              >
                {t('logs')}
              </button>
            </div>
          </div>
          
          <div ref={termRef} className="terminal" />
          
          <div className="input-container">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInputSubmit();
                }
              }}
              placeholder={t('inputPlaceholder')}
              className="command-input"
              disabled={status !== 'connected'}
            />
            <button 
              onClick={handleInputSubmit}
              disabled={status !== 'connected' || !inputValue.trim()}
              className="send-btn"
            >
              {t('send')}
            </button>
          </div>
        </div>

        {logOpen && (
          <div className="log-panel">
            <div className="log-header">
              <h3>{t('connectionLog')}</h3>
              <button onClick={() => setLogOpen(false)}>×</button>
            </div>
            <div className="log-content">
              {connEvents.map((event, i) => (
                <div key={i} className="log-entry">
                  <span className="log-time">{event.ts}</span>
                  <span className="log-message">{event.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {settingsOpen && (
        <SettingsFlyout
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          macros={macros}
          setMacros={setMacros}
          triggers={triggers}
          setTriggers={setTriggers}
          heartbeatEnabled={heartbeatEnabled}
          setHeartbeatEnabled={setHeartbeatEnabled}
          heartbeatInterval={heartbeatInterval}
          setHeartbeatInterval={setHeartbeatInterval}
        />
      )}
    </div>
  );
}

export default App;