// Build step: inline photos -> encrypt content with the code word -> write dist/index.html
// Nothing readable (message or photos) ends up in the output without the code word.
import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const root = new URL('./', import.meta.url);
const cfg = JSON.parse(readFileSync(new URL('./config.json', root), 'utf8'));
const codeWord = cfg.codeWord;
if (!codeWord) { console.error('config.json: codeWord is required'); process.exit(1); }

const ITER = 200000;
const MIME = { svg:'image/svg+xml', jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif' };

// 1. read content, strip HTML comments, inline every <img src="photos/...">
let content = readFileSync(new URL('./src/content.html', root), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '');
let photoCount = 0;
content = content.replace(/src="(photos\/[^"]+)"/g, (_, rel) => {
  const buf = readFileSync(new URL('./' + rel, root));
  const ext = rel.split('.').pop().toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  photoCount++;
  return `src="data:${mime};base64,${buf.toString('base64')}"`;
});

// 2. encrypt: PBKDF2-SHA256 -> AES-GCM-256
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', enc.encode(codeWord), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name:'PBKDF2', salt, iterations:ITER, hash:'SHA-256' },
  base, { name:'AES-GCM', length:256 }, false, ['encrypt']
);
const cipher = new Uint8Array(await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, enc.encode(content)));
const b64 = u8 => Buffer.from(u8).toString('base64');
const payload = { salt:b64(salt), iv:b64(iv), data:b64(cipher), iter:ITER };

// 3. inject into template
const template = readFileSync(new URL('./src/template.html', root), 'utf8');
const out = template
  .replace('__PAYLOAD__', JSON.stringify(payload))
  .replace('__HINT__', JSON.stringify(cfg.hint || ''));
writeFileSync(new URL('./dist/index.html', root), out);

// 4. copy non-secret decorative assets (frame, etc.) into dist/
const assetsDir = new URL('./src/assets/', root);
let assetCount = 0;
if (existsSync(assetsDir)) {
  for (const f of readdirSync(assetsDir)) {
    copyFileSync(new URL(f, assetsDir), new URL('./dist/' + f, root));
    assetCount++;
  }
}

// a user-provided music track in the project root overrides the placeholder
for (const name of ['music.mp3', 'music.m4a', 'music.ogg', 'music.wav']) {
  const a = new URL('./' + name, root);
  if (existsSync(a)) { copyFileSync(a, new URL('./dist/' + name, root)); }
}

const kb = Math.round(out.length / 1024);
console.log(`built dist/index.html  (${photoCount} photos inlined, ${kb} KB, encrypted; ${assetCount} assets copied)`);
