import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const nextDir = path.join(projectRoot, '.next');
const bogusNested = path.join(projectRoot, 'var');

// Symlinking .next off-volume breaks webpack module resolution (react/jsx-runtime).
// Keep .next inside the project; webpack filesystem cache is pointed at local tmp
// via next.config.ts instead.
if (fs.existsSync(bogusNested)) {
  fs.rmSync(bogusNested, { recursive: true, force: true });
  console.log('[sounddrop] removed nested cache at web/var');
}

try {
  const stat = fs.lstatSync(nextDir);
  if (stat.isSymbolicLink()) {
    fs.rmSync(nextDir, { force: true });
    console.log('[sounddrop] removed .next symlink (breaks module resolution)');
  }
} catch {
  // missing is fine
}

// Strip AppleDouble junk that poisons Turbopack/webpack caches on /Volumes.
function stripAppleDouble(dir, depth = 0) {
  if (!fs.existsSync(dir) || depth > 6) return 0;
  let removed = 0;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith('._')) {
      try {
        fs.rmSync(full, { recursive: true, force: true });
        removed += 1;
      } catch {
        // ignore
      }
      continue;
    }
    if (entry.isDirectory()) removed += stripAppleDouble(full, depth + 1);
  }
  return removed;
}

if (fs.existsSync(nextDir)) {
  const n = stripAppleDouble(nextDir);
  if (n) console.log(`[sounddrop] removed ${n} AppleDouble cache files`);
}
