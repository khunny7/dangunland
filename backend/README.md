# Backend Proxy

Node.js WebSocket proxy translating Telnet EUC-KR MUD stream to UTF-8 JSON messages for the browser.

## Configuration
MUD host & ports are hard-coded now:
```
Host: dangunland.iptime.org
Ports (fallback order): 5002, 5003
Encoding: euc-kr (input encoding)
```
Only the web server PORT can still be overridden via environment variable `PORT`.

## Run (development)
`npm install` inside `backend` then `npm run dev`.

Serves static frontend from `../frontend/public`. Automatically attempts port 5002 then 5003 if first fails.
