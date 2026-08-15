import fs from 'node:fs';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';

const root = process.cwd();
const outDir = path.join(root, 'styles', 'previews');
fs.mkdirSync(outDir, { recursive: true });
const warm = path.join(root, 'assets', 'test', 'test-warm-bokeh.png');
const teal = path.join(root, 'assets', 'test', 'test-teal-geo.png');
const pptx = () => { const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.author = 'Teaching Agent'; p.lang = 'zh-TW'; return p; };
const text = (slide, value, opts) => slide.addText(value, { margin: 0, fit: 'shrink', breakLine: false, ...opts });

// 1. Full-bleed image, vertical title, line frame and sparse geometric marks.
{
  const p = pptx(); const s = p.addSlide();
  s.addImage({ path: warm, x: 0, y: 0, w: 13.333, h: 7.5 });
  s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: '102D35', transparency: 22 }, line: { color: '102D35', transparency: 100 } });
  s.addShape(p.ShapeType.rect, { x: 2.5, y: 0.88, w: 5.85, h: 5.58, fill: { color: '102D35', transparency: 100 }, line: { color: 'FFFFFF', transparency: 15, width: 1.2 } });
  s.addShape(p.ShapeType.ellipse, { x: 8.05, y: 1.0, w: 0.75, h: 0.75, fill: { color: 'F2A56F', transparency: 100 }, line: { color: 'F2A56F', width: 1 } });
  s.addShape(p.ShapeType.ellipse, { x: 1.98, y: 5.65, w: 0.22, h: 0.22, fill: { color: 'FFFFFF', transparency: 100 }, line: { color: 'FFFFFF', width: 1 } });
  text(s, 'AI DOCUMENT BASICS / 01', { x: 0.72, y: 0.5, w: 3.8, h: 0.2, fontFace: 'Arial', fontSize: 11, bold: true, charSpace: 3, color: 'F2C6A2' });
  text(s, '把文件\n交給\nAI', { x: 3.28, y: 1.35, w: 2.2, h: 2.6, fontFace: 'Microsoft JhengHei', fontSize: 42, bold: true, breakLine: true, color: 'FFFFFF', valign: 'mid', align: 'center', charSpace: 2 });
  text(s, '讓 AI 先整理，\n人保留最後的判斷。', { x: 0.72, y: 6.15, w: 3.2, h: 0.65, fontFace: 'Microsoft JhengHei', fontSize: 18, color: 'FFFDE9', breakLine: true });
  text(s, 'POSTER STUDY · 2026', { x: 10.5, y: 6.65, w: 2.1, h: 0.2, fontFace: 'Arial', fontSize: 9, bold: true, charSpace: 2, color: 'FFFFFF', align: 'right' });
  await p.writeFile({ fileName: path.join(outDir, 'poetic-image-poster-sample.pptx') });
}

// 2. Editorial workspace: title, work surface, laptop, paper and ruler.
{
  const p = pptx(); const s = p.addSlide(); s.background = { color: 'F0EFEB' };
  text(s, 'WORKSHOP / VISUAL NOTE', { x: 0.75, y: 0.5, w: 3.8, h: 0.2, fontFace: 'Arial', fontSize: 12, bold: true, charSpace: 3, color: 'E34B87' });
  text(s, '設計一頁\n可用的教學投影片', { x: 0.75, y: 0.98, w: 4.5, h: 1.05, fontFace: 'Arial', fontSize: 30, bold: true, breakLine: true, color: '181818' });
  s.addShape(p.ShapeType.line, { x: 0.76, y: 2.4, w: 3.8, h: 0, line: { color: '181818', width: 2.2 } });
  text(s, '把工具、畫面與操作結果\n放在同一個工作情境裡。', { x: 0.76, y: 2.75, w: 3.3, h: 0.7, fontFace: 'Microsoft JhengHei', fontSize: 17, color: '686868', breakLine: true });
  s.addShape(p.ShapeType.rect, { x: 5.0, y: 1.0, w: 6.85, h: 5.35, rotate: 358, fill: { color: 'D9D5CD' }, line: { color: 'D9D5CD' }, shadow: { type: 'outer', color: '333333', opacity: 0.16, blur: 2, angle: 45, distance: 3 } });
  s.addShape(p.ShapeType.roundRect, { x: 6.2, y: 1.82, w: 4.45, h: 2.9, rectRadius: 0.12, fill: { color: '242424' }, line: { color: '111111', width: 1 } });
  s.addImage({ path: teal, x: 6.4, y: 2.02, w: 4.05, h: 2.5 });
  s.addShape(p.ShapeType.rect, { x: 5.65, y: 5.05, w: 2.15, h: 1.2, rotate: 348, fill: { color: 'FFFFFF' }, line: { color: 'FFFFFF' }, shadow: { type: 'outer', color: '333333', opacity: 0.12, blur: 1, angle: 45, distance: 2 } });
  text(s, '先看結果', { x: 5.88, y: 5.3, w: 1.6, h: 0.25, fontFace: 'Microsoft JhengHei', fontSize: 16, bold: true, color: '181818', rotate: 348 });
  text(s, '再拆解步驟與方法', { x: 5.82, y: 5.75, w: 1.8, h: 0.2, fontFace: 'Microsoft JhengHei', fontSize: 9, color: '686868', rotate: 348 });
  s.addShape(p.ShapeType.rect, { x: 10.6, y: 5.05, w: 2.7, h: 0.32, rotate: 58, fill: { color: 'F4D15A' }, line: { color: '202020', width: 0.7 } });
  s.addShape(p.ShapeType.roundRect, { x: 10.75, y: 1.2, w: 1.55, h: 0.42, fill: { color: 'E34B87' }, line: { color: 'E34B87' } });
  text(s, 'SHOW THE WORK', { x: 10.86, y: 1.32, w: 1.32, h: 0.1, fontFace: 'Arial', fontSize: 8, bold: true, charSpace: 1, color: 'FFFFFF', align: 'center' });
  text(s, '01 / TOOL · SCREEN · RESULT', { x: 0.76, y: 6.75, w: 3.8, h: 0.2, fontFace: 'Arial', fontSize: 10, bold: true, charSpace: 2, color: '686868' });
  await p.writeFile({ fileName: path.join(outDir, 'workspace-editorial-sample.pptx') });
}

