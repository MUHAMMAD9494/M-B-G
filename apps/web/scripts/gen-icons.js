#!/usr/bin/env node
/**
 * gen-icons.js — Self-contained PNG icon generator for NEXORA SMART EDU PWA.
 *
 * Design: solid indigo (#4F46E5) background with a clean white geometric glyph:
 * two overlapping rounded rectangles forming a checkmark (no text, no gradients).
 * Apple/favicon variants draw a slim white ring + checkmark.
 *
 * Uses ONLY Node built-ins (zlib, fs). No npm installs.
 * Minimal PNG encoder: signature + IHDR/IDAT/IEND with CRC32.
 */
'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/* ---------------- PNG encoder ---------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Encode 8-bit RGBA rows (Buffer) into a PNG Buffer. */
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------------- Geometry (SDF) ---------------- */

function sdSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby || 1)));
  const dx = apx - abx * t, dy = apy - aby * t;
  return Math.sqrt(dx * dx + dy * dy);
}

function sdRing(px, py, cx, cy, rad, th) {
  return Math.abs(Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) - rad) - th / 2;
}

/**
 * Signed distance (px) inside the checkmark glyph; negative = inside.
 * Pure SDF (drawn at n=1024, downsampled 2x for AA), so meters scale freezes.
 */
function checkSdf(px, py, n) {
  const x = px / n, y = py / n; // normalized [0,1]
  const t = 0.058; // bar thickness (normalized)
  const cx = 0.5, cy = 0.56; // glyph center
  const s = 0.72; // overall scale (spread across the canvas)
  const r = 0.155 * s; // half-spread from center (rise of the check)
  const vx = cx; // vertex x (same as center)
  const vy = cy;
  const hx = cx - r, hy = cy - r; // lower-left end
  const ux = cx + r, uy = cy - r; // upper-right end
  // Two overlapping rounded capsules forming a checkmark.
  const d1 = sdSegment(x, y, hx, hy, vx, vy);
  const d2 = sdSegment(x, y, vx, vy, ux, uy);
  const inner = Math.min(d1, d2) - t / 2;
  return inner * n;
}

/** Signed distance for the slim ring used on small/favicon variants. */
function ringSdf(px, py, n) {
  const x = px / n, y = py / n;
  return sdRing(x, y, 0.5, 0.56, 0.34, 0.05) * n;
}

/** Signed distance (px) for a solid white ring (thick, standalone circle). */
function ringSolidSdf(px, py, n) {
  const x = px / n, y = py / n;
  return sdRing(x, y, 0.5, 0.56, 0.33, 0.13) * n;
}

/* ---------------- Rendering ---------------- */

function blendOver(dst, r, g, b, aByte) {
  // aByte: alpha in [0,255]; dst channels are bytes; dst[3] is byte alpha.
  const a = aByte / 255;
  const ia = 1 - a;
  dst[0] = Math.round(r * a + dst[0] * ia);
  dst[1] = Math.round(g * a + dst[1] * ia);
  dst[2] = Math.round(b * a + dst[2] * ia);
  dst[3] = Math.round(a * 255 + dst[3] * ia);
}

/**
 * Render an icon.
 * @param size  output pixel size
 * @param opts  { maskable?: boolean, ring?: boolean }
 */
function render(size, opts = {}) {
  const SS = 4; // supersample factor per axis (SDF grid resolution = size * SS)
  const big = size * SS;
  // Build the high-res SDF grid first (1 channel, Float32).
  const grid = new Float32Array(big * big);
  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      let d = checkSdf(x, y, big);
      if (opts.ring) d = Math.min(d, ringSdf(x, y, big));
      if (opts.ringSolid) d = Math.min(d, ringSolidSdf(x, y, big));
      grid[y * big + x] = d;
    }
  }
  // Per-sample coverage with a 1px linear AA ramp on the high-res grid.
  const cov = (d) => Math.max(0, Math.min(1, 0.5 - d));
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let sy = 0; sy < SS; sy++) {
        const gy = y * SS + sy;
        for (let sx = 0; sx < SS; sx++) {
          acc += cov(grid[gy * big + (x * SS + sx)]);
        }
      }
      const c = acc / (SS * SS); // averaged coverage in [0,1]
      const px = (y * size + x) * 4;
      if (opts.maskable) {
        // Full-bleed solid for maskable; glyph confined to safe zone already.
        out[px] = 0x4f; out[px + 1] = 0x46; out[px + 2] = 0xe5; out[px + 3] = 0xff;
        if (c > 0) blendOver(out.subarray(px, px + 4), 255, 255, 255, Math.round(c * 255));
      } else {
        // Opaque indigo everywhere (alpha 255), white glyph with coverage-based AA.
        blendOver(out.subarray(px, px + 4), 0x4f, 0x46, 0xe5, 255);
        if (c > 0) blendOver(out.subarray(px, px + 4), 255, 255, 255, Math.round(c * 255));
      }
    }
  }
  return encodePng(size, size, out);
}

/* ---------------- Output ---------------- */

const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');

const targets = [
  { file: 'icon-192.png', size: 192, opts: {} },
  { file: 'icon-512.png', size: 512, opts: {} },
  { file: 'icon-maskable-512.png', size: 512, opts: { maskable: true } },
  { file: 'apple-touch-icon.png', size: 180, opts: { ring: true } },
  { file: 'favicon-32.png', size: 32, opts: { ringSolid: true } },
  { file: 'favicon-16.png', size: 16, opts: { ringSolid: true } },
];

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const t of targets) {
  const png = render(t.size, t.opts);
  const dest = path.join(OUT_DIR, t.file);
  fs.writeFileSync(dest, png);
  console.log(`${t.file}  ${t.size}x${t.size}  ${png.length} bytes`);
}
console.log('Done.');