import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { generateApiContract } from './generate-api-contract.mjs';

const backendRevision = '28dcdb9685adf1a67e12625e51b165b7c28361c7';
const contract = '{"openapi":"3.1.0"}\n';
const workspaces = [];

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    rmSync(workspace, { force: true, recursive: true });
  }
});

const givenWorkspace = revision => {
  const workspace = mkdtempSync(join(tmpdir(), 'glm-api-generation-'));
  const generatedDirectory = join(workspace, 'src/main/webapp/app/generated');
  mkdirSync(generatedDirectory, { recursive: true });
  writeFileSync(join(workspace, '.glm-back-revision'), `${revision}\n`);
  writeFileSync(join(generatedDirectory, 'openapi.json'), 'previous contract');
  writeFileSync(join(generatedDirectory, 'schema.d.ts'), 'previous types');
  writeFileSync(join(generatedDirectory, 'keep.txt'), 'kept');
  workspaces.push(workspace);
  return workspace;
};

const givenSuccessfulTools = () => (command, arguments_) => {
  if (command === 'gh') {
    return contract;
  }

  if (arguments_.includes('openapi-typescript')) {
    const input = arguments_[arguments_.indexOf('openapi-typescript') + 1];
    const output = arguments_[arguments_.indexOf('--output') + 1];
    writeFileSync(output, `export type Contract = ${JSON.stringify(readFileSync(input, 'utf8'))};\n`);
  }

  return '';
};

const whenGenerating = (workspace, commandRunner) => generateApiContract({ repositoryRoot: workspace, commandRunner });

const thenGeneratedFilesAreUnchanged = workspace => {
  const generatedDirectory = join(workspace, 'src/main/webapp/app/generated');
  assert.equal(readFileSync(join(generatedDirectory, 'openapi.json'), 'utf8'), 'previous contract');
  assert.equal(readFileSync(join(generatedDirectory, 'schema.d.ts'), 'utf8'), 'previous types');
};

describe('API contract generation', () => {
  it('should reject a mutable or malformed backend revision without changing generated files', () => {
    const workspace = givenWorkspace('main');

    const generation = () => whenGenerating(workspace, givenSuccessfulTools());

    assert.throws(generation, /must contain one full lowercase Git commit SHA/);
    thenGeneratedFilesAreUnchanged(workspace);
  });

  it('should report an inaccessible backend revision without changing generated files', () => {
    const workspace = givenWorkspace(backendRevision);
    const inaccessibleBackend = () => {
      throw new Error('HTTP 404: commit not found');
    };

    const generation = () => whenGenerating(workspace, inaccessibleBackend);

    assert.throws(generation, /gh failed: HTTP 404: commit not found/);
    thenGeneratedFilesAreUnchanged(workspace);
  });

  it('should preserve other generated assets and produce identical files twice', () => {
    const workspace = givenWorkspace(backendRevision);
    const successfulTools = givenSuccessfulTools();

    whenGenerating(workspace, successfulTools);
    const firstContract = readFileSync(join(workspace, 'src/main/webapp/app/generated/openapi.json'));
    const firstTypes = readFileSync(join(workspace, 'src/main/webapp/app/generated/schema.d.ts'));
    whenGenerating(workspace, successfulTools);

    assert.deepEqual(readFileSync(join(workspace, 'src/main/webapp/app/generated/openapi.json')), firstContract);
    assert.deepEqual(readFileSync(join(workspace, 'src/main/webapp/app/generated/schema.d.ts')), firstTypes);
    assert.equal(readFileSync(join(workspace, 'src/main/webapp/app/generated/keep.txt'), 'utf8'), 'kept');
  });
});
