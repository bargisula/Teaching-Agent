import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const courseId = opt('course');
if (!courseId) throw new Error('用法：node scripts/render-from-visual.mjs --course <course-id>');
const courseRoot = path.join(root, 'library', 'courses', courseId);
const manifest = JSON.parse(fs.readFileSync(path.join(courseRoot, 'manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
const version = manifest.latestVersion || 'v0.1';
const versionRoot = path.join(courseRoot, 'versions', version);
const specPath = path.join(versionRoot, 'visual-design', 'visual-spec.json');
const contentPath = path.join(versionRoot, 'content', 'slides.json');
if (!fs.existsSync(specPath) || !fs.existsSync(contentPath)) throw new Error('缺少視覺規格或逐頁內容，停止交棒');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
if (!Array.isArray(spec.pages) || spec.pages.length !== content.slides.length) throw new Error('視覺規格與內容頁數不一致，停止交棒');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync);
if (!chrome) throw new Error('找不到 Chrome 或 Edge，無法渲染');

const renderDir = path.join(versionRoot, 'render');
fs.mkdirSync(renderDir, { recursive: true });
const colors = ['#e8efe8', '#dcebea', '#f5eadf', '#e7e0ef'];
for (let i = 0; i < spec.pages.length; i++) {
  const page = spec.pages[i]; const text = content.slides[i]; const bg = colors[i % colors.length];
  const imageSide = i % 2 ? 'right' : 'left';
  const html = `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:${bg};font-family:Arial,'Microsoft JhengHei',sans-serif;color:#20332d}.page{width:1600px;height:900px;position:relative;overflow:hidden;padding:76px}.eyebrow{font-size:22px;letter-spacing:5px;color:#c45d39;font-weight:bold}.title{font-size:58px;line-height:1.12;font-weight:bold;width:670px;margin-top:72px}.message{font-size:28px;line-height:1.45;width:610px;margin-top:34px;color:#52655f}.card{position:absolute;${imageSide}:88px;top:170px;width:620px;height:520px;border:3px solid #20332d;background:#f8faf4;padding:44px;box-shadow:18px 18px rgba(32,51,45,.15)}.circle{width:190px;height:190px;border-radius:50%;background:#b9d7ca;margin:12px auto 38px}.caption{font-size:30px;line-height:1.35;text-align:center;font-weight:bold}.task{position:absolute;bottom:74px;left:76px;font-size:22px;color:#52655f;border-top:2px solid #20332d;padding-top:18px;width:680px}.num{position:absolute;right:82px;bottom:52px;font-size:82px;color:#c45d3944;font-weight:bold}</style><main class="page"><div class="eyebrow">AI WORKSPACE / ${String(page.page).padStart(2,'0')}</div><div class="title">${text.title}</div><div class="message">${text.message}</div><section class="card"><div class="circle"></div><div class="caption">${page.layout.replaceAll('-', ' · ')}<br><small>${page.imageRequirement}</small></div></section><div class="task">學員任務｜${text.bullets?.[0] || text.expectedResult || '完成本頁練習並檢查結果'}</div><div class="num">${String(page.page).padStart(2,'0')}</div></main>`;
  const htmlPath = path.join(renderDir, `page-${String(page.page).padStart(2, '0')}.html`);
  const pngPath = path.join(renderDir, `page-${String(page.page).padStart(2, '0')}.png`);
  fs.writeFileSync(htmlPath, html, 'utf8');
  const result = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--user-data-dir=' + path.join(renderDir, 'chrome-' + page.page), '--window-size=1600,900', '--screenshot=' + pngPath, 'file:///' + htmlPath.replaceAll('\\', '/')], { encoding: 'utf8', timeout: 45000, windowsHide: true });
  if (result.status !== 0 || !fs.existsSync(pngPath) || fs.statSync(pngPath).size < 5000) {
    spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'orchestrator', 'render-fallback.ps1'), '-Output', pngPath, '-Label', String(page.page).padStart(2, '0'), '-Caption', page.imageRequirement], { encoding: 'utf8', timeout: 30000, windowsHide: true });
  }
  if (!fs.existsSync(pngPath) || fs.statSync(pngPath).size < 5000) spawnSync(process.execPath, [path.join(root, 'scripts', 'raster-fallback.mjs'), '--output', pngPath, '--page', String(page.page)], { encoding: 'utf8', timeout: 30000, windowsHide: true });
  if (!fs.existsSync(pngPath) || fs.statSync(pngPath).size < 5000) throw new Error(`第 ${page.page} 頁渲染失敗`);
}
const pngs = fs.readdirSync(renderDir).filter(x => /^page-\d+\.png$/.test(x)).sort();
if (pngs.length !== spec.pages.length) throw new Error(`渲染頁數錯誤：預期 ${spec.pages.length}，實際 ${pngs.length}`);
const handoffDir = path.join(courseRoot, 'handoff'); fs.mkdirSync(handoffDir, { recursive: true });
fs.writeFileSync(path.join(handoffDir, 'render-status.json'), JSON.stringify({ status: 'completed', from: 'visual-director', to: 'ppt-assembler', source: `library/courses/${courseId}/versions/${version}/visual-design/visual-spec.json`, output: `library/courses/${courseId}/versions/${version}/render`, pageCount: pngs.length, updatedAt: new Date().toISOString() }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, courseId, version, status: 'completed', nextAgent: 'ppt-assembler', pageCount: pngs.length, output: `library/courses/${courseId}/versions/${version}/render` }, null, 2));
