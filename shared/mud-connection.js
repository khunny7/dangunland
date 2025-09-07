import net from 'node:net';
import iconv from 'iconv-lite';
import { EventEmitter } from 'node:events';

// MUD server configuration
export const TARGET_HOST = 'dangunland.iptime.org';
export const TARGET_PORTS = [5002, 5003];
export const ENCODING = 'euc-kr';

// Telnet protocol constants
const IAC = 255;  // "Interpret As Command"
const DO = 253;
const DONT = 254;
const WILL = 251;
const WONT = 252;
const SB = 250;   // Subnegotiation Begin
const SE = 240;   // Subnegotiation End

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
    }
    appBytes.push(b);
    i++;
  }
  return Buffer.from(appBytes);
}

/**
 * MUD Connection Manager
 * Handles direct connection to MUD server with Telnet protocol support
 */
export class MudConnection extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.connectedPort = null;
    this.sessionLog = [];
    this.closed = false;
  }

  /**
   * Connect to MUD server on specified port
   * @param {number} port - Port number to connect to
   */
  connect(port) {
    if (this.closed) return;
    
    if (!TARGET_PORTS.includes(port)) {
      this.emit('error', `Invalid port: ${port}. Must be one of: ${TARGET_PORTS.join(', ')}`);
      return;
    }

    // Close existing connection
    if (this.socket) {
      this.socket.destroy();
    }

    this.emit('status', `connecting:${TARGET_HOST}:${port}`);
    
    const socket = net.createConnection(port, TARGET_HOST);
    this.socket = socket;
    let connected = false;

    socket.on('connect', () => {
      connected = true;
      this.connectedPort = port;
      this.emit('status', `connected:${TARGET_HOST}:${port}`);
      sendInitialNegotiation(socket);
    });

    socket.on('error', (e) => {
      if (!connected) {
        this.emit('error', `Failed to connect to port ${port}: ${e.message}`);
      } else {
        this.emit('error', e.message);
      }
    });

    socket.on('close', () => {
      if (!this.closed) {
        this.emit('status', 'disconnect');
        this.socket = null;
        this.connectedPort = null;
      }
    });

    socket.on('data', (buf) => {
      this.sessionLog.push(buf.toString('hex'));
      const cleaned = processTelnetData(buf, socket);
      if (cleaned.length) {
        this.emit('data', cleaned);
      }
    });
  }

  /**
   * Send input to MUD server
   * @param {string} data - Text to send (will be encoded to EUC-KR)
   */
  sendInput(data) {
    if (this.socket && this.socket.readyState === 'open') {
      const encoded = iconv.encode(data, ENCODING);
      this.socket.write(encoded);
    }
  }

  /**
   * Send terminal resize information
   * @param {number} cols - Terminal columns
   * @param {number} rows - Terminal rows
   */
  sendResize(cols, rows) {
    if (this.socket && this.socket.readyState === 'open') {
      const naws = Buffer.from([
        IAC, SB, OPT_NAWS,
        (cols >> 8) & 0xff, cols & 0xff,
        (rows >> 8) & 0xff, rows & 0xff,
        IAC, SE
      ]);
      this.socket.write(naws);
    }
  }

  /**
   * Get session log
   * @returns {string[]} Array of hex-encoded data packets
   */
  getSessionLog() {
    return [...this.sessionLog];
  }

  /**
   * Close connection
   */
  close() {
    this.closed = true;
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connectedPort = null;
  }

  /**
   * Check if connected
   * @returns {boolean} True if connected to MUD server
   */
  isConnected() {
    return this.socket && this.socket.readyState === 'open';
  }

  /**
   * Get current port
   * @returns {number|null} Current connected port or null
   */
  getCurrentPort() {
    return this.connectedPort;
  }
}