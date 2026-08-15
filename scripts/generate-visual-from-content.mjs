import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const courseId = opt('course');
if (!courseId) throw new Error('用法：node scripts/generate-visual-from-content.mjs --course <course-id>');
const courseRoot = path.join(root, 'library', 'courses', courseId);
const manifest = JSON.parse(fs.readFileSync(path.join(courseRoot, 'manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
const version = manifest.latestVersion || 'v0.1';
const contentPath = path.join(courseRoot, 'versions', version, 'content', 'slides.json');
if (!fs.existsSync(contentPath)) throw new Error(`找不到內容輸出：${contentPath}`);
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8').replace(/^\uFEFF/, ''));
const expected = Number(manifest.slideCount || content.slides?.length || 8);
if (!Array.isArray(content.slides) || content.slides.length !== expected) throw new Error(`內容頁數不符：預期 ${expected}，實際 ${content.slides?.length || 0}`);

const layouts = ['cover-image-text', 'workflow-diagram', 'prompt-card', 'editorial-split', 'data-card', 'process-roadmap', 'checklist-poster', 'exercise-board'];
const pages = content.slides.map((s, i) => ({
  page: s.page,
  title: s.title,
  layout: layouts[i % layouts.length],
  rhythm: i === 0 ? 'cover' : i === expected - 1 ? 'exercise' : i % 2 ? 'text-led' : 'image-led',
  textSafeArea: i % 2 ? 'left-42%' : 'right-42%',
  imageRequirement: s.visual || '以工作情境圖呈現，不使用機器人或霓虹科技背景',
  editableText: ['title', 'message', 'bullets', 'prompt', 'expectedResult'],
  sourceContentPage: s.page
}));
const spec = {
  courseId, version, director: 'visual-director', styleMode: 'mixed-editorial-poster',
  principle: '依內容任務混合版型，不讓 8 頁使用同一種格式', pages,
  handoff: { from: 'content-agent', to: 'render-agent', status: 'completed', checkedAt: new Date().toISOString(), source: 'versions/' + version + '/content/slides.json' }
};
const visualDir = path.join(courseRoot, 'versions', version, 'visual-design');
const handoffDir = path.join(courseRoot, 'handoff');
fs.mkdirSync(visualDir, { recursive: true });
fs.mkdirSync(handoffDir, { recursive: true });
fs.writeFileSync(path.join(visualDir, 'visual-spec.json'), JSON.stringify(spec, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(visualDir, 'visual-spec.md'), ['# 視覺設計規格', '', `- 風格模式：${spec.styleMode}`, `- 頁數：${pages.length}`, '', ...pages.map(p => `## 第 ${p.page} 頁｜${p.title}\n- 版型：${p.layout}\n- 節奏：${p.rhythm}\n- 文字安全區：${p.textSafeArea}\n- 圖像需求：${p.imageRequirement}`)].join('\n\n') + '\n', 'utf8');
fs.writeFileSync(path.join(handoffDir, 'visual-status.json'), JSON.stringify({ status: 'completed', from: 'content-agent', to: 'render-agent', source: `library/courses/${courseId}/versions/${version}/content/slides.json`, output: `library/courses/${courseId}/versions/${version}/visual-design/visual-spec.json`, pageCount: pages.length, updatedAt: new Date().toISOString() }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, courseId, version, status: 'completed', nextAgent: 'render-agent', files: [
  `library/courses/${courseId}/versions/${version}/visual-design/visual-spec.json`,
  `library/courses/${courseId}/versions/${version}/visual-design/visual-spec.md`,
  `library/courses/${courseId}/handoff/visual-status.json`
] }, null, 2));
