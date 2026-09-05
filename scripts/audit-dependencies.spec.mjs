import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { classifyAudit, saveAudit } from './audit-dependencies.mjs';

const workspaces = [];

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    rmSync(workspace, { force: true, recursive: true });
  }
});

describe('dependency audit policy', () => {
  it('should accept a dated report without high or critical vulnerabilities', () => {
    const audit = {
      metadata: { vulnerabilities: { info: 0, low: 0, moderate: 2, high: 0, critical: 0, total: 2 } },
    };
    const outputDirectory = mkdtempSync(join(tmpdir(), 'glm-audit-'));
    const generatedAt = new Date('2026-09-05T12:00:00.000Z');
    workspaces.push(outputDirectory);

    const classification = classifyAudit(audit);
    const output = saveAudit({ audit, generatedAt, outputDirectory });

    assert.equal(classification.exitCode, 0);
    assert.match(output, /npm-audit-2026-09-05T12-00-00\.000Z\.json$/);
    assert.equal(JSON.parse(readFileSync(output, 'utf8')).generatedAt, generatedAt.toISOString());
  });

  it('should reject high or critical vulnerabilities', () => {
    const audit = {
      metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 1, total: 2 } },
    };

    assert.deepEqual(classifyAudit(audit), {
      exitCode: 1,
      message: 'npm audit rejected 2 high or critical vulnerabilities',
    });
  });

  it('should distinguish registry failure from a clean audit', () => {
    assert.deepEqual(classifyAudit({ error: { summary: 'registry unavailable' } }), {
      exitCode: 2,
      message: 'npm audit unavailable: registry unavailable',
    });
  });

  it('should fail closed when the vulnerability summary is malformed', () => {
    assert.deepEqual(classifyAudit({ metadata: { vulnerabilities: { high: 0, critical: 0, total: 0 } } }), {
      exitCode: 2,
      message: 'npm audit unavailable: vulnerability summary is malformed',
    });
  });
});
