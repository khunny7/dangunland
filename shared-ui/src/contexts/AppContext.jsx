import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Create the context
const AppContext = createContext();

// Custom hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// App Provider Component
export const AppProvider = ({ children, communicationAdapter }) => {
  // Connection state
  const [status, setStatus] = useState('disconnected');
  const [selectedServer, setSelectedServer] = useState(null);
  const [activeServer, setActiveServer] = useState(null);
  const [inputValue, setInputValue] = useState('');

  // Server management
  const [servers, setServers] = useState([]);
  
  // Settings and UI state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [connEvents, setConnEvents] = useState([]); // {ts,message}
  
  // General settings
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(true);
  const [heartbeatInterval, setHeartbeatInterval] = useState(60); // seconds
  
  // Theme settings
  const [selectedTheme, setSelectedTheme] = useState('classic');
  
  // Terminal themes (using useMemo to ensure stability)
  const terminalThemes = useMemo(() => ({
    classic: {
      name: 'Classic Green',
      description: 'Traditional green-on-black terminal',
      colors: {
        background: '#001100',
        foreground: '#00ff41',
        cursor: '#00ff41',
        cursorAccent: '#001100',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#f8f8f2',
        brightBlack: '#44475a',
        brightRed: '#ff5555',
        brightGreen: '#50fa7b',
        brightYellow: '#f1fa8c',
        brightBlue: '#bd93f9',
        brightMagenta: '#ff79c6',
        brightCyan: '#8be9fd',
        brightWhite: '#ffffff'
      }
    },
    dark: {
      name: 'Dark Professional',
      description: 'Modern dark theme for professional use',
      colors: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#1e1e1e',
        selection: 'rgba(255, 255, 255, 0.25)',
        black: '#000000',
        red: '#f14c4c',
        green: '#23d18b',
        yellow: '#f5f543',
        blue: '#3b8eea',
        magenta: '#d670d6',
        cyan: '#29b8db',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
      }
    },
    light: {
      name: 'Light Mode',
      description: 'Easy on the eyes light theme',
      colors: {
        background: '#fafafa',
        foreground: '#383a42',
        cursor: '#526fff',
        cursorAccent: '#ffffff',
        selection: 'rgba(82, 111, 255, 0.2)',
        black: '#000000',
        red: '#ca1243',
        green: '#50a14f',
        yellow: '#c18401',
        blue: '#4078f2',
        magenta: '#a626a4',
        cyan: '#0184bc',
        white: '#a0a1a7',
        brightBlack: '#5c6370',
        brightRed: '#ca1243',
        brightGreen: '#50a14f',
        brightYellow: '#c18401',
        brightBlue: '#4078f2',
        brightMagenta: '#a626a4',
        brightCyan: '#0184bc',
        brightWhite: '#ffffff'
      }
    },
    retro: {
      name: 'Retro Amber',
      description: 'Classic amber terminal aesthetic',
      colors: {
        background: '#0d0400',
        foreground: '#ffb000',
        cursor: '#ffb000',
        cursorAccent: '#0d0400',
        selection: 'rgba(255, 176, 0, 0.3)',
        black: '#000000',
        red: '#ff8000',
        green: '#ffb000',
        yellow: '#ffd000',
        blue: '#ff9000',
        magenta: '#ff8800',
        cyan: '#ffaa00',
        white: '#ffc000',
        brightBlack: '#804000',
        brightRed: '#ff8000',
        brightGreen: '#ffb000',
        brightYellow: '#ffd000',
        brightBlue: '#ff9000',
        brightMagenta: '#ff8800',
        brightCyan: '#ffaa00',
        brightWhite: '#ffffff'
      }
    },
    highContrast: {
      name: 'High Contrast',
      description: 'Maximum contrast for accessibility',
      colors: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selection: 'rgba(255, 255, 255, 0.5)',
        black: '#000000',
        red: '#ff0000',
        green: '#00ff00',
        yellow: '#ffff00',
        blue: '#0000ff',
        magenta: '#ff00ff',
        cyan: '#00ffff',
        white: '#ffffff',
        brightBlack: '#808080',
        brightRed: '#ff0000',
        brightGreen: '#00ff00',
        brightYellow: '#ffff00',
        brightBlue: '#0000ff',
        brightMagenta: '#ff00ff',
        brightCyan: '#00ffff',
        brightWhite: '#ffffff'
      }
    }
  }), []);
  
  // Macros and Triggers
  const [macros, setMacros] = useState([]);
  const [triggers, setTriggers] = useState([]);

  // Refs for history and timers
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const heartbeatIntervalRef = useRef(null);
  const lastInputTimeRef = useRef(Date.now());

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

  // Server management functions
  const addServer = useCallback((server) => {
    const nextId = Math.max(0, ...servers.map(s => s.id)) + 1;
    const newServer = { id: nextId, ...server };
    setServers(prev => [...prev, newServer]);
    return newServer;
  }, [servers]);

  const editServer = useCallback((id, updated) => {
    setServers(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  }, []);

  const deleteServer = useCallback((id) => {
    setServers(prev => {
      const filtered = prev.filter(s => s.id !== id);
      // If we're deleting the selected server, select the first available
      if (selectedServer && selectedServer.id === id) {
        setSelectedServer(filtered.length > 0 ? filtered[0] : null);
      }
      return filtered;
    });
  }, [selectedServer]);

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

  // Save log function
  const saveLog = useCallback(() => {
    if (communicationAdapter && communicationAdapter.saveLog) {
      communicationAdapter.saveLog();
    }
  }, [communicationAdapter]);

  // Load settings from localStorage on mount
  useEffect(() => {
    // Load heartbeat settings
    const savedHeartbeat = localStorage.getItem('heartbeatEnabled');
    if (savedHeartbeat !== null) {
      setHeartbeatEnabled(JSON.parse(savedHeartbeat));
    }

    const savedInterval = localStorage.getItem('heartbeatInterval');
    if (savedInterval !== null) {
      setHeartbeatInterval(parseInt(savedInterval, 10));
    }

    // Load theme settings
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme && terminalThemes[savedTheme]) {
      setSelectedTheme(savedTheme);
    }

    // Load macros
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

    // Load triggers
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

    // Initialize servers
    const savedServers = localStorage.getItem('mudClientServers');
    let serversToUse = [];
    
    if (savedServers) {
      try {
        const parsedServers = JSON.parse(savedServers);
        if (Array.isArray(parsedServers) && parsedServers.length > 0) {
          serversToUse = parsedServers;
        }
      } catch (e) {
        console.warn('Failed to parse saved servers, using defaults:', e);
      }
    }
    
    // If no valid saved servers, create defaults
    if (serversToUse.length === 0) {
      serversToUse = [
        { id: 1, name: 'DangunLand Server 1', host: 'dangunland.piano8283.com', port: 5002, description: 'Main game server' },
        { id: 2, name: 'DangunLand Server 2', host: 'dangunland.piano8283.com', port: 5003, description: 'Alternative server' }
      ];
    }
    
    setServers(serversToUse);
    
    // Set default selected server
    const savedSelectedServer = localStorage.getItem('mudClientSelectedServer');
    let selectedServerToUse = null;
    
    if (savedSelectedServer) {
      const selectedId = parseInt(savedSelectedServer, 10);
      selectedServerToUse = serversToUse.find(s => s.id === selectedId);
    }
    
    // Fallback to first server if no valid selection
    if (!selectedServerToUse && serversToUse.length > 0) {
      selectedServerToUse = serversToUse[0];
    }
    
    setSelectedServer(selectedServerToUse);
  }, [terminalThemes]);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('heartbeatEnabled', JSON.stringify(heartbeatEnabled));
  }, [heartbeatEnabled]);

  useEffect(() => {
    localStorage.setItem('heartbeatInterval', heartbeatInterval.toString());
  }, [heartbeatInterval]);

  useEffect(() => {
    localStorage.setItem('selectedTheme', selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    localStorage.setItem('mudClientMacros', JSON.stringify(macros));
  }, [macros]);

  useEffect(() => {
    localStorage.setItem('mudClientTriggers', JSON.stringify(triggers));
  }, [triggers]);

  useEffect(() => {
    localStorage.setItem('mudClientServers', JSON.stringify(servers));
  }, [servers]);

  useEffect(() => {
    if (selectedServer) {
      localStorage.setItem('mudClientSelectedServer', selectedServer.id.toString());
    }
  }, [selectedServer]);

  // Cleanup heartbeat on unmount
  useEffect(() => {
    return () => stopHeartbeat();
  }, [stopHeartbeat]);

  // Context value
  const contextValue = {
    // Connection state
    status,
    setStatus,
    selectedServer,
    setSelectedServer,
    activeServer,
    setActiveServer,
    inputValue,
    setInputValue,
    
    // Server management
    servers,
    setServers,
    addServer,
    editServer,
    deleteServer,
    
    // Settings and UI state
    settingsOpen,
    setSettingsOpen,
    activeTab,
    setActiveTab,
    connEvents,
    setConnEvents,
    pushEvent,
    
    // General settings
    heartbeatEnabled,
    setHeartbeatEnabled,
    heartbeatInterval,
    setHeartbeatInterval,
    
    // Theme settings
    selectedTheme,
    setSelectedTheme,
    terminalThemes,
    
    // Macros and Triggers
    macros,
    setMacros,
    addMacro,
    editMacro,
    deleteMacro,
    triggers,
    setTriggers,
    addTrigger,
    editTrigger,
    deleteTrigger,
    toggleTrigger,
    
    // Refs and utilities
    historyRef,
    historyIndexRef,
    heartbeatIntervalRef,
    lastInputTimeRef,
    
    // Functions
    startHeartbeat,
    stopHeartbeat,
    saveLog,
    
    // Communication adapter
    communicationAdapter
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};