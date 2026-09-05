import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

export const classifyAudit = audit => {
  if (audit.error !== undefined) {
    return { exitCode: 2, message: `npm audit unavailable: ${audit.error.summary ?? audit.error.message ?? 'registry error'}` };
  }

  const vulnerabilities = audit.metadata?.vulnerabilities;
  if (vulnerabilities === undefined) {
    return { exitCode: 2, message: 'npm audit unavailable: response has no vulnerability summary' };
  }

  const severities = ['info', 'low', 'moderate', 'high', 'critical', 'total'];
  if (severities.some(severity => !Number.isInteger(vulnerabilities[severity]) || vulnerabilities[severity] < 0)) {
    return { exitCode: 2, message: 'npm audit unavailable: vulnerability summary is malformed' };
  }

  const blocking = vulnerabilities.high + vulnerabilities.critical;
  if (blocking > 0) {
    return { exitCode: 1, message: `npm audit rejected ${blocking} high or critical vulnerabilities` };
  }

  return { exitCode: 0, message: `npm audit accepted: ${vulnerabilities.total} findings, none high or critical` };
};

export const saveAudit = ({ audit, generatedAt, outputDirectory }) => {
  const timestamp = generatedAt.toISOString().replaceAll(':', '-');
  const output = resolve(outputDirectory, `npm-audit-${timestamp}.json`);
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(output, `${JSON.stringify({ generatedAt: generatedAt.toISOString(), audit }, null, 2)}\n`);
  return output;
};

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = spawnSync('npm', ['audit', '--json', '--audit-level=high'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  let audit;

  if (result.error !== undefined || result.status === null) {
    audit = { error: { summary: result.error?.message ?? `npm audit ended by signal ${result.signal ?? 'unknown'}` } };
  } else {
    try {
      audit = JSON.parse(result.stdout);
    } catch {
      audit = { error: { summary: result.stderr.trim() || 'npm did not return a JSON report' } };
    }
  }

  const outputDirectory = resolve(repositoryRoot, process.env.SECURITY_REPORT_DIR ?? 'artifacts/security');
  const output = saveAudit({ audit, generatedAt: new Date(), outputDirectory });
  const classification = classifyAudit(audit);
  process.stdout.write(`${classification.message}; report: ${output}\n`);
  process.exitCode = classification.exitCode;
}
