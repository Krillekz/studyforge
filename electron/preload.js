'use strict';

/* ==========================================================================
   StudyForge — preload bridge
   The renderer only learns the build mode and version; no Node APIs leak in.
   ========================================================================== */

const { contextBridge, ipcRenderer } = require('electron');

function readMode() {
  /* The main process passes the build mode both as a query param and an argv flag. */
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('mode');
    if (fromQuery === 'private' || fromQuery === 'public') return fromQuery;
  } catch (err) { /* ignore */ }

  let found = '';
  process.argv.forEach(function (arg) {
    const prefix = '--sf-mode=';
    if (arg.indexOf(prefix) === 0) found = arg.slice(prefix.length);
  });
  return found === 'private' ? 'private' : 'public';
}

const mode = readMode();

contextBridge.exposeInMainWorld('studyforge', {
  isElectron: true,
  appMode: mode,
  platform: process.platform,
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  version: function () {
    return ipcRenderer.invoke('sf:version');
  }
});
