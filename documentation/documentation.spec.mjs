import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const agentFile = resolve(repository, 'AGENTS.md');
const readmeFile = resolve(repository, 'README.md');

const markdownFilesIn = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return markdownFilesIn(path);
    }
    return extname(path) === '.md' ? [path] : [];
  });

const localMarkdownTargetsIn = file =>
  [...readFileSync(file, 'utf8').matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)]
    .map(([, target]) => target.split('#')[0])
    .filter(target => target.length > 0 && !target.includes('://') && !target.startsWith('mailto:'));

const routedDocumentsIn = source => [...source.matchAll(/→ `([^`]+\.md)`/g)].map(([, document]) => document);

const indexedDocumentsIn = source =>
  [...source.matchAll(/]\(((?:documentation|docs\/agents)\/[^)#]+\.md)(?:#[^)]+)?\)/g)]
    .map(([, document]) => document)
    .filter(document => document !== 'documentation/hexagonal-architecture.md');

test('should resolve every local Markdown link', () => {
  const markdownFiles = [
    agentFile,
    readmeFile,
    resolve(repository, 'CLAUDE.md'),
    ...markdownFilesIn(resolve(repository, 'documentation')),
    ...markdownFilesIn(resolve(repository, 'docs/agents')),
  ];
  const missing = markdownFiles.flatMap(file =>
    localMarkdownTargetsIn(file)
      .map(target => resolve(dirname(file), decodeURIComponent(target)))
      .filter(target => !existsSync(target))
      .map(target => `${file}: ${target}`),
  );

  assert.deepEqual(missing, []);
});

test('should route every indexed topic document from AGENTS.md', () => {
  const routed = [...new Set(routedDocumentsIn(readFileSync(agentFile, 'utf8')))];
  const indexed = [...new Set(indexedDocumentsIn(readFileSync(readmeFile, 'utf8')))];

  assert.deepEqual(routed.sort(), indexed.sort());
});
