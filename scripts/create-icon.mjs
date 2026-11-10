import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";

const size = 1024;
const channels = 3;
const rowBytes = size * channels;
const pixels = Buffer.alloc((rowBytes + 1) * size);

const colors = {
  background: [8, 12, 20],
  panel: [19, 29, 43],
  border: [53, 70, 89],
  lane: [48, 65, 82],
  lime: [200, 255, 75],
  trail: [110, 145, 76]
};

function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  const cx = Math.max(left + radius, Math.min(x, right - radius));
  const cy = Math.max(top + radius, Math.min(y, bottom - radius));
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}
function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    const intersects = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}
const bolt = [[610,190],[340,540],[485,540],[395,850],[700,430],[540,430]];
function paint(x, y) {
  let c = colors.background;
  if (insideRoundedRect(x, y, 86, 86, 938, 938, 185)) {
    c = insideRoundedRect(x, y, 98, 98, 926, 926, 174) ? colors.panel : colors.border;
  }
  if (y >= 220 && y <= 804 && ((x >= 373 && x <= 387) || (x >= 637 && x <= 651))) c = colors.lane;
  if (x >= 230 && x <= 258 && y >= 300 && y <= 455) c = colors.lime;
  if (x >= 230 && x <= 258 && y >= 560 && y <= 690) c = colors.trail;
  if (insidePolygon(x, y, bolt)) c = colors.lime;
  return c;
}
for (let y = 0; y < size; y++) {
  const offset = y * (rowBytes + 1);
  pixels[offset] = 0;
  for (let x = 0; x < size; x++) {
    const color = paint(x, y);
    const i = offset + 1 + x * channels;
    pixels[i] = color[0];
    pixels[i + 1] = color[1];
    pixels[i + 2] = color[2];
  }
}
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const body = Buffer.concat([name, data]);
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), data.length + 8);
  return out;
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 2;
header[10] = 0;
header[11] = 0;
header[12] = 0;
const png = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(pixels, { level: 9 })),
  chunk("IEND", Buffer.alloc(0))
]);
const output = resolve("assets/icon.png");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, png);
console.log("Generated 1024x1024 Snatch app icon:", output);
