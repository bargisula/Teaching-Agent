import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? null : args[index + 1];
};
const input = option('input');
const configPath = option('config');
const outputDir = option('output');

if (!input || !configPath || !outputDir) {
  console.error('Usage: node scripts/generate-media-script.mjs --input <slides.md> --config <media-config.json> --output <media-folder>');
  process.exit(2);
}

const fail = message => { console.error(`[media-script] FAIL: ${message}`); process.exit(1); };
if (!fs.existsSync(input)) fail(`input not found: ${input}`);
if (!fs.existsSync(configPath)) fail(`config not found: ${configPath}`);

let config;
try { config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '')); }
catch (error) { fail(`invalid config JSON: ${error.message}`); }

const source = fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '');
const matches = [...source.matchAll(/^##\s+Slide\s+(\d+)｜([^\r\n]+)\r?\n([\s\S]*?)(?=^##\s+Slide\s+\d+｜|(?![\s\S]))/gm)];
if (!matches.length) fail('no slides found; expected headings like "## Slide 0｜標題"');

const clean = value => value.replace(/\r/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
const slides = matches.map(match => ({
  slide: Number(match[1]),
  title: clean(match[2]),
  content: clean(match[3])
}));

const ensureText = (text, fallback) => text || fallback;
const createLines = slide => {
  const body = ensureText(slide.content, `本頁介紹「${slide.title}」的重點。`);
  switch (config.mode) {
    case 'single-male':
      return [{ speaker: 'narrator_male', voice: 'narrator_male', text: `${slide.title}。${body}` }];
    case 'dialogue':
    case 'teacher-student':
      return [
        { speaker: 'teacher', voice: 'teacher', text: `這一頁我們來看「${slide.title}」。${body}` },
        { speaker: 'student', voice: 'student', text: `所以這一頁最重要的重點，就是理解${slide.title}，對嗎？` }
      ];
    case 'single-female':
    default:
      return [{ speaker: 'narrator_female', voice: 'narrator_female', text: `${slide.title}。${body}` }];
  }
};

const generated = slides.map(slide => ({ slide: slide.slide, title: slide.title, lines: createLines(slide) }));
const mediaDir = path.resolve(outputDir);
fs.mkdirSync(mediaDir, { recursive: true });
fs.mkdirSync(path.join(mediaDir, 'audio'), { recursive: true });
fs.mkdirSync(path.join(mediaDir, 'subtitles'), { recursive: true });
fs.mkdirSync(path.join(mediaDir, 'video'), { recursive: true });

const dialoguePath = path.join(mediaDir, 'dialogue.json');
fs.writeFileSync(dialoguePath, `${JSON.stringify({ status: 'draft', source: path.resolve(input), mode: config.mode, language: config.language, slides: generated }, null, 2)}\n`, 'utf8');

const markdown = [
  '# 旁白與對談腳本（草稿）',
  '',
  `- 狀態：DRAFT｜等待使用者確認`,
  `- 模式：${config.mode}`,
  `- 語言：${config.language}`,
  `- 來源：${path.resolve(input)}`,
  '',
  '> 本檔案是第一版腳本草稿。尚未產生語音，也尚未執行 FFmpeg。',
  '',
  ...generated.flatMap(slide => [
    `## Slide ${slide.slide}｜${slide.title}`,
    '',
    ...slide.lines.map(line => `- **${line.speaker}**（${line.voice}）：${line.text}`),
    ''
  ])
].join('\n');
const scriptPath = path.join(mediaDir, 'narration-script.md');
fs.writeFileSync(scriptPath, markdown, 'utf8');

console.log(JSON.stringify({ ok: true, status: 'draft', mode: config.mode, slides: generated.length, outputs: [scriptPath, dialoguePath] }, null, 2));
