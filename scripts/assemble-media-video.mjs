import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const mediaDir = option('media');
const imagesDir = option('images');
const ffmpeg = option('ffmpeg') || 'ffmpeg';
if (!mediaDir || !imagesDir) {
  console.error('Usage: node scripts/assemble-media-video.mjs --media <media-folder> --images <png-folder> [--ffmpeg <ffmpeg.exe>]');
  process.exit(2);
}

const root = path.resolve(mediaDir);
const images = path.resolve(imagesDir);
const fail = message => { console.error(`[video] FAIL: ${message}`); process.exit(1); };
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const audioManifestPath = path.join(root, 'slide-audio-manifest.json');
const subtitleManifestPath = path.join(root, 'subtitles', 'subtitles-manifest.json');
const configPath = path.join(root, 'media-config.json');
for (const file of [audioManifestPath, subtitleManifestPath, configPath]) if (!fs.existsSync(file)) fail(`missing required file: ${file}`);
const audioManifest = readJson(audioManifestPath);
const subtitleManifest = readJson(subtitleManifestPath);
const config = readJson(configPath);
if (audioManifest.status !== 'completed') fail('audio manifest is incomplete');
if (subtitleManifest.status !== 'completed') fail('subtitle manifest is incomplete');

const videoDir = path.join(root, 'video');
const segmentDir = path.join(videoDir, 'segments');
fs.mkdirSync(segmentDir, { recursive: true });
const width = config.video?.width || 1920;
const height = config.video?.height || 1080;
const fps = config.video?.fps || 30;
const subtitleBySlide = new Map(subtitleManifest.slides.map(item => [item.slide, item]));
const run = (ffmpegArgs, label) => {
  const result = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...ffmpegArgs], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) fail(`${label}: ${result.error?.message || result.stderr || 'ffmpeg failed'}`);
};
const quoteFilterPath = file => file.replaceAll('\\', '/').replaceAll(':', '\\:').replaceAll("'", "\\'");
const imageCandidates = slide => [
  path.join(images, `slide-${String(slide).padStart(2, '0')}.png`),
  path.join(images, `slide-${String(slide + 1).padStart(2, '0')}.png`),
  path.join(images, `page-${String(slide).padStart(2, '0')}.png`),
  path.join(images, `page-${String(slide + 1).padStart(2, '0')}.png`)
];

const segments = [];
for (const audio of [...audioManifest.files].sort((a, b) => a.slide - b.slide)) {
  const image = imageCandidates(audio.slide).find(fs.existsSync);
  if (!image) fail(`missing PNG for slide ${audio.slide} in ${images}`);
  const subtitle = subtitleBySlide.get(audio.slide);
  if (!subtitle) fail(`missing subtitle for slide ${audio.slide}`);
  const audioPath = path.join(root, audio.file);
  const assPath = path.join(root, subtitle.ass);
  if (!fs.existsSync(audioPath) || !fs.existsSync(assPath)) fail(`missing audio or ASS for slide ${audio.slide}`);
  const segmentName = `segment-${String(audio.slide).padStart(2, '0')}.mp4`;
  const segmentPath = path.join(segmentDir, segmentName);
  const filter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,ass='${quoteFilterPath(assPath)}'`;
  const duration = subtitle.durationSeconds;
  if (!Number.isFinite(duration) || duration <= 0) fail(`invalid duration for slide ${audio.slide}`);
  run(['-loop', '1', '-framerate', String(fps), '-i', image, '-i', audioPath, '-vf', filter, '-t', String(duration), '-r', String(fps), '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', segmentPath], segmentName);
  segments.push(segmentPath);
}

const concatPath = path.join(videoDir, 'segments.txt');
fs.writeFileSync(concatPath, `${segments.map(file => `file '${file.replaceAll("'", "'\\''")}'`).join('\n')}\n`, 'utf8');
const output = path.join(videoDir, 'final-video.mp4');
run(['-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', '-movflags', '+faststart', output], 'final-video.mp4');
const manifest = { status: 'completed', output: 'video/final-video.mp4', slideCount: segments.length, width, height, fps, createdAt: new Date().toISOString() };
fs.writeFileSync(path.join(videoDir, 'video-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, ...manifest, absoluteOutput: output }, null, 2));
