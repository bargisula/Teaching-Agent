import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const root = process.cwd();
const course = path.join(root, 'library', 'courses', 'ai-excel-admin', 'versions', 'v0.1');
const assets = path.join(course, 'assets');
const outDir = path.join(course, 'deck');
const renderDir = path.join(course, 'render');
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(renderDir, { recursive: true });

const slides = [
  { title: '行政人員的 AI＋Excel 工作管控', msg: 'AI 負責整理與分析，Excel 負責保存與追蹤，人員負責確認與決策。', bullets: ['AI 協助處理文字與資料', 'Excel 集中管理工作進度', '最後結果仍需人工確認'] },
  { title: '從需求到管控工具的工作流程', msg: '先說清楚需求，再提供資料，最後請 AI 產出指定格式。', bullets: ['說明目的', '貼上資料', '下達 Prompt', '檢查結果', '回填 Excel'] },
  { title: '案例一：用 AI 製作教材', msg: '把課程主題、對象與成果交給 AI，先取得可修改的教材大綱。', bullets: ['輸入課程條件', '要求產出教學流程', '檢查是否適合初學者'] },
  { title: '案例二：建立 Excel 教材進度管控表', msg: '用欄位、狀態與日期，把教材製作進度集中管理。', bullets: ['單元與負責人', '開始日與截止日', '製作與審核狀態'] },
  { title: '案例二實作：請 AI 分析進度', msg: '複製 Excel 資料給 AI，找出逾期、卡關與需要優先處理的項目。', bullets: ['貼上 Excel 表格', '輸入分析 Prompt', '將結果回填 Excel'] },
  { title: '案例三：分析學員學習成果', msg: '用出席率、作業完成率與測驗分數，找出需要補強的學員。', bullets: ['貼上學員成績', '設定判斷標準', '取得補強建議'] },
  { title: '綜合實作：建立自己的管控工具', msg: '選一項日常工作，建立 Excel 管控表，再請 AI 找出問題。', bullets: ['決定管控主題', '建立欄位並輸入資料', '請 AI 分析並回填'] },
  { title: '工作檢查表與課程總結', msg: '資料放進 Excel，清楚下達 Prompt，人工確認後再更新管控表。', bullets: ['說明目的', '提供完整資料', '指定任務與格式', '檢查 AI 結果'] },
];

async function imageBytes(file) {
  const bytes = await fs.readFile(file);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function addText(slide, text, position, style) {
  const box = slide.shapes.add({ geometry: 'textbox', position, fill: 'none', line: { style: 'solid', fill: 'none', width: 0 } });
  box.text = text;
  box.text.style = style;
  return box;
}

const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const navy = '14283D', cream = 'F4F0E8', teal = '0F8B8D', coral = 'E76F51', muted = '435566';

for (let i = 0; i < slides.length; i += 1) {
  const d = slides[i];
  const slide = presentation.slides.add();
  const img = await imageBytes(path.join(assets, `slide-${String(i + 1).padStart(2, '0')}.png`));
  slide.images.add({ blob: img, contentType: 'image/png', fit: 'cover', position: { left: 0, top: 0, width: 1280, height: 720 }, alt: d.title });
  slide.shapes.add({ geometry: 'roundRect', position: { left: 42, top: 44, width: 510, height: 632 }, fill: { color: cream, transparency: 5 }, line: { style: 'solid', fill: cream, width: 0 }, borderRadius: 'rounded-xl', shadow: 'shadow-sm' });
  addText(slide, `${String(i + 1).padStart(2, '0')}  /  AI × EXCEL`, { left: 78, top: 78, width: 280, height: 24 }, { fontSize: 15, bold: true, color: coral, fontFace: 'Aptos', letterSpacing: 1.5 });
  addText(slide, d.title, { left: 78, top: 128, width: 430, height: 108 }, { fontSize: 34, bold: true, color: navy, fontFace: 'Aptos Display', breakLine: false });
  slide.shapes.add({ geometry: 'line', position: { left: 78, top: 258, width: 390, height: 0 }, line: { style: 'solid', fill: teal, width: 2 } });
  addText(slide, d.msg, { left: 78, top: 286, width: 420, height: 88 }, { fontSize: 21, color: muted, fontFace: 'Aptos', breakLine: false });
  addText(slide, d.bullets.map((b, n) => `${n + 1}. ${b}`).join('\n'), { left: 82, top: 410, width: 410, height: 150 }, { fontSize: 19, color: navy, fontFace: 'Aptos', breakLine: true });
  addText(slide, 'AI 先整理  ·  人再確認', { left: 78, top: 626, width: 260, height: 24 }, { fontSize: 13, bold: true, color: teal, fontFace: 'Aptos' });
  addText(slide, String(i + 1).padStart(2, '0'), { left: 1160, top: 650, width: 60, height: 30 }, { fontSize: 20, bold: true, color: cream, fontFace: 'Aptos', align: 'right' });
}

for (const [index, slide] of presentation.slides.items.entries()) {
  const stem = `page-${String(index + 1).padStart(2, '0')}`;
  const png = await presentation.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(path.join(renderDir, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
}

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(path.join(outDir, 'deck.pptx'));
console.log(path.join(outDir, 'deck.pptx'));
