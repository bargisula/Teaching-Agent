import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/validate-media-config.mjs <media-config.json>');
  process.exit(2);
}

const fail = message => {
  console.error(`[media-config] FAIL: ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(file)) {
  fail(`file not found: ${file}`);
  process.exit();
}

let config;
try {
  config = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
} catch (error) {
  fail(`invalid JSON: ${error.message}`);
  process.exit();
}

const allowedModes = new Set(['single-female', 'single-male', 'dialogue', 'teacher-student']);
const allowedLanguages = new Set(['zh-TW', 'zh-CN', 'en-US', 'ja-JP']);
const errors = [];
const requireValue = (value, label) => {
  if (value === undefined || value === null || value === '') errors.push(`${label} is required`);
};

if (typeof config.enabled !== 'boolean') errors.push('enabled must be boolean');
if (!allowedModes.has(config.mode)) errors.push(`mode must be one of: ${[...allowedModes].join(', ')}`);
if (!allowedLanguages.has(config.language)) errors.push(`language must be one of: ${[...allowedLanguages].join(', ')}`);
if (config.scriptApprovalRequired !== undefined && typeof config.scriptApprovalRequired !== 'boolean') errors.push('scriptApprovalRequired must be boolean');

const voices = config.voices;
if (!voices || typeof voices !== 'object' || Array.isArray(voices) || Object.keys(voices).length === 0) {
  errors.push('voices must contain at least one voice profile');
} else {
  for (const [key, voice] of Object.entries(voices)) {
    requireValue(voice?.label, `voices.${key}.label`);
    requireValue(voice?.provider, `voices.${key}.provider`);
    requireValue(voice?.voiceId, `voices.${key}.voiceId`);
    if (typeof voice?.speed !== 'number' || voice.speed <= 0.5 || voice.speed > 2) errors.push(`voices.${key}.speed must be > 0.5 and <= 2`);
    if (voice?.voiceId === 'replace-with-tts-voice-id' || voice?.provider === 'configure-before-use') errors.push(`voices.${key} still uses placeholder TTS settings`);
  }
}

const subtitle = config.subtitle;
if (!subtitle || typeof subtitle !== 'object') {
  errors.push('subtitle is required');
} else {
  if (typeof subtitle.enabled !== 'boolean') errors.push('subtitle.enabled must be boolean');
  if (!['srt', 'ass', 'both'].includes(subtitle.format)) errors.push('subtitle.format must be srt, ass, or both');
  if (typeof subtitle.burnIn !== 'boolean') errors.push('subtitle.burnIn must be boolean');
  requireValue(subtitle.fontFamily, 'subtitle.fontFamily');
  if (!Number.isInteger(subtitle.fontSize) || subtitle.fontSize < 18 || subtitle.fontSize > 96) errors.push('subtitle.fontSize must be an integer from 18 to 96');
  if (subtitle.position !== undefined && !['bottom', 'middle', 'top'].includes(subtitle.position)) errors.push('subtitle.position must be bottom, middle, or top');
}

const video = config.video;
if (!video || typeof video !== 'object') {
  errors.push('video is required');
} else {
  if (!Number.isInteger(video.width) || video.width < 640) errors.push('video.width must be an integer >= 640');
  if (!Number.isInteger(video.height) || video.height < 360) errors.push('video.height must be an integer >= 360');
  if (![24, 25, 30, 60].includes(video.fps)) errors.push('video.fps must be 24, 25, 30, or 60');
  if (video.format !== 'mp4') errors.push('video.format must be mp4');
}

if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, file: path.resolve(file), mode: config.mode, language: config.language }, null, 2));
}
