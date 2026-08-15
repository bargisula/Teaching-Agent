import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2); const i = args.indexOf("--job");
if (i < 0 || !args[i + 1]) fail("Usage: finalize-images.mjs --job <folder>");
const job = path.resolve(args[i + 1]);
function fail(message) { console.error(`ERROR: ${message}`); process.exit(1); }
const readJson = (file) => { if (!fs.existsSync(file)) fail(`Missing ${file}`); try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { fail(`Invalid JSON ${file}: ${error.message}`); } };
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const writeJson = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8"); };
function pngSize(file) { const b = fs.readFileSync(file); if (b.length < 24 || b.toString("hex", 0, 8) !== "89504e470d0a1a0a") fail(`Unreadable PNG: ${file}`); return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }; }

const statePath = path.join(job, "state.json"); const state = readJson(statePath);
if (state.stage !== "render" || state.renderPreflight?.status !== "passed") fail("A successful render preflight is required");
const specPath = path.join(job, "visual-spec.json"); if (sha(specPath) !== state.renderPreflight.visualSpecSha256) fail("visual-spec changed after render preflight");
const spec = readJson(specPath); const provenance = readJson(path.join(job, "visual-design", "imagegen-provenance.json")); const inspection = readJson(path.join(job, "review", "imagegen-inspection.json"));
if (provenance.generatedBy !== "codex-built-in-imagegen") fail("generatedBy must be codex-built-in-imagegen");
if (!Array.isArray(provenance.slides) || provenance.slides.length !== spec.pages.length) fail("Provenance count mismatch");
if (!Array.isArray(inspection.slides) || inspection.slides.length !== spec.pages.length) fail("Inspection count mismatch");
const checks = ["textAccurate", "traditionalChinese", "sourceFaithful", "styleConsistent", "compositionSupportsMessage", "noOverflow"]; const completedSlides = [];
for (const page of spec.pages) {
  const n = String(page.page).padStart(2, "0"); const asset = path.join(job, "visual-design", "assets", `slide-${n}.png`);
  if (!fs.existsSync(asset)) fail(`Missing slide asset ${asset}`); const size = pngSize(asset);
  if (Math.abs(size.width / size.height - 16 / 9) > 0.03) fail(`Slide ${page.page} is not approximately 16:9`);
  const p = provenance.slides.find((x) => x.page === page.page);
  if (!p || !p.prompt || !p.sourcePath || !p.sourceSha256 || !p.assetSha256) fail(`Incomplete provenance for slide ${page.page}`);
  if (p.retries < 0 || p.retries > 2) fail(`Invalid retry count for slide ${page.page}`);
  if (!fs.existsSync(path.resolve(p.sourcePath))) fail(`Generated source is missing for slide ${page.page}`);
  if (sha(path.resolve(p.sourcePath)) !== p.sourceSha256.toLowerCase()) fail(`Source hash mismatch for slide ${page.page}`);
  if (sha(asset) !== p.assetSha256.toLowerCase()) fail(`Asset hash mismatch for slide ${page.page}`);
  if (p.sourceSha256.toLowerCase() !== p.assetSha256.toLowerCase()) fail(`Source and copied asset differ for slide ${page.page}`);
  const review = inspection.slides.find((x) => x.page === page.page); if (!review) fail(`Missing inspection for slide ${page.page}`);
  for (const check of checks) if (review[check] !== true) fail(`Slide ${page.page} failed ${check}`);
  completedSlides.push({ page: page.page, asset: path.relative(job, asset).replaceAll("\\", "/"), sha256: sha(asset), width: size.width, height: size.height, retries: p.retries });
}
const expected = new Set(spec.pages.map((p) => `slide-${String(p.page).padStart(2, "0")}.png`)); const actual = fs.readdirSync(path.join(job, "visual-design", "assets")).filter((f) => f.toLowerCase().endsWith(".png"));
if (actual.some((f) => !expected.has(f)) || actual.length !== expected.size) fail("Asset folder contains missing or unexpected PNG files");
const status = { status: "completed", generatedBy: "codex-built-in-imagegen", completedAt: new Date().toISOString(), slideCount: completedSlides.length, failedSlides: [], textSha256: state.confirmations.text.sha256, styleSha256: state.confirmations.style.sha256, visualSpecSha256: sha(specPath), slides: completedSlides };
const statusPath = path.join(job, "visual-design", "imagegen-status.json"); writeJson(statusPath, status);
const lines = ["# Imagegen Review", "", `- V Built-in imagegen evidence: ${completedSlides.length}/${completedSlides.length}`, "- V Source-to-asset SHA-256: all matched", "- V Traditional Chinese and approved text: all inspected", "- V Style and source fidelity: all inspected", "- V 16:9 PNG assets: all passed", "- V Blocking failures: none", "", "Status: PASS", ""];
fs.mkdirSync(path.join(job, "review"), { recursive: true }); fs.writeFileSync(path.join(job, "review", "imagegen-review.md"), lines.join("\n"), "utf8");
state.stage = "assemble"; state.imagegenStatus = { status: "completed", sha256: sha(statusPath) }; state.updatedAt = new Date().toISOString(); writeJson(statePath, state);
console.log(`IMAGEGEN_FINALIZED ${completedSlides.length}/${completedSlides.length}`);
