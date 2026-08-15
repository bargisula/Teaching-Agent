import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? null : args[index + 1];
};
const mediaDir = option('media');
const action = option('action');

if (!mediaDir || !['approve', 'reject'].includes(action)) {
  console.error('Usage: node scripts/confirm-media-script.mjs --media <media-folder> --action <approve|reject>');
  process.exit(2);
}

const fail = message => { console.error(`[media-script] FAIL: ${message}`); process.exit(1); };
const root = path.resolve(mediaDir);
const dialoguePath = path.join(root, 'dialogue.json');
const scriptPath = path.join(root, 'narration-script.md');
if (!fs.existsSync(dialoguePath)) fail(`missing dialogue.json: ${dialoguePath}`);
if (!fs.existsSync(scriptPath)) fail(`missing narration-script.md: ${scriptPath}`);

let dialogue;
try { dialogue = JSON.parse(fs.readFileSync(dialoguePath, 'utf8').replace(/^\uFEFF/, '')); }
catch (error) { fail(`invalid dialogue.json: ${error.message}`); }

if (dialogue.status !== 'draft') fail(`dialogue status must be draft, got ${dialogue.status}`);
if (!Array.isArray(dialogue.slides) || dialogue.slides.length === 0) fail('dialogue.slides must contain at least one slide');

const errors = [];
const slideNumbers = new Set();
for (const slide of dialogue.slides) {
  if (!Number.isInteger(slide.slide)) errors.push('every slide must have an integer slide number');
  if (slideNumbers.has(slide.slide)) errors.push(`duplicate slide number: ${slide.slide}`);
  slideNumbers.add(slide.slide);
  if (!slide.title?.trim()) errors.push(`slide ${slide.slide} has no title`);
  if (!Array.isArray(slide.lines) || slide.lines.length === 0) errors.push(`slide ${slide.slide} has no dialogue lines`);
  for (const [index, line] of (slide.lines || []).entries()) {
    if (!line.speaker?.trim()) errors.push(`slide ${slide.slide} line ${index + 1} has no speaker`);
    if (!line.voice?.trim()) errors.push(`slide ${slide.slide} line ${index + 1} has no voice`);
    if (!line.text?.trim()) errors.push(`slide ${slide.slide} line ${index + 1} has no text`);
  }
}
if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const scriptSha256 = crypto.createHash('sha256').update(fs.readFileSync(scriptPath)).digest('hex');
const dialogueSha256 = crypto.createHash('sha256').update(fs.readFileSync(dialoguePath)).digest('hex');
const status = action === 'approve' ? 'approved' : 'rejected';
const statusData = {
  status,
  action,
  scriptSha256,
  dialogueSha256,
  slideCount: dialogue.slides.length,
  confirmedAt: new Date().toISOString()
};

if (action === 'approve') {
  dialogue.status = 'approved';
  dialogue.approvedAt = statusData.confirmedAt;
  fs.writeFileSync(dialoguePath, `${JSON.stringify(dialogue, null, 2)}\n`, 'utf8');
}
fs.writeFileSync(path.join(root, 'media-script-status.json'), `${JSON.stringify(statusData, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, ...statusData }, null, 2));
