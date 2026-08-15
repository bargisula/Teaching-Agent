import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const mediaDir = option('media');
const model = option('model') || process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const voice = option('voice') || process.env.OPENAI_TTS_VOICE || 'coral';
if (!mediaDir) { console.error('Usage: node scripts/generate-openai-tts-audio.mjs --media <media-folder> [--voice coral]'); process.exit(2); }
if (!process.env.OPENAI_API_KEY) { console.error('OPENAI_API_KEY is not configured. Set it in the environment, then rerun.'); process.exit(2); }
const root = path.resolve(mediaDir);
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const fail = message => { console.error(`[openai-tts] FAIL: ${message}`); process.exit(1); };
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
  for (const line of slide.lines) {
    const name = `slide-${String(slide.slide).padStart(2, '0')}-line-${String(line.line || files.filter(f => f.slide === slide.slide).length + 1).padStart(2, '0')}.mp3`;
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, voice, input: line.text, response_format: 'mp3', instructions: '請使用自然、親切、清楚的繁體中文教學語氣，不要朗讀角色名稱。' })
    });
    if (!response.ok) fail(`TTS request failed ${response.status}: ${await response.text()}`);
    const target = path.join(audioDir, name);
    fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    const probe = spawnSync(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', target], { encoding: 'utf8', windowsHide: true });
    const durationSeconds = Number.parseFloat(probe.stdout);
    files.push({ slide: slide.slide, line: line.line, speaker: line.speaker, voice, text: line.text, durationSeconds: Number.isFinite(durationSeconds) ? Number(durationSeconds.toFixed(3)) : Math.max(1.2, Number((line.text.length * 0.075).toFixed(3))), file: `audio/${name}` });
  }
}
fs.writeFileSync(path.join(root, 'tts-manifest.json'), `${JSON.stringify({ status: 'completed', provider: 'openai', model, voice, files, createdAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, provider: 'openai', model, voice, files: files.length }, null, 2));
