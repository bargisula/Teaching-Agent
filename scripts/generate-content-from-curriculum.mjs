import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const courseId = opt('course');
if (!courseId) throw new Error('用法：node scripts/generate-content-from-curriculum.mjs --course <course-id>');
const courseRoot = path.join(root, 'library', 'courses', courseId);
const manifestPath = path.join(courseRoot, 'manifest.json');
const planPath = path.join(courseRoot, 'curriculum', 'curriculum-plan.json');
if (!fs.existsSync(manifestPath)) throw new Error(`找不到 manifest：${manifestPath}`);
if (!fs.existsSync(planPath)) throw new Error(`找不到教材規劃：${planPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8').replace(/^\uFEFF/, ''));
if (!Array.isArray(plan.slides) || plan.slides.length !== Number(plan.slideCount || 8)) throw new Error('教材規劃頁數不符合 slideCount，停止交棒');

const slides = plan.slides.map(s => ({
  page: s.page,
  title: s.title,
  message: s.purpose,
  bullets: [`學員任務：${s.learnerTask}`, `課堂產出：${s.deliverable}`, '完成後檢查結果是否符合原始需求'],
  prompt: `請協助我完成「${s.learnerTask}」，輸入資料後請以清楚、可執行的步驟輸出。`,
  expectedResult: s.deliverable,
  visual: s.visualDirection
}));
const version = manifest.latestVersion || 'v0.1';
const contentDir = path.join(courseRoot, 'versions', version, 'content');
fs.mkdirSync(contentDir, { recursive: true });
fs.writeFileSync(path.join(contentDir, 'slides.json'), JSON.stringify({ version, source: 'curriculum/curriculum-plan.json', slides }, null, 2) + '\n', 'utf8');
const lines = [`# 逐頁教材內容：${plan.title}`, '', `- 來源：curriculum/curriculum-plan.json`, `- 頁數：${slides.length}`, ''];
for (const s of slides) lines.push(`## 第 ${s.page} 頁｜${s.title}`, '', `**教學目的**：${s.message}`, '', `**學員任務**：${s.learnerTask}`, '', '**Prompt**：', '', `> ${s.prompt}`, '', `**預期結果**：${s.expectedResult}`, '', `**視覺方向**：${s.visual}`, '');
fs.writeFileSync(path.join(contentDir, 'slides.md'), lines.join('\n') + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, courseId, version, source: 'curriculum/curriculum-plan.json', slideCount: slides.length, files: [
  `library/courses/${courseId}/versions/${version}/content/slides.json`,
  `library/courses/${courseId}/versions/${version}/content/slides.md`
] }, null, 2));
