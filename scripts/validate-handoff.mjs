import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const courseId = opt('course');
const runId = opt('run');
const stage = opt('stage');
if (!courseId || !runId || !stage) throw new Error('用法：node scripts/validate-handoff.mjs --course <id> --run <id> --stage <stage>');

const courseRoot = path.join(root, 'library', 'courses', courseId);
const runRoot = path.join(courseRoot, 'runs', runId);
const statePath = path.join(runRoot, 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8').replace(/^\uFEFF/, ''));
const versionRoot = path.join(courseRoot, 'versions', state.version);
const reqPath = path.join(courseRoot, 'intake', 'parsed-requirements.json');
const requirements = fs.existsSync(reqPath) ? JSON.parse(fs.readFileSync(reqPath, 'utf8')) : {};
const expectedSlides = Number(requirements.slideCount || 8);
const failures = [];
const exists = (relative, label = relative) => { const full = path.join(courseRoot, relative); if (!fs.existsSync(full)) failures.push({ rule: 'file_exists', label, path: full }); return full; };
const nonEmpty = (full, label) => { if (fs.existsSync(full) && fs.statSync(full).size < 20) failures.push({ rule: 'non_empty', label, path: full }); };
const jsonFile = (full, label) => { try { return JSON.parse(fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, '')); } catch (error) { failures.push({ rule: 'valid_json', label, path: full, detail: error.message }); return null; } };

if (stage === 'goal') {
  const full = exists('source/goal.md'); nonEmpty(full, '目標拆解');
} else if (stage === 'curriculum') {
  const plan = path.join(courseRoot, 'curriculum', 'curriculum-plan.json');
  const outline = path.join(versionRoot, 'outline', 'outline.md');
  if (fs.existsSync(plan)) {
    const data = jsonFile(plan, '教材規劃 JSON');
    if (data && (!Array.isArray(data.slides) || data.slides.length !== expectedSlides)) failures.push({ rule: 'slide_count', label: '教材規劃頁數', expected: expectedSlides, actual: data?.slides?.length || 0, path: plan });
  } else { const full = exists('versions/' + state.version + '/outline/outline.md', '教材規劃輸出'); nonEmpty(full, '教材規劃輸出'); }
} else if (stage === 'content') {
  const slides = path.join(versionRoot, 'content', 'slides.json');
  const md = path.join(versionRoot, 'content', 'slides.md');
  if (fs.existsSync(slides)) {
    const data = jsonFile(slides, '逐頁內容 JSON');
    if (data && (!Array.isArray(data.slides) || data.slides.length !== expectedSlides)) failures.push({ rule: 'slide_count', label: '逐頁內容頁數', expected: expectedSlides, actual: data?.slides?.length || 0, path: slides });
  } else { const full = exists('versions/' + state.version + '/content/slides.md', '逐頁內容輸出'); nonEmpty(full, '逐頁內容輸出'); }
} else if (stage === 'visual') {
  const spec = path.join(versionRoot, 'visual-design', 'visual-spec.json');
  const data = jsonFile(exists('versions/' + state.version + '/visual-design/visual-spec.json', '視覺規格'), '視覺規格 JSON');
  if (data && (!Array.isArray(data.pages) || data.pages.length !== expectedSlides)) failures.push({ rule: 'slide_count', label: '視覺規格頁數', expected: expectedSlides, actual: data?.pages?.length || 0, path: spec });
} else if (stage === 'render') {
  const dir = path.join(versionRoot, 'render');
  const pngs = fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => /^page-\d+\.png$/i.test(x)) : [];
  if (pngs.length !== expectedSlides) failures.push({ rule: 'render_count', label: '渲染圖片數量', expected: expectedSlides, actual: pngs.length, path: dir });
} else if (stage === 'assemble') {
  const full = exists('versions/' + state.version + '/deck/deck.pptx', 'PPTX 成品');
  if (fs.existsSync(full) && fs.statSync(full).size < 10000) failures.push({ rule: 'pptx_size', label: 'PPTX 成品大小', expected: '>10000 bytes', actual: fs.statSync(full).size, path: full });
} else if (stage === 'review') {
  const full = exists('versions/' + state.version + '/review/report.md', '品檢報告');
  if (fs.existsSync(full) && !/PASS/i.test(fs.readFileSync(full, 'utf8'))) failures.push({ rule: 'review_pass', label: '品檢結果', expected: 'PASS', path: full });
} else failures.push({ rule: 'known_stage', label: stage, detail: '未知階段' });

if (failures.length) {
  const detail = { ok: false, status: 'blocked', courseId, runId, stage, version: state.version, message: '交棒驗收失敗，流程已停止。', failures, checkedAt: new Date().toISOString() };
  fs.mkdirSync(runRoot, { recursive: true });
  fs.writeFileSync(path.join(runRoot, 'handoff-failure.json'), JSON.stringify(detail, null, 2) + '\n', 'utf8');
  const lines = [`# 交棒驗收失敗`, ``, `- 狀態：BLOCKED`, `- 階段：${stage}`, `- 說明：${detail.message}`, ``, `## 失敗項目`, ...failures.map(x => `- ${x.label}｜規則：${x.rule}｜${x.path || x.detail || `預期 ${x.expected}，實際 ${x.actual}`}`), ``, `## 下一步`, `- 修正上述輸出後，重新執行相同階段。`];
  fs.writeFileSync(path.join(runRoot, 'handoff-failure.md'), lines.join('\n') + '\n', 'utf8');
  console.error(`\n[流程已停止｜BLOCKED] ${stage}`);
  for (const item of failures) console.error(`- ${item.label}｜${item.rule}｜${item.path || item.detail || `預期 ${item.expected}，實際 ${item.actual}`}`);
  console.error(`詳細資訊：${path.relative(root, path.join(runRoot, 'handoff-failure.md'))}`);
  process.exit(2);
}
console.log(`[交棒驗收通過] ${stage}｜可交給下一個 Agent`);
