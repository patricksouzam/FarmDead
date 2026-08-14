const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

function savesDir() {
  return path.join(app.getPath('userData'), 'saves');
}

function saveFilePath(slot) {
  return path.join(savesDir(), `slot-${slot}.json`);
}

async function ensureSavesDir() {
  await fs.mkdir(savesDir(), { recursive: true });
}

ipcMain.handle('save-game', async (event, slot, data) => {
  await ensureSavesDir();
  const payload = { ...data, savedAt: Date.now() };
  await fs.writeFile(saveFilePath(slot), JSON.stringify(payload), 'utf-8');
  return true;
});

ipcMain.handle('load-game', async (event, slot) => {
  try {
    const raw = await fs.readFile(saveFilePath(slot), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
});

ipcMain.handle('list-saves', async () => {
  await ensureSavesDir();
  const slots = [1, 2, 3];
  const result = {};
  for (const slot of slots) {
    try {
      const raw = await fs.readFile(saveFilePath(slot), 'utf-8');
      const parsed = JSON.parse(raw);
      result[slot] = { exists: true, savedAt: parsed.savedAt, money: parsed.state?.money ?? 0, totalDays: parsed.state?.totalDays ?? 0 };
    } catch {
      result[slot] = { exists: false };
    }
  }
  return result;
});

ipcMain.handle('delete-save', async (event, slot) => {
  try {
    await fs.unlink(saveFilePath(slot));
  } catch {}
  return true;
});

ipcMain.handle('export-save', async (event, slot) => {
  try {
    const raw = await fs.readFile(saveFilePath(slot), 'utf-8');
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Exportar save',
      defaultPath: `fazenda3d-slot${slot}.json`,
      filters: [{ name: 'Save do Fazenda 3D', extensions: ['json'] }]
    });
    if (canceled || !filePath) return false;
    await fs.writeFile(filePath, raw, 'utf-8');
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('import-save', async (event, slot) => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Importar save',
    filters: [{ name: 'Save do Fazenda 3D', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths.length) return false;
  try {
    const raw = await fs.readFile(filePaths[0], 'utf-8');
    JSON.parse(raw);
    await ensureSavesDir();
    await fs.writeFile(saveFilePath(slot), raw, 'utf-8');
    return true;
  } catch {
    return false;
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0a1128',
    title: 'Fazenda 3D',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
