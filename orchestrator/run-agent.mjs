import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import pptxgen from 'pptxgenjs';

const root = process.cwd();
const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(`--${name}`); return index < 0 ? null : args[index + 1]; };
const course = option('course');
const runId = option('run');
if (!course || !runId) process.exit(1);
const courseRoot = path.join(root, 'library', 'courses', course);
const runRoot = path.join(courseRoot, 'runs', runId);
const dispatch = JSON.parse(fs.readFileSync(path.join(runRoot, 'DISPATCH.json'), 'utf8'));
const versionRoot = path.join(courseRoot, 'versions', dispatch.version);
const output = path.join(courseRoot, dispatch.expectedOutput);
fs.mkdirSync(path.dirname(output), { recursive: true });
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const pngSize = file => { const data = fs.readFileSync(file); if (data.length < 24 || data.toString('ascii', 1, 4) !== 'PNG') return null; return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }; };

const runNode = (scriptRelative, extraArgs, label) => {
  const result = spawnSync(process.execPath, [path.join(root, scriptRelative), ...extraArgs], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) { console.error(`run-agent: ${label} failed`); process.exit(1); }
};

if (dispatch.stage === 'media-script') {
  const mediaDir = path.join(versionRoot, 'media');
  const mediaConfigPath = path.join(mediaDir, 'media-config.json');
  if (!fs.existsSync(mediaConfigPath)) {
    console.error(`run-agent: missing ${mediaConfigPath}; copy a voice profile from orchestrator/media-config.*.json to that path first (choose edge-female / openai-female / mock)`);
    process.exit(1);
  }
  runNode('scripts/generate-media-script.mjs', ['--input', path.join(courseRoot, dispatch.input), '--config', mediaConfigPath, '--output', mediaDir], 'generate-media-script');
  process.exit(0);
}

if (dispatch.stage === 'media-render') {
  const mediaDir = path.join(versionRoot, 'media');
  const mediaConfigPath = path.join(mediaDir, 'media-config.json');
  if (!fs.existsSync(mediaConfigPath)) { console.error(`run-agent: missing ${mediaConfigPath}`); process.exit(1); }
  const mediaConfig = readJson(mediaConfigPath);
  runNode('scripts/confirm-media-script.mjs', ['--media', mediaDir, '--action', 'approve'], 'confirm-media-script');
  const voiceEntries = Object.values(mediaConfig.voices || {});
  if (!voiceEntries.length) { console.error('run-agent: media-config.json defines no voices'); process.exit(1); }
  const provider = voiceEntries[0].provider;
  if (voiceEntries.some(voice => voice.provider !== provider)) { console.error('run-agent: mixed-provider voices are not supported by the automated media-render stage; run the TTS scripts manually'); process.exit(1); }
  if (provider === 'edge-tts') runNode('scripts/generate-edge-tts-audio.mjs', ['--media', mediaDir, '--voice', voiceEntries[0].voiceId], 'generate-edge-tts-audio');
  else if (provider === 'openai') runNode('scripts/generate-openai-tts-audio.mjs', ['--media', mediaDir, '--voice', voiceEntries[0].voiceId], 'generate-openai-tts-audio');
  else if (provider === 'mock') runNode('scripts/generate-tts-audio.mjs', ['--media', mediaDir], 'generate-tts-audio');
  else { console.error(`run-agent: unsupported TTS provider ${provider}`); process.exit(1); }
  runNode('scripts/merge-slide-audio.mjs', ['--media', mediaDir], 'merge-slide-audio');
  runNode('scripts/build-subtitles.mjs', ['--media', mediaDir], 'build-subtitles');
  runNode('scripts/assemble-media-video.mjs', ['--media', mediaDir, '--images', path.join(versionRoot, 'visual-design', 'assets')], 'assemble-media-video');
  runNode('scripts/review-media-output.mjs', ['--media', mediaDir], 'review-media-output');
  process.exit(0);
}

if (dispatch.stage !== 'assemble') {
  console.error(`run-agent.mjs does not know stage ${dispatch.stage}`);
  process.exit(1);
}

