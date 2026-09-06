import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runDiffMutation } from './run-diff-mutation.mjs';

describe('pre-push mutation', () => {
  it('should mutate production files changed by an existing remote branch', () => {
    const gitCalls = [];
    const mutationCalls = [];
    const status = runDiffMutation({
      updates: 'refs/heads/feature local refs/heads/feature remote\n',
      remoteName: 'origin',
      git: arguments_ => {
        gitCalls.push(arguments_);
        if (arguments_[1] === '--unified=0') return '@@ -4,2 +5,3 @@\n@@ -12 +14 @@\n@@ -20 +22,0 @@\n';
        return ['src/main/webapp/pupitre/app.ts', 'src/main/webapp/pupitre/app.spec.ts', 'documentation/testing.md'].join('\n');
      },
      runMutation: targets => {
        mutationCalls.push(targets);
        return 0;
      },
      write: () => undefined,
    });

    assert.equal(status, 0);
    assert.deepEqual(gitCalls, [
      ['diff', '--name-only', '--diff-filter=ACMRT', 'remote', 'local', '--'],
      ['diff', '--unified=0', 'remote', 'local', '--', 'src/main/webapp/pupitre/app.ts'],
    ]);
    assert.deepEqual(mutationCalls, [['src/main/webapp/pupitre/app.ts:14-14', 'src/main/webapp/pupitre/app.ts:5-7']]);
  });

  it('should mutate commits introduced by a new remote branch', () => {
    const gitCalls = [];
    const mutationCalls = [];
    const git = arguments_ => {
      gitCalls.push(arguments_);
      if (arguments_[0] === 'rev-list' && arguments_[1] === '--reverse') return 'first\nlocal\n';
      if (arguments_[0] === 'rev-list') return 'first base\n';
      if (arguments_[1] === '--unified=0') return '@@ -9 +10,2 @@\n';
      return 'src/main/webapp/gestion/app.ts\n';
    };

    const status = runDiffMutation({
      updates: `refs/heads/feature local refs/heads/feature ${'0'.repeat(40)}\n`,
      remoteName: 'origin',
      git,
      runMutation: targets => {
        mutationCalls.push(targets);
        return 0;
      },
      write: () => undefined,
    });

    assert.equal(status, 0);
    assert.deepEqual(gitCalls, [
      ['rev-list', '--reverse', 'local', '--not', '--remotes=origin'],
      ['rev-list', '--parents', '-n', '1', 'first'],
      ['diff', '--name-only', '--diff-filter=ACMRT', 'base', 'local', '--'],
      ['diff', '--unified=0', 'base', 'local', '--', 'src/main/webapp/gestion/app.ts'],
    ]);
    assert.deepEqual(mutationCalls, [['src/main/webapp/gestion/app.ts:10-11']]);
  });

  it('should mutate the complete tree on the first repository push', () => {
    const mutationCalls = [];
    const git = arguments_ => {
      if (arguments_[1] === '--reverse') return 'root\n';
      if (arguments_[1] === '--parents') return 'root\n';
      return 'src/main/webapp/pupitre/app.ts\n';
    };

    const status = runDiffMutation({
      updates: `refs/heads/main root refs/heads/main ${'0'.repeat(64)}\n`,
      remoteName: 'origin',
      git,
      runMutation: targets => {
        mutationCalls.push(targets);
        return 0;
      },
      write: () => undefined,
    });

    assert.equal(status, 0);
    assert.deepEqual(mutationCalls, [['src/main/webapp/pupitre/app.ts']]);
  });

  it('should skip mutation when deleting a remote reference', () => {
    const messages = [];
    const status = runDiffMutation({
      updates: `refs/heads/feature ${'0'.repeat(40)} refs/heads/feature remote\n`,
      remoteName: 'origin',
      git: () => assert.fail('Git diff should not run for a deleted reference.'),
      runMutation: () => assert.fail('Stryker should not run for a deleted reference.'),
      write: message => messages.push(message),
    });

    assert.equal(status, 0);
    assert.deepEqual(messages, ['No changed production TypeScript files to mutate.\n']);
  });
});
