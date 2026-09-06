import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ZERO_OID = /^0+$/;

const isMutationTarget = path =>
  path.startsWith('src/main/webapp/')
  && path.endsWith('.ts')
  && !path.endsWith('.spec.ts')
  && !path.endsWith('.d.ts')
  && !path.endsWith('/main.ts')
  && !path.includes('/environments/')
  && !/\.provider[^/]*\.ts$/.test(path)
  && !path.endsWith('/package-info.ts')
  && !path.startsWith('src/main/webapp/app/generated/');

const parseUpdates = input =>
  input
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [localRef, localOid, remoteRef, remoteOid] = line.trim().split(/\s+/);
      return { localRef, localOid, remoteRef, remoteOid };
    });

const changedFilesFor = (update, remoteName, git) => {
  if (!ZERO_OID.test(update.remoteOid)) {
    return {
      base: update.remoteOid,
      files: git(['diff', '--name-only', '--diff-filter=ACMRT', update.remoteOid, update.localOid, '--']),
    };
  }

  const [firstCommit] = git(['rev-list', '--reverse', update.localOid, '--not', `--remotes=${remoteName}`]).split('\n');
  if (firstCommit === undefined || firstCommit === '') return { base: undefined, files: '' };
  const [, parent] = git(['rev-list', '--parents', '-n', '1', firstCommit]).trim().split(/\s+/);
  if (parent === undefined) return { base: undefined, files: git(['ls-tree', '-r', '--name-only', update.localOid]) };
  return {
    base: parent,
    files: git(['diff', '--name-only', '--diff-filter=ACMRT', parent, update.localOid, '--']),
  };
};

const changedLineTargets = (path, base, localOid, git) => {
  if (base === undefined) return [path];
  const patch = git(['diff', '--unified=0', base, localOid, '--', path]);
  return [...patch.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)].flatMap(([, startText, countText]) => {
    const start = Number(startText);
    const count = countText === undefined ? 1 : Number(countText);
    return count === 0 ? [] : [`${path}:${start}-${start + count - 1}`];
  });
};

export const runDiffMutation = ({ updates, remoteName, git, runMutation, write }) => {
  const targets = new Set();

  for (const update of parseUpdates(updates)) {
    if (ZERO_OID.test(update.localOid)) continue;
    const changed = changedFilesFor(update, remoteName, git);
    changed.files
      .split('\n')
      .filter(isMutationTarget)
      .flatMap(path => changedLineTargets(path, changed.base, update.localOid, git))
      .forEach(target => targets.add(target));
  }

  const selected = [...targets].sort();
  if (selected.length === 0) {
    write('No changed production TypeScript files to mutate.\n');
    return 0;
  }
  return runMutation(selected);
};

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const updates = await new Promise(resolveInput => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => resolveInput(data));
  });
  const repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const status = runDiffMutation({
    updates,
    remoteName: process.argv[2],
    git: arguments_ => execFileSync('git', arguments_, { cwd: repositoryRoot, encoding: 'utf8' }),
    runMutation: targets =>
      spawnSync('npm', ['run', 'test:mutation', '--', '--mutate', targets.join(',')], {
        cwd: repositoryRoot,
        stdio: 'inherit',
      }).status ?? 1,
    write: message => process.stdout.write(message),
  });
  process.exitCode = status;
}