const specPath = path.join(versionRoot, 'visual-design', 'visual-spec.json');
const statusPath = path.join(versionRoot, 'imagegen-status.json');
const inspectionPath = path.join(versionRoot, 'visual-design', 'imagegen-inspection.json');
const assetsRoot = path.join(versionRoot, 'visual-design', 'assets');
const reviewRoot = path.join(versionRoot, 'review');
fs.mkdirSync(reviewRoot, { recursive: true });
const failures = [];
let spec = null;
let status = null;
let inspection = null;
try { spec = readJson(specPath); } catch { failures.push('visual-spec.json 缺少或無效'); }
try { status = readJson(statusPath); } catch { failures.push('imagegen-status.json 缺少或無效'); }
try { inspection = readJson(inspectionPath); } catch { failures.push('imagegen-inspection.json 缺少或無效'); }
const pages = Array.isArray(spec?.pages) ? spec.pages : [];
const expectedFiles = pages.map(page => `slide-${String(page.page).padStart(2, '0')}.png`);
const files = fs.existsSync(assetsRoot) ? fs.readdirSync(assetsRoot).filter(file => /^slide-\d+\.png$/i.test(file)).sort() : [];
const covers = pages.filter(page => page.role === 'cover');
if (status?.status !== 'completed') failures.push('imagegen 狀態不是 completed');
if (status?.expected !== pages.length || status?.completed !== pages.length) failures.push('imagegen status 張數與 visual spec 不一致');
if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) failures.push('實際 PNG 集合與 visual spec 不一致');
if (JSON.stringify(status?.files) !== JSON.stringify(expectedFiles.map(file => `visual-design/assets/${file}`))) failures.push('imagegen status 檔案清單不一致');
if (!pages.length || pages.length > 12) failures.push('張數必須為 1–12 張');
if (covers.length !== 1 || covers[0]?.page !== 0 || !files.includes('slide-00.png')) failures.push('必須恰好一張第 0 頁封面');
if (!Array.isArray(inspection?.pages) || inspection.pages.length !== pages.length) failures.push('逐頁視覺檢查證據不完整');
for (const file of files) {
  const size = pngSize(path.join(assetsRoot, file));
  if (!size || Math.abs(size.width / size.height - 16 / 9) > 0.02) failures.push(`${file} 無法讀取或不是 16:9`);
}
const assetRows = [
  ['imagegen 完成證據', status?.status === 'completed'],
  ['PNG 與 visual spec 完全對齊', JSON.stringify(files) === JSON.stringify(expectedFiles)],
  ['恰好一張封面', covers.length === 1 && covers[0]?.page === 0 && files.includes('slide-00.png')],
  ['總張數不超過 12', pages.length > 0 && pages.length <= 12],
  ['逐頁視覺檢查證據完整', Array.isArray(inspection?.pages) && inspection.pages.length === pages.length],
  ['所有圖片可讀且為 16:9', !failures.some(item => /16:9|無法讀取/.test(item))]
];
const assetReport = `# Asset Review\n\n| 檢查項目 | 結果 |\n|---|---|\n${assetRows.map(([label, ok]) => `| ${label} | ${ok ? 'V' : 'X'} |`).join('\n')}\n\n## 總結果\n\n${failures.length ? `X FAIL\n\n${failures.map(item => `- ${item}`).join('\n')}` : 'V PASS'}\n`;
fs.writeFileSync(path.join(reviewRoot, 'asset-review.md'), assetReport, 'utf8');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = course;
for (const file of files) {
  const slide = pptx.addSlide();
  slide.addImage({ path: path.join(assetsRoot, file), x: 0, y: 0, w: 13.333, h: 7.5 });
}
await pptx.writeFile({ fileName: output });
const bytes = fs.readFileSync(output);
const opensAsZip = bytes.length > 10000 && bytes.subarray(0, 2).toString('ascii') === 'PK';
const pptxReport = `# PPTX Review\n\n| 檢查項目 | 證據 | 結果 |\n|---|---|---|\n| PPTX 可讀 | ${output} | ${opensAsZip ? 'V' : 'X'} |\n| 投影片張數 | ${files.length} | ${files.length === pages.length ? 'V' : 'X'} |\n| 每頁使用一張全版 PNG | x=0, y=0, w=13.333, h=7.5 | V |\n| 無第二層文字 | 組裝器只呼叫 addImage | V |\n\n## 總結果\n\n${opensAsZip && files.length === pages.length ? 'V PASS' : 'X FAIL'}\n`;
fs.writeFileSync(path.join(reviewRoot, 'pptx-review.md'), pptxReport, 'utf8');
if (!opensAsZip) { console.error('generated PPTX is invalid'); process.exit(1); }
console.log(JSON.stringify({ status: 'assembled', output, slides: files.length }, null, 2));