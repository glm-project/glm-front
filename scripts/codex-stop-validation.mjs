import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const validationFailureReason = result => {
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}\n${result.error?.message ?? ''}`.trim();
  const details = output.slice(-1600);
  return `Complete validation failed. Fix the failure and finish again.\n${details}`;
};

export const runStopValidation = ({ input, repositoryRoot, runValidation }) => {
  const result = runValidation(repositoryRoot);
  if (result.status === 0) {
    return {};
  }

  const reason = validationFailureReason(result);
  if (input.stop_hook_active === true) {
    return { continue: false, stopReason: reason, systemMessage: reason };
  }

  return { decision: 'block', reason };
};

const runCompleteValidation = repositoryRoot => {
  const result = spawnSync('npm', ['run', 'validate:complete'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  });
  const outputDirectory = resolve(repositoryRoot, 'artifacts/validation');
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    resolve(outputDirectory, `codex-stop-${timestamp}.log`),
    `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`,
  );
  return result;
};

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  let input;

  try {
    input = JSON.parse(
      await new Promise(resolveInput => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => {
          data += chunk;
        });
        process.stdin.on('end', () => resolveInput(data));
      }),
    );
  } catch {
    process.stdout.write(`${JSON.stringify({ continue: false, stopReason: 'Codex Stop hook received invalid input.' })}\n`);
    process.exit(0);
  }

  const repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: input.cwd,
    encoding: 'utf8',
  }).trim();
  const output = runStopValidation({
    input,
    repositoryRoot,
    runValidation: runCompleteValidation,
  });
  process.stdout.write(`${JSON.stringify(output)}\n`);
}
