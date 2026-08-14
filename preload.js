const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('farmSave', {
  save: (slot, data) => ipcRenderer.invoke('save-game', slot, data),
  load: (slot) => ipcRenderer.invoke('load-game', slot),
  list: () => ipcRenderer.invoke('list-saves'),
  deleteSave: (slot) => ipcRenderer.invoke('delete-save', slot),
  exportSave: (slot) => ipcRenderer.invoke('export-save', slot),
  importSave: () => ipcRenderer.invoke('import-save')
});
