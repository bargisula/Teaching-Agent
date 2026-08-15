import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const output = option('output');
if (!output) { console.error('Usage: node scripts/generate-natural-female-script.mjs --output <media-folder>'); process.exit(2); }
const root = path.resolve(output);
fs.mkdirSync(root, { recursive: true });
const slides = [
  { slide: 0, title: 'RAG 與 Embedding', lines: [
    '如果我們把很多文件交給 Chatbot，它要怎麼找到真正和問題有關的內容？',
    '關鍵不只是搜尋相同的字，而是理解不同說法背後的意思。這時候，文字會先被轉成一組可以比較的數字，這就是 Embedding。',
    '簡單說，意思接近的文字，在這個數字空間裡也會比較靠近。這讓系統有機會找到真正相關的資料。'
  ]},
  { slide: 1, title: '語意搜尋如何幫助 Chatbot', lines: [
    '接下來，Chatbot 會把使用者的問題也轉成 Embedding，再和資料庫裡的內容比較。',
    '找到最相關的幾段資料之後，系統才把它們交給語言模型，請模型根據這些資料組織答案。',
    '所以 RAG 的重點，不是讓模型憑空回答，而是先找到可靠的內容，再回答問題。'
  ]}
];
const dialogue = { status: 'approved', mode: 'single-female', language: 'zh-TW', slides: slides.map(s => ({ slide: s.slide, title: s.title, lines: s.lines.map((text, i) => ({ speaker: 'narrator_female', voice: 'narrator_female', text, line: i + 1 })) })) };
fs.writeFileSync(path.join(root, 'dialogue.json'), `${JSON.stringify(dialogue, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(root, 'narration-script.md'), ['# 自然女聲旁白稿', '', '- 狀態：approved', '- 模式：single-female', '', ...slides.flatMap(s => [`## Slide ${s.slide}｜${s.title}`, '', ...s.lines.map(t => `- 女聲：${t}`), ''])].join('\n'), 'utf8');
console.log(JSON.stringify({ ok: true, slides: slides.length, mode: dialogue.mode }, null, 2));