// 3. Modular cards: asymmetric grid, image card, numbered cards and metric card.
{
  const p = pptx(); const s = p.addSlide(); s.background = { color: 'F3F7F5' };
  s.addShape(p.ShapeType.ellipse, { x: 10.6, y: -1.35, w: 4.5, h: 3.0, fill: { color: 'BFE2DE' }, line: { color: 'BFE2DE', transparency: 100 } });
  text(s, 'AI 文件處理 / QUICK GUIDE', { x: 0.72, y: 0.55, w: 3.8, h: 0.2, fontFace: 'Arial', fontSize: 11, bold: true, charSpace: 2.5, color: '168A8A' });
  text(s, '把複雜工作\n拆成三張卡', { x: 0.72, y: 1.0, w: 3.8, h: 0.9, fontFace: 'Microsoft JhengHei', fontSize: 29, bold: true, breakLine: true, color: '203638' });
  text(s, '每個模組只說一件事，讓學員可以快速掃讀、理解，再開始練習。', { x: 0.72, y: 2.28, w: 3.15, h: 0.85, fontFace: 'Microsoft JhengHei', fontSize: 16, color: '647477', breakLine: true, fit: 'shrink' });
  const card = (x, y, w, h, fill='FFFFFF') => s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill, transparency: 100 }, shadow: { type: 'outer', color: '203638', opacity: 0.12, blur: 1, angle: 45, distance: 2 } });
  card(4.7, 0.95, 3.25, 3.55); s.addImage({ path: teal, x: 4.7, y: 0.95, w: 3.25, h: 3.55 }); s.addShape(p.ShapeType.roundRect, { x: 4.98, y: 3.85, w: 2.7, h: 0.4, rectRadius: 0.08, fill: { color: 'FFFFFF', transparency: 5 }, line: { color: 'FFFFFF', transparency: 100 } }); text(s, '真實文件 → 可讀結果', { x: 5.15, y: 3.98, w: 2.4, h: 0.1, fontFace: 'Microsoft JhengHei', fontSize: 9, bold: true, color: '203638', align: 'center' });
  card(8.2, 0.95, 3.1, 1.65); text(s, '01', { x: 8.48, y: 1.2, w: 0.65, h: 0.4, fontFace: 'Arial', fontSize: 28, bold: true, color: '168A8A' }); text(s, '先選一個小任務', { x: 9.2, y: 1.22, w: 1.75, h: 0.25, fontFace: 'Microsoft JhengHei', fontSize: 17, bold: true, color: '203638' }); text(s, '摘要、整理或改寫。', { x: 9.2, y: 1.72, w: 1.65, h: 0.2, fontFace: 'Microsoft JhengHei', fontSize: 11, color: '647477' });
  card(8.2, 2.85, 3.1, 1.65, 'F4A340'); text(s, '4', { x: 8.48, y: 3.1, w: 0.65, h: 0.45, fontFace: 'Arial', fontSize: 30, bold: true, color: '203638' }); text(s, '提示詞元素', { x: 9.2, y: 3.12, w: 1.75, h: 0.25, fontFace: 'Microsoft JhengHei', fontSize: 17, bold: true, color: '203638' }); text(s, '角色、材料、任務、格式。', { x: 9.2, y: 3.6, w: 1.85, h: 0.2, fontFace: 'Microsoft JhengHei', fontSize: 11, color: '203638' });
  card(4.7, 4.75, 6.6, 1.55, '168A8A'); text(s, '03', { x: 5.0, y: 5.0, w: 0.75, h: 0.4, fontFace: 'Arial', fontSize: 28, bold: true, color: 'FFFFFF' }); text(s, '最後一定人工確認', { x: 5.95, y: 5.02, w: 3.3, h: 0.25, fontFace: 'Microsoft JhengHei', fontSize: 19, bold: true, color: 'FFFFFF' }); text(s, '核對人名、日期、數字與是否遺漏條件。', { x: 5.95, y: 5.52, w: 4.3, h: 0.2, fontFace: 'Microsoft JhengHei', fontSize: 13, color: 'E6FFFB' });
  await p.writeFile({ fileName: path.join(outDir, 'modular-info-cards-sample.pptx') });
}

console.log('Generated three one-slide style sample decks in ' + outDir);
