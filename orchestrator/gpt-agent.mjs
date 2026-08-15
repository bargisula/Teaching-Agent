import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const root = process.cwd();
function loadEnv(file) { if (!fs.existsSync(file)) return; for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, ''); } }
loadEnv(path.join(root, '.env'));
loadEnv(path.join(root, 'orchestrator', '.env'));
const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : null; };
const fail = message => { console.error(`GPT Agent error: ${message}`); process.exit(1); };
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const write = (file, content) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content, 'utf8'); };

export async function runGoalWithOpenAI({ courseId, dispatch }) {
  const courseRoot = path.join(root, 'library', 'courses', courseId);
  const inputPath = path.join(courseRoot, dispatch.input);
  const outputPath = path.join(courseRoot, dispatch.expectedOutput);
  if (!fs.existsSync(inputPath)) throw new Error(`Input file not found: ${dispatch.input}`);
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set. Use the local runner or configure the API key.');
  const input = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const result = await requestResponses({ model, input });
  const markdown = renderGoalMarkdown(result, input, model);
  write(outputPath, markdown);
  write(path.join(path.dirname(outputPath), 'goal-result.json'), `${JSON.stringify({ model, source: 'openai-responses-api', generatedAt: new Date().toISOString(), result }, null, 2)}\n`);
  return { executor: 'openai-responses-api', model };
}

export function buildGoalRequest(input, model = process.env.OPENAI_MODEL || 'gpt-4.1-mini') {
  return {
    model,
    instructions: 'You are the goal-decomposition agent for a teaching-material production system. Read the user requirements and return only valid JSON matching the supplied schema. Do not invent missing facts. Mark assumptions and identify missing decisions that require user confirmation. The output must be useful to the next curriculum-planning agent.',
    input,
    text: { format: { type: 'json_schema', name: 'goal_decomposition', strict: true, schema: {
      type: 'object', additionalProperties: false,
      properties: {
        course_summary: { type: 'string' }, target_audience: { type: 'string' },
        learning_outcomes: { type: 'array', items: { type: 'string' } },
        learner_starting_point: { type: 'string' }, constraints: { type: 'array', items: { type: 'string' } },
        assumptions: { type: 'array', items: { type: 'string' } }, missing_decisions: { type: 'array', items: { type: 'string' } },
        recommended_sequence: { type: 'array', items: { type: 'string' } }, next_agent_input: { type: 'string' }
      },
      required: ['course_summary', 'target_audience', 'learning_outcomes', 'learner_starting_point', 'constraints', 'assumptions', 'missing_decisions', 'recommended_sequence', 'next_agent_input']
    } } }
  };
}

function requestResponses({ model, input }) {
  const body = JSON.stringify(buildGoalRequest(input, model));
  return new Promise((resolve, reject) => {
    const request = https.request('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, response => {
      let raw = ''; response.setEncoding('utf8'); response.on('data', chunk => { raw += chunk; });
      response.on('end', () => { let parsed; try { parsed = JSON.parse(raw); } catch { return reject(new Error(`OpenAI returned non-JSON (${response.statusCode})`)); } if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(parsed.error?.message || `OpenAI request failed (${response.statusCode})`)); try { resolve(extractStructuredOutput(parsed)); } catch (error) { reject(error); } });
    });
    request.on('error', reject); request.setTimeout(120000, () => request.destroy(new Error('OpenAI request timed out'))); request.write(body); request.end();
  });
}

function extractStructuredOutput(response) {
  if (response.output_parsed) return response.output_parsed;
  if (response.output_text) return JSON.parse(response.output_text);
  const text = (response.output || []).flatMap(item => item.content || []).map(item => item.text || item.value || '').join('');
  if (!text) throw new Error('OpenAI response did not contain structured output');
  return JSON.parse(text);
}

function renderList(items) { return items.length ? items.map(item => `- ${item}`).join('\n') : '- （未提供）'; }
function renderGoalMarkdown(result, input, model) {
  return `# 目標拆解\n\n> 執行器：OpenAI Responses API\n> 模型：${model}\n> 產生時間：${new Date().toISOString()}\n\n## 原始需求\n\n${input.trim()}\n\n## 課程摘要\n\n${result.course_summary}\n\n## 教學對象\n\n${result.target_audience}\n\n## 學習成果\n\n${renderList(result.learning_outcomes)}\n\n## 學員起點\n\n${result.learner_starting_point}\n\n## 限制條件\n\n${renderList(result.constraints)}\n\n## 假設\n\n${renderList(result.assumptions)}\n\n## 尚待確認\n\n${renderList(result.missing_decisions)}\n\n## 建議教學順序\n\n${result.recommended_sequence.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n## 交接給教材規劃 Agent\n\n${result.next_agent_input}\n`;
}

if (process.argv[1] && process.argv[1].endsWith('gpt-agent.mjs')) {
  const courseId = option('course'); const runId = option('run');
  if (!courseId || !runId) fail('Usage: node gpt-agent.mjs --course <id> --run <run-id>');
  const runRoot = path.join(root, 'library', 'courses', courseId, 'runs', runId);
  const dispatch = readJson(path.join(runRoot, 'DISPATCH.json'));
  if (dispatch.stage !== 'goal') fail(`GPT Agent only handles goal stage, got ${dispatch.stage}`);
  runGoalWithOpenAI({ courseId, runId, dispatch }).then(result => console.log(`Generated ${dispatch.expectedOutput} with ${result.model}`)).catch(error => fail(error.message));
}