import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runStopValidation } from './codex-stop-validation.mjs';

describe('Codex Stop validation', () => {
  it('should allow the turn to finish after successful validation', () => {
    const output = runStopValidation({
      input: { stop_hook_active: false },
      repositoryRoot: '/workspace',
      runValidation: repositoryRoot => ({ status: repositoryRoot === '/workspace' ? 0 : 1 }),
    });

    assert.deepEqual(output, {});
  });

  it('should continue the turn with the validation failure', () => {
    const output = runStopValidation({
      input: { stop_hook_active: false },
      repositoryRoot: '/workspace',
      runValidation: () => ({ status: 1, stdout: 'coverage failed', stderr: '' }),
    });

    assert.deepEqual(output, {
      decision: 'block',
      reason: 'Complete validation failed. Fix the failure and finish again.\ncoverage failed',
    });
  });

  it('should stop after a second failed validation without creating a relaunch loop', () => {
    let executions = 0;
    const output = runStopValidation({
      input: { stop_hook_active: true },
      repositoryRoot: '/workspace',
      runValidation: () => {
        executions += 1;
        return { status: null, stdout: '', stderr: '', error: new Error('output exceeded buffer') };
      },
    });

    const reason = 'Complete validation failed. Fix the failure and finish again.\noutput exceeded buffer';
    assert.deepEqual(output, { continue: false, stopReason: reason, systemMessage: reason });
    assert.equal(executions, 1);
  });

  it('should allow a corrected turn to finish after its second validation succeeds', () => {
    const output = runStopValidation({
      input: { stop_hook_active: true },
      repositoryRoot: '/workspace',
      runValidation: () => ({ status: 0 }),
    });

    assert.deepEqual(output, {});
  });
});
