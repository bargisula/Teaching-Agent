import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const inputFile = option('request-file');
const inline = option('text');
if (!inputFile && !inline) throw new Error('請提供 --request-file <path> 或 --text <需求>');
const rawRequest = inputFile ? fs.readFileSync(path.resolve(inputFile), 'utf8').replace(/^\uFEFF/, '').trim() : inline.trim();
if (!rawRequest) throw new Error('需求不可為空白');

const schema = `{
  "id": "lowercase-kebab-case-id",
  "title": "教材名稱",
  "description": "一句話描述",
  "audience": "學員對象",
  "durationMinutes": 90,
  "slideCount": 8,
  "outcome": "學員完成後能做到什麼",
  "format": "圖像型 PPT",
  "tags": ["標籤"],
  "deliverables": ["要交付的成果"],
  "delegation": {
    "curriculum": "交代給教材規劃 Agent 的事項",
    "content": "交代給內容生成 Agent 的事項",
    "visual": "交代給視覺導演 Agent 的事項",
    "review": "交代給品質檢查 Agent 的事項"
  },
  "clarifications": ["仍需使用者確認的事項"]
}`;

function parseJsonBlock(value) {
  const fenced = value.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : value;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('LLM 回覆沒有找到 JSON');
  return JSON.parse(candidate.slice(start, end + 1));
}

function fallbackParse(request) {
  const isExcel = /excel|\u8a66\u7b97\u8868|\u7ba1\u63a7\u8868/i.test(request);
  const noMicrosoft = /\u7121\u5fae\u8edf|\u4e0d\u4f7f\u7528\u5fae\u8edf|non[- ]?microsoft|without[- ]?microsoft/i.test(request);
  const duration = Number((request.match(/(\d+)\s*分鐘/) || [])[1] || 90);
  const slideCount = Number((request.match(/(\d+)\s*張/) || [])[1] || 8);
  const audience = (request.match(/給([^，。,\.]+?)(?:的|課程)/) || [])[1] || '待確認學員對象';
  const title = noMicrosoft ? '\u7121\u5fae\u8edf AI \u5de5\u4f5c\u74b0\u5883' : (isExcel ? '\u884c\u653f\u4eba\u54e1\u7684 AI\uff0bExcel \u5de5\u4f5c\u7ba1\u63a7' : 'AI \u5be6\u4f5c\u6559\u6750');
  const id = noMicrosoft ? 'non-microsoft-ai-workspace' : (isExcel ? 'ai-excel-admin' : 'ai-course');
  return {
    id, title, description: request, audience, durationMinutes: duration, slideCount,
    outcome: noMicrosoft ? '\u5b78\u54e1\u80fd\u4f7f\u7528\u975e Microsoft \u7684 AI \u8207\u8fa6\u516c\u5de5\u5177\u5b8c\u6210\u65e5\u5e38\u5de5\u4f5c' : (isExcel ? '\u5b78\u54e1\u80fd\u4f7f\u7528 AI \u5354\u52a9\u5efa\u7acb Excel \u7ba1\u63a7\u5de5\u5177' : '\u5b78\u54e1\u80fd\u5b8c\u6210\u6307\u5b9a\u7684 AI \u5be6\u4f5c\u4efb\u52d9'),
    format: '圖像型 PPT', tags: isExcel ? ['AI', 'Excel', '行政工作'] : ['AI'],
    deliverables: ['教材大綱', '逐頁內容', `${slideCount} 張 PPT`, '品檢報告'],
    delegation: {
      curriculum: `依 ${duration} 分鐘與 ${slideCount} 張投影片規劃可實作的教材大綱。`,
      content: '每頁提供教學目的、操作 SOP、Prompt 與預期結果。',
      visual: '每頁使用對應主視覺，文字保持為可編輯 PPT 文字。',
      review: `確認剛好 ${slideCount} 張、內容符合學習成果且可實際操作。`
    },
    clarifications: ['是否需要使用者確認學習成果與視覺風格？'],
    parsedBy: 'local-fallback'
  };
}

function askLlm(request) {
  const prompt = `你是 Teaching Agent 的需求解析 Agent。只解析使用者需求，不要開始製作教材。\n\n使用者需求：\n${request}\n\n請只回傳符合下列 schema 的 JSON，不要加 Markdown 或解釋：\n${schema}`;
  if (process.env.TEACHING_AGENT_USE_CLI === '0') return null;
  const cli = process.env.TEACHING_AGENT_CLI || 'codex';
  const out = path.join(root, 'work', 'intake-llm-response.txt');
  const cmd = cli === 'claude'
    ? ['-p', prompt]
    : ['exec', '-s', 'read-only', '--skip-git-repo-check', '--ephemeral', '--output-last-message', out, prompt];
  const result = spawnSync(cli, cmd, { cwd: root, encoding: 'utf8', timeout: 90000, windowsHide: true });
  if (result.status !== 0) return null;
  const reply = cli === 'claude' ? result.stdout : fs.readFileSync(out, 'utf8');
  return parseJsonBlock(reply);
}

