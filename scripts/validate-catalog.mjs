import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'library', '_index', 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8').replace(/^\uFEFF/, ''));
const required = ['id', 'title', 'status', 'latestVersion', 'updatedAt', 'path'];
const errors = [];
for (const course of catalog.courses || []) {
  for (const field of required) if (!course[field]) errors.push(`${course.id || 'unknown'} 缺少 ${field}`);
  const manifestPath = path.join(root, course.path, 'manifest.json');
  if (!fs.existsSync(manifestPath)) errors.push(`${course.id} 找不到 manifest.json`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`教材索引驗證成功：${(catalog.courses || []).length} 套教材`);
