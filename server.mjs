import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
function courseRoot(id) { return path.join(root, 'library', 'courses', id); }
function validCourseId(id) { return /^[a-z0-9][a-z0-9-]*$/.test(id); }
function readCatalog() { const file = path.join(root, 'library', '_index', 'catalog.json'); const text = fs.readFileSync(file, 'utf8').replace(String.fromCharCode(0xFEFF), ''); return { file, data: JSON.parse(text) }; }
function deleteCourse(id) {
  if (!validCourseId(id)) throw new Error('教材 ID 格式不正確');
  const folder = courseRoot(id);
  if (!fs.existsSync(path.join(folder, 'manifest.json'))) throw new Error('找不到指定教材');
  const { file, data } = readCatalog();
  data.courses = (data.courses || []).filter(course => course.id !== id);
  data.updatedAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.rmSync(folder, { recursive: true, force: true });
}
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(value)); }
function latestRun(id) { const base = path.join(courseRoot(id), 'runs'); const latest = path.join(base, 'latest'); if (!fs.existsSync(latest)) return null; const runId = fs.readFileSync(latest, 'utf8').trim(); if (!runId) return null; const runRoot = path.join(base, runId); const statePath = path.join(runRoot, 'state.json'); if (!fs.existsSync(statePath)) return null; const state = JSON.parse(fs.readFileSync(statePath, 'utf8').replace(/^\uFEFF/, '')); const dispatchPath = path.join(runRoot, 'DISPATCH.json'); const results = {}; for (const [stageId, stage] of Object.entries(state.stages || {})) { const outputPath = path.join(courseRoot(id), stage.output); if (!fs.existsSync(outputPath)) continue; const content = fs.readFileSync(outputPath, 'utf8').replace(/^\uFEFF/, ''); const resultPath = path.join(runRoot, 'stage-result.json'); const execution = fs.existsSync(resultPath) ? JSON.parse(fs.readFileSync(resultPath, 'utf8')) : {}; results[stageId] = { output: stage.output, url: '/library/courses/' + id + '/' + stage.output.replaceAll('\\', '/'), executor: execution.stage === stageId ? execution.executor : null, model: execution.stage === stageId ? execution.model : null, preview: content.split(/\r?\n/).filter(Boolean).slice(0, 10).join('\n') }; } state.results = results; return { state, dispatch: fs.existsSync(dispatchPath) ? JSON.parse(fs.readFileSync(dispatchPath, 'utf8')) : null, runId };
}
function command(id, args, res) { const result = spawnSync(process.execPath, [path.join(root, 'orchestrator', 'orchestrator.mjs'), ...args, '--course', id], { cwd: root, encoding: 'utf8' }); if (result.status !== 0) return json(res, 500, { ok: false, error: result.stderr || result.stdout }); json(res, 200, { ok: true, output: result.stdout, run: latestRun(id) }); }
function startAsync(id, args, res) { const child = spawn(process.execPath, [path.join(root, 'orchestrator', 'orchestrator.mjs'), ...args, '--course', id], { cwd: root, windowsHide: true, stdio: 'ignore' }); child.unref(); json(res, 202, { ok: true, accepted: true, run: latestRun(id) }); }
function serve(req, res) { const url = new URL(req.url, `http://${req.headers.host}`); if (url.pathname.startsWith('/api/courses/')) { const match = url.pathname.match(/^\/api\/courses\/([^/]+)(?:\/([^/]+))?$/); if (!match) return json(res, 404, { error: 'not found' }); const id = decodeURIComponent(match[1]); const action = match[2]; if (req.method === 'GET' && (!action || action === 'run')) return json(res, 200, { ok: true, run: latestRun(id) }); if (req.method === 'POST' && action === 'start') return command(id, ['start'], res); if (req.method === 'POST' && action === 'execute') return startAsync(id, ['execute'], res); if (req.method === 'POST' && action === 'run-all') return startAsync(id, ['run-all'], res); if (req.method === 'DELETE' && !action) { try { deleteCourse(id); return json(res, 200, { ok: true, deleted: id }); } catch (error) { return json(res, 400, { ok: false, error: error.message }); } } return json(res, 405, { error: 'method not allowed' }); }
  let requestPath = decodeURIComponent(url.pathname === '/' ? '/catalog/index.html' : url.pathname); const file = path.resolve(root, `.${requestPath}`); if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return json(res, 404, { error: 'not found' }); res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store, no-cache, must-revalidate' }); fs.createReadStream(file).pipe(res); }
http.createServer(serve).listen(port, () => console.log(`Teaching Agent server: http://localhost:${port}`));




