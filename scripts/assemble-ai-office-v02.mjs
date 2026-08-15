import fs from 'node:fs';
import path from 'node:path';
import pptxgen from 'pptxgenjs';

const root = path.resolve('library/courses/ai-office-collaboration/versions/v0.2');
const slides = JSON.parse(fs.readFileSync(path.join(root, 'content/slides-v02.json'), 'utf8')).slides;

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Alfred / Teaching Agent';
pptx.subject = 'AI × Office 圖像型教材';
pptx.title = 'AI × Office：讓日常工作更快完成';
pptx.company = 'Teaching Agent';
pptx.lang = 'zh-TW';
pptx.theme = {
  headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'zh-TW'
};
pptx.defineSlideMaster({
  title: 'IMAGE_LED',
  background: { color: '14283D' },
  objects: [{ text: { text: 'TEACHING AGENT  /  AI × OFFICE', options: { x: 0.55, y: 7.05, w: 4.5, h: 0.16, fontFace: 'Aptos', fontSize: 7, color: 'F2EDE3', transparency: 20, charSpacing: 1.2, margin: 0 } } }],
  slideNumber: { x: 12.45, y: 7.03, color: 'F2EDE3', fontSize: 8 }
});

const W = 13.333, H = 7.5;
const navy = '14283D', cream = 'F4F0E8', coral = 'E76F51', teal = '0F8B8D';
const fit = { fit: 'shrink' };

for (let i = 0; i < slides.length; i++) {
  const d = slides[i];
  const slide = pptx.addSlide('IMAGE_LED');
  const image = path.join(root, 'assets', `slide-${String(i + 1).padStart(2, '0')}.png`);
  slide.addImage({ path: image, x: 0, y: 0, w: W, h: H });
  const leftPanel = i === 0 || i === 2 || i === 4 || i === 6 ? '14283D' : 'F4F0E8';
  const panelTransparency = i === 0 ? 7 : 4;
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 5.35, h: H, fill: { color: leftPanel, transparency: panelTransparency }, line: { color: leftPanel, transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: 0.7, w: 0.5, h: 0.08, fill: { color: coral }, line: { color: coral, transparency: 100 } });
  slide.addText(`${String(i + 1).padStart(2, '0')}  /  AI × OFFICE`, { x: 0.62, y: 0.88, w: 3.5, h: 0.24, fontFace: 'Aptos', fontSize: 10, bold: true, color: leftPanel === navy ? 'F8B195' : coral, charSpacing: 1.2, margin: 0 });
  slide.addText(d.title, { x: 0.62, y: 1.28, w: 4.25, h: 1.24, fontFace: 'Aptos Display', fontSize: i === 0 ? 26 : 25, bold: true, color: leftPanel === navy ? cream : navy, breakLine: false, margin: 0, valign: 'mid', ...fit });
  slide.addText(d.message, { x: 0.64, y: 2.72, w: 4.02, h: 0.85, fontFace: 'Aptos', fontSize: 13, color: leftPanel === navy ? 'E8E2D8' : '334B60', breakLine: false, margin: 0, valign: 'mid', ...fit });
  const bulletText = d.bullets.map((b, n) => ({ text: b, options: { bullet: { indent: 12 }, hanging: 3, breakLine: n < d.bullets.length - 1 } }));
  slide.addText(bulletText, { x: 0.68, y: 4.22, w: 4.05, h: 1.55, fontFace: 'Aptos', fontSize: 13, color: leftPanel === navy ? cream : navy, paraSpaceAfterPt: 8, margin: 0.04, breakLine: false, ...fit });
  slide.addText('AI 先整理\n人再確認', { x: 0.64, y: 6.12, w: 1.5, h: 0.5, fontFace: 'Aptos', fontSize: 10, bold: true, color: leftPanel === navy ? 'F8B195' : teal, breakLine: true, margin: 0, charSpacing: 0.7 });
}

const out = path.join(root, 'deck', 'deck.pptx');
await pptx.writeFile({ fileName: out });
console.log(out);
