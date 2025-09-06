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
let currentPort = null;
const connEvents = [];

function connect() {
  statusEl.textContent = 'Connecting...';
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.binaryType = 'arraybuffer';
  ws.onopen = () => {
    statusEl.textContent = 'WebSocket Open';
    logEvent('ws-open');
    sendResize();
  };
  ws.onclose = () => {
    statusEl.textContent = 'Disconnected';
    logEvent('ws-close');
    currentPort = null; updatePortBadge();
    scheduleReconnect();
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

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 2000);
}

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

// IME friendly input: capture key events, but allow composition
let composing = false;
term.textarea.addEventListener('compositionstart', () => composing = true);
term.textarea.addEventListener('compositionend', (e) => {
  composing = false;
  pending += e.data;
});
term.onKey(e => {
  const { key, domEvent } = e;
  if (composing) return;
  if (domEvent.key === 'Enter') {
    send({ t: 'input', data: pending + '\n' });
    pending = '';
  } else if (domEvent.key === 'Backspace') {
    pending = pending.slice(0, -1);
  } else if (key && key.length === 1) {
    pending += key;
  }
});

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

// ----- Helper & UI functions (outside connect) -----
function interpretStatus(text) {
  // Patterns: connecting:host:port | connected:host:port | disconnect
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
  if (connLogPanel.style.display !== 'none') renderConnLog();
}

function renderConnLog() {
  connLogList.innerHTML = '';
  for (let i = connEvents.length - 1; i >= 0; i--) {
    const li = document.createElement('li');
    const e = connEvents[i];
    li.textContent = `${e.ts} ${e.message}`;
    connLogList.appendChild(li);
  }
}

toggleLogBtn.onclick = () => {
  if (connLogPanel.style.display === 'none') {
    renderConnLog();
    connLogPanel.style.display = 'block';
  } else {
    connLogPanel.style.display = 'none';
  }
};
clearLogBtn.onclick = () => {
  connEvents.length = 0;
  renderConnLog();
};
closeLogBtn.onclick = () => { connLogPanel.style.display = 'none'; };
