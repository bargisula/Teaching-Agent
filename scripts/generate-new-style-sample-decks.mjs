import fs from 'node:fs';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';

const root = process.cwd();
const outDir = path.join(root, 'styles', 'previews');
fs.mkdirSync(outDir, { recursive: true });
const warm = path.join(root, 'assets', 'test', 'test-warm-bokeh.png');
const teal = path.join(root, 'assets', 'test', 'test-teal-geo.png');
const make = () => { const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.author = 'Teaching Agent'; p.lang = 'zh-TW'; return p; };
const addText = (s, value, opts) => s.addText(value, { margin: 0, fit: 'shrink', ...opts });

// Dynamic wave / oversized type poster.
{
  const p = make(); const s = p.addSlide(); s.background = { color: 'F1F0E4' };
  addText(s, 'TRAILS AND WAYS', { x: 0.84, y: 0.34, w: 2.6, h: 0.16, fontFace: 'Arial', fontSize: 8, color: '9A8D83', charSpace: 1.5 });
  addText(s, 'MOVE', { x: 0.82, y: 0.64, w: 5.5, h: 0.68, fontFace: 'Arial Black', fontSize: 52, bold: true, color: '1E2C45', charSpace: 1 });
  addText(s, '讓學習開始流動', { x: 0.86, y: 1.43, w: 2.4, h: 0.25, fontFace: 'Microsoft JhengHei', fontSize: 16, color: '6C6C68' });
  s.addShape(p.ShapeType.arc, { x: 4.0, y: 1.55, w: 9.2, h: 5.8, adjustPoint: 0.35, rotate: 12, line: { color: 'D76579', width: 42, transparency: 8 }, fill: { color: 'F1F0E4', transparency: 100 } });
  s.addShape(p.ShapeType.arc, { x: 4.35, y: 1.7, w: 8.9, h: 5.55, adjustPoint: 0.35, rotate: 12, line: { color: 'D88F67', width: 28, transparency: 8 }, fill: { color: 'F1F0E4', transparency: 100 } });
  s.addShape(p.ShapeType.arc, { x: 4.65, y: 1.92, w: 8.65, h: 5.25, adjustPoint: 0.35, rotate: 12, line: { color: '7C688F', width: 14, transparency: 5 }, fill: { color: 'F1F0E4', transparency: 100 } });
  s.addShape(p.ShapeType.arc, { x: 4.85, y: 2.15, w: 8.4, h: 4.95, adjustPoint: 0.35, rotate: 12, line: { color: '1E2C45', width: 10, transparency: 2 }, fill: { color: 'F1F0E4', transparency: 100 } });
  for (const [x, y, w, h, rot] of [[6.6,2.5,.22,.06,20],[7.4,2.05,.13,.05,12],[9.45,2.7,.28,.06,12],[10.5,3.55,.18,.05,24],[8.25,5.65,.26,.05,15]]) s.addShape(p.ShapeType.line, { x, y, w, h, rotate: rot, line: { color: 'D76579', width: 1.2 } });
  addText(s, '01 / VISUAL STUDY', { x: 0.86, y: 6.73, w: 2.2, h: 0.16, fontFace: 'Arial', fontSize: 9, bold: true, charSpace: 1.8, color: '6C6C68' });
  addText(s, '從一個小任務開始，讓理解向前推進。', { x: 9.55, y: 6.52, w: 2.6, h: 0.35, fontFace: 'Microsoft JhengHei', fontSize: 13, color: '1E2C45', align: 'right' });
  await p.writeFile({ fileName: path.join(outDir, 'kinetic-wave-poster-sample.pptx') });
}

// Botanical contents card / handbook index.
{
  const p = make(); const s = p.addSlide(); s.background = { color: 'F7F7F0' };
  s.addShape(p.ShapeType.roundRect, { x: 0.45, y: 0.28, w: 12.4, h: 6.95, rectRadius: 0.18, fill: { color: 'FFFFFF', transparency: 14 }, line: { color: 'DDEBDD', width: 1.2 } });
  s.addImage({ path: teal, x: 0.48, y: 0.32, w: 1.65, h: 1.5, transparency: 65 });
  s.addImage({ path: warm, x: 11.15, y: 5.76, w: 1.55, h: 1.42, transparency: 72 });
  addText(s, 'STUDY GUIDE', { x: 5.45, y: 0.72, w: 2.45, h: 0.18, fontFace: 'Arial', fontSize: 10, bold: true, charSpace: 2, color: '477A65', align: 'center' });
  addText(s, '目錄', { x: 5.2, y: 1.05, w: 3.0, h: 0.45, fontFace: 'Microsoft JhengHei', fontSize: 31, bold: true, color: '263E38', align: 'center' });
  addText(s, 'CONTENTS', { x: 5.55, y: 1.58, w: 2.3, h: 0.16, fontFace: 'Georgia', fontSize: 10, color: '718078', charSpace: 2, align: 'center' });
  const rows = [['PART 01','先選對任務','先從一個小任務開始'],['PART 02','研究與準備','整理材料與目標'],['PART 03','試做與修正','比較結果再調整'],['PART 04','檢查與分享','保留判斷與紀錄']];
  rows.forEach((r, i) => { const y = 2.12 + i * 0.82; addText(s, r[0], { x: 3.02, y, w: 1.05, h: 0.18, fontFace: 'Arial', fontSize: 10, bold: true, color: '263E38' }); s.addShape(p.ShapeType.roundRect, { x: 4.25, y: y - 0.06, w: 3.18, h: 0.38, rectRadius: 0.08, fill: { color: i % 2 ? 'DDEBDD' : 'EEF4E9' }, line: { color: 'DDEBDD', transparency: 100 } }); addText(s, r[1], { x: 4.48, y: y + 0.03, w: 2.7, h: 0.15, fontFace: 'Microsoft JhengHei', fontSize: 14, bold: true, color: '477A65', align: 'center' }); addText(s, r[2], { x: 7.75, y: y + 0.03, w: 2.2, h: 0.15, fontFace: 'Microsoft JhengHei', fontSize: 10, color: '718078' }); });
  s.addShape(p.ShapeType.line, { x: 5.58, y: 5.73, w: 2.1, h: 0, line: { color: 'C98D63', width: 1 } });
  addText(s, '一頁一個重點，循序完成整套練習。', { x: 4.15, y: 5.95, w: 4.9, h: 0.22, fontFace: 'Microsoft JhengHei', fontSize: 14, color: '263E38', align: 'center' });
  addText(s, 'TEACHING AGENT · 2026', { x: 5.0, y: 6.65, w: 3.3, h: 0.14, fontFace: 'Arial', fontSize: 8, color: '718078', charSpace: 1.5, align: 'center' });
  await p.writeFile({ fileName: path.join(outDir, 'botanical-contents-card-sample.pptx') });
}

console.log('Generated two new one-slide style sample decks.');
