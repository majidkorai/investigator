import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const manifestPath = join(root, 'manifest.json');
const releasesDir = join(root, 'releases');

if (!existsSync(manifestPath)) {
  console.error('manifest.json not found at project root.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const version = manifest.version ?? '0.0.0';
const rawName = typeof manifest.name === 'string' ? manifest.name : 'extension';
const slug = rawName.replace(/\s+/g, '-').toLowerCase();
const outName = `${slug}-v${version}-chrome.zip`;

mkdirSync(releasesDir, { recursive: true });
const outPath = join(releasesDir, outName);

if (!existsSync(distDir)) {
  console.error('dist/ is missing. Run `npm run build` first, or use `npm run pack`.');
  process.exit(1);
}

if (existsSync(outPath)) unlinkSync(outPath);

const result = spawnSync(
  'zip',
  ['-r', '-q', outPath, '.', '-x', '*.DS_Store', '-x', '**/.DS_Store'],
  { cwd: distDir, stdio: 'inherit' },
);

if (result.error) {
  console.error(result.error.message);
  console.error(
    'Could not run `zip`. On macOS or Linux it is usually preinstalled. On Windows, use Git Bash, WSL, or install Info-ZIP and ensure `zip` is on your PATH.',
  );
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Packed extension: ${outPath}`);
console.log('Upload this file to the Chrome Web Store Developer Dashboard (zip root must contain manifest.json).');
