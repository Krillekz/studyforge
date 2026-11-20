#!/usr/bin/env node
'use strict';

/* ==========================================================================
   StudyForge — dual .exe build driver
     npm run build:public   -> dist-public/  (BYOK, mirrors the website)
     npm run build:private  -> dist-private/ (Ollama default, git-ignored)

   Both builds share the same source. The only difference is a build-time
   mode file injected as extraResources/app-mode.json, which electron/main.js
   reads at startup (with APP_MODE as a fallback).

   Flags:
     --mode=public|private   which build to produce (default: public)
     --no-pack               write the config + mode file, skip electron-builder
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const modeArg = argv.find(function (a) { return a.indexOf('--mode=') === 0; });
const rawMode = modeArg ? modeArg.split('=')[1] : 'public';
const mode = rawMode === 'private' ? 'private' : 'public';
const isPrivate = mode === 'private';
const noPack = argv.indexOf('--no-pack') !== -1;

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const stageDir = path.join(root, '.build');
const outDir = path.join(root, isPrivate ? 'dist-private' : 'dist-public');
const displayName = isPrivate ? 'StudyForge Private' : 'StudyForge';
const artifactName = isPrivate
  ? 'StudyForge-Private-Setup-${version}.${ext}'
  : 'StudyForge-Setup-${version}.${ext}';

fs.mkdirSync(stageDir, { recursive: true });

/* ---------- icon ---------- */

const iconAssets = [path.join(root, 'assets', 'icon.png'), path.join(root, 'build', 'icon.png')];
if (iconAssets.some(function (file) { return !fs.existsSync(file); })) {
  console.log('[studyforge] generating the app icon…');
  const iconRun = spawnSync(process.execPath, [path.join(root, 'scripts', 'make-icon.js')], {
    cwd: root,
    stdio: 'inherit'
  });
  if (iconRun.status !== 0) {
    console.error('[studyforge] icon generation failed. Run `npm run icons` and try again.');
    process.exit(iconRun.status || 1);
  }
}

/* ---------- build-time mode flag ---------- */

const modeFile = path.join(stageDir, 'app-mode.' + mode + '.json');
fs.writeFileSync(
  modeFile,
  JSON.stringify(
    {
      mode: mode,
      product: displayName,
      note: 'Written by scripts/build.js. electron/main.js reads this at startup.'
    },
    null,
    2
  ) + '\n'
);

/* ---------- electron-builder configuration ---------- */

const config = {
  appId: isPrivate ? 'com.studyforge.app.private' : 'com.studyforge.app',
  productName: displayName,
  copyright: 'Copyright © ' + new Date().getFullYear() + ' StudyForge',
  directories: {
    output: outDir,
    buildResources: path.join(root, 'build')
  },
  files: [
    'index.html',
    'styles/**/*',
    'scripts/**/*',
    'assets/**/*',
    'electron/**/*',
    'package.json',
    '!**/*.map',
    '!scripts/build.js',
    '!scripts/serve.js',
    '!scripts/make-icon.js'
  ],
  extraResources: [{ from: modeFile, to: 'app-mode.json' }],
  asar: true,
  compression: 'normal',
  npmRebuild: false,
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: path.join(root, 'build', 'icon.png'),
    artifactName: artifactName
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: displayName,
    artifactName: artifactName
  }
};

const configPath = path.join(stageDir, 'electron-builder.' + mode + '.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

console.log('');
console.log('  StudyForge — ' + mode + ' build');
console.log('  Product      : ' + displayName);
console.log('  Output       : ' + outDir);
console.log('  Mode flag    : ' + modeFile);
console.log('  Builder conf : ' + configPath);
console.log('  Default AI   : ' + (isPrivate ? 'Ollama (http://localhost:11434)' : 'BYOK cloud keys'));
console.log('');

if (noPack) {
  console.log('[studyforge] --no-pack set: configuration written, packaging skipped.');
  process.exit(0);
}

/* ---------- run electron-builder ---------- */

const bin = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);

if (!fs.existsSync(bin)) {
  console.error('[studyforge] electron-builder is not installed yet.');
  console.error('            Run `npm install` once, then:');
  console.error('              npm run build:' + mode);
  process.exit(1);
}

const result = spawnSync(bin, ['--config', configPath, '--win', '--x64'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if (result.error) {
  console.error('[studyforge] could not start electron-builder:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('[studyforge] build failed with exit code ' + result.status + '.');
  process.exit(result.status || 1);
}

console.log('[studyforge] done: ' + outDir);
if (isPrivate) {
  console.log('[studyforge] dist-private/ is git-ignored — keep this build local.');
}
