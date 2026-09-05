import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

const workspaces = [];

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    rmSync(workspace, { force: true, recursive: true });
  }
});

const workspace = name => {
  const directory = mkdtempSync(join(tmpdir(), name));
  workspaces.push(directory);
  return directory;
};

describe('security and workflow controls', () => {
  it('should make actionlint reject a synthetic invalid workflow', () => {
    const directory = workspace('glm-actionlint-');
    const workflow = join(directory, 'invalid.yml');
    writeFileSync(
      workflow,
      `name: invalid\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "\${{ unknown_context.value }}"\n`,
    );

    const result = spawnSync('actionlint', ['-no-color', workflow], { encoding: 'utf8' });

    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /undefined variable "unknown_context"/);
  });

  it('should make gitleaks reject a generated staged credential and accept safe content', () => {
    const directory = workspace('glm-gitleaks-');
    execFileSync('git', ['init', '--quiet'], { cwd: directory });
    const fixture = join(directory, 'fixture.txt');
    const syntheticCredential = ['AKIA', 'QWERTYUIOPASDFGH'].join('');
    writeFileSync(fixture, `credential=${syntheticCredential}\n`);
    execFileSync('git', ['add', 'fixture.txt'], { cwd: directory });

    const rejected = spawnSync('gitleaks', ['git', '--staged', '--no-banner', '--redact', directory], {
      encoding: 'utf8',
    });
    writeFileSync(fixture, 'synthetic fixture without a credential\n');
    execFileSync('git', ['add', 'fixture.txt'], { cwd: directory });
    const accepted = spawnSync('gitleaks', ['git', '--staged', '--no-banner', '--redact', directory], {
      encoding: 'utf8',
    });

    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /leaks found/);
    assert.equal(accepted.status, 0);
  });
});
