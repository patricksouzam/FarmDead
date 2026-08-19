const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('farmSave', {
  save: (slot, data) => ipcRenderer.invoke('save-game', slot, data),
  load: (slot) => ipcRenderer.invoke('load-game', slot),
  list: () => ipcRenderer.invoke('list-saves'),
  deleteSave: (slot) => ipcRenderer.invoke('delete-save', slot),
  exportSave: (slot) => ipcRenderer.invoke('export-save', slot),
  importSave: () => ipcRenderer.invoke('import-save')
});

contextBridge.exposeInMainWorld('farmNet', {
  host: (port) => ipcRenderer.invoke('net-host', port),
  join: (host, port) => ipcRenderer.invoke('net-join', host, port),
  stop: () => ipcRenderer.invoke('net-stop'),
  send: (msg, to) => ipcRenderer.invoke('net-send', { msg, to }),
  listLocalIps: () => ipcRenderer.invoke('net-list-ips'),
  onEvent: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('farm-net', handler);
    return () => ipcRenderer.removeListener('farm-net', handler);
  }
});
