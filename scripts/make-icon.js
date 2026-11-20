#!/usr/bin/env node
'use strict';

/* ==========================================================================
   StudyForge — app icon generator
   Draws a 512×512 PNG (indigo→violet tile + white mortarboard) with no
   external dependencies, so the repo works before `npm install`.
   Outputs: assets/icon.png and build/icon.png (electron-builder source).
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 512;
const SS = 3;               // supersampling factor
const S = SIZE * SS;
const PX = S * S;

/* geometry in supersampled space */
const CX = S / 2;
const CY = S * 0.395;
const RX = S * 0.315;
const RY = S * 0.185;
const BASE_Y0 = CY + S * 0.030;
const BASE_Y1 = CY + S * 0.205;
const BASE_W0 = S * 0.170;
const BASE_W1 = S * 0.130;
const TASSEL_X = CX + RX * 0.94;
const TASSEL_Y0 = CY;
const TASSEL_Y1 = CY + S * 0.245;
const TASSEL_R = S * 0.0135;
const KNOT_R = S * 0.022;
const CORNER_R = S * 0.215;

const C1 = [67, 56, 202];    // indigo
const C2 = [124, 58, 237];   // violet
const C3 = [167, 139, 250];  // light violet

function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

function background(x, y) {
  const t = Math.min(1, Math.max(0, (x / S) * 0.30 + (y / S) * 0.72));
  return t < 0.62 ? mix(C1, C2, t / 0.62) : mix(C2, C3, (t - 0.62) / 0.38);
}

function insideTile(x, y) {
  const qx = Math.abs(x - S / 2) - (S / 2 - CORNER_R);
  const qy = Math.abs(y - S / 2) - (S / 2 - CORNER_R);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.sqrt(ox * ox + oy * oy) - CORNER_R <= 0;
}

function insideCap(x, y) {
  /* mortarboard (diamond) */
  if (Math.abs(x - CX) / RX + Math.abs(y - CY) / RY <= 1) return true;

  /* skull cap (trapezoid) */
  if (y >= BASE_Y0 && y <= BASE_Y1) {
    const t = (y - BASE_Y0) / (BASE_Y1 - BASE_Y0);
    const half = BASE_W0 + (BASE_W1 - BASE_W0) * t;
    if (Math.abs(x - CX) <= half) return true;
  }
  return false;
}

function insideTassel(x, y) {
  if (y >= TASSEL_Y0 && y <= TASSEL_Y1 && Math.abs(x - TASSEL_X) <= TASSEL_R) return true;
  const dx = x - TASSEL_X;
  const dy = y - TASSEL_Y1;
  return dx * dx + dy * dy <= KNOT_R * KNOT_R;
}

/* ---------- render ---------- */

const accR = new Float64Array(SIZE * SIZE);
const accG = new Float64Array(SIZE * SIZE);
const accB = new Float64Array(SIZE * SIZE);
const accA = new Float64Array(SIZE * SIZE);
const samples = SS * SS;

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;

    if (insideTile(x, y)) {
      const bg = background(x, y);
      r = bg[0];
      g = bg[1];
      b = bg[2];
      a = 255;
      if (insideCap(x, y) || insideTassel(x, y)) {
        r = 255;
        g = 255;
        b = 255;
      }
    }

    const idx = ((y / SS) | 0) * SIZE + ((x / SS) | 0);
    accR[idx] += r * a;
    accG[idx] += g * a;
    accB[idx] += b * a;
    accA[idx] += a;
  }
}

const rgba = Buffer.alloc(SIZE * SIZE * 4);
for (let i = 0; i < SIZE * SIZE; i++) {
  const coverage = accA[i] / samples;
  if (coverage <= 0) continue;
  rgba[i * 4] = Math.round(accR[i] / accA[i]);
  rgba[i * 4 + 1] = Math.round(accG[i] / accA[i]);
  rgba[i * 4 + 2] = Math.round(accB[i] / accA[i]);
  rgba[i * 4 + 3] = Math.round(coverage);
}

/* ---------- PNG encoder ---------- */

const CRC_TABLE = (function () {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const png = encodePng(SIZE, SIZE, rgba);
const targets = [
  path.join(__dirname, '..', 'assets', 'icon.png'),
  path.join(__dirname, '..', 'build', 'icon.png')
];

targets.forEach(function (file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
  console.log('[studyforge] wrote ' + path.relative(path.join(__dirname, '..'), file) + ' (' + png.length + ' bytes)');
});
