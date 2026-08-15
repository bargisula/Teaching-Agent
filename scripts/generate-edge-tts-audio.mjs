import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const mediaDir = option('media');
const voice = option('voice') || process.env.EDGE_TTS_VOICE || 'zh-TW-HsiaoChenNeural';
const rate = option('rate') || process.env.EDGE_TTS_RATE || '+0%';
if (!mediaDir) { console.error('Usage: node scripts/generate-edge-tts-audio.mjs --media <media-folder>'); process.exit(2); }
const root = path.resolve(mediaDir);
const fail = message => { console.error(`[edge-tts] FAIL: ${message}`); process.exit(1); };
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const dialoguePath = path.join(root, 'dialogue.json');
const statusPath = path.join(root, 'media-script-status.json');
if (!fs.existsSync(dialoguePath) || !fs.existsSync(statusPath)) fail('approved dialogue and media-script-status.json are required');
const dialogue = readJson(dialoguePath);
const status = readJson(statusPath);
if (dialogue.status !== 'approved' || status.status !== 'approved') fail('script must be approved before TTS');
const audioDir = path.join(root, 'audio');
fs.mkdirSync(audioDir, { recursive: true });
const files = [];
for (const slide of dialogue.slides) {
  let lineNumber = 0;
  for (const line of slide.lines) {
    lineNumber += 1;
    const name = `slide-${String(slide.slide).padStart(2, '0')}-line-${String(line.line || lineNumber).padStart(2, '0')}.mp3`;
    const target = path.join(audioDir, name);
    const result = spawnSync('python', ['-m', 'edge_tts', '--voice', voice, '--rate', rate, '--text', line.text, '--write-media', target], { encoding: 'utf8', windowsHide: true, timeout: 120000 });
    if (result.status !== 0 || !fs.existsSync(target) || fs.statSync(target).size < 1000) fail(result.error?.message || result.stderr || `could not create ${name}; install edge-tts first`);
    const probe = spawnSync(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', target], { encoding: 'utf8', windowsHide: true });
    const duration = Number.parseFloat(probe.stdout);
    files.push({ slide: slide.slide, line: line.line || lineNumber, speaker: line.speaker, voice, text: line.text, durationSeconds: Number.isFinite(duration) ? Number(duration.toFixed(3)) : Math.max(1.2, Number((line.text.length * 0.075).toFixed(3))), file: `audio/${name}` });
  }
}
fs.writeFileSync(path.join(root, 'tts-manifest.json'), `${JSON.stringify({ status: 'completed', provider: 'edge-tts', voice, rate, files, createdAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, provider: 'edge-tts', voice, files: files.length }, null, 2));
