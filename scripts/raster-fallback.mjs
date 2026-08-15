import fs from 'node:fs';
import zlib from 'node:zlib';
const args = process.argv.slice(2); const get = n => { const i = args.indexOf(`--${n}`); return i < 0 ? null : args[i + 1]; };
const file = get('output'); const page = Number(get('page') || 1); if (!file) throw new Error('需要 --output');
const w = 1600, h = 900, row = w * 4 + 1, raw = Buffer.alloc(row * h); const palettes = [[232,239,232], [220,235,234], [245,234,223], [231,224,239]]; const [br,bg,bb] = palettes[(page - 1) % palettes.length];
for (let y = 0; y < h; y++) { let o = y * row; raw[o++] = 0; for (let x = 0; x < w; x++) { let r = br, g = bg, b = bb; if (x > 860 && x < 1510 && y > 170 && y < 700) { r = 248; g = 250; b = 244; } else if ((x - 1170) ** 2 + (y - 420) ** 2 < 45000) { r = 185; g = 215; b = 202; } else if (y > 780) { r = 196; g = 210; b = 202; } raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = 255; } }
function crc32(b) { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xEDB88320 : 0); } return (c ^ -1) >>> 0; }
function chunk(type, data) { const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 4, 'ascii'); data.copy(out, 8); out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length); return out; }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]); fs.mkdirSync(new URL('.', `file://${file.replaceAll('\\', '/')}`).pathname, { recursive: true }); fs.writeFileSync(file, png); console.log(`Generated ${file}`);
