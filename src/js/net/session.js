import {
  MSG, NET_DEFAULT_PORT, NET_HOST_PLAYER_ID, NET_SEND_INTERVAL, packInput
} from './protocol.js';

const ROLE = { OFFLINE: 'offline', HOST: 'host', CLIENT: 'client' };

let role = ROLE.OFFLINE;
let localPlayerId = NET_HOST_PLAYER_ID;
let listenInfo = { port: NET_DEFAULT_PORT, ips: [] };
let peerCount = 1;
let handlers = {};
let inbound = [];
let sendAccum = 0;
let inputSeq = 0;
let bound = false;
let pendingJump = false;

function farmNet() {
  return typeof window !== 'undefined' ? window.farmNet : null;
}

function enqueue(data) {
  inbound.push(data);
}

export function setNetHandlers(next) {
  handlers = next || {};
}

export function getNetRole() {
  return role;
}

export function isNetSession() {
  return role !== ROLE.OFFLINE;
}

export function isNetHost() {
  return role === ROLE.HOST;
}

export function isNetClient() {
  return role === ROLE.CLIENT;
}

export function getLocalPlayerId() {
  return localPlayerId;
}

export function getPeerCount() {
  return peerCount;
}

export function setPeerCount(n) {
  peerCount = Math.max(1, Math.min(4, n || 1));
}

export function getListenInfo() {
  return listenInfo;
}

export function bindNetBridge() {
  const api = farmNet();
  if (!api || bound) return;
  bound = true;
  api.onEvent(enqueue);
}

export async function startHosting(port = NET_DEFAULT_PORT) {
  const api = farmNet();
  if (!api) return { ok: false, error: 'Multiplayer só funciona no aplicativo (Electron).' };
  try {
    const result = await api.host(port);
    role = ROLE.HOST;
    localPlayerId = NET_HOST_PLAYER_ID;
    peerCount = 1;
    listenInfo = { port: result.port, ips: result.ips || [] };
    return { ok: true, ...listenInfo };
  } catch (err) {
    role = ROLE.OFFLINE;
    return { ok: false, error: err.message || 'Não deu para hospedar. Porta 7777 ocupada?' };
  }
}

export async function joinSession(host, port = NET_DEFAULT_PORT) {
  const api = farmNet();
  if (!api) return { ok: false, error: 'Multiplayer só funciona no aplicativo (Electron).' };
  try {
    await api.join(String(host).trim(), port);
    role = ROLE.CLIENT;
    peerCount = 1;
    return { ok: true };
  } catch (err) {
    role = ROLE.OFFLINE;
    return { ok: false, error: err.message || 'Não conectou. Confira o IP do Radmin.' };
  }
}

export async function stopSession() {
  const api = farmNet();
  if (api) {
    try { await api.stop(); } catch { /* ignore */ }
  }
  role = ROLE.OFFLINE;
  localPlayerId = NET_HOST_PLAYER_ID;
  peerCount = 1;
  listenInfo = { port: NET_DEFAULT_PORT, ips: [] };
  inbound.length = 0;
  sendAccum = 0;
}

export function sendNet(msg, to) {
  const api = farmNet();
  if (!api || role === ROLE.OFFLINE) return;
  api.send(msg, to);
}

export function sendNetEvent(evt, to) {
  sendNet({ t: MSG.EVENT, ...evt }, to);
}

export function sendNetIntent(intent) {
  sendNet({ t: MSG.INTENT, ...intent });
}

export function sendWelcome(peerId, payload) {
  sendNet({ t: MSG.WELCOME, ...payload }, peerId);
}

export function sendSnapshot(payload) {
  sendNet({ t: MSG.SNAPSHOT, ...payload });
}

export function noteJumpHeld(player) {
  if (player?.keys?.jump) pendingJump = true;
}

export function tickNetSend(dt, player) {
  if (role !== ROLE.CLIENT || !player) return;
  noteJumpHeld(player);
  sendAccum += dt;
  if (sendAccum < NET_SEND_INTERVAL) return;
  sendAccum = 0;
  const packed = packInput(player, ++inputSeq);
  packed.keys.j = packed.keys.j || pendingJump;
  pendingJump = false;
  sendNet(packed);
}

export function pumpNet() {
  while (inbound.length) {
    const data = inbound.shift();
    dispatch(data);
  }
}

function dispatch(data) {
  if (!data) return;
  if (data.kind === 'peer-joined') {
    peerCount = Math.min(4, peerCount + 1);
    handlers.onPeerJoined?.(data.peerId);
    return;
  }
  if (data.kind === 'peer-left') {
    peerCount = Math.max(1, peerCount - 1);
    handlers.onPeerLeft?.(data.peerId);
    return;
  }
  if (data.kind === 'disconnected' || data.kind === 'stopped') {
    handlers.onDisconnected?.(data.kind);
    return;
  }
  if (data.kind === 'error') {
    handlers.onError?.(data.message);
    return;
  }
  if (data.kind === 'host-ready') {
    listenInfo = { port: data.port, ips: data.ips || [] };
    return;
  }
  if (data.kind !== 'message' || !data.msg) return;

  const msg = data.msg;
  const type = msg.t;
  if (type === MSG.WELCOME) {
    localPlayerId = msg.playerId;
    peerCount = msg.peerCount || 2;
    handlers.onWelcome?.(msg);
    return;
  }
  if (type === MSG.SNAPSHOT) {
    handlers.onSnapshot?.(msg);
    return;
  }
  if (type === MSG.INPUT) {
    handlers.onInput?.(data.from, msg);
    return;
  }
  if (type === MSG.INTENT) {
    handlers.onIntent?.(data.from, msg);
    return;
  }
  if (type === MSG.EVENT) {
    if (msg.kind === 'error') handlers.onError?.(msg.message);
    else handlers.onEvent?.(msg);
    return;
  }
  if (type === MSG.HELLO) {
    handlers.onHello?.(data.from, msg);
  }
}

export { ROLE };
