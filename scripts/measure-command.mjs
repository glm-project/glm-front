import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const separator = process.argv.indexOf('--');

if (separator < 3 || separator === process.argv.length - 1) {
  process.stderr.write('Usage: node scripts/measure-command.mjs <label> -- <command> [arguments...]\n');
  process.exitCode = 2;
} else {
  const label = process.argv[2];
  const [command, ...arguments_] = process.argv.slice(separator + 1);
  const startedAt = new Date();
  const started = process.hrtime.bigint();
  const result = spawnSync(command, arguments_, { stdio: 'inherit' });
  const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
  const record = {
    label,
    startedAt: startedAt.toISOString(),
    durationMs: Math.round(durationMs),
    exitCode: result.status ?? 1,
  };
  const timingsFile = process.env.VALIDATION_TIMINGS_FILE;

  if (timingsFile !== undefined) {
    mkdirSync(dirname(timingsFile), { recursive: true });
    appendFileSync(timingsFile, `${JSON.stringify(record)}\n`);
  }

  process.stdout.write(`${label} finished in ${(durationMs / 1000).toFixed(2)}s with exit code ${record.exitCode}\n`);

  if (result.error !== undefined) {
    process.stderr.write(`${result.error.message}\n`);
  }

  process.exitCode = record.exitCode;
}
