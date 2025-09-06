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
  const [connEvents, setConnEvents] = useState([]); // {ts,message}
  const decoderRef = useRef(new TextDecoder('euc-kr'));

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
    
    // Wait for container to be properly sized
    const initTerminal = () => {
      const container = termRef.current;
      if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
        setTimeout(initTerminal, 50);
        return;
      }
      
      const term = new Terminal({
        convertEol: true,
        fontFamily: 'monospace',
        fontSize: 16,
        rows: 28,
        cols: 85,
        theme: { background: '#111111' },
        disableStdin: true, // prevent direct typing in terminal; use input bar only
        allowProposedApi: true
      });
      
      try {
        term.open(container);
        xtermRef.current = term;
        
        // Focus input after terminal is ready
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } catch (error) {
        console.warn('Terminal initialization error:', error);
      }
    };
    
    // Start initialization
    setTimeout(initTerminal, 100);
    
    return () => {
      try {
        if (xtermRef.current) {
          xtermRef.current.dispose();
        }
      } catch (error) {
        console.warn('Terminal disposal error:', error);
      }
    };
  }, []);

  const writeStatus = useCallback(line => {
    if (xtermRef.current) xtermRef.current.write(`\r\n*** ${line} ***\r\n`);
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
    };
    ws.onclose = () => {
      console.log('WebSocket closed');
      setStatus('Disconnected');
      pushEvent('ws:close');
      setActivePort(null);
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
        if (text && xtermRef.current) {
          xtermRef.current.write(text);
        }
      }
    };
  }, [selectedPort, pushEvent, writeStatus, interpretStatus]);

  const sendLine = useCallback(() => {
    const raw = inputValue;
    const line = raw.trimEnd();
    
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
    xtermRef.current?.clear();
  };

  return (
    <div className="appRoot">
      <div className="menuBar">
        <select value={selectedPort} onChange={e => setSelectedPort(e.target.value)}>
          <option value="5002">Server 1 (5002)</option>
          <option value="5003">Server 2 (5003)</option>
        </select>
        <button onClick={connect}>Connect</button>
        <button onClick={clearTerminal}>Clear</button>
        <button onClick={saveLog}>Save Log</button>
        <button onClick={() => setLogOpen(o => !o)}>{logOpen ? 'Hide Log' : 'Show Log'}</button>
        <span className="status">{status}</span>
        <span className="badge">{activePort ? `port:${activePort}` : 'port:?'}</span>
      </div>
      <div className="centerWrap">
        <div className="terminal" ref={termRef} />
        <div className="inputBarWrap">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); historyIndexRef.current = -1; }}
            onKeyDown={e => {
              if (e.key === 'Enter') { sendLine(); e.preventDefault(); }
              else if (e.key === 'ArrowUp') {
                const hist = historyRef.current;
                if (hist.length) {
                  if (historyIndexRef.current === -1) historyIndexRef.current = hist.length - 1; else if (historyIndexRef.current > 0) historyIndexRef.current--;
                  setInputValue(hist[historyIndexRef.current]);
                  e.preventDefault();
                }
              } else if (e.key === 'ArrowDown') {
                const hist = historyRef.current;
                if (hist.length) {
                  if (historyIndexRef.current >= 0) historyIndexRef.current++;
                  if (historyIndexRef.current >= hist.length) { historyIndexRef.current = -1; setInputValue(''); } else { setInputValue(hist[historyIndexRef.current]); }
                  e.preventDefault();
                }
              }
            }}
            placeholder="Type your command..."
            spellCheck={false}
            autoComplete="off"
          />
          <button onClick={sendLine}>Send</button>
        </div>
        {logOpen && (
          <div className="connLogPanel">
            <div className="connLogHeader">
              <strong>Connection Log</strong>
              <button onClick={() => setConnEvents([])}>Clear</button>
            </div>
            <ul className="connLogList">
              {connEvents.slice().reverse().map((e,i) => (
                <li key={i}>{e.ts} {e.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
export default App;
