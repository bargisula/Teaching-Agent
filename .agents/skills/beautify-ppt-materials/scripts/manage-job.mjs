import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const command = args[0];
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const jobArg = value("--job");
if (!command || !jobArg) fail("Usage: manage-job.mjs <init|confirm-text|confirm-style|preflight-render|status> --job <folder>");
const job = path.resolve(jobArg);
const statePath = path.join(job, "state.json");
const textPath = path.join(job, "content", "slide-text.json");
const stylePath = path.join(job, "style", "style-system.json");
const specPath = path.join(job, "visual-spec.json");

function fail(message) { console.error(`ERROR: ${message}`); process.exit(1); }
function readJson(file) { if (!fs.existsSync(file)) fail(`Missing ${file}`); try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { fail(`Invalid JSON ${file}: ${error.message}`); } }
function writeJson(file, data) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8"); }
function hashFile(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function validateSlides(doc) {
  if (doc.language !== "zh-Hant") fail("slide-text language must be zh-Hant");
  if (!Array.isArray(doc.slides) || doc.slides.length < 1 || doc.slides.length > 12) fail("slide-text must contain 1-12 slides");
  doc.slides.forEach((slide, index) => {
    if (slide.page !== index) fail(`Slide pages must be contiguous from 0; expected ${index}`);
    if (typeof slide.title !== "string" || !slide.title.trim()) fail(`Slide ${index} needs title`);
    if (!Array.isArray(slide.textMustAppear) || !slide.textMustAppear.length || slide.textMustAppear.some((x) => typeof x !== "string" || !x.trim())) fail(`Slide ${index} needs textMustAppear`);
    if (!Array.isArray(slide.sourceRefs) || !slide.sourceRefs.length) fail(`Slide ${index} needs sourceRefs`);
  });
  const covers = doc.slides.filter((slide) => slide.type === "cover");
  if (covers.length !== 1 || doc.slides[0].type !== "cover") fail("Exactly one cover is required at page 0");
  return doc.slides;
}
function validateStyle(doc) {
  if (doc.language !== "zh-Hant") fail("style language must be zh-Hant");
  for (const key of ["styleName", "designIntent", "imageLanguage", "titleSystem"]) if (typeof doc[key] !== "string" || !doc[key].trim()) fail(`Style needs ${key}`);
  if (!doc.palette || typeof doc.palette !== "object") fail("Style needs palette");
  if (!doc.typography || typeof doc.typography !== "object") fail("Style needs typography");
  if (!Array.isArray(doc.layoutRules) || !doc.layoutRules.length) fail("Style needs layoutRules");
  if (!Array.isArray(doc.avoid) || !doc.avoid.length) fail("Style needs avoid list");
}

if (command === "init") {
  if (fs.existsSync(statePath)) fail(`Job already exists: ${job}`);
  for (const dir of ["source", "content", "style", "visual-design/assets", "deck", "review"]) fs.mkdirSync(path.join(job, dir), { recursive: true });
  writeJson(statePath, { schemaVersion: 1, jobId: path.basename(job), stage: "draft-text", confirmations: { text: { status: "pending" }, style: { status: "pending" } }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  console.log(`INITIALIZED ${job}`); process.exit(0);
}
const current = readJson(statePath);
if (command === "status") { console.log(JSON.stringify(current, null, 2)); process.exit(0); }
if (command === "confirm-text") {
  validateSlides(readJson(textPath));
  current.confirmations.text = { status: "confirmed", sha256: hashFile(textPath), confirmedAt: new Date().toISOString() };
  current.confirmations.style = { status: "pending" }; current.stage = "draft-style"; current.updatedAt = new Date().toISOString();
  writeJson(statePath, current); console.log(`TEXT_CONFIRMED ${current.confirmations.text.sha256}`); process.exit(0);
}
if (current.confirmations?.text?.status !== "confirmed") fail("Text confirmation is required first");
if (hashFile(textPath) !== current.confirmations.text.sha256) fail("slide-text.json changed after confirmation; reconfirm text");
if (command === "confirm-style") {
  validateStyle(readJson(stylePath));
  current.confirmations.style = { status: "confirmed", sha256: hashFile(stylePath), confirmedAt: new Date().toISOString() };
  current.stage = "ready-for-render-preflight"; current.updatedAt = new Date().toISOString(); writeJson(statePath, current);
  console.log(`STYLE_CONFIRMED ${current.confirmations.style.sha256}`); process.exit(0);
}
if (command === "preflight-render") {
  if (current.confirmations?.style?.status !== "confirmed") fail("Style confirmation is required before rendering");
  if (hashFile(stylePath) !== current.confirmations.style.sha256) fail("style-system.json changed after confirmation; reconfirm style");
  const slides = validateSlides(readJson(textPath)); validateStyle(readJson(stylePath)); const spec = readJson(specPath);
  if (spec.language !== "zh-Hant" || spec.aspectRatio !== "16:9") fail("visual-spec must use zh-Hant and 16:9");
  if (!Array.isArray(spec.pages) || spec.pages.length !== slides.length) fail("visual-spec page count must match approved text");
  spec.pages.forEach((page, index) => {
    if (page.page !== index) fail(`visual-spec page ${index} is missing or out of order`);
    if (page.type !== slides[index].type) fail(`Page ${index} type differs from approved text`);
    if (JSON.stringify(page.textMustAppear) !== JSON.stringify(slides[index].textMustAppear)) fail(`Page ${index} text differs from approved text`);
    if (typeof page.imagePrompt !== "string" || !page.imagePrompt.trim()) fail(`Page ${index} needs imagePrompt`);
  });
  const proof = { status: "passed", checkedAt: new Date().toISOString(), slideCount: slides.length, textSha256: current.confirmations.text.sha256, styleSha256: current.confirmations.style.sha256, visualSpecSha256: hashFile(specPath) };
  writeJson(path.join(job, "visual-design", "render-preflight.json"), proof); current.stage = "render"; current.renderPreflight = proof; current.updatedAt = new Date().toISOString(); writeJson(statePath, current);
  console.log(`RENDER_PREFLIGHT_PASSED ${slides.length}`); process.exit(0);
}
fail(`Unknown command: ${command}`);