const parsed = askLlm(rawRequest) || fallbackParse(rawRequest);
if (!/^[a-z0-9][a-z0-9-]*$/.test(parsed.id)) throw new Error('解析後的 id 不是小寫英數連字號格式');
parsed.durationMinutes = Number(parsed.durationMinutes || 90);
parsed.slideCount = Number(parsed.slideCount || 8);
parsed.sourceRequest = rawRequest;
parsed.parsedAt = new Date().toISOString();
parsed.parsedBy = parsed.parsedBy || (process.env.TEACHING_AGENT_CLI || 'codex');

const courseRoot = path.join(root, 'library', 'courses', parsed.id);
const intakeDir = path.join(courseRoot, 'intake');
const sourceDir = path.join(courseRoot, 'source');
const versionRoot = path.join(courseRoot, 'versions', 'v0.1');
for (const dir of [intakeDir, sourceDir, path.join(versionRoot, 'outline'), path.join(versionRoot, 'content'), path.join(versionRoot, 'visual-design'), path.join(versionRoot, 'review')]) fs.mkdirSync(dir, { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const manifest = {
  id: parsed.id, title: parsed.title, description: parsed.description,
  tags: parsed.tags || [], audience: parsed.audience, durationMinutes: parsed.durationMinutes,
  status: 'draft', latestVersion: 'v0.1', updatedAt: today,
  versions: [{ id: 'v0.1', status: 'draft', createdAt: today, changeSummary: '由對話需求解析建立' }]
};
const briefMarkdown = `# Agent 交辦事項\n\n## 原始需求\n\n${rawRequest}\n\n## 解析結果\n\n- 教材 ID：${parsed.id}\n- 教材名稱：${parsed.title}\n- 教學對象：${parsed.audience}\n- 課程時間：${parsed.durationMinutes} 分鐘\n- 投影片數量：${parsed.slideCount} 張\n- 學習成果：${parsed.outcome}\n- 格式：${parsed.format || '圖像型 PPT'}\n\n## 交辦事項\n\n### 教材規劃 Agent\n${parsed.delegation?.curriculum || '依解析結果規劃教材。'}\n\n### 內容生成 Agent\n${parsed.delegation?.content || '依大綱生成逐頁內容。'}\n\n### 視覺導演 Agent\n${parsed.delegation?.visual || '依內容規劃視覺。'}\n\n### 品質檢查 Agent\n${parsed.delegation?.review || '檢查成品。'}\n\n## 待確認事項\n\n${(parsed.clarifications || []).map(item => '- ' + item).join('\n') || '- 無'}\n`;
fs.writeFileSync(path.join(intakeDir, 'request.txt'), rawRequest + '\n', 'utf8');
fs.writeFileSync(path.join(intakeDir, 'parsed-requirements.json'), JSON.stringify(parsed, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(intakeDir, 'agent-brief.md'), briefMarkdown, 'utf8');
fs.writeFileSync(path.join(courseRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(sourceDir, 'course-requirements.md'), briefMarkdown, 'utf8');

const catalogPath = path.join(root, 'library', '_index', 'catalog.json');
if (fs.existsSync(catalogPath)) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8').replace(/^\uFEFF/, ''));
  catalog.courses = catalog.courses || [];
  const item = { id: parsed.id, title: parsed.title, description: parsed.description, tags: parsed.tags || [], audience: parsed.audience, status: 'draft', latestVersion: 'v0.1', updatedAt: today, path: `library/courses/${parsed.id}` };
  const index = catalog.courses.findIndex(course => course.id === parsed.id);
  if (index >= 0) catalog.courses[index] = { ...catalog.courses[index], ...item };
  else catalog.courses.unshift(item);
  catalog.updatedAt = today;
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
}

console.log(JSON.stringify({ ok: true, courseId: parsed.id, parsedBy: parsed.parsedBy, projectRoot: path.relative(root, courseRoot), files: ['intake/request.txt', 'intake/parsed-requirements.json', 'intake/agent-brief.md', 'manifest.json', 'source/course-requirements.md'] }, null, 2));
