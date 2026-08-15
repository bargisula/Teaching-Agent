import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const mediaDir = option('media');
if (!mediaDir) {
  console.error('Usage: node scripts/build-subtitles.mjs --media <media-folder>');
  process.exit(2);
}

const root = path.resolve(mediaDir);
const fail = message => { console.error(`[subtitles] FAIL: ${message}`); process.exit(1); };
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const dialoguePath = path.join(root, 'dialogue.json');
const configPath = path.join(root, 'media-config.json');
const ttsPath = path.join(root, 'tts-manifest.json');
const audioPath = path.join(root, 'slide-audio-manifest.json');
for (const file of [dialoguePath, configPath, ttsPath, audioPath]) if (!fs.existsSync(file)) fail(`missing required file: ${file}`);

const dialogue = readJson(dialoguePath);
const config = readJson(configPath);
const tts = readJson(ttsPath);
const slideAudio = readJson(audioPath);
if (dialogue.status !== 'approved') fail('dialogue must be approved before creating subtitles');
if (tts.status !== 'completed' || slideAudio.status !== 'completed') fail('completed audio manifests are required');

const subtitle = config.subtitle || {};
const subtitleDir = path.join(root, 'subtitles');
const perSlideDir = path.join(subtitleDir, 'slides');
fs.mkdirSync(perSlideDir, { recursive: true });
const byKey = new Map(tts.files.map(file => [`${file.slide}:${file.line}`, file]));
const assColor = speaker => speaker === 'teacher' ? '&H0000FFFF' : '&H00FFFFFF';
const assStyle = speaker => speaker === 'teacher' ? 'Teacher' : 'Student';
const escapeAss = text => text.replace(/[{}]/g, '').replace(/\\/g, '\\\\').replace(/\n/g, '\\N');
const timeSrt = seconds => {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const ms = totalMs % 1000;
  const total = Math.floor(totalMs / 1000);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};
const timeAss = seconds => {
  const totalCs = Math.max(0, Math.round(seconds * 100));
  const cs = totalCs % 100;
  const total = Math.floor(totalCs / 100);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};

const assHeader = [
  '[Script Info]',
  'ScriptType: v4.00+',
  'PlayResX: 1920',
  'PlayResY: 1080',
  '',
  '[V4+ Styles]',
  'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  `Style: Teacher,${subtitle.fontFamily || 'Microsoft JhengHei'},${subtitle.fontSize || 48},${assColor('teacher')},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,${subtitle.outline || 3},1,2,40,40,50,1`,
  `Style: Student,${subtitle.fontFamily || 'Microsoft JhengHei'},${subtitle.fontSize || 48},${assColor('student')},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,${subtitle.outline || 3},1,2,40,40,50,1`,
  '',
  '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
];

const manifest = { status: 'completed', format: subtitle.format || 'both', slides: [], createdAt: new Date().toISOString() };
for (const slide of dialogue.slides) {
  let cursor = 0;
  const srt = [];
  const ass = [...assHeader];
  for (let index = 0; index < slide.lines.length; index += 1) {
    const line = slide.lines[index];
    const entry = byKey.get(`${slide.slide}:${index + 1}`);
    if (!entry) fail(`missing TTS timing for slide ${slide.slide}, line ${index + 1}`);
    const start = cursor;
    const end = cursor + entry.durationSeconds;
    const text = `${line.speaker === 'teacher' ? '女老師' : line.speaker === 'student' ? '男學員' : line.speaker}：${line.text}`;
    srt.push(`${index + 1}\n${timeSrt(start)} --> ${timeSrt(end)}\n${text}\n`);
    ass.push(`Dialogue: 0,${timeAss(start)},${timeAss(end)},${assStyle(line.speaker)},,0,0,0,,${escapeAss(text)}`);
    cursor = end;
  }
  const stem = `slide-${String(slide.slide).padStart(2, '0')}`;
  const srtPath = path.join(perSlideDir, `${stem}.srt`);
  const assPath = path.join(perSlideDir, `${stem}.ass`);
  fs.writeFileSync(srtPath, `${srt.join('\n')}\n`, 'utf8');
  fs.writeFileSync(assPath, `${ass.join('\n')}\n`, 'utf8');
  manifest.slides.push({ slide: slide.slide, durationSeconds: Number(cursor.toFixed(3)), srt: `subtitles/slides/${stem}.srt`, ass: `subtitles/slides/${stem}.ass` });
}
fs.writeFileSync(path.join(subtitleDir, 'subtitles-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, slides: manifest.slides.length, output: path.join(subtitleDir, 'subtitles-manifest.json') }, null, 2));
