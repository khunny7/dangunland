import { WebSocketServer } from 'ws';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MudConnection, TARGET_HOST, TARGET_PORTS } from './mud-connection.js';

// Basic config: hard-coded MUD host + dual ports with fallback (user requested)
const PORT = process.env.PORT || 8080; // WebSocket & static hosting port (still overridable)

// Resolve project root (server.js is backend/src/server.js -> go up two levels)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

// For Azure deployment, dist is copied to backend/dist
// For local dev, it's in frontend-react/dist
const DEPLOYED_DIST = path.join(__dirname, '..', 'dist');
const REACT_DIST = path.join(ROOT_DIR, 'frontend-react', 'dist');
const LEGACY_STATIC = path.join(ROOT_DIR, 'frontend', 'public');

// Basic mime map
const STATIC_DIR = fs.existsSync(DEPLOYED_DIST) ? DEPLOYED_DIST : (fs.existsSync(REACT_DIST) ? REACT_DIST : LEGACY_STATIC);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };

const server = http.createServer((req, res) => {
  try {
    const urlPath = new URL(req.url, 'http://localhost').pathname;
    let relPath = urlPath;
    if (relPath.endsWith('/')) relPath += 'index.html';
    const safePath = path.normalize(relPath).replace(/^\\+|^\/+/,'');
    let filePath = path.join(STATIC_DIR, safePath);
    if (!filePath.startsWith(STATIC_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        // SPA fallback to index.html if exists
        const indexPath = path.join(STATIC_DIR, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          fs.createReadStream(indexPath).pipe(res);
        } else {
          res.writeHead(404); res.end('Not found');
        }
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    });
  } catch {
    res.writeHead(500); res.end('Server error');
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });

// Telnet constants
const IAC = 255; // Interpret As Command
const DONT = 254;
const DO = 253;
const WONT = 252;
const WILL = 251;
const SB = 250;
const SE = 240;
// Common options
const OPT_ECHO = 1;
const OPT_SUPPRESS_GA = 3;
const OPT_NAWS = 31;

function buildCommand(cmd, opt) {
  return Buffer.from([IAC, cmd, opt]);
}

function sendInitialNegotiation(socket) {
  // Advertise willingness for basic options and request echo off server-side
  const seq = Buffer.concat([
    buildCommand(WILL, OPT_SUPPRESS_GA),
    buildCommand(DO, OPT_ECHO),
    buildCommand(WILL, OPT_NAWS)
  ]);
  socket.write(seq);
}

// Minimal Telnet parser: strips commands, responds to DO/WILL negotiation
function processTelnetData(buffer, socket) {
  const appBytes = [];
  let i = 0;
  while (i < buffer.length) {
    const b = buffer[i];
    if (b === IAC) {
      const cmd = buffer[i + 1];
      if (cmd === IAC) { // Escaped 0xFF
        appBytes.push(IAC);
        i += 2;
        continue;
      }
      if (cmd === DO || cmd === DONT || cmd === WILL || cmd === WONT) {
        const opt = buffer[i + 2];
        handleNegotiation(cmd, opt, socket);
        i += 3;
        continue;
      }
      if (cmd === SB) {
        // Subnegotiation: skip until IAC SE
        i += 2;
        while (i < buffer.length) {
          if (buffer[i] === IAC && buffer[i + 1] === SE) { i += 2; break; }
          i++;
        }
        continue;
      }
      // Other single-byte commands
      i += 2;
      continue;
    } else {
      appBytes.push(b);
      i++;
    }
  }
  return Buffer.from(appBytes);
}

function handleNegotiation(cmd, opt, socket) {
  // Policy: accept NAWS & SUPPRESS_GA; allow server to control echo
  if (cmd === DO) {
    if (opt === OPT_NAWS || opt === OPT_SUPPRESS_GA) {
      socket.write(buildCommand(WILL, opt));
    } else {
      socket.write(buildCommand(WONT, opt));
    }
  } else if (cmd === WILL) {
    if (opt === OPT_ECHO) {
      socket.write(buildCommand(DO, opt));
    } else {
      socket.write(buildCommand(DONT, opt));
    }
  }
}

wss.on('connection', (ws) => {
  let mudConnection = null;
  let closed = false;

  // Wait for explicit connect request
  ws.on('message', (msg, isBinary) => {
    if (isBinary) return;
    try {
      const obj = JSON.parse(msg.toString());
      if ((obj.t === 'switchPort' || obj.t === 'connect') && obj.port) {
        if (mudConnection) {
          mudConnection.close();
        }
        
        // Create new MUD connection
        mudConnection = new MudConnection();
        
        // Set up event handlers
        mudConnection.on('data', (data) => {
          if (!closed && ws.readyState === ws.OPEN) {
            ws.send(data);
          }
        });
        
        mudConnection.on('status', (status) => {
          if (!closed && ws.readyState === ws.OPEN) {
            sendJSON(ws, { t: 'status', data: status });
          }
        });
        
        mudConnection.on('error', (error) => {
          if (!closed && ws.readyState === ws.OPEN) {
            sendJSON(ws, { t: 'error', data: error });
          }
        });
        
        // Connect to the MUD server
        mudConnection.connect(obj.port);
        
      } else if (obj.t === 'input' && mudConnection) {
        mudConnection.sendInput(obj.data);
      } else if (obj.t === 'resize' && obj.cols && obj.rows && mudConnection) {
        mudConnection.sendResize(obj.cols, obj.rows);
      } else if (obj.t === 'saveLog' && mudConnection) {
        const log = mudConnection.getSessionLog();
        sendJSON(ws, { t: 'log', data: log });
      }
    } catch {
      sendJSON(ws, { t: 'error', data: 'bad message' });
    }
  });

  ws.on('close', () => {
    closed = true;
    if (mudConnection) {
      mudConnection.close();
    }
  });
});

function sendJSON(ws, obj) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

server.listen(PORT, () => {
  console.log(`Server listening on :${PORT} (proxy) targeting ${TARGET_HOST} ports [${TARGET_PORTS.join(', ')}]`);
  console.log(`Static files serving from: ${STATIC_DIR}`);
  console.log(`Static directory exists: ${fs.existsSync(STATIC_DIR)}`);
  if (fs.existsSync(STATIC_DIR)) {
    console.log(`Files in static directory:`, fs.readdirSync(STATIC_DIR));
  }
});
