import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outDir = path.join(root, 'styles', 'previews');
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
if (!chrome) throw new Error('找不到 Chrome 或 Edge');
for (const id of ['poetic-image-poster', 'workspace-editorial', 'modular-info-cards']) {
  const htmlPath = path.join(outDir, id + '.html');
  const pngPath = path.join(outDir, id + '.png');
  const profile = path.join('C:/tmp', 'teaching-agent-style-sample-' + id);
  const result = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--disable-crash-reporter', '--hide-scrollbars', '--no-first-run', '--user-data-dir=' + profile, '--window-size=1600,900', '--screenshot=' + pngPath, 'file:///' + htmlPath.replaceAll('\\', '/')], { encoding: 'utf8', timeout: 60000, windowsHide: true });
  if (result.status !== 0 || !fs.existsSync(pngPath)) throw new Error(id + ' render failed: ' + (result.stderr || result.stdout || 'unknown'));
  console.log(id + ': ' + pngPath);
}
