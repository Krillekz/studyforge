'use strict';

/* ==========================================================================
   StudyForge — Electron main process
   Two .exe builds share this file; the build scripts inject the mode:
     public  -> BYOK desktop mirror of the GitHub Pages site
     private -> Ollama-first local build
   ========================================================================== */

const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function readJson(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn('[StudyForge] could not read', file, err.message);
    return null;
  }
}

function resolveMode() {
  const candidates = [];
  if (process.resourcesPath) candidates.push(path.join(process.resourcesPath, 'app-mode.json'));
  candidates.push(path.join(__dirname, 'build-mode.json'));

  for (const file of candidates) {
    const data = readJson(file);
    if (data && data.mode) return data.mode === 'private' ? 'private' : 'public';
  }
  return process.env.APP_MODE === 'private' ? 'private' : 'public';
}

const MODE = resolveMode();
const PRODUCT = MODE === 'private' ? 'StudyForge Private' : 'StudyForge';

app.setName(PRODUCT);

let win = null;

function iconPath() {
  const file = path.join(__dirname, '..', 'assets', 'icon.png');
  return fs.existsSync(file) ? file : undefined;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 660,
    title: PRODUCT,
    backgroundColor: '#0b0d13',
    icon: iconPath(),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      additionalArguments: ['--sf-mode=' + MODE]
    }
  });

  win.once('ready-to-show', function () {
    win.show();
  });

  win.on('closed', function () {
    win = null;
  });

  /* External links (API key pages, release downloads) belong in the browser. */
  win.webContents.setWindowOpenHandler(function (details) {
    if (/^https?:/i.test(details.url)) shell.openExternal(details.url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', function (event, url) {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  win.loadFile(path.join(__dirname, '..', 'index.html'), { query: { mode: MODE } });
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', function () {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(function () {
    Menu.setApplicationMenu(null);
    ipcMain.handle('sf:version', function () {
      return app.getVersion();
    });
    createWindow();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
  });
}
