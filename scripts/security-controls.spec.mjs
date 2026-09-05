import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

const workspaces = [];
const gitLocalEnvironmentVariables = execFileSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8' }).trim().split('\n');

const withoutGitLocalEnvironment = environment => {
  const cleanEnvironment = { ...environment };

  for (const variable of gitLocalEnvironmentVariables) {
    delete cleanEnvironment[variable];
  }

  for (const variable of Object.keys(cleanEnvironment)) {
    if (/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/.test(variable)) {
      delete cleanEnvironment[variable];
    }
  }

  return cleanEnvironment;
};

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
    const parent = workspace('glm-gitleaks-parent-');
    const parentEnvironment = withoutGitLocalEnvironment(process.env);
    execFileSync('git', ['init', '--quiet'], { cwd: parent, env: parentEnvironment });
    const parentIndex = join(parent, '.git/index');
    writeFileSync(join(parent, 'parent.txt'), 'parent content\n');
    execFileSync('git', ['add', 'parent.txt'], { cwd: parent, env: parentEnvironment });
    const originalParentIndex = readFileSync(parentIndex);
    const pollutedEnvironment = {
      ...process.env,
      GIT_DIR: join(parent, '.git'),
      GIT_INDEX_FILE: parentIndex,
      GIT_WORK_TREE: parent,
    };
    const cleanEnvironment = withoutGitLocalEnvironment(pollutedEnvironment);
    const directory = workspace('glm-gitleaks-');
    execFileSync('git', ['init', '--quiet'], { cwd: directory, env: cleanEnvironment });
    const fixture = join(directory, 'fixture.txt');
    const syntheticCredential = ['AKIA', 'QWERTYUIOPASDFGH'].join('');
    writeFileSync(fixture, `credential=${syntheticCredential}\n`);
    execFileSync('git', ['add', 'fixture.txt'], { cwd: directory, env: cleanEnvironment });

    const rejected = spawnSync('gitleaks', ['git', '--staged', '--no-banner', '--redact', directory], {
      encoding: 'utf8',
      env: cleanEnvironment,
    });
    writeFileSync(fixture, 'synthetic fixture without a credential\n');
    execFileSync('git', ['add', 'fixture.txt'], { cwd: directory, env: cleanEnvironment });
    const accepted = spawnSync('gitleaks', ['git', '--staged', '--no-banner', '--redact', directory], {
      encoding: 'utf8',
      env: cleanEnvironment,
    });

    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /leaks found/);
    assert.equal(accepted.status, 0);
    assert.deepEqual(readFileSync(parentIndex), originalParentIndex);
  });
});
