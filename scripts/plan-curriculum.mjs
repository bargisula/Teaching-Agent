import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const courseId = option('course');
if (!courseId) throw new Error('用法：node scripts/plan-curriculum.mjs --course <course-id>');

const courseRoot = path.join(root, 'library', 'courses', courseId);
const intakePath = path.join(courseRoot, 'intake', 'parsed-requirements.json');
if (!fs.existsSync(intakePath)) throw new Error(`找不到需求解析結果：${intakePath}`);
const requirements = JSON.parse(fs.readFileSync(intakePath, 'utf8').replace(/^\uFEFF/, ''));

const fallbackSlides = [
  ['為什麼要建立無微軟工作環境', '界定工作情境、工具替代原則與本課程成果', '建立工具地圖', '情境照片＋工具生態關係圖'],
  ['先盤點工作，再選工具', '把日常任務拆成輸入、處理、輸出三段', '完成個人任務盤點表', '三段式工作流程'],
  ['AI 對話工具：從需求到結果', '用角色、資料、任務、格式寫出可重複使用的 Prompt', '完成一個通用 Prompt', 'Prompt 四元素卡片'],
  ['文件與知識整理', '用非 Microsoft 文件工具搭配 AI 摘要、分類與搜尋', '把一份長文件整理成重點表', '文件→摘要→知識庫流程'],
  ['試算表與資料分析', '用替代試算表工具整理資料、計算與產生圖表', '完成一張工作管控表', '資料表＋圖表視覺'],
  ['信箱與任務管理', '把郵件內容交給 AI 分類、擷取待辦並追蹤進度', '完成郵件到任務清單的轉換', '郵件→任務卡片流程'],
  ['自動化與安全邊界', '辨識可自動化工作，並檢查個資、權限與敏感資料', '完成一份安全檢查表', '自動化流程＋安全閘門'],
  ['整合演練：我的無微軟工作流', '將一項真實工作串成可執行的 AI 工作流程', '產出個人工作流與下一步', '完整工作流路線圖']
];

function fallbackPlan() {
  const duration = Number(requirements.durationMinutes) || 90;
  const count = Number(requirements.slideCount) || 8;
  const slides = fallbackSlides.slice(0, count).map((x, i) => ({
    page: i + 1, title: x[0], purpose: x[1], learnerTask: x[2], visualDirection: x[3],
    minutes: i === 0 ? 8 : i === count - 1 ? 15 : Math.max(5, Math.round((duration - 23) / Math.max(1, count - 2))),
    deliverable: i === count - 1 ? '個人無微軟 AI 工作流' : '課堂練習紀錄'
  }));
  return {
    courseId: requirements.id || courseId,
    title: requirements.title,
    planner: 'local-curriculum-planner',
    durationMinutes: duration,
    slideCount: count,
    audience: requirements.audience,
    learningOutcomes: [
      '能盤點日常工作並選擇合適的非 Microsoft 工具。',
      '能用清楚的 Prompt 讓 AI 協助整理、分析與追蹤工作。',
      '能建立一條兼顧效率與資料安全的個人工作流程。'
    ],
    designPrinciples: ['每頁只承擔一個教學任務', '每個概念都要接一個可操作練習', '工具名稱保持可替換，避免綁定單一品牌'],
    slides,
    handoff: {
      contentAgent: '依每頁 purpose、learnerTask 產出教學文字、SOP、Prompt 與預期結果。',
      visualDirector: '依 visualDirection 選擇混合版型與圖像，不將 8 頁做成同一種版面。',
      reviewAgent: '確認時間總和合理、頁數剛好 8 頁、工具不依賴 Microsoft 且每頁有可驗收產出。'
    }
  };
}

function extractJson(raw) {
  const start = raw.indexOf('{'); const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

function askCli() {
  if (process.env.TEACHING_AGENT_USE_CLI === '0') return null;
  const cli = process.env.TEACHING_AGENT_CLI || 'codex';
  const prompt = `你是教材規劃 Agent。請只輸出 JSON，不要 Markdown。根據以下需求，規劃 ${requirements.slideCount || 8} 張、${requirements.durationMinutes || 90} 分鐘的教材。JSON 必須含 courseId,title,durationMinutes,slideCount,audience,learningOutcomes,designPrinciples,slides,handoff；slides 每項必須含 page,title,purpose,learnerTask,visualDirection,minutes,deliverable。不可使用 Microsoft 工具作為必要條件；若未指定工具，使用「非 Microsoft 工具」描述。\n\n${JSON.stringify(requirements, null, 2)}`;
  const out = path.join(courseRoot, 'curriculum', 'cli-response.txt');
  const argv = cli === 'claude' ? ['-p', prompt] : ['exec', '-s', 'read-only', '--skip-git-repo-check', '--ephemeral', '--output-last-message', out, prompt];
  const result = spawnSync(cli, argv, { cwd: courseRoot, encoding: 'utf8', timeout: 90000, windowsHide: true });
  if (result.status !== 0) return null;
  const raw = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : `${result.stdout || ''}${result.stderr || ''}`;
  const parsed = extractJson(raw);
  if (parsed?.slides?.length) { parsed.planner = `${cli}-cli`; return parsed; }
  return null;
}

const plan = askCli() || fallbackPlan();
const curriculumDir = path.join(courseRoot, 'curriculum');
fs.mkdirSync(curriculumDir, { recursive: true });
fs.writeFileSync(path.join(curriculumDir, 'curriculum-plan.json'), JSON.stringify(plan, null, 2) + '\n', 'utf8');
const markdown = `# 教材規劃：${plan.title}\n\n- 規劃器：${plan.planner}\n- 對象：${plan.audience}\n- 時間：${plan.durationMinutes} 分鐘\n- 頁數：${plan.slideCount} 張\n\n## 學習成果\n\n${plan.learningOutcomes.map(x => `- ${x}`).join('\n')}\n\n## 設計原則\n\n${plan.designPrinciples.map(x => `- ${x}`).join('\n')}\n\n## 逐頁規劃\n\n| 頁次 | 標題 | 教學目的 | 學員任務 | 視覺方向 | 分鐘 |\n|---|---|---|---|---|---:|\n${plan.slides.map(s => `| ${s.page} | ${s.title} | ${s.purpose} | ${s.learnerTask} | ${s.visualDirection} | ${s.minutes} |`).join('\n')}\n\n## Agent 交接\n\n- 內容生成 Agent：${plan.handoff.contentAgent}\n- 視覺導演 Agent：${plan.handoff.visualDirector}\n- 品質檢查 Agent：${plan.handoff.reviewAgent}\n`;
fs.writeFileSync(path.join(curriculumDir, 'curriculum-plan.md'), markdown, 'utf8');
console.log(JSON.stringify({ ok: true, courseId, planner: plan.planner, files: [
  `library/courses/${courseId}/curriculum/curriculum-plan.json`,
  `library/courses/${courseId}/curriculum/curriculum-plan.md`
] }, null, 2));
