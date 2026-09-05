import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const root = process.cwd();
const projects = {
  application: 'src/test/webapp/application/tsconfig.json',
  component: 'src/test/webapp/component/tsconfig.json',
  production: 'tsconfig.app.json',
  unit: 'tsconfig.spec.json',
  utils: 'src/test/webapp/utils/tsconfig.json',
};

const negativeProofs = [
  ['gestion production', projects.production, 'src/main/webapp/gestion/main.ts'],
  ['pupitre production', projects.production, 'src/main/webapp/pupitre/main.ts'],
  ['co-located unit tests', projects.unit, 'src/main/webapp/gestion/app.spec.ts'],
  ['cross-application unit tests', projects.unit, 'src/test/webapp/unit/AuthenticationPort.contract.spec.ts'],
  ['Cypress application suites', projects.application, 'src/test/webapp/application/pupitre/shell/Shell.spec.ts'],
  ['Cypress component suites', projects.component, 'src/test/webapp/component/pupitre/designation/Designation.spec.ts'],
  ['Cypress component fixtures', projects.component, 'src/test/webapp/component/pupitre/fixtures/main.ts'],
  ['Cypress shared helpers', projects.utils, 'src/test/webapp/utils/DataSelector.ts'],
  ['production offline browser', projects.application, 'src/test/webapp/application/pupitre/production-offline/service-worker.spec.ts'],
  ['production offline fixture', projects.application, 'src/test/webapp/application/pupitre/production-offline/fixtures/main.ts'],
];

const formatHost = {
  getCanonicalFileName: fileName => fileName,
  getCurrentDirectory: () => root,
  getNewLine: () => '\n',
};

const readProject = project => {
  const projectPath = path.join(root, project);
  const config = ts.readConfigFile(projectPath, ts.sys.readFile);
  if (config.error !== undefined) {
    assert.fail(ts.formatDiagnostic(config.error, formatHost));
  }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(projectPath), undefined, projectPath);
  assert.deepEqual(parsed.errors, []);
  return parsed;
};

const runNegativeProof = ([scope, project, source]) => {
  const parsed = readProject(project);
  const sourcePath = path.join(root, source);
  const host = ts.createCompilerHost(parsed.options);
  const readSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    path.resolve(fileName) === sourcePath
      ? ts.createSourceFile(fileName, `const deliberateTypeError: string = ${scope.length};`, languageVersion, true)
      : readSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);

  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
    projectReferences: parsed.projectReferences,
    host,
  });
  const proof = ts.getPreEmitDiagnostics(program).find(diagnostic => diagnostic.code === 2322 && diagnostic.file?.fileName === sourcePath);
  assert.notEqual(proof, undefined, `${scope} did not compile ${source}`);
};

test('should reject an intentional type error in every checked project', () => {
  negativeProofs.forEach(runNegativeProof);
});

test('should watch the same projects checked once', () => {
  const scripts = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;

  Object.keys(projects).forEach(scope => {
    assert.equal(scripts[`watch:types:${scope}`], `npm run types:${scope} -- --watch`);
  });
});
