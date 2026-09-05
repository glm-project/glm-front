import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const mode = process.argv[2];

if (!['history', 'staged'].includes(mode)) {
  process.stderr.write('Usage: node scripts/scan-secrets.mjs <history|staged>\n');
  process.exitCode = 2;
} else {
  const arguments_ = ['git', '--no-banner', '--redact'];

  if (mode === 'staged') {
    arguments_.push('--staged');
  } else {
    const directory = resolve(repositoryRoot, process.env.SECURITY_REPORT_DIR ?? 'artifacts/security');
    const timestamp = new Date().toISOString().replaceAll(':', '-');
    mkdirSync(directory, { recursive: true });
    arguments_.push('--report-format', 'json', '--report-path', resolve(directory, `gitleaks-history-${timestamp}.json`));
  }

  arguments_.push(repositoryRoot);
  const result = spawnSync('gitleaks', arguments_, { cwd: repositoryRoot, stdio: 'inherit' });

  if (result.error !== undefined) {
    process.stderr.write(`${result.error.message}\n`);
  }

  process.exitCode = result.status ?? 1;
}
