const fallbackCatalog = { courses: [{ id: 'codex-accounting-basics', title: '用 Codex 建立記帳系統', description: '給零基礎學員的 60 分鐘入門課程，帶學員完成一個可操作的記帳系統雛形。', tags: ['Codex', 'AI 入門', '實作', '記帳系統'], audience: '零基礎學員', status: 'draft', latestVersion: 'v0.1', updatedAt: '2026-07-17', path: 'library/courses/codex-accounting-basics', versions: [{ id: 'v0.1', status: 'draft', createdAt: '2026-07-17', changeSummary: '建立第一版課程需求與教材大綱' }] }] };
const labels = { draft: '草稿', review: '審查中', approved: '已核准', published: '已發布' };
const state = { courses: [], query: '', status: 'all', selected: null, poller: null };
const agentDefinitions = {
  orchestrator: { name: '主控 Agent', role: '流程協調', icon: '◎', description: '判斷目前階段、分派任務、管理交接。', input: '你的課程需求', output: '下一個工作階段' },
  curriculum: { name: '教材規劃 Agent', role: '教學架構', icon: '▤', description: '把需求轉成有順序、可教學的教材大綱。', input: '課程需求摘要', output: '逐頁教材大綱' },
  visual: { name: '視覺導演 Agent', role: '畫面規劃', icon: '◒', description: '決定每頁使用截圖、照片、流程圖或生成圖。', input: '已確認的大綱', output: '逐頁視覺規格' },
  reviewer: { name: '品質檢查 Agent', role: '結果審查', icon: '✓', description: '檢查順序、重複、可讀性與教學風險。', input: '教材與視覺規格', output: '問題清單與修正建議' }
};
function getAgentStates(course) { course.agentStates = course.agentStates || { orchestrator: 'idle', curriculum: 'idle', visual: 'idle', reviewer: 'idle' }; return course.agentStates; }
function getAgentProgress(course) { course.agentProgress = course.agentProgress || { orchestrator: 0, curriculum: 0, visual: 0, reviewer: 0 }; return course.agentProgress; }
const $ = selector => document.querySelector(selector);
const normalize = value => String(value || '').toLowerCase();
function saveLocal() { localStorage.setItem('teaching-agent-catalog', JSON.stringify({ version: 1, updatedAt: new Date().toISOString().slice(0, 10), courses: state.courses })); }
function filteredCourses() { return state.courses.filter(course => { const haystack = normalize([course.title, course.description, course.audience, ...(course.tags || [])].join(' ')); return haystack.includes(normalize(state.query)) && (state.status === 'all' || course.status === state.status); }); }
function renderCatalog() { const courses = filteredCourses(); $('#result-count').textContent = `顯示 ${courses.length} / ${state.courses.length} 套教材`; $('#course-list').innerHTML = courses.map(course => `<article class="course-card"><button class="card-hit" data-open="${course.id}" aria-label="開啟 ${course.title}"></button><div class="card-top"><h3>${course.title}</h3><span class="status">${labels[course.status] || course.status}</span></div><p class="course-description">${course.description || '尚未填寫課程描述。'}</p><div class="tags">${(course.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}</div><footer class="card-footer"><span>${course.audience || '未指定受眾'} · 更新於 ${course.updatedAt}</span><span class="card-link">${course.latestVersion || '尚無版本'} →</span></footer></article>`).join(''); $('#empty-state').hidden = courses.length !== 0; const newest = [...state.courses].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0]; $('#recent-copy').textContent = newest ? `${newest.title} · ${newest.latestVersion} · ${labels[newest.status] || newest.status}` : '還沒有教材，先建立第一套課程。'; document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openDetail(button.dataset.open))); }
function openDetail(id) { state.selected = state.courses.find(course => course.id === id); if (!state.selected) return; $('#catalog-view').hidden = true; $('#detail-view').hidden = false; renderDetail(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function renderRunResults(run) {
  if (!run || !run.results || !Object.keys(run.results).length) return '';
  const labels = { goal: '目標拆解', curriculum: '教材大綱', visual: '視覺規格', review: '品質檢查' };
  return '<section class="results-sheet"><div class="sheet-heading"><div><p class="eyebrow">ACTUAL OUTPUTS</p><h3>Agent 已產出的成果</h3></div><span class="connection-note">來自實際輸出檔案</span></div><div class="result-list">' + Object.entries(run.results).map(([stageId, result]) => '<article class="result-item"><div><span class="result-stage">' + (labels[stageId] || stageId) + '</span><strong>' + result.output + '</strong><small class="result-executor">' + (result.executor || 'executor unknown') + (result.model ? ' ? ' + result.model : '') + '</small><a class="result-link" href="' + (result.url || '#') + '" target="_blank" rel="noopener">開啟完整成果 ↗</a></div><pre>' + result.preview + '</pre></article>').join('') + '</div></section>';
}
function renderDetail() { const course = state.selected; const run = course.runState; const versions = course.versions || [{ id: course.latestVersion || 'v0.1', status: course.status, createdAt: course.updatedAt, changeSummary: '目前版本' }]; const messages = course.messages || [{ role: 'agent', text: '你好，我是這套教材的主控 Agent。你可以先選一個工作階段，或直接告訴我想教誰、教什麼。' }]; const agentStates = getAgentStates(course); const agentProgress = getAgentProgress(course); if (run?.stages) { const stageAgents = { goal: 'orchestrator', curriculum: 'curriculum', visual: 'visual', review: 'reviewer' }; Object.entries(run.stages).forEach(([stageId, stage]) => { const agentKey = stageAgents[stageId]; if (!agentKey) return; agentStates[agentKey] = stage.status === 'completed' ? 'ready' : stage.status === 'running' ? 'working' : 'idle'; agentProgress[agentKey] = stage.status === 'completed' ? 100 : stage.status === 'running' ? 52 : 0; }); } const agentOrder = ['orchestrator', 'curriculum', 'visual', 'reviewer']; const stateLabels = { idle: '等待中', working: '處理中', ready: '已有結果' }; $('#detail-content').innerHTML = `<div class="detail-head"><div><p class="eyebrow">COURSE WORKSPACE</p><h2>${course.title}</h2><p class="detail-description">${course.description || '尚未填寫課程描述。'}</p><div class="tags">${(course.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}</div></div><div class="detail-actions"><span class="status">${labels[course.status] || course.status}</span><button class="danger-button" id="delete-course" type="button">刪除教材</button></div></div><div class="controller-sync ${run ? "synced" : "preview"}"><span class="sync-dot"></span><div><strong>${run ? "主控器已同步" : "介面流程預覽"}</strong><small>${run ? `Run ${run.runId} · 目前階段：${run.currentStage || "已完成"}` : "尚未讀取 state.json；目前顯示本機預覽狀態"}</small></div><div class="sync-actions"><button class="sync-button" data-controller="start" type="button">啟動 Run</button><button class="sync-button" data-controller="run-all" type="button">執行全部</button></div></div><section class="agent-board"><div class="board-heading"><div><p class="eyebrow">AGENT WORKBENCH</p><h3>誰正在處理這套教材？</h3></div><span class="connection-note">目前：本機流程預覽</span></div><div class="agent-grid">${agentOrder.map(key => { const agent = agentDefinitions[key]; return `<button class="agent-card state-${agentStates[key]}" data-agent="${key}" type="button"><div class="agent-card-top"><span class="agent-icon">${agent.icon}</span><span class="agent-state">${stateLabels[agentStates[key]]}</span></div><strong>${agent.name}</strong><small>${agent.role}</small><p>${agent.description}</p><div class="agent-io"><span>輸入：${agent.input}</span><span>產出：${agent.output}</span></div><div class="agent-progress"><div class="progress-meta"><span>${agentStates[key] === 'working' ? '正在處理' : agentStates[key] === 'ready' ? '已完成' : '尚未開始'}</span><strong>${agentProgress[key]}%</strong></div><div class="progress-track"><span style="width:${agentProgress[key]}%"></span></div></div></button>`; }).join('')}</div></section>${renderRunResults(run)}<div class="detail-grid"><section class="detail-sheet"><p class="eyebrow">COURSE NOTES</p><dl><dt>教學對象</dt><dd>${course.audience || '未指定'}</dd><dt>最新版本</dt><dd>${course.latestVersion || '尚無版本'}</dd><dt>最後更新</dt><dd>${course.updatedAt || '未記錄'}</dd></dl><div class="workflow-list"><p class="eyebrow">WORKFLOW</p><button class="workflow-button" data-workflow="interview"><span>01</span>需求訪談</button><button class="workflow-button" data-workflow="outline"><span>02</span>教材規劃</button><button class="workflow-button" data-workflow="review"><span>03</span>品質檢查</button></div></section><section class="detail-sheet"><div class="sheet-heading"><div><p class="eyebrow">VERSION HISTORY</p><h3>版本時間軸</h3></div><button class="secondary-button" id="new-version" type="button">＋ 新版本</button></div><div class="timeline">${versions.map(version => `<article class="timeline-item"><div class="timeline-dot"></div><div><div class="version-line"><strong>${version.id}</strong><span class="status">${labels[version.status] || version.status}</span></div><p>${version.changeSummary || '未填寫修改說明'}</p><small>${version.createdAt || '未記錄'}</small></div></article>`).join('')}</div></section></div><section class="chat-sheet"><div class="sheet-heading"><div><p class="eyebrow">AGENT DESK</p><h3>教材工作對話</h3></div><span class="connection-note">輸入需求，觀察工作階段變化</span></div><div class="chat-log" id="chat-log">${messages.map(message => `<div class="chat-message ${message.role === 'user' ? 'from-user' : 'from-agent'}"><span class="chat-role">${message.role === 'user' ? '你' : 'Agent'}</span><p>${message.text}</p>${message.type === 'confirmation' ? '<button class="chat-confirm" type="button" data-confirm-request>確認執行</button>' : ''}</div>`).join('')}</div><form class="chat-form" id="chat-form"><textarea id="chat-input" rows="2" placeholder="例如：請把這堂課改成給完全沒接觸 AI 的行政人員"></textarea><button class="primary-button" type="submit">送出訊息</button></form></section>`; $('#new-version').addEventListener('click', createVersion); document.querySelectorAll('[data-workflow]').forEach(button => button.addEventListener('click', () => runWorkflow(button.dataset.workflow))); document.querySelectorAll('[data-agent]').forEach(button => button.addEventListener('click', () => runAgent(button.dataset.agent))); $('#chat-form').addEventListener('submit', sendMessage); document.querySelectorAll('[data-confirm-request]').forEach(button => button.addEventListener('click', confirmRequest)); }
function runWorkflow(type) { const target = { interview: 'curriculum', outline: 'curriculum', review: 'reviewer' }[type] || 'orchestrator'; runAgent(target); }
function runAgent(key) { const course = state.selected; const agentStates = getAgentStates(course); const progress = getAgentProgress(course); agentStates.orchestrator = 'working'; agentStates[key] = 'working'; progress.orchestrator = 8; progress[key] = 6; saveLocal(); renderDetail(); let tick = 0; const timer = window.setInterval(() => { tick += 1; progress.orchestrator = Math.min(94, 8 + tick * 15); progress[key] = Math.min(92, 6 + tick * 17); saveLocal(); renderDetail(); if (tick >= 5) { window.clearInterval(timer); progress.orchestrator = 100; progress[key] = 100; agentStates.orchestrator = 'ready'; agentStates[key] = 'ready'; const agent = agentDefinitions[key]; course.messages = course.messages || []; course.messages.push({ role: 'agent', text: `${agent.name} 已完成本機流程預覽。\n輸入：${agent.input}\n預計產出：${agent.output}\n真正接上 GPT 後，這裡會生成可保存的實際結果。` }); saveLocal(); renderDetail(); } }, 420); }
function sendMessage(event) {
  event.preventDefault();
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text) return;
  const course = state.selected;
  course.messages = course.messages || [];
  course.messages.push({ role: 'user', text });
  course.pendingRequest = text;
  course.messages.push({ role: 'agent', type: 'confirmation', text: '我先整理一下你的需求：\n\n「' + text + '」\n\n要現在交給主控 Agent 執行嗎？確認後才會開始建立目標、教材大綱、視覺規格與品質檢查結果。' });
  input.value = '';
  saveLocal();
  renderDetail();
}
function confirmRequest() {
  const course = state.selected;
  if (!course || !course.pendingRequest) return;
  course.messages = course.messages || [];
  course.messages.push({ role: 'agent', text: '已確認執行。主控 Agent 正在建立流程，完成後會把每一階段的結果寫入教材版本資料夾。' });
  delete course.pendingRequest;
  saveLocal();
  renderDetail();
  controllerAction('run-all');
}
function sendAgentMessage(text) { const course = state.selected; course.messages = course.messages || []; course.messages.push({ role: 'agent', text: `已收到「${text}」` }, { role: 'agent', text: '主控 Agent 會先判斷需求，再交給教材規劃或品質檢查階段。這是目前的本機流程預覽，尚未連接 GPT API。' }); getAgentStates(course).orchestrator = 'ready'; saveLocal(); renderDetail(); }
async function deleteCourse() {
  const course = state.selected;
  if (!course) return;
  const confirmed = window.confirm('確定要刪除「' + course.title + '」嗎？\n\n這會移除教材資料夾、版本與流程紀錄，且無法從介面復原。');
  if (!confirmed) return;
  if (location.protocol === 'http:') {
    const response = await fetch('/api/courses/' + encodeURIComponent(course.id), { method: 'DELETE' });
    const result = await response.json();
    if (!result.ok) {
      course.messages = course.messages || [];
      course.messages.push({ role: 'agent', text: '刪除失敗：' + (result.error || '未知錯誤') });
      renderDetail();
      return;
    }
  }
  state.courses = state.courses.filter(item => item.id !== course.id);
  saveLocal();
  if (state.poller) window.clearInterval(state.poller);
  state.selected = null;
  $('#detail-view').hidden = true;
  $('#catalog-view').hidden = false;
  renderCatalog();
}function createVersion() { const course = state.selected; const previous = course.latestVersion || 'v0.1'; const match = previous.match(/v(\d+)\.(\d+)/); const next = match ? `v${match[1]}.${Number(match[2]) + 1}` : 'v0.1'; const summary = window.prompt(`建立 ${next}，請輸入本次修改原因：`, '調整教材內容與頁面順序'); if (!summary) return; course.versions = course.versions || []; course.versions.unshift({ id: next, status: 'draft', createdAt: new Date().toISOString().slice(0, 10), changeSummary: summary }); course.latestVersion = next; course.status = 'draft'; course.updatedAt = new Date().toISOString().slice(0, 10); saveLocal(); renderDetail(); renderCatalog(); }
function editCourse() {
  const form = $('#course-form');
  delete form.dataset.confirming;
  delete form.dataset.pending;
  $('#course-fields').hidden = false;
  $('#course-confirmation').hidden = true;
}
function createCourse(event) {
  event.preventDefault();
  const form = event.target;
  if (!form.dataset.confirming) {
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    form.dataset.pending = JSON.stringify(data);
    $('#confirmation-summary').innerHTML = '<dt>教材名稱</dt><dd>' + data.title + '</dd><dt>教學描述</dt><dd>' + data.description + '</dd><dt>教學對象</dt><dd>' + data.audience + '</dd>';
    $('#course-fields').hidden = true;
    $('#course-confirmation').hidden = false;
    form.dataset.confirming = '1';
    return;
  }
  const data = JSON.parse(form.dataset.pending || '{}');
  const title = String(data.title || '').trim();
  const safeId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-course';
  const id = safeId + '-' + Date.now().toString().slice(-4);
  const today = new Date().toISOString().slice(0, 10);
  const course = { id, title, description: String(data.description || '').trim(), audience: String(data.audience || '').trim(), tags: String(data.tags || '').split(',').map(tag => tag.trim()).filter(Boolean), status: 'draft', latestVersion: 'v0.1', updatedAt: today, path: 'library/courses/' + id, versions: [{ id: 'v0.1', status: 'draft', createdAt: today, changeSummary: '建立教材工作區' }], messages: [{ role: 'agent', text: '需求已確認。接下來可以交給主控 Agent 拆解教材目標。' }] };
  state.courses.unshift(course);
  saveLocal();
  delete form.dataset.confirming;
  delete form.dataset.pending;
  $('#course-fields').hidden = false;
  $('#course-confirmation').hidden = true;
  $('#course-dialog').close();
  form.reset();
  renderCatalog();
  openDetail(id);
  runAgent('orchestrator');
}
async function controllerAction(action) { const course = state.selected; if (location.protocol !== 'http:') { course.messages = course.messages || []; course.messages.push({ role: 'agent', text: '目前是 file:// 靜態模式。請用 server.mjs 啟動 http://localhost:4173，介面才能真正啟動主控器。' }); renderDetail(); return; } const response = await fetch(`/api/courses/${course.id}/${action}`, { method: 'POST' }); const result = await response.json(); if (!result.ok) { course.messages = course.messages || []; course.messages.push({ role: 'agent', text: `主控器啟動失敗：${result.error || '未知錯誤'}` }); } await loadRunState(course); startPolling(course); }
function startPolling(course) { if (state.poller) window.clearInterval(state.poller); state.poller = window.setInterval(() => loadRunState(course), 900); }
async function loadRunState(course) { if (!course.path) return; try { const apiUrl = location.protocol === 'http:' ? `/api/courses/${course.id}/run?${Date.now()}` : `../${course.path}/runs/latest`; if (location.protocol === 'http:') { const response = await fetch(apiUrl, { cache: 'no-store' }); if (!response.ok) throw new Error('run unavailable'); const data = await response.json(); course.runState = data.run?.state || null; course.dispatch = data.run?.dispatch || null; renderDetail(); return; } const latestResponse = await fetch(apiUrl, { cache: 'no-store' }); if (!latestResponse.ok) throw new Error('latest run unavailable'); const runId = (await latestResponse.text()).trim(); if (!runId) throw new Error('no active run'); const stateResponse = await fetch(`../${course.path}/runs/${runId}/state.json?${Date.now()}`, { cache: 'no-store' }); if (!stateResponse.ok) throw new Error('state unavailable'); course.runState = await stateResponse.json(); const dispatchResponse = await fetch(`../${course.path}/runs/${runId}/DISPATCH.json?${Date.now()}`, { cache: 'no-store' }); course.dispatch = dispatchResponse.ok ? await dispatchResponse.json() : null; renderDetail(); } catch { course.runState = null; course.dispatch = null; renderDetail(); } }
async function loadCatalog() { const local = localStorage.getItem('teaching-agent-catalog'); if (location.protocol !== 'http:' && local) { try { state.courses = JSON.parse(local).courses || []; renderCatalog(); return; } catch {} } try { const response = await fetch('../library/_index/catalog.json'); if (!response.ok) throw new Error(); state.courses = (await response.json()).courses || []; } catch { state.courses = fallbackCatalog.courses; } renderCatalog(); }
$('#search').addEventListener('input', event => { state.query = event.target.value; renderCatalog(); }); $('#status-filter').addEventListener('change', event => { state.status = event.target.value; renderCatalog(); }); $('#new-course').addEventListener('click', () => $('#course-dialog').showModal()); $('#course-form').addEventListener('submit', createCourse); $('#edit-course').addEventListener('click', editCourse); $('#confirm-course').addEventListener('click', () => { const form = $('#course-form'); form.dataset.confirming = '1'; createCourse({ preventDefault() {}, target: form }); }); $('#back-to-catalog').addEventListener('click', () => { $('#detail-view').hidden = true; $('#catalog-view').hidden = false; state.selected = null; window.scrollTo({ top: 0, behavior: 'smooth' }); }); loadCatalog();





window.addEventListener('error', event => { const panel = document.querySelector('#empty-state'); if (!panel) return; panel.hidden = false; panel.innerHTML = '<p class="eyebrow">FRONTEND ERROR</p><h2>介面載入發生錯誤</h2>'; const detail = document.createElement('p'); detail.textContent = event.message || '請重新整理頁面。'; panel.append(detail); });

