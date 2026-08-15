import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const mediaDir = option('media');
const ffmpeg = option('ffmpeg') || 'ffmpeg';
if (!mediaDir) {
  console.error('Usage: node scripts/merge-slide-audio.mjs --media <media-folder> [--ffmpeg <ffmpeg.exe>]');
  process.exit(2);
}
const root = path.resolve(mediaDir);
const fail = message => { console.error(`[audio-merge] FAIL: ${message}`); process.exit(1); };
const manifestPath = path.join(root, 'tts-manifest.json');
if (!fs.existsSync(manifestPath)) fail('missing tts-manifest.json; generate TTS audio first');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.status !== 'completed' || !manifest.files?.length) fail('TTS manifest is incomplete');
const outputDir = path.join(root, 'audio', 'slides');
fs.mkdirSync(outputDir, { recursive: true });
const bySlide = new Map();
for (const file of manifest.files) {
  if (!bySlide.has(file.slide)) bySlide.set(file.slide, []);
  bySlide.get(file.slide).push(file);
}
const outputs = [];
for (const [slide, files] of [...bySlide.entries()].sort((a, b) => a[0] - b[0])) {
  const listPath = path.join(root, 'audio', `concat-slide-${String(slide).padStart(2, '0')}.txt`);
  const lines = files.sort((a, b) => a.line - b.line).map(file => `file '${path.resolve(root, file.file).replaceAll("'", "'\\''")}'`);
  fs.writeFileSync(listPath, `${lines.join('\n')}\n`, 'utf8');
  const filename = `slide-${String(slide).padStart(2, '0')}.wav`;
  const output = path.join(outputDir, filename);
  const result = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:a', 'pcm_s16le', output], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) fail(`${filename}: ${result.error?.message || result.stderr || 'ffmpeg failed'}`);
  outputs.push({ slide, file: `audio/slides/${filename}`, sourceLines: files.length });
}
fs.writeFileSync(path.join(root, 'slide-audio-manifest.json'), `${JSON.stringify({ status: 'completed', files: outputs, createdAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, slides: outputs.length, output: path.join(root, 'slide-audio-manifest.json') }, null, 2));
