'use strict';

const { ipcMain, BrowserWindow } = require('electron');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');

const DEFAULT_PORT = 7777;
const MAX_CLIENTS = 3;
const JOIN_TIMEOUT_MS = 8000;

let wss = null;
let clientWs = null;
let mode = 'idle';
const peers = new Map();
let nextPeerId = 1;

function getWin() {
  return BrowserWindow.getAllWindows()[0] || null;
}

function emit(payload) {
  const win = getWin();
  if (win && !win.isDestroyed()) win.webContents.send('farm-net', payload);
}

function listLocalIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      const v4 = net.family === 'IPv4' || net.family === 4;
      if (!v4 || net.internal) continue;
      ips.push({
        address: net.address,
        name,
        radmin: net.address.startsWith('26.')
      });
    }
  }
  ips.sort((a, b) => Number(b.radmin) - Number(a.radmin));
  return ips;
}

function sendJson(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
}

function closeAll() {
  if (wss) {
    for (const ws of wss.clients) {
      try { ws.close(); } catch { /* ignore */ }
    }
    try { wss.close(); } catch { /* ignore */ }
    wss = null;
  }
  if (clientWs) {
    const old = clientWs;
    clientWs = null;
    try { old.close(); } catch { /* ignore */ }
  }
  peers.clear();
  nextPeerId = 1;
  mode = 'idle';
}

function registerIpc() {
  ipcMain.handle('net-list-ips', () => listLocalIps());

  ipcMain.handle('net-host', async (_event, port) => {
    closeAll();
    const listenPort = Number(port) || DEFAULT_PORT;
    return await new Promise((resolve, reject) => {
      let settled = false;
      try {
        wss = new WebSocketServer({ host: '0.0.0.0', port: listenPort });
      } catch (err) {
        return reject(err);
      }
      wss.on('error', (err) => {
        emit({ kind: 'error', message: err.message || 'Falha ao hospedar' });
        if (!settled) {
          settled = true;
          closeAll();
          reject(err);
        }
      });
      wss.on('listening', () => {
        mode = 'host';
        const ips = listLocalIps();
        emit({ kind: 'host-ready', port: listenPort, ips });
        if (!settled) {
          settled = true;
          resolve({ port: listenPort, ips });
        }
      });
      wss.on('connection', (ws) => {
        if (peers.size >= MAX_CLIENTS) {
          sendJson(ws, { t: 'event', kind: 'error', message: 'Partida cheia (máx. 4).' });
          ws.close();
          return;
        }
        const peerId = nextPeerId++;
        peers.set(peerId, ws);
        emit({ kind: 'peer-joined', peerId });
        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(String(raw));
            emit({ kind: 'message', from: peerId, msg });
          } catch { /* ignore bad packet */ }
        });
        ws.on('close', () => {
          peers.delete(peerId);
          emit({ kind: 'peer-left', peerId });
        });
        ws.on('error', () => {});
      });
    });
  });

  ipcMain.handle('net-join', async (_event, host, port) => {
    closeAll();
    const url = `ws://${String(host).trim()}:${Number(port) || DEFAULT_PORT}`;
    return await new Promise((resolve, reject) => {
      let settled = false;
      try {
        clientWs = new WebSocket(url);
      } catch (err) {
        return reject(err);
      }
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { clientWs?.close(); } catch { /* ignore */ }
        reject(new Error('Tempo esgotado. Confira o IP do Radmin e a porta 7777.'));
      }, JOIN_TIMEOUT_MS);

      clientWs.on('open', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        mode = 'client';
        emit({ kind: 'connected' });
        resolve({ ok: true });
      });
      clientWs.on('message', (raw) => {
        try {
          const msg = JSON.parse(String(raw));
          emit({ kind: 'message', from: 'host', msg });
        } catch { /* ignore */ }
      });
      clientWs.on('close', () => {
        clearTimeout(timer);
        if (mode === 'client') emit({ kind: 'disconnected' });
        clientWs = null;
        mode = 'idle';
      });
      clientWs.on('error', (err) => {
        clearTimeout(timer);
        const message = err.message || 'Falha ao conectar';
        emit({ kind: 'error', message });
        if (!settled) {
          settled = true;
          reject(new Error(message));
        }
      });
    });
  });

  ipcMain.handle('net-stop', async () => {
    closeAll();
    emit({ kind: 'stopped' });
    return true;
  });

  ipcMain.handle('net-send', async (_event, { msg, to } = {}) => {
    if (mode === 'host') {
      if (to != null) sendJson(peers.get(Number(to)), msg);
      else {
        for (const ws of peers.values()) sendJson(ws, msg);
      }
      return true;
    }
    if (mode === 'client') {
      sendJson(clientWs, msg);
      return true;
    }
    return false;
  });
}

module.exports = { registerIpc, closeAll, listLocalIps };
