import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const mediaDir = option('media');
const ffmpeg = option('ffmpeg') || 'ffmpeg';
if (!mediaDir) {
  console.error('Usage: node scripts/generate-tts-audio.mjs --media <media-folder> [--ffmpeg <ffmpeg.exe>]');
  process.exit(2);
}

const root = path.resolve(mediaDir);
const fail = message => { console.error(`[tts] FAIL: ${message}`); process.exit(1); };
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const dialoguePath = path.join(root, 'dialogue.json');
const configPath = path.join(root, 'media-config.json');
const statusPath = path.join(root, 'media-script-status.json');
if (![dialoguePath, configPath, statusPath].every(fs.existsSync)) fail('dialogue.json, media-config.json and media-script-status.json are required');
const dialogue = readJson(dialoguePath);
const config = readJson(configPath);
const status = readJson(statusPath);
if (status.status !== 'approved' || dialogue.status !== 'approved') fail('approved script is required before TTS');

const voices = config.voices || {};
const audioDir = path.join(root, 'audio');
fs.mkdirSync(audioDir, { recursive: true });
const manifest = { status: 'completed', provider: 'mock', generatedAt: new Date().toISOString(), files: [] };

const runFfmpeg = (args, label) => {
  const result = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) fail(`${label}: ${result.error?.message || result.stderr || 'ffmpeg failed'}`);
};

for (const slide of dialogue.slides) {
  for (let index = 0; index < slide.lines.length; index += 1) {
    const line = slide.lines[index];
    const voice = voices[line.voice];
    if (!voice) fail(`missing voice profile: ${line.voice}`);
    if (voice.provider !== 'mock') fail(`provider ${voice.provider} is not implemented yet; use provider mock for this stage`);
    const duration = Math.max(1.2, Math.min(20, (line.text.length * 0.075) / voice.speed));
    const filename = `slide-${String(slide.slide).padStart(2, '0')}-line-${String(index + 1).padStart(2, '02')}.wav`;
    const output = path.join(audioDir, filename);
    runFfmpeg(['-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=44100`, '-t', duration.toFixed(3), '-c:a', 'pcm_s16le', output], filename);
    manifest.files.push({ slide: slide.slide, line: index + 1, speaker: line.speaker, voice: line.voice, text: line.text, durationSeconds: Number(duration.toFixed(3)), file: `audio/${filename}` });
  }
}
fs.writeFileSync(path.join(root, 'tts-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, provider: 'mock', files: manifest.files.length, output: path.join(root, 'tts-manifest.json') }, null, 2));
