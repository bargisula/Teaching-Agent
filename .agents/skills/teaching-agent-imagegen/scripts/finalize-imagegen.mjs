import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(`--${name}`); return index < 0 ? null : args[index + 1]; };
const course = option('course');
const version = option('version');
if (!course || !version || !/^[a-z0-9][a-z0-9-]*$/.test(course) || !/^v\d+(?:\.\d+)*$/.test(version)) {
  console.error('Usage: node finalize-imagegen.mjs --course <course-id> --version <version>');
  process.exit(1);
}

const versionRoot = path.join(root, 'library', 'courses', course, 'versions', version);
const specPath = path.join(versionRoot, 'visual-design', 'visual-spec.json');
const inspectionPath = path.join(versionRoot, 'visual-design', 'imagegen-inspection.json');
const assetsDir = path.join(versionRoot, 'visual-design', 'assets');
const statusPath = path.join(versionRoot, 'imagegen-status.json');
const reviewPath = path.join(versionRoot, 'review', 'imagegen-review.md');
const profilesDir = path.join(root, '.agents', 'skills', 'teaching-agent-imagegen', 'references', 'style-profiles');
const failures = [];
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pngSize = file => { const data = fs.readFileSync(file); if (data.length < 24 || data.toString('ascii', 1, 4) !== 'PNG') return null; return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }; };
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); };
const profileId = value => value ?? 'clean-infographic';

let spec = null;
let inspection = null;
try { spec = readJson(specPath); } catch { failures.push(`visual spec missing or invalid: ${specPath}`); }
try { inspection = readJson(inspectionPath); } catch { failures.push(`image inspection missing or invalid: ${inspectionPath}`); }
const pages = Array.isArray(spec?.pages) ? spec.pages : [];
const styleProfile = profileId(spec?.styleProfile);
let profile = null;
if (!/^[a-z0-9][a-z0-9-]*$/.test(styleProfile)) failures.push('styleProfile must use lowercase hyphen-case');
else {
  try { profile = readJson(path.join(profilesDir, `${styleProfile}.json`)); }
  catch { failures.push(`unknown styleProfile: ${styleProfile}`); }
  if (profile && (profile.id !== styleProfile || !Array.isArray(profile.promptRules) || !Array.isArray(profile.avoid))) {
    failures.push(`invalid style profile: ${styleProfile}`);
  }
}
if (!pages.length || pages.length > 12) failures.push(`page count must be 1-12; actual ${pages.length}`);
if (pages.some((page, index) => page.page !== index)) failures.push('page numbers must be contiguous and start at 0');
const covers = pages.filter(page => page.role === 'cover');
if (covers.length !== 1 || covers[0]?.page !== 0) failures.push('visual spec must contain exactly one cover at page 0');
if (spec?.language !== 'zh-Hant' && pages.some(page => page.language !== 'zh-Hant')) failures.push('visual spec language must be zh-Hant');
for (const page of pages) {
  if (!page.title || !page.coreMessage || !page.imagePrompt || !page.titleStyleId) failures.push(`page ${page.page} lacks required visual fields`);
  if (!Array.isArray(page.textMustAppear) || !Array.isArray(page.textMustNotAppear)) failures.push(`page ${page.page} lacks text constraints`);
}

const expectedFiles = pages.map(page => `slide-${String(page.page).padStart(2, '0')}.png`);
const actualFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter(file => /^slide-\d+\.png$/i.test(file)).sort() : [];
if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) failures.push(`PNG set mismatch; expected ${expectedFiles.join(', ')}, actual ${actualFiles.join(', ')}`);
for (const file of expectedFiles) {
  const fullPath = path.join(assetsDir, file);
  if (!fs.existsSync(fullPath)) continue;
  const size = pngSize(fullPath);
  if (!size) failures.push(`${file} is not a readable PNG`);
  else if (Math.abs(size.width / size.height - 16 / 9) > 0.02) failures.push(`${file} is not 16:9 (${size.width}x${size.height})`);
}

const inspectionPages = Array.isArray(inspection?.pages) ? inspection.pages : [];
const checks = ['textAccurate', 'traditionalChinese', 'titleConsistent', 'compositionSupportsMessage', 'noOverflow'];
if (inspectionPages.length !== pages.length) failures.push(`inspection count mismatch; expected ${pages.length}, actual ${inspectionPages.length}`);
for (const page of pages) {
  const evidence = inspectionPages.find(item => item.page === page.page);
  if (!evidence) { failures.push(`missing inspection for page ${page.page}`); continue; }
  const expectedFile = `visual-design/assets/slide-${String(page.page).padStart(2, '0')}.png`;
  if (evidence.file !== expectedFile) failures.push(`page ${page.page} inspection file mismatch`);
  for (const check of checks) if (evidence[check] !== true) failures.push(`page ${page.page} failed ${check}`);
}

const status = {
  status: failures.length ? 'failed' : 'completed',
  expected: pages.length,
  completed: failures.length ? actualFiles.length : pages.length,
  files: actualFiles.map(file => `visual-design/assets/${file}`),
  failedSlides: [...new Set(failures.flatMap(message => { const match = message.match(/page (\d+)|slide-(\d+)/i); return match ? [Number(match[1] ?? match[2])] : []; }))],
  reason: failures.length ? failures.join('; ') : null,
  generatedBy: 'Codex built-in imagegen',
  styleProfile,
  specSha256: fs.existsSync(specPath) ? hash(specPath) : null,
  inspectionSha256: fs.existsSync(inspectionPath) ? hash(inspectionPath) : null,
  updatedAt: new Date().toISOString()
};
writeJson(statusPath, status);
fs.mkdirSync(path.dirname(reviewPath), { recursive: true });
const report = `# Imagegen Review\n\n| 檢查項目 | 結果 |\n|---|---|\n| 頁數 1–12 | ${pages.length > 0 && pages.length <= 12 ? 'V' : 'X'} |\n| 恰好一張封面且位於第 0 頁 | ${covers.length === 1 && covers[0]?.page === 0 ? 'V' : 'X'} |\n| PNG 檔名與頁數完全一致 | ${JSON.stringify(actualFiles) === JSON.stringify(expectedFiles) ? 'V' : 'X'} |\n| 所有 PNG 可讀且為 16:9 | ${failures.some(item => /PNG|16:9/.test(item)) ? 'X' : 'V'} |\n| 逐頁視覺檢查完整通過 | ${failures.some(item => /inspection|failed/.test(item)) ? 'X' : 'V'} |\n\n## 證據\n\n- visual spec SHA-256: ${status.specSha256 ?? 'missing'}\n- inspection SHA-256: ${status.inspectionSha256 ?? 'missing'}\n- generatedBy: ${status.generatedBy}\n- files: ${status.files.join(', ') || 'none'}\n\n## 總結果\n\n${failures.length ? `X FAIL\n\n${failures.map(item => `- ${item}`).join('\n')}` : 'V PASS'}\n`;
fs.writeFileSync(reviewPath, report, 'utf8');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(JSON.stringify(status, null, 2));