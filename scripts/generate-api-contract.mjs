import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRepositoryRoot = fileURLToPath(new URL('..', import.meta.url));

const execute = (command, arguments_, repositoryRoot) =>
  execFileSync(command, arguments_, { cwd: repositoryRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const run = (commandRunner, command, arguments_, repositoryRoot) => {
  try {
    return commandRunner(command, arguments_, repositoryRoot);
  } catch (error) {
    const details = error.stderr?.toString().trim() || error.message;
    throw new Error(`${command} failed: ${details}`, { cause: error });
  }
};

const readRevision = revisionFile => {
  const revision = readFileSync(revisionFile, 'utf8').trim();

  if (!/^[0-9a-f]{40}$/.test(revision)) {
    throw new Error(`${revisionFile} must contain one full lowercase Git commit SHA`);
  }

  return revision;
};

const downloadContract = (commandRunner, repositoryRoot, revision) =>
  run(
    commandRunner,
    'gh',
    [
      'api',
      'repos/glm-project/glm-back/contents/documentation/openapi.json',
      '--method',
      'GET',
      '-f',
      `ref=${revision}`,
      '-H',
      'Accept: application/vnd.github.raw',
    ],
    repositoryRoot,
  );

const generate = (commandRunner, repositoryRoot, revision, stagingDirectory) => {
  const openApiPath = join(stagingDirectory, 'openapi.json');
  const schemaPath = join(stagingDirectory, 'schema.d.ts');

  writeFileSync(openApiPath, downloadContract(commandRunner, repositoryRoot, revision));
  run(commandRunner, 'npm', ['exec', '--no', '--', 'openapi-typescript', openApiPath, '--output', schemaPath], repositoryRoot);
  run(commandRunner, 'npm', ['exec', '--no', '--', 'prettier', '--write', openApiPath, schemaPath], repositoryRoot);
};

const publish = (generatedDirectory, stagingDirectory, backupDirectory) => {
  if (!existsSync(generatedDirectory)) {
    renameSync(stagingDirectory, generatedDirectory);
    return;
  }

  renameSync(generatedDirectory, backupDirectory);

  try {
    renameSync(stagingDirectory, generatedDirectory);
  } catch (error) {
    renameSync(backupDirectory, generatedDirectory);
    throw error;
  }

  rmSync(backupDirectory, { recursive: true });
};

export const generateApiContract = ({ repositoryRoot = defaultRepositoryRoot, commandRunner = execute } = {}) => {
  const revisionFile = join(repositoryRoot, '.glm-back-revision');
  const revision = readRevision(revisionFile);
  const generatedDirectory = join(repositoryRoot, 'src/main/webapp/app/generated');
  const generatedParent = dirname(generatedDirectory);
  const stagingDirectory = mkdtempSync(join(generatedParent, '.generated-'));
  const backupDirectory = `${stagingDirectory}-previous`;

  try {
    if (existsSync(generatedDirectory)) {
      cpSync(generatedDirectory, stagingDirectory, { recursive: true });
    }

    generate(commandRunner, repositoryRoot, revision, stagingDirectory);
    publish(generatedDirectory, stagingDirectory, backupDirectory);
    return revision;
  } finally {
    rmSync(stagingDirectory, { force: true, recursive: true });
  }
};

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const revision = generateApiContract();
    process.stdout.write(`Generated API contract from glm-back ${revision}\n`);
  } catch (error) {
    process.stderr.write(`API contract generation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
