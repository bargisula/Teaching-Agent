import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
const mediaDir = option('media');
const ffprobe = option('ffprobe') || 'ffprobe';
if (!mediaDir) {
  console.error('Usage: node scripts/review-media-output.mjs --media <media-folder> [--ffprobe <ffprobe.exe>]');
  process.exit(2);
}

const root = path.resolve(mediaDir);
const videoPath = path.join(root, 'video', 'final-video.mp4');
const reportPath = path.join(root, 'media-review.md');
const checks = [];
const check = (name, ok, evidence, severity = ok ? 'V' : 'X') => checks.push({ name, ok, evidence, severity });
const exists = file => fs.existsSync(file) && fs.statSync(file).size > 0;

check('影片檔存在', exists(videoPath), videoPath);
const videoManifestPath = path.join(root, 'video', 'video-manifest.json');
const subtitleManifestPath = path.join(root, 'subtitles', 'subtitles-manifest.json');
const audioManifestPath = path.join(root, 'slide-audio-manifest.json');
check('影片 manifest 存在', exists(videoManifestPath), videoManifestPath);
check('字幕 manifest 存在', exists(subtitleManifestPath), subtitleManifestPath);
check('音訊 manifest 存在', exists(audioManifestPath), audioManifestPath);

let videoManifest;
let subtitleManifest;
let audioManifest;
try { if (exists(videoManifestPath)) videoManifest = JSON.parse(fs.readFileSync(videoManifestPath, 'utf8')); } catch { check('影片 manifest JSON 可讀', false, videoManifestPath); }
try { if (exists(subtitleManifestPath)) subtitleManifest = JSON.parse(fs.readFileSync(subtitleManifestPath, 'utf8')); } catch { check('字幕 manifest JSON 可讀', false, subtitleManifestPath); }
try { if (exists(audioManifestPath)) audioManifest = JSON.parse(fs.readFileSync(audioManifestPath, 'utf8')); } catch { check('音訊 manifest JSON 可讀', false, audioManifestPath); }

if (videoManifest && subtitleManifest && audioManifest) {
  check('影片、字幕、音訊頁數一致', videoManifest.slideCount === subtitleManifest.slides.length && videoManifest.slideCount === audioManifest.files.length, `video=${videoManifest.slideCount}, subtitle=${subtitleManifest.slides.length}, audio=${audioManifest.files.length}`);
  check('影片 manifest 狀態 completed', videoManifest.status === 'completed', `status=${videoManifest.status}`);
}

if (exists(videoPath)) {
  const probe = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height', '-of', 'json', videoPath], { encoding: 'utf8', windowsHide: true });
  if (probe.status !== 0) {
    check('FFprobe 可讀取影片', false, probe.error?.message || probe.stderr || 'ffprobe failed');
  } else {
    let metadata;
    try { metadata = JSON.parse(probe.stdout); } catch { metadata = null; }
    check('FFprobe 可讀取影片', Boolean(metadata), videoPath);
    const streams = metadata?.streams || [];
    check('影片包含影像串流', streams.some(stream => stream.codec_type === 'video'), streams.filter(stream => stream.codec_type === 'video').map(stream => `${stream.codec_name} ${stream.width}x${stream.height}`).join(', ') || 'none');
    check('影片包含音訊串流', streams.some(stream => stream.codec_type === 'audio'), streams.filter(stream => stream.codec_type === 'audio').map(stream => stream.codec_name).join(', ') || 'none');
    const duration = Number(metadata?.format?.duration || 0);
    check('影片長度大於 0 秒', duration > 0, `${duration.toFixed(3)} seconds`);
  }
}

if (subtitleManifest?.slides) {
  const subtitleFiles = subtitleManifest.slides.flatMap(slide => [slide.srt, slide.ass]).map(file => path.join(root, file));
  check('每頁 SRT 與 ASS 都存在', subtitleFiles.every(exists), subtitleFiles.filter(file => !exists(file)).join(', ') || 'all present');
}
if (audioManifest?.files) {
  const audioFiles = audioManifest.files.map(file => path.join(root, file.file));
  check('每頁合併音檔都存在', audioFiles.every(exists), audioFiles.filter(file => !exists(file)).join(', ') || 'all present');
}

const failures = checks.filter(item => !item.ok);
const rows = checks.map(item => `| ${item.name} | ${item.evidence} | ${item.severity} |`);
const report = [
  '# Media Review',
  '',
  `- 產出：${videoPath}`,
  `- 檢查時間：${new Date().toISOString()}`,
  '',
  '| 檢查項目 | 證據 | 結果 |',
  '|---|---|---|',
  ...rows,
  '',
  '## 總結果',
  '',
  failures.length ? `X FAIL\n\n${failures.map(item => `- ${item.name}: ${item.evidence}`).join('\n')}` : 'V PASS',
  ''
].join('\n');
fs.writeFileSync(reportPath, report, 'utf8');
console.log(JSON.stringify({ ok: failures.length === 0, status: failures.length ? 'FAIL' : 'PASS', report: reportPath, checks: checks.length, failures: failures.length }, null, 2));
if (failures.length) process.exitCode = 1;
