import { Terminal } from 'https://cdn.jsdelivr.net/npm/xterm/+esm';

const term = new Terminal({
  convertEol: true,
  fontFamily: 'monospace',
  fontSize: 16,
  theme: { background: '#111111' }
});
term.open(document.getElementById('terminal'));

let ws;
let pending = '';
let reconnectTimer = null;
const statusEl = document.getElementById('status');
const decoder = new TextDecoder('euc-kr');
const portBadge = document.getElementById('portBadge');
const connLogPanel = document.getElementById('connLogPanel');
const connLogList = document.getElementById('connLogList');
const toggleLogBtn = document.getElementById('toggleLogBtn');
const clearLogBtn = document.getElementById('clearLogBtn');
const closeLogBtn = document.getElementById('closeLogBtn');
const portSelect = document.getElementById('portSelect');
const connectBtn = document.getElementById('connectBtn');
let currentPort = null;
const connEvents = [];
let selectedPort = portSelect ? portSelect.value : '5002';

if (portSelect) {
  portSelect.onchange = (e) => {
    selectedPort = e.target.value;
    portBadge.textContent = `port:${selectedPort}`;
  };
}

if (connectBtn) {
  connectBtn.onclick = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    connect(selectedPort);
  };
}

function connect(port) {
  statusEl.textContent = 'Connecting...';
  portBadge.textContent = `port:${port}`;
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.binaryType = 'arraybuffer';
  ws.onopen = () => {
    statusEl.textContent = 'WebSocket Open';
    logEvent('ws-open');
    sendResize();
    // Tell backend to switch port
    ws.send(JSON.stringify({ t: 'switchPort', port: parseInt(port, 10) }));
  };
  ws.onclose = () => {
    statusEl.textContent = 'Disconnected';
    logEvent('ws-close');
    currentPort = null; updatePortBadge();
    // No auto-reconnect
  };
  ws.onerror = () => {
    statusEl.textContent = 'Error';
  };
  ws.onmessage = (ev) => {
    if (typeof ev.data === 'string') {
      try {
        const obj = JSON.parse(ev.data);
        if (obj.t === 'status') {
          term.write(`\r\n*** ${obj.data} ***\r\n`);
          interpretStatus(obj.data);
        } else if (obj.t === 'error') term.write(`\r\n*** ERROR: ${obj.data} ***\r\n`);
        else if (obj.t === 'log') downloadText(obj.data.join('\n'), 'session-log-hex.txt');
      } catch (e) { console.error(e); }
    } else {
      const u8 = new Uint8Array(ev.data);
      const text = decoder.decode(u8, { stream: true });
      if (text) term.write(text);
    }
  };
}

// No auto-reconnect

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

// Input bar logic: buffer text, send only on Enter or Send button
const inputBar = document.getElementById('inputBar');
const sendBtn = document.getElementById('sendBtn');
if (inputBar) {
  inputBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendInputBar();
      e.preventDefault();
    }
  });
}
if (sendBtn) {
  sendBtn.onclick = sendInputBar;
}

function sendInputBar() {
  if (!inputBar) return;
  const val = inputBar.value;
  if (val.trim().length > 0) {
    send({ t: 'input', data: val + '\n' });
    inputBar.value = '';
    inputBar.focus();
  }
}

function sendResize() {
  const cols = term.cols;
  const rows = term.rows;
  send({ t: 'resize', cols, rows });
}
window.addEventListener('resize', () => {
  sendResize();
});

function downloadText(text, name) {
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

document.getElementById('reconnectBtn').onclick = () => {
  if (ws) ws.close();
};

document.getElementById('saveLogBtn').onclick = () => {
  send({ t: 'saveLog' });
};

connect();

// ----- Helper & UI functions -----
function interpretStatus(text) {
  if (/^(connecting|connected):/.test(text)) {
    const parts = text.split(':');
    const state = parts[0];
    const port = parts[2];
    if (state === 'connected') {
      currentPort = port;
      statusEl.textContent = `Connected (port ${port})`;
    } else if (state === 'connecting') {
      statusEl.textContent = `Connecting (port ${port})...`;
    }
    updatePortBadge();
    logEvent(text);
  } else if (text === 'disconnect') {
    logEvent('disconnect');
  }
}

function updatePortBadge() {
  portBadge.textContent = `port:${currentPort ? currentPort : '?'}`;
}

function logEvent(message) {
  const ts = new Date().toISOString().split('T')[1].replace('Z','');
  connEvents.push({ ts, message });
  if (connEvents.length > 200) connEvents.shift();
  if (connLogPanel && connLogPanel.style.display !== 'none') renderConnLog();
}

function renderConnLog() {
  if (!connLogList) return;
  connLogList.innerHTML = '';
  for (let i = connEvents.length - 1; i >= 0; i--) {
    const li = document.createElement('li');
    const e = connEvents[i];
    li.textContent = `${e.ts} ${e.message}`;
    connLogList.appendChild(li);
  }
}

if (toggleLogBtn) toggleLogBtn.onclick = () => {
  if (connLogPanel.style.display === 'none') {
    renderConnLog();
    connLogPanel.style.display = 'block';
  } else {
    connLogPanel.style.display = 'none';
  }
};
if (clearLogBtn) clearLogBtn.onclick = () => { connEvents.length = 0; renderConnLog(); };
if (closeLogBtn) closeLogBtn.onclick = () => { connLogPanel.style.display = 'none'; };
