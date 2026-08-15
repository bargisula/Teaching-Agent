import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const command = args[0] || 'help';
const option = name => { const index = args.indexOf(`--${name}`); return index < 0 ? null : args[index + 1]; };
const fail = message => { console.error(`Teaching Agent error: ${message}`); process.exit(1); };
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); };
const hashFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pipeline = readJson(path.join(root, 'orchestrator', 'pipeline.json'));
const courseRoot = id => {
  if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) fail('invalid course id');
  return path.join(root, 'library', 'courses', id);
};
const stageById = id => pipeline.stages.find(stage => stage.id === id);
const resolveRun = (course, id) => {
  const runId = id || fs.readFileSync(path.join(courseRoot(course), 'runs', 'latest'), 'utf8').trim();
  return path.join(courseRoot(course), 'runs', runId);
};
const outputPath = (course, version, relative) => path.join(courseRoot(course), relative.replaceAll('{version}', version));
const prerequisites = { curriculum: 'requirements', content: null, visual: 'content', render: 'visual', assemble: 'visual', review: 'visual', 'media-script': 'mediaRequested', 'media-render': 'mediaScript' };
const checklist = {
  version: 2,
  maxSlidesIncludingCover: 12,
  requiredCoverCount: 1,
  requiredUserConfirmations: ['requirements', 'content', 'visual'],
  requirements: ['targetAudienceDefined', 'learningOutcomesDefined', 'scopeDefined', 'languageTraditionalChinese'],
  content: ['learningGoalAligned', 'oneCoreMessagePerSlide', 'noRepeatedContent', 'logicalSequence'],
  visual: ['traditionalChinese', 'consistentTitleStyle', 'visualSupportsMessage', 'noOverflowOrClipping'],
  deliverable: ['imagegenEvidenceExists', 'pngCountMatchesSlideCount', 'pptxOpens', 'eachSlideUsesCorrectFullBleedImage', 'reviewReportExists']
};
function writeState(run, state) { state.updatedAt = new Date().toISOString(); writeJson(path.join(run, 'state.json'), state); }
function dispatch(state, stage) {
  const dispatchData = {
    runId: state.runId,
    courseId: state.courseId,
    version: state.version,
    stage: stage.id,
    stageName: stage.name,
    agent: stage.agent,
    execution: stage.execution,
    specDoc: stage.specDoc || null,
    input: stage.input.replaceAll('{version}', state.version),
    expectedOutput: stage.output.replaceAll('{version}', state.version),
    confirmations: state.confirmations,
    acceptanceChecklist: `versions/${state.version}/acceptance/acceptance-checklist.json`,
    requiresUserConfirmation: Boolean(stage.requires_user_confirmation),
    confirmationKey: stage.confirmationKey || null,
    createdAt: new Date().toISOString()
  };
  writeJson(path.join(state.runPath, 'DISPATCH.json'), dispatchData);
}
function start() {
  const course = option('course');
  const coursePath = courseRoot(course);
  const manifest = readJson(path.join(coursePath, 'manifest.json'));
  const version = manifest.latestVersion || 'v0.1';
  const runId = `${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`;
  const runPath = path.join(coursePath, 'runs', runId);
  const state = {
    runId, runPath, courseId: course, version, status: 'running', currentStage: pipeline.stages[0].id,
    maxRetries: pipeline.maxRetries || 3,
    confirmations: { requirements: false, content: false, visual: false, mediaRequested: false, mediaScript: false, media: false },
    stages: Object.fromEntries(pipeline.stages.map((stage, index) => [stage.id, { status: index ? 'pending' : 'running', agent: stage.agent, output: stage.output.replaceAll('{version}', version), artifactSha256: null }]))
  };
  writeState(runPath, state);
  writeJson(outputPath(course, version, 'versions/{version}/acceptance/acceptance-checklist.json'), checklist);
  fs.mkdirSync(path.join(coursePath, 'runs'), { recursive: true });
  fs.writeFileSync(path.join(coursePath, 'runs', 'latest'), `${runId}\n`, 'utf8');
  dispatch(state, pipeline.stages[0]);
  console.log(JSON.stringify({ runId, stage: state.currentStage, acceptance: 'created' }, null, 2));
}
function status() {
  const run = resolveRun(option('course'), option('run'));
  console.log(JSON.stringify(readJson(path.join(run, 'state.json')), null, 2));
}
function confirm() {
  const course = option('course');
  const run = resolveRun(course, option('run'));
  const state = readJson(path.join(run, 'state.json'));
  const stage = stageById(option('stage') || state.currentStage);
  if (!stage?.confirmationKey) fail('stage has no confirmation gate');
  if (stage.id !== state.currentStage) fail('can only confirm the current stage');
  state.confirmations[stage.confirmationKey] = true;
  writeState(run, state);
  console.log(`confirmed ${stage.confirmationKey}`);
}
function chooseMedia() {
  const course = option('course');
  const run = resolveRun(course, option('run'));
  const state = readJson(path.join(run, 'state.json'));
  if (state.currentStage !== 'review' || state.stages.review.status !== 'completed') fail('media can only be selected after review is completed');
  const choice = option('choice');
  if (!['yes', 'no'].includes(choice)) fail('use --choice yes or --choice no');
  state.confirmations.mediaRequested = choice === 'yes';
  if (choice === 'no') {
    state.status = 'completed';
    state.currentStage = null;
    writeState(run, state);
    console.log(JSON.stringify({ ok: true, media: false, status: 'completed' }, null, 2));
    return;
  }
  state.currentStage = 'media-script';
  state.stages['media-script'].status = 'running';
  dispatch(state, stageById('media-script'));
  writeState(run, state);
  console.log(JSON.stringify({ ok: true, media: true, stage: 'media-script' }, null, 2));
}
function assertFreshArtifact(file, dispatchData) {
  const modified = fs.statSync(file).mtimeMs;
  const dispatched = Date.parse(dispatchData.createdAt);
  if (Number.isFinite(dispatched) && modified + 1000 < dispatched) fail(`agent output is stale and predates this dispatch: ${file}`);
}
function validateImagegenStatus(course, version, statusPath) {
  const statusData = readJson(statusPath);
  const versionRoot = outputPath(course, version, 'versions/{version}');
  const specPath = path.join(versionRoot, 'visual-design', 'visual-spec.json');
  const inspectionPath = path.join(versionRoot, 'visual-design', 'imagegen-inspection.json');
  if (!fs.existsSync(specPath) || !fs.existsSync(inspectionPath)) fail('imagegen requires visual-spec.json and imagegen-inspection.json');
  const spec = readJson(specPath);
  const pages = Array.isArray(spec.pages) ? spec.pages : [];
  const expectedFiles = pages.map(page => `visual-design/assets/slide-${String(page.page).padStart(2, '0')}.png`);
  const actualFiles = fs.existsSync(path.join(versionRoot, 'visual-design', 'assets'))
    ? fs.readdirSync(path.join(versionRoot, 'visual-design', 'assets')).filter(file => /^slide-\d+\.png$/i.test(file)).sort().map(file => `visual-design/assets/${file}`)
    : [];
  if (statusData.status !== 'completed') fail(`imagegen status is ${JSON.stringify(statusData.status)}, not completed`);
  if (!Number.isInteger(statusData.expected) || statusData.expected !== pages.length) fail('imagegen expected count does not match visual spec');
  if (!Number.isInteger(statusData.completed) || statusData.completed !== pages.length) fail('imagegen completed count does not match visual spec');
  if (!Array.isArray(statusData.files) || JSON.stringify(statusData.files) !== JSON.stringify(expectedFiles) || JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) fail('imagegen files do not exactly match visual spec');
  if (!Array.isArray(statusData.failedSlides) || statusData.failedSlides.length) fail('imagegen has failed slides or missing failedSlides evidence');
  if (statusData.generatedBy !== 'Codex built-in imagegen') fail('imagegen generatedBy evidence is invalid');
  if (statusData.specSha256 !== hashFile(specPath) || statusData.inspectionSha256 !== hashFile(inspectionPath)) fail('imagegen evidence is stale; spec or inspection changed after finalization');
}
function validateFinalReview(course, version, reportPath) {
  const reviewRoot = outputPath(course, version, 'versions/{version}/review');
  for (const file of ['imagegen-review.md', 'asset-review.md', 'pptx-review.md', 'content-review.md', 'visual-review.md', 'report.md']) {
    if (!fs.existsSync(path.join(reviewRoot, file))) fail(`final review missing ${file}`);
  }
  const report = fs.readFileSync(reportPath, 'utf8');
  if (!report.includes('acceptance-checklist.json') || !/[V!X]/.test(report)) fail('final report must reference the initial acceptance checklist and contain V/!/X results');
}
function execute() {
  const course = option('course');
  const run = resolveRun(course, option('run'));
  const state = readJson(path.join(run, 'state.json'));
  const dispatchData = readJson(path.join(run, 'DISPATCH.json'));
  const stage = stageById(state.currentStage);
  if (!stage) fail('invalid current stage');
  const required = prerequisites[stage.id];
  if (required && !state.confirmations[required]) fail(`confirmation required before ${stage.id}: ${required}`);
  const expected = outputPath(course, state.version, stage.output);
  if (stage.execution === 'agent') {
    if (!fs.existsSync(expected)) fail(`agent must author ${stage.output.replaceAll('{version}', state.version)} before execute; read ${stage.specDoc || 'agents/'} and ${stage.input.replaceAll('{version}', state.version)}`);
    assertFreshArtifact(expected, dispatchData);
    if (stage.id === 'render') validateImagegenStatus(course, state.version, expected);
    if (stage.id === 'review') validateFinalReview(course, state.version, expected);
  } else {
    const result = spawnSync(process.execPath, [path.join(root, 'orchestrator', 'run-agent.mjs'), '--course', course, '--run', state.runId], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) fail('stage executor failed');
    if (!fs.existsSync(expected)) fail(`missing output: ${expected}`);
  }
  state.stages[stage.id].status = 'completed';
  state.stages[stage.id].artifactSha256 = hashFile(expected);
  if (stage.next) {
    state.currentStage = stage.next;
    state.stages[stage.next].status = 'running';
    dispatch(state, stageById(stage.next));
  } else if (stage.id === 'media-render') {
    state.status = 'completed';
    state.currentStage = null;
    state.confirmations.media = true;
  } else if (stage.id !== 'review') {
    state.status = 'completed';
    state.currentStage = null;
  }
  writeState(run, state);
}

if (command === 'start') start();
else if (command === 'status') status();
else if (command === 'confirm') confirm();
else if (command === 'choose-media') chooseMedia();
else if (command === 'execute') execute();
else console.log('start | status | confirm | choose-media | execute');
